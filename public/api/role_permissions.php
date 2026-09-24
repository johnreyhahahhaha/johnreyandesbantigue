<?php
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

if (!$conn) {
    http_response_code(500);
    exit(json_encode(['success' => false, 'message' => 'Database connection not available']));
}

$request_method = $_SERVER['REQUEST_METHOD'];
$data = $request_method === 'POST' ? (json_decode(file_get_contents("php://input"), true) ?? []) : [];
$request_user_id = intval($_GET['user_id'] ?? ($data['user_id'] ?? 0));
$admin_check = $conn->query("SELECT user_role FROM system_users WHERE user_id = $request_user_id LIMIT 1");
$admin_user = $admin_check ? $admin_check->fetch_assoc() : null;
if (!$admin_user || $admin_user['user_role'] !== 'Admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Only Admin users can manage role permissions']);
    exit();
}

if ($request_method === 'GET') {
    // Get all role permissions with permission details
    $query = "SELECT rp.role_name, rp.perm_id, p.perm_name, p.description 
              FROM role_permissions rp
              LEFT JOIN permissions p ON rp.perm_id = p.perm_id
              ORDER BY rp.role_name, rp.perm_id";

    $result = $conn->query($query);

    if (!$result) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]);
        exit();
    }

    $role_permissions = [];
    while ($row = $result->fetch_assoc()) {
        $role_permissions[] = $row;
    }

    // Also get all roles and permissions for reference
    $roles_query = "SELECT DISTINCT role_name FROM role_permissions ORDER BY role_name";
    $roles_result = $conn->query($roles_query);
    $roles = [];
    while ($role = $roles_result->fetch_assoc()) {
        $roles[] = $role['role_name'];
    }

    $perms_query = "SELECT perm_id, perm_name, description FROM permissions ORDER BY perm_id";
    $perms_result = $conn->query($perms_query);
    $permissions = [];
    while ($perm = $perms_result->fetch_assoc()) {
        $permissions[] = $perm;
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $role_permissions,
        'roles' => $roles,
        'available_permissions' => $permissions,
        'count' => count($role_permissions)
    ]);

} elseif ($request_method === 'POST') {
    // Add permission to role
    if (!isset($data['role_name']) || !isset($data['perm_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields: role_name, perm_id']);
        exit();
    }

    $role_name = $conn->real_escape_string($data['role_name']);
    $perm_id = intval($data['perm_id']);

    // Validate role exists
    $valid_roles = ['Admin', 'Priest', 'Secretary', 'Treasurer'];
    if (!in_array($role_name, $valid_roles)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid role. Valid roles: ' . implode(', ', $valid_roles)]);
        exit();
    }

    // Check if permission already exists for this role
    $check_query = "SELECT * FROM role_permissions WHERE role_name = '$role_name' AND perm_id = $perm_id";
    $check_result = $conn->query($check_query);

    if ($check_result->num_rows > 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'This permission already exists for this role']);
        exit();
    }

    $query = "INSERT INTO role_permissions (role_name, perm_id) VALUES ('$role_name', $perm_id)";

    if ($conn->query($query) === TRUE) {
        logAuditAction($_SESSION['user_id'] ?? 0, 'CREATE', 'role_permissions', "Added permission $perm_id to role $role_name", $conn);

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Permission added to role successfully'
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to add permission: ' . $conn->error]);
    }

} elseif ($request_method === 'DELETE') {
    // Remove permission from role
    $role_name = isset($_GET['role_name']) ? $conn->real_escape_string($_GET['role_name']) : null;
    $perm_id = isset($_GET['perm_id']) ? intval($_GET['perm_id']) : null;

    if (!$role_name || !$perm_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing role_name or perm_id']);
        exit();
    }

    $query = "DELETE FROM role_permissions WHERE role_name = '$role_name' AND perm_id = $perm_id";

    if ($conn->query($query) === TRUE) {
        logAuditAction($_SESSION['user_id'] ?? 0, 'DELETE', 'role_permissions', "Removed permission $perm_id from role $role_name", $conn);

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Permission removed from role successfully'
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to remove permission: ' . $conn->error]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

$conn->close();
?>
