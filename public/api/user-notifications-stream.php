<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

require_once 'config.php';

header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');
header('Connection: keep-alive');
header('Access-Control-Allow-Origin: *');

if (!$conn) {
    http_response_code(500);
    echo "event: notification\n";
    echo "data: {\"success\":false,\"message\":\"Database connection not available\"}\n\n";
    exit();
}

$person_id = isset($_GET['person_id']) ? intval($_GET['person_id']) : 0;
if ($person_id <= 0) {
    echo "event: notification\n";
    echo "data: {\"success\":false,\"message\":\"person_id parameter is required\"}\n\n";
    exit();
}

ignore_user_abort(true);
set_time_limit(0);
$last_message = null;
$start_time = time();

while (!connection_aborted() && (time() - $start_time) < 55) {
    $limit = 20;
    $query = "SELECT nl.*, p.first_name, p.last_name
              FROM notification_logs nl
              LEFT JOIN persons p ON nl.person_id = p.person_id
              WHERE nl.person_id = $person_id AND nl.notif_type = 'InApp'
              ORDER BY nl.sent_at DESC
              LIMIT $limit";
    $result = $conn->query($query);

    $notifications = [];
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $notifications[] = $row;
        }
    }

    $count_query = "SELECT COUNT(*) as unread_count FROM notification_logs
                    WHERE person_id = $person_id AND is_read = 0 AND notif_type = 'InApp'";
    $count_result = $conn->query($count_query);
    $unread_count = 0;
    if ($count_result) {
        $count_row = $count_result->fetch_assoc();
        $unread_count = intval($count_row['unread_count'] ?? 0);
    }

    $payload = json_encode([
        'success' => true,
        'data' => $notifications,
        'count' => count($notifications),
        'unread_count' => $unread_count,
    ]);

    if ($payload !== $last_message) {
        echo "event: notification\n";
        echo "data: " . str_replace("\n", "\\n", $payload) . "\n\n";
        @ob_flush();
        @flush();
        $last_message = $payload;
    } else {
        echo ": heartbeat\n\n";
        @ob_flush();
        @flush();
    }

    sleep(3);
}

// send a heartbeat so the client knows the connection is alive
echo "event: heartbeat\n";
echo "data: {}\n\n";
@ob_flush();
@flush();
?>