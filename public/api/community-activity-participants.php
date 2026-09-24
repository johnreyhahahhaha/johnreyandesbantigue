<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
require_once 'config.php';
require_once 'audit.php';

if (!$conn) {
    http_response_code(500);
    exit(json_encode(['success' => false, 'message' => 'Database connection not available']));
}

$method = $_SERVER['REQUEST_METHOD'];
$activityId = isset($_GET['community_id']) ? (int)$_GET['community_id'] : 0;

if ($method === 'GET') {
    $where = $activityId > 0 ? "WHERE cap.community_id = $activityId" : '';
    $query = "SELECT cap.*, ca.activity_name, p.first_name, p.last_name
              FROM community_activity_participants cap
              LEFT JOIN community_activities ca ON ca.community_id = cap.community_id
              LEFT JOIN persons p ON p.person_id = cap.person_id
              $where ORDER BY cap.participant_id DESC";
    $result = $conn->query($query);
    if (!$result) {
        http_response_code(500);
        exit(json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]));
    }
    $data = [];
    while ($row = $result->fetch_assoc()) $data[] = $row;
    echo json_encode(['success' => true, 'data' => $data, 'count' => count($data)]);
    exit();
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $communityId = (int)($input['community_id'] ?? 0);
    if ($communityId <= 0 || !$conn->query("SELECT community_id FROM community_activities WHERE community_id = $communityId LIMIT 1")->num_rows) {
        http_response_code(400);
        exit(json_encode(['success' => false, 'message' => 'Valid community activity is required']));
    }

    $attendees = is_array($input['attendees'] ?? null) ? $input['attendees'] : [];
    $role = $conn->real_escape_string(trim((string)($input['participant_role'] ?? 'Participant')));
    $status = $conn->real_escape_string(trim((string)($input['status'] ?? 'Registered')));
    $attendees = array_values(array_filter($attendees, static fn($item) => !empty($item['person_id']) || trim((string)($item['attendee_name'] ?? '')) !== ''));
    if (!$attendees) {
        http_response_code(400);
        exit(json_encode(['success' => false, 'message' => 'At least one person or guest name is required']));
    }

    $created = [];
    foreach ($attendees as $attendee) {
        $personId = !empty($attendee['person_id']) ? (int)$attendee['person_id'] : 'NULL';
        $name = trim((string)($attendee['attendee_name'] ?? ''));
        $nameSql = $name !== '' ? "'" . $conn->real_escape_string($name) . "'" : 'NULL';
        $query = "INSERT INTO community_activity_participants (community_id, person_id, attendee_name, participant_role, status)
                  VALUES ($communityId, $personId, $nameSql, '$role', '$status')";
        if (!$conn->query($query)) {
            http_response_code(500);
            exit(json_encode(['success' => false, 'message' => 'Failed to save participant: ' . $conn->error]));
        }
        $created[] = $conn->insert_id;
    }
    logAuditAction($_SESSION['user_id'] ?? 0, 'CREATE', 'community_activity_participants', 'Added ' . count($created) . ' participant(s) to activity ' . $communityId, $conn);
    http_response_code(201);
    echo json_encode(['success' => true, 'message' => 'Activity participants saved successfully', 'ids' => $created]);
    exit();
}

if ($method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    $participantId = (int)($input['participant_id'] ?? 0);
    if ($participantId <= 0) {
        http_response_code(400);
        exit(json_encode(['success' => false, 'message' => 'participant_id is required']));
    }

    $updates = [];
    if (array_key_exists('person_id', $input)) {
        $updates[] = 'person_id = ' . (!empty($input['person_id']) ? (int)$input['person_id'] : 'NULL');
    }
    if (array_key_exists('attendee_name', $input)) {
        $name = trim((string)$input['attendee_name']);
        $updates[] = 'attendee_name = ' . ($name !== '' ? "'" . $conn->real_escape_string($name) . "'" : 'NULL');
    }
    if (isset($input['participant_role'])) {
        $updates[] = "participant_role = '" . $conn->real_escape_string($input['participant_role']) . "'";
    }
    if (isset($input['status'])) {
        $updates[] = "status = '" . $conn->real_escape_string($input['status']) . "'";
    }
    if (!$updates) {
        http_response_code(400);
        exit(json_encode(['success' => false, 'message' => 'No fields to update']));
    }

    if (!$conn->query('UPDATE community_activity_participants SET ' . implode(', ', $updates) . " WHERE participant_id = $participantId")) {
        http_response_code(500);
        exit(json_encode(['success' => false, 'message' => 'Failed to update participant: ' . $conn->error]));
    }
    logAuditAction($_SESSION['user_id'] ?? 0, 'UPDATE', 'community_activity_participants', 'Updated participant ' . $participantId, $conn);
    echo json_encode(['success' => true, 'message' => 'Participant updated successfully']);
    exit();
}

if ($method === 'DELETE') {
    $participantId = isset($_GET['participant_id']) ? (int)$_GET['participant_id'] : 0;
    if ($participantId <= 0 || !$conn->query("DELETE FROM community_activity_participants WHERE participant_id = $participantId")) {
        http_response_code(500);
        exit(json_encode(['success' => false, 'message' => 'Failed to delete participant']));
    }
    echo json_encode(['success' => true, 'message' => 'Participant deleted successfully']);
    exit();
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed']);
?>
