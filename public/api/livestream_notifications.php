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

$request_method = $_SERVER['REQUEST_METHOD'];

if ($request_method === 'GET') {
    $id = isset($_GET['id']) ? intval($_GET['id']) : null;
    $livestream_id = isset($_GET['livestream_id']) ? intval($_GET['livestream_id']) : null;

    if ($id) {
        $res = $conn->query("SELECT * FROM livestream_notifications WHERE notif_id = $id LIMIT 1");
        if (!$res) { http_response_code(500); echo json_encode(['success'=>false,'message'=>$conn->error]); exit(); }
        echo json_encode(['success'=>true,'data'=>$res->fetch_assoc()]); exit();
    }

    $where = $livestream_id ? "WHERE livestream_id = $livestream_id" : "";
    $res = $conn->query("SELECT * FROM livestream_notifications $where ORDER BY created_at DESC");
    if (!$res) { http_response_code(500); echo json_encode(['success'=>false,'message'=>$conn->error]); exit(); }
    $rows = [];
    while ($r = $res->fetch_assoc()) $rows[] = $r;
    echo json_encode(['success'=>true,'data'=>$rows,'count'=>count($rows)]);

} elseif ($request_method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $user_id = isset($data['user_id']) ? intval($data['user_id']) : null;

    if (empty($data['livestream_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'livestream_id required']);
        exit();
    }

    $livestream_id = intval($data['livestream_id']);
    $recipient_user_id = isset($data['recipient_user_id']) ? intval($data['recipient_user_id']) : null;
    $notification_method_input = isset($data['notification_method']) ? strtolower($data['notification_method']) : 'in-system';
    $notification_method = in_array($notification_method_input, ['email','sms','push'], true) ? ucfirst($notification_method_input) : 'In-System';
    $notification_type_input = isset($data['notification_type']) ? trim($data['notification_type']) : 'Event_Starting';
    $valid_notification_types = ['Upcoming_Livestream', 'Recording_Available', 'Event_Starting', 'Event_Ended', 'Reminder'];
    $notification_type = in_array($notification_type_input, $valid_notification_types, true) ? $notification_type_input : 'Event_Starting';
    $title = $conn->real_escape_string($data['title'] ?? 'Livestream Update');
    $message = $conn->real_escape_string($data['message'] ?? 'Livestream notification');

    $query = "INSERT INTO livestream_notifications (livestream_id, recipient_user_id, notification_type, title, message, notification_method, created_at) VALUES ($livestream_id, " . ($recipient_user_id ? $recipient_user_id : "NULL") . ", '$notification_type', '$title', '$message', '$notification_method', CURRENT_TIMESTAMP())";

    if ($conn->query($query) === TRUE) {
        $notif_id = $conn->insert_id;
        if ($user_id) logAuditAction($user_id, 'CREATE', 'livestream_notifications', "Created notification $notif_id for livestream $livestream_id", $conn);
        http_response_code(201);
        echo json_encode(['success' => true, 'notif_id' => $notif_id]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $conn->error]);
    }

} elseif ($request_method === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = isset($_GET['id']) ? intval($_GET['id']) : (isset($data['notif_id']) ? intval($data['notif_id']) : null);
    $user_id = isset($data['user_id']) ? intval($data['user_id']) : null;

    if (!$id) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'notif_id required']); exit(); }

    $updates = [];
    if (isset($data['is_sent'])) $updates[] = "is_sent=" . intval($data['is_sent']);
    if (isset($data['is_read'])) $updates[] = "is_read=" . intval($data['is_read']);
    if (isset($data['sent_at'])) $updates[] = "sent_at='".$conn->real_escape_string($data['sent_at'])."'";
    if (isset($data['read_at'])) $updates[] = "read_at='".$conn->real_escape_string($data['read_at'])."'";

    if (empty($updates)) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'No fields to update']); exit(); }

    $query = "UPDATE livestream_notifications SET " . implode(', ', $updates) . " WHERE notif_id = $id";
    if ($conn->query($query) === TRUE) {
        if ($user_id) logAuditAction($user_id, 'UPDATE', 'livestream_notifications', "Updated notification $id", $conn);
        echo json_encode(['success'=>true,'message'=>'Updated']);
    } else { http_response_code(500); echo json_encode(['success'=>false,'message'=>$conn->error]); }

} elseif ($request_method === 'DELETE') {
    $id = isset($_GET['id']) ? intval($_GET['id']) : null;
    $user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;
    if (!$id) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'id required']); exit(); }
    if ($conn->query("DELETE FROM livestream_notifications WHERE notif_id = $id") === TRUE) {
        if ($user_id) logAuditAction($user_id, 'DELETE', 'livestream_notifications', "Deleted notification $id", $conn);
        echo json_encode(['success'=>true,'message'=>'Deleted']);
    } else { http_response_code(500); echo json_encode(['success'=>false,'message'=>$conn->error]); }

} else { http_response_code(405); echo json_encode(['success'=>false,'message'=>'Method not allowed']); }

$conn->close();
?>