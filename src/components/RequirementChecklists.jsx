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
    Checkbox,
    FormControlLabel,
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

const RequirementChecklists = () => {
    const [checklists, setChecklists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [formData, setFormData] = useState({
        category: 'Baptism',
        requirement_name: '',
        is_submitted: false,
        date_submitted: '',
        baptism_id: '',
        marriage_id: '',
        confirmation_id: '',
    });
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        fetchChecklists();
    }, []);

    const fetchChecklists = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/requirement-checklists.php`);
            if (response.data.success) {
                setChecklists(response.data.data);
                setError('');
            }
        } catch (err) {
            setError('Error fetching requirement checklists');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = () => {
        setFormData({
            category: 'Baptism',
            requirement_name: '',
            is_submitted: false,
            date_submitted: '',
            baptism_id: '',
            marriage_id: '',
            confirmation_id: '',
        });
        setEditingId(null);
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
    };

    const handleOpenEditDialog = (checklist) => {
        setFormData({
            category: checklist.category,
            requirement_name: checklist.requirement_name,
            is_submitted: !!checklist.is_submitted,
            date_submitted: checklist.date_submitted ? checklist.date_submitted.split(' ')[0] : '',
            baptism_id: checklist.baptism_id || '',
            marriage_id: checklist.marriage_id || '',
            confirmation_id: checklist.confirmation_id || '',
        });
        setEditingId(checklist.check_id);
        setOpenEditDialog(true);
    };

    const handleCloseEditDialog = () => {
        setOpenEditDialog(false);
    };

    const handleAddChecklist = async () => {
        if (!formData.requirement_name) {
            setError('Please fill in all required fields');
            return;
        }

        try {
            const response = await axios.post(`${API_BASE_URL}/requirement-checklists.php`, formData);
            if (response.data.success) {
                setSuccess('Requirement checklist created successfully');
                fetchChecklists();
                handleCloseDialog();
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error creating requirement checklist');
        }
    };

    const handleUpdateChecklist = async () => {
        try {
            const response = await axios.put(
                `${API_BASE_URL}/requirement-checklists.php?id=${editingId}`,
                formData
            );
            if (response.data.success) {
                setSuccess('Requirement checklist updated successfully');
                fetchChecklists();
                handleCloseEditDialog();
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error updating requirement checklist');
        }
    };

    const handleDeleteChecklist = async (checkId) => {
        if (window.confirm('Are you sure you want to delete this requirement checklist?')) {
            try {
                const response = await axios.delete(`${API_BASE_URL}/requirement-checklists.php?id=${checkId}`);
                if (response.data.success) {
                    setSuccess('Requirement checklist deleted successfully');
                    fetchChecklists();
                    setTimeout(() => setSuccess(''), 3000);
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Error deleting requirement checklist');
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

    const baptismChecklists = checklists.filter(c => c.category === 'Baptism');
    const marriageChecklists = checklists.filter(c => c.category === 'Marriage');
    const confirmationChecklists = checklists.filter(c => c.category === 'Confirmation');

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Requirement Checklists</Typography>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={handleOpenDialog}
                >
                    Add Checklist
                </Button>
            </Box>

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 1 }}>
                                <Typography color="textSecondary" gutterBottom>
                                    Total Items
                                </Typography>
                                <Typography variant="h5">{checklists.length}</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Box sx={{ p: 2, bgcolor: '#f3e5f5', borderRadius: 1 }}>
                                <Typography color="textSecondary" gutterBottom>
                                    Baptism Items
                                </Typography>
                                <Typography variant="h5">{baptismChecklists.length}</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Box sx={{ p: 2, bgcolor: '#e8f5e9', borderRadius: 1 }}>
                                <Typography color="textSecondary" gutterBottom>
                                    Marriage Items
                                </Typography>
                                <Typography variant="h5">{marriageChecklists.length}</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Box sx={{ p: 2, bgcolor: '#fff3e0', borderRadius: 1 }}>
                                <Typography color="textSecondary" gutterBottom>
                                    Confirmation Items
                                </Typography>
                                <Typography variant="h5">{confirmationChecklists.length}</Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell><strong>Check ID</strong></TableCell>
                            <TableCell><strong>Category</strong></TableCell>
                            <TableCell><strong>Requirement</strong></TableCell>
                            <TableCell><strong>Submitted</strong></TableCell>
                            <TableCell><strong>Date Submitted</strong></TableCell>
                            <TableCell align="center"><strong>Actions</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {checklists.length > 0 ? (
                            checklists.map((checklist) => (
                                <TableRow key={checklist.check_id} hover>
                                    <TableCell>{checklist.check_id}</TableCell>
                                    <TableCell>{checklist.category}</TableCell>
                                    <TableCell>{checklist.requirement_name}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={checklist.is_submitted ? 'Yes' : 'No'}
                                            color={checklist.is_submitted ? 'success' : 'default'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {checklist.date_submitted ? new Date(checklist.date_submitted).toLocaleDateString() : '-'}
                                    </TableCell>
                                    <TableCell align="center">
                                        <IconButton
                                            color="primary"
                                            size="small"
                                            onClick={() => handleOpenEditDialog(checklist)}
                                        >
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton
                                            color="error"
                                            size="small"
                                            onClick={() => handleDeleteChecklist(checklist.check_id)}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                    No requirement checklists found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Add Requirement Checklist</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Category</InputLabel>
                        <Select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            label="Category"
                        >
                            <MenuItem value="Baptism">Baptism</MenuItem>
                            <MenuItem value="Marriage">Marriage</MenuItem>
                            <MenuItem value="Confirmation">Confirmation</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Requirement Name"
                        value={formData.requirement_name}
                        onChange={(e) => setFormData({ ...formData, requirement_name: e.target.value })}
                        required
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Related Record ID"
                        type="number"
                        value={formData[`${formData.category.toLowerCase()}_id`]}
                        onChange={(e) => {
                            const key = `${formData.category.toLowerCase()}_id`;
                            setFormData({ ...formData, [key]: e.target.value });
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleAddChecklist} variant="contained" color="primary">
                        Add
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openEditDialog} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Edit Requirement Checklist</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={formData.is_submitted}
                                onChange={(e) => setFormData({ ...formData, is_submitted: e.target.checked })}
                            />
                        }
                        label="Mark as Submitted"
                    />
                    {formData.is_submitted && (
                        <TextField
                            fullWidth
                            margin="normal"
                            label="Date Submitted"
                            type="date"
                            value={formData.date_submitted}
                            onChange={(e) => setFormData({ ...formData, date_submitted: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseEditDialog}>Cancel</Button>
                    <Button onClick={handleUpdateChecklist} variant="contained" color="primary">
                        Update
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default RequirementChecklists;
