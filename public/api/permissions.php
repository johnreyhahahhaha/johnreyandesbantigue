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
        'livestreams' => ['create', 'read', 'update', 'delete'],
        'community' => ['create', 'read', 'update', 'delete'],
        'document_requests' => ['create', 'read', 'update', 'delete'],
        'cemetery_records' => ['create', 'read', 'update', 'delete'],
        'cemetery_contracts' => ['create', 'read', 'update', 'delete'],
        'cemetery_sections' => ['create', 'read', 'update', 'delete'],
        'cemetery_structures' => ['create', 'read', 'update', 'delete'],
        'burial_records' => ['create', 'read', 'update', 'delete'],
        'exhumation_records' => ['create', 'read', 'update', 'delete'],
        'file_attachments' => ['create', 'read', 'update', 'delete'],
         //'notification_logs' => ['create', 'read', 'update', 'delete'],
        //'parish_config' => ['create', 'read', 'update', 'delete'],
        'requirement_checklists' => ['create', 'read', 'update', 'delete'],
       // 'sacramental_annotations' => ['create', 'read', 'update', 'delete'],
        'seminar_attendance' => ['create', 'read', 'update', 'delete'],
        'service_fees' => ['create', 'read', 'update', 'delete'],
       // 'accounting_categories' => ['create', 'read', 'update', 'delete'],
        'ministries' => ['create', 'read', 'update', 'delete'],
        'branding_settings' => ['create', 'read', 'update', 'delete'],
        'announcements' => ['create', 'read', 'update', 'delete'],
       // 'send_notification' => ['create', 'read'],
        'document_templates' => ['create', 'read', 'update', 'delete'],
        'programs' => ['create', 'read', 'update', 'delete'],
        'settings' => ['read'],
        //'godparents_records' => ['create', 'read', 'update', 'delete'],
        'chat' => ['create', 'read'],
    ],
    'Secretary' => [
        'user_management' => [],
        'audit_logs' => ['read'],
        'people_records' => ['create', 'read', 'update', 'delete'],
        'sacraments' => ['create', 'read', 'update', 'delete'],
        'finances' => ['read'],
        'assets' => ['read'],
        'schedules' => ['create', 'read', 'update', 'delete'],
        'livestreams' => ['create', 'read', 'update', 'delete'],
        'community' => ['create', 'read', 'update', 'delete'],
        'document_requests' => ['create', 'read', 'update', 'delete'],
        'cemetery_records' => ['create', 'read', 'update', 'delete'],
        'cemetery_contracts' => ['create', 'read', 'update', 'delete'],
        'cemetery_sections' => ['create', 'read', 'update', 'delete'],
        'cemetery_structures' => ['create', 'read', 'update', 'delete'],
        'burial_records' => ['create', 'read', 'update', 'delete'],
        'exhumation_records' => ['create', 'read', 'update', 'delete'],
        'file_attachments' => ['create', 'read', 'update', 'delete'],
     //   'notification_logs' => ['read'],
       // 'parish_config' => [],
        'requirement_checklists' => ['create', 'read', 'update', 'delete'],
      //  'sacramental_annotations' => ['create', 'read', 'update', 'delete'],
        'seminar_attendance' => ['create', 'read', 'update', 'delete'],
        'service_fees' => ['read'],
       // 'godparents_records' => ['create', 'read', 'update', 'delete'],
        'chat' => ['create', 'read'],
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
        'cemetery_contracts' => ['read'],
        'cemetery_sections' => ['read'],
        'cemetery_structures' => ['read'],
        'burial_records' => [],
        'exhumation_records' => [],
        'file_attachments' => [],
     //   'notification_logs' => [],
      //  'parish_config' => [],
        'requirement_checklists' => [],
      //  'sacramental_annotations' => [],
        'seminar_attendance' => ['read'],
        'service_fees' => ['read'],
        //'godparents_records' => [],
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
        'announcements' => ['create', 'read', 'update'],
        'cemetery_records' => ['create', 'read', 'update', 'delete'],
        'cemetery_contracts' => ['read'],
        'cemetery_sections' => ['read'],
        'cemetery_structures' => ['read'],
        'burial_records' => ['create', 'read', 'update', 'delete'],
        'exhumation_records' => ['create', 'read', 'update'],
        'file_attachments' => ['create', 'read', 'update', 'delete'],
       // 'notification_logs' => [],
      //  'parish_config' => [],
        'requirement_checklists' => ['create', 'read', 'update', 'delete'],
       // 'sacramental_annotations' => ['create', 'read', 'update', 'delete'],
        'seminar_attendance' => ['create', 'read', 'update', 'delete'],
        'service_fees' => ['read'],
      //  'godparents_records' => ['create', 'read', 'update', 'delete'],
        'chat' => ['create', 'read'],
    ],
    'Person' => [
        // Persons can view their own records and requests; limited access
        'people_records' => ['read'],
        'sacraments' => ['read'],
        'document_requests' => ['create', 'read'],
        'sacramental_annotations' => ['read'],
        'requirement_checklists' => ['read'],
        'chat' => ['create', 'read'],
    ],
];

/**
 * Resolve database-assigned permissions when a role has custom assignments.
 * Roles without assignments continue using the existing default definitions.
 */
function getEffectiveRolePermissions($role) {
    global $conn, $rolePermissions;

    if (!isset($conn) || !($conn instanceof mysqli)) {
        return $rolePermissions[$role] ?? [];
    }

    $roleEscaped = $conn->real_escape_string($role);
    $query = "SELECT p.perm_name
              FROM role_permissions rp
              INNER JOIN permissions p ON p.perm_id = rp.perm_id
              WHERE rp.role_name = '$roleEscaped'";
    $result = $conn->query($query);

    if (!$result || $result->num_rows === 0) {
        return $rolePermissions[$role] ?? [];
    }

    $assignedPermissions = [];
    while ($row = $result->fetch_assoc()) {
        $assignedPermissions[] = $row['perm_name'];
    }

    $moduleNames = [
        'user_management', 'audit_logs', 'people_records', 'sacraments',
        'finances', 'assets', 'schedules', 'livestreams', 'community',
        'document_requests', 'cemetery_records', 'cemetery_contracts',
        'cemetery_sections', 'cemetery_structures', 'burial_records',
        'exhumation_records', 'file_attachments',
        'requirement_checklists',
        'announcements', 'chat',
        'seminar_attendance', 'service_fees',
        'ministries', 'branding_settings',
        'document_templates', 'programs', 'settings'
    ];

    $modules = [];
    foreach ($moduleNames as $module) {
        $modules[$module] = [];
    }

    foreach ($assignedPermissions as $permission) {
        if ($permission === 'manage_all') {
            foreach ($modules as $module => $actions) {
                $modules[$module] = ['create', 'read', 'update', 'delete'];
            }
        } elseif ($permission === 'view_records') {
            foreach ($modules as $module => $actions) {
                $modules[$module][] = 'read';
            }
        } elseif ($permission === 'edit_records') {
            foreach ($modules as $module => $actions) {
                $modules[$module] = array_merge($modules[$module], ['read', 'update']);
            }
        } elseif ($permission === 'manage_finances') {
            $modules['finances'] = ['create', 'read', 'update', 'delete'];
        }
    }

    foreach ($modules as $module => $actions) {
        $modules[$module] = array_values(array_unique($actions));
    }

    return $modules;
}

/**
 * Check if user has permission to perform an action on a module
 * @param string $role User role
 * @param string $module Module name
 * @param string $action Action (create, read, update, delete)
 * @return bool
 */
function hasPermission($role, $module, $action = 'read') {
    $effectivePermissions = getEffectiveRolePermissions($role);

    if (!isset($effectivePermissions[$module])) {
        return false;
    }

    return in_array($action, $effectivePermissions[$module]);
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
    return getEffectiveRolePermissions($role);
}

/**
 * Get module access level for UI display
 * @param string $role User role
 * @param string $module Module name
 * @return string 'full', 'read_only', 'read_write', or 'none'
 */
function getModuleAccessLevel($role, $module) {
    $effectivePermissions = getEffectiveRolePermissions($role);

    if (!isset($effectivePermissions[$module])) {
        return 'none';
    }

    $actions = $effectivePermissions[$module];
    
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
