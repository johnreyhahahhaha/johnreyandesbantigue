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
    $query = "SELECT * FROM service_fees ORDER BY service_name ASC";
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
    
    if (!$input || !isset($input['service_name']) || !isset($input['amount'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields: service_name, amount']);
        exit();
    }

    $service_name = $conn->real_escape_string($input['service_name']);
    $description = isset($input['description']) ? $conn->real_escape_string($input['description']) : '';
    $service_type = isset($input['service_type']) ? $conn->real_escape_string($input['service_type']) : 'General';
    $amount = (float)$input['amount'];
    $is_active = isset($input['is_active']) ? (int)$input['is_active'] : 1;

    $query = "INSERT INTO service_fees (service_name, description, service_type, amount, is_active) VALUES ('$service_name', '$description', '$service_type', $amount, $is_active)";
    
    if ($conn->query($query)) {
        $new_id = $conn->insert_id;
        logAuditAction($_SESSION['user_id'] ?? 1, 'CREATE', 'service_fees', "Created service fee: $service_name", $conn);
        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Service fee created successfully', 'id' => $new_id]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create service fee: ' . $conn->error]);
    }

} elseif ($request_method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['fee_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing fee_id']);
        exit();
    }

    $fee_id = (int)$input['fee_id'];
    $updates = [];
    
    if (isset($input['service_name'])) {
        $updates[] = "service_name = '" . $conn->real_escape_string($input['service_name']) . "'";
    }
    if (isset($input['description'])) {
        $updates[] = "description = '" . $conn->real_escape_string($input['description']) . "'";
    }
    if (isset($input['service_type'])) {
        $updates[] = "service_type = '" . $conn->real_escape_string($input['service_type']) . "'";
    }
    if (isset($input['amount'])) {
        $updates[] = "amount = " . (float)$input['amount'];
    }
    if (isset($input['is_active'])) {
        $updates[] = "is_active = " . (int)$input['is_active'];
    }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit();
    }

    $query = "UPDATE service_fees SET " . implode(', ', $updates) . ", updated_at = CURRENT_TIMESTAMP WHERE fee_id = $fee_id";
    
    if ($conn->query($query)) {
        logAuditAction($_SESSION['user_id'] ?? 1, 'UPDATE', 'service_fees', "Updated service fee ID: $fee_id", $conn);
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Service fee updated successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update service fee: ' . $conn->error]);
    }

} elseif ($request_method === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['fee_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing fee_id']);
        exit();
    }

    $fee_id = (int)$input['fee_id'];

    $query = "DELETE FROM service_fees WHERE fee_id = $fee_id";
    
    if ($conn->query($query)) {
        logAuditAction($_SESSION['user_id'] ?? 1, 'DELETE', 'service_fees', "Deleted service fee ID: $fee_id", $conn);
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Service fee deleted successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete service fee: ' . $conn->error]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>