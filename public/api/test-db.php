<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once 'config.php';

// Test database connection
if ($conn->connect_error) {
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed',
        'error' => $conn->connect_error
    ]);
    exit();
}

// Test persons table
$persons_query = "SELECT * FROM persons";
$persons_result = $conn->query($persons_query);

// Test users table
$users_query = "SELECT su.user_id, su.person_id, su.username, su.user_role, su.last_login,
                       p.first_name, p.last_name
                FROM system_users su
                LEFT JOIN persons p ON su.person_id = p.person_id";
$users_result = $conn->query($users_query);

$response = [
    'success' => true,
    'database' => DB_NAME,
    'persons_total' => $persons_result ? $persons_result->num_rows : 0,
    'persons_data' => [],
    'users_total' => $users_result ? $users_result->num_rows : 0,
    'users_data' => [],
    'errors' => []
];

if ($persons_result && $persons_result->num_rows > 0) {
    while ($row = $persons_result->fetch_assoc()) {
        $response['persons_data'][] = $row;
    }
} else {
    $response['errors'][] = 'Persons query error: ' . $conn->error;
}

if ($users_result && $users_result->num_rows > 0) {
    while ($row = $users_result->fetch_assoc()) {
        $response['users_data'][] = $row;
    }
} else {
    $response['errors'][] = 'Users query error: ' . $conn->error;
}

echo json_encode($response, JSON_PRETTY_PRINT);
$conn->close();
?>
