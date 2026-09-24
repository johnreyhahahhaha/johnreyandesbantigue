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

function ensureAnnouncementsSchema($conn) {
    $columns = [];
    $result = $conn->query("SHOW COLUMNS FROM announcements");
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $columns[$row['Field']] = true;
        }
    }

    if (!isset($columns['category'])) {
        $conn->query("ALTER TABLE announcements ADD COLUMN category varchar(100) DEFAULT 'General' AFTER content");
    }
    if (!isset($columns['status'])) {
        $conn->query("ALTER TABLE announcements ADD COLUMN status varchar(50) DEFAULT 'Active' AFTER category");
    }
}

ensureAnnouncementsSchema($conn);

$request_method = $_SERVER['REQUEST_METHOD'];

if ($request_method === 'GET') {
    $query = "SELECT a.*, p.first_name, p.last_name FROM announcements a 
              LEFT JOIN persons p ON a.created_by = p.person_id
              ORDER BY a.created_at DESC";
    $result = $conn->query($query);

    if (!$result) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]);
        exit();
    }

    $data = [];
    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $data,
        'count' => count($data)
    ]);

} elseif ($request_method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['title']) || !isset($input['content'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields: title, content']);
        exit();
    }

    $title = $conn->real_escape_string($input['title']);
    $content = $conn->real_escape_string($input['content']);
    $category = isset($input['category']) ? $conn->real_escape_string($input['category']) : 'General';
    $status = isset($input['status']) ? $conn->real_escape_string($input['status']) : 'Active';
    $created_by = $input['created_by'] ?? ($_SESSION['user_id'] ?? 1);

    $query = "INSERT INTO announcements (title, content, category, status, created_by) VALUES ('$title', '$content', '$category', '$status', $created_by)";
    
    if ($conn->query($query)) {
        $new_id = $conn->insert_id;
        logAudit($conn, $created_by, 'CREATE', 'announcements', "Created announcement: $title");
        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Announcement created successfully', 'id' => $new_id]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create announcement: ' . $conn->error]);
    }

} elseif ($request_method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['announcement_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing announcement_id']);
        exit();
    }

    $announcement_id = (int)$input['announcement_id'];
    $updates = [];
    
    if (isset($input['title'])) {
        $updates[] = "title = '" . $conn->real_escape_string($input['title']) . "'";
    }
    if (isset($input['content'])) {
        $updates[] = "content = '" . $conn->real_escape_string($input['content']) . "'";
    }
    if (isset($input['category'])) {
        $updates[] = "category = '" . $conn->real_escape_string($input['category']) . "'";
    }
    if (isset($input['status'])) {
        $updates[] = "status = '" . $conn->real_escape_string($input['status']) . "'";
    }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit();
    }

    $query = "UPDATE announcements SET " . implode(', ', $updates) . " WHERE announcement_id = $announcement_id";
    
    if ($conn->query($query)) {
        logAudit($conn, $_SESSION['user_id'] ?? 1, 'UPDATE', 'announcements', "Updated announcement ID: $announcement_id");
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Announcement updated successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update announcement: ' . $conn->error]);
    }

} elseif ($request_method === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['announcement_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing announcement_id']);
        exit();
    }

    $announcement_id = (int)$input['announcement_id'];

    $query = "DELETE FROM announcements WHERE announcement_id = $announcement_id";
    
    if ($conn->query($query)) {
        logAudit($conn, $_SESSION['user_id'] ?? 1, 'DELETE', 'announcements', "Deleted announcement ID: $announcement_id");
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Announcement deleted successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete announcement: ' . $conn->error]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>