<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once('config.php');

$user_id = isset($_GET['user_id']) ? $_GET['user_id'] : null;
$firebase_uid = isset($_GET['firebase_uid']) ? $_GET['firebase_uid'] : null;

if (!$user_id && !$firebase_uid) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'user_id or firebase_uid is required']);
    exit;
}

// Get user profile
$query = "SELECT u.user_id, u.username, u.email, u.user_role, u.status, 
                 p.person_id, p.first_name, p.last_name, p.contact_no, p.parish_role,
                 u.firebase_uid
          FROM users u
          LEFT JOIN persons p ON u.person_id = p.person_id
          WHERE ";

if ($user_id) {
    $query .= "u.user_id = ?";
    $stmt = $mysqli->prepare($query);
    $stmt->bind_param('i', $user_id);
} else {
    $query .= "u.firebase_uid = ?";
    $stmt = $mysqli->prepare($query);
    $stmt->bind_param('s', $firebase_uid);
}

$stmt->execute();
$result = $stmt->get_result();

if ($result && $result->num_rows > 0) {
    $user = $result->fetch_assoc();
    
    // Get user permissions
    $permissions = [];
    if ($user['user_role'] !== 'Person') {
        $perm_query = "SELECT permission_name FROM user_permissions WHERE user_id = ?";
        $perm_stmt = $mysqli->prepare($perm_query);
        $perm_stmt->bind_param('i', $user['user_id']);
        $perm_stmt->execute();
        $perm_result = $perm_stmt->get_result();
        while ($row = $perm_result->fetch_assoc()) {
            $permissions[] = $row['permission_name'];
        }
        $perm_stmt->close();
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'user' => [
            'user_id' => $user['user_id'],
            'username' => $user['username'],
            'email' => $user['email'],
            'user_role' => $user['user_role'],
            'status' => $user['status'],
            'first_name' => $user['first_name'],
            'last_name' => $user['last_name'],
            'contact_no' => $user['contact_no'],
            'parish_role' => $user['parish_role'],
            'permissions' => $permissions,
            'firebase_uid' => $user['firebase_uid']
        ]
    ]);
} else {
    http_response_code(404);
    echo json_encode([
        'success' => false,
        'message' => 'User not found'
    ]);
}

$stmt->close();
?>
