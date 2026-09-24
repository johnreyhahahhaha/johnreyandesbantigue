<?php
/**
 * In-App User Notifications API
 * 
 * Handles in-app notifications (replacing email/SMS)
 * Endpoints:
 *   GET    /api/user-notifications.php?person_id={id} - Get notifications for user
 *   POST   /api/user-notifications.php - Create new notification
 *   PUT    /api/user-notifications.php?id={id}&action=mark_read - Mark as read
 *   DELETE /api/user-notifications.php?id={id} - Delete notification
 * 
 * Created: 2026-05-08
 */

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
require_once __DIR__ . '/UserNotificationHelper.php';

if (!$conn) {
    http_response_code(500);
    exit(json_encode(['success' => false, 'message' => 'Database connection not available']));
}

$request_method = $_SERVER['REQUEST_METHOD'];
$helper = new UserNotificationHelper($conn);
$current_user_id = $_SESSION['user_id'] ?? 0;

if ($request_method === 'GET') {
    // Get notifications for a specific user
    $person_id = isset($_GET['person_id']) ? intval($_GET['person_id']) : 0;
    $filter_read = isset($_GET['filter']) ? $_GET['filter'] : 'all'; // 'unread', 'read', or 'all'
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;

    if ($person_id <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'person_id parameter is required']);
        exit();
    }

    // Build query based on filter
    $where_clause = "WHERE nl.person_id = $person_id AND nl.notif_type = 'InApp'";
    
    if ($filter_read === 'unread') {
        $where_clause .= " AND nl.is_read = 0";
    } elseif ($filter_read === 'read') {
        $where_clause .= " AND nl.is_read = 1";
    }

    $query = "SELECT nl.*, p.first_name, p.last_name 
              FROM notification_logs nl
              LEFT JOIN persons p ON nl.person_id = p.person_id
              $where_clause
              ORDER BY nl.sent_at DESC";

    if ($limit > 0) {
        $query .= " LIMIT $limit";
    }

    $result = $conn->query($query);

    if (!$result) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]);
        exit();
    }

    $notifications = [];
    while ($row = $result->fetch_assoc()) {
        if (($row['category'] ?? '') === 'Sacrament Applications'
            && preg_match('/^(.+?) submitted a new (Baptism|Marriage|Confirmation) sacrament application\./i', $row['message_body'] ?? '', $matches)
            && !preg_match('/[?&]application_id=\d+/', $row['action_url'] ?? '')) {
            $applicantName = $conn->real_escape_string(trim($matches[1]));
            $applicationCategory = $conn->real_escape_string($matches[2]);
            $applicationQuery = $conn->query("SELECT application_id FROM sacrament_applications WHERE applicant_name = '$applicantName' AND category = '$applicationCategory' ORDER BY application_id DESC LIMIT 1");
            if ($applicationQuery && ($application = $applicationQuery->fetch_assoc())) {
                $row['action_url'] = '/document-requests?view=applications&application_id=' . (int) $application['application_id'];
            }
        }
        $row['message_body'] = UserNotificationHelper::sanitizeNotificationText($row['message_body'] ?? '');
        $notifications[] = $row;
    }

    // Get unread count
    $count_query = "SELECT COUNT(*) as unread_count FROM notification_logs 
                    WHERE person_id = $person_id AND is_read = 0 AND notif_type = 'InApp'";
    $count_result = $conn->query($count_query);
    $count_row = $count_result->fetch_assoc();
    $unread_count = $count_row['unread_count'];

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $notifications,
        'count' => count($notifications),
        'unread_count' => $unread_count
    ]);

} elseif ($request_method === 'POST') {
    // Create a new in-app notification
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['message_body'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'message_body is required']);
        exit();
    }

    $person_id = isset($data['person_id']) ? intval($data['person_id']) : null;
    $target_role = isset($data['target_role']) ? $data['target_role'] : null;
    $message_body = $data['message_body'];
    $category = isset($data['category']) ? $data['category'] : 'General';
    
    $options = [];
    if (isset($data['action_url'])) {
        $options['action_url'] = $data['action_url'];
    }
    if (isset($data['action_type'])) {
        $options['action_type'] = $data['action_type'];
    }

    $notif_id = null;

    // Send to specific user
    if ($person_id) {
        $notif_id = $helper->sendUserNotification($person_id, $message_body, $category, $options);
        if ($notif_id) {
            logAuditAction($current_user_id, 'CREATE', 'notification_logs', 
                          "Created in-app notification for person_id: $person_id - $message_body", $conn);
            
            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'Notification created successfully',
                'notif_id' => $notif_id
            ]);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => implode(', ', $helper->getErrors())]);
        }
    }
    // Send to role-based users
    elseif ($target_role) {
        $notif_ids = $helper->sendRoleBasedNotification($target_role, $message_body, $category, $options);
        if (count($notif_ids) > 0) {
            logAuditAction($current_user_id, 'CREATE', 'notification_logs', 
                          "Created role-based notifications for role: $target_role", $conn);
            
            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'Notifications created for ' . count($notif_ids) . ' users',
                'notif_ids' => $notif_ids
            ]);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'No users found for role: ' . $target_role]);
        }
    }
    // System announcement
    else {
        if ($helper->sendSystemAnnouncement($message_body, $category, $options)) {
            logAuditAction($current_user_id, 'CREATE', 'notification_logs', 
                          "Created system announcement: $message_body", $conn);
            
            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'System announcement created successfully'
            ]);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => implode(', ', $helper->getErrors())]);
        }
    }

} elseif ($request_method === 'PUT') {
    // Update notification (mark as read, delete, etc.)
    $notif_id = isset($_GET['id']) ? intval($_GET['id']) : null;
    $action = isset($_GET['action']) ? $_GET['action'] : 'mark_read'; // mark_read, mark_unread, delete
    $data = json_decode(file_get_contents('php://input'), true) ?? [];

    if (!$notif_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'id parameter is required']);
        exit();
    }

    if ($action === 'mark_read') {
        if ($helper->markAsRead($notif_id)) {
            logAuditAction($current_user_id, 'UPDATE', 'notification_logs', 
                          "Marked notification $notif_id as read", $conn);
            
            http_response_code(200);
            echo json_encode(['success' => true, 'message' => 'Notification marked as read']);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => implode(', ', $helper->getErrors())]);
        }
    } 
    elseif ($action === 'mark_unread') {
        $query = "UPDATE notification_logs SET is_read = 0, read_at = NULL WHERE notif_id = ?";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("i", $notif_id);
        
        if ($stmt->execute()) {
            logAuditAction($current_user_id, 'UPDATE', 'notification_logs', 
                          "Marked notification $notif_id as unread", $conn);
            
            http_response_code(200);
            echo json_encode(['success' => true, 'message' => 'Notification marked as unread']);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Database error: ' . $conn->error]);
        }
    }
    elseif ($action === 'delete') {
        $query = "DELETE FROM notification_logs WHERE notif_id = ?";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("i", $notif_id);
        
        if ($stmt->execute()) {
            logAuditAction($current_user_id, 'DELETE', 'notification_logs', 
                          "Deleted notification $notif_id", $conn);
            
            http_response_code(200);
            echo json_encode(['success' => true, 'message' => 'Notification deleted']);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Database error: ' . $conn->error]);
        }
    }
    else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action: ' . $action]);
    }

} elseif ($request_method === 'DELETE') {
    // Delete notification
    $notif_id = isset($_GET['id']) ? intval($_GET['id']) : null;

    if (!$notif_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'id parameter is required']);
        exit();
    }

    if ($helper->deleteNotification($notif_id)) {
        logAuditAction($current_user_id, 'DELETE', 'notification_logs', 
                      "Deleted notification $notif_id", $conn);
        
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Notification deleted']);
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => implode(', ', $helper->getErrors())]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>
