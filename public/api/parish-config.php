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
    // Get all parish configs
    $query = "SELECT * FROM parish_config ORDER BY config_key ASC";

    $result = $conn->query($query);

    if (!$result) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]);
        exit();
    }

    $configs = [];
    while ($row = $result->fetch_assoc()) {
        $configs[] = $row;
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $configs,
        'count' => count($configs)
    ]);
} elseif ($request_method === 'POST') {
    // Create or update parish config
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['config_key']) || !isset($data['config_value'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        exit();
    }

    $config_key = $conn->real_escape_string($data['config_key']);
    $config_value = $conn->real_escape_string($data['config_value']);

    // Check if exists
    $check_query = "SELECT * FROM parish_config WHERE config_key = '$config_key'";
    $check_result = $conn->query($check_query);

    if ($check_result->num_rows > 0) {
        // Update existing
        $query = "UPDATE parish_config SET config_value = '$config_value' WHERE config_key = '$config_key'";
        $action = 'UPDATE';
    } else {
        // Insert new
        $query = "INSERT INTO parish_config (config_key, config_value) VALUES ('$config_key', '$config_value')";
        $action = 'CREATE';
    }

    if ($conn->query($query) === TRUE) {
        logAuditAction($_SESSION['user_id'] ?? 0, $action, 'parish_config', "Modified config: $config_key", $conn);
        
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Parish config saved successfully'
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to save parish config: ' . $conn->error]);
    }
} elseif ($request_method === 'DELETE') {
    // Delete parish config
    $config_key = isset($_GET['key']) ? $_GET['key'] : null;

    if (!$config_key) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'config_key is required']);
        exit();
    }

    $config_key = $conn->real_escape_string($config_key);
    $query = "DELETE FROM parish_config WHERE config_key = '$config_key'";

    if ($conn->query($query) === TRUE) {
        logAuditAction($_SESSION['user_id'] ?? 0, 'DELETE', 'parish_config', "Deleted config key: $config_key", $conn);
        
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Parish config deleted successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete parish config: ' . $conn->error]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

$conn->close();
?>
