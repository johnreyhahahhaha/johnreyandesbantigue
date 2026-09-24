<?php
/**
 * Chat Messages Foreign Key Constraint Fix
 * Fixes conflicting duplicate constraints preventing INSERT operations
 */

require_once 'config.php';

if (!$conn) {
    die('Database connection error');
}

echo "Starting chat_messages foreign key constraint fix...\n";

// List of constraints to drop
$constraints_to_drop = [
    'fk_chat_msg_recipient',
    'fk_chat_msg_recipient_user',
    'fk_chat_msg_sender',
    'fk_chat_msg_sender_user',
    'fk_chat_recipient',
    'fk_chat_recipient_user',
    'fk_chat_recipient_user_id',
    'fk_chat_sender',
    'fk_chat_sender_user',
    'fk_chat_sender_user_id'
];

echo "\nDropping conflicting constraints...\n";
foreach ($constraints_to_drop as $constraint) {
    $drop_query = "ALTER TABLE `chat_messages` DROP CONSTRAINT IF EXISTS `$constraint`";
    if ($conn->query($drop_query)) {
        echo "✓ Dropped constraint: $constraint\n";
    } else {
        echo "✗ Failed to drop constraint $constraint: " . $conn->error . "\n";
    }
}

echo "\nAdding clean constraints...\n";

// Add sender_id constraint
$add_sender = "ALTER TABLE `chat_messages`
  ADD CONSTRAINT `fk_chat_sender_id` FOREIGN KEY (`sender_id`) 
    REFERENCES `system_users` (`user_id`) ON DELETE CASCADE";

if ($conn->query($add_sender)) {
    echo "✓ Added constraint: fk_chat_sender_id\n";
} else {
    echo "✗ Failed to add sender constraint: " . $conn->error . "\n";
}

// Add recipient_id constraint
$add_recipient = "ALTER TABLE `chat_messages`
  ADD CONSTRAINT `fk_chat_recipient_id` FOREIGN KEY (`recipient_id`) 
    REFERENCES `system_users` (`user_id`) ON DELETE SET NULL";

if ($conn->query($add_recipient)) {
    echo "✓ Added constraint: fk_chat_recipient_id\n";
} else {
    echo "✗ Failed to add recipient constraint: " . $conn->error . "\n";
}

// Verify the fix
echo "\nVerifying constraints...\n";
$verify_query = "SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_NAME = 'chat_messages' AND TABLE_SCHEMA = 'josephus_parish_system'
AND COLUMN_NAME IN ('sender_id', 'recipient_id')
ORDER BY CONSTRAINT_NAME";

$result = $conn->query($verify_query);
if ($result) {
    while ($row = $result->fetch_assoc()) {
        echo "  - {$row['CONSTRAINT_NAME']}: {$row['COLUMN_NAME']} → {$row['REFERENCED_TABLE_NAME']}.{$row['REFERENCED_COLUMN_NAME']}\n";
    }
    echo "\n✓ Fix completed successfully!\n";
} else {
    echo "✗ Verification query failed: " . $conn->error . "\n";
}

$conn->close();
?>
