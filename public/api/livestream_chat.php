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
        $res = $conn->query("SELECT * FROM livestream_chat WHERE chat_id = $id LIMIT 1"); if (!$res) { http_response_code(500); echo json_encode(['success'=>false,'message'=>$conn->error]); exit(); }
        echo json_encode(['success'=>true,'data'=>$res->fetch_assoc()]); exit();
    }
    $where = $livestream_id ? "WHERE livestream_id = $livestream_id" : "";
    $res = $conn->query("SELECT * FROM livestream_chat $where ORDER BY created_at ASC"); if (!$res) { http_response_code(500); echo json_encode(['success'=>false,'message'=>$conn->error]); exit(); }
    $rows=[]; while($r=$res->fetch_assoc()) $rows[]=$r;
    echo json_encode(['success'=>true,'data'=>$rows,'count'=>count($rows)]);

} elseif ($request_method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (empty($data['livestream_id']) || empty($data['message'])) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'livestream_id and message required']); exit(); }
    $livestream_id = intval($data['livestream_id']);
    $sender_user_id = isset($data['sender_user_id']) ? intval($data['sender_user_id']) : null;
    $sender_name = isset($data['sender_name']) ? $conn->real_escape_string($data['sender_name']) : null;
    $sender_email = isset($data['sender_email']) ? $conn->real_escape_string($data['sender_email']) : null;
    $message = $conn->real_escape_string($data['message']);
    $is_moderated = isset($data['is_moderated']) ? intval($data['is_moderated']) : 0;
    $is_approved = isset($data['is_approved']) ? intval($data['is_approved']) : 1;

    $query = "INSERT INTO livestream_chat (livestream_id, sender_user_id, sender_name, sender_email, message, is_moderated, is_approved) VALUES ($livestream_id, " . ($sender_user_id ? $sender_user_id : "NULL") . ", " . ($sender_name ? "'{$sender_name}'" : "NULL") . ", " . ($sender_email ? "'{$sender_email}'" : "NULL") . ", '{$message}', $is_moderated, $is_approved)";
    if ($conn->query($query) === TRUE) { $id = $conn->insert_id; echo json_encode(['success'=>true,'chat_id'=>$id]); } else { http_response_code(500); echo json_encode(['success'=>false,'message'=>$conn->error]); }

} elseif ($request_method === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = isset($_GET['id']) ? intval($_GET['id']) : (isset($data['chat_id']) ? intval($data['chat_id']) : null);
    if (!$id) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'chat_id required']); exit(); }
    $updates = [];
    if (isset($data['message'])) $updates[] = "message='".$conn->real_escape_string($data['message'])."'";
    if (isset($data['is_moderated'])) $updates[] = "is_moderated=".intval($data['is_moderated']);
    if (isset($data['is_approved'])) $updates[] = "is_approved=".intval($data['is_approved']);
    if (empty($updates)) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'No fields to update']); exit(); }
    $query = "UPDATE livestream_chat SET " . implode(', ',$updates) . " WHERE chat_id = $id";
    if ($conn->query($query) === TRUE) echo json_encode(['success'=>true,'message'=>'Updated']); else { http_response_code(500); echo json_encode(['success'=>false,'message'=>$conn->error]); }

} elseif ($request_method === 'DELETE') {
    $id = isset($_GET['id']) ? intval($_GET['id']) : null; if (!$id) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'id required']); exit(); }
    if ($conn->query("DELETE FROM livestream_chat WHERE chat_id = $id") === TRUE) echo json_encode(['success'=>true,'message'=>'Deleted']); else { http_response_code(500); echo json_encode(['success'=>false,'message'=>$conn->error]); }

} else { http_response_code(405); echo json_encode(['success'=>false,'message'=>'Method not allowed']); }

$conn->close();
?>