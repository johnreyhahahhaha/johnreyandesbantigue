<?php

class UserNotificationHelper
{
    private $conn;
    private $errors = [];

    public function __construct($conn)
    {
        $this->conn = $conn;
    }

    public static function toTitleCase($value)
    {
        if (!is_string($value)) {
            return '';
        }

        $value = trim($value);
        if ($value === '') {
            return '';
        }

        $lowercaseWords = ['sa', 'ng', 'at', 'and', 'of', 'the', 'a', 'an'];
        $parts = preg_split('/\s+/', $value);
        $result = [];

        foreach ($parts as $part) {
            $normalized = trim($part);
            if ($normalized === '') {
                continue;
            }

            if ($normalized === '&') {
                $result[] = '&';
                continue;
            }

            $lower = strtolower($normalized);
            if (in_array($lower, $lowercaseWords, true)) {
                $result[] = $lower;
                continue;
            }

            $result[] = ucfirst($lower);
        }

        return implode(' ', $result);
    }

    public static function sanitizeNotificationText($text)
    {
        if (!is_string($text)) {
            return '';
        }

        $cleanText = trim($text);
        $cleanText = preg_replace('/\s*\[[^\]]+\]\s*/', ' ', $cleanText);
        $cleanText = preg_replace('/\s+/', ' ', $cleanText);
        $cleanText = trim($cleanText);

        if ($cleanText === '') {
            return '';
        }

        $separatorPos = strpos($cleanText, ' - ');
        if ($separatorPos !== false) {
            $prefix = substr($cleanText, 0, $separatorPos + 3);
            $suffix = substr($cleanText, $separatorPos + 3);
            $suffix = preg_replace('/\s+sa\s+/i', ' sa ', $suffix);

            if (preg_match('/^(.*?)(\s+sa\s+.*)$/i', $suffix, $matches)) {
                $namePart = $matches[1];
                $rest = $matches[2];
                $cleanText = $prefix . self::toTitleCase($namePart) . $rest;
            } else {
                $cleanText = $prefix . self::toTitleCase($suffix);
            }
        }

        return trim((string) $cleanText);
    }

    public function getErrors()
    {
        return $this->errors;
    }

    public function sendUserNotification($person_id, $message_body, $category = 'General', $options = [])
    {
        $person_id = intval($person_id);
        $message_body = self::sanitizeNotificationText($message_body);

        if ($person_id <= 0 || $message_body === '') {
            $this->errors[] = 'person_id and message_body are required';
            return false;
        }

        $action_url = isset($options['action_url']) ? $this->conn->real_escape_string($options['action_url']) : null;
        $action_type = isset($options['action_type']) ? $this->conn->real_escape_string($options['action_type']) : null;
        $category = $this->conn->real_escape_string($category);
        $message_body = $this->conn->real_escape_string($message_body);

        $query = "INSERT INTO notification_logs (person_id, message_body, notif_type, category, sent_status, action_url, action_type, is_read, sent_at) " .
                 "VALUES ($person_id, '$message_body', 'InApp', '$category', 'Sent', " .
                 ($action_url ? "'$action_url'" : 'NULL') . ", " .
                 ($action_type ? "'$action_type'" : 'NULL') . ", 0, NOW())";

        if ($this->conn->query($query)) {
            return $this->conn->insert_id;
        }

        $this->errors[] = 'Database error: ' . $this->conn->error;
        return false;
    }

    public function sendRoleBasedNotification($target_role, $message_body, $category = 'General', $options = [])
    {
        $target_role = trim($target_role);
        $message_body = trim($message_body);

        if ($target_role === '' || $message_body === '') {
            $this->errors[] = 'target_role and message_body are required';
            return [];
        }

        $target_role = $this->conn->real_escape_string($target_role);
        $query = "SELECT person_id FROM system_users WHERE user_role = '$target_role' AND person_id IS NOT NULL";
        $result = $this->conn->query($query);

        if (!$result) {
            $this->errors[] = 'Database error: ' . $this->conn->error;
            return [];
        }

        $notif_ids = [];
        while ($row = $result->fetch_assoc()) {
            $notif_id = $this->sendUserNotification($row['person_id'], $message_body, $category, $options);
            if ($notif_id) {
                $notif_ids[] = $notif_id;
            }
        }

        if (empty($notif_ids)) {
            $this->errors[] = 'No users found for role: ' . $target_role;
        }

        return $notif_ids;
    }

    public function sendSystemAnnouncement($message_body, $category = 'General', $options = [])
    {
        $message_body = self::sanitizeNotificationText($message_body);

        if ($message_body === '') {
            $this->errors[] = 'message_body is required';
            return false;
        }

        $action_url = isset($options['action_url']) ? $this->conn->real_escape_string($options['action_url']) : null;
        $action_type = isset($options['action_type']) ? $this->conn->real_escape_string($options['action_type']) : null;
        $category = $this->conn->real_escape_string($category);
        $message_body = $this->conn->real_escape_string($message_body);

        $query = "INSERT INTO notification_logs (person_id, message_body, notif_type, category, sent_status, action_url, action_type, is_read, sent_at) \
                  VALUES (NULL, '$message_body', 'InApp', '$category', 'Sent', " .
                  ($action_url ? "'$action_url'" : 'NULL') . ", " .
                  ($action_type ? "'$action_type'" : 'NULL') . ", 0, NOW())";

        if ($this->conn->query($query)) {
            return true;
        }

        $this->errors[] = 'Database error: ' . $this->conn->error;
        return false;
    }

    public function markAsRead($notif_id)
    {
        $notif_id = intval($notif_id);

        if ($notif_id <= 0) {
            $this->errors[] = 'notif_id is required';
            return false;
        }

        $query = "UPDATE notification_logs SET is_read = 1, read_at = NOW() WHERE notif_id = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param('i', $notif_id);

        if ($stmt->execute()) {
            return true;
        }

        $this->errors[] = 'Database error: ' . $this->conn->error;
        return false;
    }

    public function deleteNotification($notif_id)
    {
        $notif_id = intval($notif_id);

        if ($notif_id <= 0) {
            $this->errors[] = 'notif_id is required';
            return false;
        }

        $query = "DELETE FROM notification_logs WHERE notif_id = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param('i', $notif_id);

        if ($stmt->execute()) {
            return true;
        }

        $this->errors[] = 'Database error: ' . $this->conn->error;
        return false;
    }
}
