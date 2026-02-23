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
require_once 'audit.php';

header('Content-Type: application/json; charset=utf-8');

// Debug: Check if connection is valid
if (!$conn) {
    http_response_code(500);
    exit(json_encode(['success' => false, 'message' => 'Database connection not available']));
}

$request_method = $_SERVER['REQUEST_METHOD'];

if ($request_method === 'GET') {
    // Get sacrament records with type filter
    $type = isset($_GET['type']) ? $conn->real_escape_string($_GET['type']) : 'all';

    $query = null;

    if ($type === 'all') {
        $query = "SELECT 'Baptismal' as sacrament_type, b.*, p.first_name, p.last_name 
                  FROM baptismal_records b
                  LEFT JOIN persons p ON b.person_id = p.person_id
                  UNION ALL
                  SELECT 'Marriage' as sacrament_type, m.*, p.first_name, p.last_name 
                  FROM marriage_records m
                  LEFT JOIN persons p ON m.groom_id = p.person_id
                  UNION ALL
                  SELECT 'Confirmation' as sacrament_type, c.*, p.first_name, p.last_name 
                  FROM confirmation_records c
                  LEFT JOIN persons p ON c.person_id = p.person_id
                  UNION ALL
                  SELECT 'Burial' as sacrament_type, bu.*, p.first_name, p.last_name 
                  FROM burial_records bu
                  LEFT JOIN persons p ON bu.person_id = p.person_id
                  ORDER BY person_id DESC";
    } elseif ($type === 'baptismal' || $type === 'baptism') {
        $query = "SELECT 'Baptismal' as sacrament_type, b.*, p.first_name, p.last_name 
                  FROM baptismal_records b
                  LEFT JOIN persons p ON b.person_id = p.person_id
                  ORDER BY b.baptism_date DESC";
    } elseif ($type === 'marriage') {
        $query = "SELECT 'Marriage' as sacrament_type, m.*, p.first_name, p.last_name 
                  FROM marriage_records m
                  LEFT JOIN persons p ON m.groom_id = p.person_id
                  ORDER BY m.marriage_date DESC";
    } elseif ($type === 'confirmation') {
        $query = "SELECT 'Confirmation' as sacrament_type, c.*, p.first_name, p.last_name 
                  FROM confirmation_records c
                  LEFT JOIN persons p ON c.person_id = p.person_id
                  ORDER BY c.confirmation_date DESC";
    } elseif ($type === 'burial') {
        $query = "SELECT 'Burial' as sacrament_type, bu.*, p.first_name, p.last_name 
                  FROM burial_records bu
                  LEFT JOIN persons p ON bu.person_id = p.person_id
                  ORDER BY bu.burial_date DESC";
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid sacrament type: ' . htmlspecialchars($type)]);
        exit();
    }

    $result = $conn->query($query);

    if (!$result) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]);
        exit();
    }

    $records = [];
    while ($row = $result->fetch_assoc()) {
        $records[] = $row;
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $records,
        'count' => count($records)
    ]);

} elseif ($request_method === 'POST') {
    // Create new sacrament record
    $data = json_decode(file_get_contents("php://input"), true);
    $user_id = isset($data['user_id']) && intval($data['user_id']) > 0 ? intval($data['user_id']) : null;
    $type = $data['type'] ?? null;

    if (!$type) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing sacrament type']);
        exit();
    }

    if ($type === 'baptismal' || $type === 'baptism' || $type === 'baptisms') {
        // Create baptismal record
        if (!isset($data['person_id']) || !isset($data['baptism_date']) || !isset($data['priest_id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing required fields for baptism']);
            exit();
        }

        $person_id = intval($data['person_id']);
        $baptism_date = $conn->real_escape_string($data['baptism_date']);
        $priest_id = intval($data['priest_id']);
        $father_id = isset($data['father_id']) ? intval($data['father_id']) : 'NULL';
        $mother_id = isset($data['mother_id']) ? intval($data['mother_id']) : 'NULL';
        $book_no = isset($data['book_no']) ? intval($data['book_no']) : 0;
        $page_no = isset($data['page_no']) ? intval($data['page_no']) : 0;
        $line_no = isset($data['line_no']) ? intval($data['line_no']) : 0;
        $godparents = $conn->real_escape_string($data['godparents'] ?? '');
        $remarks = $conn->real_escape_string($data['remarks'] ?? '');

        $query = "INSERT INTO baptismal_records (person_id, baptism_date, priest_id, father_id, mother_id, book_no, page_no, line_no, godparents, remarks)
                  VALUES ($person_id, '$baptism_date', $priest_id, $father_id, $mother_id, $book_no, $page_no, $line_no, '$godparents', '$remarks')";

    } elseif ($type === 'marriage') {
        // Create marriage record
        if (!isset($data['groom_id']) || !isset($data['bride_id']) || !isset($data['marriage_date'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing required fields for marriage']);
            exit();
        }

        $groom_id = intval($data['groom_id']);
        $bride_id = intval($data['bride_id']);
        $marriage_date = $conn->real_escape_string($data['marriage_date']);
        $priest_id = isset($data['priest_id']) ? intval($data['priest_id']) : 'NULL';
        $license_no = $conn->real_escape_string($data['license_no'] ?? '');
        $witnesses = $conn->real_escape_string($data['witnesses'] ?? '');
        $book_no = isset($data['book_no']) ? intval($data['book_no']) : 0;
        $page_no = isset($data['page_no']) ? intval($data['page_no']) : 0;

        $query = "INSERT INTO marriage_records (groom_id, bride_id, marriage_date, priest_id, license_no, witnesses, book_no, page_no)
                  VALUES ($groom_id, $bride_id, '$marriage_date', $priest_id, '$license_no', '$witnesses', $book_no, $page_no)";

    } elseif ($type === 'confirmation') {
        // Create confirmation record
        if (!isset($data['person_id']) || !isset($data['confirmation_date'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing required fields for confirmation']);
            exit();
        }

        $person_id = intval($data['person_id']);
        $confirmation_date = $conn->real_escape_string($data['confirmation_date']);
        $confirming_bishop = $conn->real_escape_string($data['confirming_bishop'] ?? '');
        $sponsor_names = $conn->real_escape_string($data['sponsor_names'] ?? '');
        $registry_book_no = $conn->real_escape_string($data['registry_book_no'] ?? '');
        $page_no = isset($data['page_no']) ? intval($data['page_no']) : 'NULL';
        $entry_no = isset($data['entry_no']) ? intval($data['entry_no']) : 'NULL';

        $query = "INSERT INTO confirmation_records (person_id, confirmation_date, confirming_bishop, sponsor_names, registry_book_no, page_no, entry_no)
                  VALUES ($person_id, '$confirmation_date', '$confirming_bishop', '$sponsor_names', '$registry_book_no', $page_no, $entry_no)";

    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid sacrament type: ' . htmlspecialchars($type)]);
        exit();
    }

    if (isset($query) && $conn->query($query) === TRUE) {
        $insert_id = $conn->insert_id;
        
        // Log the action
        if ($user_id && $user_id > 0) {
            $log_type = $type ?? 'unknown';
            logAuditAction($user_id, 'CREATE', 'sacrament_records', "Created $log_type sacrament record (ID: $insert_id)", $conn);
        }
        
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Sacrament record created successfully',
            'id' => $insert_id
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create record: ' . $conn->error]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

$conn->close();
?>
