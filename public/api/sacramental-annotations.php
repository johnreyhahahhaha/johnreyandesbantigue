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
    // Get all sacramental annotations
    $query = "SELECT sa.*, p.first_name, p.last_name FROM sacramental_annotations sa
              LEFT JOIN persons p ON sa.person_id = p.person_id
              ORDER BY sa.date_recorded DESC";

    $result = $conn->query($query);

    if (!$result) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]);
        exit();
    }

    $annotations = [];
    while ($row = $result->fetch_assoc()) {
        $annotations[] = $row;
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $annotations,
        'count' => count($annotations)
    ]);
} elseif ($request_method === 'POST') {
    // Create sacramental annotation
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['person_id']) || !isset($data['annotation_text'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        exit();
    }

    $person_id = intval($data['person_id']);
    $annotation_text = $conn->real_escape_string($data['annotation_text']);

    $query = "INSERT INTO sacramental_annotations (person_id, annotation_text)
              VALUES ($person_id, '$annotation_text')";

    if ($conn->query($query) === TRUE) {
        $annotation_id = $conn->insert_id;
        logAuditAction($_SESSION['user_id'] ?? 0, 'CREATE', 'sacramental_annotations', "Added sacramental annotation for person_id: $person_id", $conn);
        
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Sacramental annotation created successfully',
            'annotation_id' => $annotation_id
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create sacramental annotation: ' . $conn->error]);
    }
} elseif ($request_method === 'PUT') {
    // Update sacramental annotation
    $data = json_decode(file_get_contents('php://input'), true);
    $annotation_id = isset($_GET['id']) ? intval($_GET['id']) : null;

    if (!$annotation_id || !isset($data['annotation_text'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        exit();
    }

    $annotation_text = $conn->real_escape_string($data['annotation_text']);
    $query = "UPDATE sacramental_annotations SET annotation_text = '$annotation_text' WHERE annotation_id = $annotation_id";

    if ($conn->query($query) === TRUE) {
        logAuditAction($_SESSION['user_id'] ?? 0, 'UPDATE', 'sacramental_annotations', "Updated sacramental annotation: $annotation_id", $conn);
        
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Sacramental annotation updated successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update sacramental annotation: ' . $conn->error]);
    }
} elseif ($request_method === 'DELETE') {
    // Delete sacramental annotation
    $annotation_id = isset($_GET['id']) ? intval($_GET['id']) : null;

    if (!$annotation_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'annotation_id is required']);
        exit();
    }

    $query = "DELETE FROM sacramental_annotations WHERE annotation_id = $annotation_id";

    if ($conn->query($query) === TRUE) {
        logAuditAction($_SESSION['user_id'] ?? 0, 'DELETE', 'sacramental_annotations', "Deleted sacramental annotation: $annotation_id", $conn);
        
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Sacramental annotation deleted successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete sacramental annotation: ' . $conn->error]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

$conn->close();
?>
