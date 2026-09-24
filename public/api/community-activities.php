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
    // Get all community activities
    $query = "SELECT ca.*, p.first_name, p.last_name, m.ministry_name, sp.program_name
              FROM community_activities ca
              LEFT JOIN persons p ON ca.coordinator_id = p.person_id
              LEFT JOIN ministries m ON ca.ministry_id = m.ministry_id
              LEFT JOIN social_programs sp ON ca.program_id = sp.program_id
              ORDER BY ca.created_at DESC";

    $result = $conn->query($query);

    if (!$result) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]);
        exit();
    }

    $activities = [];
    while ($row = $result->fetch_assoc()) {
        $activities[] = $row;
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $activities,
        'count' => count($activities)
    ]);

} elseif ($request_method === 'POST') {
    // Create new community activity
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || !isset($input['activity_name']) || !isset($input['activity_type'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        exit();
    }

    $activity_name = $conn->real_escape_string($input['activity_name']);
    $activity_type = $conn->real_escape_string($input['activity_type']);
    $description = $conn->real_escape_string($input['description'] ?? '');
    $ministry_id = isset($input['ministry_id']) ? intval($input['ministry_id']) : null;
    $program_id = isset($input['program_id']) ? intval($input['program_id']) : null;
    $coordinator_id = isset($input['coordinator_id']) ? intval($input['coordinator_id']) : null;
    $start_date = $conn->real_escape_string($input['start_date'] ?? null);
    $end_date = $conn->real_escape_string($input['end_date'] ?? null);
    $status = $conn->real_escape_string($input['status'] ?? 'planned');
    $budget_allocated = floatval($input['budget_allocated'] ?? 0);
    $beneficiaries_target = intval($input['beneficiaries_target'] ?? 0);
    $beneficiaries_served = intval($input['beneficiaries_served'] ?? 0);
    $notes = $conn->real_escape_string($input['notes'] ?? '');

    $query = "INSERT INTO community_activities (activity_name, activity_type, description, ministry_id, program_id, coordinator_id, start_date, end_date, status, budget_allocated, beneficiaries_target, beneficiaries_served, notes)
              VALUES ('$activity_name', '$activity_type', '$description', " . ($ministry_id ? $ministry_id : 'NULL') . ", " . ($program_id ? $program_id : 'NULL') . ", " . ($coordinator_id ? $coordinator_id : 'NULL') . ", " . ($start_date ? "'$start_date'" : 'NULL') . ", " . ($end_date ? "'$end_date'" : 'NULL') . ", '$status', $budget_allocated, $beneficiaries_target, $beneficiaries_served, '$notes')";

    if ($conn->query($query) === TRUE) {
        // Log the action
        if (isset($user_id)) {
            logAction($user_id, 'CREATE', 'community_activities', "Created activity: $activity_name");
        }

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Community activity created successfully',
            'id' => $conn->insert_id
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create activity: ' . $conn->error]);
    }

} elseif ($request_method === 'PUT') {
    // Update community activity
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || !isset($input['community_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing community_id']);
        exit();
    }

    $community_id = intval($input['community_id']);
    $updates = [];

    if (isset($input['activity_name'])) $updates[] = "activity_name = '" . $conn->real_escape_string($input['activity_name']) . "'";
    if (isset($input['activity_type'])) $updates[] = "activity_type = '" . $conn->real_escape_string($input['activity_type']) . "'";
    if (isset($input['description'])) $updates[] = "description = '" . $conn->real_escape_string($input['description']) . "'";
    if (isset($input['ministry_id'])) $updates[] = "ministry_id = " . (intval($input['ministry_id']) ?: 'NULL');
    if (isset($input['program_id'])) $updates[] = "program_id = " . (intval($input['program_id']) ?: 'NULL');
    if (isset($input['coordinator_id'])) $updates[] = "coordinator_id = " . (intval($input['coordinator_id']) ?: 'NULL');
    if (isset($input['start_date'])) $updates[] = "start_date = " . ($input['start_date'] ? "'" . $conn->real_escape_string($input['start_date']) . "'" : 'NULL');
    if (isset($input['end_date'])) $updates[] = "end_date = " . ($input['end_date'] ? "'" . $conn->real_escape_string($input['end_date']) . "'" : 'NULL');
    if (isset($input['status'])) $updates[] = "status = '" . $conn->real_escape_string($input['status']) . "'";
    if (isset($input['budget_allocated'])) $updates[] = "budget_allocated = " . floatval($input['budget_allocated']);
    if (isset($input['beneficiaries_target'])) $updates[] = "beneficiaries_targe = " . intval($input['beneficiaries_target']);
    if (isset($input['beneficiaries_served'])) $updates[] = "beneficiaries_served = " . intval($input['beneficiaries_served']);
    if (isset($input['notes'])) $updates[] = "notes = '" . $conn->real_escape_string($input['notes']) . "'";

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit();
    }

    $updates[] = "updated_at = CURRENT_TIMESTAMP";

    $query = "UPDATE community_activities SET " . implode(', ', $updates) . " WHERE community_id = $community_id";

    if ($conn->query($query) === TRUE) {
        // Log the action
        if (isset($user_id)) {
            logAction($user_id, 'UPDATE', 'community_activities', "Updated activity ID: $community_id");
        }

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Community activity updated successfully'
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update activity: ' . $conn->error]);
    }

} elseif ($request_method === 'DELETE') {
    // Delete community activity
    if (!isset($_GET['id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing id parameter']);
        exit();
    }

    $community_id = intval($_GET['id']);

    $query = "DELETE FROM community_activities WHERE community_id = $community_id";

    if ($conn->query($query) === TRUE) {
        // Log the action
        if (isset($user_id)) {
            logAction($user_id, 'DELETE', 'community_activities', "Deleted activity ID: $community_id");
        }

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Community activity deleted successfully'
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete activity: ' . $conn->error]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>