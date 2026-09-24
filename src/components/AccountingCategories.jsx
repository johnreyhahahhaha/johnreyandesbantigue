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
    Chip,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import axios from 'axios';
import { usePermission } from '../contexts/PermissionContext';

const API_BASE_URL = 'http://165.22.181.147/api';

const AccountingCategories = () => {
    const navigate = useNavigate();
    const { canCreate, canUpdate, canDelete } = usePermission();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [openDialog, setOpenDialog] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        cat_name: '',
        type: 'Revenue',
    });
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/accounting-categories.php`);
            if (response.data.success) {
                setCategories(response.data.data || []);
            }
            setError('');
        } catch (err) {
            setError('Failed to fetch categories: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (category = null) => {
        if (category) {
            setIsEditing(true);
            setEditingId(category.cat_id);
            setFormData({
                cat_name: category.cat_name,
                type: category.type,
            });
        } else {
            setIsEditing(false);
            setEditingId(null);
            setFormData({
                cat_name: '',
                type: 'Revenue',
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setFormData({ cat_name: '', type: 'Revenue' });
    };

    const handleSave = async () => {
        if (!formData.cat_name.trim()) {
            setError('Category name is required');
            return;
        }

        try {
            if (isEditing) {
                const response = await axios.put(`${API_BASE_URL}/accounting-categories.php`, {
                    cat_id: editingId,
                    ...formData,
                });
                if (response.data.success) {
                    setSuccess('Category updated successfully');
                    fetchCategories();
                    handleCloseDialog();
                } else {
                    setError(response.data.message || 'Failed to update category');
                }
            } else {
                const response = await axios.post(`${API_BASE_URL}/accounting-categories.php`, formData);
                if (response.data.success) {
                    setSuccess('Category created successfully');
                    fetchCategories();
                    handleCloseDialog();
                } else {
                    setError(response.data.message || 'Failed to create category');
                }
            }
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Error saving category: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this category?')) return;

        try {
            const response = await axios.delete(`${API_BASE_URL}/accounting-categories.php`, {
                data: { cat_id: id },
            });
            if (response.data.success) {
                setSuccess('Category deleted successfully');
                fetchCategories();
            } else {
                setError(response.data.message || 'Failed to delete category');
            }
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Error deleting category: ' + (err.response?.data?.message || err.message));
        }
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
                            <IconButton onClick={() => navigate('/dashboard')} aria-label="Back to dashboard" sx={{ backgroundColor: 'rgba(255,255,255,0.14)', color: 'white', '&:hover': { backgroundColor: 'rgba(255,255,255,0.24)' } }}>
                                <ArrowBackIcon />
                            </IconButton>
                            <Box>
                                <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: '0.12em' }}>
                                    Financial setup
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 800, color: 'white', lineHeight: 1.15 }}>
                                    Accounting categories
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.78)', mt: 0.5 }}>
                                    Keep income and expense classifications organized.
                                </Typography>
                            </Box>
                        </Box>
                        {canCreate('accounting_categories') && (
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => handleOpenDialog()}
                                sx={{ bgcolor: '#d6a85a', color: '#123b50', '&:hover': { bgcolor: '#e3ba70' }, boxShadow: 'none' }}
                            >
                                Add Category
                            </Button>
                        )}
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
                                    Total Categories
                                </Typography>
                                <Typography variant="h5">{categories.length}</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <Box sx={{ p: 2, bgcolor: '#e8f4ec', borderTop: '3px solid #25a878', borderRadius: 2 }}>
                                <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700 }}>
                                    Income Categories
                                </Typography>
                                <Typography variant="h5">{categories.filter(c => c.type === 'Revenue').length}</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <Box sx={{ p: 2, bgcolor: '#fff4df', borderTop: '3px solid #d49347', borderRadius: 2 }}>
                                <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700 }}>
                                    Expense Categories
                                </Typography>
                                <Typography variant="h5">{categories.filter(c => c.type === 'Expense').length}</Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)', overflow: 'hidden' }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Category Name</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {categories.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                                    <Typography color="textSecondary">No categories found</Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            categories.map((category) => (
                                <TableRow key={category.cat_id} hover>
                                    <TableCell sx={{ fontWeight: 700, color: '#123b50' }}>{category.cat_name}</TableCell>
                                    <TableCell><Chip label={category.type === 'Revenue' ? 'Income' : category.type} size="small" sx={{ bgcolor: category.type === 'Revenue' ? '#e8f4ec' : '#fff4df', color: category.type === 'Revenue' ? '#187b59' : '#a76a1e', fontWeight: 700 }} /></TableCell>
                                    <TableCell align="center">
                                        {canUpdate('accounting_categories') && (
                                            <IconButton
                                                size="small"
                                                color="primary"
                                                onClick={() => handleOpenDialog(category)}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        )}
                                        {canDelete('accounting_categories') && (
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => handleDelete(category.cat_id)}
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
                    {isEditing ? 'Edit Accounting Category' : 'Add New Accounting Category'}
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <TextField
                        fullWidth
                        label="Category Name"
                        value={formData.cat_name}
                        onChange={(e) => setFormData({ ...formData, cat_name: e.target.value })}
                        sx={{ mb: 2 }}
                    />
                    <FormControl fullWidth>
                        <InputLabel>Type</InputLabel>
                        <Select
                            value={formData.type}
                            label="Type"
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        >
                            <MenuItem value="Revenue">Revenue</MenuItem>
                            <MenuItem value="Expense">Expense</MenuItem>
                        </Select>
                    </FormControl>
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

export default AccountingCategories;
