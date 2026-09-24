<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
ini_set('log_errors', 1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once 'config.php';
require_once 'permissions.php';
require_once 'audit.php';
require_once 'UserNotificationHelper.php';

// SIGURADUHIN: Naka-set sa UTF-8 ang database connection para tanggapin ang mahahabang text/emojis
if ($conn) {
    $conn->set_charset("utf8mb4");
}

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!$conn) {
    http_response_code(500);
    exit(json_encode(['success' => false, 'message' => 'Database connection not available']));
}

$request_method = $_SERVER['REQUEST_METHOD'];

if ($request_method === 'GET') {
    $user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
    $room = isset($_GET['room']) && $_GET['room'] !== '' ? $conn->real_escape_string($_GET['room']) : null;
    $other_id = isset($_GET['recipient_id']) ? intval($_GET['recipient_id']) : null;

    if (!$other_id && isset($_GET['user'])) {
        $other_id = intval($_GET['user']);
    }

    if ($other_id && $user_id && $user_id !== $other_id) {
        $where = "WHERE ((cm.sender_id = $user_id AND cm.recipient_id = $other_id) 
                  OR (cm.sender_id = $other_id AND cm.recipient_id = $user_id))";
    } else {
        $clauses = [];
        if ($room) {
            $clauses[] = "cm.room = '$room'";
        }
        if ($user_id) {
            $clauses[] = "(cm.sender_id = $user_id OR cm.recipient_id = $user_id)";
        }

        $where = '';
        if (!empty($clauses)) {
            $where = 'WHERE ' . implode(' AND ', $clauses);
        }
    }

    $query = "SELECT cm.*, p.first_name, p.last_name, su.last_login AS sender_last_login 
              FROM chat_messages cm
              LEFT JOIN system_users su ON cm.sender_id = su.user_id
              LEFT JOIN persons p ON su.person_id = p.person_id
              $where
              ORDER BY cm.sent_at ASC";

    $result = $conn->query($query);
    if (!$result) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]);
        exit();
    }

    $messages = [];
    while ($row = $result->fetch_assoc()) {
        $row['message'] = $row['message'] ?? '';
        $messages[] = $row;
    }

    http_response_code(200);
    echo json_encode(['success' => true, 'data' => $messages, 'count' => count($messages)]);
    exit();
    
} elseif ($request_method === 'POST') {
    $raw_input = file_get_contents('php://input');
    $data = json_decode($raw_input, true);
    if ($data === null) {
        $data = $_POST;
    }

    try {
        $logPayload = [
            'time' => date('c'),
            'remote_addr' => $_SERVER['REMOTE_ADDR'] ?? 'cli',
            'raw_input' => $raw_input,
            'post' => $_POST,
            'decoded' => $data,
        ];
        @file_put_contents(__DIR__ . '/chat_debug.log', json_encode($logPayload) . PHP_EOL, FILE_APPEND | LOCK_EX);
    } catch (Throwable $e) {
        // swallow logging errors
    }

    $sender_id = intval($data['sender_id'] ?? $data['user_id'] ?? 0);
    $recipient_id = isset($data['recipient_id']) && $data['recipient_id'] !== '' ? intval($data['recipient_id']) : null;
    $room = isset($data['room']) && $data['room'] !== '' ? trim($data['room']) : null;
    
    $message = isset($data['message']) ? trim($data['message']) : '';

    if (!$sender_id || $message === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'sender_id and message are required']);
        exit();
    }

    if (!$recipient_id && $room === null) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'recipient_id or room is required']);
        exit();
    }

    if ($room !== null && strtolower($room) === 'all') {
        $roleRes = $conn->query("SELECT user_role FROM system_users WHERE user_id = $sender_id LIMIT 1");
        $senderRole = '';
        if ($roleRes && ($r = $roleRes->fetch_assoc())) {
            $senderRole = $r['user_role'] ?? '';
        }
        if (strtolower($senderRole) !== 'admin') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Only Admin may post to All users']);
            exit();
        }
    }

    // Create in-app notification for recipient
    try {
        $sender_name = '';
        $sender_res = $conn->query("SELECT person_id FROM system_users WHERE user_id = $sender_id LIMIT 1");
        if ($sender_res && ($s = $sender_res->fetch_assoc()) && !empty($s['person_id'])) {
            $p = $conn->query("SELECT first_name, last_name FROM persons WHERE person_id = " . intval($s['person_id']) . " LIMIT 1");
            if ($p && ($pp = $p->fetch_assoc())) {
                $sender_name = trim(($pp['first_name'] ?? '') . ' ' . ($pp['last_name'] ?? ''));
            }
        }

        if ($recipient_id) {
            $helper = new UserNotificationHelper($conn);
            $res = $conn->query("SELECT person_id FROM system_users WHERE user_id = $recipient_id LIMIT 1");
            if ($res && ($row = $res->fetch_assoc()) && !empty($row['person_id'])) {
                $person_id = intval($row['person_id']);

                $msg_preview = strlen($message) > 120 ? substr($message, 0, 117) . '...' : $message;
                $notif_message = ($sender_name ? $sender_name . ': ' : '') . $msg_preview;
                $options = [];
                if ($room) {
                    $options['action_url'] = "/chat?room=" . urlencode($room);
                    $options['action_type'] = 'open_room';
                } else {
                    $options['action_url'] = "/chat?user=" . intval($sender_id);
                    $options['action_type'] = 'open_dm';
                }

                $helper->sendUserNotification($person_id, $notif_message, 'Chat', $options);
            }
        }
        
        if ($room !== null && strtolower($room) === 'all') {
            $helper = new UserNotificationHelper($conn);
            $allRes = $conn->query("SELECT person_id FROM system_users WHERE person_id IS NOT NULL");
            if ($allRes) {
                while ($ar = $allRes->fetch_assoc()) {
                    $pid = intval($ar['person_id']);
                    if ($pid <= 0) continue;
                    $msg_preview = strlen($message) > 120 ? substr($message, 0, 117) . '...' : $message;
                    $notif_message = ($sender_name ?? '') ? $sender_name . ': ' . $msg_preview : $msg_preview;
                    $options = [ 'action_url' => '/chat?room=All', 'action_type' => 'open_room' ];
                    try {
                        $helper->sendUserNotification($pid, $notif_message, 'Chat', $options);
                    } catch (Throwable $ex) {
                        // swallow notification exception limits
                    }
                }
            }
        }
    } catch (Throwable $e) {
        error_log('Notification error (chat): ' . $e->getMessage());
    }

    $db_room = $room !== null ? "'" . $conn->real_escape_string($room) . "'" : 'NULL';
    $db_recipient = $recipient_id ? $recipient_id : 'NULL';
    $db_message = $conn->real_escape_string($message);

    $query = "INSERT INTO chat_messages (sender_id, recipient_id, room, message)
              VALUES ($sender_id, $db_recipient, $db_room, '$db_message')";

    if ($conn->query($query) === TRUE) {
        $msg_id = $conn->insert_id;
        
        // INAYOS: Binalot sa try-catch para kung walang active session, hindi mag-fe-fail ang insert execution
        try {
            $logDetails = [];
            if ($room !== null) { $logDetails[] = "room=$room"; }
            if ($recipient_id) { $logDetails[] = "recipient_id=$recipient_id"; }
            $logText = 'Sent chat message' . (count($logDetails) ? ' (' . implode(', ', $logDetails) . ')' : '');
            
            // Gamitin ang sender_id kung walang mahanap na $_SESSION data
            $audit_user = isset($_SESSION['user_id']) ? intval($_SESSION['user_id']) : $sender_id;
            logAuditAction($audit_user, 'CREATE', 'chat_messages', $logText, $conn);
        } catch (Throwable $auditError) {
            // Hayaang magpatuloy ang process kahit mag-fail ang audit creation
        }
        
        http_response_code(201);
        echo json_encode([ 'success' => true, 'message' => 'Message sent', 'msg_id' => $msg_id ]);
        @file_put_contents(__DIR__ . '/chat_debug.log', json_encode(['time' => date('c'), 'status' => 'insert_ok', 'msg_id' => $msg_id]) . PHP_EOL, FILE_APPEND | LOCK_EX);
    } else {
        @file_put_contents(__DIR__ . '/chat_debug.log', json_encode(['time' => date('c'), 'status' => 'insert_failed', 'error' => $conn->error, 'query' => $query]) . PHP_EOL, FILE_APPEND | LOCK_EX);
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to send message: ' . $conn->error]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

$conn->close();
?>