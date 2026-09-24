import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Box,
    Container,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    CircularProgress,
    Alert,
    Typography,
    Chip,
    IconButton,
    Card,
    CardContent,
    Grid,
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { usePermission } from '../contexts/PermissionContext';
import { livestreamAPI } from '../api/apiClient';
import { formatSafeIsoDate } from '../utils/formatters';

const API_BASE_URL = 'http://165.22.181.147/api';

const Schedules = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { canCreate, canUpdate, canDelete } = usePermission();
    const [schedules, setSchedules] = useState([]);
    const [persons, setPersons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openAvailabilityDialog, setOpenAvailabilityDialog] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [unavailabilityEntries, setUnavailabilityEntries] = useState([]);
    const [unavailabilityForm, setUnavailabilityForm] = useState({
        priest_id: '',
        unavailable_date: '',
        reason: '',
        notes: '',
    });
    const [formData, setFormData] = useState({
        event_title: '',
        event_type: 'Mass',
        start_datetime: '',
        end_datetime: '',
        location: 'Parish Church',
        priest_id: '',
        status: 'Scheduled',
    });
    const selectedDate = new URLSearchParams(location.search).get('date');
    const priests = persons.filter((person) => String(person.occupation || '').toLowerCase() === 'priest');

    useEffect(() => {
        fetchAllData();
    }, [selectedDate]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [schedulesRes, personsRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/schedules.php`),
                axios.get(`${API_BASE_URL}/persons.php`),
            ]);

            const schedulesData = schedulesRes.data.success ? schedulesRes.data.data || [] : [];
            const personsData = personsRes.data.success ? personsRes.data.data || [] : [];

            setSchedules(selectedDate
                ? schedulesData.filter(schedule => formatSafeIsoDate(schedule.start_datetime) === selectedDate)
                : schedulesData);
            setPersons(personsData);
            setError('');
            setSuccess('');
        } catch (err) {
            setError('Error fetching data: ' + (err.response?.data?.message || err.message));
            setSuccess('');
            setSchedules([]);
            setPersons([]);
        } finally {
            setLoading(false);
        }
    };

    const getPriestName = (assignedPriest) => {
        if (!assignedPriest) return 'TBD';
        const priest = persons.find(p => p.person_id == assignedPriest);
        return priest ? `${priest.first_name} ${priest.last_name}` : 'Unknown';
    };

    const getScheduleDisplayStatus = (schedule) => {
        const now = new Date();
        const start = schedule.start_datetime ? new Date(schedule.start_datetime) : null;
        const end = schedule.end_datetime ? new Date(schedule.end_datetime) : null;

        if (schedule.status === 'Scheduled' && start && now >= start && (!end || now <= end)) {
            return 'Ongoing';
        }

        if (schedule.status === 'Scheduled' && end && now > end) {
            return 'Completed';
        }

        return schedule.status;
    };

    const isScheduleCurrentlyOngoing = (schedule) => {
        const now = new Date();
        const start = schedule.start_datetime ? new Date(schedule.start_datetime) : null;
        const end = schedule.end_datetime ? new Date(schedule.end_datetime) : null;

        return start && now >= start && (!end || now <= end);
    };

    const fetchPriestUnavailability = async (priestId) => {
        if (!priestId) {
            setUnavailabilityEntries([]);
            return;
        }

        try {
            const response = await axios.get(`${API_BASE_URL}/priest-unavailability.php?priest_id=${priestId}`);
            if (response.data.success) {
                setUnavailabilityEntries(response.data.data || []);
            } else {
                setUnavailabilityEntries([]);
            }
        } catch {
            setUnavailabilityEntries([]);
        }
    };

    useEffect(() => {
        if (openDialog && formData.priest_id) {
            fetchPriestUnavailability(formData.priest_id);
        } else {
            setUnavailabilityEntries([]);
        }
    }, [openDialog, formData.priest_id]);

    const handleSavePriestUnavailability = async () => {
        if (!unavailabilityForm.priest_id || !unavailabilityForm.unavailable_date || !unavailabilityForm.reason) {
            setError('Please complete priest, date, and reason for unavailability.');
            return;
        }

        try {
            const response = await axios.post(`${API_BASE_URL}/priest-unavailability.php`, {
                priest_id: unavailabilityForm.priest_id,
                unavailable_date: unavailabilityForm.unavailable_date,
                reason: unavailabilityForm.reason,
                notes: unavailabilityForm.notes,
                is_active: 1,
            });

            if (response.data.success) {
                setSuccess('Priest unavailable date saved successfully.');
                setError('');
                setUnavailabilityForm({
                    priest_id: unavailabilityForm.priest_id,
                    unavailable_date: '',
                    reason: '',
                    notes: '',
                });
                fetchPriestUnavailability(unavailabilityForm.priest_id);
            } else {
                setError(response.data.message || 'Failed to save priest unavailability.');
            }
        } catch (err) {
            setError('Error saving priest unavailability: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleDeletePriestUnavailability = async (id) => {
        try {
            const response = await axios.delete(`${API_BASE_URL}/priest-unavailability.php?id=${id}`);
            if (response.data.success) {
                setSuccess('Unavailability removed.');
                setError('');
                fetchPriestUnavailability(formData.priest_id || unavailabilityForm.priest_id);
            } else {
                setError(response.data.message || 'Failed to remove unavailability.');
            }
        } catch (err) {
            setError('Error removing priest unavailability: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleAddSchedule = async () => {
        if (!formData.event_title || !formData.start_datetime) {
            setError('Please fill all required fields');
            return;
        }
        
        // Validate datetime: end_datetime should be >= start_datetime
        if (formData.end_datetime && formData.start_datetime > formData.end_datetime) {
            setError('End date/time must be after start date/time');
            return;
        }
        
        try {
            const endpoint = editingId 
                ? `${API_BASE_URL}/schedules.php?id=${editingId}` 
                : `${API_BASE_URL}/schedules.php`;
            const method = editingId ? 'put' : 'post';
            
            const response = await axios[method](endpoint, {
                event_title: formData.event_title,
                event_type: formData.event_type,
                start_datetime: formData.start_datetime,
                end_datetime: formData.end_datetime,
                location: formData.location,
                assigned_priest: formData.priest_id || null,
                status: formData.status,
                user_id: user?.user_id || null,
            });

            if (response.data.success) {
                const schedule = {
                    schedule_id: response.data.schedule_id,
                    event_title: formData.event_title,
                    event_type: formData.event_type,
                    start_datetime: formData.start_datetime,
                    end_datetime: formData.end_datetime,
                    location: formData.location,
                    status: formData.status,
                };

                setOpenDialog(false);
                setEditingId(null);
                setFormData({
                    event_title: '',
                    event_type: 'Mass',
                    start_datetime: '',
                    end_datetime: '',
                    location: 'Parish Church',
                    priest_id: '',
                    status: 'Scheduled',
                });

                if (!editingId && isScheduleCurrentlyOngoing(schedule)) {
                    await handleCreateLivestreamFromSchedule(schedule);
                }

                fetchAllData();
            } else {
                setError('Failed to save schedule');
            }
        } catch (err) {
            setError('Error saving schedule: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleDeleteSchedule = async (scheduleId) => {
        if (window.confirm('Delete this schedule?')) {
            try {
                const response = await axios.delete(`${API_BASE_URL}/schedules.php?id=${scheduleId}`);
                if (response.data.success) {
                    setSuccess('');
                    fetchAllData();
                } else {
                    setError('Failed to delete schedule');
                }
            } catch (err) {
                setError('Error deleting schedule: ' + err.message);
            }
        }
    };

    const getLivestreamStatusFromSchedule = (schedule) => {
        const now = new Date();
        const start = schedule.start_datetime ? new Date(schedule.start_datetime) : null;
        const end = schedule.end_datetime ? new Date(schedule.end_datetime) : null;
        if (start && now >= start && (!end || now <= end)) {
            return 'Live';
        }
        return 'Scheduled';
    };

    const handleCreateLivestreamFromSchedule = async (schedule) => {
        try {
            const status = getLivestreamStatusFromSchedule(schedule);
            const payload = {
                title: schedule.event_title,
                event_type: schedule.event_type,
                description: `Created from schedule ${schedule.schedule_id}`,
                scheduled_start: schedule.start_datetime,
                scheduled_end: schedule.end_datetime,
                location: schedule.location,
                status,
                max_viewers: null,
            };

            if (status === 'Live') {
                payload.actual_start = new Date().toISOString().slice(0, 19).replace('T', ' ');
            }

            const response = await livestreamAPI.create(payload);
            if (response.data.success) {
                setSuccess('Livestream created from schedule successfully.');
                setError('');
            } else {
                setError('Failed to create livestream from schedule');
                setSuccess('');
            }
        } catch (err) {
            setError('Error creating livestream: ' + (err.response?.data?.message || err.message));
            setSuccess('');
        }
    };

    const handleEditSchedule = (schedule) => {
        setEditingId(schedule.schedule_id);
        setFormData({
            event_title: schedule.event_title,
            event_type: schedule.event_type,
            start_datetime: schedule.start_datetime,
            end_datetime: schedule.end_datetime,
            location: schedule.location,
            priest_id: schedule.assigned_priest || '',
            status: schedule.status,
        });
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingId(null);
        setUnavailabilityEntries([]);
        setUnavailabilityForm({
            priest_id: '',
            unavailable_date: '',
            reason: '',
            notes: '',
        });
        setFormData({
            event_title: '',
            event_type: 'Mass',
            start_datetime: '',
            end_datetime: '',
            location: 'Parish Church',
            priest_id: '',
            status: 'Scheduled',
        });
    };

    if (loading) {
        return <CircularProgress />;
    }

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#edf3f1' }}>
            {/* Header Section */}
            <Box sx={{ py: { xs: 2.5, md: 3 }, background: 'linear-gradient(110deg, #123b50 0%, #0b6b68 70%, #d1a557 155%)', boxShadow: '0 12px 26px rgba(13, 70, 76, 0.14)' }}>
                <Container maxWidth="lg">
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <IconButton
                                onClick={() => navigate('/dashboard')}
                                sx={{
                                    backgroundColor: 'rgba(255,255,255,0.14)',
                                    color: 'white',
                                    '&:hover': {
                                        backgroundColor: 'rgba(255,255,255,0.24)',
                                    },
                                }}
                            >
                                <ArrowBackIcon />
                            </IconButton>
                            <Box>
                                <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: '0.12em' }}>
                                    Parish calendar
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 800, color: 'white', mb: 0.5, lineHeight: 1.15 }}>
                                    Parish schedules
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.78)' }}>
                                    Events, assignments, and service times in one view.
                                </Typography>
                            </Box>
                        </Box>
                        {canCreate('schedules') && (
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Button
                                    variant="outlined"
                                    onClick={() => setOpenAvailabilityDialog(true)}
                                    sx={{ borderColor: 'rgba(255,255,255,0.5)', color: 'white', '&:hover': { borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.1)' } }}
                                >
                                    Manage Priest Availability
                                </Button>
                            </Box>
                        )}
                    </Box>
                </Container>
            </Box>

            {/* Content Section */}
            <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

                {/* Summary Card */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={4}>
                        <Card sx={{ borderTop: '3px solid #d49347' }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700 }}>
                                    Total Events
                                </Typography>
                                <Typography variant="h5" sx={{ color: '#ec4899', fontWeight: 700 }}>
                                    {schedules.length}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ borderTop: '3px solid #168fa3' }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700 }}>
                                    Scheduled
                                </Typography>
                                <Typography variant="h5" sx={{ color: '#3b82f6', fontWeight: 700 }}>
                                    {schedules.filter(s => getScheduleDisplayStatus(s) === 'Scheduled').length}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ borderTop: '3px solid #25a878' }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700 }}>
                                    Ongoing
                                </Typography>
                                <Typography variant="h5" sx={{ color: '#059669', fontWeight: 700 }}>
                                    {schedules.filter(s => getScheduleDisplayStatus(s) === 'Ongoing').length}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ borderTop: '3px solid #7d8d91' }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700 }}>
                                    Completed
                                </Typography>
                                <Typography variant="h5" sx={{ color: '#64748b', fontWeight: 700 }}>
                                    {schedules.filter(s => getScheduleDisplayStatus(s) === 'Completed').length}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ borderTop: '3px solid #25a878' }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700 }}>
                                    Assigned Priests
                                </Typography>
                                <Typography variant="h5" sx={{ color: '#059669', fontWeight: 700 }}>
                                    {new Set(schedules.map(s => s.assigned_priest).filter(p => p)).size}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                <TableContainer component={Paper} sx={{ backgroundColor: '#fff', borderRadius: 3, overflow: 'auto', border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)' }}>
                    <Table sx={{ minWidth: 750 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Event Title</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Type</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Start Date/Time</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>End Date/Time</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Location</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Priest</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {schedules && schedules.length > 0 ? (
                                schedules.map((schedule) => (
                                    <TableRow 
                                        key={schedule.schedule_id}
                                        sx={{
                                            '&:nth-of-type(odd)': { backgroundColor: '#f8fafc' },
                                            '&:hover': { backgroundColor: '#f1f5f9' },
                                        }}
                                    >
                                        <TableCell sx={{ fontWeight: 700, color: '#123b50' }}>{schedule.event_title}</TableCell>
                                        <TableCell><Chip label={schedule.event_type} size="small" /></TableCell>
                                        <TableCell>{schedule.start_datetime}</TableCell>
                                        <TableCell>{schedule.end_datetime}</TableCell>
                                        <TableCell>{schedule.location}</TableCell>
                                        <TableCell>{getPriestName(schedule.assigned_priest)}</TableCell>
                                        <TableCell>
                                            {(() => {
                                                const displayStatus = getScheduleDisplayStatus(schedule);
                                                const chipColor = displayStatus === 'Scheduled'
                                                    ? 'primary'
                                                    : displayStatus === 'Ongoing'
                                                        ? 'success'
                                                        : 'default';
                                                return (
                                                    <Chip 
                                                        label={displayStatus} 
                                                        color={chipColor}
                                                        size="small"
                                                    />
                                                );
                                            })()}
                                        </TableCell>
                                        <TableCell>
                                            {canUpdate('schedules') && (
                                                <IconButton 
                                                    size="small"
                                                    onClick={() => handleEditSchedule(schedule)}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            )}
                                            {canDelete('schedules') && (
                                                <IconButton 
                                                    size="small" 
                                                    color="error"
                                                    onClick={() => handleDeleteSchedule(schedule.schedule_id)}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            )}
                                            {(canCreate('livestreams') || canCreate('schedules')) && ['Scheduled', 'Ongoing'].includes(getScheduleDisplayStatus(schedule)) && (
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() => handleCreateLivestreamFromSchedule(schedule)}
                                                    sx={{ ml: 1, textTransform: 'none' }}
                                                >
                                                    Create Livestream
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 3, color: '#64748b' }}>
                                        No schedules found
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Container>

            {/* Add/Edit Schedule Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>{editingId ? 'Edit Schedule' : 'Add New Event'}</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <TextField
                        fullWidth
                        label="Event Title"
                        value={formData.event_title}
                        onChange={(e) => setFormData({ ...formData, event_title: e.target.value })}
                        margin="normal"
                        required
                    />
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Event Type</InputLabel>
                        <Select
                            value={formData.event_type}
                            onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                            label="Event Type"
                        >
                            <MenuItem value="Mass">Mass</MenuItem>
                            <MenuItem value="Seminar">Seminar</MenuItem>
                            <MenuItem value="Wedding">Wedding</MenuItem>
                            <MenuItem value="Baptism">Baptism</MenuItem>
                            <MenuItem value="Funeral">Funeral</MenuItem>
                            <MenuItem value="Meeting">Meeting</MenuItem>
                            <MenuItem value="Fiesta">Fiesta</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        label="Start Date/Time"
                        type="datetime-local"
                        value={formData.start_datetime}
                        onChange={(e) => setFormData({ ...formData, start_datetime: e.target.value })}
                        margin="normal"
                        InputLabelProps={{ shrink: true }}
                        required
                    />
                    <TextField
                        fullWidth
                        label="End Date/Time"
                        type="datetime-local"
                        value={formData.end_datetime}
                        onChange={(e) => setFormData({ ...formData, end_datetime: e.target.value })}
                        margin="normal"
                        InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        fullWidth
                        label="Location"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        margin="normal"
                    />
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Assigned Priest</InputLabel>
                        <Select
                            value={formData.priest_id}
                            onChange={(e) => {
                                const priestId = e.target.value;
                                setFormData({ ...formData, priest_id: priestId });
                                setUnavailabilityForm((prev) => ({ ...prev, priest_id: priestId }));
                            }}
                            label="Assigned Priest"
                        >
                            <MenuItem value="">-- Not Assigned --</MenuItem>
                            {priests.map((person) => (
                                <MenuItem key={person.person_id} value={person.person_id}>
                                    {person.first_name} {person.last_name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {formData.priest_id && (
                        <Box sx={{ mt: 2, p: 2, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: '#f8fafc' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                                Priest Unavailability
                            </Typography>
                            <Grid container spacing={1.5}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Unavailable Date"
                                        type="date"
                                        value={unavailabilityForm.unavailable_date}
                                        onChange={(e) => setUnavailabilityForm({ ...unavailabilityForm, unavailable_date: e.target.value })}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Reason"
                                        value={unavailabilityForm.reason}
                                        onChange={(e) => setUnavailabilityForm({ ...unavailabilityForm, reason: e.target.value })}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Notes"
                                        value={unavailabilityForm.notes}
                                        onChange={(e) => setUnavailabilityForm({ ...unavailabilityForm, notes: e.target.value })}
                                    />
                                </Grid>
                            </Grid>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5 }}>
                                <Button size="small" variant="contained" onClick={handleSavePriestUnavailability}>
                                    Mark Unavailable
                                </Button>
                            </Box>

                            {unavailabilityEntries.length > 0 && (
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>
                                        Saved unavailable dates
                                    </Typography>
                                    <Box sx={{ mt: 1 }}>
                                        {unavailabilityEntries.map((item) => (
                                            <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75, borderBottom: '1px solid #e2e8f0' }}>
                                                <Box>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.unavailable_date}</Typography>
                                                    <Typography variant="caption" sx={{ color: '#64748b' }}>{item.reason}</Typography>
                                                </Box>
                                                <IconButton size="small" color="error" onClick={() => handleDeletePriestUnavailability(item.id)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    )}

                    <FormControl fullWidth margin="normal">
                        <InputLabel>Status</InputLabel>
                        <Select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            label="Status"
                        >
                            <MenuItem value="Scheduled">Scheduled</MenuItem>
                            <MenuItem value="Completed">Completed</MenuItem>
                            <MenuItem value="Cancelled">Cancelled</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleAddSchedule} variant="contained">
                        {editingId ? 'Update' : 'Add'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openAvailabilityDialog} onClose={() => setOpenAvailabilityDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Manage Priest Availability</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
                        Mark the dates when a priest is out of town or otherwise unavailable. Events cannot be assigned to that priest on those dates.
                    </Typography>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Priest</InputLabel>
                        <Select
                            value={unavailabilityForm.priest_id}
                            onChange={(e) => {
                                const priestId = e.target.value;
                                setUnavailabilityForm((prev) => ({ ...prev, priest_id: priestId }));
                                fetchPriestUnavailability(priestId);
                            }}
                            label="Priest"
                        >
                            <MenuItem value="">-- Select Priest --</MenuItem>
                            {priests.map((person) => (
                                <MenuItem key={person.person_id} value={person.person_id}>
                                    {person.first_name} {person.last_name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Grid container spacing={1.5} sx={{ mt: 0.25 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Unavailable Date"
                                type="date"
                                value={unavailabilityForm.unavailable_date}
                                onChange={(e) => setUnavailabilityForm((prev) => ({ ...prev, unavailable_date: e.target.value }))}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Reason"
                                value={unavailabilityForm.reason}
                                onChange={(e) => setUnavailabilityForm((prev) => ({ ...prev, reason: e.target.value }))}
                                placeholder="Out of town"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Notes"
                                value={unavailabilityForm.notes}
                                onChange={(e) => setUnavailabilityForm((prev) => ({ ...prev, notes: e.target.value }))}
                            />
                        </Grid>
                    </Grid>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5 }}>
                        <Button variant="contained" onClick={handleSavePriestUnavailability} disabled={!unavailabilityForm.priest_id}>
                            Mark Unavailable
                        </Button>
                    </Box>
                    {unavailabilityForm.priest_id && unavailabilityEntries.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>
                                Saved unavailable dates
                            </Typography>
                            {unavailabilityEntries.map((item) => (
                                <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75, borderBottom: '1px solid #e2e8f0' }}>
                                    <Box>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.unavailable_date}</Typography>
                                        <Typography variant="caption" sx={{ color: '#64748b' }}>{item.reason}</Typography>
                                    </Box>
                                    <IconButton size="small" color="error" onClick={() => handleDeletePriestUnavailability(item.id)}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Box>
                            ))}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAvailabilityDialog(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Schedules;
