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
    // Get financial records
    $type = isset($_GET['type']) ? $conn->real_escape_string($_GET['type']) : 'all';

    if ($type === 'donations') {
        $query = "SELECT d.donation_id, d.person_id, d.amount, d.donation_type, d.date_received as donation_date, '' as remarks
                  FROM donations d
                  WHERE d.donation_type NOT IN ('Project Donation')
                  ORDER BY d.date_received DESC";
    } elseif ($type === 'mass_intentions') {
        $query = "SELECT m.intention_id as mass_intention_id, 0 as person_id, 0 as amount, m.mass_date, m.type as status, m.intention_names as intention_description
                  FROM mass_intentions m
                  ORDER BY m.mass_date DESC";
    } elseif ($type === 'lenten_offerings') {
        $query = "SELECT d.donation_id as lenten_offering_id, d.person_id, d.amount, d.date_received as offering_date, '' as remarks
                  FROM donations d
                  WHERE d.donation_type = 'Project Donation'
                  ORDER BY d.date_received DESC";
    } elseif ($type === 'ledger') {
        $query = "SELECT f.*, su.username FROM financial_ledger f
                  LEFT JOIN system_users su ON f.encoded_by = su.user_id
                  ORDER BY f.trans_date DESC";
    } else {
        $query = "SELECT f.*, su.username FROM financial_ledger f
                  LEFT JOIN system_users su ON f.encoded_by = su.user_id
                  ORDER BY f.trans_date DESC";
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
    $record_type = isset($data['type']) ? $conn->real_escape_string($data['type']) : null;
    
    if (!$record_type) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Record type is required']);
        exit();
    }

    // Handle Donation
    if ($record_type === 'donation') {
        if (!isset($data['person_id']) || !isset($data['amount'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing required fields for donation']);
            exit();
        }

        $person_id = intval($data['person_id']);
        $amount = floatval($data['amount']);
        $donation_type = $conn->real_escape_string($data['donation_type'] ?? 'Love Offering');
        $remarks = $conn->real_escape_string($data['remarks'] ?? '');
        $received_by_user_id = intval($_SESSION['user_id'] ?? 0);
        
        // Set to NULL if user_id is not available
        $received_by_user_id_value = ($received_by_user_id > 0) ? $received_by_user_id : 'NULL';

        $query = "INSERT INTO donations (person_id, donor_name, amount, donation_type, received_by_user_id)
                  VALUES ($person_id, 'Donor', $amount, '$donation_type', $received_by_user_id_value)";

        if ($conn->query($query) === TRUE) {
            $donation_id = $conn->insert_id;
            logAuditAction($_SESSION['user_id'] ?? 0, 'CREATE', 'donations', "Added donation: $donation_type - Amount: $amount from person_id: $person_id", $conn);
            
            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'Donation created successfully',
                'donation_id' => $donation_id
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to create donation: ' . $conn->error]);
        }
    }
    // Handle Mass Intention
    elseif ($record_type === 'mass_intention') {
        if (!isset($data['person_id']) || !isset($data['amount'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing required fields for mass intention']);
            exit();
        }

        $person_id = intval($data['person_id']);
        $amount = floatval($data['amount']);
        $mass_date = $conn->real_escape_string($data['mass_date'] ?? date('Y-m-d'));
        $intention_names = $conn->real_escape_string($data['intention_description'] ?? '');
        $mass_type = $conn->real_escape_string($data['status'] ?? 'Soul');
        $offered_by = 'Parishioner';

        $query = "INSERT INTO mass_intentions (mass_date, type, offered_by, intention_names, is_paid)
                  VALUES ('$mass_date', '$mass_type', '$offered_by', '$intention_names', 1)";

        if ($conn->query($query) === TRUE) {
            $intention_id = $conn->insert_id;
            logAuditAction($_SESSION['user_id'] ?? 0, 'CREATE', 'mass_intentions', "Added mass intention: $intention_names - Amount: $amount from person_id: $person_id", $conn);
            
            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'Mass intention created successfully',
                'mass_intention_id' => $intention_id
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to create mass intention: ' . $conn->error]);
        }
    }
    // Handle Lenten Offering - stored as Donation with special type
    elseif ($record_type === 'lenten_offering') {
        if (!isset($data['person_id']) || !isset($data['amount'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing required fields for lenten offering']);
            exit();
        }

        $person_id = intval($data['person_id']);
        $amount = floatval($data['amount']);
        $received_by_user_id = intval($_SESSION['user_id'] ?? 0);
        
        // Set to NULL if user_id is not available
        $received_by_user_id_value = ($received_by_user_id > 0) ? $received_by_user_id : 'NULL';

        $query = "INSERT INTO donations (person_id, donor_name, amount, donation_type, received_by_user_id)
                  VALUES ($person_id, 'Donor', $amount, 'Project Donation', $received_by_user_id_value)";

        if ($conn->query($query) === TRUE) {
            $donation_id = $conn->insert_id;
            logAuditAction($_SESSION['user_id'] ?? 0, 'CREATE', 'donations', "Added lenten offering: Amount: $amount from person_id: $person_id", $conn);
            
            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'Lenten offering created successfully',
                'lenten_offering_id' => $donation_id
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to create lenten offering: ' . $conn->error]);
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

    if ($type === 'donation' || $type === 'lenten_offering') {
        $query = "DELETE FROM donations WHERE donation_id = $id";
        $table = 'donations';
    } elseif ($type === 'mass_intention') {
        $query = "DELETE FROM mass_intentions WHERE intention_id = $id";
        $table = 'mass_intentions';
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
