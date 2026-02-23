<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

require_once 'config.php';

$request_method = $_SERVER['REQUEST_METHOD'];

if ($request_method === 'GET') {
    // Get user profile by user_id
    if (!isset($_GET['user_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'user_id is required']);
        exit();
    }

    $user_id = intval($_GET['user_id']);

    $query = "SELECT su.user_id, su.person_id, su.username, su.user_role, su.last_login,
                     p.first_name, p.middle_name, p.last_name, p.email, p.contact_no,
                     p.gender, p.birth_date, p.address, p.civil_status
              FROM system_users su
              LEFT JOIN persons p ON su.person_id = p.person_id
              WHERE su.user_id = ?";

    $stmt = $conn->prepare($query);

    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Prepare failed: ' . $conn->error]);
        exit();
    }

    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'user' => $user
        ]);
    } else {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'User not found']);
    }

    $stmt->close();
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

$conn->close();
?>
