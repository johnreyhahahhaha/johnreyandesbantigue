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

header('Content-Type: application/json; charset=utf-8');

// Debug: Check if connection is valid
if (!$conn) {
    http_response_code(500);
    exit(json_encode(['success' => false, 'message' => 'Database connection not available']));
}

$request_method = $_SERVER['REQUEST_METHOD'];
$type = isset($_GET['type']) ? $conn->real_escape_string($_GET['type']) : 'volunteers';

if ($request_method === 'GET') {
    $query = null;
    
    if ($type === 'volunteers') {
        // Get parish volunteers
        $query = "SELECT pv.*, p.first_name, p.last_name, m.ministry_name
                  FROM parish_volunteers pv
                  LEFT JOIN persons p ON pv.person_id = p.person_id
                  LEFT JOIN ministries m ON pv.ministry_id = m.ministry_id
                  ORDER BY pv.volunteer_id DESC";
    } elseif ($type === 'ministries') {
        // Get ministries
        $query = "SELECT * FROM ministries ORDER BY ministry_id DESC";
    } elseif ($type === 'programs') {
        // Get social programs
        $query = "SELECT sp.*, 
                  (SELECT COUNT(*) FROM beneficiary_logs WHERE program_id = sp.program_id) as beneficiary_count
                  FROM social_programs sp
                  ORDER BY sp.program_id DESC";
    } elseif ($type === 'community_aid' || $type === 'beneficiaries') {
        // Get beneficiary logs / community aid
        $query = "SELECT bl.*, p.first_name, p.last_name, sp.program_name
                  FROM beneficiary_logs bl
                  LEFT JOIN persons p ON bl.person_id = p.person_id
                  LEFT JOIN social_programs sp ON bl.program_id = sp.program_id
                  ORDER BY bl.date_given DESC";
    } elseif ($type === 'activities') {
        // Get community activities
        $query = "SELECT ca.*, p.first_name, p.last_name, m.ministry_name, sp.program_name
                  FROM community_activities ca
                  LEFT JOIN persons p ON ca.coordinator_id = p.person_id
                  LEFT JOIN ministries m ON ca.ministry_id = m.ministry_id
                  LEFT JOIN social_programs sp ON ca.program_id = sp.program_id
                  ORDER BY ca.created_at DESC";
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid type: ' . htmlspecialchars($type)]);
        exit();
    }

    if (!$query) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Query could not be constructed']);
        exit();
    }

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
    // Create new record based on type
    $data = json_decode(file_get_contents("php://input"), true);
    $user_id = isset($data['user_id']) && intval($data['user_id']) > 0 ? intval($data['user_id']) : null;

    if ($type === 'volunteers') {
        if (!isset($data['person_id']) || !isset($data['ministry_id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing required fields']);
            exit();
        }

        $person_id = intval($data['person_id']);
        $ministry_id = intval($data['ministry_id']);
        $role = $conn->real_escape_string($data['role'] ?? 'Member');
        $date_joined = $conn->real_escape_string($data['date_joined'] ?? date('Y-m-d'));
        $status = $conn->real_escape_string($data['status'] ?? 'Active');

        $existing_check = $conn->query("SELECT volunteer_id FROM parish_volunteers WHERE person_id = $person_id AND ministry_id = $ministry_id LIMIT 1");
        if ($existing_check && $existing_check->num_rows > 0) {
            http_response_code(200);
            echo json_encode(['success' => true, 'message' => 'Already joined this ministry', 'duplicate' => true]);
            exit();
        }

        $query = "INSERT INTO parish_volunteers (person_id, ministry_id, role, date_joined, status)
                  VALUES ($person_id, $ministry_id, '$role', '$date_joined', '$status')";
        $table_name = 'parish_volunteers';
        $log_desc = "Added volunteer (Person ID: $person_id, Ministry ID: $ministry_id)";
    } elseif ($type === 'programs') {
        if (!isset($data['program_name']) || !isset($data['budget'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing required fields']);
            exit();
        }

        $program_name = $conn->real_escape_string($data['program_name']);
        $objective = $conn->real_escape_string($data['objective'] ?? '');
        $budget = floatval($data['budget']);

        $query = "INSERT INTO social_programs (program_name, objective, budget)
                  VALUES ('$program_name', '$objective', $budget)";
        $table_name = 'social_programs';
        $log_desc = "Added program: $program_name";
    } elseif ($type === 'activities') {
        if (!isset($data['activity_name']) || !isset($data['activity_type'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing required fields: activity_name, activity_type']);
            exit();
        }

        $activity_name = $conn->real_escape_string($data['activity_name']);
        $activity_type = $conn->real_escape_string($data['activity_type']);
        $description = $conn->real_escape_string($data['description'] ?? '');
        $ministry_id = isset($data['ministry_id']) && $data['ministry_id'] ? intval($data['ministry_id']) : 'NULL';
        $program_id = isset($data['program_id']) && $data['program_id'] ? intval($data['program_id']) : 'NULL';
        $coordinator_id = isset($data['coordinator_id']) && $data['coordinator_id'] ? intval($data['coordinator_id']) : 'NULL';
        $start_date = isset($data['start_date']) && $data['start_date'] ? "'" . $conn->real_escape_string($data['start_date']) . "'" : 'NULL';
        $end_date = isset($data['end_date']) && $data['end_date'] ? "'" . $conn->real_escape_string($data['end_date']) . "'" : 'NULL';
        $status = $conn->real_escape_string($data['status'] ?? 'planned');
        $budget_allocated = floatval($data['budget_allocated'] ?? 0);
        $beneficiaries_target = intval($data['beneficiaries_target'] ?? 0);
        $beneficiaries_served = intval($data['beneficiaries_served'] ?? 0);
        $notes = $conn->real_escape_string($data['notes'] ?? '');

        $query = "INSERT INTO community_activities (activity_name, activity_type, description, ministry_id, program_id, coordinator_id, start_date, end_date, status, budget_allocated, beneficiaries_target, beneficiaries_served, notes)
                  VALUES ('$activity_name', '$activity_type', '$description', $ministry_id, $program_id, $coordinator_id, $start_date, $end_date, '$status', $budget_allocated, $beneficiaries_target, $beneficiaries_served, '$notes')";
        $table_name = 'community_activities';
        $log_desc = "Added activity: $activity_name";
    }

    if (isset($query) && $conn->query($query) === TRUE) {
        $insert_id = $conn->insert_id;
        
        // Log the action
        if ($user_id && $user_id > 0 && isset($table_name) && isset($log_desc)) {
            logAuditAction($user_id, 'CREATE', $table_name, $log_desc, $conn);
        }
        
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Record created successfully',
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
