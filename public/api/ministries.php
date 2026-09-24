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
    // Get all ministries with volunteer count
    $query = "SELECT m.*, COUNT(pv.volunteer_id) as volunteer_count
              FROM ministries m
              LEFT JOIN parish_volunteers pv ON m.ministry_id = pv.ministry_id
              GROUP BY m.ministry_id
              ORDER BY m.ministry_id DESC";

    $result = $conn->query($query);

    if (!$result) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]);
        exit();
    }

    $ministries = [];
    while ($row = $result->fetch_assoc()) {
        $ministries[] = $row;
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $ministries,
        'count' => count($ministries)
    ]);

} elseif ($request_method === 'POST') {
    // Create new ministry
    $data = json_decode(file_get_contents("php://input"), true);

    if (!isset($data['ministry_name'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields: ministry_name']);
        exit();
    }

    $ministry_name = $conn->real_escape_string($data['ministry_name']);

    $query = "INSERT INTO ministries (ministry_name) VALUES ('$ministry_name')";

    if ($conn->query($query) === TRUE) {
        $ministry_id = $conn->insert_id;
        logAuditAction($_SESSION['user_id'] ?? 0, 'CREATE', 'ministries', "Added ministry: $ministry_name", $conn);

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Ministry created successfully',
            'ministry_id' => $ministry_id
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create ministry: ' . $conn->error]);
    }

} elseif ($request_method === 'PUT') {
    // Update ministry
    $data = json_decode(file_get_contents('php://input'), true);
    $ministry_id = isset($_GET['ministry_id']) ? intval($_GET['ministry_id']) : null;

    if (!$ministry_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing ministry_id']);
        exit();
    }

    if (!isset($data['ministry_name'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields: ministry_name']);
        exit();
    }

    $ministry_name = $conn->real_escape_string($data['ministry_name']);

    $query = "UPDATE ministries SET ministry_name = '$ministry_name' WHERE ministry_id = $ministry_id";

    if ($conn->query($query) === TRUE) {
        logAuditAction($_SESSION['user_id'] ?? 0, 'UPDATE', 'ministries', "Updated ministry ID: $ministry_id", $conn);

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Ministry updated successfully'
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update ministry: ' . $conn->error]);
    }

} elseif ($request_method === 'DELETE') {
    // Delete ministry
    $ministry_id = isset($_GET['ministry_id']) ? intval($_GET['ministry_id']) : null;

    if (!$ministry_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing ministry_id']);
        exit();
    }

    // Check if ministry has volunteers
    $check_query = "SELECT COUNT(*) as count FROM parish_volunteers WHERE ministry_id = $ministry_id";
    $check_result = $conn->query($check_query);
    $check_row = $check_result->fetch_assoc();

    if ($check_row['count'] > 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Cannot delete ministry with active volunteers. Please reassign volunteers first.']);
        exit();
    }

    $query = "DELETE FROM ministries WHERE ministry_id = $ministry_id";

    if ($conn->query($query) === TRUE) {
        logAuditAction($_SESSION['user_id'] ?? 0, 'DELETE', 'ministries', "Deleted ministry ID: $ministry_id", $conn);

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Ministry deleted successfully'
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete ministry: ' . $conn->error]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

$conn->close();
?>
