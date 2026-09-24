import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = 'http://165.22.181.147/api';

const NotificationLogs = () => {
    const navigate = useNavigate();
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
        recipient_address: '',
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
            recipient_address: '',
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
        if (!formData.message_body || !formData.recipient_address) {
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
        <Box sx={{ minHeight: '100vh', bgcolor: '#edf3f1' }}>
        <Box sx={{ py: { xs: 2.5, md: 3 }, background: 'linear-gradient(110deg, #123b50 0%, #0b6b68 70%, #d1a557 155%)', boxShadow: '0 12px 26px rgba(13, 70, 76, 0.14)' }}>
            <Container maxWidth="lg">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <IconButton onClick={() => navigate('/dashboard')} aria-label="Back to dashboard" sx={{ backgroundColor: 'rgba(255,255,255,0.14)', color: 'white', '&:hover': { backgroundColor: 'rgba(255,255,255,0.24)' } }}>
                        <ArrowBackIcon />
                    </IconButton>
                    <Box>
                        <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: '0.12em' }}>Delivery center</Typography>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: 'white', lineHeight: 1.15 }}>Notification logs</Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.78)', mt: 0.5 }}>Monitor parish messages across every channel.</Typography>
                    </Box>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenDialog} sx={{ bgcolor: '#d6a85a', color: '#123b50', '&:hover': { bgcolor: '#e3ba70' }, boxShadow: 'none' }}>
                    Send Notification
                </Button>
            </Box>
            </Container>
        </Box>
        <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Card sx={{ mb: 3, borderRadius: 3, border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)' }}>
                <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Box sx={{ p: 2, bgcolor: '#e5f3f6', borderTop: '3px solid #168fa3', borderRadius: 2 }}>
                                <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700 }}>
                                    Total Notifications
                                </Typography>
                                <Typography variant="h5">{logs.length}</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Box sx={{ p: 2, bgcolor: '#fff4df', borderTop: '3px solid #d49347', borderRadius: 2 }}>
                                <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700 }}>
                                    Pending
                                </Typography>
                                <Typography variant="h5">
                                    {logs.filter(l => l.sent_status === 'Pending').length}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Box sx={{ p: 2, bgcolor: '#e8f4ec', borderTop: '3px solid #25a878', borderRadius: 2 }}>
                                <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700 }}>
                                    Sent
                                </Typography>
                                <Typography variant="h5">
                                    {logs.filter(l => l.sent_status === 'Sent').length}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Box sx={{ p: 2, bgcolor: '#fff0ee', borderTop: '3px solid #b75c56', borderRadius: 2 }}>
                                <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700 }}>
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

            <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)', overflow: 'auto' }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell><strong>ID</strong></TableCell>
                            <TableCell><strong>Person</strong></TableCell>
                            <TableCell><strong>Message</strong></TableCell>
                            <TableCell><strong>Type</strong></TableCell>
                            <TableCell><strong>Recipient</strong></TableCell>
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
                                    <TableCell sx={{ fontWeight: 700, color: '#123b50' }}>{log.first_name} {log.last_name || 'N/A'}</TableCell>
                                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {log.message_body}
                                    </TableCell>
                                    <TableCell>{log.notif_type}</TableCell>
                                    <TableCell>{log.recipient_address}</TableCell>
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
                                <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
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
                            onChange={(e) => setFormData({ ...formData, notif_type: e.target.value, recipient_address: '' })}
                            label="Type"
                        >
                            <MenuItem value="Email">Email</MenuItem>
                            <MenuItem value="SMS">SMS</MenuItem>
                        </Select>
                    </FormControl>
                    {formData.notif_type === 'Email' && (
                        <TextField
                            fullWidth
                            margin="normal"
                            label="Recipient Email *"
                            type="email"
                            value={formData.recipient_address}
                            onChange={(e) => setFormData({ ...formData, recipient_address: e.target.value })}
                            placeholder="example@email.com"
                            required
                        />
                    )}
                    {formData.notif_type === 'SMS' && (
                        <TextField
                            fullWidth
                            margin="normal"
                            label="Recipient Phone Number *"
                            type="tel"
                            value={formData.recipient_address}
                            onChange={(e) => setFormData({ ...formData, recipient_address: e.target.value })}
                            placeholder="+63xxxxxxxxxx"
                            required
                        />
                    )}
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
        </Box>
    );
};

export default NotificationLogs;
