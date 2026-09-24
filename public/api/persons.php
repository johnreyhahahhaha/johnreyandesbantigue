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

// Ensure fatal errors still return JSON instead of empty HTML
register_shutdown_function(function() {
    $err = error_get_last();
    if ($err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=utf-8');
        }
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Server error: ' . ($err['message'] ?? 'Fatal error')]);
    }
});

// Debug: Check if connection is valid
if (!$conn) {
    http_response_code(500);
    exit(json_encode(['success' => false, 'message' => 'Database connection not available']));
}

$request_method = $_SERVER['REQUEST_METHOD'];

if ($request_method === 'GET') {
    // Get all persons, or a single person when person_id is provided
    $person_id = isset($_GET['person_id']) ? intval($_GET['person_id']) : null;
    $where_clause = $person_id ? "WHERE p.person_id = $person_id" : "";
    $query = "SELECT p.*, h.household_name FROM persons p 
              LEFT JOIN households h ON p.household_id = h.household_id
              $where_clause
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
    $rawInput = file_get_contents("php://input");

    if ($rawInput === false || $rawInput === null || trim($rawInput) === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Empty request body']);
        exit();
    }

    $data = json_decode($rawInput, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid JSON input: ' . json_last_error_msg()]);
        exit();
    }

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

    $duplicate_person_query = "SELECT person_id FROM persons WHERE first_name = '$first_name' AND middle_name = '$middle_name' AND last_name = '$last_name' AND suffix = '$suffix' AND birth_date = '$birth_date' AND gender = '$gender' LIMIT 1";
    $duplicate_person_result = $conn->query($duplicate_person_query);
    if ($duplicate_person_result && $duplicate_person_result->num_rows > 0) {
        $existing_person = $duplicate_person_result->fetch_assoc();
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'duplicate' => true,
            'message' => 'Person already exists. Reused the existing record.',
            'person_id' => (int)$existing_person['person_id']
        ]);
        exit();
    }
    $birth_place = $conn->real_escape_string($data['birth_place'] ?? '');
    $address = $conn->real_escape_string($data['address'] ?? '');
    $contact_no = $conn->real_escape_string($data['contact_no'] ?? '');
    $email = $conn->real_escape_string($data['email'] ?? '');
    $civil_status = $conn->real_escape_string($data['civil_status'] ?? 'Single');
    $religion = $conn->real_escape_string($data['religion'] ?? 'Roman Catholic');
    $nationality = $conn->real_escape_string($data['nationality'] ?? 'Filipino');
    $occupation = $conn->real_escape_string($data['occupation'] ?? '');
    $priest_license_no = $conn->real_escape_string($data['priest_license_no'] ?? '');
    $ordination_date = isset($data['ordination_date']) && !empty($data['ordination_date']) ? $conn->real_escape_string($data['ordination_date']) : null;
    $priest_signature = isset($data['priest_signature']) && !empty($data['priest_signature']) ? $data['priest_signature'] : '';
    
    // Validate priest_signature size (max 2MB as base64)
    if (!empty($priest_signature)) {
        $signature_size = strlen($priest_signature);
        if ($signature_size > 2 * 1024 * 1024) {
            http_response_code(413);
            echo json_encode(['success' => false, 'message' => 'Signature image is too large. Maximum size is 2MB.']);
            exit();
        }
        // Ensure it's a valid base64 data URI
        if (!preg_match('/^data:image\//', $priest_signature)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid signature format. Must be an image.']);
            exit();
        }
        $priest_signature = $conn->real_escape_string($priest_signature);
    } else {
        $priest_signature = '';
    }
    $is_alive = isset($data['is_alive']) ? intval($data['is_alive']) : 1;
    $household_id = isset($data['household_id']) && $data['household_id'] !== '' ? intval($data['household_id']) : null;
    $household_id_sql = $household_id !== null ? $household_id : 'NULL';
    $email_sql = $email !== '' ? "'$email'" : 'NULL';
    $ordination_date_sql = $ordination_date ? "'$ordination_date'" : "NULL";
    
    $query = "INSERT INTO persons (first_name, middle_name, last_name, suffix, gender, birth_date, birth_place, address, contact_no, email, civil_status, household_id, is_alive, religion, nationality, occupation, priest_license_no, ordination_date, priest_signature) 
              VALUES ('$first_name', '$middle_name', '$last_name', '$suffix', '$gender', '$birth_date', '$birth_place', '$address', '$contact_no', $email_sql, '$civil_status', $household_id_sql, $is_alive, '$religion', '$nationality', '$occupation', '$priest_license_no', $ordination_date_sql, '$priest_signature')";

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
        $error_msg = $conn->error;
        error_log("persons.php INSERT failed - Query: $query");
        error_log("Database error: " . $error_msg);
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create person: ' . $error_msg]);
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

    // Check if person is a system user - cannot delete system users
    $user_check_query = "SELECT user_id FROM system_users WHERE person_id = $person_id";
    $user_result = $conn->query($user_check_query);
    if ($user_result && $user_result->num_rows > 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Cannot delete person who is a system user']);
        exit();
    }

    // Get person details for audit log before deletion
    $select_query = "SELECT first_name, middle_name, last_name FROM persons WHERE person_id = $person_id";
    $result = $conn->query($select_query);
    $person_data = $result ? $result->fetch_assoc() : null;

    // Start transaction to ensure data integrity
    $conn->begin_transaction();

    try {
        // First, update all foreign key references to NULL or delete related records
        // This prevents foreign key constraint violations

        // Update donations to remove person reference (keep the donation record)
        $conn->query("UPDATE donations SET person_id = NULL WHERE person_id = $person_id");

        // Update document requests to remove person reference
        $conn->query("UPDATE document_requests SET person_id = NULL WHERE person_id = $person_id");

        // Update baptismal records to remove person references
        $conn->query("UPDATE baptismal_records SET person_id = NULL WHERE person_id = $person_id");
        // Delete baptismal records where person is the priest (since priest_id is NOT NULL)
        $conn->query("DELETE FROM baptismal_records WHERE priest_id = $person_id");
        $conn->query("UPDATE baptismal_records SET father_id = NULL WHERE father_id = $person_id");
        $conn->query("UPDATE baptismal_records SET mother_id = NULL WHERE mother_id = $person_id");

        // Update marriage records to remove person references
        // Delete marriage records where person is groom or bride (since groom_id/bride_id are NOT NULL)
        $conn->query("DELETE FROM marriage_records WHERE groom_id = $person_id OR bride_id = $person_id");
        $conn->query("UPDATE marriage_records SET priest_id = NULL WHERE priest_id = $person_id");

        // Update burial records to remove person references
        $conn->query("UPDATE burial_records SET person_id = NULL WHERE person_id = $person_id");
        $conn->query("UPDATE burial_records SET priest_id = NULL WHERE priest_id = $person_id");

        // Update confirmation records to remove person reference
        $conn->query("UPDATE confirmation_records SET person_id = NULL WHERE person_id = $person_id");

        // Update cemetery records to remove deceased reference
        $conn->query("UPDATE cemetery_records SET deceased_id = NULL WHERE deceased_id = $person_id");

    // Update parish schedules to remove priest assignment
    $conn->query("UPDATE parish_schedules SET assigned_priest = NULL WHERE assigned_priest = $person_id");
        $conn->query("DELETE FROM beneficiary_logs WHERE person_id = $person_id");
        $conn->query("DELETE FROM mass_intentions WHERE person_id = $person_id");
        $conn->query("DELETE FROM notification_logs WHERE person_id = $person_id");
        $conn->query("DELETE FROM parish_volunteers WHERE person_id = $person_id");
        $conn->query("DELETE FROM file_attachments WHERE person_id = $person_id");
        $conn->query("DELETE FROM chat_messages WHERE sender_id = $person_id OR recipient_id = $person_id");

        // Finally, delete the person
        $query = "DELETE FROM persons WHERE person_id = $person_id";
        if (!$conn->query($query)) {
            throw new Exception("Failed to delete person: " . $conn->error);
        }

        // Commit transaction
        $conn->commit();

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

    } catch (Exception $e) {
        // Rollback transaction on error
        $conn->rollback();

        error_log("persons.php DELETE failed - Person ID: $person_id - Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete person: ' . $e->getMessage()]);
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
    $religion = isset($data['religion']) ? $conn->real_escape_string($data['religion']) : null;
    $nationality = isset($data['nationality']) ? $conn->real_escape_string($data['nationality']) : null;
    $occupation = isset($data['occupation']) ? $conn->real_escape_string($data['occupation']) : null;
    $priest_license_no = isset($data['priest_license_no']) ? $conn->real_escape_string($data['priest_license_no']) : null;
    $ordination_date = isset($data['ordination_date']) ? $conn->real_escape_string($data['ordination_date']) : null;
    
    // Handle priest_signature with validation
    $priest_signature = null;
    if (isset($data['priest_signature'])) {
        if (!empty($data['priest_signature'])) {
            $signature_size = strlen($data['priest_signature']);
            if ($signature_size > 2 * 1024 * 1024) {
                http_response_code(413);
                echo json_encode(['success' => false, 'message' => 'Signature image is too large. Maximum size is 2MB.']);
                exit();
            }
            // Ensure it's a valid base64 data URI
            if (!preg_match('/^data:image\//', $data['priest_signature'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Invalid signature format. Must be an image.']);
                exit();
            }
            $priest_signature = $conn->real_escape_string($data['priest_signature']);
        } else {
            $priest_signature = ''; // Allow empty string to clear signature
        }
    }
    
    $is_alive = isset($data['is_alive']) ? intval($data['is_alive']) : null;
    $household_id = isset($data['household_id']) ? ($data['household_id'] === '' ? null : intval($data['household_id'])) : null;
    
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
    if ($email !== null) $updates[] = $email === '' ? "email = NULL" : "email = '$email'";
    if ($civil_status !== null) $updates[] = "civil_status = '$civil_status'";
    if ($religion !== null) $updates[] = "religion = '$religion'";
    if ($nationality !== null) $updates[] = "nationality = '$nationality'";
    if ($occupation !== null) $updates[] = "occupation = '$occupation'";
    if ($priest_license_no !== null) $updates[] = "priest_license_no = '$priest_license_no'";
    if ($ordination_date !== null) $updates[] = "ordination_date = '$ordination_date'";
    if ($priest_signature !== null) $updates[] = "priest_signature = '$priest_signature'";
    if ($household_id !== null) {
        $updates[] = "household_id = $household_id";
    } elseif (isset($data['household_id']) && $data['household_id'] === '') {
        $updates[] = "household_id = NULL";
    }
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
