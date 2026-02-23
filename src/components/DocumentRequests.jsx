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
    Chip,
    Typography,
    IconButton,
    Card,
    CardContent,
    Grid,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = 'http://localhost/josephus/st.joseph/public/api';

const DocumentRequests = () => {
    const [requests, setRequests] = useState([]);
    const [persons, setPersons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        person_id: '',
        document_type: 'Baptismal Certificate',
        purpose: '',
        status: 'Pending',
        payment_status: 'Unpaid',
        amount_paid: '0',
    });

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            const [personsRes, requestsRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/persons.php`),
                axios.get(`${API_BASE_URL}/document-requests.php`),
            ]);
            
            const personsData = personsRes.data.success ? personsRes.data.data || [] : [];
            const requestsData = requestsRes.data.success ? requestsRes.data.data || [] : [];

            setPersons(personsData);
            setRequests(requestsData);
            setError('');
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.response?.statusText || err.message;
            setError('Error fetching data: ' + errorMsg);
            console.error('Fetch error:', err);
            setPersons([]);
            setRequests([]);
        } finally {
            setLoading(false);
        }
    };

    const getPersonName = (personId) => {
        const person = persons.find(p => p.person_id == personId);
        return person ? `${person.first_name} ${person.last_name}` : 'Unknown';
    };

    const handleAddRequest = async () => {
        if (!formData.person_id || !formData.document_type) {
            setError('Please fill all required fields: Person and Document Type');
            return;
        }
        try {
            const endpoint = editingId 
                ? `${API_BASE_URL}/document-requests.php?id=${editingId}` 
                : `${API_BASE_URL}/document-requests.php`;
            const method = editingId ? 'put' : 'post';
            
            const response = await axios[method](endpoint, {
                person_id: formData.person_id,
                document_type: formData.document_type,
                purpose: formData.purpose,
                status: formData.status,
                payment_status: formData.payment_status,
                amount_paid: parseFloat(formData.amount_paid || 0),
            });

            if (response.data.success) {
                setOpenDialog(false);
                setEditingId(null);
                setFormData({
                    person_id: '',
                    document_type: 'Baptismal Certificate',
                    purpose: '',
                    status: 'Pending',
                    payment_status: 'Unpaid',
                    amount_paid: '0',
                });
                fetchAllData();
                setError('');
            } else {
                setError('Failed to save request: ' + (response.data.message || 'Unknown error'));
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.response?.statusText || err.message;
            setError('Error saving request: ' + errorMsg);
            console.error('Save error:', err);
        }
    };

    const handleUpdateStatus = async (requestId, newStatus) => {
        try {
            const response = await axios.put(`${API_BASE_URL}/document-requests.php?id=${requestId}`, {
                status: newStatus,
            });

            if (response.data.success) {
                fetchAllData();
                setError('');
            } else {
                setError('Failed to update request: ' + (response.data.message || 'Unknown error'));
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.response?.statusText || err.message;
            setError('Error updating request: ' + errorMsg);
            console.error('Update error:', err);
        }
    };

    const handleDeleteRequest = async (requestId) => {
        if (window.confirm('Delete this request?')) {
            try {
                const response = await axios.delete(`${API_BASE_URL}/document-requests.php?id=${requestId}`);
                if (response.data.success) {
                    fetchAllData();
                    setError('');
                } else {
                    setError('Failed to delete request: ' + (response.data.message || 'Unknown error'));
                }
            } catch (err) {
                const errorMsg = err.response?.data?.message || err.response?.statusText || err.message;
                setError('Error deleting request: ' + errorMsg);
                console.error('Delete error:', err);
            }
        }
    };

    const handleEditRequest = (request) => {
        setEditingId(request.request_id);
        setFormData({
            person_id: request.person_id,
            document_type: request.document_type,
            purpose: request.purpose,
            status: request.status,
            payment_status: request.payment_status,
            amount_paid: request.amount_paid || '0',
        });
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingId(null);
        setFormData({
            person_id: '',
            document_type: 'Baptismal Certificate',
            purpose: '',
            status: 'Pending',
            payment_status: 'Unpaid',
            amount_paid: '0',
        });
    };

    const getStatusColor = (status) => {
        const colors = {
            'Pending': 'default',
            'Processing': 'warning',
            'Ready for Pickup': 'info',
            'Released': 'success',
        };
        return colors[status] || 'default';
    };

    if (loading) {
        return <CircularProgress />;
    }

    const pendingCount = requests.filter(r => r.status === 'Pending').length;
    const paidCount = requests.filter(r => r.payment_status === 'Paid').length;
    const processedCount = requests.filter(r => r.status === 'Released').length;

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc' }}>
            {/* Header Section */}
            <Box sx={{ bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0', py: 3 }}>
                <Container maxWidth="lg">
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 0.5 }}>
                                Document Requests
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#64748b' }}>
                                Track and manage parish document requests
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
                            New Request
                        </Button>
                    </Box>
                </Container>
            </Box>

            {/* Content Section */}
            <Container maxWidth="lg" sx={{ py: 4 }}>
                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                {/* Summary Cards */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={4}>
                        <Card sx={{ boxShadow: 1 }}>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Total Requests
                                </Typography>
                                <Typography variant="h5" sx={{ color: '#06b6d4', fontWeight: 700 }}>
                                    {requests.length}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <Card sx={{ boxShadow: 1 }}>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Pending
                                </Typography>
                                <Typography variant="h5" sx={{ color: '#f59e0b', fontWeight: 700 }}>
                                    {pendingCount}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <Card sx={{ boxShadow: 1 }}>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Payments Received
                                </Typography>
                                <Typography variant="h5" sx={{ color: '#059669', fontWeight: 700 }}>
                                    {paidCount}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                <TableContainer component={Paper} sx={{ backgroundColor: '#fff', borderRadius: 1, overflow: 'auto' }}>
                    <Table sx={{ minWidth: 750 }}>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Requester</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Document Type</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Purpose</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Request Date</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Payment</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Amount</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {requests && requests.length > 0 ? (
                                requests.map((request) => (
                                    <TableRow 
                                        key={request.request_id}
                                        sx={{
                                            '&:nth-of-type(odd)': { backgroundColor: '#f8fafc' },
                                            '&:hover': { backgroundColor: '#f1f5f9' },
                                        }}
                                    >
                                        <TableCell sx={{ fontWeight: 600 }}>{getPersonName(request.person_id)}</TableCell>
                                        <TableCell><Chip label={request.document_type} size="small" /></TableCell>
                                        <TableCell>{request.purpose || '-'}</TableCell>
                                        <TableCell>{request.request_date ? new Date(request.request_date).toLocaleDateString() : '-'}</TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={request.status || '-'} 
                                                color={getStatusColor(request.status)}
                                                variant="outlined"
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {request.payment_status === 'Paid' ? (
                                                <Chip label="Paid" color="success" size="small" />
                                            ) : (
                                                <Chip label="Unpaid" color="error" size="small" />
                                            )}
                                        </TableCell>
                                        <TableCell>₱{parseFloat(request.amount_paid || 0).toFixed(2)}</TableCell>
                                        <TableCell>
                                            <IconButton 
                                                size="small"
                                                onClick={() => handleEditRequest(request)}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton 
                                                size="small" 
                                                color="error"
                                                onClick={() => handleDeleteRequest(request.request_id)}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 3, color: '#64748b' }}>
                                        No requests found
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Container>

            {/* Create/Edit Request Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>{editingId ? 'Edit Request' : 'Create Document Request'}</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <FormControl fullWidth margin="normal" required>
                        <InputLabel>Requester Name</InputLabel>
                        <Select
                            value={formData.person_id}
                            onChange={(e) => setFormData({ ...formData, person_id: e.target.value })}
                            label="Requester Name"
                        >
                            <MenuItem value="">Select a person</MenuItem>
                            {persons.map((person) => (
                                <MenuItem key={person.person_id} value={person.person_id}>
                                    {`${person.first_name} ${person.last_name}`}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="normal" required>
                        <InputLabel>Document Type</InputLabel>
                        <Select
                            value={formData.document_type}
                            onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                            label="Document Type"
                        >
                            <MenuItem value="Baptismal Certificate">Baptismal Certificate</MenuItem>
                            <MenuItem value="Confirmation Certificate">Confirmation Certificate</MenuItem>
                            <MenuItem value="Marriage Certificate">Marriage Certificate</MenuItem>
                            <MenuItem value="Good Moral">Good Moral</MenuItem>
                            <MenuItem value="Death Certificate">Death Certificate</MenuItem>
                            <MenuItem value="Other">Other</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        label="Purpose"
                        value={formData.purpose}
                        onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                        margin="normal"
                    />
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Status</InputLabel>
                        <Select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            label="Status"
                        >
                            <MenuItem value="Pending">Pending</MenuItem>
                            <MenuItem value="Processing">Processing</MenuItem>
                            <MenuItem value="Ready for Pickup">Ready for Pickup</MenuItem>
                            <MenuItem value="Released">Released</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Payment Status</InputLabel>
                        <Select
                            value={formData.payment_status}
                            onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                            label="Payment Status"
                        >
                            <MenuItem value="Paid">Paid</MenuItem>
                            <MenuItem value="Unpaid">Unpaid</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        label="Amount Paid"
                        type="number"
                        value={formData.amount_paid}
                        onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })}
                        margin="normal"
                        inputProps={{ step: '0.01' }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleAddRequest} variant="contained">
                        {editingId ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default DocumentRequests;
