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
    $person_id = isset($_GET['person_id']) ? intval($_GET['person_id']) : null;
    $where_clause = $person_id ? "WHERE mr.groom_id = $person_id OR mr.bride_id = $person_id" : "";
    $query = "SELECT mr.*, g.first_name as groom_first, g.last_name as groom_last, 
                     b.first_name as bride_first, b.last_name as bride_last,
                                         p.first_name as priest_first, p.last_name as priest_last,
                                         (SELECT le.livestream_id FROM livestream_events le
                                            WHERE le.event_reference_type = 'marriage_records'
                                                AND le.event_reference_id = mr.marriage_id
                                            ORDER BY le.created_at DESC LIMIT 1) as ceremony_livestream_id,
                                         (SELECT le.streaming_url FROM livestream_events le
                                            WHERE le.event_reference_type = 'marriage_records'
                                                AND le.event_reference_id = mr.marriage_id
                                            ORDER BY le.created_at DESC LIMIT 1) as ceremony_streaming_url,
                                         (SELECT lr.recording_url FROM livestream_recordings lr
                                            INNER JOIN livestream_events le ON le.livestream_id = lr.livestream_id
                                            WHERE le.event_reference_type = 'marriage_records'
                                                AND le.event_reference_id = mr.marriage_id
                                                AND lr.is_available = 1
                                            ORDER BY lr.created_at DESC LIMIT 1) as ceremony_recording_url
              FROM marriage_records mr 
              LEFT JOIN persons g ON mr.groom_id = g.person_id
              LEFT JOIN persons b ON mr.bride_id = b.person_id
              LEFT JOIN persons p ON mr.priest_id = p.person_id
              $where_clause
              ORDER BY mr.marriage_date DESC";
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
    
    if (!$input || !isset($input['groom_id']) || !isset($input['bride_id']) || !isset($input['marriage_date'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields: groom_id, bride_id, marriage_date']);
        exit();
    }

    $groom_id = (int)$input['groom_id'];
    $bride_id = (int)$input['bride_id'];
    $marriage_date = $conn->real_escape_string($input['marriage_date']);
    $priest_id = isset($input['priest_id']) && $input['priest_id'] !== '' ? (int)$input['priest_id'] : "NULL";
    $license_no = $conn->real_escape_string($input['license_no'] ?? '');
    $witnesses = $conn->real_escape_string($input['witnesses'] ?? '');
    $book_no = isset($input['book_no']) && $input['book_no'] !== '' ? (int)$input['book_no'] : 0;
    $page_no = isset($input['page_no']) && $input['page_no'] !== '' ? (int)$input['page_no'] : 0;
    $banns_date = isset($input['banns_date']) && $input['banns_date'] !== '' ? "'" . $conn->real_escape_string($input['banns_date']) . "'" : "NULL";
    $civil_marriage_info = isset($input['civil_marriage_info']) && $input['civil_marriage_info'] !== '' ? $conn->real_escape_string($input['civil_marriage_info']) : "NULL";
    $groom_status = $conn->real_escape_string($input['groom_status'] ?? 'Married');
    $bride_status = $conn->real_escape_string($input['bride_status'] ?? 'Married');

    $query = "INSERT INTO marriage_records (groom_id, bride_id, marriage_date, priest_id, license_no, witnesses, book_no, page_no, banns_date, civil_marriage_info, groom_status, bride_status) 
              VALUES ($groom_id, $bride_id, '$marriage_date', $priest_id, '$license_no', '$witnesses', $book_no, $page_no, $banns_date, '$civil_marriage_info', '$groom_status', '$bride_status')";
    
    if ($conn->query($query)) {
        $new_id = $conn->insert_id;
        syncSacramentParticipants($conn, 'marriage', $new_id, $input);
        $statusUpdate = "UPDATE persons SET civil_status = 'Married' WHERE person_id IN ($groom_id, $bride_id)";
        $conn->query($statusUpdate);
        logAudit($conn, $_SESSION['user_id'] ?? 1, 'CREATE', 'marriage_records', "Created marriage record for groom ID: $groom_id and bride ID: $bride_id");
        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Marriage record created successfully', 'id' => $new_id]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create marriage record: ' . $conn->error]);
    }

} elseif ($request_method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['marriage_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing marriage_id']);
        exit();
    }

    $marriage_id = (int)$input['marriage_id'];
    $updates = [];
    
    if (isset($input['groom_id'])) {
        $updates[] = "groom_id = " . (int)$input['groom_id'];
    }
    if (isset($input['bride_id'])) {
        $updates[] = "bride_id = " . (int)$input['bride_id'];
    }
    if (isset($input['marriage_date'])) {
        $updates[] = "marriage_date = '" . $conn->real_escape_string($input['marriage_date']) . "'";
    }
    if (isset($input['priest_id'])) {
        $updates[] = "priest_id = " . (int)$input['priest_id'];
    }
    if (isset($input['license_no'])) {
        $updates[] = "license_no = '" . $conn->real_escape_string($input['license_no']) . "'";
    }
    if (isset($input['witnesses'])) {
        $updates[] = "witnesses = '" . $conn->real_escape_string($input['witnesses']) . "'";
    }
    if (isset($input['book_no'])) {
        $updates[] = "book_no = " . (int)$input['book_no'];
    }
    if (isset($input['page_no'])) {
        $updates[] = "page_no = " . (int)$input['page_no'];
    }
    if (isset($input['banns_date'])) {
        $updates[] = "banns_date = '" . $conn->real_escape_string($input['banns_date']) . "'";
    }
    if (isset($input['civil_marriage_info'])) {
        $updates[] = "civil_marriage_info = '" . $conn->real_escape_string($input['civil_marriage_info']) . "'";
    }
    if (isset($input['groom_status'])) {
        $updates[] = "groom_status = '" . $conn->real_escape_string($input['groom_status']) . "'";
    }
    if (isset($input['bride_status'])) {
        $updates[] = "bride_status = '" . $conn->real_escape_string($input['bride_status']) . "'";
    }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit();
    }

    $query = "UPDATE marriage_records SET " . implode(', ', $updates) . " WHERE marriage_id = $marriage_id";
    
    if ($conn->query($query)) {
        if (isset($input['witnesses']) || isset($input['groom_id']) || isset($input['bride_id'])) {
            $record_result = $conn->query("SELECT groom_id, bride_id, witnesses FROM marriage_records WHERE marriage_id = $marriage_id LIMIT 1");
            if ($record_result && ($record = $record_result->fetch_assoc())) {
                syncSacramentParticipants($conn, 'marriage', $marriage_id, $record);
            }
        }
        logAudit($conn, $_SESSION['user_id'] ?? 1, 'UPDATE', 'marriage_records', "Updated marriage record ID: $marriage_id");
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Marriage record updated successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update marriage record: ' . $conn->error]);
    }

} elseif ($request_method === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['marriage_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing marriage_id']);
        exit();
    }

    $marriage_id = (int)$input['marriage_id'];

    $query = "DELETE FROM marriage_records WHERE marriage_id = $marriage_id";
    
    if ($conn->query($query)) {
        logAudit($conn, $_SESSION['user_id'] ?? 1, 'DELETE', 'marriage_records', "Deleted marriage record ID: $marriage_id");
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Marriage record deleted successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete marriage record: ' . $conn->error]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>