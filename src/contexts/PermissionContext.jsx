import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const PermissionContext = createContext();

export const usePermission = () => {
    const context = useContext(PermissionContext);
    if (!context) {
        throw new Error('usePermission must be used within a PermissionProvider');
    }
    return context;
};

export const PermissionProvider = ({ children }) => {
    const { user } = useAuth();
    const [permissions, setPermissions] = useState(null);
    const [moduleAccess, setModuleAccess] = useState({});
    const [loading, setLoading] = useState(false);

    // Fetch permissions when user changes
    useEffect(() => {
        if (user?.user_role) {
            fetchPermissions(user.user_role);
        }
    }, [user?.user_role]);

    const fetchPermissions = async (role) => {
        setLoading(true);
        try {
            const response = await fetch(
                `http://localhost/josephus/st.joseph/public/api/check-permissions.php?role=${role}`
            );
            const data = await response.json();

            if (data.success) {
                setPermissions(data.permissions);
                setModuleAccess(data.module_access);
            }
        } catch (error) {
            console.error('Error fetching permissions:', error);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Check if user has permission to perform an action on a module
     * @param {string} module Module name
     * @param {string} action Action (create, read, update, delete) - defaults to 'read'
     * @returns {boolean}
     */
    const hasPermission = (module, action = 'read') => {
        if (!permissions || !permissions[module]) {
            return false;
        }
        return permissions[module].includes(action);
    };

    /**
     * Check if user can access a module at all
     * @param {string} module Module name
     * @returns {boolean}
     */
    const canAccessModule = (module) => {
        return moduleAccess[module] && moduleAccess[module] !== 'none';
    };

    /**
     * Check if user has read access to a module
     * @param {string} module Module name
     * @returns {boolean}
     */
    const canRead = (module) => {
        return hasPermission(module, 'read');
    };

    /**
     * Check if user can create records in a module
     * @param {string} module Module name
     * @returns {boolean}
     */
    const canCreate = (module) => {
        return hasPermission(module, 'create');
    };

    /**
     * Check if user can update records in a module
     * @param {string} module Module name
     * @returns {boolean}
     */
    const canUpdate = (module) => {
        return hasPermission(module, 'update');
    };

    /**
     * Check if user can delete records in a module
     * @param {string} module Module name
     * @returns {boolean}
     */
    const canDelete = (module) => {
        return hasPermission(module, 'delete');
    };

    /**
     * Get access level for a module (for UI styling)
     * @param {string} module Module name
     * @returns {string} 'full', 'read_write', 'read_only', or 'none'
     */
    const getAccessLevel = (module) => {
        return moduleAccess[module] || 'none';
    };

    /**
     * Get all accessible modules for the user
     * @returns {array}
     */
    const getAccessibleModules = () => {
        return Object.keys(moduleAccess).filter(
            (module) => moduleAccess[module] !== 'none'
        );
    };

    const value = {
        permissions,
        moduleAccess,
        loading,
        hasPermission,
        canAccessModule,
        canRead,
        canCreate,
        canUpdate,
        canDelete,
        getAccessLevel,
        getAccessibleModules,
    };

    return (
        <PermissionContext.Provider value={value}>
            {children}
        </PermissionContext.Provider>
    );
};
