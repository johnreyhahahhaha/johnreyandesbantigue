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

const API_BASE_URL = 'http://localhost/josephus/st.joseph/public/api';

const ParishConfig = () => {
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
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Parish Configuration</Typography>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    Add Configuration
                </Button>
            </Box>

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={4}>
                            <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 1 }}>
                                <Typography color="textSecondary" gutterBottom>
                                    Total Configuration Keys
                                </Typography>
                                <Typography variant="h5">{configs.length}</Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
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
    );
};

export default ParishConfig;
