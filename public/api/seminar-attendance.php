<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once 'config.php';
require_once 'permissions.php';
require_once 'audit.php';

if (!$conn) {
    http_response_code(500);
    exit(json_encode(['success' => false, 'message' => 'Database connection not available']));
}

$request_method = $_SERVER['REQUEST_METHOD'];

if ($request_method === 'GET') {
    $query = "SELECT sa.*, st.seminar_name, p.first_name, p.last_name FROM seminar_attendance sa 
              LEFT JOIN seminar_types st ON sa.seminar_type_id = st.seminar_type_id
              LEFT JOIN persons p ON sa.person_id = p.person_id
              ORDER BY sa.seminar_date DESC";
    $result = $conn->query($query);

    if (!$result) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]);
        exit();
    }

    $data = [];
    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $data,
        'count' => count($data)
    ]);

} elseif ($request_method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['seminar_type_id']) || !isset($input['seminar_date'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields: seminar_type_id, seminar_date']);
        exit();
    }

    $seminar_type_id = (int)$input['seminar_type_id'];
    $seminar_date = $conn->real_escape_string($input['seminar_date']);
    $status = $input['status'] ?? 'Attended';
    $related_record_type = !empty($input['related_record_type']) ? "'" . $conn->real_escape_string($input['related_record_type']) . "'" : 'NULL';
    $related_record_id = !empty($input['related_record_id']) ? (int)$input['related_record_id'] : 'NULL';
    $participant_role = !empty($input['participant_role']) ? "'" . $conn->real_escape_string($input['participant_role']) . "'" : 'NULL';

    $attendees = [];
    if (isset($input['attendees']) && is_array($input['attendees'])) {
        $attendees = $input['attendees'];
    } elseif (!empty($input['person_id']) || !empty($input['attendee_name'])) {
        $attendees[] = $input;
    }
    $attendees = array_values(array_filter($attendees, static fn($attendee) => !empty($attendee['person_id']) || trim((string)($attendee['attendee_name'] ?? '')) !== ''));
    if (!$attendees) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'At least one registered person or guest name is required']);
        exit();
    }

    $createdIds = [];
    foreach ($attendees as $attendee) {
        $person_id = !empty($attendee['person_id']) ? (int)$attendee['person_id'] : 'NULL';
        $attendee_name = trim((string)($attendee['attendee_name'] ?? ''));
        $attendee_name = $attendee_name !== '' ? "'" . $conn->real_escape_string($attendee_name) . "'" : 'NULL';
        $query = "INSERT INTO seminar_attendance (seminar_type_id, person_id, attendee_name, seminar_date, status, related_record_type, related_record_id, participant_role)
                  VALUES ($seminar_type_id, $person_id, $attendee_name, '$seminar_date', '$status', $related_record_type, $related_record_id, $participant_role)";
        if (!$conn->query($query)) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to create seminar attendance: ' . $conn->error]);
            exit();
        }
        $createdIds[] = $conn->insert_id;
    }
    if ($createdIds) {
        logAuditAction($_SESSION['user_id'] ?? 1, 'CREATE', 'seminar_attendance', 'Recorded attendance for ' . count($createdIds) . ' participant(s)', $conn);
        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Seminar attendance created successfully', 'ids' => $createdIds]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create seminar attendance: ' . $conn->error]);
    }

} elseif ($request_method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['attendance_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing attendance_id']);
        exit();
    }

    $attendance_id = (int)$input['attendance_id'];
    $updates = [];
    
    if (isset($input['seminar_type_id'])) {
        $updates[] = "seminar_type_id = " . (int)$input['seminar_type_id'];
    }
    if (isset($input['person_id'])) {
        $updates[] = "person_id = " . (!empty($input['person_id']) ? (int)$input['person_id'] : 'NULL');
    }
    if (array_key_exists('attendee_name', $input)) {
        $updates[] = "attendee_name = " . (!empty(trim((string)$input['attendee_name'])) ? "'" . $conn->real_escape_string(trim($input['attendee_name'])) . "'" : 'NULL');
    }
    if (isset($input['seminar_date'])) {
        $updates[] = "seminar_date = '" . $conn->real_escape_string($input['seminar_date']) . "'";
    }
    if (isset($input['status'])) {
        $updates[] = "status = '" . $conn->real_escape_string($input['status']) . "'";
    }
    if (array_key_exists('related_record_type', $input)) {
        $updates[] = "related_record_type = " . (!empty($input['related_record_type']) ? "'" . $conn->real_escape_string($input['related_record_type']) . "'" : 'NULL');
    }
    if (array_key_exists('related_record_id', $input)) {
        $updates[] = "related_record_id = " . (!empty($input['related_record_id']) ? (int)$input['related_record_id'] : 'NULL');
    }
    if (array_key_exists('participant_role', $input)) {
        $updates[] = "participant_role = " . (!empty($input['participant_role']) ? "'" . $conn->real_escape_string($input['participant_role']) . "'" : 'NULL');
    }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit();
    }

    $query = "UPDATE seminar_attendance SET " . implode(', ', $updates) . " WHERE attendance_id = $attendance_id";
    
    if ($conn->query($query)) {
        logAuditAction($_SESSION['user_id'] ?? 1, 'UPDATE', 'seminar_attendance', "Updated seminar attendance ID: $attendance_id", $conn);
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Seminar attendance updated successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update seminar attendance: ' . $conn->error]);
    }

} elseif ($request_method === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['attendance_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing attendance_id']);
        exit();
    }

    $attendance_id = (int)$input['attendance_id'];

    $query = "DELETE FROM seminar_attendance WHERE attendance_id = $attendance_id";
    
    if ($conn->query($query)) {
        logAuditAction($_SESSION['user_id'] ?? 1, 'DELETE', 'seminar_attendance', "Deleted seminar attendance ID: $attendance_id", $conn);
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Seminar attendance deleted successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete seminar attendance: ' . $conn->error]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>