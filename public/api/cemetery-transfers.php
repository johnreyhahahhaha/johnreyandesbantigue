<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once 'config.php';
require_once 'permissions.php';
require_once 'audit.php';

if (!$conn) {
    http_response_code(500);
    exit(json_encode(['success' => false, 'message' => 'Database connection not available']));
}

$user_id = intval($_SESSION['user_id'] ?? 0);
$request_method = $_SERVER['REQUEST_METHOD'];

if ($request_method === 'GET') {
    $query = "SELECT ct.*, cc.contract_type, cc.status AS contract_status,
                     p.first_name, p.last_name,
                     os.block_name AS original_block, os.niche_number AS original_niche,
                     ds.block_name AS destination_block, ds.niche_number AS destination_niche,
                     rq.username AS requested_by_username, ap.username AS approved_by_username
              FROM cemetery_transfers ct
              LEFT JOIN cemetery_contracts cc ON cc.contract_id = ct.contract_id
              LEFT JOIN persons p ON p.person_id = ct.deceased_id
              LEFT JOIN cemetery_structures os ON os.struct_id = ct.original_struct_id
              LEFT JOIN cemetery_structures ds ON ds.struct_id = ct.destination_struct_id
              LEFT JOIN system_users rq ON rq.user_id = ct.requested_by
              LEFT JOIN system_users ap ON ap.user_id = ct.approved_by
              ORDER BY ct.requested_at DESC";
    $result = $conn->query($query);
    if (!$result) {
        http_response_code(500);
        exit(json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]));
    }

    $data = [];
    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }
    echo json_encode(['success' => true, 'data' => $data, 'count' => count($data)]);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    http_response_code(400);
    exit(json_encode(['success' => false, 'message' => 'Invalid request body']));
}

if ($request_method === 'POST') {
    $contract_id = intval($input['contract_id'] ?? 0);
    $destination_struct_id = intval($input['destination_struct_id'] ?? 0);
    $destination_location = trim($input['destination_location'] ?? '');
    $reason = $conn->real_escape_string($input['reason'] ?? 'Expired Lease');
    $notes = $conn->real_escape_string($input['notes'] ?? '');

    if ($contract_id <= 0 || ($destination_struct_id <= 0 && $destination_location === '')) {
        http_response_code(400);
        exit(json_encode(['success' => false, 'message' => 'A contract and destination are required']));
    }

    $contract_result = $conn->query("SELECT contract_id, deceased_id, struct_id, status FROM cemetery_contracts WHERE contract_id = $contract_id AND is_archived = 0 LIMIT 1");
    $contract = $contract_result ? $contract_result->fetch_assoc() : null;
    if (!$contract) {
        http_response_code(404);
        exit(json_encode(['success' => false, 'message' => 'Contract not found']));
    }
    if (!in_array($contract['status'], ['For Transfer', 'Expired'], true)) {
        http_response_code(409);
        exit(json_encode(['success' => false, 'message' => 'Only expired or transfer-review contracts can be transferred']));
    }

    if ($destination_struct_id > 0) {
        $destination_result = $conn->query("SELECT struct_id, status FROM cemetery_structures WHERE struct_id = $destination_struct_id LIMIT 1");
        $destination = $destination_result ? $destination_result->fetch_assoc() : null;
        if (!$destination) {
            http_response_code(404);
            exit(json_encode(['success' => false, 'message' => 'Destination structure not found']));
        }
        if ($destination['status'] !== 'Vacant') {
            http_response_code(409);
            exit(json_encode(['success' => false, 'message' => 'Destination structure is not vacant']));
        }
    }

    $duplicate = $conn->query("SELECT transfer_id FROM cemetery_transfers WHERE contract_id = $contract_id AND status IN ('Pending', 'Approved') LIMIT 1");
    if ($duplicate && $duplicate->num_rows > 0) {
        http_response_code(409);
        exit(json_encode(['success' => false, 'message' => 'An active transfer request already exists for this contract']));
    }

    $deceased_id = $contract['deceased_id'] ? (int)$contract['deceased_id'] : 'NULL';
    $original_struct_id = $contract['struct_id'] ? (int)$contract['struct_id'] : 'NULL';
    $destination_struct_value = $destination_struct_id > 0 ? $destination_struct_id : 'NULL';
    $destination_location_sql = $destination_location !== '' ? "'" . $conn->real_escape_string($destination_location) . "'" : 'NULL';
    $requested_by = $user_id > 0 ? $user_id : 'NULL';

    $query = "INSERT INTO cemetery_transfers
              (contract_id, deceased_id, original_struct_id, destination_struct_id, destination_location, reason, requested_by, notes)
              VALUES ($contract_id, $deceased_id, $original_struct_id, $destination_struct_value, $destination_location_sql, '$reason', $requested_by, '$notes')";
    if (!$conn->query($query)) {
        http_response_code(500);
        exit(json_encode(['success' => false, 'message' => 'Failed to create transfer request: ' . $conn->error]));
    }

    logAuditAction($user_id, 'CREATE', 'cemetery_transfers', "Created transfer request for contract ID: $contract_id", $conn);
    http_response_code(201);
    echo json_encode(['success' => true, 'message' => 'Transfer request created', 'transfer_id' => $conn->insert_id]);
    exit();
}

if ($request_method === 'PUT') {
    $transfer_id = intval($input['transfer_id'] ?? 0);
    $next_status = $input['status'] ?? '';
    if ($transfer_id <= 0 || !in_array($next_status, ['Approved', 'Completed', 'Rejected'], true)) {
        http_response_code(400);
        exit(json_encode(['success' => false, 'message' => 'Valid transfer_id and status are required']));
    }

    $conn->begin_transaction();
    try {
        $transfer_result = $conn->query("SELECT * FROM cemetery_transfers WHERE transfer_id = $transfer_id FOR UPDATE");
        $transfer = $transfer_result ? $transfer_result->fetch_assoc() : null;
        if (!$transfer) {
            throw new Exception('Transfer request not found');
        }
        if ($next_status === 'Approved' && $transfer['status'] !== 'Pending') {
            throw new Exception('Only pending requests can be approved');
        }
        if ($next_status === 'Rejected' && !in_array($transfer['status'], ['Pending', 'Approved'], true)) {
            throw new Exception('This transfer request can no longer be rejected');
        }
        if ($next_status === 'Completed' && $transfer['status'] !== 'Approved') {
            throw new Exception('Only approved requests can be completed');
        }

        if ($next_status === 'Completed') {
            if (!$transfer['destination_struct_id'] && !$transfer['destination_location']) {
                throw new Exception('A destination is required before completion');
            }
            if ($transfer['destination_struct_id']) {
                $destination_id = (int)$transfer['destination_struct_id'];
                $destination_result = $conn->query("SELECT status FROM cemetery_structures WHERE struct_id = $destination_id FOR UPDATE");
                $destination = $destination_result ? $destination_result->fetch_assoc() : null;
                if (!$destination || $destination['status'] !== 'Vacant') {
                    throw new Exception('Destination structure is no longer vacant');
                }
                $conn->query("UPDATE cemetery_structures SET status = 'Occupied', current_occupant_id = " . ($transfer['deceased_id'] ?: 'NULL') . " WHERE struct_id = $destination_id");
            }
            if ($transfer['original_struct_id']) {
                $original_id = (int)$transfer['original_struct_id'];
                $conn->query("UPDATE cemetery_structures SET status = 'Vacant', current_occupant_id = NULL WHERE struct_id = $original_id");
            }
            $contract_id = (int)$transfer['contract_id'];
            $destination_contract = $transfer['destination_struct_id'] ? (int)$transfer['destination_struct_id'] : 'NULL';
            $conn->query("UPDATE cemetery_contracts SET status = 'Transferred', struct_id = $destination_contract WHERE contract_id = $contract_id");
        }

        $approved_fields = $next_status === 'Approved' ? ", approved_by = " . ($user_id > 0 ? $user_id : 'NULL') . ", approved_at = NOW()" : '';
        $completed_fields = $next_status === 'Completed' ? ', completed_at = NOW()' : '';
        $conn->query("UPDATE cemetery_transfers SET status = '$next_status'$approved_fields$completed_fields WHERE transfer_id = $transfer_id");
        if ($conn->errno) {
            throw new Exception('Failed to update transfer request: ' . $conn->error);
        }
        $conn->commit();
        logAuditAction($user_id, 'UPDATE', 'cemetery_transfers', "Transfer ID $transfer_id changed to $next_status", $conn);
        echo json_encode(['success' => true, 'message' => "Transfer request $next_status"]);
    } catch (Exception $e) {
        $conn->rollback();
        http_response_code($e->getMessage() === 'Transfer request not found' ? 404 : 409);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit();
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed']);
