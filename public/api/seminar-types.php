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
    $query = "SELECT * FROM seminar_types ORDER BY seminar_name ASC";
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
    
    if (!$input || !isset($input['seminar_name'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required field: seminar_name']);
        exit();
    }

    $seminar_name = $conn->real_escape_string($input['seminar_name']);

    $query = "INSERT INTO seminar_types (seminar_name) VALUES ('$seminar_name')";
    
    if ($conn->query($query)) {
        $new_id = $conn->insert_id;
        logAudit($conn, $_SESSION['user_id'] ?? 1, 'CREATE', 'seminar_types', "Created seminar type: $seminar_name");
        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Seminar type created successfully', 'id' => $new_id]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create seminar type: ' . $conn->error]);
    }

} elseif ($request_method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['seminar_type_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing seminar_type_id']);
        exit();
    }

    $seminar_type_id = (int)$input['seminar_type_id'];
    $updates = [];
    
    if (isset($input['seminar_name'])) {
        $updates[] = "seminar_name = '" . $conn->real_escape_string($input['seminar_name']) . "'";
    }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit();
    }

    $query = "UPDATE seminar_types SET " . implode(', ', $updates) . " WHERE seminar_type_id = $seminar_type_id";
    
    if ($conn->query($query)) {
        logAudit($conn, $_SESSION['user_id'] ?? 1, 'UPDATE', 'seminar_types', "Updated seminar type ID: $seminar_type_id");
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Seminar type updated successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update seminar type: ' . $conn->error]);
    }

} elseif ($request_method === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['seminar_type_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing seminar_type_id']);
        exit();
    }

    $seminar_type_id = (int)$input['seminar_type_id'];

    $query = "DELETE FROM seminar_types WHERE seminar_type_id = $seminar_type_id";
    
    if ($conn->query($query)) {
        logAudit($conn, $_SESSION['user_id'] ?? 1, 'DELETE', 'seminar_types', "Deleted seminar type ID: $seminar_type_id");
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Seminar type deleted successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete seminar type: ' . $conn->error]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>