import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Container, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem,
    FormControl, InputLabel, CircularProgress, Alert, Typography, Chip, IconButton, Card, CardContent,
    Grid, Tabs, Tab, Stack
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import ChatIcon from '@mui/icons-material/Chat';
import GroupsIcon from '@mui/icons-material/Groups';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import NotificationsIcon from '@mui/icons-material/Notifications';
import BarChartIcon from '@mui/icons-material/BarChart';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import { usePermission } from '../contexts/PermissionContext';
import {
    livestreamAPI,
    livestreamChatAPI,
    livestreamViewersAPI,
    livestreamRecordingsAPI,
    livestreamNotificationsAPI,
    livestreamStatisticsAPI,
} from '../api/apiClient';
import BroadcastLivestream from './BroadcastLivestream';

const Livestreams = () => {
    const navigate = useNavigate();
    const { canCreate, canUpdate, canDelete } = usePermission();
    const [events, setEvents] = useState([]);
    const [sacramentRecords, setSacramentRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [openDialog, setOpenDialog] = useState(false);
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [activeTab, setActiveTab] = useState('chat');
    const [openBroadcast, setOpenBroadcast] = useState(false);
    const [formData, setFormData] = useState({
        title: '', event_type: 'Mass', custom_event_type: '', event_reference_id: '', scheduled_start: '', scheduled_end: '', streaming_url: '', location: 'Parish Church', status: 'Scheduled', max_viewers: ''
    });
    const [chatMessages, setChatMessages] = useState([]);
    const [newChatMessage, setNewChatMessage] = useState('');
    const [viewers, setViewers] = useState([]);
    const [newViewer, setNewViewer] = useState({ username: '', watch_duration: 0 });
    const [recordings, setRecordings] = useState([]);
    const [newRecording, setNewRecording] = useState({ title: '', recording_url: '' });
    const [notifications, setNotifications] = useState([]);
    const [newNotification, setNewNotification] = useState({ notification_type: 'Email', message: '' });
    const [statistics, setStatistics] = useState([]);
    const [newStatistic, setNewStatistic] = useState({ metric_name: '', metric_value: '' });

    useEffect(() => {
        fetchEvents();
    }, []);

    useEffect(() => {
        if (selectedEvent) {
            fetchEventDetails();
        }
    }, [selectedEvent]);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const [res, sacramentRes] = await Promise.all([
                livestreamAPI.getAll(),
                fetch('http://165.22.181.147/api/sacraments.php?type=all'),
            ]);
            const sacramentData = await sacramentRes.json();
            const data = res.data.success ? res.data.data || [] : [];
            setSacramentRecords(sacramentData.success ? sacramentData.data || [] : []);
            setEvents(data);
            setError('');
        } catch (err) {
            setError('Error fetching livestreams: ' + (err.response?.data?.message || err.message));
            setEvents([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchEventDetails = async () => {
        setDetailLoading(true);
        try {
            const params = { livestream_id: selectedEvent.livestream_id };
            const [chatRes, viewersRes, recordingsRes, notificationsRes, statsRes] = await Promise.all([
                livestreamChatAPI.getMessages(params),
                livestreamViewersAPI.getAll(params),
                livestreamRecordingsAPI.getAll(params),
                livestreamNotificationsAPI.getAll(params),
                livestreamStatisticsAPI.getAll(params),
            ]);

            setChatMessages(chatRes.data.success ? chatRes.data.data || [] : []);
            setViewers(viewersRes.data.success ? viewersRes.data.data || [] : []);
            setRecordings(recordingsRes.data.success ? recordingsRes.data.data || [] : []);
            setNotifications(notificationsRes.data.success ? notificationsRes.data.data || [] : []);
            setStatistics(statsRes.data.success ? statsRes.data.data || [] : []);
            setError('');
        } catch (err) {
            setError('Error loading event details: ' + (err.response?.data?.message || err.message));
        } finally {
            setDetailLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.title || !formData.scheduled_start) {
            setError('Title and scheduled start required');
            return;
        }

        try {
            // Resolve event_type: if user picked Other and provided custom, use custom
            const resolvedType = (formData.event_type === 'Other' && formData.custom_event_type?.trim()) ? formData.custom_event_type.trim() : formData.event_type;
            const referenceTypeByEvent = {
                Wedding: 'marriage_records',
                Baptism: 'baptismal_records',
                Confirmation: 'confirmation_records',
                Communion: 'communion_records',
                Burial: 'burial_records',
            };
            const payload = {
                ...formData,
                event_type: formData.event_type === 'Communion' ? 'Other' : (formData.event_type === 'Burial' ? 'Funeral' : resolvedType),
                event_reference_type: referenceTypeByEvent[formData.event_type],
            };
            // Remove helper field before sending
            delete payload.custom_event_type;

            if (editingId) {
                await livestreamAPI.update(editingId, payload);
            } else {
                await livestreamAPI.create(payload);
            }
            setOpenDialog(false);
            setEditingId(null);
            setFormData({ title: '', event_type: 'Mass', custom_event_type: '', event_reference_id: '', scheduled_start: '', scheduled_end: '', streaming_url: '', location: 'Parish Church', status: 'Scheduled', max_viewers: '' });
            fetchEvents();
        } catch (err) {
            setError('Error saving event: ' + (err.response?.data?.message || err.message));
        }
    };

    const getEventType = (event) => {
        const storedType = String(event?.event_type || '').trim();
        if (storedType) return storedType;

        const referenceTypeLabels = {
            marriage_records: 'Wedding',
            baptismal_records: 'Baptism',
            confirmation_records: 'Confirmation',
            communion_records: 'Communion',
            burial_records: 'Funeral',
        };
        if (referenceTypeLabels[event?.event_reference_type]) {
            return referenceTypeLabels[event.event_reference_type];
        }

        const title = String(event?.title || '').trim();
        const titleType = title.match(/^(funeral|wedding|baptism|confirmation|communion|mass)\b/i)?.[1];
        return titleType ? titleType.charAt(0).toUpperCase() + titleType.slice(1).toLowerCase() : 'Other';
    };

    const handleEdit = (ev) => {
        setEditingId(ev.livestream_id);
        // If event_type is not one of presets, show it as custom
        const presets = ['Mass', 'Wedding', 'Baptism', 'Confirmation', 'Communion', 'Burial', 'Other'];
        const eventType = getEventType(ev);
        const isPreset = presets.includes(eventType);
        const linkedType = {
            marriage_records: 'Wedding',
            baptismal_records: 'Baptism',
            confirmation_records: 'Confirmation',
            communion_records: 'Communion',
            burial_records: 'Burial',
        }[ev.event_reference_type];
        setFormData({
            title: ev.title || '',
            event_type: linkedType || (isPreset ? eventType : 'Other'),
            custom_event_type: isPreset ? '' : eventType,
            event_reference_id: linkedType ? ev.event_reference_id || '' : '',
            scheduled_start: ev.scheduled_start || '',
            scheduled_end: ev.scheduled_end || '',
            streaming_url: ev.streaming_url || '',
            location: ev.location || 'Parish Church',
            status: ev.status || 'Scheduled',
            max_viewers: ev.max_viewers || ''
        });
        setOpenDialog(true);
    };

    const createMySQLDatetime = (date = new Date()) => {
        const pad = (value) => String(value).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    };

    const handleUpdateStatus = async (event, status) => {
        try {
            const payload = { status };
            if (status === 'Live') {
                payload.actual_start = createMySQLDatetime();
            }
            if (status === 'Ended') {
                payload.actual_end = createMySQLDatetime();
            }
            await livestreamAPI.update(event.livestream_id, payload);
            if (selectedEvent?.livestream_id === event.livestream_id) {
                const refreshed = await livestreamAPI.getById(event.livestream_id);
                if (refreshed.data) {
                    setSelectedEvent(refreshed.data);
                }
            }
            fetchEvents();
        } catch (err) {
            setError('Error updating livestream status: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleDelete = async (livestreamId) => {
        try {
            await livestreamAPI.delete(livestreamId);
            if (selectedEvent?.livestream_id === livestreamId) {
                setSelectedEvent(null);
                setActiveTab('chat');
            }
            fetchEvents();
        } catch (err) {
            setError('Error deleting livestream: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleSelectEvent = (event) => {
        setSelectedEvent(event);
        setActiveTab('chat');
    };

    const handleOpenTab = (event, tab) => {
        setSelectedEvent(event);
        setActiveTab(tab);
    };

    const linkedSacrament = selectedEvent?.event_reference_type
        ? sacramentRecords.find((record) => String(record.record_id) === String(selectedEvent.event_reference_id) && ({
            marriage_records: 'Marriage',
            baptismal_records: 'Baptismal',
            confirmation_records: 'Confirmation',
            communion_records: 'Communion',
            burial_records: 'Burial',
        }[selectedEvent.event_reference_type] === record.sacrament_type))
        : null;

    const handleSendMessage = async () => {
        if (!newChatMessage.trim()) return;
        try {
            await livestreamChatAPI.postMessage({ livestream_id: selectedEvent.livestream_id, message: newChatMessage });
            setNewChatMessage('');
            fetchEventDetails();
        } catch (err) {
            setError('Error sending message: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleAddViewer = async () => {
        if (!newViewer.username.trim()) return;
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            await livestreamViewersAPI.addViewer({
                livestream_id: selectedEvent.livestream_id,
                viewer_email: newViewer.username,
                user_id: user.user_id || null,
                device_type: 'Desktop',
                watch_duration_seconds: Number(newViewer.watch_duration || 0),
                join_time: new Date().toISOString().slice(0, 19).replace('T', ' '),
            });
            setNewViewer({ username: '', watch_duration: 0 });
            fetchEventDetails();
        } catch (err) {
            setError('Error adding viewer: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleAddRecording = async () => {
        if (!newRecording.recording_url.trim()) return;
        try {
            await livestreamRecordingsAPI.create({
                livestream_id: selectedEvent.livestream_id,
                recording_url: newRecording.recording_url,
                title: newRecording.title || 'Livestream Recording',
                recording_quality: '720p',
                access_level: 'Private',
                is_available: 1,
            });
            setNewRecording({ title: '', recording_url: '' });
            fetchEventDetails();
        } catch (err) {
            setError('Error creating recording: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleAddNotification = async () => {
        if (!newNotification.message.trim()) return;
        try {
            await livestreamNotificationsAPI.create({
                livestream_id: selectedEvent.livestream_id,
                notification_type: 'Event_Starting',
                notification_method: newNotification.notification_type,
                title: 'Livestream Update',
                message: newNotification.message,
            });
            setNewNotification({ notification_type: 'Email', message: '' });
            fetchEventDetails();
        } catch (err) {
            setError('Error creating notification: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleAddStatistic = async () => {
        if (!newStatistic.metric_name.trim() || newStatistic.metric_value === '') return;
        try {
            const metricKey = newStatistic.metric_name.trim().toLowerCase();
            const metricMap = {
                views: 'total_viewers',
                viewers: 'total_viewers',
                total_viewers: 'total_viewers',
                peak_viewers: 'peak_viewers',
                peak: 'peak_viewers',
                messages: 'total_messages',
                total_messages: 'total_messages',
                chat_messages: 'total_messages',
                avg_watch_duration: 'average_watch_duration_seconds',
                watch_duration: 'average_watch_duration_seconds',
                duration: 'average_watch_duration_seconds',
                unique_devices: 'unique_devices',
                devices: 'unique_devices',
                unique_locations: 'unique_locations',
                locations: 'unique_locations',
                engagement: 'engagement_score',
                engagement_score: 'engagement_score',
                issues: 'tech_issues_reported',
                tech_issues: 'tech_issues_reported',
                recording_available: 'recording_available',
                recordings: 'recording_available',
            };
            const fieldName = metricMap[metricKey] || 'total_viewers';
            const payload = { livestream_id: selectedEvent.livestream_id };
            payload[fieldName] = fieldName === 'engagement_score' ? Number(newStatistic.metric_value) : Number(newStatistic.metric_value);
            await livestreamStatisticsAPI.create(payload);
            setNewStatistic({ metric_name: '', metric_value: '' });
            fetchEventDetails();
        } catch (err) {
            setError('Error creating statistic: ' + (err.response?.data?.message || err.message));
        }
    };

    const renderDetailContent = () => {
        if (!selectedEvent) {
            return (
                <Paper sx={{ p: 4, textAlign: 'center', color: '#64748b' }}>
                    Select an event to manage livestream chat, viewers, recordings, notifications, and statistics.
                </Paper>
            );
        }

        if (detailLoading) {
            return <CircularProgress />;
        }

        switch (activeTab) {
            case 'chat':
                return (
                    <Box>
                        <Typography variant="h6" sx={{ mb: 2 }}>Chat for {selectedEvent.title}</Typography>
                        <Paper sx={{ p: 2, mb: 3, maxHeight: 320, overflow: 'auto' }}>
                            {chatMessages.length ? chatMessages.map((message) => (
                                <Box key={message.chat_id} sx={{ mb: 2, borderBottom: '1px solid #e2e8f0', pb: 1 }}>
                                    <Typography sx={{ fontSize: 13, color: '#475569' }}>{message.created_at} â€¢ User {message.user_id || message.sender_id}</Typography>
                                    <Typography>{message.message}</Typography>
                                </Box>
                            )) : (
                                <Typography sx={{ color: '#64748b' }}>No chat messages yet.</Typography>
                            )}
                        </Paper>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                                fullWidth
                                label="New message"
                                value={newChatMessage}
                                onChange={(e) => setNewChatMessage(e.target.value)}
                                multiline
                                rows={2}
                            />
                            <Button variant="contained" onClick={handleSendMessage} sx={{ minWidth: 140 }}>Send</Button>
                        </Stack>
                    </Box>
                );
            case 'viewers':
                return (
                    <Box>
                        <Typography variant="h6" sx={{ mb: 2 }}>Viewers</Typography>
                        <Paper sx={{ p: 2, mb: 3, maxHeight: 320, overflow: 'auto' }}>
                            {viewers.length ? viewers.map((viewer) => (
                                <Box key={viewer.viewer_id} sx={{ mb: 2, borderBottom: '1px solid #e2e8f0', pb: 1 }}>
                                    <Typography sx={{ fontWeight: 600 }}>{viewer.username || `Viewer ${viewer.viewer_id}`}</Typography>
                                    <Typography sx={{ fontSize: 13, color: '#475569' }}>
                                        Joined: {viewer.join_time || 'N/A'} â€¢ Duration: {viewer.watch_duration || 0}s
                                    </Typography>
                                </Box>
                            )) : (
                                <Typography sx={{ color: '#64748b' }}>No viewers yet.</Typography>
                            )}
                        </Paper>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth label="Viewer name" value={newViewer.username} onChange={(e) => setNewViewer({ ...newViewer, username: e.target.value })} />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField fullWidth label="Watch duration (seconds)" type="number" value={newViewer.watch_duration} onChange={(e) => setNewViewer({ ...newViewer, watch_duration: e.target.value })} />
                            </Grid>
                            <Grid item xs={12} sm={2}>
                                <Button variant="contained" fullWidth sx={{ height: '100%' }} onClick={handleAddViewer}>Add Viewer</Button>
                            </Grid>
                        </Grid>
                    </Box>
                );
            case 'recordings':
                return (
                    <Box>
                        <Typography variant="h6" sx={{ mb: 2 }}>Recordings</Typography>
                        <Paper sx={{ p: 2, mb: 3, maxHeight: 320, overflow: 'auto' }}>
                            {recordings.length ? recordings.map((recording) => (
                                <Box key={recording.recording_id} sx={{ mb: 2, borderBottom: '1px solid #e2e8f0', pb: 1 }}>
                                    <Typography sx={{ fontWeight: 600 }}>{recording.title || 'Recording'}</Typography>
                                    <Typography sx={{ fontSize: 13, color: '#475569' }}>{recording.recording_url}</Typography>
                                    <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>Created: {recording.created_at || 'N/A'}</Typography>
                                </Box>
                            )) : (
                                <Typography sx={{ color: '#64748b' }}>No recordings yet.</Typography>
                            )}
                        </Paper>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth label="Recording title" value={newRecording.title} onChange={(e) => setNewRecording({ ...newRecording, title: e.target.value })} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth label="Recording URL" value={newRecording.recording_url} onChange={(e) => setNewRecording({ ...newRecording, recording_url: e.target.value })} />
                            </Grid>
                            <Grid item xs={12}>
                                <Button variant="contained" onClick={handleAddRecording}>Save Recording</Button>
                            </Grid>
                        </Grid>
                    </Box>
                );
            case 'notifications':
                return (
                    <Box>
                        <Typography variant="h6" sx={{ mb: 2 }}>Notifications</Typography>
                        <Paper sx={{ p: 2, mb: 3, maxHeight: 320, overflow: 'auto' }}>
                            {notifications.length ? notifications.map((notification) => (
                                <Box key={notification.notification_id} sx={{ mb: 2, borderBottom: '1px solid #e2e8f0', pb: 1 }}>
                                    <Typography sx={{ fontWeight: 600 }}>{notification.notification_type}</Typography>
                                    <Typography>{notification.message}</Typography>
                                    <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>Sent: {notification.created_at || 'N/A'}</Typography>
                                </Box>
                            )) : (
                                <Typography sx={{ color: '#64748b' }}>No notifications yet.</Typography>
                            )}
                        </Paper>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={4}>
                                <FormControl fullWidth>
                                    <InputLabel>Type</InputLabel>
                                    <Select label="Type" value={newNotification.notification_type} onChange={(e) => setNewNotification({ ...newNotification, notification_type: e.target.value })}>
                                        <MenuItem value="Email">Email</MenuItem>
                                        <MenuItem value="SMS">SMS</MenuItem>
                                        <MenuItem value="Push">Push</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={8}>
                                <TextField fullWidth label="Message" value={newNotification.message} onChange={(e) => setNewNotification({ ...newNotification, message: e.target.value })} />
                            </Grid>
                            <Grid item xs={12}>
                                <Button variant="contained" onClick={handleAddNotification}>Send Notification</Button>
                            </Grid>
                        </Grid>
                    </Box>
                );
            case 'statistics':
                return (
                    <Box>
                        <Typography variant="h6" sx={{ mb: 2 }}>Statistics</Typography>
                        <Paper sx={{ p: 2, mb: 3, maxHeight: 320, overflow: 'auto' }}>
                            {statistics.length ? statistics.map((stat) => (
                                <Box key={stat.statistic_id} sx={{ mb: 2, borderBottom: '1px solid #e2e8f0', pb: 1 }}>
                                    <Typography sx={{ fontWeight: 600 }}>{stat.metric_name}</Typography>
                                    <Typography>{stat.metric_value}</Typography>
                                    <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>Captured: {stat.created_at || 'N/A'}</Typography>
                                </Box>
                            )) : (
                                <Typography sx={{ color: '#64748b' }}>No statistics recorded yet.</Typography>
                            )}
                        </Paper>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={5}>
                                <TextField fullWidth label="Metric" value={newStatistic.metric_name} onChange={(e) => setNewStatistic({ ...newStatistic, metric_name: e.target.value })} />
                            </Grid>
                            <Grid item xs={12} sm={5}>
                                <TextField fullWidth label="Value" value={newStatistic.metric_value} onChange={(e) => setNewStatistic({ ...newStatistic, metric_value: e.target.value })} />
                            </Grid>
                            <Grid item xs={12} sm={2}>
                                <Button variant="contained" fullWidth onClick={handleAddStatistic}>Add</Button>
                            </Grid>
                        </Grid>
                    </Box>
                );
            default:
                return null;
        }
    };

    if (loading) {
        return <CircularProgress />;
    }

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#edf3f1' }}>
            <Box sx={{
                background: 'linear-gradient(110deg, #123b50 0%, #0b6b68 70%, #d1a557 155%)',
                boxShadow: '0 12px 26px rgba(13, 70, 76, 0.14)',
                py: { xs: 1.5, md: 3 },
            }}>
                <Container maxWidth="lg">
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <IconButton
                                onClick={() => navigate('/dashboard')}
                                sx={{
                                    backgroundColor: 'rgba(255,255,255,0.14)',
                                    color: 'white',
                                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.24)' },
                                }}
                            >
                                <ArrowBackIcon />
                            </IconButton>
                            <Box>
                                <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: '0.12em' }}>
                                    Parish broadcast
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 800, color: 'white', lineHeight: 1.15 }}>
                                    Livestreams
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.78)' }}>
                                    Manage livestream events and settings
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </Container>
            </Box>

            <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 }, px: { xs: 1, md: 2 } }}>
                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={4}>
                        <Card sx={{ borderTop: '3px solid #d49347' }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Typography color="textSecondary" gutterBottom>Total Livestreams</Typography>
                                <Typography variant="h5" sx={{ color: '#ec4899', fontWeight: 700 }}>{events.length}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <Card sx={{ borderTop: '3px solid #168fa3' }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Typography color="textSecondary" gutterBottom>Scheduled</Typography>
                                <Typography variant="h5" sx={{ color: '#3b82f6', fontWeight: 700 }}>{events.filter(e => e.status === 'Scheduled').length}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                <Grid container spacing={4}>
                    <Grid item xs={12} lg={7}>
                        <Paper sx={{ p: 2, mb: 4, borderRadius: 3, border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)' }}>
                            <Typography variant="h6" sx={{ mb: 2 }}>Livestream Events</Typography>
                            <TableContainer>
                                <Table sx={{ minWidth: 750 }}>
                                    <TableHead>
                                        <TableRow sx={{ backgroundColor: '#edf3f1' }}>
                                            <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Title</TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Type</TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Start</TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>End</TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Location</TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Status</TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {events.length ? events.map((ev) => (
                                            <TableRow key={ev.livestream_id} sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f8fafc' }, '&:hover': { backgroundColor: '#f1f5f9' } }}>
                                                <TableCell sx={{ fontWeight: 600 }}>{ev.title}</TableCell>
                                                <TableCell><Chip label={getEventType(ev)} size="small" /></TableCell>
                                                <TableCell>{ev.scheduled_start}</TableCell>
                                                <TableCell>{ev.scheduled_end}</TableCell>
                                                <TableCell>{ev.location}</TableCell>
                                                <TableCell><Chip label={ev.status} color={ev.status === 'Scheduled' ? 'primary' : 'default'} size="small" /></TableCell>
                                                <TableCell>
                                                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                                        <Button size="small" onClick={() => handleSelectEvent(ev)}>Manage</Button>
                                                        {ev.status === 'Scheduled' && (canUpdate('livestreams') || canCreate('livestreams')) && (
                                                            <IconButton size="small" color="success" title="Start Live" onClick={() => handleUpdateStatus(ev, 'Live')}>
                                                                <PlayArrowIcon fontSize="small" />
                                                            </IconButton>
                                                        )}
                                                        {ev.status === 'Live' && (canUpdate('livestreams') || canCreate('livestreams')) && (
                                                            <IconButton size="small" color="secondary" title="End Live" onClick={() => handleUpdateStatus(ev, 'Ended')}>
                                                                <StopIcon fontSize="small" />
                                                            </IconButton>
                                                        )}
                                                        <IconButton size="small" title="Chat" onClick={() => handleOpenTab(ev, 'chat')}><ChatIcon fontSize="small" /></IconButton>
                                                        <IconButton size="small" title="Viewers" onClick={() => handleOpenTab(ev, 'viewers')}><GroupsIcon fontSize="small" /></IconButton>
                                                        <IconButton size="small" title="Recordings" onClick={() => handleOpenTab(ev, 'recordings')}><VideoLibraryIcon fontSize="small" /></IconButton>
                                                        <IconButton size="small" title="Notifications" onClick={() => handleOpenTab(ev, 'notifications')}><NotificationsIcon fontSize="small" /></IconButton>
                                                        <IconButton size="small" title="Statistics" onClick={() => handleOpenTab(ev, 'statistics')}><BarChartIcon fontSize="small" /></IconButton>
                                                        {ev.status === 'Live' && ev.streaming_url && (
                                                            <IconButton
                                                                size="small"
                                                                title="Watch Live"
                                                                component="a"
                                                                href={`/watch/${ev.livestream_id}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                            >
                                                                <OpenInNewIcon fontSize="small" />
                                                            </IconButton>
                                                        )}
                                                        {canUpdate('livestreams') && <IconButton size="small" onClick={() => handleEdit(ev)}><EditIcon fontSize="small" /></IconButton>}
                                                        {canDelete('livestreams') && <IconButton size="small" color="error" onClick={() => handleDelete(ev.livestream_id)}><DeleteIcon fontSize="small" /></IconButton>}
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={7} sx={{ textAlign: 'center', py: 3, color: '#64748b' }}>
                                                    No livestreams found
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </Grid>

                    <Grid item xs={12} lg={5}>
                        <Paper sx={{ p: 2, mb: 4, borderRadius: 3, border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)' }}>
                            <Typography variant="h6" sx={{ mb: 2 }}>Livestream Details</Typography>
                            {selectedEvent && (
                                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                                    <Typography variant="subtitle1" sx={{ color: '#475569' }}>{selectedEvent.title} â€¢ {selectedEvent.status}</Typography>
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        {selectedEvent.status === 'Scheduled' && canUpdate('livestreams') && (
                                            <Button size="small" variant="contained" color="success" onClick={() => handleUpdateStatus(selectedEvent, 'Live')}>Start Live</Button>
                                        )}
                                        {selectedEvent.status === 'Live' && canUpdate('livestreams') && (
                                            <Button size="small" variant="contained" color="secondary" onClick={() => handleUpdateStatus(selectedEvent, 'Ended')}>End Live</Button>
                                        )}
                                        {selectedEvent.streaming_url && (
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                href={`/watch/${selectedEvent.livestream_id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                Watch
                                            </Button>
                                        )}
                                        {selectedEvent.status === 'Live' && canUpdate('livestreams') && (
                                            <Button
                                                size="small"
                                                variant="contained"
                                                color="info"
                                                startIcon={<ScreenShareIcon />}
                                                onClick={() => setOpenBroadcast(true)}
                                            >
                                                Screen Share
                                            </Button>
                                        )}
                                        {canUpdate('livestreams') && (
                                            <Button
                                                size="small"
                                                variant="contained"
                                                onClick={() => handleEdit(selectedEvent)}
                                            >
                                                Edit
                                            </Button>
                                        )}
                                    </Box>
                                </Box>
                            )}
                            {linkedSacrament && (
                                <Alert severity="info" sx={{ mb: 2 }}>
                                    Linked {linkedSacrament.sacrament_type.toLowerCase()} record: <strong>{linkedSacrament.first_name} {linkedSacrament.last_name}</strong> on {linkedSacrament.record_date}
                                </Alert>
                            )}
                            {selectedEvent && selectedEvent.max_viewers > 0 && (
                                <Box sx={{ mb: 2 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, color: '#475569', fontSize: 12 }}>
                                        <span>Live viewer capacity</span>
                                        <span>{selectedEvent.current_viewers || 0}/{selectedEvent.max_viewers}</span>
                                    </Box>
                                    <Box sx={{ width: '100%', height: 10, borderRadius: 999, bgcolor: '#e2e8f0', overflow: 'hidden' }}>
                                        <Box
                                            sx={{
                                                width: `${Math.min(100, (((selectedEvent.current_viewers || 0) / selectedEvent.max_viewers) * 100) || 0)}%`,
                                                height: '100%',
                                                borderRadius: 999,
                                                background: 'linear-gradient(90deg, #10b981 0%, #f59e0b 60%, #ef4444 100%)',
                                            }}
                                        />
                                    </Box>
                                    <Typography variant="caption" sx={{ color: '#64748b', mt: 0.5, display: 'block' }}>
                                        {Math.min(100, (((selectedEvent.current_viewers || 0) / selectedEvent.max_viewers) * 100) || 0).toFixed(0)}% of audience capacity
                                    </Typography>
                                </Box>
                            )}
                            {selectedEvent && !selectedEvent.streaming_url && (
                                <Alert severity="warning" sx={{ mb: 2 }}>
                                    Walang streaming URL ang event na ito. I-edit ang livestream at ilagay ang YouTube live link sa <strong>Streaming URL</strong> field.
                                </Alert>
                            )}
                            {selectedEvent && selectedEvent.streaming_url && (
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="body2" sx={{ color: '#475569' }}>Streaming URL:</Typography>
                                    <Typography sx={{ wordBreak: 'break-word' }}>{selectedEvent.streaming_url}</Typography>
                                </Box>
                            )}
                            {selectedEvent && selectedEvent.streaming_url && selectedEvent.streaming_url.startsWith('blob:') && (
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    Detected invalid local blob stream URL. Replace this with a public YouTube/Vimeo live link or a direct video URL so users can watch it.
                                </Alert>
                            )}
                            <Tabs value={activeTab} onChange={(e, value) => setActiveTab(value)}>
                                <Tab label="Chat" value="chat" />
                                <Tab label="Viewers" value="viewers" />
                                <Tab label="Recordings" value="recordings" />
                                <Tab label="Notifications" value="notifications" />
                                <Tab label="Statistics" value="statistics" />
                            </Tabs>
                            <Box sx={{ mt: 3 }}>{renderDetailContent()}</Box>
                        </Paper>
                    </Grid>
                </Grid>
            </Container>

            <Dialog open={openDialog} onClose={() => { setOpenDialog(false); setEditingId(null); }} maxWidth="sm" fullWidth>
                <DialogTitle>{editingId ? 'Edit Livestream' : 'Add Livestream'}</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <TextField fullWidth label="Title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} margin="normal" required />
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Type</InputLabel>
                        <Select value={formData.event_type} onChange={(e) => setFormData({ ...formData, event_type: e.target.value })} label="Type">
                            <MenuItem value="Mass">Mass</MenuItem>
                            <MenuItem value="Wedding">Wedding</MenuItem>
                            <MenuItem value="Baptism">Baptism</MenuItem>
                            <MenuItem value="Confirmation">Confirmation</MenuItem>
                            <MenuItem value="Communion">Communion</MenuItem>
                            <MenuItem value="Burial">Burial</MenuItem>
                            <MenuItem value="Other">Other</MenuItem>
                        </Select>
                    </FormControl>
                    {formData.event_type === 'Other' && (
                        <TextField fullWidth label="Custom Type" value={formData.custom_event_type} onChange={(e) => setFormData({ ...formData, custom_event_type: e.target.value })} margin="normal" />
                    )}
                    {['Wedding', 'Baptism', 'Confirmation', 'Communion', 'Burial'].includes(formData.event_type) && (
                        <FormControl fullWidth margin="normal">
                            <InputLabel>{formData.event_type} Record</InputLabel>
                            <Select
                                value={formData.event_reference_id}
                                label={`${formData.event_type} Record`}
                                onChange={(e) => {
                                    const recordType = {
                                        Wedding: 'Marriage',
                                        Baptism: 'Baptismal',
                                        Confirmation: 'Confirmation',
                                        Communion: 'Communion',
                                        Burial: 'Burial',
                                    }[formData.event_type];
                                    const record = sacramentRecords.find((item) => item.sacrament_type === recordType && String(item.record_id) === String(e.target.value));
                                    const childName = record ? `${record.first_name || ''} ${record.last_name || ''}`.trim() : '';
                                    setFormData({
                                        ...formData,
                                        event_reference_id: e.target.value,
                                        title: childName ? `${formData.event_type} of ${childName}` : formData.title,
                                    });
                                }}
                            >
                                <MenuItem value="">Select an existing {formData.event_type.toLowerCase()} record</MenuItem>
                                {sacramentRecords.filter((record) => record.sacrament_type === ({ Wedding: 'Marriage', Baptism: 'Baptismal', Confirmation: 'Confirmation', Communion: 'Communion', Burial: 'Burial' }[formData.event_type])).map((record) => (
                                    <MenuItem key={`${record.sacrament_type}-${record.record_id}-${record.person_id}`} value={record.record_id}>
                                        {record.first_name} {record.last_name} - {record.record_date}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                    <TextField fullWidth label="Start" type="datetime-local" value={formData.scheduled_start} onChange={(e) => setFormData({ ...formData, scheduled_start: e.target.value })} margin="normal" InputLabelProps={{ shrink: true }} required />
                    <TextField fullWidth label="End" type="datetime-local" value={formData.scheduled_end} onChange={(e) => setFormData({ ...formData, scheduled_end: e.target.value })} margin="normal" InputLabelProps={{ shrink: true }} />
                    <TextField
                        fullWidth
                        label="Streaming URL"
                        placeholder="Paste YouTube/Facebook/Vimeo live link or direct MP4 URL"
                        value={formData.streaming_url}
                        onChange={(e) => setFormData({ ...formData, streaming_url: e.target.value })}
                        margin="normal"
                        helperText="Enter a live video source URL so viewers can watch inside the app."
                    />
                    <TextField fullWidth label="Location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} margin="normal" />
                    <TextField fullWidth label="Max Viewers" type="number" value={formData.max_viewers} onChange={(e) => setFormData({ ...formData, max_viewers: e.target.value })} margin="normal" />
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Status</InputLabel>
                        <Select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} label="Status">
                            <MenuItem value="Scheduled">Scheduled</MenuItem>
                            <MenuItem value="Live">Live</MenuItem>
                            <MenuItem value="Ended">Ended</MenuItem>
                            <MenuItem value="Cancelled">Cancelled</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setOpenDialog(false); setEditingId(null); }}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave}>{editingId ? 'Update' : 'Add'}</Button>
                </DialogActions>
            </Dialog>

            <BroadcastLivestream
                open={openBroadcast}
                onClose={() => setOpenBroadcast(false)}
                livestreamId={selectedEvent?.livestream_id}
                maxViewers={selectedEvent?.max_viewers || 0}
            />
        </Box>
    );
};

export default Livestreams;
