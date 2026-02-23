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

if (!$conn) {
    http_response_code(500);
    exit(json_encode(['success' => false, 'message' => 'Database connection not available']));
}

$request_method = $_SERVER['REQUEST_METHOD'];

if ($request_method === 'GET') {
    // Get donations
    $query = "SELECT d.*, p.first_name, p.last_name FROM donations d
              LEFT JOIN persons p ON d.person_id = p.person_id
              ORDER BY d.date_received DESC";

    $result = $conn->query($query);

    if (!$result) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]);
        exit();
    }

    $donations = [];
    while ($row = $result->fetch_assoc()) {
        $donations[] = $row;
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $donations,
        'count' => count($donations)
    ]);

} elseif ($request_method === 'POST') {
    // Create new donation
    $data = json_decode(file_get_contents("php://input"), true);
    $user_id = isset($data['user_id']) && intval($data['user_id']) > 0 ? intval($data['user_id']) : null;

    if (!isset($data['donor_name']) || !isset($data['amount']) || !isset($data['donation_type'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields: donor_name, amount, donation_type']);
        exit();
    }

    $person_id = isset($data['person_id']) ? intval($data['person_id']) : 'NULL';
    $donor_name = $conn->real_escape_string($data['donor_name']);
    $amount = floatval($data['amount']);
    $donation_type = $conn->real_escape_string($data['donation_type']);
    $received_by_user_id = isset($data['received_by_user_id']) ? intval($data['received_by_user_id']) : 'NULL';

    $query = "INSERT INTO donations (person_id, donor_name, amount, donation_type, received_by_user_id)
              VALUES ($person_id, '$donor_name', $amount, '$donation_type', $received_by_user_id)";

    if ($conn->query($query) === TRUE) {
        $donation_id = $conn->insert_id;

        // Log the action
        if ($user_id && $user_id > 0) {
            logAuditAction($user_id, 'CREATE', 'donations', "Recorded donation from $donor_name: $amount ($donation_type)", $conn);
        }

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Donation recorded successfully',
            'donation_id' => $donation_id
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to record donation: ' . $conn->error]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

$conn->close();
?>
