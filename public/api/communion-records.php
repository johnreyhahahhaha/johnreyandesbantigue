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
    $query = "SELECT cr.*, p.first_name, p.last_name, pr.first_name as priest_first, pr.last_name as priest_last 
              FROM communion_records cr 
              LEFT JOIN persons p ON cr.person_id = p.person_id
              LEFT JOIN persons pr ON cr.priest_id = pr.person_id
              ORDER BY cr.communion_date DESC";
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
    
    if (!$input || !isset($input['person_id']) || !isset($input['communion_date'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields: person_id, communion_date']);
        exit();
    }

    $person_id = (int)$input['person_id'];
    $communion_date = $conn->real_escape_string($input['communion_date']);
    $priest_id = isset($input['priest_id']) ? (int)$input['priest_id'] : "NULL";
    $book_no = isset($input['book_no']) ? (int)$input['book_no'] : 0;
    $page_no = isset($input['page_no']) ? (int)$input['page_no'] : 0;
    $line_no = isset($input['line_no']) ? (int)$input['line_no'] : 0;

    $query = "INSERT INTO communion_records (person_id, communion_date, priest_id, book_no, page_no, line_no) 
              VALUES ($person_id, '$communion_date', $priest_id, $book_no, $page_no, $line_no)";
    
    if ($conn->query($query)) {
        $new_id = $conn->insert_id;
        logAudit($conn, $_SESSION['user_id'] ?? 1, 'CREATE', 'communion_records', "Created communion record for person ID: $person_id");
        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Communion record created successfully', 'id' => $new_id]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create communion record: ' . $conn->error]);
    }

} elseif ($request_method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['communion_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing communion_id']);
        exit();
    }

    $communion_id = (int)$input['communion_id'];
    $updates = [];
    
    if (isset($input['person_id'])) {
        $updates[] = "person_id = " . (int)$input['person_id'];
    }
    if (isset($input['communion_date'])) {
        $updates[] = "communion_date = '" . $conn->real_escape_string($input['communion_date']) . "'";
    }
    if (isset($input['priest_id'])) {
        $updates[] = "priest_id = " . (int)$input['priest_id'];
    }
    if (isset($input['book_no'])) {
        $updates[] = "book_no = " . (int)$input['book_no'];
    }
    if (isset($input['page_no'])) {
        $updates[] = "page_no = " . (int)$input['page_no'];
    }
    if (isset($input['line_no'])) {
        $updates[] = "line_no = " . (int)$input['line_no'];
    }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit();
    }

    $query = "UPDATE communion_records SET " . implode(', ', $updates) . " WHERE communion_id = $communion_id";
    
    if ($conn->query($query)) {
        logAudit($conn, $_SESSION['user_id'] ?? 1, 'UPDATE', 'communion_records', "Updated communion record ID: $communion_id");
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Communion record updated successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update communion record: ' . $conn->error]);
    }

} elseif ($request_method === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['communion_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing communion_id']);
        exit();
    }

    $communion_id = (int)$input['communion_id'];

    $query = "DELETE FROM communion_records WHERE communion_id = $communion_id";
    
    if ($conn->query($query)) {
        logAudit($conn, $_SESSION['user_id'] ?? 1, 'DELETE', 'communion_records', "Deleted communion record ID: $communion_id");
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Communion record deleted successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete communion record: ' . $conn->error]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>