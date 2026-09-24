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
    $query = "SELECT p.*, pr.first_name, pr.last_name, pb.first_name as proc_first, pb.last_name as proc_last,
                     COALESCE(f.trans_id, 0) as linked_ledger_id, f.trans_type as ledger_type
              FROM payments p 
              LEFT JOIN persons pr ON p.person_id = pr.person_id
              LEFT JOIN persons pb ON p.processed_by = pb.person_id
              LEFT JOIN financial_ledger f ON p.ledger_id = f.trans_id
              ORDER BY p.payment_date DESC";
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
    
    if (!$input || !isset($input['amount']) || !isset($input['payment_for']) || !isset($input['or_number'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields: amount, payment_for, or_number']);
        exit();
    }

    $person_id = isset($input['person_id']) ? (int)$input['person_id'] : "NULL";
    $amount = (float)$input['amount'];
    $payment_for = $conn->real_escape_string($input['payment_for']);
    $or_number = $conn->real_escape_string($input['or_number']);
    $processed_by = isset($input['processed_by']) ? (int)$input['processed_by'] : ($_SESSION['user_id'] ?? 1);
    $payment_date = isset($input['payment_date']) ? $conn->real_escape_string($input['payment_date']) : date('Y-m-d');

    // START TRANSACTION to ensure payment and ledger stay in sync
    $conn->begin_transaction();
    try {
        // Create corresponding financial ledger entry for Expense tracking
        // Look up cat_id from accounting_categories for the payment type
        $cat_query = "SELECT cat_id FROM accounting_categories WHERE LOWER(cat_name) LIKE LOWER('%' . SUBSTRING('$payment_for', 1, INSTR('$payment_for', ' ')-1) . '%') LIMIT 1";
        $cat_result = $conn->query($cat_query);
        $cat_id = null;
        if ($cat_result && $cat_row = $cat_result->fetch_assoc()) {
            $cat_id = $cat_row['cat_id'];
        }
        
        $cat_id_value = ($cat_id !== null) ? $cat_id : 'NULL';
        $ledger_query = "INSERT INTO financial_ledger (trans_type, category, amount, trans_date, encoded_by, description, cat_id)
                        VALUES ('Expense', '$payment_for', $amount, '$payment_date', $processed_by, 'Payment for $payment_for - OR: $or_number', $cat_id_value)";
        
        if (!$conn->query($ledger_query)) {
            throw new Exception('Failed to create ledger entry: ' . $conn->error);
        }
        $ledger_id = $conn->insert_id;
        
        // Insert payment record with ledger_id reference
        $query = "INSERT INTO payments (person_id, amount, payment_for, or_number, processed_by, ledger_id) 
                  VALUES ($person_id, $amount, '$payment_for', '$or_number', $processed_by, $ledger_id)";
        
        if (!$conn->query($query)) {
            throw new Exception('Failed to create payment: ' . $conn->error);
        }
        $new_id = $conn->insert_id;
        
        // COMMIT transaction
        $conn->commit();
        
        logAudit($conn, $processed_by, 'CREATE', 'payments', "Created payment: $payment_for - $or_number (Amount: $amount, Ledger ID: $ledger_id)");
        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Payment created successfully', 'id' => $new_id, 'ledger_id' => $ledger_id]);
    } catch (Exception $e) {
        // ROLLBACK on any error
        $conn->rollback();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create payment: ' . $e->getMessage()]);
    }

} elseif ($request_method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['payment_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing payment_id']);
        exit();
    }

    $payment_id = (int)$input['payment_id'];
    $updates = [];
    
    if (isset($input['person_id'])) {
        $updates[] = "person_id = " . (int)$input['person_id'];
    }
    if (isset($input['amount'])) {
        $updates[] = "amount = " . (float)$input['amount'];
    }
    if (isset($input['payment_for'])) {
        $updates[] = "payment_for = '" . $conn->real_escape_string($input['payment_for']) . "'";
    }
    if (isset($input['or_number'])) {
        $updates[] = "or_number = '" . $conn->real_escape_string($input['or_number']) . "'";
    }
    if (isset($input['processed_by'])) {
        $updates[] = "processed_by = " . (int)$input['processed_by'];
    }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit();
    }

    $query = "UPDATE payments SET " . implode(', ', $updates) . " WHERE payment_id = $payment_id";
    
    if ($conn->query($query)) {
        logAudit($conn, $_SESSION['user_id'] ?? 1, 'UPDATE', 'payments', "Updated payment ID: $payment_id");
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Payment updated successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update payment: ' . $conn->error]);
    }

} elseif ($request_method === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['payment_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing payment_id']);
        exit();
    }

    $payment_id = (int)$input['payment_id'];

    // START TRANSACTION to ensure payment and ledger deletion stay in sync
    $conn->begin_transaction();
    try {
        // First, get the ledger_id if it exists
        $ledger_check = $conn->query("SELECT ledger_id FROM payments WHERE payment_id = $payment_id");
        $payment_row = $ledger_check->fetch_assoc();
        $ledger_id = $payment_row['ledger_id'] ?? null;
        
        // Delete the payment
        $query = "DELETE FROM payments WHERE payment_id = $payment_id";
        if (!$conn->query($query)) {
            throw new Exception('Failed to delete payment: ' . $conn->error);
        }
        
        // If there's a linked ledger entry, delete it too
        if ($ledger_id) {
            if (!$conn->query("DELETE FROM financial_ledger WHERE trans_id = $ledger_id")) {
                throw new Exception('Failed to delete linked ledger entry: ' . $conn->error);
            }
        }
        
        // COMMIT transaction
        $conn->commit();
        
        logAudit($conn, $_SESSION['user_id'] ?? 1, 'DELETE', 'payments', "Deleted payment ID: $payment_id (Ledger ID: $ledger_id)");
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Payment deleted successfully']);
    } catch (Exception $e) {
        // ROLLBACK on any error
        $conn->rollback();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete payment: ' . $e->getMessage()]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>