<?php
// Simple test endpoint to debug login issues

require_once 'config.php';

header('Content-Type: application/json');

$response = [
    'status' => 'API is working',
    'timestamp' => date('Y-m-d H:i:s'),
    'database' => [
        'connection' => $conn ? 'connected' : 'disconnected',
        'database' => DB_NAME
    ],
    'test_users' => [
        ['username' => 'admin', 'password' => 'admin'],
        ['username' => 'father_jose', 'password' => 'jose'],
        ['username' => 'secretary_maria', 'password' => 'maria'],
        ['username' => 'treasurer_juan', 'password' => 'juan']
    ]
];

// Try to fetch a user to verify database connection
$stmt = $conn->prepare("SELECT COUNT(*) as count FROM system_users");
$stmt->execute();
$result = $stmt->get_result();
$row = $result->fetch_assoc();

$response['database']['users_in_system'] = $row['count'] ?? 0;
$response['database']['charset'] = $conn->get_charset()->charset;

echo json_encode($response, JSON_PRETTY_PRINT);
?>
