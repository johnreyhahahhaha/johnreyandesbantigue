import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Paper,
    TextField,
    Button,
    Box,
    Typography,
    Alert,
    CircularProgress,
    InputAdornment,
    IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
    const navigate = useNavigate();
    const { login, loading } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const handleClickShowPassword = () => {
        setShowPassword(!showPassword);
    };

    const handleMouseDownPassword = (event) => {
        event.preventDefault();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!username.trim() || !password.trim()) {
            setError('Please enter both username and password');
            return;
        }

        const result = await login(username, password);
        if (result.success) {
            navigate('/dashboard');
        } else {
            setError(result.message || 'Login failed');
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #1e3a8a 0%, #0f766e 100%)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                py: 2,
                position: 'relative',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(30, 58, 138, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(15, 118, 110, 0.1) 0%, transparent 50%)',
                    pointerEvents: 'none',
                },
            }}
        >
            <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
                <Paper
                    elevation={2}
                    sx={{
                        p: 4,
                        borderRadius: 2,
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                    }}
                >
                    {/* Header */}
                    <Box sx={{ textAlign: 'center', mb: 4 }}>
                        <Box
                            sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 56,
                                height: 56,
                                borderRadius: 2,
                                backgroundColor: '#eff6ff',
                                mb: 2,
                                margin: '0 auto 1rem',
                            }}
                        >
                            <Typography sx={{ fontSize: 28, fontWeight: 700, color: '#1e40af' }}>
                                ⛪
                            </Typography>
                        </Box>
                        <Typography
                            variant="h5"
                            component="h1"
                            sx={{
                                fontWeight: 700,
                                color: '#1e293b',
                                mb: 0.5,
                            }}
                        >
                            St. Joseph Parish
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                            Management System
                        </Typography>
                    </Box>

                    {error && (
                        <Alert
                            severity="error"
                            sx={{
                                mb: 3,
                                backgroundColor: '#fee2e2',
                                color: '#991b1b',
                                borderColor: '#fecaca',
                                '& .MuiAlert-icon': {
                                    color: '#dc2626',
                                },
                            }}
                        >
                            {error}
                        </Alert>
                    )}

                    <Box component="form" onSubmit={handleSubmit}>
                        <TextField
                            fullWidth
                            label="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={loading}
                            sx={{ mb: 2.5 }}
                            autoComplete="username"
                            variant="outlined"
                            InputLabelProps={{
                                sx: { fontWeight: 500 },
                            }}
                        />

                        <TextField
                            fullWidth
                            label="Password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                            sx={{ mb: 3 }}
                            autoComplete="current-password"
                            variant="outlined"
                            InputLabelProps={{
                                sx: { fontWeight: 500 },
                            }}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={handleClickShowPassword}
                                            onMouseDown={handleMouseDownPassword}
                                            edge="end"
                                            disabled={loading}
                                        >
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <Button
                            fullWidth
                            variant="contained"
                            size="large"
                            type="submit"
                            disabled={loading}
                            sx={{
                                background: 'linear-gradient(135deg, #1e3a8a 0%, #0f766e 100%)',
                                py: 1.25,
                                fontSize: '0.95rem',
                                fontWeight: 700,
                                textTransform: 'none',
                                position: 'relative',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                '&:hover': {
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
                                },
                            }}
                        >
                            {loading ? (
                                <CircularProgress size={20} color="inherit" />
                            ) : (
                                'Sign In'
                            )}
                        </Button>
                    </Box>

                    {/* Test Accounts Info */}
                    <Box sx={{ mt: 4, p: 3, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid #e2e8f0' }}>
                        <Typography variant="overline" sx={{ color: '#64748b', fontWeight: 700, mb: 1.5, display: 'block' }}>
                            Test Accounts
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {[
                                { role: 'Admin', user: 'admin', pass: 'password123' },
                                { role: 'Priest', user: 'father_jose', pass: 'priest123' },
                                { role: 'Secretary', user: 'secretary_maria', pass: 'sec123' },
                                { role: 'Treasurer', user: 'treasurer_juan', pass: 'treas123' },
                            ].map((account) => (
                                <Box key={account.role} sx={{ fontSize: '0.85rem', color: '#64748b' }}>
                                    <strong style={{ color: '#1e293b' }}>{account.role}:</strong>{' '}
                                    <code style={{ backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>
                                        {account.user}
                                    </code>
                                    {' / '}
                                    <code style={{ backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>
                                        {account.pass}
                                    </code>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </Paper>

                {/* Footer */}
                <Box sx={{ mt: 4, textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        St. Joseph Parish Management System © 2026
                    </Typography>
                </Box>
            </Container>
        </Box>
    );
};

export default LoginPage;
