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

$query = "SELECT cc.contract_id, cc.deceased_id, cc.struct_id, cc.expiration_date,
                 p.first_name, p.last_name, p.household_id,
                 cs.block_name, cs.level_number, cs.niche_number
          FROM cemetery_contracts cc
          INNER JOIN persons p ON p.person_id = cc.deceased_id
          LEFT JOIN cemetery_structures cs ON cs.struct_id = cc.struct_id
          WHERE cc.is_archived = 0
            AND cc.expiration_date IS NOT NULL
            AND p.household_id IS NOT NULL
            AND cc.status IN ('Active', 'Expired', 'For Transfer')
          ORDER BY cc.expiration_date ASC";
$result = $conn->query($query);

if (!$result) {
    http_response_code(500);
    exit(json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]));
}

$remindersSent = 0;
$overdueNoticesSent = 0;
$expiredContracts = 0;
$errors = [];

while ($contract = $result->fetch_assoc()) {
    $contractId = (int)$contract['contract_id'];
    $deceasedId = (int)$contract['deceased_id'];
    $householdId = (int)$contract['household_id'];
    $expirationDate = $contract['expiration_date'];
    $deceasedName = trim($contract['first_name'] . ' ' . $contract['last_name']);

    $daysUntilExpiration = (int)$conn->query(
        "SELECT DATEDIFF('$expirationDate', CURDATE()) AS days_until_expiration"
    )->fetch_assoc()['days_until_expiration'];

    $noticeType = null;
    if ($daysUntilExpiration === 7 && $contract['status'] === 'Active') {
        $noticeType = 'cemetery_contract_7_day_reminder';
    } elseif ($daysUntilExpiration <= -7 && $contract['status'] === 'Active') {
        $noticeType = 'cemetery_contract_7_day_overdue';
    }

    if ($noticeType === null) {
        continue;
    }

    $membersQuery = "SELECT person_id
                     FROM persons
                     WHERE household_id = $householdId
                       AND person_id != $deceasedId
                       AND is_alive = 1";
    $membersResult = $conn->query($membersQuery);
    if (!$membersResult) {
        $errors[] = "Contract ID $contractId: Failed to find household members";
        continue;
    }

    $allNotificationsSent = true;
    while ($member = $membersResult->fetch_assoc()) {
        $memberId = (int)$member['person_id'];
        $duplicateQuery = "SELECT notif_id
                            FROM notification_logs
                            WHERE person_id = $memberId
                              AND action_type = '$noticeType'
                              AND message_body LIKE '%Contract ID $contractId%'
                            LIMIT 1";
        $duplicateResult = $conn->query($duplicateQuery);
        if (!$duplicateResult || $duplicateResult->num_rows > 0) {
            continue;
        }

        if ($noticeType === 'cemetery_contract_7_day_reminder') {
            $message = "Cemetery payment reminder: The contract for $deceasedName expires on $expirationDate, which is 7 days from now. Please visit the parish to renew the burial arrangement. Contract ID $contractId.";
        } else {
            $message = "Cemetery payment overdue: The contract for $deceasedName expired on $expirationDate and has been unpaid for 7 days. The case is now queued for parish review before any transfer to a common grave. Please contact the parish immediately. Contract ID $contractId.";
        }

        $escapedMessage = $conn->real_escape_string($message);
        $insertQuery = "INSERT INTO notification_logs
                        (person_id, message_body, notif_type, category, sent_status, action_url, action_type, is_read, sent_at)
                        VALUES ($memberId, '$escapedMessage', 'InApp', 'Cemetery Contracts', 'Sent',
                                '/cemetery-records?tab=contracts', '$noticeType', 0, NOW())";
        if ($conn->query($insertQuery)) {
            if ($noticeType === 'cemetery_contract_7_day_reminder') {
                $remindersSent++;
            } else {
                $overdueNoticesSent++;
            }
        } else {
            $allNotificationsSent = false;
            $errors[] = "Contract ID $contractId: Failed to notify household member $memberId";
        }
    }

    if ($noticeType === 'cemetery_contract_7_day_overdue' && $allNotificationsSent) {
        $conn->query("UPDATE cemetery_contracts SET status = 'For Transfer' WHERE contract_id = $contractId");
        if (!empty($contract['struct_id'])) {
            $structId = (int)$contract['struct_id'];
            $conn->query("UPDATE cemetery_structures SET status = 'Expired' WHERE struct_id = $structId");
        }
        $expiredContracts++;
    }
}

echo json_encode([
    'success' => true,
    'reminders_sent' => $remindersSent,
    'overdue_notices_sent' => $overdueNoticesSent,
    'expired_contracts' => $expiredContracts,
    'errors' => $errors
]);
?>
