<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

require_once 'config.php';
require_once 'permissions.php';

$request_method = $_SERVER['REQUEST_METHOD'];

if ($request_method === 'GET') {
    // Get user permissions
    if (!isset($_GET['role'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'role parameter is required']);
        exit();
    }

    $role = $conn->real_escape_string($_GET['role']);

    // Validate role
    $validRoles = ['Admin', 'Secretary', 'Treasurer', 'Priest'];
    if (!in_array($role, $validRoles)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid role']);
        exit();
    }

    // Get permissions
    $permissions = getUserPermissions($role);

    // Get access levels for each module
    $modules = [
        'user_management',
        'audit_logs',
        'people_records',
        'sacraments',
        'finances',
        'assets',
        'schedules',
        'community',
        'document_requests',
        'cemetery_records',
        'file_attachments',
        'notification_logs',
        'parish_config',
        'requirement_checklists',
        'sacramental_annotations'
    ];

    $moduleAccess = [];
    foreach ($modules as $module) {
        $moduleAccess[$module] = getModuleAccessLevel($role, $module);
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'role' => $role,
        'permissions' => $permissions,
        'module_access' => $moduleAccess
    ]);
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

$conn->close();
?>
