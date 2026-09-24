<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

require_once 'config.php';

$request_method = $_SERVER['REQUEST_METHOD'];

if ($request_method !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    $conn->close();
    exit();
}

$raw_input = file_get_contents('php://input');
$data = json_decode($raw_input, true);

if (!$data || empty($data['email'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Email is required']);
    $conn->close();
    exit();
}

$email = trim($data['email']);
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid email address']);
    $conn->close();
    exit();
}

$clean_email = strtolower($email);

$query = "SELECT person_id, first_name, middle_name, last_name, email FROM persons WHERE LOWER(email) = ? LIMIT 1";
$stmt = $conn->prepare($query);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Query prepare failed: ' . $conn->error]);
    $conn->close();
    exit();
}

$stmt->bind_param('s', $clean_email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Email not found in persons table']);
    $stmt->close();
    $conn->close();
    exit();
}

$person = $result->fetch_assoc();
$stmt->close();

$person_id = intval($person['person_id']);

$check_account_query = "SELECT user_id FROM system_users WHERE person_id = ? LIMIT 1";
$account_stmt = $conn->prepare($check_account_query);
if (!$account_stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Account check failed: ' . $conn->error]);
    $conn->close();
    exit();
}

$account_stmt->bind_param('i', $person_id);
$account_stmt->execute();
$account_result = $account_stmt->get_result();

if ($account_result->num_rows > 0) {
    http_response_code(409);
    echo json_encode(['success' => false, 'message' => 'A system account already exists for this person']);
    $account_stmt->close();
    $conn->close();
    exit();
}

$account_stmt->close();

// If only email is provided, return verification success.
if (empty($data['username']) && empty($data['password'])) {
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Email verified. You may now create a username and password.',
        'person' => [
            'person_id' => $person_id,
            'first_name' => $person['first_name'],
            'middle_name' => $person['middle_name'],
            'last_name' => $person['last_name'],
            'email' => $person['email'],
        ]
    ]);
    $conn->close();
    exit();
}

if (empty($data['username']) || empty($data['password'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Username and password are required to create an account']);
    $conn->close();
    exit();
}

$username = trim($data['username']);
$password = $data['password'];

if (strlen($username) < 4) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Username must be at least 4 characters long']);
    $conn->close();
    exit();
}

if (strlen($password) < 6) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Password must be at least 6 characters long']);
    $conn->close();
    exit();
}

$check_username_query = "SELECT user_id FROM system_users WHERE username = ? LIMIT 1";
$username_stmt = $conn->prepare($check_username_query);
if (!$username_stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Username check failed: ' . $conn->error]);
    $conn->close();
    exit();
}

$username_stmt->bind_param('s', $username);
$username_stmt->execute();
$username_result = $username_stmt->get_result();

if ($username_result->num_rows > 0) {
    http_response_code(409);
    echo json_encode(['success' => false, 'message' => 'Username already exists']);
    $username_stmt->close();
    $conn->close();
    exit();
}

$username_stmt->close();

$password_hash = password_hash($password, PASSWORD_DEFAULT);
$default_role = 'Person';
$allowed_roles = ['Admin', 'Priest', 'Secretary', 'Treasurer', 'Person'];
$user_role = $default_role;
if (!empty($data['user_role']) && in_array($data['user_role'], $allowed_roles, true)) {
    $user_role = $data['user_role'];
}

$insert_query = "INSERT INTO system_users (person_id, username, password_hash, user_role, last_login)
                 VALUES (?, ?, ?, ?, NOW())";
$insert_stmt = $conn->prepare($insert_query);
if (!$insert_stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Insert prepare failed: ' . $conn->error]);
    $conn->close();
    exit();
}

$insert_stmt->bind_param('isss', $person_id, $username, $password_hash, $user_role);
if ($insert_stmt->execute()) {
    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Account created successfully',
        'user_id' => $insert_stmt->insert_id,
        'person_id' => $person_id,
        'username' => $username,
        'email' => $person['email'],
        'user_role' => $user_role,
    ]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to create account: ' . $insert_stmt->error]);
}

$insert_stmt->close();
$conn->close();
exit();
