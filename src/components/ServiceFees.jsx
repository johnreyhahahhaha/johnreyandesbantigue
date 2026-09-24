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
    CircularProgress,
    Alert,
    Typography,
    IconButton,
    Card,
    CardContent,
    Grid,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import axios from 'axios';
import { usePermission } from '../contexts/PermissionContext';

const API_BASE_URL = 'http://165.22.181.147/api';

const ServiceFees = () => {
    const { canCreate, canDelete, canUpdate } = usePermission();
    const [fees, setFees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        service_name: '',
        description: '',
        amount: '',
        service_type: 'General',
        is_active: 1,
    });

    useEffect(() => {
        fetchFees();
    }, []);

    const fetchFees = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/service-fees.php`);
            if (response.data.success) {
                setFees(response.data.data || []);
                setError('');
            } else {
                setError(response.data.message || 'Failed to fetch service fees');
            }
        } catch (err) {
            setError('Error fetching service fees: ' + err.message);
            console.error('Full error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (item = null) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                service_name: item.service_name || '',
                description: item.description || '',
                amount: item.amount || '',
                service_type: item.service_type || 'General',
                is_active: item.is_active || 1,
            });
        } else {
            setEditingItem(null);
            setFormData({
                service_name: '',
                description: '',
                amount: '',
                service_type: 'General',
                is_active: 1,
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingItem(null);
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (checked ? 1 : 0) : value
        }));
    };

    const handleSave = async () => {
        if (!formData.service_name.trim()) {
            setError('Service name is required');
            return;
        }
        if (!formData.amount) {
            setError('Amount is required');
            return;
        }

        try {
            if (editingItem) {
                const response = await axios.put(`${API_BASE_URL}/service-fees.php`, {
                    fee_id: editingItem.fee_id,
                    ...formData,
                });
                if (response.data.success) {
                    setSuccess('Service fee updated successfully');
                    fetchFees();
                    handleCloseDialog();
                } else {
                    setError(response.data.message || 'Failed to update service fee');
                }
            } else {
                const response = await axios.post(`${API_BASE_URL}/service-fees.php`, formData);
                if (response.data.success) {
                    setSuccess('Service fee created successfully');
                    fetchFees();
                    handleCloseDialog();
                } else {
                    setError(response.data.message || 'Failed to create service fee');
                }
            }
        } catch (err) {
            setError('Error saving service fee: ' + err.message);
            console.error('Full error:', err);
        }
    };

    const handleDelete = async (feeId) => {
        if (!window.confirm('Are you sure you want to delete this service fee?')) {
            return;
        }

        try {
            const response = await axios.delete(`${API_BASE_URL}/service-fees.php`, {
                data: { fee_id: feeId }
            });
            if (response.data.success) {
                setSuccess('Service fee deleted successfully');
                fetchFees();
            } else {
                setError(response.data.message || 'Failed to delete service fee');
            }
        } catch (err) {
            setError('Error deleting service fee: ' + err.message);
        }
    };

    const filteredFees = fees.filter(item =>
        item.service_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.service_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalAmount = fees.reduce((sum, fee) => sum + (parseFloat(fee.amount) || 0), 0);
    const activeFees = fees.filter(f => f.is_active === 1).length;

    if (loading) {
        return (
            <Container>
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                    <CircularProgress />
                </Box>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>
                    Service Fees
                </Typography>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                        {error}
                    </Alert>
                )}
                {success && (
                    <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
                        {success}
                    </Alert>
                )}
            </Box>

            {/* Statistics Cards */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Total Services
                            </Typography>
                            <Typography variant="h5">
                                {fees.length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Active Services
                            </Typography>
                            <Typography variant="h5">
                                {activeFees}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Total Value
                            </Typography>
                            <Typography variant="h5">
                                â‚±{totalAmount.toFixed(2)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Search and Add Button */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <TextField
                    placeholder="Search service fees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    size="small"
                    sx={{ flex: 1, minWidth: '200px' }}
                />
                {canCreate && (
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog()}
                    >
                        New Service Fee
                    </Button>
                )}
            </Box>

            {/* Service Fees Table */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Service Name</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell align="right">Amount</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredFees.length > 0 ? (
                            filteredFees.map((fee) => (
                                <TableRow key={fee.fee_id}>
                                    <TableCell sx={{ fontWeight: 500 }}>
                                        {fee.service_name}
                                    </TableCell>
                                    <TableCell>{fee.service_type || '-'}</TableCell>
                                    <TableCell>{fee.description || '-'}</TableCell>
                                    <TableCell align="right">
                                        â‚±{parseFloat(fee.amount || 0).toFixed(2)}
                                    </TableCell>
                                    <TableCell>
                                        <span style={{
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            backgroundColor: fee.is_active === 1 ? '#e8f5e9' : '#ffebee',
                                            color: fee.is_active === 1 ? '#2e7d32' : '#c62828',
                                            fontSize: '0.875rem',
                                        }}>
                                            {fee.is_active === 1 ? 'Active' : 'Inactive'}
                                        </span>
                                    </TableCell>
                                    <TableCell align="right">
                                        {canUpdate && (
                                            <IconButton
                                                size="small"
                                                onClick={() => handleOpenDialog(fee)}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        )}
                                        {canDelete && (
                                            <IconButton
                                                size="small"
                                                onClick={() => handleDelete(fee.fee_id)}
                                                color="error"
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    No service fees found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Add/Edit Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingItem ? 'Edit Service Fee' : 'New Service Fee'}
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <TextField
                        fullWidth
                        label="Service Name"
                        name="service_name"
                        value={formData.service_name}
                        onChange={handleInputChange}
                        margin="normal"
                        required
                    />
                    <TextField
                        fullWidth
                        label="Description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        margin="normal"
                        multiline
                        rows={3}
                    />
                    <TextField
                        fullWidth
                        select
                        label="Service Type"
                        name="service_type"
                        value={formData.service_type}
                        onChange={handleInputChange}
                        margin="normal"
                        SelectProps={{
                            native: true,
                        }}
                    >
                        <option value="General">General</option>
                        <option value="Cemetery">Cemetery</option>
                        <option value="Document">Document</option>
                        <option value="Sacrament">Sacrament</option>
                        <option value="Event">Event</option>
                    </TextField>
                    <TextField
                        fullWidth
                        label="Amount"
                        name="amount"
                        type="number"
                        inputProps={{ step: '0.01', min: '0' }}
                        value={formData.amount}
                        onChange={handleInputChange}
                        margin="normal"
                        required
                    />
                    <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TextField
                            type="checkbox"
                            name="is_active"
                            checked={formData.is_active === 1}
                            onChange={handleInputChange}
                        />
                        <Typography variant="body2">
                            Active
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained">
                        {editingItem ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default ServiceFees;
