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
    CircularProgress,
    Alert,
    Typography,
    IconButton,
    Card,
    CardContent,
    Grid,
    Chip,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, Group as GroupIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import axios from 'axios';
import { usePermission } from '../contexts/PermissionContext';

const API_BASE_URL = 'http://localhost/josephus/st.joseph/public/api';

const Households = () => {
    const navigate = useNavigate();
    const { canCreate, canDelete, canUpdate } = usePermission();
    const [households, setHouseholds] = useState([]);
    const [persons, setPersons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        household_name: '',
        address: '',
        barangay_area: '',
        contact_number: '',
        head_person_id: '',
    });
    const [openMembersDialog, setOpenMembersDialog] = useState(false);
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [selectedHouseholdName, setSelectedHouseholdName] = useState('');

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [householdsRes, personsRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/households.php`),
                axios.get(`${API_BASE_URL}/persons.php`),
            ]);

            if (householdsRes.data.success) {
                setHouseholds(householdsRes.data.data || []);
            }
            if (personsRes.data.success) {
                setPersons(personsRes.data.data || []);
            }
            setError('');
        } catch (err) {
            setError('Error fetching data: ' + err.message);
            console.error('Full error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (item = null) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                household_name: item.household_name || '',
                address: item.address || '',
                barangay_area: item.barangay_area || '',
                contact_number: item.contact_number || '',
                head_person_id: item.head_person_id || '',
            });
        } else {
            setEditingItem(null);
            setFormData({
                household_name: '',
                address: '',
                barangay_area: '',
                contact_number: '',
                head_person_id: '',
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
        if (!formData.household_name.trim()) {
            setError('Household name is required');
            return;
        }

        try {
            if (editingItem) {
                const response = await axios.put(`${API_BASE_URL}/households.php`, {
                    household_id: editingItem.household_id,
                    ...formData,
                    head_person_id: formData.head_person_id || null,
                });
                if (response.data.success) {
                    setSuccess('Household updated successfully');
                    fetchAllData();
                    handleCloseDialog();
                } else {
                    setError(response.data.message || 'Failed to update household');
                }
            } else {
                const response = await axios.post(`${API_BASE_URL}/households.php`, {
                    ...formData,
                    head_person_id: formData.head_person_id || null,
                });
                if (response.data.success) {
                    setSuccess('Household created successfully');
                    fetchAllData();
                    handleCloseDialog();
                } else {
                    setError(response.data.message || 'Failed to create household');
                }
            }
        } catch (err) {
            setError('Error saving household: ' + err.message);
            console.error('Full error:', err);
        }
    };

    const handleDelete = async (householdId) => {
        if (!window.confirm('Are you sure you want to delete this household?')) {
            return;
        }

        try {
            const response = await axios.delete(`${API_BASE_URL}/households.php`, {
                data: { household_id: householdId }
            });
            if (response.data.success) {
                setSuccess('Household deleted successfully');
                fetchAllData();
            } else {
                setError(response.data.message || 'Failed to delete household');
            }
        } catch (err) {
            setError('Error deleting household: ' + err.message);
        }
    };

    const getHeadPersonName = (personId) => {
        if (!personId) return '-';
        const person = persons.find(p => p.person_id == personId);
        return person ? `${person.first_name} ${person.last_name}` : '-';
    };

    const getHouseholdMembers = (householdId) => {
        return persons.filter(p => p.household_id == householdId).length;
    };

    const filteredHouseholds = households.filter(item =>
        item.household_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.barangay_area?.toLowerCase().includes(searchTerm.toLowerCase())
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <IconButton
                        onClick={() => navigate('/dashboard')}
                        sx={{
                            backgroundColor: '#f5f5f5',
                            '&:hover': {
                                backgroundColor: '#e0e0e0',
                            },
                        }}
                    >
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        Households
                    </Typography>
                </Box>
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
                                Total Households
                            </Typography>
                            <Typography variant="h5">
                                {households.length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Total Members
                            </Typography>
                            <Typography variant="h5">
                                {persons.length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Search and Add Button */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <TextField
                    placeholder="Search households..."
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
                        New Household
                    </Button>
                )}
            </Box>

            {/* Households Table */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Household Name</TableCell>
                            <TableCell>Head of Household</TableCell>
                            <TableCell>Members</TableCell>
                            <TableCell>Address</TableCell>
                            <TableCell>Barangay</TableCell>
                            <TableCell>Contact</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredHouseholds.length > 0 ? (
                            filteredHouseholds.map((household) => (
                                <TableRow key={household.household_id}>
                                    <TableCell sx={{ fontWeight: 500 }}>
                                        {household.household_name}
                                    </TableCell>
                                    <TableCell>
                                        {getHeadPersonName(household.head_person_id)}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            size="small"
                                            icon={<GroupIcon />}
                                            label={getHouseholdMembers(household.household_id)}
                                            clickable
                                            onClick={() => {
                                                const members = persons.filter(p => p.household_id == household.household_id);
                                                setSelectedMembers(members);
                                                setSelectedHouseholdName(household.household_name || '');
                                                setOpenMembersDialog(true);
                                            }}
                                            sx={{ cursor: 'pointer' }}
                                            aria-label={`View members of ${household.household_name || ''}`}
                                        />
                                    </TableCell>
                                    <TableCell>{household.address || '-'}</TableCell>
                                    <TableCell>{household.barangay_area || '-'}</TableCell>
                                    <TableCell>{household.contact_number || '-'}</TableCell>
                                    <TableCell align="right">
                                        {canUpdate && (
                                            <IconButton
                                                size="small"
                                                onClick={() => handleOpenDialog(household)}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        )}
                                        {canDelete && (
                                            <IconButton
                                                size="small"
                                                onClick={() => handleDelete(household.household_id)}
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
                                <TableCell colSpan={7} align="center">
                                    No households found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Add/Edit Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingItem ? 'Edit Household' : 'New Household'}
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <TextField
                        fullWidth
                        label="Household Name"
                        name="household_name"
                        value={formData.household_name}
                        onChange={handleInputChange}
                        margin="normal"
                        required
                    />
                    <TextField
                        fullWidth
                        label="Address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        margin="normal"
                    />
                    <TextField
                        fullWidth
                        label="Barangay/Area"
                        name="barangay_area"
                        value={formData.barangay_area}
                        onChange={handleInputChange}
                        margin="normal"
                    />
                    <TextField
                        fullWidth
                        label="Contact Number"
                        name="contact_number"
                        value={formData.contact_number}
                        onChange={handleInputChange}
                        margin="normal"
                    />
                    <TextField
                        fullWidth
                        select
                        label="Head of Household"
                        name="head_person_id"
                        value={formData.head_person_id}
                        onChange={handleInputChange}
                        margin="normal"
                        SelectProps={{
                            native: true,
                        }}
                    >
                        <option value="">-- Select Person --</option>
                        {persons.map((person) => (
                            <option key={person.person_id} value={person.person_id}>
                                {person.first_name} {person.last_name}
                            </option>
                        ))}
                    </TextField>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained">
                        {editingItem ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Members Dialog */}
            <Dialog open={openMembersDialog} onClose={() => setOpenMembersDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Members â€” {selectedHouseholdName || ''}</DialogTitle>
                <DialogContent dividers>
                    {selectedMembers && selectedMembers.length > 0 ? (
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Contact</TableCell>
                                    <TableCell>Household ID</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {selectedMembers.map((m) => (
                                    <TableRow key={m.person_id} hover>
                                        <TableCell>{m.first_name} {m.middle_name || ''} {m.last_name}</TableCell>
                                        <TableCell>{m.contact_no || '-'}</TableCell>
                                        <TableCell>{m.household_id || '-'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <Typography>No members assigned to this household.</Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenMembersDialog(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default Households;
