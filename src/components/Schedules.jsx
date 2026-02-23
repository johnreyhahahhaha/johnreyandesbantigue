import React, { useState, useEffect } from 'react';
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
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = 'http://localhost/josephus/st.joseph/public/api';

const Schedules = () => {
    const [schedules, setSchedules] = useState([]);
    const [persons, setPersons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        event_title: '',
        event_type: 'Mass',
        start_datetime: '',
        end_datetime: '',
        location: 'Parish Church',
        priest_id: '',
        status: 'Scheduled',
    });

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [schedulesRes, personsRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/schedules.php`),
                axios.get(`${API_BASE_URL}/persons.php`),
            ]);

            const schedulesData = schedulesRes.data.success ? schedulesRes.data.data || [] : [];
            const personsData = personsRes.data.success ? personsRes.data.data || [] : [];

            setSchedules(schedulesData);
            setPersons(personsData);
            setError('');
        } catch (err) {
            setError('Error fetching data: ' + (err.response?.data?.message || err.message));
            setSchedules([]);
            setPersons([]);
        } finally {
            setLoading(false);
        }
    };

    const getPriestName = (priestId) => {
        if (!priestId) return 'TBD';
        const priest = persons.find(p => p.person_id == priestId);
        return priest ? `${priest.first_name} ${priest.last_name}` : 'Unknown';
    };

    const handleAddSchedule = async () => {
        if (!formData.event_title || !formData.start_datetime) {
            setError('Please fill all required fields');
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
                priest_id: formData.priest_id || null,
                status: formData.status,
            });

            if (response.data.success) {
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
                fetchAllData();
            } else {
                setError('Failed to save schedule');
            }
        } catch (err) {
            setError('Error saving schedule: ' + err.message);
        }
    };

    const handleDeleteSchedule = async (scheduleId) => {
        if (window.confirm('Delete this schedule?')) {
            try {
                const response = await axios.delete(`${API_BASE_URL}/schedules.php?id=${scheduleId}`);
                if (response.data.success) {
                    fetchAllData();
                } else {
                    setError('Failed to delete schedule');
                }
            } catch (err) {
                setError('Error deleting schedule: ' + err.message);
            }
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
            priest_id: schedule.priest_id || '',
            status: schedule.status,
        });
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
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
    };

    if (loading) {
        return <CircularProgress />;
    }

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc' }}>
            {/* Header Section */}
            <Box sx={{ bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0', py: 3 }}>
                <Container maxWidth="lg">
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 0.5 }}>
                                Parish Schedules
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#64748b' }}>
                                Manage church events and priest assignments
                            </Typography>
                        </Box>
                        <Button 
                            variant="contained" 
                            startIcon={<AddIcon />}
                            onClick={() => setOpenDialog(true)}
                            sx={{
                                backgroundColor: '#1e3a8a',
                                '&:hover': { backgroundColor: '#1e40af' }
                            }}
                        >
                            Add Event
                        </Button>
                    </Box>
                </Container>
            </Box>

            {/* Content Section */}
            <Container maxWidth="lg" sx={{ py: 4 }}>
                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                {/* Summary Card */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={4}>
                        <Card sx={{ boxShadow: 1 }}>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Total Events
                                </Typography>
                                <Typography variant="h5" sx={{ color: '#ec4899', fontWeight: 700 }}>
                                    {schedules.length}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <Card sx={{ boxShadow: 1 }}>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Scheduled
                                </Typography>
                                <Typography variant="h5" sx={{ color: '#3b82f6', fontWeight: 700 }}>
                                    {schedules.filter(s => s.status === 'Scheduled').length}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <Card sx={{ boxShadow: 1 }}>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Assigned Priests
                                </Typography>
                                <Typography variant="h5" sx={{ color: '#059669', fontWeight: 700 }}>
                                    {new Set(schedules.map(s => s.priest_id).filter(p => p)).size}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                <TableContainer component={Paper} sx={{ backgroundColor: '#fff', borderRadius: 1, overflow: 'auto' }}>
                    <Table sx={{ minWidth: 750 }}>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Event Title</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Type</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Start Date/Time</TableCell>
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
                                        <TableCell sx={{ fontWeight: 600 }}>{schedule.event_title}</TableCell>
                                        <TableCell><Chip label={schedule.event_type} size="small" /></TableCell>
                                        <TableCell>{schedule.start_datetime}</TableCell>
                                        <TableCell>{schedule.location}</TableCell>
                                        <TableCell>{getPriestName(schedule.priest_id)}</TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={schedule.status} 
                                                color={schedule.status === 'Scheduled' ? 'primary' : 'default'}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <IconButton 
                                                size="small"
                                                onClick={() => handleEditSchedule(schedule)}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton 
                                                size="small" 
                                                color="error"
                                                onClick={() => handleDeleteSchedule(schedule.schedule_id)}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 3, color: '#64748b' }}>
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
                            onChange={(e) => setFormData({ ...formData, priest_id: e.target.value })}
                            label="Assigned Priest"
                        >
                            <MenuItem value="">-- Not Assigned --</MenuItem>
                            {persons.map((person) => (
                                <MenuItem key={person.person_id} value={person.person_id}>
                                    {person.first_name} {person.last_name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
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
        </Box>
    );
};

export default Schedules;
