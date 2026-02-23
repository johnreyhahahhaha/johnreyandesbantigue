<?php
// Permission definitions for each role
$rolePermissions = [
    'Admin' => [
        'user_management' => ['create', 'read', 'update', 'delete'],
        'audit_logs' => ['create', 'read', 'delete'],
        'people_records' => ['create', 'read', 'update', 'delete'],
        'sacraments' => ['create', 'read', 'update', 'delete'],
        'finances' => ['create', 'read', 'update', 'delete'],
        'assets' => ['create', 'read', 'update', 'delete'],
        'schedules' => ['create', 'read', 'update', 'delete'],
        'community' => ['create', 'read', 'update', 'delete'],
        'document_requests' => ['create', 'read', 'update', 'delete'],
        'cemetery_records' => ['create', 'read', 'update', 'delete'],
        'file_attachments' => ['create', 'read', 'update', 'delete'],
        'notification_logs' => ['create', 'read', 'update', 'delete'],
        'parish_config' => ['create', 'read', 'update', 'delete'],
        'requirement_checklists' => ['create', 'read', 'update', 'delete'],
        'sacramental_annotations' => ['create', 'read', 'update', 'delete'],
    ],
    'Secretary' => [
        'user_management' => [],
        'audit_logs' => ['read'],
        'people_records' => ['create', 'read', 'update', 'delete'],
        'sacraments' => ['create', 'read', 'update', 'delete'],
        'finances' => ['read'],
        'assets' => ['read'],
        'schedules' => ['create', 'read', 'update', 'delete'],
        'community' => ['create', 'read', 'update', 'delete'],
        'document_requests' => ['create', 'read', 'update', 'delete'],
        'cemetery_records' => ['create', 'read', 'update', 'delete'],
        'file_attachments' => ['create', 'read', 'update', 'delete'],
        'notification_logs' => ['read'],
        'parish_config' => [],
        'requirement_checklists' => ['create', 'read', 'update', 'delete'],
        'sacramental_annotations' => ['create', 'read', 'update', 'delete'],
    ],
    'Treasurer' => [
        'user_management' => [],
        'audit_logs' => [],
        'people_records' => ['read'],
        'sacraments' => [],
        'finances' => ['create', 'read', 'update', 'delete'],
        'assets' => ['create', 'read', 'update', 'delete'],
        'schedules' => ['read'],
        'community' => ['read'],
        'document_requests' => ['read'],
        'cemetery_records' => [],
        'file_attachments' => [],
        'notification_logs' => [],
        'parish_config' => [],
        'requirement_checklists' => [],
        'sacramental_annotations' => [],
    ],
    'Priest' => [
        'user_management' => [],
        'audit_logs' => ['read'],
        'people_records' => ['read'],
        'sacraments' => ['create', 'read', 'update'],
        'finances' => ['read'],
        'assets' => ['read'],
        'schedules' => ['create', 'read', 'update', 'delete'],
        'community' => ['create', 'read', 'update', 'delete'],
        'document_requests' => ['read'],
        'cemetery_records' => ['create', 'read', 'update', 'delete'],
        'file_attachments' => ['create', 'read', 'update', 'delete'],
        'notification_logs' => [],
        'parish_config' => [],
        'requirement_checklists' => ['create', 'read', 'update', 'delete'],
        'sacramental_annotations' => ['create', 'read', 'update', 'delete'],
    ],
];

/**
 * Check if user has permission to perform an action on a module
 * @param string $role User role
 * @param string $module Module name
 * @param string $action Action (create, read, update, delete)
 * @return bool
 */
function hasPermission($role, $module, $action = 'read') {
    global $rolePermissions;
    
    if (!isset($rolePermissions[$role])) {
        return false;
    }
    
    if (!isset($rolePermissions[$role][$module])) {
        return false;
    }
    
    return in_array($action, $rolePermissions[$role][$module]);
}

/**
 * Check multiple permissions (requires all to be true)
 * @param string $role User role
 * @param array $permissions Array of ['module' => 'action']
 * @return bool
 */
function hasAllPermissions($role, $permissions) {
    foreach ($permissions as $module => $action) {
        if (!hasPermission($role, $module, $action)) {
            return false;
        }
    }
    return true;
}

/**
 * Check any permission (requires at least one to be true)
 * @param string $role User role
 * @param array $permissions Array of ['module' => 'action']
 * @return bool
 */
function hasAnyPermission($role, $permissions) {
    foreach ($permissions as $module => $action) {
        if (hasPermission($role, $module, $action)) {
            return true;
        }
    }
    return false;
}

/**
 * Get all modules and actions the user can access
 * @param string $role User role
 * @return array
 */
function getUserPermissions($role) {
    global $rolePermissions;
    
    if (!isset($rolePermissions[$role])) {
        return [];
    }
    
    return $rolePermissions[$role];
}

/**
 * Get module access level for UI display
 * @param string $role User role
 * @param string $module Module name
 * @return string 'full', 'read_only', 'read_write', or 'none'
 */
function getModuleAccessLevel($role, $module) {
    global $rolePermissions;
    
    if (!isset($rolePermissions[$role][$module])) {
        return 'none';
    }
    
    $actions = $rolePermissions[$role][$module];
    
    if (empty($actions)) {
        return 'none';
    }
    
    if (in_array('delete', $actions) && in_array('create', $actions)) {
        return 'full';
    } elseif (in_array('update', $actions) || in_array('create', $actions)) {
        return 'read_write';
    } elseif (in_array('read', $actions)) {
        return 'read_only';
    }
    
    return 'none';
}

?>
