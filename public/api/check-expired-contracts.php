<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once 'config.php';
require_once 'permissions.php';
require_once 'audit.php';

if (!$conn) {
    http_response_code(500);
    exit(json_encode(['success' => false, 'message' => 'Database connection not available']));
}

$request_method = $_SERVER['REQUEST_METHOD'];

if ($request_method === 'GET' || $request_method === 'POST') {
    // Get all expired contracts that haven't been notified yet
    $query = "SELECT cc.*, p.person_id, p.household_id, p.first_name, p.last_name
              FROM cemetery_contracts cc
              LEFT JOIN persons p ON cc.deceased_id = p.person_id
              WHERE cc.expiration_date <= CURDATE() 
              AND cc.status != 'Expired'
              AND cc.notice_count = 0
              AND cc.is_archived = 0
              ORDER BY cc.expiration_date DESC";
    
    $result = $conn->query($query);
    
    if (!$result) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]);
        exit();
    }
    
    $expiredContracts = [];
    $notificationsSent = 0;
    $errors = [];
    
    while ($contract = $result->fetch_assoc()) {
        $expiredContracts[] = $contract;
        
        if (!$contract['deceased_id'] || !$contract['household_id']) {
            $errors[] = "Contract ID {$contract['contract_id']}: Missing deceased_id or household_id";
            continue;
        }
        
        // Get all household members (family of the deceased)
        $household_query = "SELECT person_id, first_name, last_name, email, contact_no 
                           FROM persons 
                           WHERE household_id = {$contract['household_id']} 
                           AND person_id != {$contract['deceased_id']}
                           AND is_alive = 1";
        
        $household_result = $conn->query($household_query);
        
        if (!$household_result) {
            $errors[] = "Contract ID {$contract['contract_id']}: Failed to get household members: " . $conn->error;
            continue;
        }
        
        // Send notifications to all family members
        while ($member = $household_result->fetch_assoc()) {
            $member_id = $member['person_id'];
            $message = "The cemetery contract for {$contract['first_name']} {$contract['last_name']} has expired (Expiration Date: {$contract['expiration_date']}). Please take necessary action to renew or address this matter.";
            
            // Insert InApp notification
            $notif_query = "INSERT INTO notification_logs 
                           (person_id, message_body, notif_type, category, sent_status, action_url, action_type, is_read, sent_at)
                           VALUES ($member_id, '" . $conn->real_escape_string($message) . "', 'InApp', 'Cemetery Contracts', 'Sent', '/cemetery-records?tab=contracts', 'view_expired_contract', 0, NOW())";
            
            if ($conn->query($notif_query) === TRUE) {
                $notificationsSent++;
            } else {
                $errors[] = "Failed to send notification to member $member_id for contract {$contract['contract_id']}: " . $conn->error;
            }
        }
        
        // Update the contract's notice_count to prevent duplicate notifications
        $update_query = "UPDATE cemetery_contracts SET notice_count = 1, status = 'Expired' WHERE contract_id = {$contract['contract_id']}";
        if (!$conn->query($update_query)) {
            $errors[] = "Failed to update contract {$contract['contract_id']}: " . $conn->error;
        }
    }
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Expired contract check completed',
        'expired_contracts_count' => count($expiredContracts),
        'notifications_sent' => $notificationsSent,
        'errors' => $errors,
        'contracts' => $expiredContracts
    ]);
    exit();
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed']);
exit();
?>
