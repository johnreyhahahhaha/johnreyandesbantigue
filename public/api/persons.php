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

// Debug: Check if connection is valid
if (!$conn) {
    http_response_code(500);
    exit(json_encode(['success' => false, 'message' => 'Database connection not available']));
}

$request_method = $_SERVER['REQUEST_METHOD'];

if ($request_method === 'GET') {
    // Get all persons
    $query = "SELECT p.*, h.household_name FROM persons p 
              LEFT JOIN households h ON p.household_id = h.household_id
              ORDER BY p.person_id DESC";

    $result = $conn->query($query);

    if (!$result) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]);
        exit();
    }

    $persons = [];
    while ($row = $result->fetch_assoc()) {
        $persons[] = $row;
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $persons,
        'count' => count($persons)
    ]);

} elseif ($request_method === 'POST') {
    // Create new person
    $data = json_decode(file_get_contents("php://input"), true);

    if (!isset($data['first_name']) || !isset($data['last_name']) || !isset($data['gender']) || !isset($data['birth_date'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        exit();
    }

    $user_id = isset($data['user_id']) ? intval($data['user_id']) : null;
    $first_name = $conn->real_escape_string($data['first_name']);
    $middle_name = $conn->real_escape_string($data['middle_name'] ?? '');
    $last_name = $conn->real_escape_string($data['last_name']);
    $suffix = $conn->real_escape_string($data['suffix'] ?? '');
    $gender = $conn->real_escape_string($data['gender']);
    $birth_date = $conn->real_escape_string($data['birth_date']);
    $birth_place = $conn->real_escape_string($data['birth_place'] ?? '');
    $address = $conn->real_escape_string($data['address'] ?? '');
    $contact_no = $conn->real_escape_string($data['contact_no'] ?? '');
    $email = $conn->real_escape_string($data['email'] ?? '');
    $civil_status = $conn->real_escape_string($data['civil_status'] ?? 'Single');
    $household_id = isset($data['household_id']) && !empty($data['household_id']) ? intval($data['household_id']) : 'NULL';

    $query = "INSERT INTO persons (first_name, middle_name, last_name, suffix, gender, birth_date, birth_place, address, contact_no, email, civil_status, household_id, is_alive) 
              VALUES ('$first_name', '$middle_name', '$last_name', '$suffix', '$gender', '$birth_date', '$birth_place', '$address', '$contact_no', '$email', '$civil_status', $household_id, 1)";

    if ($conn->query($query) === TRUE) {
        $person_id = $conn->insert_id;
        
        // Log the action if user_id is valid
        if ($user_id && $user_id > 0) {
            $person_fullname = trim($first_name . ' ' . $middle_name . ' ' . $last_name);
            logCreate($user_id, 'persons', $person_fullname, $conn);
        }
        
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Person created successfully',
            'person_id' => $person_id
        ]);
    } else {
        error_log("persons.php INSERT failed - Query: $query");
        error_log("Database error: " . $conn->error);
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create person: ' . $conn->error]);
    }

} elseif ($request_method === 'DELETE') {
    // Delete a person
    $person_id = isset($_GET['person_id']) ? intval($_GET['person_id']) : null;
    $user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;

    if (!$person_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'person_id is required']);
        exit();
    }

    // Get person details for audit log before deletion
    $select_query = "SELECT first_name, middle_name, last_name FROM persons WHERE person_id = $person_id";
    $result = $conn->query($select_query);
    $person_data = $result ? $result->fetch_assoc() : null;

    // Delete the person
    $query = "DELETE FROM persons WHERE person_id = $person_id";

    if ($conn->query($query) === TRUE) {
        // Log the action if user_id is valid
        if ($user_id && $user_id > 0 && $person_data) {
            $person_fullname = trim($person_data['first_name'] . ' ' . $person_data['middle_name'] . ' ' . $person_data['last_name']);
            logDelete($user_id, 'persons', $person_id, $person_fullname, $conn);
        }

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Person deleted successfully'
        ]);
    } else {
        error_log("persons.php DELETE failed - Query: $query");
        error_log("Database error: " . $conn->error);
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete person: ' . $conn->error]);
    }
} elseif ($request_method === 'PUT') {
    // Update a person
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($data['person_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'person_id is required']);
        exit();
    }

    $person_id = intval($data['person_id']);
    $user_id = isset($data['user_id']) ? intval($data['user_id']) : null;
    
    $first_name = isset($data['first_name']) ? $conn->real_escape_string($data['first_name']) : null;
    $middle_name = isset($data['middle_name']) ? $conn->real_escape_string($data['middle_name']) : null;
    $last_name = isset($data['last_name']) ? $conn->real_escape_string($data['last_name']) : null;
    $suffix = isset($data['suffix']) ? $conn->real_escape_string($data['suffix']) : null;
    $gender = isset($data['gender']) ? $conn->real_escape_string($data['gender']) : null;
    $birth_date = isset($data['birth_date']) ? $conn->real_escape_string($data['birth_date']) : null;
    $birth_place = isset($data['birth_place']) ? $conn->real_escape_string($data['birth_place']) : null;
    $address = isset($data['address']) ? $conn->real_escape_string($data['address']) : null;
    $contact_no = isset($data['contact_no']) ? $conn->real_escape_string($data['contact_no']) : null;
    $email = isset($data['email']) ? $conn->real_escape_string($data['email']) : null;
    $civil_status = isset($data['civil_status']) ? $conn->real_escape_string($data['civil_status']) : null;
    $is_alive = isset($data['is_alive']) ? intval($data['is_alive']) : null;
    
    // Build update query dynamically
    $updates = [];
    if ($first_name !== null) $updates[] = "first_name = '$first_name'";
    if ($middle_name !== null) $updates[] = "middle_name = '$middle_name'";
    if ($last_name !== null) $updates[] = "last_name = '$last_name'";
    if ($suffix !== null) $updates[] = "suffix = '$suffix'";
    if ($gender !== null) $updates[] = "gender = '$gender'";
    if ($birth_date !== null) $updates[] = "birth_date = '$birth_date'";
    if ($birth_place !== null) $updates[] = "birth_place = '$birth_place'";
    if ($address !== null) $updates[] = "address = '$address'";
    if ($contact_no !== null) $updates[] = "contact_no = '$contact_no'";
    if ($email !== null) $updates[] = "email = '$email'";
    if ($civil_status !== null) $updates[] = "civil_status = '$civil_status'";
    if ($is_alive !== null) $updates[] = "is_alive = $is_alive";
    
    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit();
    }
    
    $query = "UPDATE persons SET " . implode(', ', $updates) . " WHERE person_id = $person_id";
    
    if ($conn->query($query) === TRUE) {
        // Log the action if user_id is valid
        if ($user_id && $user_id > 0) {
            $updated_name = ($first_name ?? '') . ' ' . ($middle_name ?? '') . ' ' . ($last_name ?? '');
            logUpdate($user_id, 'persons', $person_id, trim($updated_name), $conn);
        }
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Person updated successfully'
        ]);
    } else {
        error_log("persons.php UPDATE failed - Query: $query");
        error_log("Database error: " . $conn->error);
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update person: ' . $conn->error]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

$conn->close();
?>
