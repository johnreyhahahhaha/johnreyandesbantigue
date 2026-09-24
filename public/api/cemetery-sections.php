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
    $query = "SELECT * FROM cemetery_sections ORDER BY section_name ASC";
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
    
    if (!$input || !isset($input['section_name'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required field: section_name']);
        exit();
    }

    $section_name = $conn->real_escape_string($input['section_name']);

    $query = "INSERT INTO cemetery_sections (section_name) VALUES ('$section_name')";
    
    if ($conn->query($query)) {
        $new_id = $conn->insert_id;
        logAudit($conn, $_SESSION['user_id'] ?? 1, 'CREATE', 'cemetery_sections', "Created cemetery section: $section_name");
        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Cemetery section created successfully', 'id' => $new_id]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create cemetery section: ' . $conn->error]);
    }

} elseif ($request_method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['section_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing section_id']);
        exit();
    }

    $section_id = (int)$input['section_id'];
    $updates = [];
    
    if (isset($input['section_name'])) {
        $updates[] = "section_name = '" . $conn->real_escape_string($input['section_name']) . "'";
    }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit();
    }

    $query = "UPDATE cemetery_sections SET " . implode(', ', $updates) . " WHERE section_id = $section_id";
    
    if ($conn->query($query)) {
        logAuditAction($_SESSION['user_id'] ?? 1, 'UPDATE', 'cemetery_sections', "Updated cemetery section ID: $section_id", $conn);
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Cemetery section updated successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update cemetery section: ' . $conn->error]);
    }

} elseif ($request_method === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['section_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing section_id']);
        exit();
    }

    $section_id = (int)$input['section_id'];

    $query = "DELETE FROM cemetery_sections WHERE section_id = $section_id";
    
    if ($conn->query($query)) {
        logAuditAction($_SESSION['user_id'] ?? 1, 'DELETE', 'cemetery_sections', "Deleted cemetery section ID: $section_id", $conn);
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Cemetery section deleted successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete cemetery section: ' . $conn->error]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>