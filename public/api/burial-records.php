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
    $query = "SELECT br.*, p.first_name, p.last_name, pr.first_name as priest_first, pr.last_name as priest_last,
                     cr.block_no AS record_block_no, cr.row_no AS record_row_no, cr.lot_type AS record_lot_type,
                     cs.block_name AS struct_block_name, cs.niche_number AS struct_niche_number,
                     cc.contract_type AS contract_type, cc.amount_paid AS contract_amount
              FROM burial_records br 
              LEFT JOIN persons p ON br.person_id = p.person_id
              LEFT JOIN persons pr ON br.priest_id = pr.person_id
              LEFT JOIN cemetery_records cr ON br.record_id = cr.lot_id
              LEFT JOIN cemetery_structures cs ON br.struct_id = cs.struct_id
              LEFT JOIN cemetery_contracts cc ON br.contract_id = cc.contract_id
              ORDER BY br.burial_date DESC";
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
    
    if (!$input || !isset($input['person_id']) || (int)$input['person_id'] <= 0 ||
        !isset($input['death_date']) || !isset($input['burial_date']) || !isset($input['cause_of_death']) ||
        !isset($input['place_of_interment'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'A deceased person and all burial details are required']);
        exit();
    }

    $person_id = isset($input['person_id']) ? (int)$input['person_id'] : "NULL";
    $death_date = $conn->real_escape_string($input['death_date']);
    $burial_date = $conn->real_escape_string($input['burial_date']);
    $cause_of_death = $conn->real_escape_string($input['cause_of_death']);
    $priest_id = isset($input['priest_id']) ? (int)$input['priest_id'] : "NULL";
    $place_of_interment = $conn->real_escape_string($input['place_of_interment']);
    $record_id = (isset($input['record_id']) && $input['record_id'] !== '') ? (int)$input['record_id'] : "NULL";
    $contract_id = (isset($input['contract_id']) && $input['contract_id'] !== '') ? (int)$input['contract_id'] : "NULL";
    $struct_id = (isset($input['struct_id']) && $input['struct_id'] !== '') ? (int)$input['struct_id'] : "NULL";
    $amount_paid = floatval($input['amount_paid'] ?? 0);
    $payment_date = $conn->real_escape_string($input['payment_date'] ?? date('Y-m-d'));
    $payment_method = $conn->real_escape_string($input['payment_method'] ?? 'Cash');

    if ($person_id !== "NULL") {
        $duplicateResult = $conn->query("SELECT burial_id FROM burial_records WHERE person_id = $person_id LIMIT 1");
        if ($duplicateResult && $duplicateResult->num_rows > 0) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'This person already has a burial record.']);
            exit();
        }
    }

    if ($record_id === "NULL" && $contract_id === "NULL" && $struct_id === "NULL") {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Assign a cemetery record, contract, or structure before recording the burial']);
        exit();
    }

    // Validate optional cemetery links
    if ($record_id !== "NULL") {
        $record_check = $conn->query("SELECT lot_id, deceased_id FROM cemetery_records WHERE lot_id = $record_id LIMIT 1");
        $record = $record_check ? $record_check->fetch_assoc() : null;
        if (!$record) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid record_id - cemetery record not found']);
            exit();
        }
        if ((int)$record['deceased_id'] !== (int)$person_id) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'Selected cemetery record is assigned to another deceased person']);
            exit();
        }
    }
    if ($contract_id !== "NULL") {
        $contract_check = $conn->query("SELECT contract_id FROM cemetery_contracts WHERE contract_id = $contract_id AND deceased_id = $person_id LIMIT 1");
        if (!$contract_check || $contract_check->num_rows === 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid contract_id - contract is not assigned to the deceased person']);
            exit();
        }
    }
    if ($struct_id !== "NULL") {
        $struct_check = $conn->query("SELECT struct_id, status, current_occupant_id FROM cemetery_structures WHERE struct_id = $struct_id LIMIT 1");
        $structure = $struct_check ? $struct_check->fetch_assoc() : null;
        if (!$structure) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid struct_id - cemetery structure not found']);
            exit();
        }
        $is_reserved_for_burial = $structure['status'] === 'Reserved' && $contract_id !== "NULL";
        if ($structure['status'] !== 'Vacant' && !$is_reserved_for_burial && (int)$structure['current_occupant_id'] !== (int)$person_id) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'Selected cemetery structure is not vacant']);
            exit();
        }
    }
    if ($contract_id !== "NULL") {
        $active_contract = $conn->query("SELECT status, struct_id FROM cemetery_contracts WHERE contract_id = $contract_id AND deceased_id = $person_id LIMIT 1");
        $contract_row = $active_contract ? $active_contract->fetch_assoc() : null;
        if (!$contract_row || $contract_row['status'] !== 'Active') {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'Selected cemetery contract is not active']);
            exit();
        }
        if ($struct_id !== "NULL" && (int)$contract_row['struct_id'] !== (int)$struct_id) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'Selected structure does not match the cemetery contract']);
            exit();
        }
    }

    // START TRANSACTION
    $conn->begin_transaction();
    try {
        $query = "INSERT INTO burial_records (person_id, death_date, burial_date, cause_of_death, priest_id, place_of_interment, record_id, contract_id, struct_id) 
                  VALUES ($person_id, '$death_date', '$burial_date', '$cause_of_death', $priest_id, '$place_of_interment', $record_id, $contract_id, $struct_id)";
        
        if (!$conn->query($query)) {
            throw new Exception('Failed to create burial record: ' . $conn->error);
        }
        $new_id = $conn->insert_id;

        // Keep the selected cemetery structure in sync with the burial.
        if ($struct_id !== "NULL") {
            $structure_update = "UPDATE cemetery_structures SET status = 'Occupied', current_occupant_id = $person_id WHERE struct_id = $struct_id";
            if (!$conn->query($structure_update)) {
                throw new Exception('Failed to update cemetery structure: ' . $conn->error);
            }
        }

        // Keep the selected contract and lot linked to the same deceased person.
        if ($record_id !== "NULL" && $person_id !== "NULL") {
            $lot_update = "UPDATE cemetery_records SET deceased_id = $person_id WHERE lot_id = $record_id";
            if (!$conn->query($lot_update)) {
                throw new Exception('Failed to assign cemetery lot to the deceased person');
            }
        }

        if ($contract_id !== "NULL" && $person_id !== "NULL") {
            $contract_update = "UPDATE cemetery_contracts SET deceased_id = $person_id, struct_id = COALESCE(struct_id, $struct_id) WHERE contract_id = $contract_id";
            if (!$conn->query($contract_update)) {
                throw new Exception('Failed to assign cemetery contract to the deceased person');
            }
        }

        // If payment is provided, create ledger entry
        if ($amount_paid > 0) {
            $ledger_user_id = ($user_id > 0) ? $user_id : 'NULL';
            $cat_query = "SELECT cat_id FROM accounting_categories WHERE cat_name = 'Burial Service Fee' LIMIT 1";
            $cat_result = $conn->query($cat_query);
            $cat_id = null;
            if ($cat_result && $cat_row = $cat_result->fetch_assoc()) {
                $cat_id = $cat_row['cat_id'];
            }

            $cat_id_value = ($cat_id !== null) ? $cat_id : 'NULL';
            $ledger_query = "INSERT INTO financial_ledger (trans_type, category, amount, trans_date, encoded_by, description, cat_id)
                            VALUES ('Income', 'Burial Service Fee', $amount_paid, '$payment_date', $ledger_user_id, 'Burial service fee for person_id: $person_id', $cat_id_value)";

            if (!$conn->query($ledger_query)) {
                throw new Exception('Failed to create ledger entry: ' . $conn->error);
            }
            $ledger_id = $conn->insert_id;

            // Link ledger to burial record
            $update_query = "UPDATE burial_records SET ledger_id = $ledger_id WHERE burial_id = $new_id";
            if (!$conn->query($update_query)) {
                throw new Exception('Failed to link ledger entry: ' . $conn->error);
            }
        }

        // COMMIT transaction
        $conn->commit();

        logAuditAction($user_id, 'CREATE', 'burial_records', "Created burial record for person ID: $person_id - Amount: $amount_paid", $conn);
        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Burial record created successfully', 'id' => $new_id]);
    } catch (Exception $e) {
        // ROLLBACK on error
        $conn->rollback();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create burial record: ' . $e->getMessage()]);
    }

} elseif ($request_method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['burial_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing burial_id']);
        exit();
    }

    $burial_id = (int)$input['burial_id'];
    $updates = [];
    $existing_result = $conn->query("SELECT person_id, struct_id FROM burial_records WHERE burial_id = $burial_id LIMIT 1");
    $existing_burial = $existing_result ? $existing_result->fetch_assoc() : null;
    if (!$existing_burial) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Burial record not found']);
        exit();
    }
    $target_person_id = isset($input['person_id']) ? (int)$input['person_id'] : (int)$existing_burial['person_id'];
    
    if (isset($input['person_id'])) {
        $updates[] = "person_id = " . (int)$input['person_id'];
    }
    if (isset($input['death_date'])) {
        $updates[] = "death_date = '" . $conn->real_escape_string($input['death_date']) . "'";
    }
    if (isset($input['burial_date'])) {
        $updates[] = "burial_date = '" . $conn->real_escape_string($input['burial_date']) . "'";
    }
    if (isset($input['cause_of_death'])) {
        $updates[] = "cause_of_death = '" . $conn->real_escape_string($input['cause_of_death']) . "'";
    }
    if (isset($input['priest_id'])) {
        $updates[] = "priest_id = " . (int)$input['priest_id'];
    }
    if (isset($input['place_of_interment'])) {
        $updates[] = "place_of_interment = '" . $conn->real_escape_string($input['place_of_interment']) . "'";
    }
    if (array_key_exists('record_id', $input)) {
        if ($input['record_id'] !== '' && $input['record_id'] !== null) {
            $record_id = (int)$input['record_id'];
            $record_check = $conn->query("SELECT lot_id FROM cemetery_records WHERE lot_id = $record_id LIMIT 1");
            if (!$record_check || $record_check->num_rows === 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Invalid record_id - cemetery record not found']);
                exit();
            }
            $updates[] = "record_id = $record_id";
        } else {
            $updates[] = "record_id = NULL";
        }
    }
    if (array_key_exists('contract_id', $input)) {
        if ($input['contract_id'] !== '' && $input['contract_id'] !== null) {
            $contract_id = (int)$input['contract_id'];
            $contract_check = $conn->query("SELECT contract_id FROM cemetery_contracts WHERE contract_id = $contract_id LIMIT 1");
            if (!$contract_check || $contract_check->num_rows === 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Invalid contract_id - cemetery contract not found']);
                exit();
            }
            $updates[] = "contract_id = $contract_id";
        } else {
            $updates[] = "contract_id = NULL";
        }
    }
    if (array_key_exists('struct_id', $input)) {
        if ($input['struct_id'] !== '' && $input['struct_id'] !== null) {
            $struct_id = (int)$input['struct_id'];
            $struct_check = $conn->query("SELECT struct_id, status, current_occupant_id FROM cemetery_structures WHERE struct_id = $struct_id LIMIT 1");
            $structure = $struct_check ? $struct_check->fetch_assoc() : null;
            if (!$structure) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Invalid struct_id - cemetery structure not found']);
                exit();
            }
            if ($structure['status'] !== 'Vacant' && (int)$structure['current_occupant_id'] !== $target_person_id && $struct_id !== (int)$existing_burial['struct_id']) {
                http_response_code(409);
                echo json_encode(['success' => false, 'message' => 'Selected cemetery structure is not vacant']);
                exit();
            }
            $updates[] = "struct_id = $struct_id";
        } else {
            $updates[] = "struct_id = NULL";
        }
    }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit();
    }

    $query = "UPDATE burial_records SET " . implode(', ', $updates) . " WHERE burial_id = $burial_id";
    $user_id = $_SESSION['user_id'] ?? 1;
    
    if ($conn->query($query)) {
        $target_struct_id = array_key_exists('struct_id', $input) && $input['struct_id'] !== '' && $input['struct_id'] !== null
            ? (int)$input['struct_id']
            : (int)$existing_burial['struct_id'];
        if ($target_struct_id > 0) {
            $conn->query("UPDATE cemetery_structures SET status = 'Occupied', current_occupant_id = $target_person_id WHERE struct_id = $target_struct_id");
        }
        $old_struct_id = (int)$existing_burial['struct_id'];
        if ($old_struct_id > 0 && $old_struct_id !== $target_struct_id) {
            $remaining_burial = $conn->query("SELECT burial_id FROM burial_records WHERE struct_id = $old_struct_id AND burial_id <> $burial_id LIMIT 1");
            if ($remaining_burial && $remaining_burial->num_rows === 0) {
                $conn->query("UPDATE cemetery_structures SET status = 'Vacant', current_occupant_id = NULL WHERE struct_id = $old_struct_id");
            }
        }
        logAuditAction($user_id, 'UPDATE', 'burial_records', "Updated burial record ID: $burial_id", $conn);
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Burial record updated successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update burial record: ' . $conn->error]);
    }

} elseif ($request_method === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    $user_id = isset($input['user_id']) && intval($input['user_id']) > 0 ? intval($input['user_id']) : intval($_SESSION['user_id'] ?? 0);
    
    if (!$input || !isset($input['burial_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing burial_id']);
        exit();
    }

    $burial_id = (int)$input['burial_id'];

    // START TRANSACTION
    $conn->begin_transaction();
    try {
        // Get the ledger_id if it exists
        $ledger_check = $conn->query("SELECT ledger_id, struct_id FROM burial_records WHERE burial_id = $burial_id");
        $burial_row = $ledger_check->fetch_assoc();
        $ledger_id = $burial_row['ledger_id'] ?? null;
        $struct_id = $burial_row['struct_id'] ?? null;

        $query = "DELETE FROM burial_records WHERE burial_id = $burial_id";
        
        if (!$conn->query($query)) {
            throw new Exception('Failed to delete burial record: ' . $conn->error);
        }

        // If there's a linked ledger entry, delete it too
        if ($ledger_id) {
            $ledger_delete = "DELETE FROM financial_ledger WHERE trans_id = $ledger_id";
            if (!$conn->query($ledger_delete)) {
                throw new Exception('Failed to delete linked ledger entry: ' . $conn->error);
            }
        }

        if ($struct_id) {
            $remaining_burial = $conn->query("SELECT burial_id FROM burial_records WHERE struct_id = " . (int)$struct_id . " LIMIT 1");
            if ($remaining_burial && $remaining_burial->num_rows === 0) {
                $conn->query("UPDATE cemetery_structures SET status = 'Vacant', current_occupant_id = NULL WHERE struct_id = " . (int)$struct_id);
            }
        }

        // COMMIT transaction
        $conn->commit();

        logAuditAction($user_id, 'DELETE', 'burial_records', "Deleted burial record ID: $burial_id" . ($ledger_id ? " - Ledger ID: $ledger_id deleted" : ""), $conn);
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Burial record deleted successfully']);
    } catch (Exception $e) {
        // ROLLBACK on error
        $conn->rollback();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete burial record: ' . $e->getMessage()]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>