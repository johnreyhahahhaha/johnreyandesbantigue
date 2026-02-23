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

$request_method = $_SERVER['REQUEST_METHOD'];

if ($request_method === 'GET') {
    // Get assets with maintenance records
    $query = "SELECT pa.*, 
              (SELECT COUNT(*) FROM asset_maintenance WHERE asset_id = pa.asset_id) as maintenance_count,
              (SELECT maintenance_date FROM asset_maintenance WHERE asset_id = pa.asset_id ORDER BY maintenance_date DESC LIMIT 1) as last_maintenance
              FROM parish_assets pa
              ORDER BY pa.asset_id DESC";

    $result = $conn->query($query);

    if (!$result) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]);
        exit();
    }

    $assets = [];
    while ($row = $result->fetch_assoc()) {
        $assets[] = $row;
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $assets,
        'count' => count($assets)
    ]);

} elseif ($request_method === 'POST') {
    // Create new asset
    $data = json_decode(file_get_contents("php://input"), true);
    $user_id = isset($data['user_id']) && intval($data['user_id']) > 0 ? intval($data['user_id']) : null;

    if (!isset($data['item_name']) || !isset($data['category']) || !isset($data['value'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        exit();
    }

    $item_name = $conn->real_escape_string($data['item_name']);
    $category = $conn->real_escape_string($data['category']);
    $status = $conn->real_escape_string($data['status'] ?? 'Good');
    $acquisition_date = $conn->real_escape_string($data['acquisition_date'] ?? date('Y-m-d'));
    $value = floatval($data['value']);

    $query = "INSERT INTO parish_assets (item_name, category, status, acquisition_date, value)
              VALUES ('$item_name', '$category', '$status', '$acquisition_date', $value)";

    if ($conn->query($query) === TRUE) {
        $asset_id = $conn->insert_id;
        
        // Log the action
        if ($user_id && $user_id > 0) {
            logAuditAction($user_id, 'CREATE', 'parish_assets', "Added asset: $item_name ($category) - Value: $value", $conn);
        }
        
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Asset created successfully',
            'asset_id' => $asset_id
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create asset: ' . $conn->error]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

$conn->close();
?>
