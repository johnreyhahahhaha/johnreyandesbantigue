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
    $query = "SELECT pv.*, p.first_name, p.last_name, m.ministry_name FROM parish_volunteers pv 
              LEFT JOIN persons p ON pv.person_id = p.person_id
              LEFT JOIN ministries m ON pv.ministry_id = m.ministry_id
              ORDER BY pv.date_joined DESC";
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
    
    if (!$input || !isset($input['person_id']) || !isset($input['ministry_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields: person_id, ministry_id']);
        exit();
    }

    $person_id = (int)$input['person_id'];
    $ministry_id = (int)$input['ministry_id'];
    $role = isset($input['role']) ? "'" . $conn->real_escape_string($input['role']) . "'" : "'Member'";
    $date_joined = isset($input['date_joined']) ? "'" . $conn->real_escape_string($input['date_joined']) . "'" : "CURDATE()";
    $status = $input['status'] ?? 'Active';

    $query = "INSERT INTO parish_volunteers (person_id, ministry_id, role, date_joined, status) 
              VALUES ($person_id, $ministry_id, $role, $date_joined, '$status')";
    
    if ($conn->query($query)) {
        $new_id = $conn->insert_id;
        logAudit($conn, $_SESSION['user_id'] ?? 1, 'CREATE', 'parish_volunteers', "Added volunteer for person ID: $person_id");
        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Parish volunteer created successfully', 'id' => $new_id]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create parish volunteer: ' . $conn->error]);
    }

} elseif ($request_method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['volunteer_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing volunteer_id']);
        exit();
    }

    $volunteer_id = (int)$input['volunteer_id'];
    $updates = [];
    
    if (isset($input['person_id'])) {
        $updates[] = "person_id = " . (int)$input['person_id'];
    }
    if (isset($input['ministry_id'])) {
        $updates[] = "ministry_id = " . (int)$input['ministry_id'];
    }
    if (isset($input['role'])) {
        $updates[] = "role = '" . $conn->real_escape_string($input['role']) . "'";
    }
    if (isset($input['date_joined'])) {
        $updates[] = "date_joined = '" . $conn->real_escape_string($input['date_joined']) . "'";
    }
    if (isset($input['status'])) {
        $updates[] = "status = '" . $conn->real_escape_string($input['status']) . "'";
    }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit();
    }

    $query = "UPDATE parish_volunteers SET " . implode(', ', $updates) . " WHERE volunteer_id = $volunteer_id";
    
    if ($conn->query($query)) {
        logAudit($conn, $_SESSION['user_id'] ?? 1, 'UPDATE', 'parish_volunteers', "Updated parish volunteer ID: $volunteer_id");
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Parish volunteer updated successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update parish volunteer: ' . $conn->error]);
    }

} elseif ($request_method === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['volunteer_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing volunteer_id']);
        exit();
    }

    $volunteer_id = (int)$input['volunteer_id'];

    $query = "DELETE FROM parish_volunteers WHERE volunteer_id = $volunteer_id";
    
    if ($conn->query($query)) {
        logAudit($conn, $_SESSION['user_id'] ?? 1, 'DELETE', 'parish_volunteers', "Deleted parish volunteer ID: $volunteer_id");
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Parish volunteer deleted successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete parish volunteer: ' . $conn->error]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>