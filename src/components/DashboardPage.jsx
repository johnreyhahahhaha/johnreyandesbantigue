import React, { useState, useEffect, useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Chart from 'react-apexcharts';
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
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Divider,
    IconButton,
    Tooltip,
    Chip,
    CircularProgress,
    Fab,
    Badge,
    useMediaQuery,
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
    ChatBubbleOutline as ChatBubbleOutlineIcon,
    LiveTv as LiveTvIcon,
    Chat as ChatIcon,
    Tune as TuneIcon,
    Checklist as ChecklistIcon,
    EventNote as EventNoteIcon,
    Notes as NotesIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { usePermission } from '../contexts/PermissionContext';
import { useBranding } from '../contexts/BrandingContext';
import { formatSafeIsoDate } from '../utils/formatters';
import BrandingSettings from './BrandingSettings';
import NotificationBell from './NotificationBell';
import MonthCalendar from './MonthCalendar';

const API_BASE_URL = 'http://165.22.181.147/api';

const formatDonationAmount = (amount) => {
    const value = Number(amount) || 0;

    if (value >= 1000000) {
        return `â‚±${(value / 1000000).toFixed(1)}M`;
    }

    if (value >= 1000) {
        return `â‚±${(value / 1000).toFixed(1)}K`;
    }

    return `â‚±${value.toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;
};

const DashboardPage = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { canAccessModule, getAccessLevel, loading: permLoading } = usePermission();
    const { branding } = useBranding();
    const isMobile = useMediaQuery('(max-width:600px)');
    const serverBase = `${window.location.protocol}//${window.location.hostname}`;
    const brandingLogoUrl = branding?.parish_logo
        ? `${serverBase}/josephus/st.joseph/public/uploads/${branding.parish_logo}?t=${encodeURIComponent(
              branding.last_updated || Date.now()
          )}`
        : '';

    if (user?.user_role === 'Person') {
        return <Navigate to="/person-dashboard" replace />;
    }

    const [anchorEl, setAnchorEl] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [brandingSettingsOpen, setBrandingSettingsOpen] = useState(false);
    const [kpiData, setKpiData] = useState({
        totalMembers: 0,
        recentSacraments: 0,
        totalDonations: 0,
        pendingDocuments: 0,
        activeVolunteers: 0,
    });
    const [livestreamCount, setLivestreamCount] = useState(0);
    const [livestreamLiveCount, setLivestreamLiveCount] = useState(0);
    const [announcements, setAnnouncements] = useState([]);
    const [upcomingSchedules, setUpcomingSchedules] = useState([]);
    const [eventAttendance, setEventAttendance] = useState({});
    const [timelineSeries, setTimelineSeries] = useState([]);
    const [timelineLoading, setTimelineLoading] = useState(true);
    const [timelineError, setTimelineError] = useState(null);
    const [donationsSeries, setDonationsSeries] = useState([]);
    const [donationsLoading, setDonationsLoading] = useState(true);
    const [donationsError, setDonationsError] = useState(null);
    const [chartPopoverAnchor, setChartPopoverAnchor] = useState(null);
    const [selectedTimelinePoint, setSelectedTimelinePoint] = useState(null);
    const [kpiLoading, setKpiLoading] = useState(true);

    useEffect(() => {
        fetchKpiData();
        fetchTimelineData();
        fetchDonationsData();
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
                livestreamsRes,
                schedulesRes,
                announcementsRes,
                eventAttendanceRes,
            ] = await Promise.all([
                axios.get(`${API_BASE_URL}/persons.php`).catch(() => ({ data: { success: false, data: [] } })),
                axios.get(`${API_BASE_URL}/sacraments.php?type=baptism`).catch(() => ({ data: { success: false, data: [] } })),
                axios.get(`${API_BASE_URL}/sacraments.php?type=marriage`).catch(() => ({ data: { success: false, data: [] } })),
                axios.get(`${API_BASE_URL}/sacraments.php?type=confirmation`).catch(() => ({ data: { success: false, data: [] } })),
                axios.get(`${API_BASE_URL}/donations.php`).catch(() => ({ data: { success: false, data: [] } })),
                axios.get(`${API_BASE_URL}/document-requests.php`).catch(() => ({ data: { success: false, data: [] } })),
                axios.get(`${API_BASE_URL}/community.php?type=volunteers`).catch(() => ({ data: { success: false, data: [] } })),
                axios.get(`${API_BASE_URL}/livestreams.php`).catch(() => ({ data: { success: false, data: [] } })),
                axios.get(`${API_BASE_URL}/schedules.php`).catch(() => ({ data: { success: false, data: [] } })),
                axios.get(`${API_BASE_URL}/announcements.php`).catch(() => ({ data: { success: false, data: [] } })),
                axios.get(`${API_BASE_URL}/event-attendance.php`).catch(() => ({ data: { success: false, data: [] } })),
            ]);

            const persons = personsRes.data.success ? personsRes.data.data || [] : [];
            const baptisms = baptismsRes.data.success ? baptismsRes.data.data || [] : [];
            const marriages = marriagesRes.data.success ? marriagesRes.data.data || [] : [];
            const confirmations = confirmationsRes.data.success ? confirmationsRes.data.data || [] : [];
            const donations = donationsRes.data.success ? donationsRes.data.data || [] : [];
            const documents = documentsRes.data.success ? documentsRes.data.data || [] : [];
            const volunteers = volunteersRes.data.success ? volunteersRes.data.data || [] : [];
            const livestreams = livestreamsRes.data.success ? livestreamsRes.data.data || [] : [];
            const schedules = schedulesRes.data.success ? schedulesRes.data.data || [] : [];
            const announcementsList = announcementsRes.data.success ? announcementsRes.data.data || [] : [];
            const attendanceRecords = eventAttendanceRes.data.success ? eventAttendanceRes.data.data || [] : [];

            const totalSacraments = baptisms.length + marriages.length + confirmations.length;
            const totalDonationAmount = donations.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
            const pendingDocs = documents.filter(d => d.status !== 'Completed').length;
            const activeVols = volunteers.filter(v => v.status === 'Active').length;
            const now = new Date();
            const upcoming = schedules
                .filter((schedule) => {
                    const start = schedule.start_datetime ? new Date(schedule.start_datetime) : null;
                    return schedule.status === 'Scheduled' && start && start >= now;
                })
                .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

            const attendanceBySchedule = {};
            attendanceRecords.forEach((record) => {
                const scheduleId = record.schedule_id;
                if (!scheduleId) return;
                if (!attendanceBySchedule[scheduleId]) {
                    attendanceBySchedule[scheduleId] = {
                        attending: [],
                        not_attending: [],
                        maybe: [],
                    };
                }

                const status = record.status === 'attending' ? 'attending' : record.status === 'not_attending' ? 'not_attending' : 'maybe';
                attendanceBySchedule[scheduleId][status].push({
                    person_id: record.person_id,
                    first_name: record.first_name,
                    last_name: record.last_name,
                    status: record.status,
                });
            });

            setKpiData({
                totalMembers: persons.length,
                recentSacraments: totalSacraments,
                totalDonations: totalDonationAmount,
                pendingDocuments: pendingDocs,
                activeVolunteers: activeVols,
            });
            setLivestreamCount(livestreams.length);
            setLivestreamLiveCount(livestreams.filter(ls => ls.status === 'Live').length);
            setAnnouncements(announcementsList.filter((item) => item.status === 'Active'));
            setEventAttendance(attendanceBySchedule);
            setUpcomingSchedules(
                upcoming.slice(0, 5).map((schedule) => ({
                    ...schedule,
                    attendance: attendanceBySchedule[schedule.schedule_id] || { attending: [], not_attending: [], maybe: [] },
                }))
            );
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
            setAnnouncements([]);
            setUpcomingSchedules([]);
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

    const handleTimelinePointSelect = (event, chartContext, config) => {
        const pointIndex = config.dataPointIndex;
        const seriesIndex = config.seriesIndex;
        if (pointIndex === undefined || pointIndex === -1 || seriesIndex === undefined || seriesIndex === -1) {
            return;
        }

        const seriesPoint = timelineSeries[seriesIndex];
        const point = seriesPoint?.data?.[pointIndex];
        if (!point) return;

        const details = timelineSeries.map((series) => ({
            type: series.name,
            count: series.data[pointIndex]?.y || 0,
        }));

        setSelectedTimelinePoint({
            date: point.x,
            details,
        });
    };

    const handleTimelineChartClick = (event, chartContext, config) => {
        const pointIndex = config.dataPointIndex;
        if (pointIndex === undefined || pointIndex === -1) {
            setSelectedTimelinePoint(null);
            return;
        }
        handleTimelinePointSelect(event, chartContext, config);
    };

    const handleCloseChartPopover = () => {
        setSelectedTimelinePoint(null);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const fetchTimelineData = async () => {
        try {
            setTimelineLoading(true);

            const response = await axios.get(`${API_BASE_URL}/sacraments.php?type=all`).catch(() => ({ data: { success: false, data: [] } }));
            const records = response.data && response.data.success ? response.data.data || [] : [];
            const daySet = new Set();
            const counts = {
                Baptismal: {},
                Confirmation: {},
                Communion: {},
                Burial: {},
                Marriage: {},
            };

            records.forEach((record) => {
                const rawDate = record.record_date || record.baptism_date || record.confirmation_date || record.communion_date || record.burial_date || record.marriage_date;
                const day = formatSafeIsoDate(rawDate);
                if (!day) return;

                daySet.add(day);
                const type = record.sacrament_type || 'Other';
                if (!counts[type]) {
                    counts[type] = {};
                }
                counts[type][day] = (counts[type][day] || 0) + 1;
            });

            const days = Array.from(daySet).sort();
            const series = Object.entries(counts)
                .filter(([, values]) => Object.keys(values).length > 0)
                .map(([type, values]) => ({
                    name: type,
                    data: days.map((day) => ({ x: day, y: values[day] || 0 })),
                }));

            setTimelineSeries(series.length > 0 ? series : [{ name: 'Records', data: days.map((day) => ({ x: day, y: 0 })) }]);
            setTimelineError(null);
        } catch (err) {
            console.error('Failed to load sacrament timeline data', err);
            setTimelineError('Unable to load chart data');
            setTimelineSeries([]);
        } finally {
            setTimelineLoading(false);
        }
    };

    const fetchDonationsData = async () => {
        try {
            setDonationsLoading(true);
            const response = await axios.get(`${API_BASE_URL}/finances.php?type=donations`).catch(() => ({ data: { success: false, data: [] } }));
            const records = response.data && response.data.success ? response.data.data || [] : [];

            // Aggregate donations by date (day)
            const dayMap = {};
            records.forEach((r) => {
                const raw = r.donation_date || r.date || r.created_at;
                const day = formatSafeIsoDate(raw);
                if (!day) return;
                dayMap[day] = (dayMap[day] || 0) + parseFloat(r.amount || 0);
            });

            const days = Object.keys(dayMap).sort();
            const series = [{
                name: 'Donations',
                data: days.map((day) => ({ x: day, y: Math.round((dayMap[day] || 0) * 100) / 100 })),
            }];

            setDonationsSeries(series.length ? series : [{ name: 'Donations', data: [] }]);
            setDonationsError(null);
        } catch (err) {
            console.error('Failed to load donations chart data', err);
            setDonationsError('Unable to load donations data');
            setDonationsSeries([]);
        } finally {
            setDonationsLoading(false);
        }
    };

    const chartOptions = useMemo(() => ({
        chart: {
            type: 'area',
            animations: {
                enabled: true,
                easing: 'easeinout',
                dynamicAnimation: { speed: 800 },
            },
            toolbar: { show: false },
            zoom: { enabled: false },
            events: {
                click: handleTimelineChartClick,
                dataPointSelection: handleTimelineChartClick,
            },
        },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 3 },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.55,
                opacityTo: 0.15,
                stops: [20, 100, 100, 100],
            },
        },
        xaxis: {
            type: 'datetime',
            labels: { format: 'dd MMM' },
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        yaxis: {
            min: 0,
            tickAmount: 4,
            labels: { style: { colors: '#64748b' } },
        },
        tooltip: {
            x: { format: 'dd MMM yyyy' },
            shared: true,
            intersect: false,
        },
        legend: {
            position: 'top',
            horizontalAlign: 'left',
        },
        markers: {
            size: 4,
            hover: { size: 6 },
        },
        colors: ['#168fa3', '#25a878', '#d49347', '#7d6acb', '#0f766e'],
    }), []);

    const donationsChartOptions = useMemo(() => ({
        chart: {
            type: 'area',
            toolbar: { show: false },
            zoom: { enabled: false },
        },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 2 },
        xaxis: { type: 'datetime', labels: { format: 'dd MMM' }, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { labels: { style: { colors: '#64748b' } }, min: 0 },
        tooltip: { x: { format: 'dd MMM yyyy' }, shared: true },
        fill: { type: 'gradient', gradient: { opacityFrom: 0.5, opacityTo: 0.1 } },
        colors: ['#059669'],
        markers: { size: 3 },
        legend: { show: false },
    }), []);

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
            id: 'assets',
            label: 'Inventory', 
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
            id: 'accounting_categories',
            label: 'Accounting Categories', 
            icon: <DescriptionIcon />, 
            path: '/accounting-categories',
            description: 'Manage accounting categories',
            color: '#0ea5e9'
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
        { 
            id: 'announcements',
            label: 'Announcements', 
            icon: <NotificationsIcon />, 
            path: '/announcements',
            description: 'Parish announcements',
            color: '#f97316'
        },
        { 
            id: 'households',
            label: 'Households', 
            icon: <GroupsIcon />, 
            path: '/households',
            description: 'Manage households',
            color: '#06b6d4'
        },
        { 
            id: 'seminar_types',
            label: 'Seminar Types', 
            icon: <DescriptionIcon />, 
            path: '/seminar-types',
            description: 'Manage seminar types',
            color: '#8b5cf6'
        },
        { 
            id: 'seminar_attendance',
            label: 'Seminar Attendance', 
            icon: <HistoryIcon />, 
            path: '/seminar-attendance',
            description: 'Track attendance',
            color: '#3b82f6'
        },
        { 
            id: 'livestreams',
            label: 'Livestreams', 
            icon: <DateRangeIcon />, 
            path: '/livestreams',
            description: 'Manage livestream events',
            color: '#8b5cf6'
        },
        { 
            id: 'godparents_records',
            label: 'Godparents Records', 
            icon: <PeopleIcon />, 
            path: '/godparents',
            description: 'Manage godparent records',
            color: '#ec4899'
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
            id: 'audit_logs',
            label: 'Audit Logs', 
            icon: <HistoryIcon />, 
            path: '/audit-logs',
            description: 'System activity logs',
            color: '#f59e0b'
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
        <Box sx={{ width: { xs: 292, sm: 312 }, height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f6faf8' }}>
            {/* Drawer Header */}
            <Box sx={{ 
                px: 2.5,
                py: 2.25,
                background: 'linear-gradient(135deg, #123b50 0%, #0b6b68 100%)',
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    width: 150,
                    height: 150,
                    border: '1px solid rgba(255,255,255,0.13)',
                    borderRadius: '50%',
                    right: -76,
                    top: -86,
                },
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative', zIndex: 1 }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.16)', display: 'grid', placeItems: 'center', border: '1px solid rgba(255,255,255,0.18)', overflow: 'hidden' }}>
                        {brandingLogoUrl ? (
                            <Box component="img" src={brandingLogoUrl} alt="Parish Logo" sx={{ width: '100%', height: '100%', objectFit: 'contain', p: 0.5 }} />
                        ) : (
                            <ChurchIcon sx={{ fontSize: 24 }} />
                        )}
                    </Box>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: 'white', fontSize: '0.96rem', lineHeight: 1.2 }}>
                            {branding?.parish_name || 'St. Joseph'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.68)', fontWeight: 600, letterSpacing: '0.05em' }}>
                            PARISH WORKSPACE
                        </Typography>
                    </Box>
                </Box>
                <IconButton onClick={() => setDrawerOpen(false)} size="small" sx={{ color: 'white', position: 'relative', zIndex: 1, '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}>
                    <CloseIcon />
                </IconButton>
            </Box>

            {/* Navigation List */}
            <List sx={{ flex: 1, py: 2, px: 1, overflowY: 'auto', '&::-webkit-scrollbar': { width: 5 }, '&::-webkit-scrollbar-thumb': { bgcolor: '#c7d9d4', borderRadius: 3 } }}>
                <ListItemButton
                    onClick={() => {
                        navigate('/dashboard');
                        setDrawerOpen(false);
                    }}
                    sx={{
                        mx: 0.5,
                        mb: 1.25,
                        minHeight: 46,
                        borderRadius: 1,
                        color: '#123b50',
                        backgroundColor: '#e7f0ed',
                        position: 'relative',
                        '&:hover': {
                            backgroundColor: '#dcebe6',
                        },
                        '&.Mui-selected': {
                            backgroundColor: '#e7f0ed',
                            color: '#0b6b68',
                        },
                    }}
                >
                    <ListItemIcon sx={{ color: 'inherit', minWidth: 38 }}><Box sx={{ width: 30, height: 30, borderRadius: 1, bgcolor: 'rgba(11,107,104,0.12)', display: 'grid', placeItems: 'center' }}><DashboardIcon sx={{ fontSize: 18 }} /></Box></ListItemIcon>
                    <ListItemText primary="Dashboard" primaryTypographyProps={{ fontWeight: 700, fontSize: '0.88rem' }} />
                </ListItemButton>

                <Typography variant="overline" sx={{ display: 'block', px: 1.5, mb: 0.75, color: '#8a9d99', fontWeight: 800, fontSize: '0.62rem', letterSpacing: '0.14em' }}>
                    Parish operations
                </Typography>
                <Divider sx={{ display: 'none' }} />

                {accessibleModules.map((item) => (
                    <ListItemButton
                        key={item.id}
                        onClick={() => {
                            navigate(item.path);
                            setDrawerOpen(false);
                        }}
                        sx={{
                            mx: 0.5,
                            mb: 0.25,
                            minHeight: 43,
                            borderRadius: 1.25,
                            color: '#28434e',
                            position: 'relative',
                            '&:hover': {
                                backgroundColor: '#e9f2ef',
                                '& .sidebar-icon': { transform: 'scale(1.08)' },
                            },
                            '&::before': {
                                content: '""',
                                position: 'absolute',
                                left: 0,
                                top: '25%',
                                bottom: '25%',
                                width: 3,
                                borderRadius: 2,
                                backgroundColor: item.color,
                                opacity: 0,
                                transition: 'opacity 0.2s ease',
                            },
                        }}
                    >
                        <ListItemIcon sx={{ color: item.color, minWidth: 38 }}><Box className="sidebar-icon" sx={{ width: 30, height: 30, borderRadius: 1, bgcolor: `${item.color}14`, display: 'grid', placeItems: 'center', transition: 'transform 0.2s ease' }}>{React.cloneElement(item.icon, { sx: { fontSize: 18 } })}</Box></ListItemIcon>
                        <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 600, fontSize: '0.84rem' }} />
                    </ListItemButton>
                ))}
            </List>

            {/* Drawer Footer */}
            <Box sx={{ p: 2, borderTop: '1px solid #dce9e5', bgcolor: '#f1f7f4' }}>
                <Button
                    fullWidth
                    variant="outlined"
                    sx={{ borderColor: '#d5a4a0', color: '#a24e49', fontWeight: 700, borderRadius: 1.5, '&:hover': { borderColor: '#a24e49', bgcolor: '#fff4f2' } }}
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
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#edf3f1', overflowX: 'hidden' }}>
            {/* AppBar */}
            <AppBar 
                position="fixed" 
                elevation={2}
                sx={{
                    top: 0,
                    zIndex: (theme) => theme.zIndex.appBar,
                    flexShrink: 0,
                    width: '100%',
                    background: 'linear-gradient(135deg, #123b50 0%, #0b6b68 100%)',
                    boxShadow: '0 8px 24px rgba(10, 46, 58, 0.22)',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    overflow: 'hidden',
                    '& .MuiToolbar-root': {
                        minHeight: { xs: 62, sm: 72 },
                        px: { xs: 1.5, sm: 2 },
                    },
                }}
            >
                <Toolbar sx={{ py: { xs: 0.75, sm: 1.5 }, gap: { xs: 1, sm: 2 }, flexWrap: 'nowrap' }}>
                    <IconButton
                        size="large"
                        edge="start"
                        color="inherit"
                        aria-label="menu"
                        sx={{ 
                            mr: { xs: 0.5, sm: 2.5 }, 
                            color: 'white',
                            p: { xs: 0.75, sm: 1 },
                            '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            },
                        }}
                        onClick={() => setDrawerOpen(true)}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, minWidth: 0, flex: 1 }}>
                        {brandingLogoUrl ? (
                            <Box component="img" src={brandingLogoUrl} alt="Parish Logo" sx={{ width: { xs: 28, sm: 36 }, height: { xs: 28, sm: 36 }, objectFit: 'contain', borderRadius: 1, flexShrink: 0, backgroundColor: 'rgba(255,255,255,0.14)', p: 0.4 }} />
                        ) : (
                            <ChurchIcon sx={{ fontSize: { xs: 24, sm: 32 }, color: 'white', opacity: 0.9, flexShrink: 0 }} />
                        )}
                        <Box sx={{ minWidth: 0 }}>
                            <Typography variant="h6" component="div" sx={{ fontWeight: 800, color: 'white', letterSpacing: '-0.5px', fontSize: { xs: '0.9rem', sm: '1.125rem' }, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {branding?.parish_name || 'St. Joseph'} 
                            </Typography>
                            <Typography variant="caption" sx={{ display: { xs: 'none', sm: 'block' }, color: 'rgba(255, 255, 255, 0.8)', fontWeight: 500 }}>
                                Management System
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1.5 }, minWidth: 0 }}>
                        <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'white' }}>
                                {user?.full_name}
                            </Typography>
                            <Chip
                                label={user?.user_role}
                                size="small"
                                sx={{
                                    height: 20,
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                    mt: 0.5,
                                }}
                            />
                        </Box>
                        <NotificationBell
                            categories={['Chat']}
                            title="Messages"
                            emptyMessage="No messages yet"
                            icon={ChatBubbleOutlineIcon}
                            manageAppBadge={false}
                        />
                        <NotificationBell excludeCategories={['Chat']} />
                        <Tooltip title="Livestreams">
                            <IconButton
                                color="inherit"
                                onClick={() => navigate('/livestreams')}
                                sx={{ 
                                    mr: { xs: 0, sm: 1 },
                                    color: 'white',
                                    p: { xs: 0.75, sm: 1 },
                                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                                }}
                            >
                                <Badge color="error" variant="dot" invisible={livestreamLiveCount === 0}>
                                    <LiveTvIcon />
                                </Badge>
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Account Settings">
                            <Avatar
                                sx={{
                                    bgcolor: 'rgba(255, 255, 255, 0.3)',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                    border: '2px solid rgba(255, 255, 255, 0.5)',
                                    width: { xs: 32, sm: 40 },
                                    height: { xs: 32, sm: 40 },
                                    fontSize: { xs: '0.83rem', sm: '1rem' },
                                    '&:hover': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                    },
                                    transition: 'all 0.3s ease',
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
                            {user?.user_role === 'Admin' && (
                                <MenuItem 
                                    onClick={() => {
                                        handleClose();
                                        setBrandingSettingsOpen(true);
                                    }}
                                    sx={{ color: '#1e293b' }}
                                >
                                    <SettingsIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
                                    Branding Settings
                                </MenuItem>
                            )}
                            <MenuItem onClick={handleLogout} sx={{ color: '#dc2626' }}>
                                <LogoutIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
                                Sign Out
                            </MenuItem>
                        </Menu>

                        {/* Branding Settings Modal */}
                        {user?.user_role === 'Admin' && (
                            <BrandingSettings 
                                open={brandingSettingsOpen} 
                                onClose={() => setBrandingSettingsOpen(false)} 
                            />
                        )}
                    </Box>
                </Toolbar>
            </AppBar>

            <Box
                aria-hidden="true"
                sx={{
                    flexShrink: 0,
                    minHeight: { xs: 62, sm: 72 },
                }}
            />

            {/* Drawer */}
            <Drawer
                anchor="left"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
            >
                {drawer}
            </Drawer>

            {/* Main Content */}
            <Container maxWidth="xl" sx={{ py: { xs: 1, md: 4 }, px: { xs: 0.75, sm: 0, md: 0 }, flex: 1 }}>
                {/* Welcome Section */}
                <Box sx={{
                    mb: { xs: 1.5, md: 4 },
                    px: { xs: 1.1, sm: 1.75, md: 4 },
                    py: { xs: 1.35, sm: 2.1, md: 3.5 },
                    borderRadius: { xs: 2.5, md: 3 },
                    color: 'white',
                    background: 'linear-gradient(120deg, rgba(18,59,80,0.98) 0%, rgba(11,107,104,0.96) 58%, rgba(209,165,87,0.94) 160%)',
                    boxShadow: '0 18px 36px rgba(13, 70, 76, 0.16)',
                    position: 'relative',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.08)',
                    '&::after': {
                        content: '""',
                        position: 'absolute',
                        width: 220,
                        height: 220,
                        border: '1px solid rgba(255,255,255,0.14)',
                        borderRadius: '50%',
                        right: -70,
                        top: -100,
                    },
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.08), transparent 45%)',
                        pointerEvents: 'none',
                    },
                }}>
                    <Box sx={{ position: 'relative', zIndex: 1 }}>
                        <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.72)', fontWeight: 800, letterSpacing: '0.14em', fontSize: { xs: '0.62rem', md: '0.7rem' } }}>
                            Parish overview
                        </Typography>
                        <Typography variant="h4" sx={{ mt: 0.5, color: 'white', fontWeight: 800, letterSpacing: 0, fontSize: { xs: '1.38rem', sm: '2.1rem', md: '2.5rem' }, lineHeight: 1.15 }}>
                            Welcome back, {user?.full_name?.split(' ')[0]}.
                        </Typography>
                        <Typography variant="body1" sx={{ mt: 0.7, color: 'rgba(255,255,255,0.8)', fontWeight: 500, fontSize: { xs: '0.72rem', md: '1rem' }, maxWidth: { xs: '100%', md: 540 } }}>
                            Everything important for today, in one place.
                        </Typography>
                    </Box>
                </Box>

                {/* KPI Cards */}
                {kpiLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Grid container spacing={{ xs: 0.7, sm: 1.5 }} sx={{ mb: { xs: 1.5, md: 3 }, alignItems: 'stretch', px: { xs: 0.15, sm: 0.5 }, mx: 0, width: '100%' }}>
                        <Grid item xs={3} sm={4} md={4} lg={3}>
                            <Card sx={{
                                boxShadow: '0 8px 20px rgba(26, 67, 74, 0.06)',
                                border: '1px solid rgba(17, 75, 80, 0.08)',
                                background: 'linear-gradient(180deg, #ffffff 0%, #f7fbfb 100%)',
                                borderRadius: 2.5,
                                transition: 'all 0.25s ease',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                borderTop: '3px solid #3b82f6',
                                '&:hover': {
                                    boxShadow: '0 16px 28px rgba(26, 67, 74, 0.12)',
                                    transform: 'translateY(-3px)',
                                },
                            }}>
                                <CardContent sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, p: { xs: 1.15, sm: 1.5 } }}>
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography color="textSecondary" variant="body2" gutterBottom sx={{ fontSize: { xs: '0.62rem', sm: '0.78rem' }, lineHeight: 1.3, fontWeight: 700, color: '#64748b' }}>
                                            Total Members
                                        </Typography>
                                        <Typography variant="h5" sx={{ fontWeight: 800, color: '#3b82f6', fontSize: { xs: '0.96rem', sm: '1.35rem' } }}>
                                            {kpiData.totalMembers}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ width: { xs: 30, sm: 40 }, height: { xs: 30, sm: 40 }, borderRadius: 2, display: 'grid', placeItems: 'center', backgroundColor: '#eaf2ff', flexShrink: 0 }}>
                                        <PeopleIcon sx={{ fontSize: { xs: 18, sm: 24 }, color: '#3b82f6', opacity: 0.8 }} />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={3} sm={4} md={4} lg={3}>
                            <Card sx={{ borderRadius: 2.5, border: '1px solid rgba(17, 75, 80, 0.08)', boxShadow: '0 8px 20px rgba(26, 67, 74, 0.06)', '&:hover': { boxShadow: '0 16px 28px rgba(26, 67, 74, 0.12)', transform: 'translateY(-3px)' }, transition: 'all 0.25s ease', height: '100%', display: 'flex', flexDirection: 'column', borderTop: '3px solid #0ea5e9', background: 'linear-gradient(180deg, #ffffff 0%, #f5fbff 100%)' }}>
                                <CardContent sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, p: { xs: 1.15, sm: 1.5 } }}>
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography color="textSecondary" variant="body2" gutterBottom sx={{ fontSize: { xs: '0.62rem', sm: '0.78rem' }, lineHeight: 1.3, fontWeight: 700, color: '#64748b' }}>
                                            Sacraments
                                        </Typography>
                                        <Typography variant="h5" sx={{ fontWeight: 800, color: '#0ea5e9', fontSize: { xs: '0.96rem', sm: '1.35rem' } }}>
                                            {kpiData.recentSacraments}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ width: { xs: 30, sm: 40 }, height: { xs: 30, sm: 40 }, borderRadius: 2, display: 'grid', placeItems: 'center', backgroundColor: '#e8f8ff', flexShrink: 0 }}>
                                        <ChurchIcon sx={{ fontSize: { xs: 18, sm: 24 }, color: '#0ea5e9', opacity: 0.8 }} />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={3} sm={4} md={4} lg={3}>
                            <Card sx={{ borderRadius: 2.5, border: '1px solid rgba(17, 75, 80, 0.08)', boxShadow: '0 8px 20px rgba(26, 67, 74, 0.06)', '&:hover': { boxShadow: '0 16px 28px rgba(26, 67, 74, 0.12)', transform: 'translateY(-3px)' }, transition: 'all 0.25s ease', height: '100%', display: 'flex', flexDirection: 'column', borderTop: '3px solid #10b981', background: 'linear-gradient(180deg, #ffffff 0%, #f4fff9 100%)' }}>
                                <CardContent sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, p: { xs: 1.15, sm: 1.5 } }}>
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography color="textSecondary" variant="body2" gutterBottom sx={{ fontSize: { xs: '0.62rem', sm: '0.78rem' }, lineHeight: 1.3, fontWeight: 700, color: '#64748b' }}>
                                            Donations
                                        </Typography>
                                        <Typography variant="h5" sx={{ fontWeight: 800, color: '#10b981', fontSize: { xs: '0.82rem', sm: '1.2rem' } }}>
                                            {formatDonationAmount(kpiData.totalDonations)}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ width: { xs: 30, sm: 40 }, height: { xs: 30, sm: 40 }, borderRadius: 2, display: 'grid', placeItems: 'center', backgroundColor: '#eafef5', flexShrink: 0 }}>
                                        <ReceiptIcon sx={{ fontSize: { xs: 17, sm: 22 }, color: '#10b981', opacity: 0.8 }} />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={3} sm={4} md={4} lg={3}>
                            <Card sx={{ borderRadius: 2.5, border: '1px solid rgba(17, 75, 80, 0.08)', boxShadow: '0 8px 20px rgba(26, 67, 74, 0.06)', '&:hover': { boxShadow: '0 16px 28px rgba(26, 67, 74, 0.12)', transform: 'translateY(-3px)' }, transition: 'all 0.25s ease', height: '100%', display: 'flex', flexDirection: 'column', borderTop: '3px solid #f59e0b', background: 'linear-gradient(180deg, #ffffff 0%, #fffaf5 100%)' }}>
                                <CardContent sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, p: { xs: 1.15, sm: 1.5 } }}>
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography color="textSecondary" variant="body2" gutterBottom sx={{ fontSize: { xs: '0.62rem', sm: '0.78rem' }, lineHeight: 1.3, fontWeight: 700, color: '#64748b' }}>
                                            Docs
                                        </Typography>
                                        <Typography variant="h5" sx={{ fontWeight: 800, color: '#f59e0b', fontSize: { xs: '0.96rem', sm: '1.35rem' } }}>
                                            {kpiData.pendingDocuments}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ width: { xs: 30, sm: 40 }, height: { xs: 30, sm: 40 }, borderRadius: 2, display: 'grid', placeItems: 'center', backgroundColor: '#fff3e0', flexShrink: 0 }}>
                                        <DescriptionIcon sx={{ fontSize: { xs: 17, sm: 22 }, color: '#f59e0b', opacity: 0.8 }} />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={3} sm={4} md={4} lg={3}>
                            <Card sx={{ borderRadius: 2.5, border: '1px solid rgba(17, 75, 80, 0.08)', boxShadow: '0 8px 20px rgba(26, 67, 74, 0.06)', '&:hover': { boxShadow: '0 16px 28px rgba(26, 67, 74, 0.12)', transform: 'translateY(-3px)' }, transition: 'all 0.25s ease', height: '100%', display: 'flex', flexDirection: 'column', borderTop: '3px solid #ef4444', background: 'linear-gradient(180deg, #ffffff 0%, #fff7f7 100%)' }}>
                                <CardContent sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, p: { xs: 1.15, sm: 1.5 } }}>
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography color="textSecondary" variant="body2" gutterBottom sx={{ fontSize: { xs: '0.62rem', sm: '0.78rem' }, lineHeight: 1.3, fontWeight: 700, color: '#64748b' }}>
                                            Announcements
                                        </Typography>
                                        <Typography variant="h5" sx={{ fontWeight: 800, color: '#ef4444', fontSize: { xs: '0.96rem', sm: '1.35rem' } }}>
                                            {announcements.length}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ width: { xs: 30, sm: 40 }, height: { xs: 30, sm: 40 }, borderRadius: 2, display: 'grid', placeItems: 'center', backgroundColor: '#fff1f2', flexShrink: 0 }}>
                                        <NotificationsIcon sx={{ fontSize: { xs: 17, sm: 22 }, color: '#ef4444', opacity: 0.8 }} />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={3} sm={4} md={4} lg={3}>
                            <Card sx={{ borderRadius: 2.5, border: '1px solid rgba(17, 75, 80, 0.08)', boxShadow: '0 8px 20px rgba(26, 67, 74, 0.06)', '&:hover': { boxShadow: '0 16px 28px rgba(26, 67, 74, 0.12)', transform: 'translateY(-3px)' }, transition: 'all 0.25s ease', height: '100%', display: 'flex', flexDirection: 'column', borderTop: '3px solid #0f766e', background: 'linear-gradient(180deg, #ffffff 0%, #f2fbfa 100%)' }}>
                                <CardContent sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, p: { xs: 1.15, sm: 1.5 } }}>
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography color="textSecondary" variant="body2" gutterBottom sx={{ fontSize: { xs: '0.62rem', sm: '0.78rem' }, lineHeight: 1.3, fontWeight: 700, color: '#64748b' }}>
                                            Events
                                        </Typography>
                                        <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f766e', fontSize: { xs: '0.96rem', sm: '1.35rem' } }}>
                                            {upcomingSchedules.length}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ width: { xs: 30, sm: 40 }, height: { xs: 30, sm: 40 }, borderRadius: 2, display: 'grid', placeItems: 'center', backgroundColor: '#eafaf8', flexShrink: 0 }}>
                                        <EventNoteIcon sx={{ fontSize: { xs: 17, sm: 22 }, color: '#0f766e', opacity: 0.8 }} />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={3} sm={4} md={4} lg={3}>
                            <Card sx={{ borderRadius: 2.5, border: '1px solid rgba(17, 75, 80, 0.08)', boxShadow: '0 8px 20px rgba(26, 67, 74, 0.06)', '&:hover': { boxShadow: '0 16px 28px rgba(26, 67, 74, 0.12)', transform: 'translateY(-3px)' }, transition: 'all 0.25s ease', height: '100%', display: 'flex', flexDirection: 'column', borderTop: '3px solid #14b8a6', background: 'linear-gradient(180deg, #ffffff 0%, #f5fffd 100%)' }}>
                                <CardContent sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, p: { xs: 1.15, sm: 1.5 } }}>
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography color="textSecondary" variant="body2" gutterBottom sx={{ fontSize: { xs: '0.62rem', sm: '0.78rem' }, lineHeight: 1.3, fontWeight: 700, color: '#64748b' }}>
                                            Volunteers
                                        </Typography>
                                        <Typography variant="h5" sx={{ fontWeight: 800, color: '#14b8a6', fontSize: { xs: '0.96rem', sm: '1.35rem' } }}>
                                            {kpiData.activeVolunteers}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ width: { xs: 30, sm: 40 }, height: { xs: 30, sm: 40 }, borderRadius: 2, display: 'grid', placeItems: 'center', backgroundColor: '#e9fffb', flexShrink: 0 }}>
                                        <GroupsIcon sx={{ fontSize: { xs: 17, sm: 22 }, color: '#14b8a6', opacity: 0.8 }} />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={3} sm={4} md={4} lg={3}>
                            <Card
                                onClick={() => navigate('/livestreams')}
                                sx={{
                                    cursor: 'pointer',
                                    boxShadow: '0 8px 24px -8px rgba(139,92,246,0.35)',
                                    border: '1px solid rgba(139,92,246,0.14)',
                                    background: 'linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)',
                                    borderTop: '3px solid #8b5cf6',
                                    '&:hover': { transform: 'translateY(-6px)', boxShadow: '0 18px 30px -10px rgba(139,92,246,0.25)' },
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                }}
                            >
                                <CardContent sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, p: { xs: 1.15, sm: 1.5 } }}>
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography color="textSecondary" variant="body2" gutterBottom sx={{ fontSize: { xs: '0.62rem', sm: '0.78rem' }, lineHeight: 1.3, fontWeight: 700, color: '#64748b' }}>
                                            Livestreams
                                        </Typography>
                                        <Typography variant="h4" sx={{ fontWeight: 800, color: '#8b5cf6', fontSize: { xs: '1.1rem', sm: '1.6rem' } }}>
                                            {livestreamCount}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ width: { xs: 30, sm: 40 }, height: { xs: 30, sm: 40 }, borderRadius: 2, display: 'grid', placeItems: 'center', backgroundColor: '#f3e8ff', flexShrink: 0 }}>
                                        <LiveTvIcon sx={{ fontSize: { xs: 17, sm: 24 }, color: '#8b5cf6', opacity: 0.85 }} />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                )}

                {/* Donations chart moved into Finances page; removed from dashboard */}
                <Card sx={{ mb: 4, p: { xs: 2, md: 3 }, borderRadius: 3, border: '1px solid rgba(17, 75, 80, 0.1)', bgcolor: '#ffffff', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 1 }}>
                        <Box>
                            <Typography variant="overline" sx={{ color: '#0b766f', fontWeight: 800, letterSpacing: '0.12em' }}>
                                Activity pulse
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: '#123b50' }}>
                                Sacrament timeline
                            </Typography>
                        </Box>
                        <Chip label="Live records" size="small" sx={{ bgcolor: '#e4f4ef', color: '#087568', fontWeight: 700 }} />
                    </Box>
                    {timelineLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                            <CircularProgress />
                        </Box>
                    ) : timelineError ? (
                        <Typography variant="body2" sx={{ color: '#ef4444' }}>
                            {timelineError}
                        </Typography>
                    ) : (
                        <Box sx={{ position: 'relative' }}>
                            <Chart
                                options={chartOptions}
                                series={timelineSeries}
                                type="area"
                                height={isMobile ? 260 : 360}
                            />
                            {selectedTimelinePoint && (
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        top: 20,
                                        right: 20,
                                        zIndex: 10,
                                        width: 320,
                                        bgcolor: 'common.white',
                                        borderRadius: 3,
                                        boxShadow: 6,
                                        border: '1px solid rgba(148, 163, 184, 0.18)',
                                        p: 2,
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                            {new Date(selectedTimelinePoint.date).toLocaleDateString()}
                                        </Typography>
                                        <IconButton size="small" onClick={handleCloseChartPopover} sx={{ color: '#475569' }}>
                                            <CloseIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                    <Box>
                                        {selectedTimelinePoint.details.map((item) => (
                                            <Box key={item.type} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid rgba(148, 163, 184, 0.12)' }}>
                                                <Typography variant="body2" sx={{ color: '#334155' }}>{item.type}</Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>{item.count}</Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    )}
                </Card>

                {/* Dashboard Grid - Modules */}
                {permLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
                        <Box sx={{ mb: 4, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 3, alignItems: 'stretch' }}>
                            <Box sx={{ minWidth: 0 }}>
                                <Card sx={{ p: 3, borderRadius: 3, border: '1px solid rgba(17, 75, 80, 0.1)', bgcolor: '#ffffff', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)' }}>
                                    <Typography variant="overline" sx={{ color: '#0b766f', fontWeight: 800, letterSpacing: '0.12em' }}>
                                        From the parish office
                                    </Typography>
                                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, color: '#123b50' }}>
                                        Latest announcements
                                    </Typography>
                                    {announcements.length > 0 ? (
                                        <>
                                            <Box sx={{ mb: announcements.length > 1 ? 1.5 : 0, p: 2, borderRadius: 2, bgcolor: '#f5f8f6', border: '1px solid rgba(17, 75, 80, 0.08)', borderLeft: '3px solid #d6a85a' }}>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                                                    {announcements[0].title}
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: '#475569', mb: 1 }}>
                                                    {announcements[0].content?.slice(0, 115)}{announcements[0].content?.length > 115 ? '...' : ''}
                                                </Typography>
                                                <Chip label={announcements[0].category || 'General'} size="small" sx={{ bgcolor: '#e0f2fe', color: '#0369a1' }} />
                                            </Box>
                                            {announcements.length > 1 && (
                                                <Button size="small" onClick={() => navigate('/announcements')} sx={{ px: 0, minWidth: 0, textTransform: 'none', fontWeight: 700, color: '#0b766f' }}>
                                                    View all announcements
                                                </Button>
                                            )}
                                        </>
                                    ) : (
                                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                                            Walang active announcement sa ngayon.
                                        </Typography>
                                    )}
                                </Card>
                            </Box>
                            <Box sx={{ minWidth: 0 }}>
                                <Card sx={{ p: 3, borderRadius: 3, border: '1px solid rgba(17, 75, 80, 0.1)', bgcolor: '#ffffff', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)' }}>
                                    <Typography variant="overline" sx={{ color: '#0b766f', fontWeight: 800, letterSpacing: '0.12em' }}>
                                        On the parish calendar
                                    </Typography>
                                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, color: '#123b50' }}>
                                        Upcoming events
                                    </Typography>
                                    {upcomingSchedules.length > 0 ? (
                                        <>
                                            {(() => {
                                            const schedule = upcomingSchedules[0];
                                            const attendingPeople = (schedule.attendance?.attending || []).map((person) => (
                                                `${person.first_name || ''} ${person.last_name || ''}`.trim()
                                            )).filter(Boolean);
                                            const attendeeText = attendingPeople.length > 0
                                                ? attendingPeople.slice(0, 3).join(', ') + (attendingPeople.length > 3 ? ` +${attendingPeople.length - 3} more` : '')
                                                : 'No RSVP yet';

                                            return (
                                                <Box sx={{ mb: upcomingSchedules.length > 1 ? 1.5 : 0, p: 2, borderRadius: 2, bgcolor: '#f5f8f6', border: '1px solid rgba(17, 75, 80, 0.08)', borderLeft: '3px solid #0b766f' }}>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                                                        {schedule.event_title || 'Unnamed event'}
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ color: '#475569', mb: 1 }}>
                                                        {schedule.event_type || 'Event'} â€¢ {new Date(schedule.start_datetime).toLocaleString()}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1 }}>
                                                        <Chip label={schedule.status || 'Scheduled'} size="small" sx={{ bgcolor: '#d1fae5', color: '#166534' }} />
                                                        <Chip label={`${schedule.attendance?.attending?.length || 0} attending`} size="small" sx={{ bgcolor: '#e0f2fe', color: '#0369a1' }} />
                                                    </Box>
                                                    <Typography variant="caption" sx={{ color: '#475569', display: 'block' }}>
                                                        {attendeeText}
                                                    </Typography>
                                                </Box>
                                            );
                                            })()}
                                            {upcomingSchedules.length > 1 && (
                                                <Button size="small" onClick={() => navigate('/schedules')} sx={{ px: 0, minWidth: 0, textTransform: 'none', fontWeight: 700, color: '#0b766f' }}>
                                                    View all events
                                                </Button>
                                            )}
                                        </>
                                    ) : (
                                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                                            Walang naka-schedule na paparating na event.
                                        </Typography>
                                    )}
                                </Card>
                            </Box>
                        <Box sx={{ minWidth: 0, height: '100%', '& > .MuiCard-root': { boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)', borderColor: 'rgba(17, 75, 80, 0.1)' } }}>
                                <MonthCalendar />
                        </Box>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 2 }}>
                            <Typography variant="overline" sx={{ color: '#0b766f', fontWeight: 800, letterSpacing: '0.12em' }}>
                                Workspaces
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#7b8d8b', fontWeight: 600 }}>
                                {accessibleModules.length} available modules
                            </Typography>
                        </Box>
                        <Typography variant="h5" sx={{ mb: 2.5, mt: -1, color: '#123b50', fontWeight: 800 }}>
                            Quick access
                        </Typography>
                        <Box
                            sx={{
                                mb: 4,
                                display: 'grid',
                                gridTemplateColumns: {
                                    xs: 'repeat(2, minmax(0, 1fr))',
                                    sm: 'repeat(2, minmax(0, 1fr))',
                                    md: 'repeat(3, minmax(0, 1fr))',
                                    lg: 'repeat(4, minmax(0, 1fr))',
                                    xl: 'repeat(7, minmax(0, 1fr))',
                                },
                                gap: { xs: 1.5, sm: 2 },
                                alignItems: 'stretch',
                            }}
                        >
                            {accessibleModules.map((module) => (
                                <Box key={module.id} sx={{ minWidth: 0 }}>
                                    <Card
                                        sx={{
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease',
                                            height: '100%',
                                            minHeight: { xs: 160, sm: 180, md: 184 },
                                            borderRadius: 2.5,
                                            border: '1px solid rgba(17, 75, 80, 0.1)',
                                            boxShadow: '0 5px 16px rgba(26, 67, 74, 0.06)',
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
                                                height: 3,
                                                backgroundColor: module.color,
                                            },
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                boxShadow: '0 14px 26px rgba(26, 67, 74, 0.13)',
                                                borderColor: module.color,
                                            },
                                        }}
                                        onClick={() => navigate(module.path)}
                                    >
                                        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: { xs: 1.5, sm: 2 } }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: { xs: 1.25, sm: 2 } }}>
                                                <Box
                                                    sx={{
                                                        p: { xs: 1.1, sm: 1.5 },
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
                                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 0.5, fontSize: { xs: '1rem', md: '1.1rem' }, lineHeight: 1.25 }}>
                                                {module.label}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: '#64748b', mb: 2, flex: 1, fontSize: { xs: '0.76rem', md: '0.875rem' } }}>
                                                {module.description}
                                            </Typography>
                                            <Chip
                                                label={getAccessLevel(module.id) === 'read_only' ? 'View Only' : 'Full Access'}
                                                size="small"
                                                variant="outlined"
                                                sx={{
                                                    width: 'fit-content',
                                                    maxWidth: '100%',
                                                    backgroundColor: getAccessLevel(module.id) === 'read_only' ? '#fef3c715' : '#dbeafe',
                                                    borderColor: getAccessLevel(module.id) === 'read_only' ? '#fbbf24' : '#93c5fd',
                                                    color: getAccessLevel(module.id) === 'read_only' ? '#b45309' : '#1e40af',
                                                    fontSize: { xs: '0.65rem', md: '0.7rem' },
                                                    height: { xs: 24, md: 28 },
                                                }}
                                            />
                                        </CardContent>
                                    </Card>
                                </Box>
                            ))}
                        </Box>

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
                            <CardContent sx={{ p: { xs: 2, md: 2.25 }, '&:last-child': { pb: { xs: 2, md: 2.25 } } }}>
                                <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 700, color: '#1e293b', fontSize: { xs: '1rem', md: '1.1rem' } }}>
                                    Account Information
                                </Typography>
                                <Grid container spacing={{ xs: 1.5, md: 2 }}>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, whiteSpace: 'nowrap' }}>
                                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                                                Full Name
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                                                {user?.full_name}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, whiteSpace: 'nowrap' }}>
                                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                                                Email
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                                                {user?.email}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, whiteSpace: 'nowrap' }}>
                                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                                                Role
                                            </Typography>
                                            <Chip
                                                label={user?.user_role}
                                                sx={{
                                                    size: "small",
                                                    backgroundColor: `${getRoleColor(user?.user_role)}15`,
                                                    color: getRoleColor(user?.user_role),
                                                    fontWeight: 700,
                                                }}
                                            />
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, whiteSpace: 'nowrap' }}>
                                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                                                User ID
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 700, color: '#1e293b' }}>
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
            <Fab
                color="primary"
                aria-label="livestreams"
                onClick={() => navigate('/livestreams')}
                sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1400 }}
            >
                <LiveTvIcon />
            </Fab>
        </Box>
    );
};

export default DashboardPage;
