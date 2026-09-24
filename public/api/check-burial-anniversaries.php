<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once 'config.php';

if (!$conn) {
    http_response_code(500);
    exit(json_encode(['success' => false, 'message' => 'Database connection not available']));
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    exit(json_encode(['success' => false, 'message' => 'Method not allowed']));
}

$burialQuery = "SELECT br.burial_id, br.person_id, br.burial_date,
                      p.first_name, p.last_name, p.household_id
               FROM burial_records br
               INNER JOIN persons p ON p.person_id = br.person_id
               WHERE br.burial_date IS NOT NULL
                 AND DATE_ADD(br.burial_date, INTERVAL 10 YEAR) <= CURDATE()
                 AND p.household_id IS NOT NULL
               ORDER BY br.burial_date ASC";
$burialResult = $conn->query($burialQuery);

if (!$burialResult) {
    http_response_code(500);
    exit(json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]));
}

$burialsChecked = 0;
$notificationsSent = 0;
$errors = [];

while ($burial = $burialResult->fetch_assoc()) {
    $burialsChecked++;
    $personId = (int)$burial['person_id'];
    $householdId = (int)$burial['household_id'];
    $burialId = (int)$burial['burial_id'];
    $deceasedName = trim($burial['first_name'] . ' ' . $burial['last_name']);
    $burialDate = $burial['burial_date'];

    $membersQuery = "SELECT person_id
                     FROM persons
                     WHERE household_id = $householdId
                       AND person_id != $personId
                       AND is_alive = 1";
    $membersResult = $conn->query($membersQuery);

    if (!$membersResult) {
        $errors[] = "Burial ID $burialId: Failed to find household members";
        continue;
    }

    while ($member = $membersResult->fetch_assoc()) {
        $memberId = (int)$member['person_id'];
        $duplicateQuery = "SELECT notif_id
                            FROM notification_logs
                            WHERE person_id = $memberId
                              AND action_type = 'burial_10_year_notice'
                              AND message_body LIKE '%Burial ID $burialId%'
                            LIMIT 1";
        $duplicateResult = $conn->query($duplicateQuery);

        if (!$duplicateResult || $duplicateResult->num_rows > 0) {
            continue;
        }

        $message = "Burial anniversary notice: $deceasedName reached 10 years since burial on $burialDate. Please contact the parish regarding cemetery arrangements. Burial ID $burialId.";
        $escapedMessage = $conn->real_escape_string($message);
        $insertQuery = "INSERT INTO notification_logs
                        (person_id, message_body, notif_type, category, sent_status, action_url, action_type, is_read, sent_at)
                        VALUES ($memberId, '$escapedMessage', 'InApp', 'Cemetery Records', 'Sent',
                                '/cemetery-records?tab=burial', 'burial_10_year_notice', 0, NOW())";

        if ($conn->query($insertQuery)) {
            $notificationsSent++;
        } else {
            $errors[] = "Burial ID $burialId: Failed to notify household member $memberId";
        }
    }
}

echo json_encode([
    'success' => true,
    'burials_checked' => $burialsChecked,
    'notifications_sent' => $notificationsSent,
    'errors' => $errors
]);
?>
