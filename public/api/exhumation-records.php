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
    $query = "SELECT er.*, p.first_name, p.last_name, cs.block_name, cs.niche_number, su.user_id as proc_user_id, pr.first_name as proc_first, pr.last_name as proc_last 
              FROM exhumation_records er 
              LEFT JOIN persons p ON er.deceased_id = p.person_id
              LEFT JOIN cemetery_structures cs ON er.original_struct_id = cs.struct_id
              LEFT JOIN system_users su ON er.processed_by = su.user_id
              LEFT JOIN persons pr ON su.person_id = pr.person_id
              ORDER BY er.exhumation_date DESC";
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
    
    if (!$input || !isset($input['deceased_id']) || !isset($input['original_struct_id']) || !isset($input['exhumation_date']) || 
        !isset($input['reason']) || !isset($input['new_location']) || !isset($input['witnessed_by'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        exit();
    }

    $deceased_id = (int)$input['deceased_id'];
    $original_struct_id = (int)$input['original_struct_id'];
    $exhumation_date = $conn->real_escape_string($input['exhumation_date']);
    $reason = $conn->real_escape_string($input['reason']);
    $new_location = $conn->real_escape_string($input['new_location']);
    $witnessed_by = $conn->real_escape_string($input['witnessed_by']);
    
    // Handle processed_by with validation
    $processed_by_input = isset($input['processed_by']) ? (int)$input['processed_by'] : 0;
    if ($processed_by_input > 0) {
        // Validate that processed_by exists in system_users
        $validation_query = "SELECT user_id FROM system_users WHERE user_id = $processed_by_input LIMIT 1";
        $validation_result = $conn->query($validation_query);
        if (!$validation_result || $validation_result->num_rows == 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid processed_by user ID']);
            exit();
        }
        $processed_by = $processed_by_input;
    } else {
        $processed_by = ($user_id > 0) ? $user_id : 'NULL';
    }
    
    $amount_paid = floatval($input['amount_paid'] ?? 0);
    $payment_date = $conn->real_escape_string($input['payment_date'] ?? date('Y-m-d'));
    $payment_method = $conn->real_escape_string($input['payment_method'] ?? 'Cash');

    // START TRANSACTION
    $conn->begin_transaction();
    try {
        $processed_by_val = ($processed_by === 'NULL') ? 'NULL' : $processed_by;
        $query = "INSERT INTO exhumation_records (deceased_id, original_struct_id, exhumation_date, reason, new_location, witnessed_by, processed_by, amount_paid, payment_date, payment_method) 
                  VALUES ($deceased_id, $original_struct_id, '$exhumation_date', '$reason', '$new_location', '$witnessed_by', $processed_by_val, $amount_paid, '$payment_date', '$payment_method')";
        
        if (!$conn->query($query)) {
            throw new Exception('Failed to create exhumation record: ' . $conn->error);
        }
        $new_id = $conn->insert_id;

        // If payment is provided, create ledger entry
        if ($amount_paid > 0) {
            $ledger_user_id = ($user_id > 0) ? $user_id : 'NULL';
            $cat_query = "SELECT cat_id FROM accounting_categories WHERE cat_name = 'Exhumation Service Fee' LIMIT 1";
            $cat_result = $conn->query($cat_query);
            $cat_id = null;
            if ($cat_result && $cat_row = $cat_result->fetch_assoc()) {
                $cat_id = $cat_row['cat_id'];
            }

            $cat_id_value = ($cat_id !== null) ? $cat_id : 'NULL';
            $ledger_query = "INSERT INTO financial_ledger (trans_type, category, amount, trans_date, encoded_by, description, cat_id)
                            VALUES ('Income', 'Exhumation Service Fee', $amount_paid, '$payment_date', $ledger_user_id, 'Exhumation service fee for deceased_id: $deceased_id - Reason: $reason', $cat_id_value)";

            if (!$conn->query($ledger_query)) {
                throw new Exception('Failed to create ledger entry: ' . $conn->error);
            }
            $ledger_id = $conn->insert_id;

            // Link ledger to exhumation record
            $update_query = "UPDATE exhumation_records SET ledger_id = $ledger_id WHERE exhumation_id = $new_id";
            if (!$conn->query($update_query)) {
                throw new Exception('Failed to link ledger entry: ' . $conn->error);
            }
        }

        $structure_update = "UPDATE cemetery_structures SET status = 'Vacant', current_occupant_id = NULL WHERE struct_id = $original_struct_id";
        if (!$conn->query($structure_update)) {
            throw new Exception('Failed to release original cemetery structure: ' . $conn->error);
        }

        // COMMIT transaction
        $conn->commit();

        logAuditAction($user_id, 'CREATE', 'exhumation_records', "Created exhumation record for deceased ID: $deceased_id - Amount: $amount_paid", $conn);
        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Exhumation record created successfully', 'id' => $new_id]);
    } catch (Exception $e) {
        // ROLLBACK on error
        $conn->rollback();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create exhumation record: ' . $e->getMessage()]);
    }

} elseif ($request_method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['exhumation_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing exhumation_id']);
        exit();
    }

    $exhumation_id = (int)$input['exhumation_id'];
    $updates = [];
    
    if (isset($input['deceased_id'])) {
        $updates[] = "deceased_id = " . (int)$input['deceased_id'];
    }
    if (isset($input['original_struct_id'])) {
        $updates[] = "original_struct_id = " . (int)$input['original_struct_id'];
    }
    if (isset($input['exhumation_date'])) {
        $updates[] = "exhumation_date = '" . $conn->real_escape_string($input['exhumation_date']) . "'";
    }
    if (isset($input['reason'])) {
        $updates[] = "reason = '" . $conn->real_escape_string($input['reason']) . "'";
    }
    if (isset($input['new_location'])) {
        $updates[] = "new_location = '" . $conn->real_escape_string($input['new_location']) . "'";
    }
    if (isset($input['witnessed_by'])) {
        $updates[] = "witnessed_by = '" . $conn->real_escape_string($input['witnessed_by']) . "'";
    }
    if (isset($input['processed_by'])) {
        $processed_by_val = (int)$input['processed_by'];
        if ($processed_by_val > 0) {
            // Validate that processed_by exists in system_users
            $validation_query = "SELECT user_id FROM system_users WHERE user_id = $processed_by_val LIMIT 1";
            $validation_result = $conn->query($validation_query);
            if (!$validation_result || $validation_result->num_rows == 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Invalid processed_by user ID']);
                exit();
            }
            $updates[] = "processed_by = $processed_by_val";
        } else {
            $updates[] = "processed_by = NULL";
        }
    }
    if (isset($input['payment_id'])) {
        $payment_id_val = (int)$input['payment_id'];
        if ($payment_id_val > 0) {
            $updates[] = "payment_id = $payment_id_val";
        } else {
            $updates[] = "payment_id = NULL";
        }
    }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit();
    }

    $query = "UPDATE exhumation_records SET " . implode(', ', $updates) . " WHERE exhumation_id = $exhumation_id";
    $user_id = $_SESSION['user_id'] ?? 1;
    
    if ($conn->query($query)) {
        logAuditAction($user_id, 'UPDATE', 'exhumation_records', "Updated exhumation record ID: $exhumation_id", $conn);
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Exhumation record updated successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update exhumation record: ' . $conn->error]);
    }

} elseif ($request_method === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    $user_id = isset($input['user_id']) && intval($input['user_id']) > 0 ? intval($input['user_id']) : intval($_SESSION['user_id'] ?? 0);
    
    if (!$input || !isset($input['exhumation_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing exhumation_id']);
        exit();
    }

    $exhumation_id = (int)$input['exhumation_id'];

    // START TRANSACTION
    $conn->begin_transaction();
    try {
        // Get the ledger_id if it exists
        $ledger_check = $conn->query("SELECT ledger_id FROM exhumation_records WHERE exhumation_id = $exhumation_id");
        $exhumation_row = $ledger_check->fetch_assoc();
        $ledger_id = $exhumation_row['ledger_id'] ?? null;

        $query = "DELETE FROM exhumation_records WHERE exhumation_id = $exhumation_id";
        
        if (!$conn->query($query)) {
            throw new Exception('Failed to delete exhumation record: ' . $conn->error);
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

        logAuditAction($user_id, 'DELETE', 'exhumation_records', "Deleted exhumation record ID: $exhumation_id" . ($ledger_id ? " - Ledger ID: $ledger_id deleted" : ""), $conn);
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Exhumation record deleted successfully']);
    } catch (Exception $e) {
        // ROLLBACK on error
        $conn->rollback();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete exhumation record: ' . $e->getMessage()]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>