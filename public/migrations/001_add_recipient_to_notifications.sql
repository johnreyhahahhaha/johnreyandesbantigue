-- Add recipient_address column to notification_logs table if it doesn't exist
-- This allows storing the actual email or phone number that the notification was sent to

-- Check if column exists and add if not
ALTER TABLE `notification_logs` 
ADD COLUMN `recipient_address` VARCHAR(255) DEFAULT NULL 
AFTER `notif_type`;

-- Add an index for faster queries
CREATE INDEX `idx_notification_recipient` ON `notification_logs`(`recipient_address`);
