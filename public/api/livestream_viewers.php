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
    if ($id) { $res=$conn->query("SELECT * FROM livestream_viewers WHERE viewer_id = $id LIMIT 1"); if(!$res){http_response_code(500);echo json_encode(['success'=>false,'message'=>$conn->error]);exit();} echo json_encode(['success'=>true,'data'=>$res->fetch_assoc()]); exit(); }
    $where = $livestream_id ? "WHERE livestream_id = $livestream_id" : "";
    $res = $conn->query("SELECT * FROM livestream_viewers $where ORDER BY join_time DESC"); if(!$res){http_response_code(500);echo json_encode(['success'=>false,'message'=>$conn->error]);exit();}
    $rows=[]; while($r=$res->fetch_assoc()) $rows[]=$r; echo json_encode(['success'=>true,'data'=>$rows,'count'=>count($rows)]);

} elseif ($request_method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (empty($data['livestream_id'])) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'livestream_id required']); exit(); }
    $livestream_id = intval($data['livestream_id']);
    $viewer_email = isset($data['viewer_email']) ? $conn->real_escape_string($data['viewer_email']) : (isset($data['username']) ? $conn->real_escape_string($data['username']) : null);
    $user_id = isset($data['user_id']) ? intval($data['user_id']) : null;
    $ip_address = isset($data['ip_address']) ? $conn->real_escape_string($data['ip_address']) : null;
    $device_type = isset($data['device_type']) ? $conn->real_escape_string($data['device_type']) : 'Unknown';
    $join_time = isset($data['join_time']) ? $conn->real_escape_string($data['join_time']) : date('Y-m-d H:i:s');
    $watch_duration_seconds = isset($data['watch_duration_seconds']) ? intval($data['watch_duration_seconds']) : (isset($data['watch_duration']) ? intval($data['watch_duration']) : 0);

    $query = "INSERT INTO livestream_viewers (livestream_id, viewer_email, user_id, ip_address, device_type, join_time, watch_duration_seconds) VALUES ($livestream_id, " . ($viewer_email ? "'{$viewer_email}'" : "NULL") . ", " . ($user_id ? $user_id : "NULL") . ", " . ($ip_address ? "'{$ip_address}'" : "NULL") . ", '$device_type', '$join_time', $watch_duration_seconds)";
    if ($conn->query($query) === TRUE) { echo json_encode(['success'=>true,'viewer_id'=>$conn->insert_id]); } else { http_response_code(500); echo json_encode(['success'=>false,'message'=>$conn->error]); }

} elseif ($request_method === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = isset($_GET['id']) ? intval($_GET['id']) : (isset($data['viewer_id']) ? intval($data['viewer_id']) : null);
    if (!$id) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'viewer_id required']); exit(); }
    $updates=[];
    if (isset($data['leave_time'])) $updates[] = "leave_time='".$conn->real_escape_string($data['leave_time'])."'";
    if (isset($data['watch_duration_seconds'])) $updates[] = "watch_duration_seconds=".intval($data['watch_duration_seconds']);
    if (empty($updates)) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'No fields to update']); exit(); }
    $query = "UPDATE livestream_viewers SET " . implode(', ',$updates) . " WHERE viewer_id = $id";
    if ($conn->query($query) === TRUE) echo json_encode(['success'=>true,'message'=>'Updated']); else { http_response_code(500); echo json_encode(['success'=>false,'message'=>$conn->error]); }

} elseif ($request_method === 'DELETE') {
    $id = isset($_GET['id']) ? intval($_GET['id']) : null; if (!$id) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'id required']); exit(); }
    if ($conn->query("DELETE FROM livestream_viewers WHERE viewer_id = $id") === TRUE) echo json_encode(['success'=>true,'message'=>'Deleted']); else { http_response_code(500); echo json_encode(['success'=>false,'message'=>$conn->error]); }

} else { http_response_code(405); echo json_encode(['success'=>false,'message'=>'Method not allowed']); }

$conn->close();
?>