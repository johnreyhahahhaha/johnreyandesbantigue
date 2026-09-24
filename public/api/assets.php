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
    // Support optional type query
    if (isset($_GET['type']) && $_GET['type'] === 'maintenance') {
        // return maintenance records only
        $result = $conn->query("SELECT * FROM asset_maintenance ORDER BY maintenance_date DESC");
        if (!$result) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]);
            exit();
        }

        $maintenance = [];
        while ($row = $result->fetch_assoc()) {
            $maintenance[] = $row;
        }

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'data' => $maintenance,
            'count' => count($maintenance)
        ]);
        exit();
    }

    // default: Get assets with maintenance summary (pagination + optional search)
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $per_page = isset($_GET['per_page']) ? max(1, intval($_GET['per_page'])) : 20;
    $offset = ($page - 1) * $per_page;

    $search = isset($_GET['search']) ? $conn->real_escape_string($_GET['search']) : '';
    $status = isset($_GET['status']) ? $conn->real_escape_string($_GET['status']) : '';
    $whereParts = [];
    if ($search !== '') {
        $whereParts[] = "pa.item_name LIKE '%$search%'";
    }
    if ($status !== '') {
        $whereParts[] = "pa.status = '$status'";
    }
    $whereClause = '';
    if (!empty($whereParts)) {
        $whereClause = 'WHERE ' . implode(' AND ', $whereParts);
    }

    // count total
    $countQuery = "SELECT COUNT(*) as total FROM parish_assets pa $whereClause";
    $countRes = $conn->query($countQuery);
    $total = 0;
    if ($countRes) {
        $total = intval($countRes->fetch_assoc()['total']);
    }

    $query = "SELECT pa.*, 
              (SELECT COUNT(*) FROM asset_maintenance WHERE asset_id = pa.asset_id) as maintenance_count,
              (SELECT maintenance_date FROM asset_maintenance WHERE asset_id = pa.asset_id ORDER BY maintenance_date DESC LIMIT 1) as last_maintenance
              FROM parish_assets pa
              $whereClause
              ORDER BY pa.asset_id DESC
              LIMIT $per_page OFFSET $offset";

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
        'count' => count($assets),
        'total' => $total,
        'page' => $page,
        'per_page' => $per_page
    ]);

} elseif ($request_method === 'PUT') {
    // distinguish maintenance vs asset update
    if (isset($_GET['type']) && $_GET['type'] === 'maintenance') {
        $data = json_decode(file_get_contents("php://input"), true);
        $user_id = isset($data['user_id']) && intval($data['user_id']) > 0 ? intval($data['user_id']) : null;
        $maint_id = isset($data['maint_id']) ? intval($data['maint_id']) : null;

        if (!$maint_id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'maint_id is required']);
            exit();
        }

        $updates = [];
        if (isset($data['maintenance_date'])) {
            $updates[] = "maintenance_date = '" . $conn->real_escape_string($data['maintenance_date']) . "'";
        }
        if (isset($data['description'])) {
            $updates[] = "description = '" . $conn->real_escape_string($data['description']) . "'";
        }
        if (isset($data['cost'])) {
            $updates[] = "cost = " . floatval($data['cost']);
        }
        if (isset($data['next_schedule'])) {
            $updates[] = "next_schedule = '" . $conn->real_escape_string($data['next_schedule']) . "'";
        }

        if (empty($updates)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'No fields to update']);
            exit();
        }

        $query = "UPDATE asset_maintenance SET " . implode(', ', $updates) . " WHERE maint_id = $maint_id";
        if ($conn->query($query) === TRUE) {
            if ($user_id && $user_id > 0) {
                logAuditAction($user_id, 'UPDATE', 'asset_maintenance', "Updated maintenance record $maint_id", $conn);
            }
            http_response_code(200);
            echo json_encode(['success' => true, 'message' => 'Maintenance record updated']);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to update maintenance: ' . $conn->error]);
        }
        exit();
    } else {
        // update asset itself
        $data = json_decode(file_get_contents("php://input"), true);
        $asset_id = isset($_GET['id']) ? intval($_GET['id']) : (isset($data['asset_id']) ? intval($data['asset_id']) : null);
        $user_id = isset($data['user_id']) ? intval($data['user_id']) : null;

        if (!$asset_id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'asset_id is required']);
            exit();
        }

        $updates = [];
        if (isset($data['item_name'])) $updates[] = "item_name = '" . $conn->real_escape_string($data['item_name']) . "'";
        if (isset($data['category'])) $updates[] = "category = '" . $conn->real_escape_string($data['category']) . "'";
        if (isset($data['status'])) $updates[] = "status = '" . $conn->real_escape_string($data['status']) . "'";
        if (isset($data['acquisition_date'])) $updates[] = "acquisition_date = '" . $conn->real_escape_string($data['acquisition_date']) . "'";
        if (isset($data['value'])) $updates[] = "value = " . floatval($data['value']);
        // `location` was removed from the schema; do not attempt updating it

        if (empty($updates)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'No fields to update']);
            exit();
        }

        $query = "UPDATE parish_assets SET " . implode(', ', $updates) . " WHERE asset_id = $asset_id";
        if ($conn->query($query) === TRUE) {
            if ($user_id && $user_id > 0) {
                logAuditAction($user_id, 'UPDATE', 'parish_assets', "Updated asset $asset_id", $conn);
            }
            http_response_code(200);
            echo json_encode(['success' => true, 'message' => 'Asset updated']);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to update asset: ' . $conn->error]);
        }
        exit();
    }
} elseif ($request_method === 'DELETE') {
    // delete maintenance record
    if (isset($_GET['type']) && $_GET['type'] === 'maintenance') {
        $maint_id = isset($_GET['id']) ? intval($_GET['id']) : null;
        $user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;

        if (!$maint_id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'id is required']);
            exit();
        }

        if ($conn->query("DELETE FROM asset_maintenance WHERE maint_id = $maint_id") === TRUE) {
            if ($user_id && $user_id > 0) {
                logAuditAction($user_id, 'DELETE', 'asset_maintenance', "Deleted maintenance record $maint_id", $conn);
            }
            http_response_code(200);
            echo json_encode(['success' => true, 'message' => 'Maintenance record deleted']);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to delete maintenance: ' . $conn->error]);
        }
        exit();
    } else {
        // delete asset
        $asset_id = isset($_GET['id']) ? intval($_GET['id']) : null;
        $user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;

        if (!$asset_id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'id is required']);
            exit();
        }

        if ($conn->query("DELETE FROM parish_assets WHERE asset_id = $asset_id") === TRUE) {
            if ($user_id && $user_id > 0) {
                logAuditAction($user_id, 'DELETE', 'parish_assets', "Deleted asset $asset_id", $conn);
            }
            http_response_code(200);
            echo json_encode(['success' => true, 'message' => 'Asset deleted']);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to delete asset: ' . $conn->error]);
        }
        exit();
    }
} elseif ($request_method === 'POST') {
    // support adding maintenance when type=maintenance
    if (isset($_GET['type']) && $_GET['type'] === 'maintenance') {
        $data = json_decode(file_get_contents("php://input"), true);
        $user_id = isset($data['user_id']) && intval($data['user_id']) > 0 ? intval($data['user_id']) : null;

        if (!isset($data['asset_id']) || !isset($data['description']) || !isset($data['cost'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing required fields for maintenance']);
            exit();
        }

        $asset_id = intval($data['asset_id']);
        $maintenance_date = $conn->real_escape_string($data['maintenance_date'] ?? date('Y-m-d'));
        $description = $conn->real_escape_string($data['description']);
        $cost = floatval($data['cost']);
        $next_schedule = isset($data['next_schedule']) ? "', next_schedule = '" . $conn->real_escape_string($data['next_schedule']) : '';

        $query = "INSERT INTO asset_maintenance (asset_id, maintenance_date, description, cost" . (isset($data['next_schedule']) ? ", next_schedule" : "") . ") 
                  VALUES ($asset_id, '$maintenance_date', '$description', $cost" . (isset($data['next_schedule']) ? ", '" . $conn->real_escape_string($data['next_schedule']) . "'" : "") . ")";

        if ($conn->query($query) === TRUE) {
            $maint_id = $conn->insert_id;
            if ($user_id && $user_id > 0) {
                logAuditAction($user_id, 'CREATE', 'asset_maintenance', "Added maintenance for asset $asset_id: $description (cost=$cost)", $conn);
            }
            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'Maintenance record added',
                'maint_id' => $maint_id
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to add maintenance: ' . $conn->error]);
        }
        exit();
    }

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
