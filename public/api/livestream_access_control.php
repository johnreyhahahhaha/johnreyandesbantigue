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
    if ($id) {
        $res = $conn->query("SELECT * FROM livestream_access_control WHERE access_id = $id LIMIT 1");
        if (!$res) { http_response_code(500); echo json_encode(['success'=>false,'message'=>$conn->error]); exit(); }
        echo json_encode(['success'=>true,'data'=>$res->fetch_assoc()]); exit();
    }

    $res = $conn->query("SELECT * FROM livestream_access_control ORDER BY created_at DESC");
    if (!$res) { http_response_code(500); echo json_encode(['success'=>false,'message'=>$conn->error]); exit(); }
    $rows=[]; while($r=$res->fetch_assoc()) $rows[]=$r;
    echo json_encode(['success'=>true,'data'=>$rows,'count'=>count($rows)]);

} elseif ($request_method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $user_id = isset($data['user_id']) ? intval($data['user_id']) : null;

    if (!isset($data['livestream_id'])) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'livestream_id required']); exit(); }

    $livestream_id = intval($data['livestream_id']);
    $access_type = $conn->real_escape_string($data['access_type'] ?? 'Public');
    $is_password_protected = isset($data['is_password_protected']) ? intval($data['is_password_protected']) : 0;
    $password_hash = isset($data['password_hash']) ? $conn->real_escape_string($data['password_hash']) : null;
    $allow_chat = isset($data['allow_chat']) ? intval($data['allow_chat']) : 1;
    $allow_guest_viewers = isset($data['allow_guest_viewers']) ? intval($data['allow_guest_viewers']) : 1;
    $require_email_registration = isset($data['require_email_registration']) ? intval($data['require_email_registration']) : 0;

    $query = "INSERT INTO livestream_access_control (livestream_id, access_type, is_password_protected, password_hash, allow_chat, allow_guest_viewers, require_email_registration, created_by) VALUES ($livestream_id, '$access_type', $is_password_protected, " . ($password_hash ? "'{$password_hash}'" : "NULL") . ", $allow_chat, $allow_guest_viewers, $require_email_registration, " . ($user_id ? $user_id : "NULL") . ")";

    if ($conn->query($query) === TRUE) {
        $id = $conn->insert_id;
        if ($user_id) logAuditAction($user_id,'CREATE','livestream_access_control',"Created access control for livestream $livestream_id", $conn);
        http_response_code(201); echo json_encode(['success'=>true,'access_id'=>$id]);
    } else { http_response_code(500); echo json_encode(['success'=>false,'message'=>$conn->error]); }

} elseif ($request_method === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = isset($_GET['id']) ? intval($_GET['id']) : (isset($data['access_id']) ? intval($data['access_id']) : null);
    $user_id = isset($data['user_id']) ? intval($data['user_id']) : null;
    if (!$id) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'access_id required']); exit(); }

    $updates = [];
    if (isset($data['access_type'])) $updates[] = "access_type='".$conn->real_escape_string($data['access_type'])."'";
    if (isset($data['is_password_protected'])) $updates[] = "is_password_protected=".intval($data['is_password_protected']);
    if (isset($data['password_hash'])) $updates[] = "password_hash='".$conn->real_escape_string($data['password_hash'])."'";
    if (isset($data['allow_chat'])) $updates[] = "allow_chat=".intval($data['allow_chat']);
    if (isset($data['allow_guest_viewers'])) $updates[] = "allow_guest_viewers=".intval($data['allow_guest_viewers']);
    if (isset($data['require_email_registration'])) $updates[] = "require_email_registration=".intval($data['require_email_registration']);

    if (empty($updates)) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'No fields to update']); exit(); }

    $query = "UPDATE livestream_access_control SET " . implode(', ',$updates) . " WHERE access_id = $id";
    if ($conn->query($query) === TRUE) {
        if ($user_id) logAuditAction($user_id,'UPDATE','livestream_access_control',"Updated access control $id", $conn);
        echo json_encode(['success'=>true,'message'=>'Updated']);
    } else { http_response_code(500); echo json_encode(['success'=>false,'message'=>$conn->error]); }

} elseif ($request_method === 'DELETE') {
    $id = isset($_GET['id']) ? intval($_GET['id']) : null;
    $user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;
    if (!$id) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'id required']); exit(); }
    if ($conn->query("DELETE FROM livestream_access_control WHERE access_id = $id") === TRUE) {
        if ($user_id) logAuditAction($user_id,'DELETE','livestream_access_control',"Deleted access control $id", $conn);
        echo json_encode(['success'=>true,'message'=>'Deleted']);
    } else { http_response_code(500); echo json_encode(['success'=>false,'message'=>$conn->error]); }

} else { http_response_code(405); echo json_encode(['success'=>false,'message'=>'Method not allowed']); }

$conn->close();
?>