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
require_once 'UserNotificationHelper.php';

header('Content-Type: application/json; charset=utf-8');

if (!$conn) {
    http_response_code(500);
    exit(json_encode(['success' => false, 'message' => 'Database connection not available']));
}

$request_method = $_SERVER['REQUEST_METHOD'];

if ($request_method === 'GET') {
    // Get donations
    $query = "SELECT d.*, p.first_name, p.last_name FROM donations d
              LEFT JOIN persons p ON d.person_id = p.person_id
              ORDER BY d.date_received DESC";

    $result = $conn->query($query);

    if (!$result) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]);
        exit();
    }

    $donations = [];
    while ($row = $result->fetch_assoc()) {
        $donations[] = $row;
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $donations,
        'count' => count($donations)
    ]);

} elseif ($request_method === 'POST') {
    // Create new donation
    $data = json_decode(file_get_contents("php://input"), true);
    $user_id = isset($data['user_id']) && intval($data['user_id']) > 0 ? intval($data['user_id']) : null;

    // Validate that the user_id actually exists in system_users table
    if ($user_id > 0) {
        $user_check = $conn->query("SELECT user_id FROM system_users WHERE user_id = $user_id");
        if (!$user_check || $user_check->num_rows === 0) {
            $user_id = null; // Invalid user_id, reset to null
        }
    }

    if (!isset($data['donor_name']) || !isset($data['amount']) || !isset($data['donation_type'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields: donor_name, amount, donation_type']);
        exit();
    }

    $person_id = isset($data['person_id']) ? intval($data['person_id']) : 'NULL';
    $donor_name = $conn->real_escape_string($data['donor_name']);
    $amount = floatval($data['amount']);
    $donation_type = $conn->real_escape_string($data['donation_type']);
    $payment_status = isset($data['payment_status']) ? $conn->real_escape_string($data['payment_status']) : 'Paid';
    $received_by_user_id = isset($data['received_by_user_id']) ? intval($data['received_by_user_id']) : ($user_id ? $user_id : 'NULL');
    $payment_method = isset($data['payment_method']) ? $conn->real_escape_string($data['payment_method']) : 'Cash';
    $reference_no = isset($data['reference_no']) ? $conn->real_escape_string($data['reference_no']) : 'NULL';
    $or_number = isset($data['or_number']) ? $conn->real_escape_string($data['or_number']) : 'NULL';
    $fee_id = isset($data['fee_id']) ? intval($data['fee_id']) : 'NULL';
    $donation_date = isset($data['donation_date']) ? $conn->real_escape_string($data['donation_date']) : date('Y-m-d');

    // START TRANSACTION to ensure donation and ledger stay in sync
    $conn->begin_transaction();
    try {
        // If OR number provided, create official receipt entry
        $or_id = null;
        if ($or_number !== 'NULL' && $or_number) {
            $person_id_for_or = ($person_id !== 'NULL') ? $person_id : 'NULL';
            $or_query = "INSERT INTO official_receipts (or_number, payor_person_id, total_amount, payment_method)
                        VALUES ('$or_number', $person_id_for_or, $amount, '$payment_method')
                        ON DUPLICATE KEY UPDATE total_amount = total_amount + $amount";
            if (!$conn->query($or_query)) {
                throw new Exception('Failed to create official receipt: ' . $conn->error);
            }
            $or_id = $conn->insert_id;
        }

        // Create a financial ledger entry
        $cat_query = "SELECT cat_id FROM accounting_categories WHERE cat_name = '$donation_type' OR cat_name = 'Donation' LIMIT 1";
        $cat_result = $conn->query($cat_query);
        $cat_id = null;
        if ($cat_result && $cat_row = $cat_result->fetch_assoc()) {
            $cat_id = $cat_row['cat_id'];
        }
        
        $cat_id_value = ($cat_id !== null) ? $cat_id : 'NULL';
        $ledger_user_id = ($user_id && $user_id > 0) ? $user_id : 'NULL';
        $ledger_query = "INSERT INTO financial_ledger (trans_type, category, amount, trans_date, encoded_by, description, cat_id)
                         VALUES ('Income', '$donation_type', $amount, '$donation_date', $ledger_user_id, 'Donation from $donor_name - $donation_type', $cat_id_value)";
        
        if (!$conn->query($ledger_query)) {
            throw new Exception('Failed to create ledger entry: ' . $conn->error);
        }
        
        $ledger_id = $conn->insert_id;

        // Now create the donation record with the ledger_id and payment_status
        $received_by_value = ($received_by_user_id > 0) ? $received_by_user_id : 'NULL';
        $query = "INSERT INTO donations (person_id, donor_name, amount, donation_type, payment_status, received_by_user_id, payment_method, reference_no, or_number, fee_id, ledger_id)
                  VALUES ($person_id, '$donor_name', $amount, '$donation_type', '$payment_status', $received_by_value, '$payment_method', " . ($reference_no !== 'NULL' ? "'$reference_no'" : "NULL") . ", " . ($or_number !== 'NULL' ? "'$or_number'" : "NULL") . ", $fee_id, $ledger_id)";

        if (!$conn->query($query)) {
            throw new Exception('Failed to create donation: ' . $conn->error);
        }
        $donation_id = $conn->insert_id;
        
        // COMMIT transaction
        $conn->commit();

        // Log the action
        if ($user_id && $user_id > 0) {
            logAuditAction($user_id, 'CREATE', 'donations', "Recorded donation from $donor_name: $amount ($donation_type) - Status: $payment_status" . ($or_number && $or_number !== 'NULL' ? " - OR: $or_number" : ""), $conn);
        }

        // Create in-app notification for relevant users
        try {
            $helper = new UserNotificationHelper($conn);
            $message = "New donation: $donor_name — ₱$amount ($donation_type)";
            $options = ['action_url' => "/donations/{$donation_id}", 'action_type' => 'view_donation'];

            // Prefer notifying the user who received the donation (if they are a system user with a person_id)
            if ($received_by_value !== 'NULL' && intval($received_by_value) > 0) {
                $recv_user_id = intval($received_by_value);
                $res = $conn->query("SELECT person_id FROM system_users WHERE user_id = $recv_user_id LIMIT 1");
                if ($res && ($row = $res->fetch_assoc()) && !empty($row['person_id'])) {
                    $helper->sendUserNotification(intval($row['person_id']), $message, 'Donations', $options);
                }
            } else {
                // fallback: notify treasurer role
                $helper->sendRoleBasedNotification('Treasurer', $message, 'Donations', $options);
            }
        } catch (Throwable $e) {
            // Don't break the API if notification fails; just log to error log
            error_log('Notification error (donations): ' . $e->getMessage());
        }

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Donation recorded successfully',
            'donation_id' => $donation_id,
            'ledger_id' => $ledger_id,
            'or_id' => $or_id
        ]);
    } catch (Exception $e) {
        // ROLLBACK on any error
        $conn->rollback();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to record donation: ' . $e->getMessage()]);
    }

} elseif ($request_method === 'PUT') {
    // Update existing donation
    $data = json_decode(file_get_contents("php://input"), true);
    $user_id = isset($data['user_id']) && intval($data['user_id']) > 0 ? intval($data['user_id']) : null;

    if (!isset($data['donation_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing donation_id']);
        exit();
    }

    $donation_id = intval($data['donation_id']);
    $updates = [];

    if (isset($data['donor_name'])) {
        $updates[] = "donor_name = '" . $conn->real_escape_string($data['donor_name']) . "'";
    }
    if (isset($data['amount'])) {
        $updates[] = "amount = " . floatval($data['amount']);
    }
    if (isset($data['donation_type'])) {
        $updates[] = "donation_type = '" . $conn->real_escape_string($data['donation_type']) . "'";
    }
    if (isset($data['payment_method'])) {
        $updates[] = "payment_method = '" . $conn->real_escape_string($data['payment_method']) . "'";
    }
    if (isset($data['reference_no'])) {
        $ref_val = isset($data['reference_no']) && $data['reference_no'] !== null ? "'" . $conn->real_escape_string($data['reference_no']) . "'" : 'NULL';
        $updates[] = "reference_no = $ref_val";
    }
    if (isset($data['or_number'])) {
        $or_val = isset($data['or_number']) && $data['or_number'] !== null ? "'" . $conn->real_escape_string($data['or_number']) . "'" : 'NULL';
        $updates[] = "or_number = $or_val";
    }
    if (isset($data['fee_id'])) {
        $fee_val = isset($data['fee_id']) && $data['fee_id'] !== null ? intval($data['fee_id']) : 'NULL';
        $updates[] = "fee_id = $fee_val";
    }
    if (isset($data['received_by_user_id'])) {
        $rcv_val = isset($data['received_by_user_id']) && $data['received_by_user_id'] !== null ? intval($data['received_by_user_id']) : 'NULL';
        $updates[] = "received_by_user_id = $rcv_val";
    }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit();
    }

    $query = "UPDATE donations SET " . implode(", ", $updates) . " WHERE donation_id = $donation_id";

    if ($conn->query($query) === TRUE) {
        if ($user_id && $user_id > 0) {
            logAuditAction($user_id, 'UPDATE', 'donations', "Updated donation ID: $donation_id", $conn);
        }

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Donation updated successfully'
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update donation: ' . $conn->error]);
    }

} elseif ($request_method === 'DELETE') {
    // Delete existing donation
    $data = json_decode(file_get_contents("php://input"), true);
    $user_id = isset($data['user_id']) && intval($data['user_id']) > 0 ? intval($data['user_id']) : null;

    if (!isset($data['donation_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing donation_id']);
        exit();
    }

    $donation_id = intval($data['donation_id']);

    // START TRANSACTION to ensure donation and ledger deletion stay in sync
    $conn->begin_transaction();
    try {
        // First, get the ledger_id if it exists
        $ledger_check = $conn->query("SELECT ledger_id FROM donations WHERE donation_id = $donation_id");
        $donation_row = $ledger_check->fetch_assoc();
        $ledger_id = $donation_row['ledger_id'] ?? null;
        
        // Delete the donation
        $query = "DELETE FROM donations WHERE donation_id = $donation_id";
        if (!$conn->query($query)) {
            throw new Exception('Failed to delete donation: ' . $conn->error);
        }
        
        // If there's a linked ledger entry, delete it too
        if ($ledger_id) {
            if (!$conn->query("DELETE FROM financial_ledger WHERE trans_id = $ledger_id")) {
                throw new Exception('Failed to delete linked ledger entry: ' . $conn->error);
            }
        }
        
        // COMMIT transaction
        $conn->commit();
        
        if ($user_id && $user_id > 0) {
            logAuditAction($user_id, 'DELETE', 'donations', "Deleted donation ID: $donation_id (Ledger ID: $ledger_id)", $conn);
        }

        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Donation deleted successfully']);
    } catch (Exception $e) {
        // ROLLBACK on any error
        $conn->rollback();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete donation: ' . $e->getMessage()]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

$conn->close();
?>
