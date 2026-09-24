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
    if ($id) { $res=$conn->query("SELECT * FROM livestream_recordings WHERE recording_id = $id LIMIT 1"); if(!$res){http_response_code(500);echo json_encode(['success'=>false,'message'=>$conn->error]);exit();} echo json_encode(['success'=>true,'data'=>$res->fetch_assoc()]); exit(); }
    $where = $livestream_id ? "WHERE livestream_id = $livestream_id" : "";
    $res = $conn->query("SELECT * FROM livestream_recordings $where ORDER BY created_at DESC"); if(!$res){http_response_code(500);echo json_encode(['success'=>false,'message'=>$conn->error]);exit();}
    $rows=[]; while($r=$res->fetch_assoc()) $rows[]=$r; echo json_encode(['success'=>true,'data'=>$rows,'count'=>count($rows)]);

} elseif ($request_method === 'POST') {
    $isUpload = isset($_FILES['recording']);
    $data = $isUpload ? $_POST : json_decode(file_get_contents('php://input'), true);
    if (empty($data['livestream_id']) || (!$isUpload && empty($data['recording_url']))) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'livestream_id and recording URL or file required']); exit(); }
    $livestream_id = intval($data['livestream_id']);
    if ($isUpload) {
        if ($_FILES['recording']['error'] !== UPLOAD_ERR_OK || $_FILES['recording']['size'] > 500 * 1024 * 1024) {
            http_response_code(400); echo json_encode(['success'=>false,'message'=>'Recording upload failed or exceeds the 500MB limit']); exit();
        }
        $uploadDir = __DIR__ . '/../uploads/livestream-recordings/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
        $extension = strtolower(pathinfo($_FILES['recording']['name'], PATHINFO_EXTENSION)) ?: 'webm';
        $filename = 'livestream_' . $livestream_id . '_' . time() . '.' . preg_replace('/[^a-z0-9]/', '', $extension);
        $filePath = $uploadDir . $filename;
        if (!move_uploaded_file($_FILES['recording']['tmp_name'], $filePath)) {
            http_response_code(500); echo json_encode(['success'=>false,'message'=>'Failed to save recording']); exit();
        }
        $publicBase = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] . rtrim(str_replace('\\', '/', dirname(dirname($_SERVER['SCRIPT_NAME']))), '/');
        $data['recording_url'] = $publicBase . '/uploads/livestream-recordings/' . $filename;
        $data['file_size_byte'] = $_FILES['recording']['size'];
    }
    $recording_url = $conn->real_escape_string($data['recording_url']);
    $recording_angle = isset($data['recording_angle']) ? $conn->real_escape_string($data['recording_angle']) : '';
    $thumbnail_url = isset($data['thumbnail_url']) ? $conn->real_escape_string($data['thumbnail_url']) : null;
    $file_size_byte = isset($data['file_size_byte']) ? intval($data['file_size_byte']) : null;
    $duration_seconds = isset($data['duration_seconds']) ? intval($data['duration_seconds']) : null;
    $recording_quality = isset($data['recording_quality']) ? $conn->real_escape_string($data['recording_quality']) : '720p';
    $is_available = isset($data['is_available']) ? intval($data['is_available']) : 1;
    $access_level = isset($data['access_level']) ? $conn->real_escape_string($data['access_level']) : 'Private';

    $query = "INSERT INTO livestream_recordings (livestream_id, recording_url, recording_angle, thumbnail_url, file_size_byte, duration_seconds, recording_quality, is_available, access_level, created_by) VALUES ($livestream_id, '{$recording_url}', " . ($recording_angle !== '' ? "'{$recording_angle}'" : "NULL") . ", " . ($thumbnail_url ? "'{$thumbnail_url}'" : "NULL") . ", " . ($file_size_byte !== null ? $file_size_byte : "NULL") . ", " . ($duration_seconds !== null ? $duration_seconds : "NULL") . ", '{$recording_quality}', $is_available, '{$access_level}', " . (isset($data['user_id']) ? intval($data['user_id']) : "NULL") . ")";
    if ($conn->query($query) === TRUE) { echo json_encode(['success'=>true,'recording_id'=>$conn->insert_id]); } else { http_response_code(500); echo json_encode(['success'=>false,'message'=>$conn->error]); }

} elseif ($request_method === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = isset($_GET['id']) ? intval($_GET['id']) : (isset($data['recording_id']) ? intval($data['recording_id']) : null);
    if (!$id) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'recording_id required']); exit(); }
    $updates=[];
    if (isset($data['is_available'])) $updates[] = "is_available=".intval($data['is_available']);
    if (isset($data['view_count'])) $updates[] = "view_count=".intval($data['view_count']);
    if (isset($data['recording_url'])) $updates[] = "recording_url='".$conn->real_escape_string($data['recording_url'])."'";
    if (empty($updates)) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'No fields to update']); exit(); }
    $query = "UPDATE livestream_recordings SET " . implode(', ',$updates) . " WHERE recording_id = $id";
    if ($conn->query($query) === TRUE) echo json_encode(['success'=>true,'message'=>'Updated']); else { http_response_code(500); echo json_encode(['success'=>false,'message'=>$conn->error]); }

} elseif ($request_method === 'DELETE') {
    $id = isset($_GET['id']) ? intval($_GET['id']) : null; if (!$id) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'id required']); exit(); }
    if ($conn->query("DELETE FROM livestream_recordings WHERE recording_id = $id") === TRUE) echo json_encode(['success'=>true,'message'=>'Deleted']); else { http_response_code(500); echo json_encode(['success'=>false,'message'=>$conn->error]); }

} else { http_response_code(405); echo json_encode(['success'=>false,'message'=>'Method not allowed']); }

$conn->close();
?>