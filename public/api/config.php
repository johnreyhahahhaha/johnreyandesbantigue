<?php
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Database configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'josephus_parish_system');

// Create connection
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

// Check connection
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed',
        'error' => 'Unable to connect to database: ' . $conn->connect_error
    ]);
    exit();
}

// Set charset to utf8
if (!$conn->set_charset("utf8mb4")) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error setting charset']);
    exit();
}

// Set CORS headers
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Max-Age: 86400');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

function findPriestScheduleConflict($conn, $priestId, $startDatetime, $endDatetime, $excludeScheduleId = null) {
    $priestId = (int)$priestId;
    if ($priestId <= 0 || !$startDatetime || !$endDatetime) {
        return null;
    }

    $start = $conn->real_escape_string($startDatetime);
    $end = $conn->real_escape_string($endDatetime);
    $exclude = $excludeScheduleId ? 'AND schedule_id <> ' . (int)$excludeScheduleId : '';
    $query = "SELECT schedule_id, event_title, start_datetime, end_datetime
              FROM parish_schedules
              WHERE assigned_priest = $priestId
                AND status <> 'Cancelled'
                AND start_datetime < '$end'
                AND end_datetime > '$start'
                $exclude
              ORDER BY start_datetime ASC
              LIMIT 1";
    $result = $conn->query($query);

    return $result && $result->num_rows > 0 ? $result->fetch_assoc() : null;
}

function findPriestUnavailabilityConflict($conn, $priestId, $startDatetime, $endDatetime, $excludeId = null) {
    $priestId = (int)$priestId;
    if ($priestId <= 0 || !$startDatetime || !$endDatetime) {
        return null;
    }

    $startDate = date('Y-m-d', strtotime($startDatetime));
    $endDate = date('Y-m-d', strtotime($endDatetime));
    $exclude = $excludeId ? 'AND id <> ' . (int)$excludeId : '';
    $query = "SELECT id, priest_id, unavailable_date, reason, notes
              FROM priest_unavailability
              WHERE priest_id = $priestId
                AND is_active = 1
                AND unavailable_date >= '$startDate'
                AND unavailable_date <= '$endDate'
                $exclude
              ORDER BY unavailable_date ASC
              LIMIT 1";
    $result = $conn->query($query);

    return $result && $result->num_rows > 0 ? $result->fetch_assoc() : null;
}
?>


