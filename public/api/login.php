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
    
    // Query the system_users table to get the stored hash
    $query = "SELECT su.user_id, su.person_id, su.username, su.user_role, su.password_hash, su.last_login,
                     p.first_name, p.middle_name, p.last_name, p.email, p.contact_no,
                     p.address, p.gender, p.birth_date, p.birth_place,
                     CASE WHEN EXISTS(
                         SELECT 1 FROM marriage_records mr
                         WHERE mr.groom_id = p.person_id OR mr.bride_id = p.person_id
                     ) THEN 'Married' ELSE p.civil_status END AS civil_status,
                     p.religion, p.nationality, p.occupation
              FROM system_users su
              LEFT JOIN persons p ON su.person_id = p.person_id
              WHERE su.username = ?";
    
    $stmt = $conn->prepare($query);
    
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Prepare failed: ' . $conn->error]);
        exit();
    }
    
    $stmt->bind_param('s', $username);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();
        $stored_hash = $user['password_hash'];
        
        // Check password: try password_verify first (for new hashes), then fallback to MD5 for old hashes
        $password_valid = false;
        if (password_verify($password, $stored_hash)) {
            $password_valid = true;
        } elseif (strlen($stored_hash) == 32 && md5($password) === $stored_hash) {
            $password_valid = true;
            // Optionally, re-hash the password with password_hash for future logins
            $new_hash = password_hash($password, PASSWORD_DEFAULT);
            $update_query = "UPDATE system_users SET password_hash = ? WHERE user_id = ?";
            $update_stmt = $conn->prepare($update_query);
            $update_stmt->bind_param('si', $new_hash, $user['user_id']);
            $update_stmt->execute();
            $update_stmt->close();
        }
        
        if ($password_valid) {
            // Update last login
            $update_query = "UPDATE system_users SET last_login = NOW() WHERE user_id = ?";
            $update_stmt = $conn->prepare($update_query);
            $update_stmt->bind_param('i', $user['user_id']);
            $update_stmt->execute();
            $update_stmt->close();
            
            // Ensure the response carries the latest last_login timestamp
            $user['last_login'] = date('Y-m-d H:i:s');
            
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'Login successful',
                'user' => [
                    'user_id' => $user['user_id'],
                    'person_id' => $user['person_id'],
                    'username' => $user['username'],
                    'first_name' => $user['first_name'],
                    'middle_name' => $user['middle_name'],
                    'last_name' => $user['last_name'],
                    'full_name' => trim($user['first_name'] . ' ' . $user['middle_name'] . ' ' . $user['last_name']),
                    'email' => $user['email'],
                    'phone' => $user['contact_no'],
                    'contact_no' => $user['contact_no'],
                    'address' => $user['address'],
                    'gender' => $user['gender'],
                    'birth_date' => $user['birth_date'],
                    'birth_place' => $user['birth_place'],
                    'civil_status' => $user['civil_status'],
                    'religion' => $user['religion'],
                    'nationality' => $user['nationality'],
                    'occupation' => $user['occupation'],
                    'user_role' => $user['user_role'],
                    'last_login' => $user['last_login']
                ]
            ]);
        } else {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Invalid username or password']);
        }
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
