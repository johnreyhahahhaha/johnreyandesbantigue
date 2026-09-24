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
    if ($id) { $res=$conn->query("SELECT * FROM livestream_statistics WHERE stat_id = $id LIMIT 1"); if(!$res){http_response_code(500);echo json_encode(['success'=>false,'message'=>$conn->error]);exit();} echo json_encode(['success'=>true,'data'=>$res->fetch_assoc()]); exit(); }
    $where = $livestream_id ? "WHERE livestream_id = $livestream_id" : "";
    $res = $conn->query("SELECT * FROM livestream_statistics $where ORDER BY created_at DESC"); if(!$res){http_response_code(500);echo json_encode(['success'=>false,'message'=>$conn->error]);exit();}
    $rows=[]; while($r=$res->fetch_assoc()) $rows[]=$r; echo json_encode(['success'=>true,'data'=>$rows,'count'=>count($rows)]);

} elseif ($request_method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (empty($data['livestream_id'])) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'livestream_id required']); exit(); }
    $livestream_id = intval($data['livestream_id']);

    $metric_name = isset($data['metric_name']) ? strtolower(trim((string)$data['metric_name'])) : '';
    $metric_value = isset($data['metric_value']) ? $data['metric_value'] : 0;
    $metric_map = [
        'views' => 'total_viewers',
        'viewers' => 'total_viewers',
        'total_viewers' => 'total_viewers',
        'peak_viewers' => 'peak_viewers',
        'peak' => 'peak_viewers',
        'messages' => 'total_messages',
        'total_messages' => 'total_messages',
        'chat_messages' => 'total_messages',
        'avg_watch_duration' => 'average_watch_duration_seconds',
        'watch_duration' => 'average_watch_duration_seconds',
        'duration' => 'average_watch_duration_seconds',
        'unique_devices' => 'unique_devices',
        'devices' => 'unique_devices',
        'unique_locations' => 'unique_locations',
        'locations' => 'unique_locations',
        'engagement' => 'engagement_score',
        'engagement_score' => 'engagement_score',
        'issues' => 'tech_issues_reported',
        'tech_issues' => 'tech_issues_reported',
        'recording_available' => 'recording_available',
        'recordings' => 'recording_available',
    ];

    $target_field = $metric_map[$metric_name] ?? 'total_viewers';
    $total_viewers = $target_field === 'total_viewers' ? intval($metric_value) : 0;
    $peak_viewers = $target_field === 'peak_viewers' ? intval($metric_value) : 0;
    $peak_viewers_time = isset($data['peak_viewers_time']) ? $conn->real_escape_string($data['peak_viewers_time']) : null;
    $average_watch_duration_seconds = $target_field === 'average_watch_duration_seconds' ? intval($metric_value) : 0;
    $total_messages = $target_field === 'total_messages' ? intval($metric_value) : 0;
    $unique_devices = $target_field === 'unique_devices' ? intval($metric_value) : 0;
    $unique_locations = $target_field === 'unique_locations' ? intval($metric_value) : 0;
    $engagement_score = $target_field === 'engagement_score' ? floatval($metric_value) : 0.00;
    $tech_issues_reported = $target_field === 'tech_issues_reported' ? intval($metric_value) : 0;
    $recording_available = $target_field === 'recording_available' ? intval($metric_value) : 0;

    $query = "INSERT INTO livestream_statistics (livestream_id, total_viewers, peak_viewers, peak_viewers_time, average_watch_duration_seconds, total_messages, unique_devices, unique_locations, engagement_score, tech_issues_reported, recording_available, created_at) VALUES ($livestream_id, $total_viewers, $peak_viewers, " . ($peak_viewers_time ? "'{$peak_viewers_time}'" : "NULL") . ", $average_watch_duration_seconds, $total_messages, $unique_devices, $unique_locations, $engagement_score, $tech_issues_reported, $recording_available, CURRENT_TIMESTAMP())";
    if ($conn->query($query) === TRUE) { echo json_encode(['success'=>true,'stat_id'=>$conn->insert_id]); } else { http_response_code(500); echo json_encode(['success'=>false,'message'=>$conn->error]); }

} elseif ($request_method === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = isset($_GET['id']) ? intval($_GET['id']) : (isset($data['stat_id']) ? intval($data['stat_id']) : null);
    if (!$id) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'stat_id required']); exit(); }
    $updates=[];
    $allowed = ['total_viewers','peak_viewers','peak_viewers_time','average_watch_duration_seconds','total_messages','unique_devices','unique_locations','engagement_score','tech_issues_reported','recording_available'];
    foreach ($allowed as $f) { if (isset($data[$f])) { $val = is_numeric($data[$f]) ? $data[$f] : $conn->real_escape_string($data[$f]); $updates[] = "$f = '" . $conn->real_escape_string((string)$val) . "'"; } }
    if (empty($updates)) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'No fields to update']); exit(); }
    $query = "UPDATE livestream_statistics SET " . implode(', ',$updates) . " WHERE stat_id = $id";
    if ($conn->query($query) === TRUE) echo json_encode(['success'=>true,'message'=>'Updated']); else { http_response_code(500); echo json_encode(['success'=>false,'message'=>$conn->error]); }

} elseif ($request_method === 'DELETE') {
    $id = isset($_GET['id']) ? intval($_GET['id']) : null; if (!$id) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'id required']); exit(); }
    if ($conn->query("DELETE FROM livestream_statistics WHERE stat_id = $id") === TRUE) echo json_encode(['success'=>true,'message'=>'Deleted']); else { http_response_code(500); echo json_encode(['success'=>false,'message'=>$conn->error]); }

} else { http_response_code(405); echo json_encode(['success'=>false,'message'=>'Method not allowed']); }

$conn->close();
?>