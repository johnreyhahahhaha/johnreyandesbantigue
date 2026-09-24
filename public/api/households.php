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
    // Get all households
    $query = "SELECT * FROM households ORDER BY household_id DESC";

    $result = $conn->query($query);

    if (!$result) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]);
        exit();
    }

    $households = [];
    while ($row = $result->fetch_assoc()) {
        $households[] = $row;
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $households,
        'count' => count($households)
    ]);

} elseif ($request_method === 'POST') {
    // Create new household
    $data = json_decode(file_get_contents("php://input"), true);

    if (!isset($data['household_name'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields: household_name']);
        exit();
    }

    $household_name = $conn->real_escape_string($data['household_name']);
    $address = $conn->real_escape_string($data['address'] ?? '');
    $barangay_area = $conn->real_escape_string($data['barangay_area'] ?? '');
    $contact_number = $conn->real_escape_string($data['contact_number'] ?? '');

    $query = "INSERT INTO households (household_name, address, barangay_area, contact_number)
              VALUES ('$household_name', '$address', '$barangay_area', '$contact_number')";

    if ($conn->query($query) === TRUE) {
        $household_id = $conn->insert_id;
        logAuditAction($_SESSION['user_id'] ?? 0, 'CREATE', 'households', "Added household: $household_name", $conn);

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Household created successfully',
            'household_id' => $household_id
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create household: ' . $conn->error]);
    }

} elseif ($request_method === 'PUT') {
    // Update household
    $data = json_decode(file_get_contents('php://input'), true);
    $household_id = isset($_GET['household_id']) ? intval($_GET['household_id']) : null;

    if (!$household_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing household_id']);
        exit();
    }

    $household_name = isset($data['household_name']) ? $conn->real_escape_string($data['household_name']) : null;
    $address = isset($data['address']) ? $conn->real_escape_string($data['address']) : null;
    $barangay_area = isset($data['barangay_area']) ? $conn->real_escape_string($data['barangay_area']) : null;
    $contact_number = isset($data['contact_number']) ? $conn->real_escape_string($data['contact_number']) : null;

    $updates = [];
    if ($household_name !== null) $updates[] = "household_name = '$household_name'";
    if ($address !== null) $updates[] = "address = '$address'";
    if ($barangay_area !== null) $updates[] = "barangay_area = '$barangay_area'";
    if ($contact_number !== null) $updates[] = "contact_number = '$contact_number'";

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No updates provided']);
        exit();
    }

    $query = "UPDATE households SET " . implode(', ', $updates) . " WHERE household_id = $household_id";

    if ($conn->query($query) === TRUE) {
        logAuditAction($_SESSION['user_id'] ?? 0, 'UPDATE', 'households', "Updated household ID: $household_id", $conn);

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Household updated successfully'
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update household: ' . $conn->error]);
    }

} elseif ($request_method === 'DELETE') {
    // Delete household
    $household_id = isset($_GET['household_id']) ? intval($_GET['household_id']) : null;

    if (!$household_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing household_id']);
        exit();
    }

    // Check if household has members
    $check_query = "SELECT COUNT(*) as count FROM persons WHERE household_id = $household_id";
    $check_result = $conn->query($check_query);
    $check_row = $check_result->fetch_assoc();

    if ($check_row['count'] > 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Cannot delete household with active members. Please reassign members first.']);
        exit();
    }

    $query = "DELETE FROM households WHERE household_id = $household_id";

    if ($conn->query($query) === TRUE) {
        logAuditAction($_SESSION['user_id'] ?? 0, 'DELETE', 'households', "Deleted household ID: $household_id", $conn);

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Household deleted successfully'
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete household: ' . $conn->error]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

$conn->close();
?>
