<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
require_once 'config.php';
require_once 'UserNotificationHelper.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(); }

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'GET') {
    $personId = intval($_GET['person_id'] ?? 0);
    $filter = $personId > 0 ? "WHERE sa.person_id = $personId" : '';
    $statusUpdateQuery = <<<'SQL'
UPDATE sacrament_applications sa
        INNER JOIN (
            SELECT sa2.application_id,
                   COUNT(rc.check_id) AS total_requirements,
                   SUM(CASE WHEN rs.status = 'Approved' THEN 1 ELSE 0 END) AS approved_requirements
            FROM sacrament_applications sa2
            INNER JOIN requirement_checklists rc ON rc.category = sa2.category
            LEFT JOIN requirement_submissions rs
                ON rs.check_id = rc.check_id AND rs.person_id = sa2.person_id
            GROUP BY sa2.application_id
        ) requirements ON requirements.application_id = sa.application_id
        SET sa.status = CASE
            WHEN requirements.total_requirements > 0
                AND requirements.total_requirements = requirements.approved_requirements THEN 'Completed'
            WHEN sa.status IN ('Pending', 'Processing') THEN sa.status
            ELSE 'Incomplete'
        END,
        sa.notes = CASE
            WHEN requirements.total_requirements > 0
                AND requirements.total_requirements = requirements.approved_requirements THEN NULL
            ELSE 'One or more requirements are still incomplete.'
        END
        WHERE sa.status IN ('Incomplete', 'Completed') OR (sa.status IN ('Pending', 'Processing') AND requirements.total_requirements = requirements.approved_requirements)
SQL;
    $conn->query($statusUpdateQuery);
    $query = "SELECT sa.*, p.first_name, p.last_name
              FROM sacrament_applications sa
              INNER JOIN persons p ON p.person_id = sa.person_id
              $filter ORDER BY sa.application_id DESC";
    $result = $conn->query($query);
    if (!$result) { http_response_code(500); echo json_encode(['success' => false, 'message' => $conn->error]); exit(); }
    $rows = [];
    while ($row = $result->fetch_assoc()) { $rows[] = $row; }
    echo json_encode(['success' => true, 'data' => $rows]);
    exit();
}

$data = json_decode(file_get_contents('php://input'), true) ?: [];
if ($method === 'POST') {
    $personId = intval($data['person_id'] ?? 0);
    $category = $conn->real_escape_string($data['category'] ?? '');
    $applicantName = $conn->real_escape_string($data['applicant_name'] ?? '');
    $purpose = $conn->real_escape_string($data['purpose'] ?? '');
    if (!$personId || !in_array($category, ['Baptism', 'Marriage', 'Confirmation'], true) || !$applicantName || !$purpose) {
        http_response_code(400); echo json_encode(['success' => false, 'message' => 'person_id, category, applicant_name, and purpose are required']); exit();
    }
    $existing = $conn->query("SELECT application_id FROM sacrament_applications WHERE person_id = $personId AND category = '$category' AND status IN ('Pending', 'Processing', 'Incomplete', 'Approved') LIMIT 1");
    if ($existing && $existing->num_rows > 0) {
        http_response_code(409); echo json_encode(['success' => false, 'message' => 'An active application already exists']); exit();
    }
    $query = "INSERT INTO sacrament_applications (person_id, applicant_name, category, purpose) VALUES ($personId, '$applicantName', '$category', '$purpose')";
    if (!$conn->query($query)) { http_response_code(500); echo json_encode(['success' => false, 'message' => $conn->error]); exit(); }
    try {
        $helper = new UserNotificationHelper($conn);
        $message = "$applicantName submitted a new $category sacrament application. Please review the requirements.";
        $options = ['action_url' => '/document-requests?view=applications&application_id=' . $conn->insert_id, 'action_type' => 'Sacrament Application'];
        $helper->sendRoleBasedNotification('Secretary', $message, 'Sacrament Applications', $options);
        $helper->sendRoleBasedNotification('Admin', $message, 'Sacrament Applications', $options);
    } catch (Throwable $notificationError) {
        error_log('Sacrament application notification error: ' . $notificationError->getMessage());
    }
    echo json_encode(['success' => true, 'application_id' => $conn->insert_id]);
    exit();
}

$applicationId = intval($_GET['id'] ?? $data['application_id'] ?? 0);
if (!$applicationId) { http_response_code(400); echo json_encode(['success' => false, 'message' => 'application_id is required']); exit(); }
if ($method === 'PUT') {
    $status = $conn->real_escape_string($data['status'] ?? '');
    if (!in_array($status, ['Pending', 'Processing'], true)) { http_response_code(400); echo json_encode(['success' => false, 'message' => 'Only Pending or Processing can be set manually. Other statuses are determined by the requirements workflow.']); exit(); }
    $currentQuery = $conn->query("SELECT person_id, category, status FROM sacrament_applications WHERE application_id=$applicationId LIMIT 1");
    if (!$currentQuery || $currentQuery->num_rows === 0) { http_response_code(404); echo json_encode(['success' => false, 'message' => 'Application not found']); exit(); }
    $currentApplication = $currentQuery->fetch_assoc();
    $notes = $conn->real_escape_string($data['notes'] ?? '');
    $reviewedBy = intval($data['reviewed_by_user_id'] ?? 0) ?: 'NULL';
    $reviewedAt = in_array($status, ['Approved', 'Rejected', 'Completed'], true) ? 'NOW()' : 'NULL';
    $query = "UPDATE sacrament_applications SET status='$status', notes='$notes', reviewed_by_user_id=$reviewedBy, reviewed_at=$reviewedAt WHERE application_id=$applicationId";
    if (!$conn->query($query)) { http_response_code(500); echo json_encode(['success' => false, 'message' => $conn->error]); exit(); }
    if ($status !== $currentApplication['status']) {
        $message = $status === 'Processing'
            ? "Your {$currentApplication['category']} sacrament application is now being processed by the parish."
            : "Your {$currentApplication['category']} sacrament application is pending because the parish is not yet ready to process it. Please make sure you submit requirements on time and wait for the next parish update.";
        try {
            $helper = new UserNotificationHelper($conn);
            $helper->sendUserNotification((int)$currentApplication['person_id'], $message, 'Sacrament Applications', [
                'action_url' => '/document-requests?view=applications&application_id=' . $applicationId,
                'action_type' => 'view_sacrament_application'
            ]);
        } catch (Throwable $notificationError) {
            error_log('Sacrament application status notification error: ' . $notificationError->getMessage());
        }
    }
    echo json_encode(['success' => true]);
    exit();
}
if ($method === 'DELETE') {
    if (!$conn->query("DELETE FROM sacrament_applications WHERE application_id=$applicationId")) { http_response_code(500); echo json_encode(['success' => false, 'message' => $conn->error]); exit(); }
    echo json_encode(['success' => true]);
    exit();
}
http_response_code(405); echo json_encode(['success' => false, 'message' => 'Method not allowed']);
?>
