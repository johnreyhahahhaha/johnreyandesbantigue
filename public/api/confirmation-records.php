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
    $query = "SELECT cr.*, p.first_name, p.last_name
              FROM confirmation_records cr 
              LEFT JOIN persons p ON cr.person_id = p.person_id
              ORDER BY cr.confirmation_date DESC";
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
    
    if (!$input || !isset($input['person_id']) || !isset($input['confirmation_date'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields: person_id, confirmation_date']);
        exit();
    }

    $person_id = (int)$input['person_id'];
    $confirmation_date = $conn->real_escape_string($input['confirmation_date']);
    $confirming_bishop = $conn->real_escape_string($input['confirming_bishop'] ?? '');
    $sponsor_names = $conn->real_escape_string($input['sponsor_names'] ?? '');
    $registry_book_no = $conn->real_escape_string($input['registry_book_no'] ?? '');
    $page_no = isset($input['page_no']) ? (int)$input['page_no'] : 0;
    $entry_no = isset($input['entry_no']) ? (int)$input['entry_no'] : 0;

    $query = "INSERT INTO confirmation_records (person_id, confirmation_date, confirming_bishop, sponsor_names, registry_book_no, page_no, entry_no) 
              VALUES ($person_id, '$confirmation_date', '$confirming_bishop', '$sponsor_names', '$registry_book_no', $page_no, $entry_no)";
    
    if ($conn->query($query)) {
        $new_id = $conn->insert_id;
        syncSacramentParticipants($conn, 'confirmation', $new_id, $input);
        logAudit($conn, $_SESSION['user_id'] ?? 1, 'CREATE', 'confirmation_records', "Created confirmation record for person ID: $person_id");
        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Confirmation record created successfully', 'id' => $new_id]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create confirmation record: ' . $conn->error]);
    }

} elseif ($request_method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['confirmation_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing confirmation_id']);
        exit();
    }

    $confirmation_id = (int)$input['confirmation_id'];
    $updates = [];
    
    if (isset($input['person_id'])) {
        $updates[] = "person_id = " . (int)$input['person_id'];
    }
    if (isset($input['confirmation_date'])) {
        $updates[] = "confirmation_date = '" . $conn->real_escape_string($input['confirmation_date']) . "'";
    }
    if (isset($input['confirming_bishop'])) {
        $updates[] = "confirming_bishop = '" . $conn->real_escape_string($input['confirming_bishop']) . "'";
    }
    if (isset($input['sponsor_names'])) {
        $updates[] = "sponsor_names = '" . $conn->real_escape_string($input['sponsor_names']) . "'";
    }
    if (isset($input['registry_book_no'])) {
        $updates[] = "registry_book_no = '" . $conn->real_escape_string($input['registry_book_no']) . "'";
    }
    if (isset($input['page_no'])) {
        $updates[] = "page_no = " . (int)$input['page_no'];
    }
    if (isset($input['entry_no'])) {
        $updates[] = "entry_no = " . (int)$input['entry_no'];
    }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit();
    }

    $query = "UPDATE confirmation_records SET " . implode(', ', $updates) . " WHERE confirmation_id = $confirmation_id";
    
    if ($conn->query($query)) {
        if (isset($input['sponsor_names'])) {
            $record_result = $conn->query("SELECT person_id, sponsor_names FROM confirmation_records WHERE confirmation_id = $confirmation_id LIMIT 1");
            if ($record_result && ($record = $record_result->fetch_assoc())) {
                syncSacramentParticipants($conn, 'confirmation', $confirmation_id, $record);
            }
        }
        logAudit($conn, $_SESSION['user_id'] ?? 1, 'UPDATE', 'confirmation_records', "Updated confirmation record ID: $confirmation_id");
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Confirmation record updated successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update confirmation record: ' . $conn->error]);
    }

} elseif ($request_method === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['confirmation_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing confirmation_id']);
        exit();
    }

    $confirmation_id = (int)$input['confirmation_id'];

    $query = "DELETE FROM confirmation_records WHERE confirmation_id = $confirmation_id";
    
    if ($conn->query($query)) {
        logAudit($conn, $_SESSION['user_id'] ?? 1, 'DELETE', 'confirmation_records', "Deleted confirmation record ID: $confirmation_id");
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Confirmation record deleted successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete confirmation record: ' . $conn->error]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>