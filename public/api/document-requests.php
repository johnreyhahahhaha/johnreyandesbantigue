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

function ensureDocumentRequestColumns($conn) {
    $result = $conn->query("SHOW COLUMNS FROM document_requests");
    $columns = [];
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $columns[] = $row['Field'];
        }
    }

    $additions = [];
    if (!in_array('sacramental_date', $columns)) {
        $additions[] = "ALTER TABLE document_requests ADD COLUMN sacramental_date DATE NULL AFTER purpose";
    }
    if (!in_array('contact_number', $columns)) {
        $additions[] = "ALTER TABLE document_requests ADD COLUMN contact_number VARCHAR(50) NULL AFTER sacramental_date";
    }
    if (!in_array('pickup_date', $columns)) {
        $additions[] = "ALTER TABLE document_requests ADD COLUMN pickup_date DATE NULL AFTER contact_number";
    }
    if (!in_array('reference_number', $columns)) {
        $additions[] = "ALTER TABLE document_requests ADD COLUMN reference_number VARCHAR(100) NULL AFTER pickup_date";
    }
    if (!in_array('verification_notes', $columns)) {
        $additions[] = "ALTER TABLE document_requests ADD COLUMN verification_notes TEXT NULL AFTER reference_number";
    }
    if (!in_array('qr_code', $columns)) {
        $additions[] = "ALTER TABLE document_requests ADD COLUMN qr_code VARCHAR(255) NULL AFTER verification_notes";
    }
    if (!in_array('approved_by_user_id', $columns)) {
        $additions[] = "ALTER TABLE document_requests ADD COLUMN approved_by_user_id INT NULL AFTER qr_code";
    }
    if (!in_array('payment_date', $columns)) {
        $additions[] = "ALTER TABLE document_requests ADD COLUMN payment_date DATE NULL AFTER payment_status";
    }
    if (!in_array('payment_method', $columns)) {
        $additions[] = "ALTER TABLE document_requests ADD COLUMN payment_method VARCHAR(50) NULL AFTER payment_date";
    }
    if (!in_array('received_by_user_id', $columns)) {
        $additions[] = "ALTER TABLE document_requests ADD COLUMN received_by_user_id INT NULL AFTER payment_method";
    }
    if (!in_array('record_type', $columns)) {
        $additions[] = "ALTER TABLE document_requests ADD COLUMN record_type VARCHAR(30) NULL";
    }
    if (!in_array('record_id', $columns)) {
        $additions[] = "ALTER TABLE document_requests ADD COLUMN record_id INT NULL";
    }

    foreach ($additions as $sql) {
        $conn->query($sql);
    }

    $status_col = $conn->query("SHOW COLUMNS FROM document_requests LIKE 'status'");
    if ($status_col && $status_col->num_rows > 0) {
        $row = $status_col->fetch_assoc();
        $type = $row['Type'];
        if (strpos($type, 'Approved') === false) {
            $conn->query("ALTER TABLE document_requests MODIFY status ENUM('Pending','Processing','Approved','Ready for Pickup','Released') DEFAULT 'Pending'");
        }
    }
}

function generateClaimReference($conn, $requestId, $documentType = '') {
    $prefix = 'DOC';
    if (!empty($documentType)) {
        $prefix = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $documentType));
        $prefix = substr($prefix, 0, 6) ?: 'DOC';
    }

    $today = date('Ymd');
    $sequence = $requestId ?: time();
    $ref = strtoupper($prefix) . '-' . $today . '-' . str_pad($sequence, 4, '0', STR_PAD_LEFT);
    return $ref;
}

// Debug: Check if connection is valid
if (!$conn) {
    http_response_code(500);
    exit(json_encode(['success' => false, 'message' => 'Database connection not available']));
}

ensureDocumentRequestColumns($conn);

$request_method = $_SERVER['REQUEST_METHOD'];
$request_id = isset($_GET['id']) ? intval($_GET['id']) : null;

if ($request_method === 'GET') {
    // Get document requests with person details
    $status = isset($_GET['status']) ? $conn->real_escape_string($_GET['status']) : 'all';
    $person_id = isset($_GET['person_id']) ? intval($_GET['person_id']) : null;
    $reference_number = isset($_GET['reference_number']) ? $conn->real_escape_string(trim($_GET['reference_number'])) : '';
    $tracking_number = isset($_GET['tracking_number']) ? $conn->real_escape_string(trim($_GET['tracking_number'])) : '';

    $conditions = [];
    if ($status !== 'all') {
        $conditions[] = "dr.status = '$status'";
    }
    if ($person_id) {
        $conditions[] = "dr.person_id = $person_id";
    }
    if ($reference_number !== '') {
        $conditions[] = "dr.reference_number = '$reference_number'";
    }
    if ($tracking_number !== '') {
        $conditions[] = "dr.tracking_number = '$tracking_number'";
    }

    $conditions[] = "dr.document_type NOT IN ('Baptism Application', 'Marriage Application', 'Confirmation Application')";

    $whereClause = '';
    if (!empty($conditions)) {
        $whereClause = 'WHERE ' . implode(' AND ', $conditions);
    }

    $query = "SELECT dr.*, p.first_name, p.last_name 
              FROM document_requests dr
              LEFT JOIN persons p ON dr.person_id = p.person_id
              $whereClause
              ORDER BY dr.request_date DESC";

    $result = $conn->query($query);

    if (!$result) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]);
        exit();
    }

    $requests = [];
    while ($row = $result->fetch_assoc()) {
        $requests[] = $row;
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $requests,
        'count' => count($requests)
    ]);

} elseif ($request_method === 'POST') {
    // Create new document request
    $data = json_decode(file_get_contents("php://input"), true);
    $user_id = isset($data['user_id']) && intval($data['user_id']) > 0 ? intval($data['user_id']) : intval($_SESSION['user_id'] ?? 0);

    // Validate that the user_id actually exists in system_users table
    if ($user_id > 0) {
        $user_check = $conn->query("SELECT user_id FROM system_users WHERE user_id = $user_id");
        if (!$user_check || $user_check->num_rows === 0) {
            $user_id = 0; // Invalid user_id, reset to 0
        }
    }

    if (!isset($data['person_id']) || !isset($data['document_type'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields: person_id and document_type']);
        exit();
    }

    $person_id = intval($data['person_id']);
    $requester_name = $conn->real_escape_string($data['requester_name'] ?? '');
    $document_type = $conn->real_escape_string($data['document_type']);
    $template_id = isset($data['template_id']) && intval($data['template_id']) > 0 ? intval($data['template_id']) : null;
    $purpose = $conn->real_escape_string($data['purpose'] ?? '');
    $status = $conn->real_escape_string($data['status'] ?? 'Pending');
    $payment_status = $conn->real_escape_string($data['payment_status'] ?? 'Unpaid');
    $amount_paid = floatval($data['amount_paid'] ?? 0);
    $or_number = $conn->real_escape_string($data['or_number'] ?? '');
    $payment_method = $conn->real_escape_string($data['payment_method'] ?? 'Cash');
    $payment_date = $conn->real_escape_string($data['payment_date'] ?? date('Y-m-d'));
    $sacramental_date = $conn->real_escape_string($data['sacramental_date'] ?? '');
    $contact_number = $conn->real_escape_string($data['contact_number'] ?? '');
    $pickup_date = $conn->real_escape_string($data['pickup_date'] ?? '');
    $verification_notes = $conn->real_escape_string($data['verification_notes'] ?? '');
    $reference_number = $conn->real_escape_string($data['reference_number'] ?? '');
    $approved_by_user_id = isset($data['approved_by_user_id']) && intval($data['approved_by_user_id']) > 0 ? intval($data['approved_by_user_id']) : null;
    $received_by_user_id = isset($data['received_by_user_id']) && intval($data['received_by_user_id']) > 0 ? intval($data['received_by_user_id']) : intval($_SESSION['user_id'] ?? 0);
    $record_type = $conn->real_escape_string($data['record_type'] ?? '');
    $record_id = isset($data['record_id']) && intval($data['record_id']) > 0 ? intval($data['record_id']) : null;

    // Check if person exists
    $person_check = $conn->query("SELECT person_id FROM persons WHERE person_id = $person_id");
    if ($person_check->num_rows === 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid person_id']);
        exit();
    }

    // START TRANSACTION
    $conn->begin_transaction();
    try {
        // Auto-generate tracking number based on today's max sequence
        $today = date('Ymd');
        $trackingNumberQuery = "SELECT MAX(tracking_number) as max_tracking FROM document_requests WHERE tracking_number LIKE 'DR-{$today}-%'";
        $trackingResult = $conn->query($trackingNumberQuery);
        $nextSequence = 1;

        if ($trackingResult && $trackingRow = $trackingResult->fetch_assoc()) {
            $maxTracking = $trackingRow['max_tracking'];
            if ($maxTracking) {
                if (preg_match('/DR-' . $today . '-(\d{5})$/', $maxTracking, $matches)) {
                    $nextSequence = intval($matches[1]) + 1;
                } else {
                    $nextSequence = 1;
                }
            }
        }

        $tracking_number = 'DR-' . $today . '-' . str_pad($nextSequence, 5, '0', STR_PAD_LEFT);

        // Insert document request with auto-generated tracking number
        $query = "INSERT INTO document_requests (tracking_number, person_id, requester_name, document_type, template_id, purpose, status, payment_status, amount_paid, or_number, record_type, record_id)
                  VALUES ('$tracking_number', $person_id, '$requester_name', '$document_type', " . ($template_id ? $template_id : "NULL") . ", '$purpose', '$status', '$payment_status', $amount_paid, " . ($or_number ? "'$or_number'" : "NULL") . ", " . ($record_type ? "'$record_type'" : "NULL") . ", " . ($record_id ?: "NULL") . ")";

        if (!$conn->query($query)) {
            throw new Exception('Failed to create document request: ' . $conn->error);
        }
        $request_id = $conn->insert_id;

        $effective_pickup_date = $pickup_date ?: (($status === 'Approved' || $status === 'Ready for Pickup' || $status === 'Released') ? date('Y-m-d', strtotime('+3 days')) : null);
        $effective_reference = $reference_number ?: (($status === 'Approved' || $status === 'Ready for Pickup' || $status === 'Released') ? generateClaimReference($conn, $request_id, $document_type) : '');
        $qr_code_url = $effective_reference ? 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' . rawurlencode($effective_reference) : '';

        $extra_update_fields = [];
        if ($sacramental_date !== '') {
            $extra_update_fields[] = "sacramental_date = '$sacramental_date'";
        }
        if ($contact_number !== '') {
            $extra_update_fields[] = "contact_number = '$contact_number'";
        }
        if ($effective_pickup_date) {
            $extra_update_fields[] = "pickup_date = '$effective_pickup_date'";
        }
        if ($effective_reference !== '') {
            $extra_update_fields[] = "reference_number = '$effective_reference'";
            $extra_update_fields[] = "qr_code = '$qr_code_url'";
        }
        if ($verification_notes !== '') {
            $extra_update_fields[] = "verification_notes = '$verification_notes'";
        }
        if ($approved_by_user_id !== null) {
            $extra_update_fields[] = "approved_by_user_id = $approved_by_user_id";
        }
        if ($payment_status === 'Paid') {
            $extra_update_fields[] = "payment_date = " . ($payment_date ? "'$payment_date'" : "NULL");
            $extra_update_fields[] = "payment_method = " . ($payment_method ? "'$payment_method'" : "NULL");
            $extra_update_fields[] = "received_by_user_id = " . ($received_by_user_id > 0 ? $received_by_user_id : "NULL");
        }

        if (!empty($extra_update_fields)) {
            $update_extra = "UPDATE document_requests SET " . implode(', ', $extra_update_fields) . " WHERE request_id = $request_id";
            $conn->query($update_extra);
        }

        // If payment is marked as Paid with amount, create ledger entry
        if ($payment_status === 'Paid' && $amount_paid > 0) {
            // If OR number provided, create official receipt entry
            $or_id = null;
            if ($or_number) {
                $or_query = "INSERT INTO official_receipts (or_number, payor_person_id, total_amount, payment_method)
                            VALUES ('$or_number', $person_id, $amount_paid, '$payment_method')
                            ON DUPLICATE KEY UPDATE total_amount = total_amount + $amount_paid";
                if (!$conn->query($or_query)) {
                    throw new Exception('Failed to create official receipt: ' . $conn->error);
                }
                $or_id = $conn->insert_id;
            }

            // Create ledger entry
            $ledger_user_id = ($user_id > 0) ? $user_id : 'NULL';
            $cat_query = "SELECT cat_id FROM accounting_categories WHERE cat_name = 'Document Request Fee' OR cat_name = 'Document Fee' LIMIT 1";
            $cat_result = $conn->query($cat_query);
            $cat_id = null;
            if ($cat_result && $cat_row = $cat_result->fetch_assoc()) {
                $cat_id = $cat_row['cat_id'];
            }

            $cat_id_value = ($cat_id !== null) ? $cat_id : 'NULL';
            $ledger_query = "INSERT INTO financial_ledger (trans_type, category, amount, trans_date, encoded_by, description, cat_id, or_id)
                            VALUES ('Income', 'Document Request Fee', $amount_paid, '$payment_date', $ledger_user_id, 'Document request fee for $document_type from person_id: $person_id', $cat_id_value, " . ($or_id ? $or_id : "NULL") . ")";

            if (!$conn->query($ledger_query)) {
                throw new Exception('Failed to create ledger entry: ' . $conn->error);
            }
            $ledger_id = $conn->insert_id;

            // Link ledger to document request
            $update_query = "UPDATE document_requests SET ledger_id = $ledger_id WHERE request_id = $request_id";
            if (!$conn->query($update_query)) {
                throw new Exception('Failed to link ledger entry: ' . $conn->error);
            }
        }

        // COMMIT transaction
        $conn->commit();

        // Log the action
        logAuditAction($user_id, 'CREATE', 'document_requests', "Created document request: $document_type - Amount: $amount_paid - Payment Status: $payment_status from person_id: $person_id" . ($or_number ? " - OR: $or_number" : ""), $conn);

        // Resolve requester name for notification label
        if (trim($requester_name) === '') {
            $nameQuery = "SELECT CONCAT(first_name, ' ', last_name) AS full_name FROM persons WHERE person_id = $person_id LIMIT 1";
            $nameResult = $conn->query($nameQuery);
            if ($nameResult && $nameRow = $nameResult->fetch_assoc()) {
                $requester_name = $nameRow['full_name'];
            } else {
                $requester_name = 'A parishioner';
            }
        }

        // Create in-app notifications for the requester and parish staff roles
        try {
            $helper = new UserNotificationHelper($conn);
            $options = [
                'action_url' => "/document-requests/{$request_id}",
                'action_type' => 'view_document_request'
            ];
            if ($person_id > 0) {
                $helper->sendUserNotification($person_id, "Your document request for $document_type has been received.", 'Document Requests', $options);
            }

            // Notify only the Secretary so parish secretariat handles the request
            $helper->sendRoleBasedNotification('Secretary', "New document request from $requester_name for $document_type", 'Document Requests', $options);
        } catch (Throwable $e) {
            error_log('Notification error (document request): ' . $e->getMessage());
        }

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Document request created successfully',
            'request_id' => $request_id,
            'ledger_id' => isset($ledger_id) ? $ledger_id : null
        ]);
    } catch (Exception $e) {
        // ROLLBACK on error
        $conn->rollback();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create request: ' . $e->getMessage()]);
    }

} elseif ($request_method === 'PUT') {
    // Update document request
    $data = json_decode(file_get_contents("php://input"), true);
    $user_id = isset($data['user_id']) && intval($data['user_id']) > 0 ? intval($data['user_id']) : intval($_SESSION['user_id'] ?? 0);

    // Get request_id from query parameter or body
    $request_id = $request_id ?? (isset($data['request_id']) ? intval($data['request_id']) : null);

    if (!$request_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing request_id parameter']);
        exit();
    }

    // Check if request exists and get current data
    $check_query = "SELECT * FROM document_requests WHERE request_id = $request_id";
    $check_result = $conn->query($check_query);
    if ($check_result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Request not found']);
        exit();
    }
    $current_request = $check_result->fetch_assoc();

    if (isset($data['status']) && in_array($data['status'], ['Approved', 'Ready for Pickup', 'Released'], true)) {
        $linkedType = $data['record_type'] ?? $current_request['record_type'] ?? '';
        $linkedId = (int)($data['record_id'] ?? $current_request['record_id'] ?? 0);
        $requirementColumn = [
            'Baptismal' => 'baptism_id',
            'Baptism' => 'baptism_id',
            'Confirmation' => 'confirmation_id',
            'Marriage' => 'marriage_id',
        ][$linkedType] ?? null;
        if ($requirementColumn && $linkedId > 0) {
            $requirementCheck = $conn->query("SELECT COUNT(*) AS incomplete_count FROM requirement_checklists WHERE $requirementColumn = $linkedId AND is_submitted = 0");
            $incompleteCount = $requirementCheck ? (int)$requirementCheck->fetch_assoc()['incomplete_count'] : 0;
            if ($incompleteCount > 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Complete all linked sacrament requirements before approving or releasing this request']);
                exit();
            }
        } elseif ($linkedType && !empty($current_request['person_id'])) {
            $category = [
                'Baptismal' => 'Baptism',
                'Baptism' => 'Baptism',
                'Confirmation' => 'Confirmation',
                'Marriage' => 'Marriage',
            ][$linkedType] ?? null;
            if ($category) {
                $personId = (int)$current_request['person_id'];
                $requirementCheck = $conn->query("SELECT COUNT(*) AS incomplete_count
                    FROM requirement_checklists rc
                    LEFT JOIN requirement_submissions rs ON rs.check_id = rc.check_id AND rs.person_id = $personId
                    WHERE rc.category = '$category' AND (rs.status IS NULL OR rs.status <> 'Approved')");
                $incompleteCount = $requirementCheck ? (int)$requirementCheck->fetch_assoc()['incomplete_count'] : 0;
                if ($incompleteCount > 0) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => 'Complete and wait for parish approval of all requirements before approving or releasing this request']);
                    exit();
                }
            }
        }
    }

    if (isset($data['status']) && $data['status'] === 'Released' && $current_request['status'] !== 'Ready for Pickup') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Only requests marked Ready for Pickup can be released']);
        exit();
    }

    if (isset($data['status']) && $data['status'] === 'Released') {
        $release_payment_status = $data['payment_status'] ?? $current_request['payment_status'];
        $release_amount_paid = floatval($data['amount_paid'] ?? $current_request['amount_paid']);
        if ($release_payment_status !== 'Paid' || $release_amount_paid <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Payment must be recorded before releasing this document']);
            exit();
        }
    }

    $update_fields = [];

    if (isset($data['person_id'])) {
        $person_id = intval($data['person_id']);
        $update_fields[] = "person_id = $person_id";
    }

    if (isset($data['requester_name'])) {
        $requester_name = $conn->real_escape_string($data['requester_name']);
        $update_fields[] = "requester_name = '$requester_name'";
    }

    if (isset($data['document_type'])) {
        $document_type = $conn->real_escape_string($data['document_type']);
        $update_fields[] = "document_type = '$document_type'";
    }

    if (isset($data['template_id'])) {
        $template_id = $data['template_id'] ? intval($data['template_id']) : null;
        $update_fields[] = "template_id = " . ($template_id ? $template_id : "NULL");
    }

    if (isset($data['purpose'])) {
        $purpose = $conn->real_escape_string($data['purpose']);
        $update_fields[] = "purpose = '$purpose'";
    }

    if (isset($data['status'])) {
        $status = $conn->real_escape_string($data['status']);
        $update_fields[] = "status = '$status'";
        if ($data['status'] === 'Ready for Pickup') {
            $update_fields[] = "pickup_date = CURDATE()";
        }
    }

    if (isset($data['payment_status'])) {
        $payment_status = $conn->real_escape_string($data['payment_status']);
        $update_fields[] = "payment_status = '$payment_status'";
    }

    if (isset($data['amount_paid'])) {
        $amount_paid = floatval($data['amount_paid']);
        $update_fields[] = "amount_paid = $amount_paid";
    }

    if (isset($data['payment_date'])) {
        $payment_date = $conn->real_escape_string($data['payment_date']);
        $update_fields[] = "payment_date = " . ($payment_date ? "'$payment_date'" : "NULL");
    }

    if (isset($data['payment_method'])) {
        $payment_method = $conn->real_escape_string($data['payment_method']);
        $update_fields[] = "payment_method = " . ($payment_method ? "'$payment_method'" : "NULL");
    }

    if (isset($data['received_by_user_id'])) {
        $received_by_user_id = intval($data['received_by_user_id']);
        $update_fields[] = "received_by_user_id = " . ($received_by_user_id > 0 ? $received_by_user_id : "NULL");
    }

    if (isset($data['sacramental_date'])) {
        $sacramental_date = $conn->real_escape_string($data['sacramental_date']);
        $update_fields[] = "sacramental_date = " . ($sacramental_date ? "'$sacramental_date'" : "NULL");
    }

    if (array_key_exists('record_type', $data)) {
        $record_type = $conn->real_escape_string($data['record_type'] ?? '');
        $update_fields[] = "record_type = " . ($record_type ? "'$record_type'" : "NULL");
    }

    if (array_key_exists('record_id', $data)) {
        $record_id = intval($data['record_id'] ?? 0);
        $update_fields[] = "record_id = " . ($record_id > 0 ? $record_id : "NULL");
    }

    if (isset($data['contact_number'])) {
        $contact_number = $conn->real_escape_string($data['contact_number']);
        $update_fields[] = "contact_number = " . ($contact_number ? "'$contact_number'" : "NULL");
    }

    if (isset($data['pickup_date'])) {
        $pickup_date = $conn->real_escape_string($data['pickup_date']);
        $update_fields[] = "pickup_date = " . ($pickup_date ? "'$pickup_date'" : "NULL");
    }

    if (isset($data['date_released'])) {
        $date_released = $conn->real_escape_string($data['date_released']);
        $update_fields[] = "date_released = " . ($date_released ? "'$date_released'" : "NULL");
    }

    if (isset($data['reference_number'])) {
        $reference_number = $conn->real_escape_string($data['reference_number']);
        $update_fields[] = "reference_number = " . ($reference_number ? "'$reference_number'" : "NULL");
        if ($reference_number) {
            $update_fields[] = "qr_code = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" . rawurlencode($reference_number) . "'";
        }
    }

    if (isset($data['verification_notes'])) {
        $verification_notes = $conn->real_escape_string($data['verification_notes']);
        $update_fields[] = "verification_notes = " . ($verification_notes ? "'$verification_notes'" : "NULL");
    }

    if (isset($data['approved_by_user_id'])) {
        $approved_by_user_id = intval($data['approved_by_user_id']);
        $update_fields[] = "approved_by_user_id = " . ($approved_by_user_id > 0 ? $approved_by_user_id : "NULL");
    }

    if (isset($data['or_number'])) {
        $or_number = $conn->real_escape_string($data['or_number']);
        $update_fields[] = "or_number = " . ($or_number ? "'$or_number'" : "NULL");
    }

    if (isset($data['fee_id'])) {
        $fee_id = intval($data['fee_id']);
        $update_fields[] = "fee_id = " . ($fee_id > 0 ? $fee_id : "NULL");
    }

    if (empty($update_fields)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit();
    }

    // START TRANSACTION for safe updates
    $conn->begin_transaction();
    try {
        $query = "UPDATE document_requests SET " . implode(", ", $update_fields) . " WHERE request_id = $request_id";

        if (!$conn->query($query)) {
            throw new Exception('Failed to update document request: ' . $conn->error);
        }

        $new_status = isset($data['status']) ? $conn->real_escape_string($data['status']) : $current_request['status'];
        $updated_person_id = isset($data['person_id']) ? intval($data['person_id']) : $current_request['person_id'];
        $updated_document_type = isset($data['document_type']) ? $conn->real_escape_string($data['document_type']) : $current_request['document_type'];

        if (($new_status === 'Approved' || $new_status === 'Ready for Pickup' || $new_status === 'Released') && empty($current_request['reference_number'])) {
            $generated_ref = generateClaimReference($conn, $request_id, $updated_document_type);
            $conn->query("UPDATE document_requests SET reference_number = '$generated_ref', qr_code = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" . rawurlencode($generated_ref) . "', pickup_date = COALESCE(pickup_date, CURDATE()) WHERE request_id = $request_id");
        }

        if ($new_status === 'Released' && !isset($data['date_released'])) {
            $conn->query("UPDATE document_requests SET date_released = NOW() WHERE request_id = $request_id");
        }

        // Handle payment status change to 'Paid': create ledger entry if not exists
        if (isset($data['payment_status']) && $data['payment_status'] === 'Paid' && $current_request['ledger_id'] === null) {
            $amount_to_record = floatval($data['amount_paid'] ?? $current_request['amount_paid']);
            
            if ($amount_to_record > 0) {
                $person_id = $updated_person_id;
                $or_number = $data['or_number'] ?? $current_request['or_number'] ?? '';
                $payment_method = $data['payment_method'] ?? 'Cash';
                $payment_date = $data['payment_date'] ?? date('Y-m-d');
                $document_type = $updated_document_type;

                // Create official receipt if OR number provided
                $or_id = null;
                if ($or_number) {
                    $or_query = "INSERT INTO official_receipts (or_number, payor_person_id, total_amount, payment_method)
                                VALUES ('$or_number', $person_id, $amount_to_record, '$payment_method')
                                ON DUPLICATE KEY UPDATE total_amount = total_amount + $amount_to_record";
                    if (!$conn->query($or_query)) {
                        throw new Exception('Failed to create official receipt: ' . $conn->error);
                    }
                    $or_id = $conn->insert_id;
                }

                // Create ledger entry
                $ledger_user_id = ($user_id > 0) ? $user_id : 'NULL';
                $cat_query = "SELECT cat_id FROM accounting_categories WHERE cat_name = 'Document Request Fee' OR cat_name = 'Document Fee' LIMIT 1";
                $cat_result = $conn->query($cat_query);
                $cat_id = null;
                if ($cat_result && $cat_row = $cat_result->fetch_assoc()) {
                    $cat_id = $cat_row['cat_id'];
                }

                $cat_id_value = ($cat_id !== null) ? $cat_id : 'NULL';
                $ledger_query = "INSERT INTO financial_ledger (trans_type, category, amount, trans_date, encoded_by, description, cat_id, or_id)
                                VALUES ('Income', 'Document Request Fee', $amount_to_record, '$payment_date', $ledger_user_id, 'Document request fee for $document_type from person_id: $person_id', $cat_id_value, " . ($or_id ? $or_id : "NULL") . ")";

                if (!$conn->query($ledger_query)) {
                    throw new Exception('Failed to create ledger entry: ' . $conn->error);
                }
                $ledger_id = $conn->insert_id;

                // Link ledger to document request
                $update_ledger = "UPDATE document_requests SET ledger_id = $ledger_id WHERE request_id = $request_id";
                if (!$conn->query($update_ledger)) {
                    throw new Exception('Failed to link ledger entry: ' . $conn->error);
                }
            }
        }

        $status_message = null;
        if ($new_status !== $current_request['status'] && $updated_person_id > 0) {
            if ($new_status === 'Processing') {
                $status_message = "Your $updated_document_type request is now processing.";
            } elseif ($new_status === 'Approved') {
                $status_message = "Your $updated_document_type request has been approved! ✅ It will be prepared soon. You will receive a notification when it's ready for pickup.";
            } elseif ($new_status === 'Ready for Pickup') {
                $status_message = "Your $updated_document_type request is ready for pickup! 🎉 Please visit the parish office at your earliest convenience with your reference number.";
            } elseif ($new_status === 'Released') {
                $status_message = "Your $updated_document_type request has been released.";
            }
        }

        if ($status_message) {
            try {
                $helper = new UserNotificationHelper($conn);
                $options = [
                    'action_url' => "/document-requests/{$request_id}",
                    'action_type' => 'view_document_request'
                ];
                $helper->sendUserNotification($updated_person_id, $status_message, 'Document Requests', $options);
            } catch (Throwable $e) {
                error_log('Notification error (document request update): ' . $e->getMessage());
            }
        }

        // COMMIT transaction
        $conn->commit();

        // Log the action
        logAuditAction($user_id, 'UPDATE', 'document_requests', "Updated document request ID: $request_id", $conn);

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Document request updated successfully'
        ]);
    } catch (Exception $e) {
        // ROLLBACK on error
        $conn->rollback();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update request: ' . $e->getMessage()]);
    }

} elseif ($request_method === 'DELETE') {
    // Delete document request
    $data = json_decode(file_get_contents("php://input"), true);
    $user_id = isset($data['user_id']) && intval($data['user_id']) > 0 ? intval($data['user_id']) : intval($_SESSION['user_id'] ?? 0);
    
    if (!$request_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing request_id parameter']);
        exit();
    }

    // START TRANSACTION for safe cascading delete
    $conn->begin_transaction();
    try {
        // Get the ledger_id if it exists
        $ledger_check = $conn->query("SELECT ledger_id FROM document_requests WHERE request_id = $request_id");
        $request_row = $ledger_check->fetch_assoc();
        $ledger_id = $request_row['ledger_id'] ?? null;

        // Delete the document request
        $query = "DELETE FROM document_requests WHERE request_id = $request_id";
        if (!$conn->query($query)) {
            throw new Exception('Failed to delete document request: ' . $conn->error);
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

        // Log the action
        logAuditAction($user_id, 'DELETE', 'document_requests', "Deleted document request ID: $request_id" . ($ledger_id ? " - Ledger ID: $ledger_id deleted" : ""), $conn);

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Document request deleted successfully'
        ]);
    } catch (Exception $e) {
        // ROLLBACK on error
        $conn->rollback();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete request: ' . $e->getMessage()]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

$conn->close();
?>
