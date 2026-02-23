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

$request_method = $_SERVER['REQUEST_METHOD'];

if ($request_method === 'GET') {
    // Get schedules
    $query = "SELECT * FROM parish_schedules 
              ORDER BY start_datetime DESC";

    $result = $conn->query($query);

    if (!$result) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]);
        exit();
    }

    $schedules = [];
    while ($row = $result->fetch_assoc()) {
        $schedules[] = $row;
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $schedules,
        'count' => count($schedules)
    ]);

} elseif ($request_method === 'POST') {
    // Create new schedule
    $data = json_decode(file_get_contents("php://input"), true);
    $user_id = isset($data['user_id']) && intval($data['user_id']) > 0 ? intval($data['user_id']) : null;

    if (!isset($data['event_title']) || !isset($data['start_datetime'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        exit();
    }

    $event_title = $conn->real_escape_string($data['event_title']);
    $event_type = $conn->real_escape_string($data['event_type'] ?? 'Meeting');
    $start_datetime = $conn->real_escape_string($data['start_datetime']);
    $end_datetime = $conn->real_escape_string($data['end_datetime'] ?? $data['start_datetime']);
    $location = $conn->real_escape_string($data['location'] ?? 'Parish Church');
    $assigned_priest = $conn->real_escape_string($data['assigned_priest'] ?? '');
    $status = $conn->real_escape_string($data['status'] ?? 'Scheduled');

    $query = "INSERT INTO parish_schedules (event_title, event_type, start_datetime, end_datetime, location, assigned_priest, status)
              VALUES ('$event_title', '$event_type', '$start_datetime', '$end_datetime', '$location', '$assigned_priest', '$status')";

    if ($conn->query($query) === TRUE) {
        $schedule_id = $conn->insert_id;
        
        // Log the action
        if ($user_id && $user_id > 0) {
            logAuditAction($user_id, 'CREATE', 'parish_schedules', "Created schedule: $event_title at $location", $conn);
        }
        
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Schedule created successfully',
            'schedule_id' => $schedule_id
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create schedule: ' . $conn->error]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

$conn->close();
?>
