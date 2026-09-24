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
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = 'http://165.22.181.147/api';

const ParishConfig = () => {
    const navigate = useNavigate();
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [formData, setFormData] = useState({
        config_key: '',
        config_value: '',
    });
    const [editingKey, setEditingKey] = useState(null);

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/parish-config.php`);
            if (response.data.success) {
                setConfigs(response.data.data);
                setError('');
            }
        } catch (err) {
            setError('Error fetching parish configuration');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (config = null) => {
        if (config) {
            setFormData({
                config_key: config.config_key,
                config_value: config.config_value,
            });
            setEditingKey(config.config_key);
        } else {
            setFormData({
                config_key: '',
                config_value: '',
            });
            setEditingKey(null);
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
    };

    const handleSaveConfig = async () => {
        if (!formData.config_key || !formData.config_value) {
            setError('Please fill in all required fields');
            return;
        }

        try {
            const response = await axios.post(`${API_BASE_URL}/parish-config.php`, formData);
            if (response.data.success) {
                setSuccess(editingKey ? 'Configuration updated successfully' : 'Configuration added successfully');
                fetchConfigs();
                handleCloseDialog();
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error saving configuration');
        }
    };

    const handleDeleteConfig = async (configKey) => {
        if (window.confirm('Are you sure you want to delete this configuration?')) {
            try {
                const response = await axios.delete(`${API_BASE_URL}/parish-config.php?key=${configKey}`);
                if (response.data.success) {
                    setSuccess('Configuration deleted successfully');
                    fetchConfigs();
                    setTimeout(() => setSuccess(''), 3000);
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Error deleting configuration');
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
                        <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: '0.12em' }}>
                            Parish settings
                        </Typography>
                        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, color: 'white', lineHeight: 1.15 }}>
                            Parish Configuration
                        </Typography>
                    </Box>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()} sx={{ bgcolor: '#d6a85a', color: '#123b50', '&:hover': { bgcolor: '#e3ba70' }, boxShadow: 'none' }}>
                    Add Configuration
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
                        <Grid item xs={12} sm={6} md={4}>
                            <Box sx={{ p: 2, bgcolor: '#e5f3f6', borderTop: '3px solid #168fa3', borderRadius: 2 }}>
                                <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700 }}>
                                    Total Configuration Keys
                                </Typography>
                                <Typography variant="h5">{configs.length}</Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)', overflow: 'auto' }}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f1f6f5' }}>
                        <TableRow>
                            <TableCell><strong>Configuration Key</strong></TableCell>
                            <TableCell><strong>Value</strong></TableCell>
                            <TableCell align="center"><strong>Actions</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {configs.length > 0 ? (
                            configs.map((config) => (
                                <TableRow key={config.config_key} hover>
                                    <TableCell sx={{ fontFamily: 'monospace' }}>{config.config_key}</TableCell>
                                    <TableCell sx={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {config.config_value}
                                    </TableCell>
                                    <TableCell align="center">
                                        <IconButton
                                            color="primary"
                                            size="small"
                                            onClick={() => handleOpenDialog(config)}
                                        >
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton
                                            color="error"
                                            size="small"
                                            onClick={() => handleDeleteConfig(config.config_key)}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                                    No configurations found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingKey ? 'Edit Configuration' : 'Add Configuration'}
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Configuration Key"
                        placeholder="e.g., parish_name"
                        value={formData.config_key}
                        onChange={(e) => setFormData({ ...formData, config_key: e.target.value })}
                        disabled={!!editingKey}
                        required
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Configuration Value"
                        placeholder="e.g., St. Joseph Parish"
                        value={formData.config_value}
                        onChange={(e) => setFormData({ ...formData, config_value: e.target.value })}
                        multiline
                        rows={4}
                        required
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSaveConfig} variant="contained" color="primary">
                        {editingKey ? 'Update' : 'Add'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
        </Box>
    );
};

export default ParishConfig;
