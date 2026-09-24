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

const SeminarTypes = () => {
    const { canCreate, canDelete, canUpdate } = usePermission();
    const [seminarTypes, setSeminarTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        seminar_name: '',
        description: '',
        duration_days: '',
        max_attendees: '',
    });

    useEffect(() => {
        fetchSeminarTypes();
    }, []);

    const fetchSeminarTypes = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/seminar-types.php`);
            if (response.data.success) {
                setSeminarTypes(response.data.data || []);
                setError('');
            } else {
                setError(response.data.message || 'Failed to fetch seminar types');
            }
        } catch (err) {
            setError('Error fetching seminar types: ' + err.message);
            console.error('Full error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (item = null) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                seminar_name: item.seminar_name || '',
                description: item.description || '',
                duration_days: item.duration_days || '',
                max_attendees: item.max_attendees || '',
            });
        } else {
            setEditingItem(null);
            setFormData({
                seminar_name: '',
                description: '',
                duration_days: '',
                max_attendees: '',
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingItem(null);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (!formData.seminar_name.trim()) {
            setError('Seminar name is required');
            return;
        }

        try {
            if (editingItem) {
                const response = await axios.put(`${API_BASE_URL}/seminar-types.php`, {
                    seminar_type_id: editingItem.seminar_type_id,
                    ...formData,
                });
                if (response.data.success) {
                    setSuccess('Seminar type updated successfully');
                    fetchSeminarTypes();
                    handleCloseDialog();
                } else {
                    setError(response.data.message || 'Failed to update seminar type');
                }
            } else {
                const response = await axios.post(`${API_BASE_URL}/seminar-types.php`, formData);
                if (response.data.success) {
                    setSuccess('Seminar type created successfully');
                    fetchSeminarTypes();
                    handleCloseDialog();
                } else {
                    setError(response.data.message || 'Failed to create seminar type');
                }
            }
        } catch (err) {
            setError('Error saving seminar type: ' + err.message);
            console.error('Full error:', err);
        }
    };

    const handleDelete = async (seminarTypeId) => {
        if (!window.confirm('Are you sure you want to delete this seminar type?')) {
            return;
        }

        try {
            const response = await axios.delete(`${API_BASE_URL}/seminar-types.php`, {
                data: { seminar_type_id: seminarTypeId }
            });
            if (response.data.success) {
                setSuccess('Seminar type deleted successfully');
                fetchSeminarTypes();
            } else {
                setError(response.data.message || 'Failed to delete seminar type');
            }
        } catch (err) {
            setError('Error deleting seminar type: ' + err.message);
        }
    };

    const filteredTypes = seminarTypes.filter(item =>
        item.seminar_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                    Seminar Types
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
                                Total Seminar Types
                            </Typography>
                            <Typography variant="h5">
                                {seminarTypes.length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Search and Add Button */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <TextField
                    placeholder="Search seminar types..."
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
                        New Seminar Type
                    </Button>
                )}
            </Box>

            {/* Seminar Types Table */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Seminar Name</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell>Duration (Days)</TableCell>
                            <TableCell>Max Attendees</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredTypes.length > 0 ? (
                            filteredTypes.map((type) => (
                                <TableRow key={type.seminar_type_id}>
                                    <TableCell sx={{ fontWeight: 500 }}>
                                        {type.seminar_name}
                                    </TableCell>
                                    <TableCell>{type.description || '-'}</TableCell>
                                    <TableCell>{type.duration_days || '-'}</TableCell>
                                    <TableCell>{type.max_attendees || '-'}</TableCell>
                                    <TableCell align="right">
                                        {canUpdate && (
                                            <IconButton
                                                size="small"
                                                onClick={() => handleOpenDialog(type)}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        )}
                                        {canDelete && (
                                            <IconButton
                                                size="small"
                                                onClick={() => handleDelete(type.seminar_type_id)}
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
                                <TableCell colSpan={5} align="center">
                                    No seminar types found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Add/Edit Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingItem ? 'Edit Seminar Type' : 'New Seminar Type'}
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <TextField
                        fullWidth
                        label="Seminar Name"
                        name="seminar_name"
                        value={formData.seminar_name}
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
                        label="Duration (Days)"
                        name="duration_days"
                        type="number"
                        value={formData.duration_days}
                        onChange={handleInputChange}
                        margin="normal"
                    />
                    <TextField
                        fullWidth
                        label="Max Attendees"
                        name="max_attendees"
                        type="number"
                        value={formData.max_attendees}
                        onChange={handleInputChange}
                        margin="normal"
                    />
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

export default SeminarTypes;
