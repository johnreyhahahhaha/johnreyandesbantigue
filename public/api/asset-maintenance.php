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
    $query = "SELECT am.*, pa.item_name, COALESCE(f.trans_id, 0) as linked_ledger_id, f.trans_type as ledger_type
              FROM asset_maintenance am 
              LEFT JOIN parish_assets pa ON am.asset_id = pa.asset_id
              LEFT JOIN financial_ledger f ON am.ledger_id = f.trans_id
              ORDER BY am.maintenance_date DESC";
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
    
    if (!$input || !isset($input['asset_id']) || !isset($input['maintenance_date']) || !isset($input['description']) || !isset($input['cost'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields: asset_id, maintenance_date, description, cost']);
        exit();
    }

    $asset_id = (int)$input['asset_id'];
    $maintenance_date = $conn->real_escape_string($input['maintenance_date']);
    $description = $conn->real_escape_string($input['description']);
    $cost = (float)$input['cost'];
    $next_schedule = isset($input['next_schedule']) ? "'" . $conn->real_escape_string($input['next_schedule']) . "'" : "NULL";
    $user_id = isset($input['user_id']) ? (int)$input['user_id'] : ($_SESSION['user_id'] ?? 0);

    // START TRANSACTION to ensure maintenance and ledger stay in sync
    $conn->begin_transaction();
    try {
        // Get asset name for ledger description
        $asset_query = "SELECT item_name FROM parish_assets WHERE asset_id = $asset_id";
        $asset_result = $conn->query($asset_query);
        $asset_name = "Asset";
        if ($asset_result && $asset_row = $asset_result->fetch_assoc()) {
            $asset_name = $asset_row['item_name'];
        }
        
        // Create financial ledger entry for maintenance expense
        $ledger_query = "INSERT INTO financial_ledger (trans_type, category, amount, trans_date, encoded_by, description, cat_id)
                        VALUES ('Expense', 'Asset Maintenance', $cost, '$maintenance_date', $user_id, 'Maintenance for $asset_name - $description', NULL)";
        
        if (!$conn->query($ledger_query)) {
            throw new Exception('Failed to create ledger entry: ' . $conn->error);
        }
        $ledger_id = $conn->insert_id;
        
        // Insert maintenance record with ledger_id
        $query = "INSERT INTO asset_maintenance (asset_id, maintenance_date, description, cost, next_schedule, ledger_id) 
                  VALUES ($asset_id, '$maintenance_date', '$description', $cost, $next_schedule, $ledger_id)";
        
        if (!$conn->query($query)) {
            throw new Exception('Failed to create maintenance record: ' . $conn->error);
        }
        $new_id = $conn->insert_id;
        
        // COMMIT transaction
        $conn->commit();
        
        logAudit($conn, $user_id, 'CREATE', 'asset_maintenance', "Created maintenance record for asset ID: $asset_id - Cost: $cost - Ledger ID: $ledger_id");
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Maintenance record created successfully',
            'id' => $new_id,
            'ledger_id' => $ledger_id
        ]);
    } catch (Exception $e) {
        // ROLLBACK on any error
        $conn->rollback();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create maintenance record: ' . $e->getMessage()]);
    }

} elseif ($request_method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['maint_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing maint_id']);
        exit();
    }

    $maint_id = (int)$input['maint_id'];
    $updates = [];
    
    if (isset($input['asset_id'])) {
        $updates[] = "asset_id = " . (int)$input['asset_id'];
    }
    if (isset($input['maintenance_date'])) {
        $updates[] = "maintenance_date = '" . $conn->real_escape_string($input['maintenance_date']) . "'";
    }
    if (isset($input['description'])) {
        $updates[] = "description = '" . $conn->real_escape_string($input['description']) . "'";
    }
    if (isset($input['cost'])) {
        $updates[] = "cost = " . (float)$input['cost'];
    }
    if (isset($input['next_schedule'])) {
        $updates[] = "next_schedule = '" . $conn->real_escape_string($input['next_schedule']) . "'";
    }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit();
    }

    $query = "UPDATE asset_maintenance SET " . implode(', ', $updates) . " WHERE maint_id = $maint_id";
    
    if ($conn->query($query)) {
        logAudit($conn, $_SESSION['user_id'] ?? 1, 'UPDATE', 'asset_maintenance', "Updated maintenance record ID: $maint_id");
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Maintenance record updated successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update maintenance record: ' . $conn->error]);
    }

} elseif ($request_method === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['maint_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing maint_id']);
        exit();
    }

    $maint_id = (int)$input['maint_id'];

    // START TRANSACTION to ensure maintenance and ledger deletion stay in sync
    $conn->begin_transaction();
    try {
        // First, get the ledger_id if it exists
        $ledger_check = $conn->query("SELECT ledger_id FROM asset_maintenance WHERE maint_id = $maint_id");
        $maint_row = $ledger_check->fetch_assoc();
        $ledger_id = $maint_row['ledger_id'] ?? null;
        
        // Delete the maintenance record
        $query = "DELETE FROM asset_maintenance WHERE maint_id = $maint_id";
        if (!$conn->query($query)) {
            throw new Exception('Failed to delete maintenance record: ' . $conn->error);
        }
        
        // If there's a linked ledger entry, delete it too
        if ($ledger_id) {
            if (!$conn->query("DELETE FROM financial_ledger WHERE trans_id = $ledger_id")) {
                throw new Exception('Failed to delete linked ledger entry: ' . $conn->error);
            }
        }
        
        // COMMIT transaction
        $conn->commit();
        
        logAudit($conn, $_SESSION['user_id'] ?? 1, 'DELETE', 'asset_maintenance', "Deleted maintenance record ID: $maint_id (Ledger ID: $ledger_id)");
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Maintenance record deleted successfully']);
    } catch (Exception $e) {
        // ROLLBACK on any error
        $conn->rollback();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete maintenance record: ' . $e->getMessage()]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>