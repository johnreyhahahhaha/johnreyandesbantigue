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
    $query = "SELECT bl.*, sp.program_name, p.first_name, p.last_name FROM beneficiary_logs bl 
              LEFT JOIN social_programs sp ON bl.program_id = sp.program_id
              LEFT JOIN persons p ON bl.person_id = p.person_id
              ORDER BY bl.date_given DESC";
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
    
    if (!$input || !isset($input['program_id']) || !isset($input['person_id']) || !isset($input['aid_received'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields: program_id, person_id, aid_received']);
        exit();
    }

    $program_id = (int)$input['program_id'];
    $person_id = (int)$input['person_id'];
    $aid_received = $conn->real_escape_string($input['aid_received']);
    $date_given = isset($input['date_given']) ? $conn->real_escape_string($input['date_given']) : date('Y-m-d');
    $amount_given = isset($input['amount_given']) ? (float)$input['amount_given'] : null;
    $user_id = isset($input['user_id']) ? (int)$input['user_id'] : ($_SESSION['user_id'] ?? 0);

    // START TRANSACTION to ensure beneficiary log and ledger stay in sync
    $conn->begin_transaction();
    try {
        // Get program name and check budget
        $prog_query = "SELECT program_name, budget FROM social_programs WHERE program_id = $program_id";
        $prog_result = $conn->query($prog_query);
        if (!$prog_result || $prog_result->num_rows === 0) {
            throw new Exception('Social program not found');
        }
        $prog_row = $prog_result->fetch_assoc();
        $program_name = $prog_row['program_name'];
        
        // Create financial ledger entry for social program expense (if amount provided)
        $ledger_id = null;
        if ($amount_given !== null && $amount_given > 0) {
            $ledger_query = "INSERT INTO financial_ledger (trans_type, category, amount, trans_date, encoded_by, description, cat_id)
                            VALUES ('Expense', 'Social Program Aid', $amount_given, '$date_given', $user_id, 'Aid from program: $program_name - Beneficiary ID: $person_id - $aid_received', NULL)";
            
            if (!$conn->query($ledger_query)) {
                throw new Exception('Failed to create ledger entry: ' . $conn->error);
            }
            $ledger_id = $conn->insert_id;
        }
        
        // Insert beneficiary log
        $ledger_id_value = ($ledger_id !== null) ? $ledger_id : 'NULL';
        $amount_value = ($amount_given !== null) ? $amount_given : 'NULL';
        $query = "INSERT INTO beneficiary_logs (program_id, person_id, aid_received, date_given, ledger_id, amount_given) 
                  VALUES ($program_id, $person_id, '$aid_received', '$date_given', $ledger_id_value, $amount_value)";
        
        if (!$conn->query($query)) {
            throw new Exception('Failed to create beneficiary log: ' . $conn->error);
        }
        $new_id = $conn->insert_id;
        
        // COMMIT transaction
        $conn->commit();
        
        logAudit($conn, $user_id, 'CREATE', 'beneficiary_logs', "Added beneficiary to program ID: $program_id - Aid: $aid_received" . ($amount_given ? " - Amount: $amount_given" : ""));
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Beneficiary log created successfully',
            'id' => $new_id,
            'ledger_id' => $ledger_id
        ]);
    } catch (Exception $e) {
        // ROLLBACK on any error
        $conn->rollback();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create beneficiary log: ' . $e->getMessage()]);
    }

} elseif ($request_method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['log_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing log_id']);
        exit();
    }

    $log_id = (int)$input['log_id'];
    $updates = [];
    
    if (isset($input['program_id'])) {
        $updates[] = "program_id = " . (int)$input['program_id'];
    }
    if (isset($input['person_id'])) {
        $updates[] = "person_id = " . (int)$input['person_id'];
    }
    if (isset($input['aid_received'])) {
        $updates[] = "aid_received = '" . $conn->real_escape_string($input['aid_received']) . "'";
    }
    if (isset($input['date_given'])) {
        $updates[] = "date_given = '" . $conn->real_escape_string($input['date_given']) . "'";
    }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit();
    }

    $query = "UPDATE beneficiary_logs SET " . implode(', ', $updates) . " WHERE log_id = $log_id";
    
    if ($conn->query($query)) {
        logAudit($conn, $_SESSION['user_id'] ?? 1, 'UPDATE', 'beneficiary_logs', "Updated beneficiary log ID: $log_id");
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Beneficiary log updated successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update beneficiary log: ' . $conn->error]);
    }

} elseif ($request_method === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['log_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing log_id']);
        exit();
    }

    $log_id = (int)$input['log_id'];

    // START TRANSACTION to ensure beneficiary log and ledger deletion stay in sync
    $conn->begin_transaction();
    try {
        // First, get the ledger_id if it exists
        $ledger_check = $conn->query("SELECT ledger_id FROM beneficiary_logs WHERE log_id = $log_id");
        $log_row = $ledger_check->fetch_assoc();
        $ledger_id = $log_row['ledger_id'] ?? null;
        
        // Delete the beneficiary log
        $query = "DELETE FROM beneficiary_logs WHERE log_id = $log_id";
        if (!$conn->query($query)) {
            throw new Exception('Failed to delete beneficiary log: ' . $conn->error);
        }
        
        // If there's a linked ledger entry, delete it too
        if ($ledger_id) {
            if (!$conn->query("DELETE FROM financial_ledger WHERE trans_id = $ledger_id")) {
                throw new Exception('Failed to delete linked ledger entry: ' . $conn->error);
            }
        }
        
        // COMMIT transaction
        $conn->commit();
        
        logAudit($conn, $_SESSION['user_id'] ?? 1, 'DELETE', 'beneficiary_logs', "Deleted beneficiary log ID: $log_id (Ledger ID: $ledger_id)");
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Beneficiary log deleted successfully']);
    } catch (Exception $e) {
        // ROLLBACK on any error
        $conn->rollback();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete beneficiary log: ' . $e->getMessage()]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>