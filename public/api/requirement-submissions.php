<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
require_once 'config.php';
require_once 'UserNotificationHelper.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(); }

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'GET') {
    $personId = intval($_GET['person_id'] ?? 0);
    $personFilter = $personId > 0 ? " AND rs.person_id = $personId" : '';
    $query = "SELECT rs.*, rc.category, rc.requirement_name, p.first_name, p.last_name
              FROM requirement_submissions rs
              INNER JOIN requirement_checklists rc ON rc.check_id = rs.check_id
              INNER JOIN persons p ON p.person_id = rs.person_id
              WHERE 1=1 $personFilter ORDER BY rs.submission_id DESC";
    $result = $conn->query($query);
    if (!$result) { http_response_code(500); echo json_encode(['success' => false, 'message' => $conn->error]); exit(); }
    $rows = [];
    while ($row = $result->fetch_assoc()) { $rows[] = $row; }
    echo json_encode(['success' => true, 'data' => $rows]);
    exit();
}

$data = json_decode(file_get_contents('php://input'), true) ?: [];
$checkId = intval($data['check_id'] ?? 0);
$personId = intval($data['person_id'] ?? 0);
$status = $conn->real_escape_string($data['status'] ?? 'Submitted');
$allowed = ['Pending', 'Submitted', 'Approved', 'Rejected'];
if (!$checkId || !$personId || !in_array($status, $allowed, true)) {
    http_response_code(400); echo json_encode(['success' => false, 'message' => 'check_id, person_id, and valid status are required']); exit();
}
$notes = $conn->real_escape_string($data['notes'] ?? '');
$submittedAt = $status === 'Submitted' ? "'" . date('Y-m-d H:i:s') . "'" : 'NULL';
$reviewedAt = in_array($status, ['Approved', 'Rejected'], true) ? "'" . date('Y-m-d H:i:s') . "'" : 'NULL';
$query = "INSERT INTO requirement_submissions (check_id, person_id, status, submitted_at, reviewed_at, notes)
          VALUES ($checkId, $personId, '$status', $submittedAt, $reviewedAt, '$notes')
          ON DUPLICATE KEY UPDATE status='$status', submitted_at=IF('$status'='Submitted', COALESCE(submitted_at, NOW()), submitted_at), reviewed_at=$reviewedAt, notes='$notes'";
if (!$conn->query($query)) { http_response_code(500); echo json_encode(['success' => false, 'message' => $conn->error]); exit(); }

$categoryResult = $conn->query("SELECT category FROM requirement_checklists WHERE check_id = $checkId LIMIT 1");
if ($categoryResult && ($categoryRow = $categoryResult->fetch_assoc())) {
    $category = $conn->real_escape_string($categoryRow['category']);
    $approvalCheck = $conn->query("SELECT COUNT(*) AS total_requirements,
            SUM(CASE WHEN rs.status = 'Approved' THEN 1 ELSE 0 END) AS approved_requirements
        FROM requirement_checklists rc
        LEFT JOIN requirement_submissions rs ON rs.check_id = rc.check_id AND rs.person_id = $personId
        WHERE rc.category='$category'");
    $approvalRow = $approvalCheck ? $approvalCheck->fetch_assoc() : null;
    $totalRequirements = (int)($approvalRow['total_requirements'] ?? 0);
    $approvedRequirements = (int)($approvalRow['approved_requirements'] ?? 0);
    $applicationStatus = $totalRequirements > 0 && $totalRequirements === $approvedRequirements
        ? 'Completed'
        : null;
    $previousApplications = [];
    $previousResult = $conn->query("SELECT application_id, status FROM sacrament_applications
        WHERE person_id=$personId AND category='$category' AND status <> 'Rejected'");
    if ($previousResult) {
        while ($previousApplication = $previousResult->fetch_assoc()) {
            $previousApplications[(int)$previousApplication['application_id']] = $previousApplication['status'];
        }
    }
    if ($applicationStatus === 'Completed') {
        $conn->query("UPDATE sacrament_applications
            SET status='Completed', notes=NULL
            WHERE person_id=$personId AND category='$category' AND status <> 'Rejected'");
    }
    if ($applicationStatus === 'Completed' && !empty($previousApplications)) {
        try {
            $helper = new UserNotificationHelper($conn);
            foreach ($previousApplications as $applicationId => $previousStatus) {
                if ($previousStatus === 'Completed') continue;
                $message = "Your $category sacrament application is complete. All requirements have been approved. You may now visit the parish office and bring your complete requirements.";
                $helper->sendUserNotification($personId, $message, 'Sacrament Applications', [
                    'action_url' => '/document-requests?view=applications&application_id=' . $applicationId,
                    'action_type' => 'Sacrament Application Completed',
                ]);
            }
        } catch (Throwable $notificationError) {
            error_log('Sacrament completion notification error: ' . $notificationError->getMessage());
        }
    }
}
echo json_encode(['success' => true, 'message' => 'Requirement submission updated', 'submission_id' => $conn->insert_id]);
?>