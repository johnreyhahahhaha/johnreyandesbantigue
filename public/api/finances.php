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

// ensure session available for user identification
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$request_method = $_SERVER['REQUEST_METHOD'];

function getRequestingUserScope($conn, $userId) {
    if (!$userId || intval($userId) <= 0) {
        return ['role' => null, 'person_id' => null];
    }

    $safeUserId = intval($userId);
    $result = $conn->query("SELECT user_role, person_id FROM system_users WHERE user_id = $safeUserId LIMIT 1");
    if (!$result || $result->num_rows === 0) {
        return ['role' => null, 'person_id' => null];
    }

    $row = $result->fetch_assoc();
    return [
        'role' => $row['user_role'] ?? null,
        'person_id' => !empty($row['person_id']) ? intval($row['person_id']) : null,
    ];
}

/**
 * Create an official_receipts row and generate a formatted O.R. number and QR string.
 * Returns array: [or_id, or_number, qr_string]
 */
function generateOfficialReceipt($conn, $person_id, $amount, $payment_method = 'Cash') {
    // Insert placeholder to reserve an auto-increment id
    $safe_method = $conn->real_escape_string($payment_method);
    $person_val = $person_id > 0 ? intval($person_id) : 'NULL';
    $amount_val = floatval($amount);
    $ins = "INSERT INTO official_receipts (or_number, payor_person_id, total_amount, payment_method) VALUES ('', $person_val, $amount_val, '$safe_method')";
    if (!$conn->query($ins)) {
        return [null, null, null];
    }
    $or_id = $conn->insert_id;
    // Format O.R. as OR-<YEAR>-<6-digit-id>
    $or_number = 'OR-' . date('Y') . '-' . str_pad($or_id, 6, '0', STR_PAD_LEFT);
    // Generate a short QR string token (not stored in DB by default)
    $qr_string = 'QR-' . $or_id . '-' . substr(md5(uniqid('', true)), 0, 8);
    $upd = "UPDATE official_receipts SET or_number = '$or_number' WHERE or_id = $or_id";
    $conn->query($upd);
    return [$or_id, $or_number, $qr_string];
}

if ($request_method === 'GET') {
    // Get financial records
    $type = isset($_GET['type']) ? $conn->real_escape_string($_GET['type']) : 'all';
    $requestingUserId = isset($_GET['user_id']) && intval($_GET['user_id']) > 0 ? intval($_GET['user_id']) : null;
    $userScope = getRequestingUserScope($conn, $requestingUserId);
    $isPersonScopedView = ($userScope['role'] === 'Person' && !empty($userScope['person_id']));
    $personScopeFilter = $isPersonScopedView ? "AND d.person_id = " . intval($userScope['person_id']) : "";
    $massIntentionsScopeFilter = $isPersonScopedView ? "WHERE m.person_id = " . intval($userScope['person_id']) : "";
    $lentenScopeFilter = $isPersonScopedView ? "AND l.person_id = " . intval($userScope['person_id']) : "";

    if ($type === 'categories') {
        // Fetch accounting categories for proper ledger categorization
        $query = "SELECT cat_id, cat_name, type FROM accounting_categories ORDER BY cat_name";
        $result = $conn->query($query);
        
        if (!$result) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]);
            exit();
        }

        $categories = [];
        while ($row = $result->fetch_assoc()) {
            $categories[] = $row;
        }

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'data' => $categories,
            'count' => count($categories)
        ]);
        exit();
    } elseif ($type === 'donations') {
        $query = "SELECT d.donation_id, d.person_id, d.donor_name, d.amount, d.donation_type, d.payment_method, d.payment_status,
                         d.or_number, d.reference_no, d.remarks, d.fee_id, d.received_by_user_id,
                         d.date_received as donation_date, d.ledger_id, COALESCE(f.trans_id, 0) as linked_ledger_id
                  FROM donations d
                  LEFT JOIN financial_ledger f ON d.ledger_id = f.trans_id
                  WHERE d.donation_type NOT IN ('Project Donation')
                  $personScopeFilter
                  ORDER BY d.date_received DESC";
    } elseif ($type === 'mass_intentions') {
        // Use the actual offered-by name when a person is not registered; fall back gracefully to the intention text.
        $query = "SELECT m.intention_id AS mass_intention_id,
                         m.person_id,
                         COALESCE(
                             TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))),
                             TRIM(m.offered_by),
                             TRIM(m.intention_names),
                             'Unknown'
                         ) AS person_name,
                         COALESCE(m.amount, 0) AS amount,
                         m.mass_date,
                         m.mass_time,
                         m.type AS status,
                         m.intention_names AS intention_description,
                         m.offered_by,
                         m.payment_status,
                         m.ledger_id
                  FROM mass_intentions m
                  LEFT JOIN persons p ON m.person_id = p.person_id
                  $massIntentionsScopeFilter
                  ORDER BY m.mass_date DESC";
    } elseif ($type === 'lenten_offerings') {
        $query = "SELECT l.lenten_offering_id, l.person_id, l.donor_name, l.amount, l.payment_method, l.payment_status, 
                         l.reference_no, l.remarks, l.or_number, l.offering_date, l.received_by_user_id, l.ledger_id, COALESCE(f.trans_id, 0) as linked_ledger_id
                  FROM lenten_offerings l
                  LEFT JOIN financial_ledger f ON l.ledger_id = f.trans_id
                  WHERE 1 = 1
                  $lentenScopeFilter
                  ORDER BY l.offering_date DESC";
    } elseif ($type === 'ledger') {
        if ($isPersonScopedView) {
            $query = "SELECT f.*, su.username FROM financial_ledger f
                      LEFT JOIN system_users su ON f.encoded_by = su.user_id
                      WHERE 1 = 0
                      ORDER BY f.trans_date DESC";
        } else {
            $dateFilter = '';
            if (isset($_GET['date']) && !empty($_GET['date'])) {
                $date = $conn->real_escape_string($_GET['date']);
                $dateFilter = "WHERE DATE(f.trans_date) = '$date'";
            }

            $query = "SELECT f.*, su.username FROM financial_ledger f
                      LEFT JOIN system_users su ON f.encoded_by = su.user_id
                      $dateFilter
                      ORDER BY f.trans_date DESC";
        }
    } else {
        if ($isPersonScopedView) {
            $query = "SELECT f.*, su.username FROM financial_ledger f
                      LEFT JOIN system_users su ON f.encoded_by = su.user_id
                      WHERE 1 = 0
                      ORDER BY f.trans_date DESC";
        } else {
            $query = "SELECT f.*, su.username FROM financial_ledger f
                      LEFT JOIN system_users su ON f.encoded_by = su.user_id
                      ORDER BY f.trans_date DESC";
        }
    }

    $result = $conn->query($query);

    if (!$result) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]);
        exit();
    }

    $records = [];
    while ($row = $result->fetch_assoc()) {
        $records[] = $row;
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $records,
        'count' => count($records)
    ]);

} elseif ($request_method === 'POST') {
    // Create financial record
    $data = json_decode(file_get_contents("php://input"), true);
    // allow client to supply user_id (fallback to session if available)
    $user_id = isset($data['user_id']) && intval($data['user_id']) > 0 ? intval($data['user_id']) : intval($_SESSION['user_id'] ?? 0);

    // Validate that the user_id actually exists in system_users table
    if ($user_id > 0) {
        $user_check = $conn->query("SELECT user_id FROM system_users WHERE user_id = $user_id");
        if (!$user_check || $user_check->num_rows === 0) {
            $user_id = 0; // Invalid user_id, reset to 0
        }
    }

    $record_type = isset($data['type']) ? $conn->real_escape_string($data['type']) : null;
    
    if (!$record_type) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Record type is required']);
        exit();
    }

    // Handle Donation
    if ($record_type === 'donation') {
        if (!isset($data['amount'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing amount for donation']);
            exit();
        }

        $person_id = isset($data['person_id']) && intval($data['person_id']) > 0 ? intval($data['person_id']) : null;
        $amount = floatval($data['amount']);
        $donation_type = $conn->real_escape_string($data['donation_type'] ?? 'Love Offering');
        $payment_method = $conn->real_escape_string($data['payment_method'] ?? 'Cash');
        $payment_status = $conn->real_escape_string($data['payment_status'] ?? 'Paid');
        $or_number = $conn->real_escape_string($data['or_number'] ?? '');
        $reference_no = $conn->real_escape_string($data['reference_no'] ?? '');
        $remarks = $conn->real_escape_string($data['remarks'] ?? '');
        $fee_id = isset($data['fee_id']) && intval($data['fee_id']) > 0 ? intval($data['fee_id']) : null;
        // Use submitted received_by_user_id if provided, otherwise fall back to session
        $received_by_user_id = isset($data['received_by_user_id']) && intval($data['received_by_user_id']) > 0 ? intval($data['received_by_user_id']) : intval($_SESSION['user_id'] ?? 0);
        $donation_date = $conn->real_escape_string($data['donation_date'] ?? date('Y-m-d'));
        $donor_name = trim((string)($data['donor_name'] ?? ''));

        if ($donor_name === '' && $person_id !== null) {
            $person_name_query = $conn->query("SELECT CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')) AS full_name FROM persons WHERE person_id = $person_id LIMIT 1");
            if ($person_name_query && $person_name_row = $person_name_query->fetch_assoc()) {
                $donor_name = trim($person_name_row['full_name']);
            }
        }

        if ($donor_name === '') {
            $donor_name = 'Anonymous';
        }
        
        // Set to NULL if user_id is not available
        $received_by_user_id_value = ($received_by_user_id > 0) ? $received_by_user_id : 'NULL';

        // START TRANSACTION to ensure donation and ledger stay in sync
        $conn->begin_transaction();
        try {
            // Prepare or_number and optional QR. If none provided, auto-generate.
            $or_id = null;
            $generated_qr = null;
            if (empty($or_number)) {
                list($gen_or_id, $gen_or_number, $gen_qr) = generateOfficialReceipt($conn, $person_id, $amount, $payment_method);
                if ($gen_or_id) {
                    $or_id = $gen_or_id;
                    $or_number = $gen_or_number;
                    $generated_qr = $gen_qr;
                }
            } else {
                $or_query = "INSERT INTO official_receipts (or_number, payor_person_id, total_amount, payment_method)
                            VALUES ('$or_number', $person_id, $amount, '$payment_method')
                            ON DUPLICATE KEY UPDATE total_amount = total_amount + $amount";
                if (!$conn->query($or_query)) {
                    throw new Exception('Failed to create official receipt: ' . $conn->error);
                }
                $or_id = $conn->insert_id;
            }

            // Insert donation record with payment_status and fee_id
            $fee_id_value = ($fee_id !== null) ? $fee_id : 'NULL';
            $person_id_value = ($person_id !== null) ? $person_id : 'NULL';
            $donor_name_value = $conn->real_escape_string($donor_name);
            $query = "INSERT INTO donations (person_id, donor_name, amount, donation_type, payment_method, payment_status, or_number, reference_no, remarks, received_by_user_id, fee_id)
                      VALUES ($person_id_value, '$donor_name_value', $amount, '$donation_type', '$payment_method', '$payment_status', " . ($or_number ? "'$or_number'" : "NULL") . ", " . ($reference_no ? "'$reference_no'" : "NULL") . ", " . ($remarks ? "'$remarks'" : "NULL") . ", $received_by_user_id_value, $fee_id_value)";

            if (!$conn->query($query)) {
                throw new Exception('Failed to create donation: ' . $conn->error);
            }
            $donation_id = $conn->insert_id;
            
            // Create corresponding financial ledger entry for Income tracking
            // Look up cat_id from accounting_categories based on donation_type
            $cat_query = "SELECT cat_id FROM accounting_categories WHERE cat_name = '$donation_type' OR cat_name = 'Donation' LIMIT 1";
            $cat_result = $conn->query($cat_query);
            $cat_id = null;
            if ($cat_result && $cat_row = $cat_result->fetch_assoc()) {
                $cat_id = $cat_row['cat_id'];
            }
            
            $ledger_user_id = ($user_id > 0) ? $user_id : 'NULL';
            $donation_source_name = $donor_name_value;
            
            $cat_id_value = ($cat_id !== null) ? $cat_id : 'NULL';
            $ledger_query = "INSERT INTO financial_ledger (trans_type, category, amount, trans_date, encoded_by, description, cat_id)
                            VALUES ('Income', '$donation_type', $amount, '$donation_date', $ledger_user_id, 'Donation from $donation_source_name - $donation_type', $cat_id_value)";
            
            if (!$conn->query($ledger_query)) {
                throw new Exception('Failed to create ledger entry: ' . $conn->error);
            }
            $ledger_id = $conn->insert_id;
            
            // Link donation to ledger entry
            $update_query = "UPDATE donations SET ledger_id = $ledger_id WHERE donation_id = $donation_id";
            if (!$conn->query($update_query)) {
                throw new Exception('Failed to link donation to ledger: ' . $conn->error);
            }
            
            // If reference_no not provided, generate after donation insert
            if (empty($reference_no)) {
                $reference_no = 'REF-' . date('Ymd') . '-' . str_pad($donation_id, 6, '0', STR_PAD_LEFT);
                $conn->query("UPDATE donations SET reference_no = '$reference_no' WHERE donation_id = $donation_id");
            }

            // COMMIT transaction
            $conn->commit();
            
            logAuditAction($_SESSION['user_id'] ?? 0, 'CREATE', 'donations', "Added donation: $donation_type - Amount: $amount - Status: $payment_status from person_id: $person_id" . ($or_number ? " - OR: $or_number" : ""), $conn);
            
            // Fetch the complete donation record to return to frontend
            $fetch_query = "SELECT donation_id, person_id, donor_name, amount, donation_type, payment_method, payment_status, or_number, reference_no, remarks, fee_id, received_by_user_id, date_received as donation_date, ledger_id FROM donations WHERE donation_id = $donation_id";
            $fetch_result = $conn->query($fetch_query);
            $donation_data = $fetch_result ? $fetch_result->fetch_assoc() : null;
            
            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'Donation created successfully',
                'donation_id' => $donation_id,
                'ledger_id' => $ledger_id,
                'or_id' => $or_id,
                'or_number' => $or_number,
                'reference_no' => $reference_no,
                'qr_string' => $generated_qr,
                'data' => $donation_data
            ]);
        } catch (Exception $e) {
            // ROLLBACK on any error
            $conn->rollback();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to create donation: ' . $e->getMessage()]);
        }
    }
    // Handle Mass Intention
    elseif ($record_type === 'mass_intention') {
        if (!isset($data['amount'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing amount for mass intention']);
            exit();
        }

        $person_id = isset($data['person_id']) && intval($data['person_id']) > 0 ? intval($data['person_id']) : null;
        $amount = floatval($data['amount']);
        $mass_date = $conn->real_escape_string($data['mass_date'] ?? date('Y-m-d'));
        $mass_time = $conn->real_escape_string($data['mass_time'] ?? null);
        $person_name_input = trim((string)($data['person_name'] ?? $data['donor_name'] ?? ''));
        // Prefer explicit intention description; if empty, fall back to person_name (sent from frontend)
        $intention_names_raw = $data['intention_description'] ?? $person_name_input;
        $intention_names = $conn->real_escape_string($intention_names_raw);
        $person_full_name = $person_name_input;
        if ($person_full_name === '' && $person_id !== null) {
            $person_name_query = $conn->query("SELECT CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')) AS full_name FROM persons WHERE person_id = $person_id LIMIT 1");
            if ($person_name_query && $person_name_row = $person_name_query->fetch_assoc()) {
                $person_full_name = trim($person_name_row['full_name']);
            }
        }
        if ($person_full_name === '') {
            $person_full_name = 'Unknown';
        }
        $mass_type = $conn->real_escape_string($data['status'] ?? 'Soul');
        $offered_by = trim((string)($data['offered_by'] ?? $person_full_name ?? 'Parishioner'));
        if ($offered_by === '') {
            $offered_by = 'Parishioner';
        }
        $offered_by = $conn->real_escape_string($offered_by);

        // START TRANSACTION to ensure mass intention and ledger stay in sync
        $conn->begin_transaction();
        try {
            // Store amount directly in mass_intentions for data consistency
            $person_id_value = ($person_id !== null) ? $person_id : 'NULL';
            $query = "INSERT INTO mass_intentions (person_id, mass_date, mass_time, type, offered_by, intention_names, amount, is_paid, payment_status)
                      VALUES ($person_id_value, '$mass_date', " . ($mass_time ? "'$mass_time'" : "NULL") . ", '$mass_type', '$offered_by', '$intention_names', $amount, 1, 'Paid')";

            if (!$conn->query($query)) {
                throw new Exception('Failed to create mass intention: ' . $conn->error);
            }
            $intention_id = $conn->insert_id;
            
            // Create ledger entry for the mass intention payment
            $ledger_user_id = ($user_id > 0) ? $user_id : 'NULL';
            
            // Look up cat_id from accounting_categories
            $cat_query = "SELECT cat_id FROM accounting_categories WHERE cat_name = 'Mass Intention Fee' OR cat_name = 'Mass Intention' LIMIT 1";
            $cat_result = $conn->query($cat_query);
            $cat_id = null;
            if ($cat_result && $cat_row = $cat_result->fetch_assoc()) {
                $cat_id = $cat_row['cat_id'];
            }
            
            $cat_id_value = ($cat_id !== null) ? $cat_id : 'NULL';
            $ledger_query = "INSERT INTO financial_ledger (trans_type, category, amount, trans_date, encoded_by, description, cat_id)
                            VALUES ('Income', 'Mass Intention Fee', $amount, '$mass_date', $ledger_user_id, 'Mass intention for $intention_names by $person_full_name', $cat_id_value)";
            
            if (!$conn->query($ledger_query)) {
                throw new Exception('Failed to create ledger entry: ' . $conn->error);
            }
            $ledger_id = $conn->insert_id;
            
            // Update mass intention with ledger_id
            $update_query = "UPDATE mass_intentions SET ledger_id = $ledger_id WHERE intention_id = $intention_id";
            if (!$conn->query($update_query)) {
                throw new Exception('Failed to link mass intention to ledger: ' . $conn->error);
            }
            
            // COMMIT transaction
            $conn->commit();
            
            logAuditAction($_SESSION['user_id'] ?? 0, 'CREATE', 'mass_intentions', "Added mass intention: $intention_names - Amount: $amount from person_id: $person_id", $conn);
            
            // Fetch the complete mass intention record to return to frontend
            $fetch_query = "SELECT intention_id AS mass_intention_id,
                                  person_id,
                                  amount,
                                  mass_date,
                                  mass_time,
                                  type AS status,
                                  intention_names AS intention_description,
                                  offered_by,
                                  COALESCE(
                                      TRIM(CONCAT(COALESCE((SELECT first_name FROM persons WHERE person_id = mass_intentions.person_id), ''), ' ', COALESCE((SELECT last_name FROM persons WHERE person_id = mass_intentions.person_id), ''))),
                                      TRIM(offered_by),
                                      TRIM(intention_names),
                                      'Unknown'
                                  ) AS person_name,
                                  payment_status,
                                  ledger_id
                           FROM mass_intentions WHERE intention_id = $intention_id";
            $fetch_result = $conn->query($fetch_query);
            $mass_intention_data = $fetch_result ? $fetch_result->fetch_assoc() : null;
            
            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'Mass intention created successfully',
                'mass_intention_id' => $intention_id,
                'ledger_id' => $ledger_id,
                'data' => $mass_intention_data
            ]);
        } catch (Exception $e) {
            // ROLLBACK on any error
            $conn->rollback();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to create mass intention: ' . $e->getMessage()]);
        }
    }
    // Handle Lenten Offering - stored as Donation with special type
    elseif ($record_type === 'lenten_offering') {
        if (!isset($data['amount'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing amount for lenten offering']);
            exit();
        }

        $person_id = isset($data['person_id']) && intval($data['person_id']) > 0 ? intval($data['person_id']) : null;
        $amount = floatval($data['amount']);
        $payment_method = $conn->real_escape_string($data['payment_method'] ?? 'Cash');
        $payment_status = $conn->real_escape_string($data['payment_status'] ?? 'Paid');
        $reference_no = $conn->real_escape_string($data['reference_no'] ?? '');
        $remarks = $conn->real_escape_string($data['remarks'] ?? '');
        $or_number = $conn->real_escape_string($data['or_number'] ?? '');
        $offering_date = $conn->real_escape_string($data['offering_date'] ?? date('Y-m-d'));
        $donor_name = trim((string)($data['donor_name'] ?? ''));

        if ($donor_name === '' && $person_id !== null) {
            $person_name_query = $conn->query("SELECT CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')) AS full_name FROM persons WHERE person_id = $person_id LIMIT 1");
            if ($person_name_query && $person_name_row = $person_name_query->fetch_assoc()) {
                $donor_name = trim($person_name_row['full_name']);
            }
        }

        if ($donor_name === '') {
            $donor_name = 'Anonymous';
        }
        
        // Use submitted received_by_user_id if provided, otherwise fall back to session
        $received_by_user_id = isset($data['received_by_user_id']) && intval($data['received_by_user_id']) > 0 ? intval($data['received_by_user_id']) : intval($_SESSION['user_id'] ?? 0);
        
        // Set to NULL if user_id is not available
        $received_by_user_id_value = ($received_by_user_id > 0) ? $received_by_user_id : 'NULL';

        // START TRANSACTION to ensure lenten offering and ledger stay in sync
        $conn->begin_transaction();
        try {
            // If OR not provided, create official receipt first
            $generated_qr = null;
            if (empty($or_number)) {
                list($gen_or_id, $gen_or_number, $gen_qr) = generateOfficialReceipt($conn, $person_id, $amount, $payment_method);
                if ($gen_or_id) {
                    $or_number = $gen_or_number;
                    $generated_qr = $gen_qr;
                }
            }

            $person_id_value = ($person_id !== null) ? $person_id : 'NULL';
            $donor_name_value = $conn->real_escape_string($donor_name);
            $query = "INSERT INTO lenten_offerings (person_id, donor_name, amount, payment_method, payment_status, reference_no, remarks, or_number, received_by_user_id)
                      VALUES ($person_id_value, '$donor_name_value', $amount, '$payment_method', '$payment_status', " . ($reference_no ? "'$reference_no'" : "NULL") . ", " . ($remarks ? "'$remarks'" : "NULL") . ", " . ($or_number ? "'$or_number'" : "NULL") . ", $received_by_user_id_value)";

            if (!$conn->query($query)) {
                throw new Exception('Failed to create lenten offering: ' . $conn->error);
            }
            $lenten_offering_id = $conn->insert_id;
            
            // Create corresponding financial ledger entry for Income tracking
            $ledger_user_id = ($received_by_user_id > 0) ? $received_by_user_id : 'NULL';
            
            // Look up cat_id from accounting_categories
            $cat_query = "SELECT cat_id FROM accounting_categories WHERE cat_name = 'Lenten Offering' OR cat_name = 'Project Donation' LIMIT 1";
            $cat_result = $conn->query($cat_query);
            $cat_id = null;
            if ($cat_result && $cat_row = $cat_result->fetch_assoc()) {
                $cat_id = $cat_row['cat_id'];
            }
            
            $cat_id_value = ($cat_id !== null) ? $cat_id : 'NULL';
            $ledger_query = "INSERT INTO financial_ledger (trans_type, category, amount, trans_date, encoded_by, description, cat_id)
                            VALUES ('Income', 'Lenten Offering', $amount, '$offering_date', $ledger_user_id, 'Lenten offering from $donor_name_value', $cat_id_value)";
            
            if (!$conn->query($ledger_query)) {
                throw new Exception('Failed to create ledger entry: ' . $conn->error);
            }
            $ledger_id = $conn->insert_id;
            
            // Link lenten offering to ledger entry
            $update_query = "UPDATE lenten_offerings SET ledger_id = $ledger_id WHERE lenten_offering_id = $lenten_offering_id";
            if (!$conn->query($update_query)) {
                throw new Exception('Failed to link lenten offering to ledger: ' . $conn->error);
            }
            
            // If reference_no not provided, generate using offering id
            if (empty($reference_no)) {
                $reference_no = 'REF-' . date('Ymd') . '-' . str_pad($lenten_offering_id, 6, '0', STR_PAD_LEFT);
                $conn->query("UPDATE lenten_offerings SET reference_no = '$reference_no' WHERE lenten_offering_id = $lenten_offering_id");
            }

            // COMMIT transaction
            $conn->commit();
            
            logAuditAction($_SESSION['user_id'] ?? 0, 'CREATE', 'lenten_offerings', "Added lenten offering: Amount: $amount from person_id: $person_id", $conn);
            
            // Fetch the complete lenten offering record to return to frontend
            $fetch_query = "SELECT lenten_offering_id, person_id, amount, payment_method, payment_status, reference_no, remarks, or_number, offering_date, received_by_user_id, ledger_id FROM lenten_offerings WHERE lenten_offering_id = $lenten_offering_id";
            $fetch_result = $conn->query($fetch_query);
            $lenten_offering_data = $fetch_result ? $fetch_result->fetch_assoc() : null;
            
            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'Lenten offering created successfully',
                'lenten_offering_id' => $lenten_offering_id,
                'ledger_id' => $ledger_id,
                'or_number' => $or_number,
                'reference_no' => $reference_no,
                'qr_string' => $generated_qr,
                'data' => $lenten_offering_data
            ]);
        } catch (Exception $e) {
            // ROLLBACK on any error
            $conn->rollback();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to create lenten offering: ' . $e->getMessage()]);
        }
    }
    else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid record type']);
    }

} elseif ($request_method === 'PUT') {
    // Update financial record
    $data = json_decode(file_get_contents("php://input"), true);
    $record_type = isset($data['type']) ? $conn->real_escape_string($data['type']) : null;
    
    if (!$record_type) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Record type is required']);
        exit();
    }

    // Handle Donation Update
    if ($record_type === 'donation') {
        if (!isset($data['donation_id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing donation_id']);
            exit();
        }

        $donation_id = intval($data['donation_id']);
        $amount = isset($data['amount']) ? floatval($data['amount']) : null;
        $donation_type = isset($data['donation_type']) ? $conn->real_escape_string($data['donation_type']) : null;
        $payment_method = isset($data['payment_method']) ? $conn->real_escape_string($data['payment_method']) : null;
        $payment_status = isset($data['payment_status']) ? $conn->real_escape_string($data['payment_status']) : null;
        $or_number = isset($data['or_number']) ? $conn->real_escape_string($data['or_number']) : null;
        $reference_no = isset($data['reference_no']) ? $conn->real_escape_string($data['reference_no']) : null;
        $remarks = isset($data['remarks']) ? $conn->real_escape_string($data['remarks']) : null;
        $fee_id = isset($data['fee_id']) && intval($data['fee_id']) > 0 ? intval($data['fee_id']) : null;
        $received_by_user_id = isset($data['received_by_user_id']) && intval($data['received_by_user_id']) > 0 ? intval($data['received_by_user_id']) : null;
        $donation_date = isset($data['donation_date']) ? $conn->real_escape_string($data['donation_date']) : null;

        $updates = [];
        if ($amount !== null) $updates[] = "amount = $amount";
        if ($donation_type !== null) $updates[] = "donation_type = '$donation_type'";
        if ($payment_method !== null) $updates[] = "payment_method = '$payment_method'";
        if ($payment_status !== null) $updates[] = "payment_status = '$payment_status'";
        if ($or_number !== null) $updates[] = "or_number = '$or_number'";
        if ($reference_no !== null) $updates[] = "reference_no = '$reference_no'";
        if ($remarks !== null) $updates[] = "remarks = '$remarks'";
        if ($fee_id !== null) $updates[] = "fee_id = $fee_id";
        if ($received_by_user_id !== null) $updates[] = "received_by_user_id = $received_by_user_id";
        if ($donation_date !== null) $updates[] = "date_received = '$donation_date'";

        if (empty($updates)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'No fields to update']);
            exit();
        }

        $query = "UPDATE donations SET " . implode(', ', $updates) . " WHERE donation_id = $donation_id";

        if ($conn->query($query)) {
            // Update ledger if amount changed
            if ($amount !== null) {
                $ledger_check = $conn->query("SELECT ledger_id FROM donations WHERE donation_id = $donation_id");
                $donation_row = $ledger_check->fetch_assoc();
                $ledger_id = $donation_row['ledger_id'] ?? null;
                if ($ledger_id) {
                    $ledger_update = "UPDATE financial_ledger SET amount = $amount WHERE trans_id = $ledger_id";
                    $conn->query($ledger_update);
                }
            }

            logAuditAction($_SESSION['user_id'] ?? 0, 'UPDATE', 'donations', "Updated donation ID: $donation_id", $conn);
            http_response_code(200);
            echo json_encode(['success' => true, 'message' => 'Donation updated successfully']);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to update donation: ' . $conn->error]);
        }
    }
    // Handle Mass Intention Update
    elseif ($record_type === 'mass_intention') {
        if (!isset($data['mass_intention_id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing mass_intention_id']);
            exit();
        }

        $intention_id = intval($data['mass_intention_id']);
        $amount = isset($data['amount']) ? floatval($data['amount']) : null;
        $mass_date = isset($data['mass_date']) ? $conn->real_escape_string($data['mass_date']) : null;
        $mass_time = isset($data['mass_time']) ? $conn->real_escape_string($data['mass_time']) : null;
        $intention_names = isset($data['intention_description']) ? $conn->real_escape_string($data['intention_description']) : null;
        $mass_type = isset($data['status']) ? $conn->real_escape_string($data['status']) : null;
        $payment_status = isset($data['payment_status']) ? $conn->real_escape_string($data['payment_status']) : null;

        $updates = [];
        if ($amount !== null) $updates[] = "amount = $amount";
        if ($mass_date !== null) $updates[] = "mass_date = '$mass_date'";
        if ($mass_time !== null) $updates[] = "mass_time = '$mass_time'";
        if ($intention_names !== null) $updates[] = "intention_names = '$intention_names'";
        if ($mass_type !== null) $updates[] = "type = '$mass_type'";
        if ($payment_status !== null) $updates[] = "payment_status = '$payment_status'";

        if (empty($updates)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'No fields to update']);
            exit();
        }

        $query = "UPDATE mass_intentions SET " . implode(', ', $updates) . " WHERE intention_id = $intention_id";

        if ($conn->query($query)) {
            // Update ledger if amount changed
            if ($amount !== null) {
                $ledger_check = $conn->query("SELECT ledger_id FROM mass_intentions WHERE intention_id = $intention_id");
                $intention_row = $ledger_check->fetch_assoc();
                $ledger_id = $intention_row['ledger_id'] ?? null;
                if ($ledger_id) {
                    $ledger_update = "UPDATE financial_ledger SET amount = $amount WHERE trans_id = $ledger_id";
                    $conn->query($ledger_update);
                }
            }

            logAuditAction($_SESSION['user_id'] ?? 0, 'UPDATE', 'mass_intentions', "Updated mass intention ID: $intention_id", $conn);
            http_response_code(200);
            echo json_encode(['success' => true, 'message' => 'Mass intention updated successfully']);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to update mass intention: ' . $conn->error]);
        }
    }
    // Handle Lenten Offering Update
    elseif ($record_type === 'lenten_offering') {
        if (!isset($data['lenten_offering_id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing lenten_offering_id']);
            exit();
        }

        $offering_id = intval($data['lenten_offering_id']);
        $amount = isset($data['amount']) ? floatval($data['amount']) : null;
        $payment_method = isset($data['payment_method']) ? $conn->real_escape_string($data['payment_method']) : null;
        $payment_status = isset($data['payment_status']) ? $conn->real_escape_string($data['payment_status']) : null;
        $or_number = isset($data['or_number']) ? $conn->real_escape_string($data['or_number']) : null;
        $reference_no = isset($data['reference_no']) ? $conn->real_escape_string($data['reference_no']) : null;
        $remarks = isset($data['remarks']) ? $conn->real_escape_string($data['remarks']) : null;
        $received_by_user_id = isset($data['received_by_user_id']) && intval($data['received_by_user_id']) > 0 ? intval($data['received_by_user_id']) : null;
        $offering_date = isset($data['offering_date']) ? $conn->real_escape_string($data['offering_date']) : null;

        $updates = [];
        if ($amount !== null) $updates[] = "amount = $amount";
        if ($payment_method !== null) $updates[] = "payment_method = '$payment_method'";
        if ($payment_status !== null) $updates[] = "payment_status = '$payment_status'";
        if ($or_number !== null) $updates[] = "or_number = '$or_number'";
        if ($reference_no !== null) $updates[] = "reference_no = '$reference_no'";
        if ($remarks !== null) $updates[] = "remarks = '$remarks'";
        if ($received_by_user_id !== null) $updates[] = "received_by_user_id = $received_by_user_id";
        if ($offering_date !== null) $updates[] = "offering_date = '$offering_date'";

        if (empty($updates)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'No fields to update']);
            exit();
        }

        $query = "UPDATE lenten_offerings SET " . implode(', ', $updates) . " WHERE lenten_offering_id = $offering_id";

        if ($conn->query($query)) {
            // Update ledger if amount changed
            if ($amount !== null) {
                $ledger_check = $conn->query("SELECT ledger_id FROM lenten_offerings WHERE lenten_offering_id = $offering_id");
                $offering_row = $ledger_check->fetch_assoc();
                $ledger_id = $offering_row['ledger_id'] ?? null;
                if ($ledger_id) {
                    $ledger_update = "UPDATE financial_ledger SET amount = $amount WHERE trans_id = $ledger_id";
                    $conn->query($ledger_update);
                }
            }

            logAuditAction($_SESSION['user_id'] ?? 0, 'UPDATE', 'lenten_offerings', "Updated lenten offering ID: $offering_id", $conn);
            http_response_code(200);
            echo json_encode(['success' => true, 'message' => 'Lenten offering updated successfully']);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to update lenten offering: ' . $conn->error]);
        }
    }
    else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid record type']);
    }

} elseif ($request_method === 'DELETE') {
    // Delete record
    $id = isset($_GET['id']) ? intval($_GET['id']) : null;
    $type = isset($_GET['type']) ? $conn->real_escape_string($_GET['type']) : null;

    if (!$id || !$type) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing id or type parameter']);
        exit();
    }

    if ($type === 'donation') {
        // First, get the ledger_id if it exists
        $ledger_check = $conn->query("SELECT ledger_id FROM donations WHERE donation_id = $id");
        $donation_row = $ledger_check->fetch_assoc();
        $ledger_id = $donation_row['ledger_id'] ?? null;
        
        // Delete the donation
        $query = "DELETE FROM donations WHERE donation_id = $id";
        $table = 'donations';
        
        // If there's a linked ledger entry, delete it too
        if ($ledger_id) {
            $conn->query("DELETE FROM financial_ledger WHERE trans_id = $ledger_id");
        }
    } elseif ($type === 'lenten_offering') {
        // First, get the ledger_id if it exists
        $ledger_check = $conn->query("SELECT ledger_id FROM lenten_offerings WHERE lenten_offering_id = $id");
        $offering_row = $ledger_check->fetch_assoc();
        $ledger_id = $offering_row['ledger_id'] ?? null;
        
        // Delete the lenten offering
        $query = "DELETE FROM lenten_offerings WHERE lenten_offering_id = $id";
        $table = 'lenten_offerings';
        
        // If there's a linked ledger entry, delete it too
        if ($ledger_id) {
            $conn->query("DELETE FROM financial_ledger WHERE trans_id = $ledger_id");
        }
    } elseif ($type === 'mass_intention') {
        // First, get the ledger_id if it exists
        $ledger_check = $conn->query("SELECT ledger_id FROM mass_intentions WHERE intention_id = $id");
        $intention_row = $ledger_check->fetch_assoc();
        $ledger_id = $intention_row['ledger_id'] ?? null;
        
        $query = "DELETE FROM mass_intentions WHERE intention_id = $id";
        $table = 'mass_intentions';
        
        // If there's a linked ledger entry, delete it too
        if ($ledger_id) {
            $conn->query("DELETE FROM financial_ledger WHERE trans_id = $ledger_id");
        }
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid record type']);
        exit();
    }

    if ($conn->query($query) === TRUE) {
        logAuditAction($_SESSION['user_id'] ?? 0, 'DELETE', $table, "Deleted $type record with id: $id", $conn);
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => ucfirst(str_replace('_', ' ', $type)) . ' deleted successfully'
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete record: ' . $conn->error]);
    }
}

$conn->close();
?>
