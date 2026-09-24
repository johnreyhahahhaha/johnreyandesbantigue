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
    $query = "SELECT * FROM accounting_categories ORDER BY cat_id DESC";
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
    
    if (!$input || !isset($input['cat_name']) || !isset($input['type'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields: cat_name, type']);
        exit();
    }

    // Validate type enum
    $validTypes = ['Revenue', 'Expense'];
    if (!in_array($input['type'], $validTypes)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid type. Must be "Revenue" or "Expense"']);
        exit();
    }

    $cat_name = $conn->real_escape_string($input['cat_name']);
    $type = $conn->real_escape_string($input['type']);

    $query = "INSERT INTO accounting_categories (cat_name, type) VALUES ('$cat_name', '$type')";
    
    if ($conn->query($query)) {
        $new_id = $conn->insert_id;
        logAudit($conn, $_SESSION['user_id'] ?? 1, 'CREATE', 'accounting_categories', "Created category: $cat_name");
        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Category created successfully', 'id' => $new_id]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create category: ' . $conn->error]);
    }

} elseif ($request_method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['cat_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing cat_id']);
        exit();
    }

    $cat_id = (int)$input['cat_id'];
    $updates = [];
    
    if (isset($input['cat_name'])) {
        $updates[] = "cat_name = '" . $conn->real_escape_string($input['cat_name']) . "'";
    }
    if (isset($input['type'])) {
        // Validate type enum
        $validTypes = ['Revenue', 'Expense'];
        if (!in_array($input['type'], $validTypes)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid type. Must be "Revenue" or "Expense"']);
            exit();
        }
        $updates[] = "type = '" . $conn->real_escape_string($input['type']) . "'";
    }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit();
    }

    $query = "UPDATE accounting_categories SET " . implode(', ', $updates) . " WHERE cat_id = $cat_id";
    
    if ($conn->query($query)) {
        logAudit($conn, $_SESSION['user_id'] ?? 1, 'UPDATE', 'accounting_categories', "Updated category ID: $cat_id");
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Category updated successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update category: ' . $conn->error]);
    }

} elseif ($request_method === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['cat_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing cat_id']);
        exit();
    }

    $cat_id = (int)$input['cat_id'];

    $query = "DELETE FROM accounting_categories WHERE cat_id = $cat_id";
    
    if ($conn->query($query)) {
        logAudit($conn, $_SESSION['user_id'] ?? 1, 'DELETE', 'accounting_categories', "Deleted category ID: $cat_id");
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Category deleted successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete category: ' . $conn->error]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>