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
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    Alert,
    Typography,
    IconButton,
    Card,
    CardContent,
    Grid,
    Chip,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = 'http://localhost/josephus/st.joseph/public/api';

const NotificationLogs = () => {
    const [logs, setLogs] = useState([]);
    const [persons, setPersons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openStatusDialog, setOpenStatusDialog] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [formData, setFormData] = useState({
        person_id: '',
        message_body: '',
        notif_type: 'Email',
        sent_status: 'Pending',
    });
    const [editingId, setEditingId] = useState(null);
    const [selectedLog, setSelectedLog] = useState(null);

    useEffect(() => {
        fetchLogs();
        fetchPersons();
    }, []);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/notification-logs.php`);
            if (response.data.success) {
                setLogs(response.data.data);
                setError('');
            }
        } catch (err) {
            setError('Error fetching notification logs');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPersons = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/persons.php`);
            if (response.data.success) {
                setPersons(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching persons:', err);
        }
    };

    const handleOpenDialog = () => {
        setFormData({
            person_id: '',
            message_body: '',
            notif_type: 'Email',
            sent_status: 'Pending',
        });
        setEditingId(null);
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
    };

    const handleOpenStatusDialog = (log) => {
        setSelectedLog(log);
        setOpenStatusDialog(true);
    };

    const handleCloseStatusDialog = () => {
        setOpenStatusDialog(false);
        setSelectedLog(null);
    };

    const handleAddLog = async () => {
        if (!formData.message_body) {
            setError('Please fill in all required fields');
            return;
        }

        try {
            const response = await axios.post(`${API_BASE_URL}/notification-logs.php`, formData);
            if (response.data.success) {
                setSuccess('Notification log created successfully');
                fetchLogs();
                handleCloseDialog();
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error creating notification log');
        }
    };

    const handleUpdateStatus = async () => {
        if (!selectedLog) return;

        try {
            const response = await axios.put(
                `${API_BASE_URL}/notification-logs.php?id=${selectedLog.notif_id}`,
                { sent_status: selectedLog.sent_status }
            );
            if (response.data.success) {
                setSuccess('Notification status updated successfully');
                fetchLogs();
                handleCloseStatusDialog();
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error updating notification status');
        }
    };

    const handleDeleteLog = async (notifId) => {
        if (window.confirm('Are you sure you want to delete this notification log?')) {
            try {
                const response = await axios.delete(`${API_BASE_URL}/notification-logs.php?id=${notifId}`);
                if (response.data.success) {
                    setSuccess('Notification log deleted successfully');
                    fetchLogs();
                    setTimeout(() => setSuccess(''), 3000);
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Error deleting notification log');
            }
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Sent':
                return 'success';
            case 'Pending':
                return 'warning';
            case 'Failed':
                return 'error';
            default:
                return 'default';
        }
    };

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress />
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Notification Logs</Typography>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={handleOpenDialog}
                >
                    Send Notification
                </Button>
            </Box>

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 1 }}>
                                <Typography color="textSecondary" gutterBottom>
                                    Total Notifications
                                </Typography>
                                <Typography variant="h5">{logs.length}</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Box sx={{ p: 2, bgcolor: '#fff3e0', borderRadius: 1 }}>
                                <Typography color="textSecondary" gutterBottom>
                                    Pending
                                </Typography>
                                <Typography variant="h5">
                                    {logs.filter(l => l.sent_status === 'Pending').length}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Box sx={{ p: 2, bgcolor: '#e8f5e9', borderRadius: 1 }}>
                                <Typography color="textSecondary" gutterBottom>
                                    Sent
                                </Typography>
                                <Typography variant="h5">
                                    {logs.filter(l => l.sent_status === 'Sent').length}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Box sx={{ p: 2, bgcolor: '#ffebee', borderRadius: 1 }}>
                                <Typography color="textSecondary" gutterBottom>
                                    Failed
                                </Typography>
                                <Typography variant="h5">
                                    {logs.filter(l => l.sent_status === 'Failed').length}
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell><strong>ID</strong></TableCell>
                            <TableCell><strong>Person</strong></TableCell>
                            <TableCell><strong>Message</strong></TableCell>
                            <TableCell><strong>Type</strong></TableCell>
                            <TableCell><strong>Status</strong></TableCell>
                            <TableCell><strong>Sent At</strong></TableCell>
                            <TableCell align="center"><strong>Actions</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {logs.length > 0 ? (
                            logs.map((log) => (
                                <TableRow key={log.notif_id} hover>
                                    <TableCell>{log.notif_id}</TableCell>
                                    <TableCell>{log.first_name} {log.last_name || 'N/A'}</TableCell>
                                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {log.message_body}
                                    </TableCell>
                                    <TableCell>{log.notif_type}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={log.sent_status}
                                            color={getStatusColor(log.sent_status)}
                                            size="small"
                                            onClick={() => handleOpenStatusDialog(log)}
                                        />
                                    </TableCell>
                                    <TableCell>{new Date(log.sent_at).toLocaleDateString()}</TableCell>
                                    <TableCell align="center">
                                        <IconButton
                                            color="error"
                                            size="small"
                                            onClick={() => handleDeleteLog(log.notif_id)}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                    No notification logs found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Send Notification</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Person (Optional)</InputLabel>
                        <Select
                            value={formData.person_id}
                            onChange={(e) => setFormData({ ...formData, person_id: e.target.value })}
                            label="Person (Optional)"
                        >
                            <MenuItem value="">All Users</MenuItem>
                            {persons.map((person) => (
                                <MenuItem key={person.person_id} value={person.person_id}>
                                    {person.first_name} {person.last_name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Message"
                        multiline
                        rows={4}
                        value={formData.message_body}
                        onChange={(e) => setFormData({ ...formData, message_body: e.target.value })}
                        required
                    />
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Type</InputLabel>
                        <Select
                            value={formData.notif_type}
                            onChange={(e) => setFormData({ ...formData, notif_type: e.target.value })}
                            label="Type"
                        >
                            <MenuItem value="Email">Email</MenuItem>
                            <MenuItem value="SMS">SMS</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleAddLog} variant="contained" color="primary">
                        Send
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openStatusDialog} onClose={handleCloseStatusDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Update Notification Status</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    {selectedLog && (
                        <>
                            <TextField
                                fullWidth
                                margin="normal"
                                label="Message"
                                value={selectedLog.message_body}
                                disabled
                                multiline
                                rows={3}
                            />
                            <FormControl fullWidth margin="normal">
                                <InputLabel>Status</InputLabel>
                                <Select
                                    value={selectedLog.sent_status}
                                    onChange={(e) => setSelectedLog({ ...selectedLog, sent_status: e.target.value })}
                                    label="Status"
                                >
                                    <MenuItem value="Pending">Pending</MenuItem>
                                    <MenuItem value="Sent">Sent</MenuItem>
                                    <MenuItem value="Failed">Failed</MenuItem>
                                </Select>
                            </FormControl>
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseStatusDialog}>Cancel</Button>
                    <Button onClick={handleUpdateStatus} variant="contained" color="primary">
                        Update
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default NotificationLogs;
