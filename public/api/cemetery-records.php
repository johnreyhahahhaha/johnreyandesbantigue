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
} elseif ($request_method === 'DELETE') {
    // Delete cemetery record
    $lot_id = isset($_GET['id']) ? intval($_GET['id']) : null;

    if (!$lot_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'lot_id is required']);
        exit();
    }

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
