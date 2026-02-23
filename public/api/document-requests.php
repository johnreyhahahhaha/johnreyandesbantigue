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

header('Content-Type: application/json; charset=utf-8');

// Debug: Check if connection is valid
if (!$conn) {
    http_response_code(500);
    exit(json_encode(['success' => false, 'message' => 'Database connection not available']));
}

$request_method = $_SERVER['REQUEST_METHOD'];
$request_id = isset($_GET['id']) ? intval($_GET['id']) : null;

if ($request_method === 'GET') {
    // Get document requests with person details
    $status = isset($_GET['status']) ? $conn->real_escape_string($_GET['status']) : 'all';

    if ($status === 'all') {
        $query = "SELECT dr.*, p.first_name, p.last_name 
                  FROM document_requests dr
                  LEFT JOIN persons p ON dr.person_id = p.person_id
                  ORDER BY dr.request_date DESC";
    } else {
        $query = "SELECT dr.*, p.first_name, p.last_name 
                  FROM document_requests dr
                  LEFT JOIN persons p ON dr.person_id = p.person_id
                  WHERE dr.status = '$status' 
                  ORDER BY dr.request_date DESC";
    }

    $result = $conn->query($query);

    if (!$result) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]);
        exit();
    }

    $requests = [];
    while ($row = $result->fetch_assoc()) {
        $requests[] = $row;
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $requests,
        'count' => count($requests)
    ]);

} elseif ($request_method === 'POST') {
    // Create new document request
    $data = json_decode(file_get_contents("php://input"), true);
    $user_id = isset($data['user_id']) && intval($data['user_id']) > 0 ? intval($data['user_id']) : null;

    if (!isset($data['person_id']) || !isset($data['document_type'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields: person_id and document_type']);
        exit();
    }

    $person_id = intval($data['person_id']);
    $document_type = $conn->real_escape_string($data['document_type']);
    $purpose = $conn->real_escape_string($data['purpose'] ?? '');
    $status = $conn->real_escape_string($data['status'] ?? 'Pending');
    $payment_status = $conn->real_escape_string($data['payment_status'] ?? 'Unpaid');
    $amount_paid = floatval($data['amount_paid'] ?? 0);

    // Check if person exists
    $person_check = $conn->query("SELECT person_id FROM persons WHERE person_id = $person_id");
    if ($person_check->num_rows === 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid person_id']);
        exit();
    }

    $query = "INSERT INTO document_requests (person_id, document_type, purpose, status, payment_status, amount_paid)
              VALUES ($person_id, '$document_type', '$purpose', '$status', '$payment_status', $amount_paid)";

    if ($conn->query($query) === TRUE) {
        $request_id = $conn->insert_id;
        
        // Log the action
        if ($user_id && $user_id > 0) {
            logAuditAction($user_id, 'CREATE', 'document_requests', "Created document request: $document_type for person ID: $person_id", $conn);
        }
        
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Document request created successfully',
            'request_id' => $request_id
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create request: ' . $conn->error]);
    }

} elseif ($request_method === 'PUT') {
    // Update document request
    $data = json_decode(file_get_contents("php://input"), true);
    $user_id = isset($data['user_id']) && intval($data['user_id']) > 0 ? intval($data['user_id']) : null;

    // Get request_id from query parameter or body
    $request_id = $request_id ?? (isset($data['request_id']) ? intval($data['request_id']) : null);

    if (!$request_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing request_id parameter']);
        exit();
    }

    // Check if request exists
    $check_query = "SELECT request_id FROM document_requests WHERE request_id = $request_id";
    $check_result = $conn->query($check_query);
    if ($check_result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Request not found']);
        exit();
    }

    $update_fields = [];

    if (isset($data['person_id'])) {
        $person_id = intval($data['person_id']);
        $update_fields[] = "person_id = $person_id";
    }

    if (isset($data['document_type'])) {
        $document_type = $conn->real_escape_string($data['document_type']);
        $update_fields[] = "document_type = '$document_type'";
    }

    if (isset($data['purpose'])) {
        $purpose = $conn->real_escape_string($data['purpose']);
        $update_fields[] = "purpose = '$purpose'";
    }

    if (isset($data['status'])) {
        $status = $conn->real_escape_string($data['status']);
        $update_fields[] = "status = '$status'";
    }

    if (isset($data['payment_status'])) {
        $payment_status = $conn->real_escape_string($data['payment_status']);
        $update_fields[] = "payment_status = '$payment_status'";
    }

    if (isset($data['amount_paid'])) {
        $amount_paid = floatval($data['amount_paid']);
        $update_fields[] = "amount_paid = $amount_paid";
    }

    if (empty($update_fields)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit();
    }

    $query = "UPDATE document_requests SET " . implode(", ", $update_fields) . " WHERE request_id = $request_id";

    if ($conn->query($query) === TRUE) {
        // Log the action
        if ($user_id && $user_id > 0) {
            logAuditAction($user_id, 'UPDATE', 'document_requests', "Updated document request ID: $request_id", $conn);
        }
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Document request updated successfully'
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update request: ' . $conn->error]);
    }

} elseif ($request_method === 'DELETE') {
    // Delete document request
    $data = json_decode(file_get_contents("php://input"), true);
    $user_id = isset($data['user_id']) && intval($data['user_id']) > 0 ? intval($data['user_id']) : null;
    
    if (!$request_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing request_id parameter']);
        exit();
    }

    $query = "DELETE FROM document_requests WHERE request_id = $request_id";

    if ($conn->query($query) === TRUE) {
        // Log the action
        if ($user_id && $user_id > 0) {
            logAuditAction($user_id, 'DELETE', 'document_requests', "Deleted document request ID: $request_id", $conn);
        }
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Document request deleted successfully'
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete request: ' . $conn->error]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

$conn->close();
?>
