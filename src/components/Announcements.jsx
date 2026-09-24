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
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import axios from 'axios';
import { usePermission } from '../contexts/PermissionContext';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = 'http://165.22.181.147/api';

const Announcements = () => {
    const navigate = useNavigate();
    const { canCreate, canDelete, canUpdate } = usePermission();
    const { user } = useAuth();
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        category: 'General',
        status: 'Active',
    });

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/announcements.php`);
            if (response.data.success) {
                setAnnouncements(response.data.data || []);
                setError('');
            } else {
                setError(response.data.message || 'Failed to fetch announcements');
            }
        } catch (err) {
            setError('Error fetching announcements: ' + err.message);
            console.error('Full error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (item = null) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                title: item.title || '',
                content: item.content || '',
                category: item.category || 'General',
                status: item.status || 'Active',
            });
        } else {
            setEditingItem(null);
            setFormData({
                title: '',
                content: '',
                category: 'General',
                status: 'Active',
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingItem(null);
        setFormData({
            title: '',
            content: '',
            category: 'General',
            status: 'Active',
        });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (!formData.title.trim()) {
            setError('Title is required');
            return;
        }
        if (!formData.content.trim()) {
            setError('Content is required');
            return;
        }

        try {
            if (editingItem) {
                // Update
                const response = await axios.put(`${API_BASE_URL}/announcements.php`, {
                    announcement_id: editingItem.announcement_id,
                    ...formData
                });
                if (response.data.success) {
                    setSuccess('Announcement updated successfully');
                    fetchAnnouncements();
                    handleCloseDialog();
                } else {
                    setError(response.data.message || 'Failed to update announcement');
                }
            } else {
                // Create
                const response = await axios.post(`${API_BASE_URL}/announcements.php`, formData);
                if (response.data.success) {
                    setSuccess('Announcement created successfully');
                    fetchAnnouncements();
                    handleCloseDialog();
                } else {
                    setError(response.data.message || 'Failed to create announcement');
                }
            }
        } catch (err) {
            setError('Error saving announcement: ' + err.message);
            console.error('Full error:', err);
        }
    };

    const handleDelete = async (announcementId) => {
        if (!window.confirm('Are you sure you want to delete this announcement?')) {
            return;
        }

        try {
            const response = await axios.delete(`${API_BASE_URL}/announcements.php`, {
                data: { announcement_id: announcementId }
            });
            if (response.data.success) {
                setSuccess('Announcement deleted successfully');
                fetchAnnouncements();
            } else {
                setError(response.data.message || 'Failed to delete announcement');
            }
        } catch (err) {
            setError('Error deleting announcement: ' + err.message);
        }
    };

    const filteredAnnouncements = announcements.filter(item =>
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase())
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
        <Box sx={{ minHeight: '100vh', bgcolor: '#edf3f1' }}>
        <Box sx={{ py: { xs: 2.5, md: 3 }, background: 'linear-gradient(110deg, #123b50 0%, #0b6b68 70%, #d1a557 155%)', boxShadow: '0 12px 26px rgba(13, 70, 76, 0.14)' }}>
            <Container maxWidth="lg">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <IconButton onClick={() => navigate('/dashboard')} aria-label="Back to dashboard" sx={{ backgroundColor: 'rgba(255,255,255,0.14)', color: 'white', '&:hover': { backgroundColor: 'rgba(255,255,255,0.24)' } }}><ArrowBackIcon /></IconButton>
                    <Box>
                        <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: '0.12em' }}>Parish communication</Typography>
                        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, color: 'white', lineHeight: 1.15 }}>Announcements</Typography>
                    </Box>
                </Box>
                {canCreate && <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()} sx={{ bgcolor: '#d6a85a', color: '#123b50', '&:hover': { bgcolor: '#e3ba70' }, boxShadow: 'none' }}>New Announcement</Button>}
            </Box>
            </Container>
        </Box>
        <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
            <Box sx={{ mb: 3 }}>
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
                    <Card sx={{ borderRadius: 3, border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)' }}>
                        <CardContent sx={{ p: 2.5 }}>
                            <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700 }}>
                                Total Announcements
                            </Typography>
                            <Typography variant="h5">
                                {announcements.length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ borderRadius: 3, border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)' }}>
                        <CardContent sx={{ p: 2.5 }}>
                            <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700 }}>
                                Active
                            </Typography>
                            <Typography variant="h5">
                                {announcements.filter(a => a.status === 'Active').length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Search and Add Button */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2.5, p: 2, borderRadius: 2.5, bgcolor: '#ffffff', border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 5px 16px rgba(26, 67, 74, 0.05)', flexWrap: 'wrap' }}>
                <TextField
                    placeholder="Search announcements..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    size="small"
                    sx={{ flex: 1, minWidth: '200px' }}
                />
            </Box>

            {/* Announcements Table */}
            <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)', overflow: 'auto' }}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f1f6f5' }}>
                        <TableRow>
                            <TableCell>Title</TableCell>
                            <TableCell>Category</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredAnnouncements.length > 0 ? (
                            filteredAnnouncements.map((announcement) => (
                                <TableRow key={announcement.announcement_id}>
                                    <TableCell>{announcement.title}</TableCell>
                                    <TableCell>
                                        <Chip label={announcement.category} size="small" />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={announcement.status}
                                            size="small"
                                            color={announcement.status === 'Active' ? 'success' : 'default'}
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {announcement.created_at ? new Date(announcement.created_at).toLocaleDateString() : '-'}
                                    </TableCell>
                                    <TableCell align="right">
                                        {canUpdate && (
                                            <IconButton
                                                size="small"
                                                onClick={() => handleOpenDialog(announcement)}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        )}
                                        {canDelete && (
                                            <IconButton
                                                size="small"
                                                onClick={() => handleDelete(announcement.announcement_id)}
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
                                    No announcements found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Add/Edit Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingItem ? 'Edit Announcement' : 'New Announcement'}
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <TextField
                        fullWidth
                        label="Title"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        margin="normal"
                        required
                    />
                    <TextField
                        fullWidth
                        label="Content"
                        name="content"
                        value={formData.content}
                        onChange={handleInputChange}
                        margin="normal"
                        multiline
                        rows={4}
                        required
                    />
                    <TextField
                        fullWidth
                        select
                        label="Category"
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        margin="normal"
                        SelectProps={{
                            native: true,
                        }}
                    >
                        <option value="General">General</option>
                        <option value="Event">Event</option>
                        <option value="Emergency">Emergency</option>
                        <option value="Scheduling">Scheduling</option>
                        <option value="Maintenance">Maintenance</option>
                    </TextField>
                    <TextField
                        fullWidth
                        select
                        label="Status"
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        margin="normal"
                        SelectProps={{
                            native: true,
                        }}
                    >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Archived">Archived</option>
                    </TextField>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained">
                        {editingItem ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
        </Box>
    );
};

export default Announcements;
