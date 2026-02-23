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
    // Get all file attachments
    $query = "SELECT fa.*, p.first_name, p.last_name FROM file_attachments fa
              LEFT JOIN persons p ON fa.person_id = p.person_id
              ORDER BY fa.file_id DESC";

    $result = $conn->query($query);

    if (!$result) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]);
        exit();
    }

    $files = [];
    while ($row = $result->fetch_assoc()) {
        $files[] = $row;
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $files,
        'count' => count($files)
    ]);
} elseif ($request_method === 'POST') {
    // Create file attachment with file upload
    
    // Check if file is uploaded
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No file uploaded or upload error']);
        exit();
    }

    // Get form data
    $record_type = $_POST['record_type'] ?? 'Person';
    $record_id = intval($_POST['record_id'] ?? 0);
    $person_id = intval($_POST['person_id'] ?? 0);
    $marriage_id = intval($_POST['marriage_id'] ?? 0);
    $baptism_id = intval($_POST['baptism_id'] ?? 0);
    $asset_id = intval($_POST['asset_id'] ?? 0);
    $file_name = $_POST['file_name'] ?? $_FILES['file']['name'];
    
    // Sanitize inputs
    $record_type = $conn->real_escape_string($record_type);
    $file_name = $conn->real_escape_string($file_name);
    
    // Create uploads directory if it doesn't exist
    $upload_dir = __DIR__ . '/../uploads/';
    if (!is_dir($upload_dir)) {
        mkdir($upload_dir, 0755, true);
    }
    
    // Generate safe filename with timestamp
    $file_ext = pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION);
    $safe_filename = preg_replace('/[^a-zA-Z0-9_\-]/', '_', pathinfo($file_name, PATHINFO_FILENAME));
    $file_path = 'uploads/' . time() . '_' . $safe_filename . '.' . $file_ext;
    $full_path = __DIR__ . '/../' . $file_path;
    
    // Validate file size (max 50MB)
    if ($_FILES['file']['size'] > 50 * 1024 * 1024) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'File size exceeds 50MB limit']);
        exit();
    }
    
    // Move uploaded file
    if (!move_uploaded_file($_FILES['file']['tmp_name'], $full_path)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to save file']);
        exit();
    }
    
    // Insert into database
    $person_id_val = $person_id > 0 ? $person_id : 'NULL';
    $marriage_id_val = $marriage_id > 0 ? $marriage_id : 'NULL';
    $baptism_id_val = $baptism_id > 0 ? $baptism_id : 'NULL';
    $asset_id_val = $asset_id > 0 ? $asset_id : 'NULL';
    
    $query = "INSERT INTO file_attachments (record_type, record_id, file_path, file_name, person_id, marriage_id, baptism_id, asset_id)
              VALUES ('$record_type', $record_id, '$file_path', '$file_name', $person_id_val, $marriage_id_val, $baptism_id_val, $asset_id_val)";

    if ($conn->query($query) === TRUE) {
        $file_id = $conn->insert_id;
        logAuditAction($_SESSION['user_id'] ?? 0, 'CREATE', 'file_attachments', "Uploaded file: $file_name", $conn);
        
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'File uploaded successfully',
            'file_id' => $file_id,
            'file_path' => $file_path
        ]);
    } else {
        // Delete the uploaded file if DB insertion fails
        if (file_exists($full_path)) {
            unlink($full_path);
        }
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to save file info: ' . $conn->error]);
    }
} elseif ($request_method === 'DELETE') {
    // Delete file attachment
    $file_id = isset($_GET['id']) ? intval($_GET['id']) : null;

    if (!$file_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'file_id is required']);
        exit();
    }

    // Get file path before deleting
    $query = "SELECT file_path FROM file_attachments WHERE file_id = $file_id";
    $result = $conn->query($query);
    $file_record = $result->fetch_assoc();

    // Delete from database
    $query = "DELETE FROM file_attachments WHERE file_id = $file_id";

    if ($conn->query($query) === TRUE) {
        // Delete actual file if it exists
        if ($file_record && !empty($file_record['file_path'])) {
            $file_path = __DIR__ . '/../' . $file_record['file_path'];
            if (file_exists($file_path)) {
                unlink($file_path);
            }
        }

        logAuditAction($_SESSION['user_id'] ?? 0, 'DELETE', 'file_attachments', "Deleted file attachment: $file_id", $conn);
        
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'File deleted successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete file: ' . $conn->error]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

$conn->close();
?>
