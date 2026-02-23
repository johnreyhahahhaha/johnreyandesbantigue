<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

require_once 'config.php';

// Get the request method
$request_method = $_SERVER['REQUEST_METHOD'];

if ($request_method === 'POST') {
    // Get the request data
    $raw_input = file_get_contents('php://input');
    $data = json_decode($raw_input, true);
    
    // Validate input
    if (!$data || empty($data['username']) || empty($data['password'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false, 
            'message' => 'Username and password are required'
        ]);
        exit();
    }
    
    $username = $conn->real_escape_string($data['username']);
    $password = $data['password'];
    
    // Hash the password using MD5 (same as what's in the database)
    $password_hash = md5($password);
    
    // Query the system_users table
    $query = "SELECT su.user_id, su.person_id, su.username, su.user_role, 
                     p.first_name, p.middle_name, p.last_name, p.email
              FROM system_users su
              LEFT JOIN persons p ON su.person_id = p.person_id
              WHERE su.username = ? AND su.password_hash = ?";
    
    $stmt = $conn->prepare($query);
    
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Prepare failed: ' . $conn->error]);
        exit();
    }
    
    $stmt->bind_param('ss', $username, $password_hash);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();
        
        // Update last login
        $update_query = "UPDATE system_users SET last_login = NOW() WHERE user_id = ?";
        $update_stmt = $conn->prepare($update_query);
        $update_stmt->bind_param('i', $user['user_id']);
        $update_stmt->execute();
        $update_stmt->close();
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Login successful',
            'user' => [
                'user_id' => $user['user_id'],
                'person_id' => $user['person_id'],
                'username' => $user['username'],
                'full_name' => trim($user['first_name'] . ' ' . $user['middle_name'] . ' ' . $user['last_name']),
                'email' => $user['email'],
                'user_role' => $user['user_role']
            ]
        ]);
    } else {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Invalid username or password']);
    }
    
    $stmt->close();
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

$conn->close();
?>
