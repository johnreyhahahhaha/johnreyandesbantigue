<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

require_once 'config.php';
require_once 'permissions.php';

$request_method = $_SERVER['REQUEST_METHOD'];

if ($request_method === 'GET') {
    // Get audit logs
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 100;
    $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;

    $query = "SELECT al.*, su.username FROM audit_logs al
              LEFT JOIN system_users su ON al.user_id = su.user_id
              ORDER BY al.log_timestamp DESC
              LIMIT $limit OFFSET $offset";

    $result = $conn->query($query);

    if (!$result) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]);
        exit();
    }

    $logs = [];
    while ($row = $result->fetch_assoc()) {
        $logs[] = $row;
    }

    // Get total count
    $count_query = "SELECT COUNT(*) as total FROM audit_logs";
    $count_result = $conn->query($count_query);
    $count_row = $count_result->fetch_assoc();

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $logs,
        'count' => count($logs),
        'total' => $count_row['total']
    ]);

} elseif ($request_method === 'DELETE') {
    // Delete audit logs by date range or ID
    $data = json_decode(file_get_contents("php://input"), true);

    if (isset($data['log_id'])) {
        $log_id = intval($data['log_id']);
        $query = "DELETE FROM audit_logs WHERE log_id = $log_id";
    } elseif (isset($data['before_date'])) {
        $before_date = $conn->real_escape_string($data['before_date']);
        $query = "DELETE FROM audit_logs WHERE log_timestamp < '$before_date'";
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required parameters']);
        exit();
    }

    if ($conn->query($query) === TRUE) {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Audit log(s) deleted successfully'
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete logs: ' . $conn->error]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

$conn->close();
?>
