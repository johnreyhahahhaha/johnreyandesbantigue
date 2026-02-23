<?php
/**
 * Audit Logging Functions
 * Handles all audit log entries for tracking user activities
 */

require_once 'config.php';

/**
 * Log an action to the audit_logs table
 * 
 * @param int $user_id - ID of the user performing the action
 * @param string $action_type - Type of action (CREATE, UPDATE, DELETE, LOGIN, etc.)
 * @param string $table_affected - Name of the table affected
 * @param string $description - Description of what was done
 * @param mysqli $conn - Database connection
 * @return bool - True if logged successfully, false otherwise
 */
function logAuditAction($user_id, $action_type, $table_affected, $description, $conn) {
    // Validate inputs
    if (empty($user_id) || empty($action_type) || empty($table_affected) || empty($description)) {
        error_log("Audit log: Missing required parameters - user_id: $user_id, action: $action_type, table: $table_affected");
        return false;
    }

    // Sanitize inputs
    $user_id = intval($user_id);
    $action_type = $conn->real_escape_string(substr($action_type, 0, 50));
    $table_affected = $conn->real_escape_string(substr($table_affected, 0, 50));
    $description = $conn->real_escape_string(substr($description, 0, 1000));

    // Insert into audit_logs
    $query = "INSERT INTO audit_logs (user_id, action_type, table_affected, description, log_timestamp) 
              VALUES ($user_id, '$action_type', '$table_affected', '$description', NOW())";

    if ($conn->query($query) === TRUE) {
        return true;
    } else {
        error_log("Audit log failed: " . $conn->error);
        return false;
    }
}

/**
 * Log a CREATE action
 */
function logCreate($user_id, $table_affected, $item_name, $conn) {
    $description = "Created new $table_affected: $item_name";
    return logAuditAction($user_id, 'CREATE', $table_affected, $description, $conn);
}

/**
 * Log an UPDATE action
 */
function logUpdate($user_id, $table_affected, $item_id, $item_name, $conn) {
    $description = "Updated $table_affected (ID: $item_id): $item_name";
    return logAuditAction($user_id, 'UPDATE', $table_affected, $description, $conn);
}

/**
 * Log a DELETE action
 */
function logDelete($user_id, $table_affected, $item_id, $item_name, $conn) {
    $description = "Deleted $table_affected (ID: $item_id): $item_name";
    return logAuditAction($user_id, 'DELETE', $table_affected, $description, $conn);
}

?>
