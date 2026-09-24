<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once 'config.php';
require_once 'audit.php';

$request_method = $_SERVER['REQUEST_METHOD'];

if ($request_method === 'GET') {
    // Get all users with person information
    $query = "SELECT su.user_id, su.person_id, su.username, su.user_role, su.last_login,
                     p.first_name, p.middle_name, p.last_name, p.email, p.contact_no
              FROM system_users su
              LEFT JOIN persons p ON su.person_id = p.person_id
              ORDER BY su.user_id ASC";

    $result = $conn->query($query);

    if (!$result) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]);
        exit();
    }

    $users = [];
    while ($row = $result->fetch_assoc()) {
        $users[] = $row;
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $users,
        'count' => count($users)
    ]);

} elseif ($request_method === 'POST') {
    // Create new user
    $data = json_decode(file_get_contents("php://input"), true);
    $user_id = isset($data['user_id']) && intval($data['user_id']) > 0 ? intval($data['user_id']) : null;

    if (!isset($data['username']) || !isset($data['password']) || !isset($data['person_id']) || !isset($data['user_role'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        exit();
    }

    $username = $conn->real_escape_string($data['username']);
    $password_hash = password_hash($data['password'], PASSWORD_DEFAULT);
    $person_id = intval($data['person_id']);
    $user_role = $conn->real_escape_string($data['user_role']);

    // Check if username already exists
    $check_query = "SELECT user_id FROM system_users WHERE username = '$username'";
    $check_result = $conn->query($check_query);

    if ($check_result->num_rows > 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Username already exists']);
        exit();
    }

    // Check if person exists
    $person_check = "SELECT person_id FROM persons WHERE person_id = $person_id";
    $person_result = $conn->query($person_check);

    if ($person_result->num_rows === 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Person ID does not exist']);
        exit();
    }

    $query = "INSERT INTO system_users (person_id, username, password_hash, user_role, last_login) 
              VALUES ($person_id, '$username', '$password_hash', '$user_role', NOW())";

    if ($conn->query($query) === TRUE) {
        $new_user_id = $conn->insert_id;
        
        // Log the action
        if ($user_id && $user_id > 0) {
            logAuditAction($user_id, 'CREATE', 'system_users', "Created user: $username (Role: $user_role)", $conn);
        }
        
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'User created successfully',
            'user_id' => $new_user_id
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create user: ' . $conn->error]);
    }

} elseif ($request_method === 'PUT') {
    // Update user password
    $data = json_decode(file_get_contents("php://input"), true);
    $current_user_id = isset($data['user_id']) ? intval($data['user_id']) : null;

    if (!isset($data['user_id']) || !isset($data['password'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        exit();
    }

    $update_user_id = intval($data['user_id']);
    $password_hash = password_hash($data['password'], PASSWORD_DEFAULT);

    $query = "UPDATE system_users SET password_hash = '$password_hash' WHERE user_id = $update_user_id";

    if ($conn->query($query) === TRUE) {
        // Log the action
        if ($current_user_id && $current_user_id > 0 && $current_user_id != $update_user_id) {
            logAuditAction($current_user_id, 'UPDATE', 'system_users', "Changed password for user ID: $update_user_id", $conn);
        }
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Password changed successfully'
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to change password: ' . $conn->error]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

$conn->close();
?>
