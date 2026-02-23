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
    // Get all notification logs
    $query = "SELECT nl.*, p.first_name, p.last_name FROM notification_logs nl
              LEFT JOIN persons p ON nl.person_id = p.person_id
              ORDER BY nl.sent_at DESC";

    $result = $conn->query($query);

    if (!$result) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]);
        exit();
    }

    $logs = [];
    while ($row = $result->fetch_assoc()) {
        $logs[] = $row;
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $logs,
        'count' => count($logs)
    ]);
} elseif ($request_method === 'POST') {
    // Create notification log
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['message_body'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        exit();
    }

    $person_id = intval($data['person_id'] ?? 0);
    $person_id_val = $person_id > 0 ? $person_id : 'NULL';
    $message_body = $conn->real_escape_string($data['message_body']);
    $notif_type = $conn->real_escape_string($data['notif_type'] ?? 'Email');
    $sent_status = $conn->real_escape_string($data['sent_status'] ?? 'Pending');
    $recipient_address = isset($data['recipient_address']) ? $conn->real_escape_string($data['recipient_address']) : 'NULL';

    $query = "INSERT INTO notification_logs (person_id, message_body, notif_type, sent_status, recipient_address)
              VALUES ($person_id_val, '$message_body', '$notif_type', '$sent_status', '$recipient_address')";

    if ($conn->query($query) === TRUE) {
        $notif_id = $conn->insert_id;
        logAuditAction($_SESSION['user_id'] ?? 0, 'CREATE', 'notification_logs', "Added notification: $notif_type", $conn);
        
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Notification log created successfully',
            'notif_id' => $notif_id
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create notification log: ' . $conn->error]);
    }
} elseif ($request_method === 'PUT') {
    // Update notification log status
    parse_str(file_get_contents('php://input'), $data);
    $data = json_decode(file_get_contents('php://input'), true);

    $notif_id = isset($_GET['id']) ? intval($_GET['id']) : null;

    if (!$notif_id || !isset($data['sent_status'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        exit();
    }

    $sent_status = $conn->real_escape_string($data['sent_status']);
    $query = "UPDATE notification_logs SET sent_status = '$sent_status' WHERE notif_id = $notif_id";

    if ($conn->query($query) === TRUE) {
        logAuditAction($_SESSION['user_id'] ?? 0, 'UPDATE', 'notification_logs', "Updated notification status: $notif_id", $conn);
        
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Notification log updated successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update notification log: ' . $conn->error]);
    }
} elseif ($request_method === 'DELETE') {
    // Delete notification log
    $notif_id = isset($_GET['id']) ? intval($_GET['id']) : null;

    if (!$notif_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'notif_id is required']);
        exit();
    }

    $query = "DELETE FROM notification_logs WHERE notif_id = $notif_id";

    if ($conn->query($query) === TRUE) {
        logAuditAction($_SESSION['user_id'] ?? 0, 'DELETE', 'notification_logs', "Deleted notification log: $notif_id", $conn);
        
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Notification log deleted successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete notification log: ' . $conn->error]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

$conn->close();
?>
