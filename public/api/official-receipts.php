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
    $query = "SELECT o.*, p.first_name, p.last_name FROM official_receipts o 
              LEFT JOIN persons p ON o.payor_person_id = p.person_id
              ORDER BY o.payment_date DESC";
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
    
    if (!$input || !isset($input['or_number']) || !isset($input['total_amount']) || !isset($input['payment_method'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields: or_number, total_amount, payment_method']);
        exit();
    }

    $or_number = $conn->real_escape_string($input['or_number']);
    $payor_person_id = isset($input['payor_person_id']) ? (int)$input['payor_person_id'] : "NULL";
    $total_amount = (float)$input['total_amount'];
    $payment_method = $conn->real_escape_string($input['payment_method']);

    $query = "INSERT INTO official_receipts (or_number, payor_person_id, total_amount, payment_method) 
              VALUES ('$or_number', $payor_person_id, $total_amount, '$payment_method')";
    
    if ($conn->query($query)) {
        $new_id = $conn->insert_id;
        logAuditAction($_SESSION['user_id'] ?? 1, 'CREATE', 'official_receipts', "Created official receipt: $or_number", $conn);
        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Official receipt created successfully', 'id' => $new_id]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create official receipt: ' . $conn->error]);
    }

} elseif ($request_method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['or_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing or_id']);
        exit();
    }

    $or_id = (int)$input['or_id'];
    $updates = [];
    
    if (isset($input['or_number'])) {
        $updates[] = "or_number = '" . $conn->real_escape_string($input['or_number']) . "'";
    }
    if (isset($input['payor_person_id'])) {
        $updates[] = "payor_person_id = " . (int)$input['payor_person_id'];
    }
    if (isset($input['total_amount'])) {
        $updates[] = "total_amount = " . (float)$input['total_amount'];
    }
    if (isset($input['payment_method'])) {
        $updates[] = "payment_method = '" . $conn->real_escape_string($input['payment_method']) . "'";
    }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit();
    }

    $query = "UPDATE official_receipts SET " . implode(', ', $updates) . " WHERE or_id = $or_id";
    
    if ($conn->query($query)) {
        logAuditAction($_SESSION['user_id'] ?? 1, 'UPDATE', 'official_receipts', "Updated official receipt ID: $or_id", $conn);
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Official receipt updated successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update official receipt: ' . $conn->error]);
    }

} elseif ($request_method === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['or_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing or_id']);
        exit();
    }

    $or_id = (int)$input['or_id'];

    $query = "DELETE FROM official_receipts WHERE or_id = $or_id";
    
    if ($conn->query($query)) {
        logAuditAction($_SESSION['user_id'] ?? 1, 'DELETE', 'official_receipts', "Deleted official receipt ID: $or_id", $conn);
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Official receipt deleted successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete official receipt: ' . $conn->error]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>