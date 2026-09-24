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
    $query = "SELECT cc.*, p.first_name, p.last_name, cs.block_name, cs.level_number, cs.niche_number 
              FROM cemetery_contracts cc 
              LEFT JOIN persons p ON cc.deceased_id = p.person_id
              LEFT JOIN cemetery_structures cs ON cc.struct_id = cs.struct_id
              WHERE cc.is_archived = 0
              ORDER BY cc.start_date DESC";
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
    $user_id = isset($input['user_id']) && intval($input['user_id']) > 0 ? intval($input['user_id']) : intval($_SESSION['user_id'] ?? 0);
    
    if (!$input || !isset($input['contract_type']) || !isset($input['start_date']) || !isset($input['expiration_date']) || 
        !isset($input['representative_name']) || !isset($input['contact_number'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        exit();
    }

    $deceased_id = (isset($input['deceased_id']) && (int)$input['deceased_id'] > 0) ? (int)$input['deceased_id'] : "NULL";
    $struct_id = (isset($input['struct_id']) && (int)$input['struct_id'] > 0) ? (int)$input['struct_id'] : "NULL";
    $contract_type = $conn->real_escape_string($input['contract_type']);
    $start_date = $conn->real_escape_string($input['start_date']);
    $expiration_date = $conn->real_escape_string($input['expiration_date']);
    $representative_name = $conn->real_escape_string($input['representative_name']);
    $contact_number = $conn->real_escape_string($input['contact_number']);
    $status = $input['status'] ?? 'Active';
    $amount_paid = floatval($input['amount_paid'] ?? 0);
    $payment_date = $conn->real_escape_string($input['payment_date'] ?? date('Y-m-d'));
    $payment_method = $conn->real_escape_string($input['payment_method'] ?? 'Cash');

    if (!in_array($status, ['Active', 'Expired', 'For Transfer', 'Transferred'], true)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid cemetery contract status']);
        exit();
    }

    if ($struct_id !== "NULL") {
        $structure_result = $conn->query("SELECT status FROM cemetery_structures WHERE struct_id = $struct_id LIMIT 1");
        $structure = $structure_result ? $structure_result->fetch_assoc() : null;
        if (!$structure) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Selected cemetery structure was not found']);
            exit();
        }
        if ($status === 'Active' && $structure['status'] !== 'Vacant') {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'Selected cemetery structure is not vacant']);
            exit();
        }
    }

    // START TRANSACTION
    $conn->begin_transaction();
    try {
        $query = "INSERT INTO cemetery_contracts (deceased_id, struct_id, contract_type, start_date, expiration_date, representative_name, contact_number, status, amount_paid, payment_date, payment_method) 
                  VALUES ($deceased_id, $struct_id, '$contract_type', '$start_date', '$expiration_date', '$representative_name', '$contact_number', '$status', $amount_paid, '$payment_date', '$payment_method')";
        
        if (!$conn->query($query)) {
            throw new Exception('Failed to create cemetery contract: ' . $conn->error);
        }
        $new_id = $conn->insert_id;

        if ($struct_id !== "NULL" && $status === 'Active') {
            if (!$conn->query("UPDATE cemetery_structures SET status = 'Reserved' WHERE struct_id = $struct_id AND status = 'Vacant'")) {
                throw new Exception('Failed to reserve cemetery structure: ' . $conn->error);
            }
        }

        // If payment is provided, create ledger entry
        if ($amount_paid > 0) {
            $ledger_user_id = ($user_id > 0) ? $user_id : 'NULL';
            $cat_query = "SELECT cat_id FROM accounting_categories WHERE cat_name = 'Cemetery Contract Fee' LIMIT 1";
            $cat_result = $conn->query($cat_query);
            $cat_id = null;
            if ($cat_result && $cat_row = $cat_result->fetch_assoc()) {
                $cat_id = $cat_row['cat_id'];
            }

            $cat_id_value = ($cat_id !== null) ? $cat_id : 'NULL';
            $ledger_query = "INSERT INTO financial_ledger (trans_type, category, amount, trans_date, encoded_by, description, cat_id)
                            VALUES ('Income', 'Cemetery Contract Fee', $amount_paid, '$payment_date', $ledger_user_id, 'Cemetery contract fee for $contract_type', $cat_id_value)";

            if (!$conn->query($ledger_query)) {
                throw new Exception('Failed to create ledger entry: ' . $conn->error);
            }
            $ledger_id = $conn->insert_id;

            // Link ledger to contract
            $update_query = "UPDATE cemetery_contracts SET ledger_id = $ledger_id WHERE contract_id = $new_id";
            if (!$conn->query($update_query)) {
                throw new Exception('Failed to link ledger entry: ' . $conn->error);
            }
        }

        // COMMIT transaction
        $conn->commit();

        logAuditAction($user_id, 'CREATE', 'cemetery_contracts', "Created cemetery contract: $contract_type - Amount: $amount_paid", $conn);
        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Cemetery contract created successfully', 'id' => $new_id]);
    } catch (Exception $e) {
        // ROLLBACK on error
        $conn->rollback();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create contract: ' . $e->getMessage()]);
    }

} elseif ($request_method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['contract_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing contract_id']);
        exit();
    }

    $contract_id = (int)$input['contract_id'];

    if (($input['action'] ?? '') === 'renew') {
        if (empty($input['expiration_date'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'New expiration_date is required for renewal']);
            exit();
        }
        $expiration_date = $conn->real_escape_string($input['expiration_date']);
        $payment_date = $conn->real_escape_string($input['payment_date'] ?? date('Y-m-d'));
        $payment_method = $conn->real_escape_string($input['payment_method'] ?? 'Cash');
        $amount_paid = max(0, floatval($input['amount_paid'] ?? 0));
        $query = "UPDATE cemetery_contracts
                  SET expiration_date = '$expiration_date', status = 'Active', notice_count = 0,
                      amount_paid = $amount_paid, payment_date = '$payment_date', payment_method = '$payment_method'
                  WHERE contract_id = $contract_id AND is_archived = 0";
        $user_id = $_SESSION['user_id'] ?? 1;
        if (!$conn->query($query)) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to renew cemetery contract: ' . $conn->error]);
            exit();
        }
        logAuditAction($user_id, 'UPDATE', 'cemetery_contracts', "Renewed cemetery contract ID: $contract_id until $expiration_date", $conn);
        echo json_encode(['success' => true, 'message' => 'Cemetery contract renewed successfully']);
        exit();
    }

    $updates = [];
    
    if (isset($input['deceased_id'])) {
        $updates[] = "deceased_id = " . (int)$input['deceased_id'];
    }
    if (isset($input['struct_id'])) {
        $updates[] = "struct_id = " . (int)$input['struct_id'];
    }
    if (isset($input['contract_type'])) {
        $updates[] = "contract_type = '" . $conn->real_escape_string($input['contract_type']) . "'";
    }
    if (isset($input['start_date'])) {
        $updates[] = "start_date = '" . $conn->real_escape_string($input['start_date']) . "'";
    }
    if (isset($input['expiration_date'])) {
        $updates[] = "expiration_date = '" . $conn->real_escape_string($input['expiration_date']) . "'";
    }
    if (isset($input['representative_name'])) {
        $updates[] = "representative_name = '" . $conn->real_escape_string($input['representative_name']) . "'";
    }
    if (isset($input['contact_number'])) {
        $updates[] = "contact_number = '" . $conn->real_escape_string($input['contact_number']) . "'";
    }
    if (isset($input['status'])) {
        $status = $input['status'];
        if (!in_array($status, ['Active', 'Expired', 'For Transfer', 'Transferred'], true)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid cemetery contract status']);
            exit();
        }
        $updates[] = "status = '" . $conn->real_escape_string($status) . "'";
    }
    if (isset($input['payment_id'])) {
        $payment_id = (int)$input['payment_id'];
        if ($payment_id > 0) {
            $updates[] = "payment_id = $payment_id";
        } else {
            $updates[] = "payment_id = NULL";
        }
    }
    if (isset($input['notice_count'])) {
        $updates[] = "notice_count = " . (int)$input['notice_count'];
    }
    if (isset($input['amount_paid'])) {
        $updates[] = "amount_paid = " . max(0, floatval($input['amount_paid']));
    }
    if (isset($input['payment_date'])) {
        $updates[] = "payment_date = '" . $conn->real_escape_string($input['payment_date']) . "'";
    }
    if (isset($input['payment_method'])) {
        $updates[] = "payment_method = '" . $conn->real_escape_string($input['payment_method']) . "'";
    }
    if (isset($input['is_archived'])) {
        $updates[] = "is_archived = " . (int)$input['is_archived'];
    }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit();
    }

    $query = "UPDATE cemetery_contracts SET " . implode(', ', $updates) . " WHERE contract_id = $contract_id";
    $user_id = $_SESSION['user_id'] ?? 1;
    
    if ($conn->query($query)) {
        logAuditAction($user_id, 'UPDATE', 'cemetery_contracts', "Updated cemetery contract ID: $contract_id", $conn);
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Cemetery contract updated successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update cemetery contract: ' . $conn->error]);
    }

} elseif ($request_method === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    $user_id = isset($input['user_id']) && intval($input['user_id']) > 0 ? intval($input['user_id']) : intval($_SESSION['user_id'] ?? 0);
    
    if (!$input || !isset($input['contract_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing contract_id']);
        exit();
    }

    $contract_id = (int)$input['contract_id'];

    // START TRANSACTION
    $conn->begin_transaction();
    try {
        // Get the ledger_id if it exists
        $ledger_check = $conn->query("SELECT ledger_id FROM cemetery_contracts WHERE contract_id = $contract_id");
        $contract_row = $ledger_check->fetch_assoc();
        $ledger_id = $contract_row['ledger_id'] ?? null;

        // Soft delete by archiving
        $query = "UPDATE cemetery_contracts SET is_archived = 1 WHERE contract_id = $contract_id";
        
        if (!$conn->query($query)) {
            throw new Exception('Failed to archive cemetery contract: ' . $conn->error);
        }

        // If there's a linked ledger entry, delete it too
        if ($ledger_id) {
            $ledger_delete = "DELETE FROM financial_ledger WHERE trans_id = $ledger_id";
            if (!$conn->query($ledger_delete)) {
                throw new Exception('Failed to delete linked ledger entry: ' . $conn->error);
            }
        }

        // COMMIT transaction
        $conn->commit();

        logAuditAction($user_id, 'DELETE', 'cemetery_contracts', "Archived cemetery contract ID: $contract_id" . ($ledger_id ? " - Ledger ID: $ledger_id deleted" : ""), $conn);
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Cemetery contract archived successfully']);
    } catch (Exception $e) {
        // ROLLBACK on error
        $conn->rollback();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to archive contract: ' . $e->getMessage()]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>