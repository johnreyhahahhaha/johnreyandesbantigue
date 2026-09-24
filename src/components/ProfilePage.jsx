import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Container,
    Paper,
    Grid,
    Typography,
    Chip,
    Avatar,
    Button,
    Divider,
    TextField,
    Alert,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Stack,
    IconButton,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const ProfilePage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user?.user_id) return;

            try {
                const response = await fetch(`/api/profile.php?user_id=${user.user_id}`);
                if (!response.ok) return;
                const data = await response.json();
                if (data.success && data.user) {
                    setProfile(data.user);
                }
            } catch (err) {
                console.error('Failed to refresh profile:', err);
            }
        };

        fetchProfile();
    }, [user?.user_id]);

    const profileUser = profile || user;
    const fullName = profileUser?.full_name || [profileUser?.first_name, profileUser?.middle_name, profileUser?.last_name]
        .filter(Boolean)
        .join(' ')
        .trim();
    const roleLabel = profileUser?.user_role?.toUpperCase() || 'USER';
    const lastLoginLabel = profileUser?.last_login
        ? `Last login: ${new Date(profileUser.last_login).toLocaleString()}`
        : null;
    const phone = profileUser?.phone || profileUser?.contact_no || 'N/A';
    const address = profileUser?.address || 'N/A';
    const gender = profileUser?.gender || 'N/A';
    const birthDate = profileUser?.birth_date ? new Date(profileUser.birth_date).toLocaleDateString() : 'N/A';
    const birthPlace = profileUser?.birth_place || 'N/A';
    const civilStatus = profileUser?.civil_status || 'N/A';
    const religion = profileUser?.religion || 'N/A';
    const nationality = profileUser?.nationality || 'N/A';
    const occupation = profileUser?.occupation || 'N/A';
    const avatarLabel = fullName
        ? fullName.charAt(0).toUpperCase()
        : profileUser?.username?.charAt(0)?.toUpperCase() || 'U';


    return (
        <Box sx={{ bgcolor: '#edf3f1', minHeight: '100vh', py: 4 }}>
            <Container maxWidth="lg">
                <Paper
                    elevation={0}
                    sx={{
                        position: 'relative',
                        p: { xs: 3, md: 4 },
                        mb: 3,
                        borderRadius: 4,
                        background: 'linear-gradient(110deg, #123b50 0%, #0b6b68 68%, #d1a557 160%)',
                        border: '1px solid rgba(18, 59, 80, 0.12)',
                        boxShadow: '0 14px 28px rgba(13, 70, 76, 0.18)',
                        color: 'white',
                    }}
                >
                    <IconButton
                        onClick={() => navigate('/person-dashboard')}
                        aria-label="Go back to dashboard"
                        sx={{
                            position: 'absolute',
                            top: { xs: 18, md: 24 },
                            left: { xs: 18, md: 24 },
                            width: { xs: 42, md: 46 },
                            height: { xs: 42, md: 46 },
                            color: 'white',
                            bgcolor: 'rgba(255,255,255,0.14)',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.24)' },
                        }}
                    >
                        <ArrowBackIcon />
                    </IconButton>
                    <Grid container spacing={3} alignItems="center">
                        <Grid item xs={12} sx={{ pl: { xs: 6, md: 7 } }}>
                            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.03em', color: 'white', mb: 1 }}>
                                Welcome back{fullName ? `, ${fullName.split(' ')[0]}` : ''}
                            </Typography>
                            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', maxWidth: 720, mb: 2 }}>
                                Dito makikita ang pinakabagong church records mo at mga key summaries na kailangan mo nang mabilis.
                            </Typography>

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ flexWrap: 'wrap' }}>
                                <Chip
                                    label={roleLabel}
                                    sx={{
                                        bgcolor: 'rgba(255,255,255,0.18)',
                                        color: 'white',
                                        fontWeight: 700,
                                        borderRadius: 2,
                                        px: 0.75,
                                        border: '1px solid rgba(255,255,255,0.2)',
                                    }}
                                />
                                {lastLoginLabel && (
                                    <Chip
                                        label={lastLoginLabel}
                                        variant="outlined"
                                        sx={{
                                            borderColor: 'rgba(255,255,255,0.4)',
                                            color: 'white',
                                            bgcolor: 'rgba(255,255,255,0.08)',
                                            borderRadius: 2,
                                        }}
                                    />
                                )}
                            </Stack>
                        </Grid>
                    </Grid>
                </Paper>

                <Grid container spacing={2.5} sx={{ mb: 3 }}>
                    <Grid item xs={12} md={4}>
                        <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid rgba(17, 75, 80, 0.1)', bgcolor: '#ffffff', boxShadow: '0 8px 18px rgba(18, 59, 80, 0.05)' }}>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: '#123b50', mb: 2 }}>
                                Account Information
                            </Typography>
                            <Divider sx={{ mb: 2, borderColor: 'rgba(18, 59, 80, 0.08)' }} />

                            <Box sx={{ mb: 2 }}>
                                <Typography variant="caption" sx={{ color: '#5e7480', display: 'block', mb: 0.5 }}>Full Name</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 700, color: '#123b50' }}>{fullName || 'N/A'}</Typography>
                            </Box>

                            <Box sx={{ mb: 2 }}>
                                <Typography variant="caption" sx={{ color: '#5e7480', display: 'block', mb: 0.5 }}>Email</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 700, color: '#123b50' }}>{user?.email || 'N/A'}</Typography>
                            </Box>

                            <Box>
                                <Typography variant="caption" sx={{ color: '#5e7480', display: 'block', mb: 0.5 }}>Role</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 700, color: '#123b50' }}>{user?.user_role || 'N/A'}</Typography>
                            </Box>
                        </Paper>
                    </Grid>

                    <Grid item xs={12} md={8}>
                        <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid rgba(17, 75, 80, 0.1)', bgcolor: '#ffffff', boxShadow: '0 8px 18px rgba(18, 59, 80, 0.05)' }}>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: '#123b50', mb: 2 }}>
                                Personal Details
                            </Typography>
                            <Divider sx={{ mb: 2, borderColor: 'rgba(18, 59, 80, 0.08)' }} />

                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="caption" sx={{ color: '#5e7480', display: 'block', mb: 0.5 }}>Username</Typography>
                                    <Typography variant="body1" sx={{ fontWeight: 700, color: '#123b50' }}>{user?.username || 'N/A'}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="caption" sx={{ color: '#5e7480', display: 'block', mb: 0.5 }}>Phone</Typography>
                                    <Typography variant="body1" sx={{ fontWeight: 700, color: '#123b50' }}>{phone}</Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="caption" sx={{ color: '#5e7480', display: 'block', mb: 0.5 }}>Address</Typography>
                                    <Typography variant="body1" sx={{ fontWeight: 700, color: '#123b50' }}>{address}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="caption" sx={{ color: '#5e7480', display: 'block', mb: 0.5 }}>User ID</Typography>
                                    <Typography variant="body1" sx={{ fontWeight: 700, color: '#123b50' }}>{user?.user_id || 'N/A'}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="caption" sx={{ color: '#5e7480', display: 'block', mb: 0.5 }}>Last Login</Typography>
                                    <Typography variant="body1" sx={{ fontWeight: 700, color: '#123b50' }}>{user?.last_login ? new Date(user.last_login).toLocaleString() : 'N/A'}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="caption" sx={{ color: '#5e7480', display: 'block', mb: 0.5 }}>Gender</Typography>
                                    <Typography variant="body1" sx={{ fontWeight: 700, color: '#123b50' }}>{gender}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="caption" sx={{ color: '#5e7480', display: 'block', mb: 0.5 }}>Civil Status</Typography>
                                    <Typography variant="body1" sx={{ fontWeight: 700, color: '#123b50' }}>{civilStatus}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="caption" sx={{ color: '#5e7480', display: 'block', mb: 0.5 }}>Birth Date</Typography>
                                    <Typography variant="body1" sx={{ fontWeight: 700, color: '#123b50' }}>{birthDate}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="caption" sx={{ color: '#5e7480', display: 'block', mb: 0.5 }}>Birth Place</Typography>
                                    <Typography variant="body1" sx={{ fontWeight: 700, color: '#123b50' }}>{birthPlace}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="caption" sx={{ color: '#5e7480', display: 'block', mb: 0.5 }}>Nationality</Typography>
                                    <Typography variant="body1" sx={{ fontWeight: 700, color: '#123b50' }}>{nationality}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="caption" sx={{ color: '#5e7480', display: 'block', mb: 0.5 }}>Occupation</Typography>
                                    <Typography variant="body1" sx={{ fontWeight: 700, color: '#123b50' }}>{occupation}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="caption" sx={{ color: '#5e7480', display: 'block', mb: 0.5 }}>Religion</Typography>
                                    <Typography variant="body1" sx={{ fontWeight: 700, color: '#123b50' }}>{religion}</Typography>
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>
                </Grid>

            </Container>
        </Box>
    );
};

export default ProfilePage;
