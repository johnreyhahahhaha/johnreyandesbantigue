<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once 'config.php';

$conn->query("CREATE TABLE IF NOT EXISTS priest_unavailability (
    id INT AUTO_INCREMENT PRIMARY KEY,
    priest_id INT NOT NULL,
    unavailable_date DATE NOT NULL,
    reason VARCHAR(255) NOT NULL,
    notes TEXT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_priest_unavailability_priest_date (priest_id, unavailable_date),
    KEY idx_priest_unavailability_active (is_active)
)");

$request_method = $_SERVER['REQUEST_METHOD'];

if ($request_method === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($request_method === 'GET') {
    $priestId = isset($_GET['priest_id']) ? (int)$_GET['priest_id'] : null;
    $date = isset($_GET['unavailable_date']) ? trim($_GET['unavailable_date']) : null;

    $query = 'SELECT * FROM priest_unavailability WHERE 1=1';
    if ($priestId) {
        $query .= ' AND priest_id = ' . $priestId;
    }
    if ($date) {
        $query .= " AND unavailable_date = '" . $conn->real_escape_string($date) . "'";
    }
    $query .= ' ORDER BY unavailable_date DESC';

    $result = $conn->query($query);
    if (!$result) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]);
        exit();
    }

    $items = [];
    while ($row = $result->fetch_assoc()) {
        $items[] = $row;
    }

    http_response_code(200);
    echo json_encode(['success' => true, 'data' => $items, 'count' => count($items)]);
    exit();
}

if ($request_method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!is_array($data)) {
        $data = [];
    }

    $priestId = isset($data['priest_id']) ? (int)$data['priest_id'] : 0;
    $unavailableDate = isset($data['unavailable_date']) ? trim((string)$data['unavailable_date']) : '';
    $reason = isset($data['reason']) ? trim((string)$data['reason']) : '';
    $notes = isset($data['notes']) ? trim((string)$data['notes']) : '';
    $isActive = isset($data['is_active']) ? (int)$data['is_active'] : 1;

    if ($priestId <= 0 || $unavailableDate === '' || $reason === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'priest_id, unavailable_date, and reason are required.']);
        exit();
    }

    $priestResult = $conn->query("SELECT person_id FROM persons WHERE person_id = $priestId AND LOWER(occupation) = 'priest' LIMIT 1");
    if (!$priestResult || $priestResult->num_rows === 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'The selected person is not registered as a priest.']);
        exit();
    }

    if (strtotime($unavailableDate) === false) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid unavailable_date.']);
        exit();
    }

    $query = "INSERT INTO priest_unavailability (priest_id, unavailable_date, reason, notes, is_active)
              VALUES ($priestId, '" . $conn->real_escape_string($unavailableDate) . "', '" . $conn->real_escape_string($reason) . "', '" . $conn->real_escape_string($notes) . "', $isActive)";

    if ($conn->query($query) === TRUE) {
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Priest unavailability saved successfully.',
            'id' => $conn->insert_id
        ]);
        exit();
    }

    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to save priest unavailability: ' . $conn->error]);
    exit();
}

if ($request_method === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!is_array($data)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid payload.']);
        exit();
    }

    $id = isset($data['id']) ? (int)$data['id'] : 0;
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'id is required.']);
        exit();
    }

    $updates = [];
    if (isset($data['priest_id'])) {
        $updatedPriestId = (int)$data['priest_id'];
        $priestResult = $conn->query("SELECT person_id FROM persons WHERE person_id = $updatedPriestId AND LOWER(occupation) = 'priest' LIMIT 1");
        if (!$priestResult || $priestResult->num_rows === 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'The selected person is not registered as a priest.']);
            exit();
        }
        $updates[] = 'priest_id = ' . $updatedPriestId;
    }
    if (isset($data['unavailable_date'])) $updates[] = "unavailable_date = '" . $conn->real_escape_string(trim((string)$data['unavailable_date'])) . "'";
    if (isset($data['reason'])) $updates[] = "reason = '" . $conn->real_escape_string(trim((string)$data['reason'])) . "'";
    if (isset($data['notes'])) $updates[] = "notes = '" . $conn->real_escape_string(trim((string)$data['notes'])) . "'";
    if (isset($data['is_active'])) $updates[] = 'is_active = ' . ((int)$data['is_active'] ? 1 : 0);

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No fields to update.']);
        exit();
    }

    $query = 'UPDATE priest_unavailability SET ' . implode(', ', $updates) . ' WHERE id = ' . $id;
    if ($conn->query($query) === TRUE) {
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Priest unavailability updated successfully.']);
        exit();
    }

    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to update priest unavailability: ' . $conn->error]);
    exit();
}

if ($request_method === 'DELETE') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'id is required.']);
        exit();
    }

    $query = 'DELETE FROM priest_unavailability WHERE id = ' . $id;
    if ($conn->query($query) === TRUE) {
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Priest unavailability deleted successfully.']);
        exit();
    }

    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to delete priest unavailability: ' . $conn->error]);
    exit();
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed']);
$conn->close();
