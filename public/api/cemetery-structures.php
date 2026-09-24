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
    $query = "SELECT cs.*, cs2.section_name, p.first_name, p.last_name 
              FROM cemetery_structures cs 
              LEFT JOIN cemetery_sections cs2 ON cs.section_id = cs2.section_id
              LEFT JOIN persons p ON cs.current_occupant_id = p.person_id
              ORDER BY cs.block_name, cs.level_number, cs.niche_number ASC";
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
    
    if (!$input || !isset($input['block_name']) || !isset($input['level_number']) || !isset($input['niche_number'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields: block_name, level_number, niche_number']);
        exit();
    }

    $block_name = $conn->real_escape_string($input['block_name']);
    $level_number = (int)$input['level_number'];
    $niche_number = $conn->real_escape_string($input['niche_number']);
    $status = $input['status'] ?? 'Vacant';
    $current_occupant_id = isset($input['current_occupant_id']) ? (int)$input['current_occupant_id'] : "NULL";
    $section_id = isset($input['section_id']) ? (int)$input['section_id'] : "NULL";

    $query = "INSERT INTO cemetery_structures (block_name, level_number, niche_number, status, current_occupant_id, section_id) 
              VALUES ('$block_name', $level_number, '$niche_number', '$status', $current_occupant_id, $section_id)";
    
    if ($conn->query($query)) {
        $new_id = $conn->insert_id;
        logAuditAction($_SESSION['user_id'] ?? 1, 'CREATE', 'cemetery_structures', "Created cemetery structure: $block_name $niche_number", $conn);
        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Cemetery structure created successfully', 'id' => $new_id]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create cemetery structure: ' . $conn->error]);
    }

} elseif ($request_method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['struct_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing struct_id']);
        exit();
    }

    $struct_id = (int)$input['struct_id'];
    $updates = [];
    
    if (isset($input['block_name'])) {
        $updates[] = "block_name = '" . $conn->real_escape_string($input['block_name']) . "'";
    }
    if (isset($input['level_number'])) {
        $updates[] = "level_number = " . (int)$input['level_number'];
    }
    if (isset($input['niche_number'])) {
        $updates[] = "niche_number = '" . $conn->real_escape_string($input['niche_number']) . "'";
    }
    if (isset($input['status'])) {
        $updates[] = "status = '" . $conn->real_escape_string($input['status']) . "'";
    }
    if (isset($input['current_occupant_id'])) {
        $current_occupant_id = (int)$input['current_occupant_id'];
        if ($current_occupant_id > 0) {
            $updates[] = "current_occupant_id = $current_occupant_id";
        } else {
            $updates[] = "current_occupant_id = NULL";
        }
    }
    if (isset($input['section_id'])) {
        $section_id_val = (int)$input['section_id'];
        if ($section_id_val > 0) {
            $updates[] = "section_id = $section_id_val";
        } else {
            $updates[] = "section_id = NULL";
        }
    }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit();
    }

    $query = "UPDATE cemetery_structures SET " . implode(', ', $updates) . " WHERE struct_id = $struct_id";
    $user_id = $_SESSION['user_id'] ?? 1;
    
    if ($conn->query($query)) {
        logAuditAction($user_id, 'UPDATE', 'cemetery_structures', "Updated cemetery structure ID: $struct_id", $conn);
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Cemetery structure updated successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update cemetery structure: ' . $conn->error]);
    }

} elseif ($request_method === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['struct_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing struct_id']);
        exit();
    }

    $struct_id = (int)$input['struct_id'];

    $query = "DELETE FROM cemetery_structures WHERE struct_id = $struct_id";
    
    if ($conn->query($query)) {
        logAuditAction($_SESSION['user_id'] ?? 1, 'DELETE', 'cemetery_structures', "Deleted cemetery structure ID: $struct_id", $conn);
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Cemetery structure deleted successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete cemetery structure: ' . $conn->error]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>