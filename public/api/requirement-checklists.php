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
    // Get all requirement checklists
    $query = "SELECT rc.*, 
              CASE 
                WHEN b.baptism_id IS NOT NULL THEN 'Baptism'
                WHEN m.marriage_id IS NOT NULL THEN 'Marriage'
                WHEN c.confirmation_id IS NOT NULL THEN 'Confirmation'
              END as related_type
              FROM requirement_checklists rc
              LEFT JOIN baptismal_records b ON rc.baptism_id = b.baptism_id
              LEFT JOIN marriage_records m ON rc.marriage_id = m.marriage_id
              LEFT JOIN confirmation_records c ON rc.confirmation_id = c.confirmation_id
              ORDER BY rc.check_id DESC";

    $result = $conn->query($query);

    if (!$result) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]);
        exit();
    }

    $checklists = [];
    while ($row = $result->fetch_assoc()) {
        $checklists[] = $row;
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $checklists,
        'count' => count($checklists)
    ]);
} elseif ($request_method === 'POST') {
    // Create requirement checklist
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['requirement_name'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        exit();
    }

    $category = $conn->real_escape_string($data['category'] ?? 'Baptism');
    $requirement_name = $conn->real_escape_string($data['requirement_name']);
    $is_submitted = intval($data['is_submitted'] ?? 0);
    // if submission checkbox is set but date is empty string, fall back to today
    $date_submitted = $is_submitted ? $conn->real_escape_string(($data['date_submitted'] ?? '') ?: date('Y-m-d')) : 'NULL';
    $baptism_id = intval($data['baptism_id'] ?? 0);
    $marriage_id = intval($data['marriage_id'] ?? 0);
    $confirmation_id = intval($data['confirmation_id'] ?? 0);
    $record_id = intval($data['record_id'] ?? 0);

    $date_submitted_val = ($date_submitted === 'NULL') ? 'NULL' : "'$date_submitted'";
    $baptism_id_val = $baptism_id > 0 ? $baptism_id : 'NULL';
    $marriage_id_val = $marriage_id > 0 ? $marriage_id : 'NULL';
    $confirmation_id_val = $confirmation_id > 0 ? $confirmation_id : 'NULL';
    $record_id_val = $record_id > 0 ? $record_id : 'NULL';

    $query = "INSERT INTO requirement_checklists (category, requirement_name, is_submitted, date_submitted, baptism_id, marriage_id, confirmation_id, record_id)
              VALUES ('$category', '$requirement_name', $is_submitted, $date_submitted_val, $baptism_id_val, $marriage_id_val, $confirmation_id_val, $record_id_val)";

    if ($conn->query($query) === TRUE) {
        $check_id = $conn->insert_id;
        logAuditAction($_SESSION['user_id'] ?? 0, 'CREATE', 'requirement_checklists', "Added requirement: $requirement_name", $conn);
        
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Requirement checklist created successfully',
            'check_id' => $check_id
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create requirement checklist: ' . $conn->error]);
    }
} elseif ($request_method === 'PUT') {
    // Update requirement checklist
    $data = json_decode(file_get_contents('php://input'), true);
    $check_id = isset($_GET['id']) ? intval($_GET['id']) : null;

    if (!$check_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'check_id is required']);
        exit();
    }

    $category = $conn->real_escape_string($data['category'] ?? 'Baptism');
    $requirement_name = $conn->real_escape_string($data['requirement_name'] ?? '');
    $is_submitted = intval($data['is_submitted'] ?? 0);
    $date_submitted = $is_submitted ? $conn->real_escape_string(($data['date_submitted'] ?? '') ?: date('Y-m-d')) : 'NULL';
    $baptism_id = intval($data['baptism_id'] ?? 0);
    $marriage_id = intval($data['marriage_id'] ?? 0);
    $confirmation_id = intval($data['confirmation_id'] ?? 0);
    $record_id = intval($data['record_id'] ?? 0);

    $date_submitted_val = ($date_submitted === 'NULL') ? 'NULL' : "'$date_submitted'";
    $baptism_id_val = $baptism_id > 0 ? $baptism_id : 'NULL';
    $marriage_id_val = $marriage_id > 0 ? $marriage_id : 'NULL';
    $confirmation_id_val = $confirmation_id > 0 ? $confirmation_id : 'NULL';
    $record_id_val = $record_id > 0 ? $record_id : 'NULL';

    $query = "UPDATE requirement_checklists SET category = '$category', requirement_name = '$requirement_name', is_submitted = $is_submitted, date_submitted = $date_submitted_val, baptism_id = $baptism_id_val, marriage_id = $marriage_id_val, confirmation_id = $confirmation_id_val, record_id = $record_id_val WHERE check_id = $check_id";

    if ($conn->query($query) === TRUE) {
        logAuditAction($_SESSION['user_id'] ?? 0, 'UPDATE', 'requirement_checklists', "Updated requirement checklist: $check_id", $conn);
        
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Requirement checklist updated successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update requirement checklist: ' . $conn->error]);
    }
} elseif ($request_method === 'DELETE') {
    // Delete requirement checklist
    $check_id = isset($_GET['id']) ? intval($_GET['id']) : null;

    if (!$check_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'check_id is required']);
        exit();
    }

    $query = "DELETE FROM requirement_checklists WHERE check_id = $check_id";

    if ($conn->query($query) === TRUE) {
        logAuditAction($_SESSION['user_id'] ?? 0, 'DELETE', 'requirement_checklists', "Deleted requirement checklist: $check_id", $conn);
        
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Requirement checklist deleted successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete requirement checklist: ' . $conn->error]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

$conn->close();
?>
