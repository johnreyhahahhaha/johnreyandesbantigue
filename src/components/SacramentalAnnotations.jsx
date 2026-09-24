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
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import axios from 'axios';
import { usePermission } from '../contexts/PermissionContext';

const API_BASE_URL = 'http://165.22.181.147/api';

const SacramentalAnnotations = () => {
    const navigate = useNavigate();
    const { canCreate, canUpdate, canDelete } = usePermission();
    const [annotations, setAnnotations] = useState([]);
    const [persons, setPersons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [formData, setFormData] = useState({
        person_id: '',
        annotation_text: '',
    });
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        fetchAnnotations();
        fetchPersons();
    }, []);

    const fetchAnnotations = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/sacramental-annotations.php`);
            if (response.data.success) {
                setAnnotations(response.data.data);
                setError('');
            }
        } catch (err) {
            setError('Error fetching sacramental annotations');
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
            annotation_text: '',
        });
        setEditingId(null);
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
    };

    const handleOpenEditDialog = (annotation) => {
        setFormData({
            person_id: annotation.person_id,
            annotation_text: annotation.annotation_text,
        });
        setEditingId(annotation.annotation_id);
        setOpenEditDialog(true);
    };

    const handleCloseEditDialog = () => {
        setOpenEditDialog(false);
    };

    const handleAddAnnotation = async () => {
        if (!formData.person_id || !formData.annotation_text) {
            setError('Please fill in all required fields');
            return;
        }

        try {
            const response = await axios.post(`${API_BASE_URL}/sacramental-annotations.php`, formData);
            if (response.data.success) {
                setSuccess('Sacramental annotation created successfully');
                fetchAnnotations();
                handleCloseDialog();
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error creating sacramental annotation');
        }
    };

    const handleUpdateAnnotation = async () => {
        try {
            const response = await axios.put(
                `${API_BASE_URL}/sacramental-annotations.php?id=${editingId}`,
                formData
            );
            if (response.data.success) {
                setSuccess('Sacramental annotation updated successfully');
                fetchAnnotations();
                handleCloseEditDialog();
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error updating sacramental annotation');
        }
    };

    const handleDeleteAnnotation = async (annotationId) => {
        if (window.confirm('Are you sure you want to delete this sacramental annotation?')) {
            try {
                const response = await axios.delete(`${API_BASE_URL}/sacramental-annotations.php?id=${annotationId}`);
                if (response.data.success) {
                    setSuccess('Sacramental annotation deleted successfully');
                    fetchAnnotations();
                    setTimeout(() => setSuccess(''), 3000);
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Error deleting sacramental annotation');
            }
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
                        <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: '0.12em' }}>Parish records</Typography>
                        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, color: 'white', lineHeight: 1.15 }}>Sacramental Annotations</Typography>
                    </Box>
                </Box>
                {canCreate('sacramental_annotations') && <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenDialog} sx={{ bgcolor: '#d6a85a', color: '#123b50', '&:hover': { bgcolor: '#e3ba70' }, boxShadow: 'none' }}>Add Annotation</Button>}
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
                                    Total Annotations
                                </Typography>
                                <Typography variant="h5">{annotations.length}</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <Box sx={{ p: 2, bgcolor: '#f1e9f6', borderTop: '3px solid #7d6acb', borderRadius: 2 }}>
                                <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700 }}>
                                    Unique Persons
                                </Typography>
                                <Typography variant="h5">
                                    {new Set(annotations.map(a => a.person_id)).size}
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)', overflow: 'auto' }}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f1f6f5' }}>
                        <TableRow>
                            <TableCell><strong>Annotation ID</strong></TableCell>
                            <TableCell><strong>Person</strong></TableCell>
                            <TableCell><strong>Annotation</strong></TableCell>
                            <TableCell><strong>Date Recorded</strong></TableCell>
                            <TableCell align="center"><strong>Actions</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {annotations.length > 0 ? (
                            annotations.map((annotation) => (
                                <TableRow key={annotation.annotation_id} hover>
                                    <TableCell>{annotation.annotation_id}</TableCell>
                                    <TableCell>{annotation.first_name} {annotation.last_name}</TableCell>
                                    <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {annotation.annotation_text}
                                    </TableCell>
                                    <TableCell>{new Date(annotation.date_recorded).toLocaleDateString()}</TableCell>
                                    <TableCell align="center">
                                        {canUpdate('sacramental_annotations') && (
                                            <IconButton
                                                color="primary"
                                                size="small"
                                                onClick={() => handleOpenEditDialog(annotation)}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        )}
                                        {canDelete('sacramental_annotations') && (
                                            <IconButton
                                                color="error"
                                                size="small"
                                                onClick={() => handleDeleteAnnotation(annotation.annotation_id)}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                                    No sacramental annotations found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Add Sacramental Annotation</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <FormControl fullWidth margin="normal" required>
                        <InputLabel>Person</InputLabel>
                        <Select
                            value={formData.person_id}
                            onChange={(e) => setFormData({ ...formData, person_id: e.target.value })}
                            label="Person"
                        >
                            <MenuItem value="">Select a person</MenuItem>
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
                        label="Annotation"
                        value={formData.annotation_text}
                        onChange={(e) => setFormData({ ...formData, annotation_text: e.target.value })}
                        multiline
                        rows={4}
                        required
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleAddAnnotation} variant="contained" color="primary">
                        Add
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openEditDialog} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Edit Sacramental Annotation</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Annotation"
                        value={formData.annotation_text}
                        onChange={(e) => setFormData({ ...formData, annotation_text: e.target.value })}
                        multiline
                        rows={4}
                        required
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseEditDialog}>Cancel</Button>
                    <Button onClick={handleUpdateAnnotation} variant="contained" color="primary">
                        Update
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
        </Box>
    );
};

export default SacramentalAnnotations;
