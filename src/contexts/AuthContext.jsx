import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Check if user is already logged in (from localStorage)
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error('Error parsing stored user:', e);
                localStorage.removeItem('user');
            }
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        setLoading(true);
        setError(null);
        try {
            // Use Vite proxy at /api which rewrites to Apache
            const apiUrl = '/api/login.php';
            console.log('Login attempt', { apiUrl, username, password });
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            console.log('Response received:', { status: response.status, statusText: response.statusText });
            
            const text = await response.text();
            console.log('Response text:', text);
            
            const data = JSON.parse(text);

            if (data.success) {
                setUser(data.user);
                localStorage.setItem('user', JSON.stringify(data.user));
                return { success: true };
            } else {
                setError(data.message || 'Login failed');
                return { success: false, message: data.message };
            }
        } catch (err) {
            console.error('Login error:', err);
            console.error('Error stack:', err.stack);
            const errorMessage = err.message || 'Network error - Failed to reach server';
            setError(errorMessage);
            return { success: false, message: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
        setError(null);
    };

    const value = {
        user,
        loading,
        error,
        login,
        logout,
        isAuthenticated: !!user,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
