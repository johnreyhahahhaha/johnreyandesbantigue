import React, { useEffect, useState } from 'react';
import churchBackground from '../717993287_1623680775374691_780089206435614440_n.jpg';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
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
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Link,
} from '@mui/material';
import { Visibility, VisibilityOff, Church, Lock, Person, LiveTv, PlayArrow, FiberManualRecord } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useBranding } from '../contexts/BrandingContext';
import { livestreamAPI, livestreamAccessAPI } from '../api/apiClient';

const LoginPage = () => {
    const navigate = useNavigate();
    const { login, loading } = useAuth();
    const { branding } = useBranding();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [liveEvents, setLiveEvents] = useState([]);
    const [liveLoading, setLiveLoading] = useState(true);

    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [registerEmail, setRegisterEmail] = useState('');
    const [registerStep, setRegisterStep] = useState('verify');
    const [registerPerson, setRegisterPerson] = useState(null);
    const [registerUsername, setRegisterUsername] = useState('');
    const [registerPassword, setRegisterPassword] = useState('');
    const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
    const [registerLoading, setRegisterLoading] = useState(false);
    const [registerError, setRegisterError] = useState('');
    const [registerMessage, setRegisterMessage] = useState('');

    const [forgotDialogOpen, setForgotDialogOpen] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotCode, setForgotCode] = useState('');
    const [forgotNewPassword, setForgotNewPassword] = useState('');
    const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
    const [forgotStep, setForgotStep] = useState('email');
    const [forgotError, setForgotError] = useState('');
    const [forgotMessage, setForgotMessage] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);

    // construct absolute URL; avoid the Vite dev port (5173) so that
    // the request hits Apache on port 80. origin includes the port so we
    // build manually using hostname + protocol.
    const serverBase = `${window.location.protocol}//${window.location.hostname}`;
    const logoUrl = branding.parish_logo
        ? `${serverBase}/josephus/st.joseph/public/uploads/${branding.parish_logo}?t=${encodeURIComponent(
              branding.last_updated || Date.now()
          )}`
        : '';
    const loginBackgroundUrl = `linear-gradient(105deg, rgba(8, 35, 46, 0.82) 0%, rgba(8, 35, 46, 0.62) 42%, rgba(8, 35, 46, 0.74) 100%), url(${churchBackground})`;

    useEffect(() => {
        const fetchGuestLiveEvents = async () => {
            try {
                const [livestreamRes, accessRes] = await Promise.all([
                    livestreamAPI.getAll(),
                    livestreamAccessAPI.getAll(),
                ]);
                const events = livestreamRes.data?.success ? livestreamRes.data.data || [] : [];
                const accessRows = accessRes.data?.success ? accessRes.data.data || [] : [];
                const accessByLivestream = new Map(
                    accessRows.map((row) => [String(row.livestream_id), row])
                );

                setLiveEvents(events.filter((event) => {
                    if (event.status !== 'Live') return false;
                    const access = accessByLivestream.get(String(event.livestream_id));
                    return !access || access.access_type === 'Public' || Number(access.allow_guest_viewers) === 1;
                }));
            } catch (err) {
                console.error('Failed to fetch guest live events', err);
                setLiveEvents([]);
            } finally {
                setLiveLoading(false);
            }
        };

        fetchGuestLiveEvents();
    }, []);

    const handleClickShowPassword = () => {
        setShowPassword(!showPassword);
    };

    const handleMouseDownPassword = (event) => {
        event.preventDefault();
    };

    const resetRegisterState = () => {
        setRegisterEmail('');
        setRegisterStep('verify');
        setRegisterPerson(null);
        setRegisterUsername('');
        setRegisterPassword('');
        setRegisterConfirmPassword('');
        setRegisterLoading(false);
        setRegisterError('');
        setRegisterMessage('');
    };

    const handleRegisterModeToggle = () => {
        setIsRegisterMode((prev) => !prev);
        setError('');
        resetRegisterState();
    };

    const handleVerifyEmail = async () => {
        setRegisterError('');
        setRegisterMessage('');

        if (!registerEmail.trim()) {
            setRegisterError('Please enter your Gmail address');
            return;
        }

        setRegisterLoading(true);
        try {
            const response = await fetch('http://165.22.181.147/api/register.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({ email: registerEmail.trim() }),
            });

            const data = await response.json();
            if (data.success) {
                setRegisterPerson(data.person);
                setRegisterStep('create');
                setRegisterMessage(data.message || 'Email verified successfully');
            } else {
                setRegisterError(data.message || 'Email verification failed');
            }
        } catch (err) {
            setRegisterError('Failed to verify email. Please try again.');
            console.error('Verify email error:', err);
        } finally {
            setRegisterLoading(false);
        }
    };

    const handleCreateAccount = async () => {
        setRegisterError('');
        setRegisterMessage('');

        if (!registerUsername.trim() || !registerPassword || !registerConfirmPassword) {
            setRegisterError('Please fill in all registration fields');
            return;
        }

        if (registerPassword !== registerConfirmPassword) {
            setRegisterError('Password and confirmation do not match');
            return;
        }

        setRegisterLoading(true);
        try {
            const response = await fetch('http://165.22.181.147/api/register.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    email: registerEmail.trim(),
                    username: registerUsername.trim(),
                    password: registerPassword,
                }),
            });

            const data = await response.json();
            if (data.success) {
                setRegisterMessage(data.message || 'Account created successfully');
                setRegisterStep('done');
            } else {
                setRegisterError(data.message || 'Account creation failed');
            }
        } catch (err) {
            setRegisterError('Failed to create account. Please try again.');
            console.error('Create account error:', err);
        } finally {
            setRegisterLoading(false);
        }
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
            const role = result.user?.user_role;
            if (role === 'Person') {
                navigate('/person-dashboard');
            } else {
                navigate('/dashboard');
            }
        } else {
            setError(result.message || 'Login failed');
        }
    };

    const resetForgotState = () => {
        setForgotEmail('');
        setForgotCode('');
        setForgotNewPassword('');
        setForgotConfirmPassword('');
        setForgotStep('email');
        setForgotError('');
        setForgotMessage('');
        setForgotLoading(false);
    };

    const handleOpenForgotDialog = (event) => {
        event.preventDefault();
        resetForgotState();
        setForgotDialogOpen(true);
    };

    const handleCloseForgotDialog = () => {
        setForgotDialogOpen(false);
        resetForgotState();
    };

    const handleRequestPasswordReset = async () => {
        setForgotError('');
        setForgotMessage('');

        const email = forgotEmail.trim();
        if (!email) {
            setForgotError('Please enter your email address');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setForgotError('Please enter a valid email address');
            return;
        }

        setForgotLoading(true);
        try {
            const response = await fetch('http://165.22.181.147/api/password-reset.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({ action: 'request', email }),
            });
            const data = await response.json();

            if (data.success) {
                setForgotStep('verify');
                setForgotMessage(data.message || 'A PIN has been sent to your email.');
            } else {
                setForgotError(data.message || 'Unable to send password reset PIN');
            }
        } catch (err) {
            console.error('Request password reset error:', err);
            setForgotError('Failed to send reset PIN. Please try again.');
        } finally {
            setForgotLoading(false);
        }
    };

    const handleSubmitPasswordReset = async () => {
        setForgotError('');
        setForgotMessage('');

        if (!forgotEmail.trim()) {
            setForgotError('Please enter your email address');
            return;
        }
        if (!forgotCode.trim()) {
            setForgotError('Please enter the PIN sent to your email');
            return;
        }
        if (!forgotNewPassword) {
            setForgotError('Please enter a new password');
            return;
        }
        if (forgotNewPassword !== forgotConfirmPassword) {
            setForgotError('Passwords do not match');
            return;
        }
        if (forgotNewPassword.length < 6) {
            setForgotError('Password must be at least 6 characters long');
            return;
        }

        setForgotLoading(true);
        try {
            const response = await fetch('http://165.22.181.147/api/password-reset.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    action: 'reset',
                    email: forgotEmail.trim(),
                    code: forgotCode.trim(),
                    new_password: forgotNewPassword,
                }),
            });
            const data = await response.json();

            if (data.success) {
                setForgotMessage(data.message || 'Your password has been reset successfully.');
                setForgotStep('done');
            } else {
                setForgotError(data.message || 'Unable to reset password');
            }
        } catch (err) {
            console.error('Submit password reset error:', err);
            setForgotError('Failed to reset password. Please try again.');
        } finally {
            setForgotLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                backgroundColor: '#dce8e3',
                backgroundImage: loginBackgroundUrl,
                backgroundSize: 'cover',
                backgroundPosition: 'center center',
                backgroundRepeat: 'no-repeat',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                px: { xs: 1.5, sm: 3 },
                py: { xs: 3, sm: 5 },
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px), linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px)',
                    backgroundSize: '48px 48px',
                    maskImage: 'linear-gradient(to bottom, black, transparent 80%)',
                },
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(90deg, rgba(8, 35, 46, 0.18), transparent 45%, rgba(214, 168, 90, 0.12))',
                    pointerEvents: 'none',
                },
            }}
        >
            <Box
                sx={{
                    position: 'absolute',
                    top: { xs: 14, sm: 22 },
                    right: { xs: 14, sm: 26 },
                    zIndex: 2,
                    width: { xs: 'calc(100% - 28px)', sm: 310 },
                    p: { xs: 1.5, sm: 2 },
                    borderRadius: 2,
                    backgroundColor: 'rgba(4, 25, 33, 0.76)',
                    border: '1px solid rgba(255, 255, 255, 0.32)',
                    boxShadow: '0 12px 28px rgba(4, 18, 28, 0.28)',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <LiveTv sx={{ color: '#f6c86a' }} />
                    <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '0.98rem' }}>
                        Watch live as a guest
                    </Typography>
                </Box>

                {liveLoading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'rgba(255,255,255,0.78)' }}>
                        <CircularProgress size={15} sx={{ color: '#f6c86a' }} />
                        <Typography variant="body2">Checking for live streams...</Typography>
                    </Box>
                ) : liveEvents.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {liveEvents.map((event) => (
                            <Box
                                key={event.livestream_id}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 1,
                                    flexWrap: 'wrap',
                                }}
                            >
                                <Box sx={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                    <FiberManualRecord sx={{ color: '#ff6b6b', fontSize: 12 }} />
                                    <Typography
                                        variant="body2"
                                        sx={{ color: '#fff', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}
                                    >
                                        {event.title || 'Parish livestream'}
                                    </Typography>
                                </Box>
                                <Button
                                    component={RouterLink}
                                    to={`/watch/${event.livestream_id}`}
                                    variant="contained"
                                    size="small"
                                    startIcon={<PlayArrow />}
                                    sx={{
                                        flexShrink: 0,
                                        backgroundColor: '#f6c86a',
                                        color: '#16395d',
                                        fontWeight: 800,
                                        textTransform: 'none',
                                        '&:hover': { backgroundColor: '#ffe09a' },
                                    }}
                                >
                                    Watch now
                                </Button>
                            </Box>
                        ))}
                    </Box>
                ) : (
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.76)' }}>
                        No live stream is available right now.
                    </Typography>
                )}
            </Box>

            <Container 
                maxWidth="sm" 
                sx={{ 
                    position: 'relative', 
                    zIndex: 1,
                    px: 0,
                    width: { xs: '100%', sm: 540 },
                }}
            >
                <Paper
                    elevation={24}
                    sx={{
                        position: 'relative',
                        p: { xs: 2.5, sm: 4.5 },
                        borderRadius: { xs: 2.5, sm: 3.5 },
                        background: 'rgba(22, 54, 58, 0.28)',
                        backdropFilter: 'none',
                        WebkitBackdropFilter: 'none',
                        border: '2px solid rgba(255, 255, 255, 0.82)',
                        boxShadow: '0 24px 70px rgba(4, 18, 28, 0.48), 0 0 28px rgba(255, 255, 255, 0.08)',
                        color: '#16395d',
                        overflow: 'hidden',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.02))',
                            pointerEvents: 'none',
                        },
                    }}  
                >
                    {/* Decorative Top Border */}
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '72px',
                            height: '4px',
                            background: '#d6a85a',
                            borderRadius: '3px',
                        }}
                    />

                    {/* Header with Logo and Parish Info */}
                    <Box sx={{ textAlign: 'center', mb: { xs: 2.5, sm: 3.5 } }}>
                        {/* Logo Circle */}
                        <Box
                            sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: { xs: 68, sm: 82 },
                                height: { xs: 68, sm: 82 },
                                borderRadius: '50%',
                                background: '#0b4f56',
                                mb: 2.5,
                                margin: '0 auto 1.25rem',
                                boxShadow: '0 12px 26px rgba(11, 79, 86, 0.3)',
                                position: 'relative',
                                border: '3px solid rgba(255, 255, 255, 0.2)',
                            }}
                        >
                            {branding.parish_logo ? (
                                <Box
                                    component="img"
                                    src={logoUrl}
                                    alt="Parish Logo"
                                    sx={{ width: { xs: 58, sm: 70 }, height: { xs: 58, sm: 70 }, objectFit: 'contain', borderRadius: '50%' }}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                    }}
                                />
                            ) : null}
                            <Church
                                sx={{
                                    fontSize: { xs: 35, sm: 50 },
                                    color: 'white',
                                    display: branding.parish_logo ? 'none' : 'flex',
                                }}
                            />
                        </Box>

                        {/* Parish Name */}
                        <Typography
                            variant="h4"
                            component="h1"
                            sx={{
                                fontSize: { xs: '2rem', sm: '2.8rem' },
                                lineHeight: 1.1,
                                fontWeight: 800,
                                color: '#ffffff',
                                mb: 1,
                                letterSpacing: 0,
                                textShadow: '0 2px 10px rgba(6, 29, 35, 0.24)',
                            }}
                        >
                            {branding.parish_name || 'St. Joseph Parish'}
                        </Typography>

                        {/* Tagline */}
                        <Typography
                            variant="body1"
                            sx={{
                                fontSize: { xs: '0.98rem', sm: '1.12rem' },
                                color: 'rgba(255,255,255,0.90)',
                                fontWeight: 700,
                                position: 'relative',
                                '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    bottom: '-12px',
                                    width: '44px',
                                    height: '2px',
                                    background: '#d6a85a',
                                },
                            }}
                        >
                            Parish Management System
                        </Typography>
                        <Typography
                            variant="caption"
                            sx={{
                                fontSize: { xs: '0.8rem', sm: '0.95rem' },
                                color: 'rgba(255,255,255,0.78)',
                                display: 'block',
                                mt: 3,
                                fontStyle: 'italic',
                                fontWeight: 600,
                            }}
                        >
                            "In Service to Our Community"
                        </Typography>
                    </Box>

                    {/* Error Alert */}
                    {error && (
                        <Alert
                            severity="error"
                            sx={{
                                mb: 3,
                                backgroundColor: '#fee2e2',
                                color: '#7f1d1d',
                                borderColor: '#fca5a5',
                                borderLeft: '4px solid #dc2626',
                                borderRadius: 1.5,
                                '& .MuiAlert-icon': {
                                    color: '#dc2626',
                                },
                                fontWeight: 500,
                            }}
                        >
                            {error}
                        </Alert>
                    )}

                    {/* Login Form */}
                    {isRegisterMode ? (
                        <Box
                            component="form"
                            onSubmit={async (e) => {
                                e.preventDefault();
                                if (registerStep === 'verify') {
                                    await handleVerifyEmail();
                                } else if (registerStep === 'create') {
                                    await handleCreateAccount();
                                }
                            }}
                        >
                            {registerError && (
                                <Alert
                                    severity="error"
                                    sx={{
                                        mb: 3,
                                        backgroundColor: '#fee2e2',
                                        color: '#7f1d1d',
                                        borderColor: '#fca5a5',
                                        borderLeft: '4px solid #dc2626',
                                        borderRadius: 1.5,
                                        '& .MuiAlert-icon': {
                                            color: '#dc2626',
                                        },
                                        fontWeight: 500,
                                    }}
                                >
                                    {registerError}
                                </Alert>
                            )}

                            {registerMessage && (
                                <Alert
                                    severity="success"
                                    sx={{
                                        mb: 3,
                                        backgroundColor: '#ecfdf5',
                                        color: '#166534',
                                        borderColor: '#6ee7b7',
                                        borderLeft: '4px solid #22c55e',
                                        borderRadius: 1.5,
                                        '& .MuiAlert-icon': {
                                            color: '#22c55e',
                                        },
                                        fontWeight: 500,
                                    }}
                                >
                                    {registerMessage}
                                </Alert>
                            )}

                            <Box sx={{ mb: 2.5, position: 'relative' }}>
                                <TextField
                                    fullWidth
                                    label="Gmail Address"
                                    type="email"
                                    value={registerEmail}
                                    onChange={(e) => setRegisterEmail(e.target.value)}
                                    disabled={registerLoading || registerStep !== 'verify'}
                                    autoComplete="email"
                                    variant="outlined"
                                    placeholder="Enter your Gmail"
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Person sx={{ color: '#dfeefb', mr: 1 }} />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 1.5,
                                            backgroundColor: 'rgba(255, 255, 255, 0.10)',
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                backgroundColor: 'rgba(255, 255, 255, 0.14)',
                                            },
                                            '&.Mui-focused': {
                                                backgroundColor: 'rgba(255, 255, 255, 0.16)',
                                                boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.06)',
                                            },
                                        },
                                        '& .MuiOutlinedInput-input': {
                                            padding: '16px 14px',
                                            fontSize: '1.02rem',
                                            fontWeight: 700,
                                            color: '#ffffff',
                                            WebkitTextFillColor: '#ffffff',
                                        },
                                        '& .MuiInputLabel-root': {
                                            fontSize: '0.98rem',
                                            fontWeight: 700,
                                            color: 'rgba(255, 255, 255, 0.96)',
                                        },
                                        '& .MuiInputLabel-root.Mui-focused': {
                                            color: '#ffffff',
                                        },
                                        '& .MuiOutlinedInput-notchedOutline': {
                                            borderColor: 'rgba(255, 255, 255, 0.30)',
                                        },
                                        '& .MuiInputBase-input::placeholder': {
                                            color: 'rgba(255, 255, 255, 0.82)',
                                            opacity: 1,
                                        },
                                    }}
                                />
                            </Box>

                            {registerStep === 'create' && registerPerson && (
                                <Box sx={{ mb: 3, p: 3, borderRadius: 2, border: '1px solid rgba(30, 58, 138, 0.12)', backgroundColor: '#eef2ff' }}>
                                    <Typography variant="subtitle2" sx={{ mb: 1, color: '#1e3a8a', fontWeight: 700 }}>
                                        Person record found:
                                    </Typography>
                                    <Typography sx={{ color: '#475569' }}>
                                        {registerPerson.first_name} {registerPerson.middle_name || ''} {registerPerson.last_name}
                                    </Typography>
                                    <Typography sx={{ color: '#475569' }}>{registerPerson.email}</Typography>
                                </Box>
                            )}

                            {registerStep === 'create' && (
                                <>
                                    <Box sx={{ mb: 2.5, position: 'relative' }}>
                                        <TextField
                                            fullWidth
                                            label="Username"
                                            value={registerUsername}
                                            onChange={(e) => setRegisterUsername(e.target.value)}
                                            disabled={registerLoading}
                                            autoComplete="username"
                                            variant="outlined"
                                            placeholder="Choose a username"
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <Person sx={{ color: '#64748b', mr: 1 }} />
                                                    </InputAdornment>
                                                ),
                                            }}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 1.5,
                                                    backgroundColor: 'rgba(255, 255, 255, 0.52)',
                                                    transition: 'all 0.3s ease',
                                                    '&:hover': {
                                                        backgroundColor: 'rgba(255, 255, 255, 0.62)',
                                                    },
                                                    '&.Mui-focused': {
                                                        backgroundColor: 'rgba(255, 255, 255, 0.7)',
                                                        boxShadow: '0 0 0 3px rgba(30, 58, 138, 0.08)',
                                                    },
                                                },
                                                '& .MuiOutlinedInput-input': {
                                                    padding: '14px 14px',
                                                    fontWeight: 500,
                                                    color: '#16395d',
                                                },
                                                '& .MuiInputLabel-root': {
                                                    fontWeight: 600,
                                                    color: '#475569',
                                                },
                                                '& .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: 'rgba(148, 163, 184, 0.5)',
                                                },
                                            }}
                                        />
                                    </Box>

                                    <Box sx={{ mb: 2.5, position: 'relative' }}>
                                        <TextField
                                            fullWidth
                                            label="Password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={registerPassword}
                                            onChange={(e) => setRegisterPassword(e.target.value)}
                                            disabled={registerLoading}
                                            autoComplete="new-password"
                                            variant="outlined"
                                            placeholder="Create a password"
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <Lock sx={{ color: '#64748b', mr: 1 }} />
                                                    </InputAdornment>
                                                ),
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <IconButton
                                                            onClick={handleClickShowPassword}
                                                            onMouseDown={handleMouseDownPassword}
                                                            edge="end"
                                                            disabled={registerLoading}
                                                            sx={{
                                                                color: '#64748b',
                                                                '&:hover': {
                                                                    color: '#1e3a8a',
                                                                },
                                                            }}
                                                        >
                                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                                        </IconButton>
                                                    </InputAdornment>
                                                ),
                                            }}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 1.5,
                                                    backgroundColor: 'rgba(255, 255, 255, 0.52)',
                                                    transition: 'all 0.3s ease',
                                                    '&:hover': {
                                                        backgroundColor: 'rgba(255, 255, 255, 0.62)',
                                                    },
                                                    '&.Mui-focused': {
                                                        backgroundColor: 'rgba(255, 255, 255, 0.7)',
                                                        boxShadow: '0 0 0 3px rgba(30, 58, 138, 0.08)',
                                                    },
                                                },
                                                '& .MuiOutlinedInput-input': {
                                                    padding: '14px 14px',
                                                    fontWeight: 500,
                                                    color: '#16395d',
                                                },
                                                '& .MuiInputLabel-root': {
                                                    fontWeight: 600,
                                                    color: '#475569',
                                                },
                                                '& .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: 'rgba(148, 163, 184, 0.5)',
                                                },
                                            }}
                                        />
                                    </Box>

                                    <Box sx={{ mb: 3.5, position: 'relative' }}>
                                        <TextField
                                            fullWidth
                                            label="Confirm Password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={registerConfirmPassword}
                                            onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                                            disabled={registerLoading}
                                            autoComplete="new-password"
                                            variant="outlined"
                                            placeholder="Repeat your password"
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <Lock sx={{ color: '#64748b', mr: 1 }} />
                                                    </InputAdornment>
                                                ),
                                            }}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 1.5,
                                                    backgroundColor: 'rgba(15, 23, 42, 0.02)',
                                                    transition: 'all 0.3s ease',
                                                    '&:hover': {
                                                        backgroundColor: 'rgba(15, 23, 42, 0.04)',
                                                    },
                                                    '&.Mui-focused': {
                                                        backgroundColor: 'white',
                                                        boxShadow: '0 0 0 3px rgba(30, 58, 138, 0.1)',
                                                    },
                                                },
                                                '& .MuiOutlinedInput-input': {
                                                    padding: '14px 14px',
                                                    fontWeight: 500,
                                                },
                                                '& .MuiInputLabel-root': {
                                                    fontWeight: 600,
                                                    color: '#475569',
                                                },
                                            }}
                                        />
                                    </Box>
                                </>
                            )}

                            <Button
                                fullWidth
                                variant="contained"
                                size="large"
                                type="submit"
                                disabled={registerLoading}
                                sx={{
                                    background: 'linear-gradient(135deg, #1e3a8a 0%, #0f766e 100%)',
                                    py: { xs: 1.5, sm: 1.75 },
                                    fontSize: { xs: '0.9rem', sm: '1rem' },
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    borderRadius: 1.5,
                                    boxShadow: '0 10px 25px -5px rgba(30, 58, 138, 0.3)',
                                    transition: 'all 0.3s ease',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        left: '-100%',
                                        width: '100%',
                                        height: '100%',
                                        background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
                                        transition: 'left 0.5s ease',
                                    },
                                    '&:hover': {
                                        boxShadow: '0 15px 35px -5px rgba(30, 58, 138, 0.4)',
                                        '&::before': {
                                            left: '100%',
                                        },
                                    },
                                    '&:active': {
                                        transform: 'scale(0.98)',
                                    },
                                    '&:disabled': {
                                        opacity: 0.7,
                                    },
                                }}
                            >
                                {registerLoading ? (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <CircularProgress size={20} color="inherit" />
                                        <span>{registerStep === 'verify' ? 'Verifying...' : 'Creating account...'}</span>
                                    </Box>
                                ) : registerStep === 'verify' ? (
                                    'Verify Email'
                                ) : registerStep === 'create' ? (
                                    'Create Account'
                                ) : (
                                    'Registration Complete'
                                )}
                            </Button>

                            <Button
                                fullWidth
                                variant="text"
                                type="button"
                                onClick={handleRegisterModeToggle}
                                sx={{
                                    mt: 2,
                                    color: 'rgba(255,255,255,0.9)',
                                    fontWeight: 700,
                                }}
                            >
                                Back to Sign In
                            </Button>
                        </Box>
                    ) : (
                        <Box component="form" onSubmit={handleSubmit}>
                            {/* Username Field */}
                            <Box sx={{ mb: { xs: 2, sm: 2.5 }, position: 'relative' }}>
                                <TextField
                                    fullWidth
                                    label="Username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    disabled={loading}
                                    autoComplete="username"
                                    variant="outlined"
                                    placeholder="Enter your username"
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Person sx={{ color: '#dfeefb', mr: 1 }} />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 1.5,
                                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                                            },
                                            '&.Mui-focused': {
                                                backgroundColor: 'rgba(255, 255, 255, 0.14)',
                                                boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.04)',
                                            },
                                        },
                                        '& .MuiOutlinedInput-input': {
                                            padding: '14px 14px',
                                            fontWeight: 600,
                                            color: '#ffffff',
                                            WebkitTextFillColor: '#ffffff',
                                        },
                                        '& .MuiInputLabel-root': {
                                            fontWeight: 700,
                                            color: 'rgba(255, 255, 255, 0.96)',
                                        },
                                        '& .MuiInputLabel-root.Mui-focused': {
                                            color: '#ffffff',
                                        },
                                        '& .MuiOutlinedInput-notchedOutline': {
                                            borderColor: 'rgba(255, 255, 255, 0.28)',
                                        },
                                        '& .MuiInputBase-input::placeholder': {
                                            color: 'rgba(255, 255, 255, 0.8)',
                                            opacity: 1,
                                        },
                                    }}
                                />
                            </Box>

                            {/* Password Field */}
                            <Box sx={{ mb: { xs: 2.5, sm: 3.5 }, position: 'relative' }}>
                                <TextField
                                    fullWidth
                                    label="Password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                    autoComplete="current-password"
                                    placeholder="Enter your password"
                                    variant="outlined"
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Lock sx={{ color: '#dfeefb', mr: 1 }} />
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    onClick={handleClickShowPassword}
                                                    onMouseDown={handleMouseDownPassword}
                                                    edge="end"
                                                    disabled={loading}
                                                    sx={{
                                                        color: '#dfeefb',
                                                        '&:hover': {
                                                            color: '#ffffff',
                                                        },
                                                    }}
                                                >
                                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 1.5,
                                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                                            },
                                            '&.Mui-focused': {
                                                backgroundColor: 'rgba(255, 255, 255, 0.14)',
                                                boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.04)',
                                            },
                                        },
                                        '& .MuiOutlinedInput-input': {
                                            padding: '14px 14px',
                                            fontWeight: 600,
                                            color: '#ffffff',
                                            WebkitTextFillColor: '#ffffff',
                                        },
                                        '& .MuiInputLabel-root': {
                                            fontWeight: 700,
                                            color: 'rgba(255, 255, 255, 0.96)',
                                        },
                                        '& .MuiInputLabel-root.Mui-focused': {
                                            color: '#ffffff',
                                        },
                                        '& .MuiOutlinedInput-notchedOutline': {
                                            borderColor: 'rgba(255, 255, 255, 0.28)',
                                        },
                                        '& .MuiInputBase-input::placeholder': {
                                            color: 'rgba(255, 255, 255, 0.8)',
                                            opacity: 1,
                                        },
                                    }}
                                />
                            </Box>

                            {/* Sign In Button */}
                            <Button
                                variant="contained"
                                size="large"
                                type="submit"
                                disabled={loading}
                                sx={{
                                    display: 'block',
                                    width: '72%',
                                    mx: 'auto',
                                    background: 'linear-gradient(135deg, #1e3a8a 0%, #0f766e 100%)',
                                    py: { xs: 1.3, sm: 1.6 },
                                    fontSize: { xs: '0.98rem', sm: '1.04rem' },
                                    fontWeight: 800,
                                    textTransform: 'none',
                                    borderRadius: 1.5,
                                    boxShadow: '0 10px 25px -5px rgba(30, 58, 138, 0.3)',
                                    transition: 'all 0.3s ease',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        left: '-100%',
                                        width: '100%',
                                        height: '100%',
                                        background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
                                        transition: 'left 0.5s ease',
                                    },
                                    '&:hover': {
                                        boxShadow: '0 15px 35px -5px rgba(30, 58, 138, 0.4)',
                                        '&::before': {
                                            left: '100%',
                                        },
                                    },
                                    '&:active': {
                                        transform: 'scale(0.98)',
                                    },
                                    '&:disabled': {
                                        opacity: 0.7,
                                    },
                                }}
                            >
                                {loading ? (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <CircularProgress size={20} color="inherit" />
                                        <span>Signing in...</span>
                                    </Box>
                                ) : (
                                    'Sign In to Your Account'
                                )}
                            </Button>

                            <Button
                                fullWidth
                                variant="text"
                                type="button"
                                onClick={handleRegisterModeToggle}
                                sx={{
                                    mt: 2,
                                    color: 'rgba(255,255,255,0.9)',
                                    fontWeight: 700,
                                }}
                            >
                                Register using your Gmail
                            </Button>
                        </Box>
                    )}

                    <Box
                        sx={{
                            mt: 3,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 1,
                        }}
                    >
                        <Link
                            href="#"
                            underline="hover"
                            onClick={handleOpenForgotDialog}
                            sx={{
                                color: 'rgba(255,255,255,0.92)',
                                fontWeight: 800,
                                fontSize: '0.98rem',
                            }}
                        >
                            Forgot password?
                        </Link>
                        <Link
                            href="https://www.facebook.com/profile.php/?id=61553625667939"
                            target="_blank"
                            rel="noopener noreferrer"
                            underline="hover"
                            sx={{
                                color: 'rgba(255,255,255,0.92)',
                                fontWeight: 800,
                                fontSize: '0.98rem',
                            }}
                        >
                            Visit our Facebook page
                        </Link>
                    </Box>

                    {/* Footer Text */}
                    <Typography
                        variant="caption"
                        sx={{
                            display: 'block',
                            textAlign: 'center',
                            mt: 4,
                            color: 'rgba(255,255,255,0.72)',
                            fontStyle: 'italic',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                        }}
                    >
                        Secured by encrypted connection â€¢ Â© 2026 St. Joseph Parish
                    </Typography>

                    <Dialog open={forgotDialogOpen} onClose={handleCloseForgotDialog} maxWidth="xs" fullWidth>
                        <DialogTitle>Reset your password</DialogTitle>
                        <DialogContent>
                            <DialogContentText sx={{ mb: 2 }}>
                                Enter the email address you used for this account. A PIN will be sent to that email, then you can enter the PIN and choose a new password.
                            </DialogContentText>
                            {forgotError && (
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    {forgotError}
                                </Alert>
                            )}
                            {forgotMessage && (
                                <Alert severity="success" sx={{ mb: 2 }}>
                                    {forgotMessage}
                                </Alert>
                            )}

                            <TextField
                                fullWidth
                                label="Email address"
                                type="email"
                                value={forgotEmail}
                                onChange={(e) => setForgotEmail(e.target.value)}
                                autoComplete="email"
                                variant="outlined"
                                placeholder="name@example.com"
                                sx={{ mb: 2 }}
                            />

                            {forgotStep !== 'email' && (
                                <>
                                    <TextField
                                        fullWidth
                                        label="Reset PIN"
                                        value={forgotCode}
                                        onChange={(e) => setForgotCode(e.target.value)}
                                        variant="outlined"
                                        placeholder="Enter the 6-digit PIN"
                                        sx={{ mb: 2 }}
                                    />
                                    <TextField
                                        fullWidth
                                        label="New password"
                                        type="password"
                                        value={forgotNewPassword}
                                        onChange={(e) => setForgotNewPassword(e.target.value)}
                                        variant="outlined"
                                        placeholder="Enter a new password"
                                        sx={{ mb: 2 }}
                                    />
                                    <TextField
                                        fullWidth
                                        label="Confirm new password"
                                        type="password"
                                        value={forgotConfirmPassword}
                                        onChange={(e) => setForgotConfirmPassword(e.target.value)}
                                        variant="outlined"
                                        placeholder="Confirm new password"
                                        sx={{ mb: 2 }}
                                    />
                                </>
                            )}
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={handleCloseForgotDialog} color="inherit">
                                Cancel
                            </Button>
                            {forgotStep === 'email' ? (
                                <Button onClick={handleRequestPasswordReset} variant="contained" disabled={forgotLoading}>
                                    {forgotLoading ? 'Sending PIN...' : 'Send PIN'}
                                </Button>
                            ) : (
                                <Button onClick={handleSubmitPasswordReset} variant="contained" disabled={forgotLoading}>
                                    {forgotLoading ? 'Resetting...' : 'Reset password'}
                                </Button>
                            )}
                        </DialogActions>
                    </Dialog>
                </Paper>
            </Container>
        </Box>
    );
};

export default LoginPage;
                                   
