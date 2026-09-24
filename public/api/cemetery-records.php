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
    // Get all cemetery records
    $query = "SELECT cr.*, p.first_name, p.last_name FROM cemetery_records cr
              LEFT JOIN persons p ON cr.deceased_id = p.person_id
              ORDER BY cr.lot_id DESC";

    $result = $conn->query($query);

    if (!$result) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]);
        exit();
    }

    $records = [];
    while ($row = $result->fetch_assoc()) {
        $records[] = $row;
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $records,
        'count' => count($records)
    ]);
} elseif ($request_method === 'POST') {
    // Create cemetery record
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['deceased_id']) || !isset($data['block_no']) || !isset($data['row_no'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        exit();
    }

    $deceased_id = intval($data['deceased_id']);
    
    // Validate that deceased_id exists in persons table
    $person_check = $conn->query("SELECT person_id FROM persons WHERE person_id = $deceased_id LIMIT 1");
    if (!$person_check || $person_check->num_rows == 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid deceased_id - person not found']);
        exit();
    }
    
    $block_no = $conn->real_escape_string($data['block_no']);
    $row_no = $conn->real_escape_string($data['row_no']);
    $lot_type = $conn->real_escape_string($data['lot_type'] ?? 'Common');
    $lease_start = $conn->real_escape_string($data['lease_start'] ?? date('Y-m-d'));
    $lease_end = $conn->real_escape_string($data['lease_end'] ?? date('Y-m-d', strtotime('+10 years')));

    $query = "INSERT INTO cemetery_records (deceased_id, block_no, row_no, lot_type, lease_start, lease_end)
              VALUES ($deceased_id, '$block_no', '$row_no', '$lot_type', '$lease_start', '$lease_end')";

    if ($conn->query($query) === TRUE) {
        $lot_id = $conn->insert_id;
        logAuditAction($_SESSION['user_id'] ?? 0, 'CREATE', 'cemetery_records', "Added cemetery record for deceased_id: $deceased_id", $conn);
        
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Cemetery record created successfully',
            'lot_id' => $lot_id
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create cemetery record: ' . $conn->error]);
    }
} elseif ($request_method === 'PUT') {
    // Update cemetery record
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['lot_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'lot_id is required']);
        exit();
    }

    $lot_id = intval($data['lot_id']);
    $deceased_id = isset($data['deceased_id']) ? intval($data['deceased_id']) : null;
    $block_no = isset($data['block_no']) ? $conn->real_escape_string($data['block_no']) : null;
    $row_no = isset($data['row_no']) ? $conn->real_escape_string($data['row_no']) : null;
    $lot_type = isset($data['lot_type']) ? $conn->real_escape_string($data['lot_type']) : null;
    $lease_start = isset($data['lease_start']) ? $conn->real_escape_string($data['lease_start']) : null;
    $lease_end = isset($data['lease_end']) ? $conn->real_escape_string($data['lease_end']) : null;

    // Validate deceased_id if being updated
    if ($deceased_id !== null && $deceased_id > 0) {
        $person_check = $conn->query("SELECT person_id FROM persons WHERE person_id = $deceased_id LIMIT 1");
        if (!$person_check || $person_check->num_rows == 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid deceased_id - person not found']);
            exit();
        }
    }

    $updates = [];
    if ($deceased_id !== null) $updates[] = "deceased_id = $deceased_id";
    if ($block_no !== null) $updates[] = "block_no = '$block_no'";
    if ($row_no !== null) $updates[] = "row_no = '$row_no'";
    if ($lot_type !== null) $updates[] = "lot_type = '$lot_type'";
    if ($lease_start !== null) $updates[] = "lease_start = '$lease_start'";
    if ($lease_end !== null) $updates[] = "lease_end = '$lease_end'";

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit();
    }

    $query = "UPDATE cemetery_records SET " . implode(', ', $updates) . " WHERE lot_id = $lot_id";

    if ($conn->query($query) === TRUE) {
        logAuditAction($_SESSION['user_id'] ?? 0, 'UPDATE', 'cemetery_records', "Updated cemetery record: $lot_id", $conn);
        
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Cemetery record updated successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update cemetery record: ' . $conn->error]);
    }
} elseif ($request_method === 'DELETE') {
    // Delete cemetery record
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['lot_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'lot_id is required']);
        exit();
    }

    $lot_id = intval($input['lot_id']);

    $query = "DELETE FROM cemetery_records WHERE lot_id = $lot_id";

    if ($conn->query($query) === TRUE) {
        logAuditAction($_SESSION['user_id'] ?? 0, 'DELETE', 'cemetery_records', "Deleted cemetery record: $lot_id", $conn);
        
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Cemetery record deleted successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete cemetery record: ' . $conn->error]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

$conn->close();
?>
