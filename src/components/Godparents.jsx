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
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    CircularProgress,
    Alert,
    Card,
    CardContent,
    Grid,
    Typography,
    IconButton,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import axios from 'axios';
import { usePermission } from '../contexts/PermissionContext';

const API_BASE_URL = 'http://165.22.181.147/api';

const Godparents = () => {
    const navigate = useNavigate();
    const { canCreate, canUpdate, canDelete } = usePermission();
    const [godparents, setGodparents] = useState([]);
    const [persons, setPersons] = useState([]);
    const [baptisms, setBaptisms] = useState([]);
    const [marriages, setMarriages] = useState([]);
    const [confirmations, setConfirmations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [openDialog, setOpenDialog] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        person_id: '',
        record_type: 'Baptismal',
        record_id: '',
        godparent_name: '',
    });
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [godparentsRes, personsRes, baptismRes, marriageRes, confirmationRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/godparents-records.php`),
                axios.get(`${API_BASE_URL}/persons.php`),
                axios.get(`${API_BASE_URL}/baptismal-records.php`),
                axios.get(`${API_BASE_URL}/marriage-records.php`),
                axios.get(`${API_BASE_URL}/confirmation-records.php`),
            ]);

            if (godparentsRes.data.success) {
                setGodparents(godparentsRes.data.data || []);
            }
            if (personsRes.data.success) {
                setPersons(personsRes.data.data || []);
            }
            if (baptismRes.data.success) {
                setBaptisms(baptismRes.data.data || []);
            }
            if (marriageRes.data.success) {
                setMarriages(marriageRes.data.data || []);
            }
            if (confirmationRes.data.success) {
                setConfirmations(confirmationRes.data.data || []);
            }
            setError('');
        } catch (err) {
            setError('Failed to fetch data: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (godparent = null) => {
        if (godparent) {
            setIsEditing(true);
            setEditingId(godparent.gp_id);
            setFormData({
                person_id: godparent.person_id || '',
                record_type: godparent.record_type || 'Baptismal',
                record_id: godparent.record_id || '',
                godparent_name: godparent.godparent_name || '',
            });
        } else {
            setIsEditing(false);
            setEditingId(null);
            setFormData({
                person_id: '',
                record_type: 'Baptismal',
                record_id: '',
                godparent_name: '',
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setFormData({
            person_id: '',
            record_type: 'Baptismal',
            record_id: '',
            godparent_name: '',
        });
    };

    const handleSave = async () => {
        if (!formData.godparent_name.trim()) {
            setError('Godparent name is required');
            return;
        }
        if (!formData.person_id) {
            setError('Person is required');
            return;
        }
        if (!formData.record_id) {
            setError('Record ID is required');
            return;
        }

        try {
            if (isEditing) {
                const response = await axios.put(`${API_BASE_URL}/godparents-records.php`, {
                    gp_id: editingId,
                    ...formData,
                });
                if (response.data.success) {
                    setSuccess('Godparent record updated successfully');
                    fetchAllData();
                    handleCloseDialog();
                } else {
                    setError(response.data.message || 'Failed to update godparent record');
                }
            } else {
                const response = await axios.post(`${API_BASE_URL}/godparents-records.php`, formData);
                if (response.data.success) {
                    setSuccess('Godparent record created successfully');
                    fetchAllData();
                    handleCloseDialog();
                } else {
                    setError(response.data.message || 'Failed to create godparent record');
                }
            }
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Error saving godparent record: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this godparent record?')) return;

        try {
            const response = await axios.delete(`${API_BASE_URL}/godparents-records.php`, {
                data: { gp_id: id },
            });
            if (response.data.success) {
                setSuccess('Godparent record deleted successfully');
                fetchAllData();
            } else {
                setError(response.data.message || 'Failed to delete godparent record');
            }
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Error deleting godparent record: ' + (err.response?.data?.message || err.message));
        }
    };

    const getPersonName = (personId) => {
        const person = persons.find(p => p.person_id == personId);
        return person ? `${person.first_name} ${person.last_name}` : 'N/A';
    };

    const getRecordLabel = (recordType, record) => {
        if (!record) return '';
        if (recordType === 'Baptismal') {
            return `${record.first_name || ''} ${record.last_name || ''}`.trim() + (record.baptism_date ? ` â€“ ${record.baptism_date}` : '');
        }
        if (recordType === 'Marriage') {
            const groom = `${record.groom_first || ''} ${record.groom_last || ''}`.trim();
            const bride = `${record.bride_first || ''} ${record.bride_last || ''}`.trim();
            const couple = groom && bride ? `${groom} & ${bride}` : `#${record.marriage_id}`;
            return couple + (record.marriage_date ? ` â€“ ${record.marriage_date}` : '');
        }
        if (recordType === 'Confirmation') {
            return `${record.first_name || ''} ${record.last_name || ''}`.trim() + (record.confirmation_date ? ` â€“ ${record.confirmation_date}` : '');
        }
        return '';
    };

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
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
                    <IconButton onClick={() => navigate('/dashboard')} aria-label="Back to dashboard" sx={{ backgroundColor: 'rgba(255,255,255,0.14)', color: 'white', '&:hover': { backgroundColor: 'rgba(255,255,255,0.24)' } }}><ArrowBackIcon /></IconButton>
                    <Box>
                        <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: '0.12em' }}>Parish records</Typography>
                        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, color: 'white', lineHeight: 1.15 }}>Godparents Records</Typography>
                    </Box>
                </Box>
                {canCreate('godparents_records') && <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()} sx={{ bgcolor: '#d6a85a', color: '#123b50', '&:hover': { bgcolor: '#e3ba70' }, boxShadow: 'none' }}>Add Godparent</Button>}
            </Box>
            </Container>
        </Box>
        <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Card sx={{ mb: 3, borderRadius: 3, border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)' }}>
                <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={4}>
                            <Box sx={{ p: 2, bgcolor: '#e5f3f6', borderTop: '3px solid #168fa3', borderRadius: 2 }}>
                                <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700 }}>
                                    Total Godparent Records
                                </Typography>
                                <Typography variant="h5">{godparents.length}</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <Box sx={{ p: 2, bgcolor: '#f3e5f5', borderRadius: 1 }}>
                                <Typography color="textSecondary" gutterBottom>
                                    Baptismal Godparents
                                </Typography>
                                <Typography variant="h5">{godparents.filter(g => g.record_type === 'Baptismal').length}</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <Box sx={{ p: 2, bgcolor: '#e8f5e9', borderRadius: 1 }}>
                                <Typography color="textSecondary" gutterBottom>
                                    Other Records
                                </Typography>
                                <Typography variant="h5">{godparents.filter(g => g.record_type !== 'Baptismal').length}</Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)', overflow: 'auto' }}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Person</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Godparent Name</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Record Type</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Record ID</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {godparents.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                                    <Typography color="textSecondary">No godparent records found</Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            godparents.map((godparent) => (
                                <TableRow key={godparent.gp_id} hover>
                                    <TableCell>{getPersonName(godparent.person_id)}</TableCell>
                                    <TableCell>{godparent.godparent_name}</TableCell>
                                    <TableCell>{godparent.record_type}</TableCell>
                                    <TableCell>{godparent.record_id || 'N/A'}</TableCell>
                                    <TableCell align="center">
                                        {canUpdate('godparents_records') && (
                                            <IconButton
                                                size="small"
                                                color="primary"
                                                onClick={() => handleOpenDialog(godparent)}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        )}
                                        {canDelete('godparents_records') && (
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => handleDelete(godparent.gp_id)}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 'bold' }}>
                    {isEditing ? 'Edit Godparent Record' : 'Add New Godparent Record'}
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Person</InputLabel>
                        <Select
                            value={formData.person_id}
                            label="Person"
                            onChange={(e) => setFormData({ ...formData, person_id: e.target.value })}
                        >
                            {persons.map((person) => (
                                <MenuItem key={person.person_id} value={person.person_id}>
                                    {person.first_name} {person.last_name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        label="Godparent Name"
                        value={formData.godparent_name}
                        onChange={(e) => setFormData({ ...formData, godparent_name: e.target.value })}
                        sx={{ mb: 2 }}
                    />
                    <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Record Type</InputLabel>
                        <Select
                            value={formData.record_type}
                            label="Record Type"
                            onChange={(e) => setFormData({ ...formData, record_type: e.target.value, record_id: '' })}
                        >
                            <MenuItem value="Baptismal">Baptismal</MenuItem>
                            <MenuItem value="Confirmation">Confirmation</MenuItem>
                            <MenuItem value="Marriage">Marriage</MenuItem>
                        </Select>
                    </FormControl>
                    {formData.record_type === 'Baptismal' ? (
                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>Related {formData.record_type} Record</InputLabel>
                            <Select
                                value={formData.record_id}
                                label={`Related ${formData.record_type} Record`}
                                onChange={(e) => setFormData({ ...formData, record_id: e.target.value })}
                            >
                                <MenuItem value=""><em>None</em></MenuItem>
                                {baptisms.map((record) => (
                                    <MenuItem key={record.baptism_id} value={record.baptism_id}>
                                        {getRecordLabel('Baptismal', record)}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    ) : (
                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>Related {formData.record_type} Record</InputLabel>
                            <Select
                                value={formData.record_id}
                                label={`Related ${formData.record_type} Record`}
                                onChange={(e) => setFormData({ ...formData, record_id: e.target.value })}
                            >
                                <MenuItem value=""><em>None</em></MenuItem>
                                {formData.record_type === 'Confirmation' && confirmations.map((record) => (
                                    <MenuItem key={record.confirmation_id} value={record.confirmation_id}>
                                        {getRecordLabel('Confirmation', record)}
                                    </MenuItem>
                                ))}
                                {formData.record_type === 'Marriage' && marriages.map((record) => (
                                    <MenuItem key={record.marriage_id} value={record.marriage_id}>
                                        {getRecordLabel('Marriage', record)}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained" color="primary">
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
        </Box>
    );
};

export default Godparents;
