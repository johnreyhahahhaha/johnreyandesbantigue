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
    $query = "SELECT gpr.*, p.first_name, p.last_name FROM godparents_records gpr 
              LEFT JOIN persons p ON gpr.person_id = p.person_id
              ORDER BY gpr.gp_id DESC";
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
    
    if (!$input || !isset($input['person_id']) || !isset($input['record_type']) || !isset($input['record_id']) || !isset($input['godparent_name'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields: person_id, record_type, record_id, godparent_name']);
        exit();
    }

    $person_id = (int)$input['person_id'];
    $record_type = $conn->real_escape_string($input['record_type']);
    $record_id = (int)$input['record_id'];
    $godparent_name = $conn->real_escape_string($input['godparent_name']);

    $query = "INSERT INTO godparents_records (person_id, record_type, record_id, godparent_name) 
              VALUES ($person_id, '$record_type', $record_id, '$godparent_name')";
    
    if ($conn->query($query)) {
        $new_id = $conn->insert_id;
        logAudit($conn, $_SESSION['user_id'] ?? 1, 'CREATE', 'godparents_records', "Added godparent for person ID: $person_id");
        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Godparent record created successfully', 'id' => $new_id]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create godparent record: ' . $conn->error]);
    }

} elseif ($request_method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['gp_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing gp_id']);
        exit();
    }

    $gp_id = (int)$input['gp_id'];
    $updates = [];
    
    if (isset($input['person_id'])) {
        $updates[] = "person_id = " . (int)$input['person_id'];
    }
    if (isset($input['record_type'])) {
        $updates[] = "record_type = '" . $conn->real_escape_string($input['record_type']) . "'";
    }
    if (isset($input['record_id'])) {
        $updates[] = "record_id = " . (int)$input['record_id'];
    }
    if (isset($input['godparent_name'])) {
        $updates[] = "godparent_name = '" . $conn->real_escape_string($input['godparent_name']) . "'";
    }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit();
    }

    $query = "UPDATE godparents_records SET " . implode(', ', $updates) . " WHERE gp_id = $gp_id";
    
    if ($conn->query($query)) {
        logAudit($conn, $_SESSION['user_id'] ?? 1, 'UPDATE', 'godparents_records', "Updated godparent record ID: $gp_id");
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Godparent record updated successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update godparent record: ' . $conn->error]);
    }

} elseif ($request_method === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['gp_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing gp_id']);
        exit();
    }

    $gp_id = (int)$input['gp_id'];

    $query = "DELETE FROM godparents_records WHERE gp_id = $gp_id";
    
    if ($conn->query($query)) {
        logAudit($conn, $_SESSION['user_id'] ?? 1, 'DELETE', 'godparents_records', "Deleted godparent record ID: $gp_id");
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Godparent record deleted successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete godparent record: ' . $conn->error]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>