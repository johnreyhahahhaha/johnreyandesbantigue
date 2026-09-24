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
    // Handle filtering parameters
    $showAll = isset($_GET['show_all']) && $_GET['show_all'] == 1;
    $searchTerm = isset($_GET['search']) ? $_GET['search'] : '';
    
    $query = "SELECT dt.*, su.username as created_by_name FROM document_templates dt LEFT JOIN system_users su ON dt.created_by = su.user_id";
    
    // Add WHERE clause for filters
    $whereConditions = [];
    if (!$showAll) {
        $whereConditions[] = "dt.is_active = 1";
    }
    if (!empty($searchTerm)) {
        $searchTerm = $conn->real_escape_string($searchTerm);
        $whereConditions[] = "(dt.doc_type LIKE '%$searchTerm%' OR dt.description LIKE '%$searchTerm%' OR dt.template_body LIKE '%$searchTerm%')";
    }
    
    if (!empty($whereConditions)) {
        $query .= " WHERE " . implode(' AND ', $whereConditions);
    }
    
    $query .= " ORDER BY dt.doc_type ASC";
    
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
    
    if (!$input || !isset($input['doc_type']) || !isset($input['template_body'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields: doc_type, template_body']);
        exit();
    }

    $doc_type = $conn->real_escape_string($input['doc_type']);
    $template_body = $conn->real_escape_string($input['template_body']);
    $description = isset($input['description']) ? $conn->real_escape_string($input['description']) : null;
    $is_active = isset($input['is_active']) ? (int)$input['is_active'] : 1;

    $query = "INSERT INTO document_templates (doc_type, template_body, description, is_active) VALUES ('$doc_type', '$template_body', '" . ($description !== null ? $description : '') . "', $is_active)";
    
    if ($conn->query($query)) {
        $new_id = $conn->insert_id;
        logAudit($conn, $_SESSION['user_id'] ?? 1, 'CREATE', 'document_templates', "Created document template: $doc_type");
        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Document template created successfully', 'id' => $new_id]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create document template: ' . $conn->error]);
    }

} elseif ($request_method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['template_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing template_id']);
        exit();
    }

    $template_id = (int)$input['template_id'];
    $updates = [];
    
    if (isset($input['doc_type'])) {
        $updates[] = "doc_type = '" . $conn->real_escape_string($input['doc_type']) . "'";
    }
    if (isset($input['template_body'])) {
        $updates[] = "template_body = '" . $conn->real_escape_string($input['template_body']) . "'";
    }
    if (isset($input['description'])) {
        $updates[] = "description = '" . $conn->real_escape_string($input['description']) . "'";
    }
    if (isset($input['is_active'])) {
        $updates[] = "is_active = " . (int)$input['is_active'];
    }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit();
    }

    $query = "UPDATE document_templates SET " . implode(', ', $updates) . " WHERE template_id = $template_id";
    
    if ($conn->query($query)) {
        logAudit($conn, $_SESSION['user_id'] ?? 1, 'UPDATE', 'document_templates', "Updated document template ID: $template_id");
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Document template updated successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update document template: ' . $conn->error]);
    }

} elseif ($request_method === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['template_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing template_id']);
        exit();
    }

    $template_id = (int)$input['template_id'];

    $query = "DELETE FROM document_templates WHERE template_id = $template_id";
    
    if ($conn->query($query)) {
        logAudit($conn, $_SESSION['user_id'] ?? 1, 'DELETE', 'document_templates', "Deleted document template ID: $template_id");
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Document template deleted successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete document template: ' . $conn->error]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>