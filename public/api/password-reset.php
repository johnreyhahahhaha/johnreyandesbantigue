<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

require_once 'config.php';
require_once 'send-notification.php';

header('Content-Type: application/json; charset=utf-8');

// Ensure password reset token table exists
$create_table_sql = "CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(10) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (user_id),
    FOREIGN KEY (user_id) REFERENCES system_users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
$conn->query($create_table_sql);

$request_method = $_SERVER['REQUEST_METHOD'];
if ($request_method !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    $conn->close();
    exit();
}

$raw_input = file_get_contents('php://input');
$data = json_decode($raw_input, true);
if (!$data || empty($data['action']) || empty($data['email'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Required fields: action, email']);
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

$action = $data['action'];
$lowerEmail = strtolower($email);

// Find user by email
$query = "SELECT p.person_id, p.first_name, p.middle_name, p.last_name, p.email, su.user_id
          FROM persons p
          LEFT JOIN system_users su ON p.person_id = su.person_id
          WHERE LOWER(p.email) = ?
          LIMIT 1";
$stmt = $conn->prepare($query);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $conn->error]);
    $conn->close();
    exit();
}
$stmt->bind_param('s', $lowerEmail);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Email not found']);
    $stmt->close();
    $conn->close();
    exit();
}

$user = $result->fetch_assoc();
$stmt->close();

if (!$user['user_id']) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'No login account is associated with this email']);
    $conn->close();
    exit();
}

if ($action === 'request') {
    // Generate one-time PIN and store it with expiration
    $pin = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expires_at = date('Y-m-d H:i:s', time() + 900); // 15 minutes

    $delete_query = "DELETE FROM password_reset_tokens WHERE user_id = ?";
    $delete_stmt = $conn->prepare($delete_query);
    if ($delete_stmt) {
        $delete_stmt->bind_param('i', $user['user_id']);
        $delete_stmt->execute();
        $delete_stmt->close();
    }

    $insert_query = "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?);";
    $insert_stmt = $conn->prepare($insert_query);
    if (!$insert_stmt) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $conn->error]);
        $conn->close();
        exit();
    }
    $insert_stmt->bind_param('iss', $user['user_id'], $pin, $expires_at);
    if (!$insert_stmt->execute()) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create PIN record']);
        $insert_stmt->close();
        $conn->close();
        exit();
    }
    $insert_stmt->close();

    $subject = 'St. Joseph Parish Password Reset PIN';
    $message = "Hello {$user['first_name']} {$user['last_name']},\n\n" .
               "You requested a password reset for your St. Joseph Parish account.\n" .
               "Use the following PIN to reset your password:\n\n" .
               "PIN: $pin\n\n" .
               "This PIN will expire in 15 minutes. If you did not request this, please ignore this email.";

    if (!sendEmail($user['email'], $subject, $message)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to send reset PIN email']);
        $conn->close();
        exit();
    }

    echo json_encode(['success' => true, 'message' => 'A PIN was sent to your email address']);
    $conn->close();
    exit();
}

if ($action === 'reset') {
    if (empty($data['code']) || empty($data['new_password'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Required fields: code, new_password']);
        $conn->close();
        exit();
    }

    $code = trim($data['code']);
    $new_password = $data['new_password'];

    if (strlen($new_password) < 6) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Password must be at least 6 characters long']);
        $conn->close();
        exit();
    }

    $token_query = "SELECT token_id, expires_at FROM password_reset_tokens WHERE user_id = ? AND token = ? LIMIT 1";
    $token_stmt = $conn->prepare($token_query);
    if (!$token_stmt) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $conn->error]);
        $conn->close();
        exit();
    }
    $token_stmt->bind_param('is', $user['user_id'], $code);
    $token_stmt->execute();
    $token_result = $token_stmt->get_result();

    if ($token_result->num_rows === 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid PIN']);
        $token_stmt->close();
        $conn->close();
        exit();
    }

    $token_row = $token_result->fetch_assoc();
    $token_stmt->close();

    if (strtotime($token_row['expires_at']) < time()) {
        $conn->query("DELETE FROM password_reset_tokens WHERE token_id = {$token_row['token_id']}");
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'PIN has expired']);
        $conn->close();
        exit();
    }

    $password_hash = password_hash($new_password, PASSWORD_DEFAULT);
    $update_query = "UPDATE system_users SET password_hash = ? WHERE user_id = ?";
    $update_stmt = $conn->prepare($update_query);
    if (!$update_stmt) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $conn->error]);
        $conn->close();
        exit();
    }
    $update_stmt->bind_param('si', $password_hash, $user['user_id']);

    if (!$update_stmt->execute()) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update password']);
        $update_stmt->close();
        $conn->close();
        exit();
    }
    $update_stmt->close();

    $conn->query("DELETE FROM password_reset_tokens WHERE user_id = {$user['user_id']}");

    echo json_encode(['success' => true, 'message' => 'Your password has been reset successfully']);
    $conn->close();
    exit();
}

http_response_code(400);
echo json_encode(['success' => false, 'message' => 'Invalid action']);
$conn->close();
exit();
?>