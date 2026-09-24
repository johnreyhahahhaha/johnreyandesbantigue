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
require_once 'sacrament-participants.php';

if (!$conn) {
    http_response_code(500);
    exit(json_encode(['success' => false, 'message' => 'Database connection not available']));
}

$request_method = $_SERVER['REQUEST_METHOD'];

if ($request_method === 'GET') {
    $query = "SELECT br.*, p.first_name, p.last_name, pr.first_name as priest_first, pr.last_name as priest_last, 
                     f.first_name as father_first, f.last_name as father_last,
                     m.first_name as mother_first, m.last_name as mother_last,
                     br.father_name, br.mother_name
              FROM baptismal_records br 
              LEFT JOIN persons p ON br.person_id = p.person_id
              LEFT JOIN persons pr ON br.priest_id = pr.person_id
              LEFT JOIN persons f ON br.father_id = f.person_id
              LEFT JOIN persons m ON br.mother_id = m.person_id
              ORDER BY br.baptism_date DESC";
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
    
    if (!$input || !isset($input['person_id']) || !isset($input['baptism_date']) || !isset($input['priest_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields: person_id, baptism_date, priest_id']);
        exit();
    }

    $person_id = (int)$input['person_id'];
    $baptism_date = $conn->real_escape_string($input['baptism_date']);
    $priest_id = (int)$input['priest_id'];
    $father_id = (isset($input['father_id']) && $input['father_id'] !== '' && intval($input['father_id']) > 0) ? (int)$input['father_id'] : "NULL";
    $mother_id = (isset($input['mother_id']) && $input['mother_id'] !== '' && intval($input['mother_id']) > 0) ? (int)$input['mother_id'] : "NULL";
    $father_name = isset($input['father_name']) ? trim((string)$input['father_name']) : '';
    $mother_name = isset($input['mother_name']) ? trim((string)$input['mother_name']) : '';
    $book_no = isset($input['book_no']) ? (int)$input['book_no'] : 0;
    $page_no = isset($input['page_no']) ? (int)$input['page_no'] : 0;
    $line_no = isset($input['line_no']) ? (int)$input['line_no'] : 0;
    $godparents = $conn->real_escape_string($input['godparents'] ?? '');
    $remarks = $conn->real_escape_string($input['remarks'] ?? '');

    $father_name_sql = $father_name !== '' ? "'" . $conn->real_escape_string($father_name) . "'" : "NULL";
    $mother_name_sql = $mother_name !== '' ? "'" . $conn->real_escape_string($mother_name) . "'" : "NULL";

    $query = "INSERT INTO baptismal_records (person_id, baptism_date, priest_id, father_id, mother_id, father_name, mother_name, book_no, page_no, line_no, godparents, remarks) 
              VALUES ($person_id, '$baptism_date', $priest_id, $father_id, $mother_id, $father_name_sql, $mother_name_sql, $book_no, $page_no, $line_no, '$godparents', '$remarks')";
    
    if ($conn->query($query)) {
        $new_id = $conn->insert_id;
        syncSacramentParticipants($conn, 'baptism', $new_id, $input);
        logAudit($conn, $_SESSION['user_id'] ?? 1, 'CREATE', 'baptismal_records', "Created baptismal record for person ID: $person_id");
        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Baptismal record created successfully', 'id' => $new_id]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create baptismal record: ' . $conn->error]);
    }

} elseif ($request_method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['baptism_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing baptism_id']);
        exit();
    }

    $baptism_id = (int)$input['baptism_id'];
    $updates = [];
    
    if (isset($input['person_id'])) {
        $updates[] = "person_id = " . (int)$input['person_id'];
    }
    if (isset($input['baptism_date'])) {
        $updates[] = "baptism_date = '" . $conn->real_escape_string($input['baptism_date']) . "'";
    }
    if (isset($input['priest_id'])) {
        $updates[] = "priest_id = " . (int)$input['priest_id'];
    }
    if (isset($input['father_id'])) {
        $father_id_value = (isset($input['father_id']) && $input['father_id'] !== '' && intval($input['father_id']) > 0) ? (int)$input['father_id'] : "NULL";
        $updates[] = "father_id = $father_id_value";
    }
    if (isset($input['father_name'])) {
        $father_name_value = trim((string)$input['father_name']);
        $updates[] = "father_name = " . ($father_name_value !== '' ? "'" . $conn->real_escape_string($father_name_value) . "'" : "NULL");
    }
    if (isset($input['mother_id'])) {
        $mother_id_value = (isset($input['mother_id']) && $input['mother_id'] !== '' && intval($input['mother_id']) > 0) ? (int)$input['mother_id'] : "NULL";
        $updates[] = "mother_id = $mother_id_value";
    }
    if (isset($input['mother_name'])) {
        $mother_name_value = trim((string)$input['mother_name']);
        $updates[] = "mother_name = " . ($mother_name_value !== '' ? "'" . $conn->real_escape_string($mother_name_value) . "'" : "NULL");
    }
    if (isset($input['book_no'])) {
        $updates[] = "book_no = " . (int)$input['book_no'];
    }
    if (isset($input['page_no'])) {
        $updates[] = "page_no = " . (int)$input['page_no'];
    }
    if (isset($input['line_no'])) {
        $updates[] = "line_no = " . (int)$input['line_no'];
    }
    if (isset($input['godparents'])) {
        $updates[] = "godparents = '" . $conn->real_escape_string($input['godparents']) . "'";
    }
    if (isset($input['remarks'])) {
        $updates[] = "remarks = '" . $conn->real_escape_string($input['remarks']) . "'";
    }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit();
    }

    $query = "UPDATE baptismal_records SET " . implode(', ', $updates) . " WHERE baptism_id = $baptism_id";
    
    if ($conn->query($query)) {
        if (isset($input['godparents'])) {
            $record_result = $conn->query("SELECT person_id, godparents FROM baptismal_records WHERE baptism_id = $baptism_id LIMIT 1");
            if ($record_result && ($record = $record_result->fetch_assoc())) {
                syncSacramentParticipants($conn, 'baptism', $baptism_id, $record);
            }
        }
        logAudit($conn, $_SESSION['user_id'] ?? 1, 'UPDATE', 'baptismal_records', "Updated baptismal record ID: $baptism_id");
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Baptismal record updated successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update baptismal record: ' . $conn->error]);
    }

} elseif ($request_method === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['baptism_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing baptism_id']);
        exit();
    }

    $baptism_id = (int)$input['baptism_id'];

    $query = "DELETE FROM baptismal_records WHERE baptism_id = $baptism_id";
    
    if ($conn->query($query)) {
        logAudit($conn, $_SESSION['user_id'] ?? 1, 'DELETE', 'baptismal_records', "Deleted baptismal record ID: $baptism_id");
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Baptismal record deleted successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete baptismal record: ' . $conn->error]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>