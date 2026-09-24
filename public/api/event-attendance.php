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
    // Get attendance records - optionally filter by person_id or schedule_id
    $person_id = isset($_GET['person_id']) ? intval($_GET['person_id']) : null;
    $schedule_id = isset($_GET['schedule_id']) ? intval($_GET['schedule_id']) : null;

    $query = "SELECT ea.*, p.first_name, p.last_name, ps.event_title 
              FROM event_attendance ea
              LEFT JOIN persons p ON ea.person_id = p.person_id
              LEFT JOIN parish_schedules ps ON ea.schedule_id = ps.schedule_id
              WHERE 1=1";

    if ($person_id) {
        $query .= " AND ea.person_id = $person_id";
    }
    if ($schedule_id) {
        $query .= " AND ea.schedule_id = $schedule_id";
    }

    $query .= " ORDER BY ea.created_at DESC";

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
    // Create or update RSVP attendance
    $data = json_decode(file_get_contents("php://input"), true);
    $user_id = isset($data['user_id']) && intval($data['user_id']) > 0 ? intval($data['user_id']) : null;

    if (!isset($data['person_id']) || !isset($data['schedule_id']) || !isset($data['status'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields: person_id, schedule_id, status']);
        exit();
    }

    $person_id = intval($data['person_id']);
    $schedule_id = intval($data['schedule_id']);
    $status = $conn->real_escape_string($data['status']); // 'attending', 'not_attending', 'maybe'
    $notes = isset($data['notes']) ? $conn->real_escape_string($data['notes']) : '';

    // Check if already exists
    $check_query = "SELECT attendance_id FROM event_attendance 
                    WHERE person_id = $person_id AND schedule_id = $schedule_id";
    $check_result = $conn->query($check_query);

    if ($check_result && $check_result->num_rows > 0) {
        // Update existing
        $row = $check_result->fetch_assoc();
        $attendance_id = $row['attendance_id'];
        $update_query = "UPDATE event_attendance 
                         SET status = '$status', notes = '$notes', updated_at = NOW()
                         WHERE attendance_id = $attendance_id";

        if ($conn->query($update_query) === TRUE) {
            if ($user_id && $user_id > 0) {
                logAuditAction($user_id, 'UPDATE', 'event_attendance', "Updated RSVP status for schedule $schedule_id", $conn);
            }
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'RSVP updated successfully',
                'data' => ['attendance_id' => $attendance_id, 'status' => $status]
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Update failed: ' . $conn->error]);
        }
    } else {
        // Create new
        $insert_query = "INSERT INTO event_attendance (person_id, schedule_id, status, notes, created_at) 
                         VALUES ($person_id, $schedule_id, '$status', '$notes', NOW())";

        if ($conn->query($insert_query) === TRUE) {
            $attendance_id = $conn->insert_id;
            if ($user_id && $user_id > 0) {
                logAuditAction($user_id, 'CREATE', 'event_attendance', "Created RSVP for schedule $schedule_id", $conn);
            }
            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'RSVP recorded successfully',
                'data' => ['attendance_id' => $attendance_id, 'status' => $status]
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Insert failed: ' . $conn->error]);
        }
    }

} elseif ($request_method === 'PUT') {
    // Update attendance status
    $data = json_decode(file_get_contents("php://input"), true);
    $user_id = isset($data['user_id']) && intval($data['user_id']) > 0 ? intval($data['user_id']) : null;

    if (!isset($data['attendance_id']) || !isset($data['status'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields: attendance_id, status']);
        exit();
    }

    $attendance_id = intval($data['attendance_id']);
    $status = $conn->real_escape_string($data['status']);
    $notes = isset($data['notes']) ? $conn->real_escape_string($data['notes']) : '';

    $query = "UPDATE event_attendance 
              SET status = '$status', notes = '$notes', updated_at = NOW()
              WHERE attendance_id = $attendance_id";

    if ($conn->query($query) === TRUE) {
        if ($user_id && $user_id > 0) {
            logAuditAction($user_id, 'UPDATE', 'event_attendance', "Updated attendance record $attendance_id", $conn);
        }
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Attendance updated successfully',
            'data' => ['attendance_id' => $attendance_id, 'status' => $status]
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Update failed: ' . $conn->error]);
    }

} elseif ($request_method === 'DELETE') {
    // Delete attendance record
    $user_id = isset($_GET['user_id']) && intval($_GET['user_id']) > 0 ? intval($_GET['user_id']) : null;
    $attendance_id = isset($_GET['attendance_id']) ? intval($_GET['attendance_id']) : null;

    if (!$attendance_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing attendance_id']);
        exit();
    }

    $query = "DELETE FROM event_attendance WHERE attendance_id = $attendance_id";

    if ($conn->query($query) === TRUE) {
        if ($user_id && $user_id > 0) {
            logAuditAction($user_id, 'DELETE', 'event_attendance', "Deleted attendance record $attendance_id", $conn);
        }
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Attendance record deleted successfully'
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Delete failed: ' . $conn->error]);
    }
}
?>
