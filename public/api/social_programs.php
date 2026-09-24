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
    $type = isset($_GET['type']) ? $_GET['type'] : 'programs';

    if ($type === 'beneficiaries') {
        // Get beneficiary logs with person and program details
        $query = "SELECT bl.*, p.first_name, p.last_name, sp.program_name
                  FROM beneficiary_logs bl
                  LEFT JOIN persons p ON bl.person_id = p.person_id
                  LEFT JOIN social_programs sp ON bl.program_id = sp.program_id
                  ORDER BY bl.date_given DESC";
    } else {
        // Get all social programs with beneficiary count
        $query = "SELECT sp.*, COUNT(bl.log_id) as beneficiary_count
                  FROM social_programs sp
                  LEFT JOIN beneficiary_logs bl ON sp.program_id = bl.program_id
                  GROUP BY sp.program_id
                  ORDER BY sp.program_id DESC";
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
    $data = json_decode(file_get_contents("php://input"), true);
    $action = isset($data['action']) ? $data['action'] : 'create_program';

    if ($action === 'add_beneficiary') {

        if (!isset($data['program_id']) || !isset($data['person_id']) || !isset($data['aid_received']) || !isset($data['date_given'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing required fields: program_id, person_id, aid_received, date_given']);
            exit();
        }

        $program_id = intval($data['program_id']);
        $person_id = intval($data['person_id']);
        $aid_received = $conn->real_escape_string($data['aid_received']);
        $date_given = $conn->real_escape_string($data['date_given']);

        $query = "INSERT INTO beneficiary_logs (program_id, person_id, aid_received, date_given)
                  VALUES ($program_id, $person_id, '$aid_received', '$date_given')";

        if ($conn->query($query) === TRUE) {
            $log_id = $conn->insert_id;
            $user_id = isset($data['user_id']) && intval($data['user_id']) > 0 ? intval($data['user_id']) : 0;
            logAuditAction($user_id, 'CREATE', 'beneficiary_logs', "Added beneficiary: $aid_received", $conn);

            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'Beneficiary added successfully',
                'log_id' => $log_id
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to add beneficiary: ' . $conn->error]);
        }
    } else {
        // Create new social program
        $data = json_decode(file_get_contents("php://input"), true);

        if (!isset($data['program_name']) || !isset($data['objective']) || !isset($data['budget'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing required fields: program_name, objective, budget']);
            exit();
        }

        $program_name = $conn->real_escape_string($data['program_name']);
        $objective = $conn->real_escape_string($data['objective']);
        $budget = floatval($data['budget']);

        $query = "INSERT INTO social_programs (program_name, objective, budget)
                  VALUES ('$program_name', '$objective', $budget)";

        if ($conn->query($query) === TRUE) {
            $program_id = $conn->insert_id;
            logAuditAction($_SESSION['user_id'] ?? 0, 'CREATE', 'social_programs', "Added program: $program_name", $conn);

            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'Program created successfully',
                'program_id' => $program_id
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to create program: ' . $conn->error]);
        }
    }

} elseif ($request_method === 'PUT') {
    // Update social program
    $data = json_decode(file_get_contents('php://input'), true);
    $program_id = isset($_GET['program_id']) ? intval($_GET['program_id']) : null;

    if (!$program_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing program_id']);
        exit();
    }

    $program_name = isset($data['program_name']) ? $conn->real_escape_string($data['program_name']) : null;
    $objective = isset($data['objective']) ? $conn->real_escape_string($data['objective']) : null;
    $budget = isset($data['budget']) ? floatval($data['budget']) : null;

    $updates = [];
    if ($program_name !== null) $updates[] = "program_name = '$program_name'";
    if ($objective !== null) $updates[] = "objective = '$objective'";
    if ($budget !== null) $updates[] = "budget = $budget";

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No updates provided']);
        exit();
    }

    $query = "UPDATE social_programs SET " . implode(', ', $updates) . " WHERE program_id = $program_id";

    if ($conn->query($query) === TRUE) {
        logAuditAction($_SESSION['user_id'] ?? 0, 'UPDATE', 'social_programs', "Updated program ID: $program_id", $conn);

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Program updated successfully'
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update program: ' . $conn->error]);
    }

} elseif ($request_method === 'DELETE') {
    $resource = isset($_GET['resource']) ? $_GET['resource'] : 'program';

    if ($resource === 'beneficiary') {
        // Delete beneficiary log
        $log_id = isset($_GET['log_id']) ? intval($_GET['log_id']) : null;

        if (!$log_id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing log_id']);
            exit();
        }

        $query = "DELETE FROM beneficiary_logs WHERE log_id = $log_id";

        if ($conn->query($query) === TRUE) {
            logAuditAction($_SESSION['user_id'] ?? 0, 'DELETE', 'beneficiary_logs', "Deleted beneficiary log ID: $log_id", $conn);

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'Beneficiary record deleted successfully'
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to delete beneficiary record: ' . $conn->error]);
        }
    } else {
        // Delete program
        $program_id = isset($_GET['program_id']) ? intval($_GET['program_id']) : null;

        if (!$program_id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing program_id']);
            exit();
        }

        // Check if program has beneficiaries
        $check_query = "SELECT COUNT(*) as count FROM beneficiary_logs WHERE program_id = $program_id";
        $check_result = $conn->query($check_query);
        $check_row = $check_result->fetch_assoc();

        if ($check_row['count'] > 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Cannot delete program with beneficiaries. Please remove all beneficiaries first.']);
            exit();
        }

        $query = "DELETE FROM social_programs WHERE program_id = $program_id";

        if ($conn->query($query) === TRUE) {
            logAuditAction($_SESSION['user_id'] ?? 0, 'DELETE', 'social_programs', "Deleted program ID: $program_id", $conn);

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'Program deleted successfully'
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to delete program: ' . $conn->error]);
        }
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

$conn->close();
?>
