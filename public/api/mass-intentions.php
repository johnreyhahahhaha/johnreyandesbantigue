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
    $query = "SELECT mi.*, p.first_name, p.last_name FROM mass_intentions mi 
              LEFT JOIN persons p ON mi.person_id = p.person_id
              ORDER BY mi.mass_date DESC, mi.mass_time DESC";
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
    
    if (!$input || !isset($input['mass_date']) || !isset($input['type']) || !isset($input['offered_by']) || !isset($input['intention_names'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields: mass_date, type, offered_by, intention_names']);
        exit();
    }

    $person_id = isset($input['person_id']) ? (int)$input['person_id'] : "NULL";
    $mass_date = $conn->real_escape_string($input['mass_date']);
    $mass_time = isset($input['mass_time']) ? "'" . $conn->real_escape_string($input['mass_time']) . "'" : "NULL";
    $type = $conn->real_escape_string($input['type']);
    $offered_by = $conn->real_escape_string($input['offered_by']);
    $intention_names = $conn->real_escape_string($input['intention_names']);
    $is_paid = isset($input['is_paid']) ? (int)$input['is_paid'] : 0;
    $is_read = isset($input['is_read']) ? (int)$input['is_read'] : 0;
    $ledger_id = isset($input['ledger_id']) ? (int)$input['ledger_id'] : "NULL";

    $query = "INSERT INTO mass_intentions (person_id, mass_date, mass_time, type, offered_by, intention_names, is_paid, is_read, ledger_id) 
              VALUES ($person_id, '$mass_date', $mass_time, '$type', '$offered_by', '$intention_names', $is_paid, $is_read, $ledger_id)";
    
    if ($conn->query($query)) {
        $new_id = $conn->insert_id;
        logAudit($conn, $_SESSION['user_id'] ?? 1, 'CREATE', 'mass_intentions', "Created mass intention: $type for $offered_by");
        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Mass intention created successfully', 'id' => $new_id]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create mass intention: ' . $conn->error]);
    }

} elseif ($request_method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['intention_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing intention_id']);
        exit();
    }

    $intention_id = (int)$input['intention_id'];
    $updates = [];
    
    if (isset($input['person_id'])) {
        $updates[] = "person_id = " . (int)$input['person_id'];
    }
    if (isset($input['mass_date'])) {
        $updates[] = "mass_date = '" . $conn->real_escape_string($input['mass_date']) . "'";
    }
    if (isset($input['mass_time'])) {
        $updates[] = "mass_time = '" . $conn->real_escape_string($input['mass_time']) . "'";
    }
    if (isset($input['type'])) {
        $updates[] = "type = '" . $conn->real_escape_string($input['type']) . "'";
    }
    if (isset($input['offered_by'])) {
        $updates[] = "offered_by = '" . $conn->real_escape_string($input['offered_by']) . "'";
    }
    if (isset($input['intention_names'])) {
        $updates[] = "intention_names = '" . $conn->real_escape_string($input['intention_names']) . "'";
    }
    if (isset($input['is_paid'])) {
        $updates[] = "is_paid = " . (int)$input['is_paid'];
    }
    if (isset($input['is_read'])) {
        $updates[] = "is_read = " . (int)$input['is_read'];
    }
    if (isset($input['ledger_id'])) {
        $updates[] = "ledger_id = " . (int)$input['ledger_id'];
    }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit();
    }

    $query = "UPDATE mass_intentions SET " . implode(', ', $updates) . " WHERE intention_id = $intention_id";
    
    if ($conn->query($query)) {
        logAudit($conn, $_SESSION['user_id'] ?? 1, 'UPDATE', 'mass_intentions', "Updated mass intention ID: $intention_id");
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Mass intention updated successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update mass intention: ' . $conn->error]);
    }

} elseif ($request_method === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['intention_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing intention_id']);
        exit();
    }

    $intention_id = (int)$input['intention_id'];

    $query = "DELETE FROM mass_intentions WHERE intention_id = $intention_id";
    
    if ($conn->query($query)) {
        logAudit($conn, $_SESSION['user_id'] ?? 1, 'DELETE', 'mass_intentions', "Deleted mass intention ID: $intention_id");
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Mass intention deleted successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete mass intention: ' . $conn->error]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>