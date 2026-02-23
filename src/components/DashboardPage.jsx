import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Container,
    AppBar,
    Toolbar,
    Typography,
    Button,
    Card,
    CardContent,
    Grid,
    Menu,
    MenuItem,
    Avatar,
    Drawer,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Divider,
    IconButton,
    Tooltip,
    Chip,
    CircularProgress,
} from '@mui/material';
import {
    Menu as MenuIcon,
    Logout as LogoutIcon,
    Dashboard as DashboardIcon,
    People as PeopleIcon,
    Church as ChurchIcon,
    Receipt as ReceiptIcon,
    History as HistoryIcon,
    Settings as SettingsIcon,
    Close as CloseIcon,
    AccountCircle as AccountCircleIcon,
    Lock as LockIcon,
    Storage as StorageIcon,
    DateRange as DateRangeIcon,
    Groups as GroupsIcon,
    Description as DescriptionIcon,
    TrendingUp as TrendingUpIcon,
    LocalFlorist as LocalFloristIcon,
    AttachFile as AttachFileIcon,
    Notifications as NotificationsIcon,
    Tune as TuneIcon,
    Checklist as ChecklistIcon,
    Notes as NotesIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { usePermission } from '../contexts/PermissionContext';

const API_BASE_URL = 'http://localhost/josephus/st.joseph/public/api';

const DashboardPage = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { canAccessModule, getAccessLevel, loading: permLoading } = usePermission();
    const [anchorEl, setAnchorEl] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [kpiData, setKpiData] = useState({
        totalMembers: 0,
        recentSacraments: 0,
        totalDonations: 0,
        pendingDocuments: 0,
        activeVolunteers: 0,
    });
    const [kpiLoading, setKpiLoading] = useState(true);

    useEffect(() => {
        fetchKpiData();
    }, []);

    const fetchKpiData = async () => {
        try {
            const [
                personsRes,
                baptismsRes,
                marriagesRes,
                confirmationsRes,
                donationsRes,
                documentsRes,
                volunteersRes,
            ] = await Promise.all([
                axios.get(`${API_BASE_URL}/persons.php`).catch(() => ({ data: { success: false, data: [] } })),
                axios.get(`${API_BASE_URL}/sacraments.php?type=baptism`).catch(() => ({ data: { success: false, data: [] } })),
                axios.get(`${API_BASE_URL}/sacraments.php?type=marriage`).catch(() => ({ data: { success: false, data: [] } })),
                axios.get(`${API_BASE_URL}/sacraments.php?type=confirmation`).catch(() => ({ data: { success: false, data: [] } })),
                axios.get(`${API_BASE_URL}/donations.php`).catch(() => ({ data: { success: false, data: [] } })),
                axios.get(`${API_BASE_URL}/document-requests.php`).catch(() => ({ data: { success: false, data: [] } })),
                axios.get(`${API_BASE_URL}/community.php?type=volunteers`).catch(() => ({ data: { success: false, data: [] } })),
            ]);

            const persons = personsRes.data.success ? personsRes.data.data || [] : [];
            const baptisms = baptismsRes.data.success ? baptismsRes.data.data || [] : [];
            const marriages = marriagesRes.data.success ? marriagesRes.data.data || [] : [];
            const confirmations = confirmationsRes.data.success ? confirmationsRes.data.data || [] : [];
            const donations = donationsRes.data.success ? donationsRes.data.data || [] : [];
            const documents = documentsRes.data.success ? documentsRes.data.data || [] : [];
            const volunteers = volunteersRes.data.success ? volunteersRes.data.data || [] : [];

            const totalSacraments = baptisms.length + marriages.length + confirmations.length;
            const totalDonationAmount = donations.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
            const pendingDocs = documents.filter(d => d.status !== 'Completed').length;
            const activeVols = volunteers.filter(v => v.status === 'Active').length;

            setKpiData({
                totalMembers: persons.length,
                recentSacraments: totalSacraments,
                totalDonations: totalDonationAmount,
                pendingDocuments: pendingDocs,
                activeVolunteers: activeVols,
            });
        } catch (err) {
            console.error('Error fetching KPI data:', err);
            // Set zeros if fetch fails
            setKpiData({
                totalMembers: 0,
                recentSacraments: 0,
                totalDonations: 0,
                pendingDocuments: 0,
                activeVolunteers: 0,
            });
        } finally {
            setKpiLoading(false);
        }
    };

    const handleMenu = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Module definitions with their permissions and metadata
    const modules = [
        { 
            id: 'people_records',
            label: 'People Records', 
            icon: <PeopleIcon />, 
            path: '/people-records',
            description: 'Manage parish members',
            color: '#3b82f6'
        },
        { 
            id: 'sacraments',
            label: 'Sacraments', 
            icon: <ChurchIcon />, 
            path: '/sacraments',
            description: 'Sacramental records',
            color: '#0ea5e9'
        },
        { 
            id: 'finances',
            label: 'Finances', 
            icon: <ReceiptIcon />, 
            path: '/finances',
            description: 'Financial management',
            color: '#10b981'
        },
        { 
            id: 'audit_logs',
            label: 'Audit Logs', 
            icon: <HistoryIcon />, 
            path: '/audit-logs',
            description: 'System activity logs',
            color: '#f59e0b'
        },
        { 
            id: 'user_management',
            label: 'User Management', 
            icon: <LockIcon />, 
            path: '/user-management',
            description: 'User accounts & roles',
            color: '#ef4444'
        },
        { 
            id: 'assets',
            label: 'Assets', 
            icon: <StorageIcon />, 
            path: '/assets',
            description: 'Parish assets',
            color: '#8b5cf6'
        },
        { 
            id: 'schedules',
            label: 'Schedules', 
            icon: <DateRangeIcon />, 
            path: '/schedules',
            description: 'Event scheduling',
            color: '#ec4899'
        },
        { 
            id: 'community',
            label: 'Community', 
            icon: <GroupsIcon />, 
            path: '/community',
            description: 'Volunteers & programs',
            color: '#14b8a6'
        },
        { 
            id: 'document_requests',
            label: 'Document Requests', 
            icon: <DescriptionIcon />, 
            path: '/document-requests',
            description: 'Document management',
            color: '#06b6d4'
        },
        { 
            id: 'cemetery_records',
            label: 'Cemetery Records', 
            icon: <LocalFloristIcon />, 
            path: '/cemetery-records',
            description: 'Cemetery lot management',
            color: '#06b524'
        },
        { 
            id: 'file_attachments',
            label: 'File Attachments', 
            icon: <AttachFileIcon />, 
            path: '/file-attachments',
            description: 'Document attachments',
            color: '#8b5cf6'
        },
        { 
            id: 'notification_logs',
            label: 'Notification Logs', 
            icon: <NotificationsIcon />, 
            path: '/notification-logs',
            description: 'Email & SMS logs',
            color: '#dc2626'
        },
        { 
            id: 'send_notification',
            label: 'Send Notification', 
            icon: <NotificationsIcon />, 
            path: '/send-notification',
            description: 'Send Email & SMS',
            color: '#10b981'
        },
        { 
            id: 'parish_config',
            label: 'Parish Configuration', 
            icon: <TuneIcon />, 
            path: '/parish-config',
            description: 'System settings',
            color: '#7c3aed'
        },
        { 
            id: 'requirement_checklists',
            label: 'Requirement Checklists', 
            icon: <ChecklistIcon />, 
            path: '/requirement-checklists',
            description: 'Sacrament requirements',
            color: '#0891b2'
        },
        { 
            id: 'sacramental_annotations',
            label: 'Sacramental Annotations', 
            icon: <NotesIcon />, 
            path: '/sacramental-annotations',
            description: 'Person annotations',
            color: '#ea580c'
        },
    ];

    const getRoleColor = (role) => {
        const colors = {
            Admin: '#1e40af',
            Priest: '#0891b2',
            Secretary: '#2563eb',
            Treasurer: '#16a34a',
        };
        return colors[role] || '#64748b';
    };

    // Get accessible modules for this user
    const accessibleModules = modules.filter((m) => canAccessModule(m.id));

    const drawer = (
        <Box sx={{ width: 280, height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Drawer Header */}
            <Box sx={{ p: 2.5, borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                        St. Joseph
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                        Management System
                    </Typography>
                </Box>
                <IconButton onClick={() => setDrawerOpen(false)} size="small">
                    <CloseIcon />
                </IconButton>
            </Box>

            {/* Navigation List */}
            <List sx={{ flex: 1, py: 2 }}>
                <ListItem
                    button
                    onClick={() => {
                        navigate('/dashboard');
                        setDrawerOpen(false);
                    }}
                    sx={{
                        mx: 1,
                        mb: 0.5,
                        borderRadius: 1,
                        color: '#1e293b',
                        '&:hover': {
                            backgroundColor: '#f1f5f9',
                        },
                        '&.Mui-selected': {
                            backgroundColor: '#eff6ff',
                            color: '#1e40af',
                        },
                    }}
                >
                    <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}><DashboardIcon /></ListItemIcon>
                    <ListItemText primary="Dashboard" primaryTypographyProps={{ fontWeight: 500 }} />
                </ListItem>

                <Divider sx={{ my: 1 }} />

                {accessibleModules.map((item) => (
                    <ListItem
                        button
                        key={item.id}
                        onClick={() => {
                            navigate(item.path);
                            setDrawerOpen(false);
                        }}
                        sx={{
                            mx: 1,
                            mb: 0.5,
                            borderRadius: 1,
                            color: '#1e293b',
                            '&:hover': {
                                backgroundColor: '#f1f5f9',
                            },
                        }}
                    >
                        <ListItemIcon sx={{ color: item.color, minWidth: 40 }}>{item.icon}</ListItemIcon>
                        <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 500 }} />
                    </ListItem>
                ))}
            </List>

            {/* Drawer Footer */}
            <Box sx={{ p: 2, borderTop: '1px solid #e2e8f0' }}>
                <Button
                    fullWidth
                    variant="outlined"
                    color="error"
                    startIcon={<LogoutIcon />}
                    onClick={handleLogout}
                    size="small"
                >
                    Sign Out
                </Button>
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#f8fafc' }}>
            {/* AppBar */}
            <AppBar position="sticky" elevation={1}>
                <Toolbar>
                    <IconButton
                        size="large"
                        edge="start"
                        color="inherit"
                        aria-label="menu"
                        sx={{ mr: 2.5, color: '#1e293b' }}
                        onClick={() => setDrawerOpen(true)}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Box>
                        <Typography variant="h6" component="div" sx={{ fontWeight: 700, color: '#1e293b' }}>
                            St. Joseph Parish Management System
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                            Administrative Dashboard
                        </Typography>
                    </Box>
                    <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                                {user?.full_name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                                {user?.user_role}
                            </Typography>
                        </Box>
                        <Tooltip title="Account">
                            <Avatar
                                sx={{
                                    bgcolor: getRoleColor(user?.user_role),
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                }}
                                onClick={handleMenu}
                            >
                                {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                            </Avatar>
                        </Tooltip>
                        <Menu
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl)}
                            onClose={handleClose}
                            anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'right',
                            }}
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                        >
                            <MenuItem disabled sx={{ pointerEvents: 'none' }}>
                                <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                                        {user?.full_name}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                                        {user?.user_role}
                                    </Typography>
                                </Box>
                            </MenuItem>
                            <Divider />
                            <MenuItem onClick={handleLogout} sx={{ color: '#dc2626' }}>
                                <LogoutIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
                                Sign Out
                            </MenuItem>
                        </Menu>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Drawer */}
            <Drawer
                anchor="left"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
            >
                {drawer}
            </Drawer>

            {/* Main Content */}
            <Container maxWidth="xl" sx={{ py: 4, flex: 1 }}>
                {/* Welcome Section */}
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h4" sx={{ mb: 0.5, color: '#1e293b', fontWeight: 700 }}>
                        Welcome back, {user?.full_name?.split(' ')[0]}!
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#64748b' }}>
                        Here's a quick overview of your parish management system.
                    </Typography>
                </Box>

                {/* KPI Cards */}
                {kpiLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Grid container spacing={2} sx={{ mb: 4 }}>
                        <Grid item xs={12} sm={6} md={4} lg={2.4}>
                            <Card sx={{ boxShadow: 1, '&:hover': { boxShadow: 2 } }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Box>
                                            <Typography color="textSecondary" variant="body2" gutterBottom>
                                                Total Members
                                            </Typography>
                                            <Typography variant="h5" sx={{ fontWeight: 700, color: '#3b82f6' }}>
                                                {kpiData.totalMembers}
                                            </Typography>
                                        </Box>
                                        <PeopleIcon sx={{ fontSize: 32, color: '#3b82f6', opacity: 0.3 }} />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4} lg={2.4}>
                            <Card sx={{ boxShadow: 1, '&:hover': { boxShadow: 2 } }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Box>
                                            <Typography color="textSecondary" variant="body2" gutterBottom>
                                                Sacraments
                                            </Typography>
                                            <Typography variant="h5" sx={{ fontWeight: 700, color: '#0ea5e9' }}>
                                                {kpiData.recentSacraments}
                                            </Typography>
                                        </Box>
                                        <ChurchIcon sx={{ fontSize: 32, color: '#0ea5e9', opacity: 0.3 }} />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4} lg={2.4}>
                            <Card sx={{ boxShadow: 1, '&:hover': { boxShadow: 2 } }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Box>
                                            <Typography color="textSecondary" variant="body2" gutterBottom>
                                                Total Donations
                                            </Typography>
                                            <Typography variant="h5" sx={{ fontWeight: 700, color: '#10b981' }}>
                                                ₱{(kpiData.totalDonations / 1000).toFixed(1)}K
                                            </Typography>
                                        </Box>
                                        <ReceiptIcon sx={{ fontSize: 32, color: '#10b981', opacity: 0.3 }} />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4} lg={2.4}>
                            <Card sx={{ boxShadow: 1, '&:hover': { boxShadow: 2 } }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Box>
                                            <Typography color="textSecondary" variant="body2" gutterBottom>
                                                Pending Docs
                                            </Typography>
                                            <Typography variant="h5" sx={{ fontWeight: 700, color: '#f59e0b' }}>
                                                {kpiData.pendingDocuments}
                                            </Typography>
                                        </Box>
                                        <DescriptionIcon sx={{ fontSize: 32, color: '#f59e0b', opacity: 0.3 }} />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4} lg={2.4}>
                            <Card sx={{ boxShadow: 1, '&:hover': { boxShadow: 2 } }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Box>
                                            <Typography color="textSecondary" variant="body2" gutterBottom>
                                                Active Volunteers
                                            </Typography>
                                            <Typography variant="h5" sx={{ fontWeight: 700, color: '#14b8a6' }}>
                                                {kpiData.activeVolunteers}
                                            </Typography>
                                        </Box>
                                        <GroupsIcon sx={{ fontSize: 32, color: '#14b8a6', opacity: 0.3 }} />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                )}

                {/* Dashboard Grid - Modules */}
                {permLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
                        <Typography variant="h6" sx={{ mb: 3, color: '#1e293b', fontWeight: 700 }}>
                            Quick Access
                        </Typography>
                        <Grid container spacing={3} sx={{ mb: 4 }}>
                            {accessibleModules.map((module) => (
                                <Grid item xs={12} sm={6} md={4} lg={3} key={module.id}>
                                    <Card
                                        sx={{
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease',
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            '&::before': {
                                                content: '""',
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                height: 4,
                                                backgroundColor: module.color,
                                            },
                                            '&:hover': {
                                                transform: 'translateY(-8px)',
                                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                                borderColor: module.color,
                                            },
                                        }}
                                        onClick={() => navigate(module.path)}
                                    >
                                        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                                <Box
                                                    sx={{
                                                        p: 1.5,
                                                        backgroundColor: `${module.color}15`,
                                                        borderRadius: 1.5,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    }}
                                                >
                                                    <Box sx={{ color: module.color, display: 'flex' }}>
                                                        {module.icon}
                                                    </Box>
                                                </Box>
                                            </Box>
                                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 0.5 }}>
                                                {module.label}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: '#64748b', mb: 2, flex: 1 }}>
                                                {module.description}
                                            </Typography>
                                            <Chip
                                                label={getAccessLevel(module.id) === 'read_only' ? 'View Only' : 'Full Access'}
                                                size="small"
                                                variant="outlined"
                                                sx={{
                                                    width: 'fit-content',
                                                    backgroundColor: getAccessLevel(module.id) === 'read_only' ? '#fef3c715' : '#dbeafe',
                                                    borderColor: getAccessLevel(module.id) === 'read_only' ? '#fbbf24' : '#93c5fd',
                                                    color: getAccessLevel(module.id) === 'read_only' ? '#b45309' : '#1e40af',
                                                }}
                                            />
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>

                        {accessibleModules.length === 0 && (
                            <Card sx={{ p: 4, textAlign: 'center', borderTop: 4, borderTopColor: '#f59e0b' }}>
                                <LockIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 2 }} />
                                <Typography variant="h6" sx={{ color: '#1e293b', mb: 1 }}>
                                    No Modules Accessible
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#64748b' }}>
                                    Your current role does not have access to any modules. Please contact your administrator.
                                </Typography>
                            </Card>
                        )}

                        {/* Account Info Card */}
                        <Card sx={{ borderTop: 4, borderTopColor: '#1e40af' }}>
                            <CardContent>
                                <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, color: '#1e293b' }}>
                                    Account Information
                                </Typography>
                                <Grid container spacing={3}>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <Box>
                                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                                                Full Name
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 700, color: '#1e293b', mt: 0.5 }}>
                                                {user?.full_name}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <Box>
                                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                                                Email
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 700, color: '#1e293b', mt: 0.5 }}>
                                                {user?.email}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <Box>
                                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                                                Role
                                            </Typography>
                                            <Chip
                                                label={user?.user_role}
                                                sx={{
                                                    mt: 0.5,
                                                    backgroundColor: `${getRoleColor(user?.user_role)}15`,
                                                    color: getRoleColor(user?.user_role),
                                                    fontWeight: 700,
                                                }}
                                            />
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <Box>
                                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                                                User ID
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 700, color: '#1e293b', mt: 0.5 }}>
                                                #{user?.user_id}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </>
                )}
            </Container>
        </Box>
    );
};

export default DashboardPage;
