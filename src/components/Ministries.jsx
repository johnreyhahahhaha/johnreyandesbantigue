import React, { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Card,
    CardContent,
    Grid,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    CircularProgress,
    Alert,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { usePermission } from '../contexts/PermissionContext';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = 'http://165.22.181.147/api';

const Ministries = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { canCreate, canDelete, canUpdate } = usePermission();
    const [ministries, setMinistries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [joinedMinistryIds, setJoinedMinistryIds] = useState([]);
    const [formData, setFormData] = useState({
        ministry_name: '',
    });
    const isPersonView = user?.user_role === 'Person';

    useEffect(() => {
        fetchMinistries();
    }, [user?.user_id, user?.user_role]);

    const fetchMinistries = async () => {
        setLoading(true);
        try {
            const [ministriesRes, volunteersRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/ministries.php`),
                axios.get(`${API_BASE_URL}/community.php?type=volunteers`),
            ]);

            if (ministriesRes.data.success) {
                setMinistries(ministriesRes.data.data || []);
            }

            if (isPersonView && user?.person_id) {
                const volunteerData = volunteersRes.data.success ? volunteersRes.data.data || [] : [];
                const joinedIds = volunteerData
                    .filter((vol) => Number(vol.person_id) === Number(user.person_id))
                    .map((vol) => Number(vol.ministry_id));
                setJoinedMinistryIds(joinedIds);
            } else {
                setJoinedMinistryIds([]);
            }

            setError('');
        } catch (error) {
            setError('Error fetching ministries: ' + (error.response?.data?.message || error.message));
            console.error('Full error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (ministry = null) => {
        if (ministry) {
            setEditingItem(ministry);
            setFormData({
                ministry_name: ministry.ministry_name || '',
            });
        } else {
            setEditingItem(null);
            setFormData({
                ministry_name: '',
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
        if (!formData.ministry_name.trim()) {
            setError('Ministry name is required');
            return;
        }

        try {
            if (editingItem) {
                const response = await axios.put(`${API_BASE_URL}/ministries.php`, {
                    ministry_id: editingItem.ministry_id,
                    ministry_name: formData.ministry_name,
                });
                if (response.data.success) {
                    setSuccess('Ministry updated successfully');
                    fetchMinistries();
                    handleCloseDialog();
                } else {
                    setError(response.data.message || 'Failed to update ministry');
                }
            } else {
                const response = await axios.post(`${API_BASE_URL}/ministries.php`, {
                    ministry_name: formData.ministry_name,
                });
                if (response.data.success) {
                    setSuccess('Ministry created successfully');
                    fetchMinistries();
                    handleCloseDialog();
                } else {
                    setError(response.data.message || 'Failed to create ministry');
                }
            }
        } catch (err) {
            setError('Error saving ministry: ' + err.message);
            console.error('Full error:', err);
        }
    };

    const handleDelete = async (ministryId) => {
        if (!window.confirm('Are you sure you want to delete this ministry?')) {
            return;
        }

        try {
            const response = await axios.delete(`${API_BASE_URL}/ministries.php`, {
                data: { ministry_id: ministryId }
            });
            if (response.data.success) {
                setSuccess('Ministry deleted successfully');
                fetchMinistries();
            } else {
                setError(response.data.message || 'Failed to delete ministry');
            }
        } catch (err) {
            setError('Error deleting ministry: ' + err.message);
        }
    };

    const handleJoinMinistry = async (ministry) => {
        if (!user?.person_id) {
            setError('Please log in to join a ministry.');
            return;
        }

        try {
            const response = await axios.post(`${API_BASE_URL}/community.php?type=volunteers`, {
                person_id: user.person_id,
                ministry_id: ministry.ministry_id,
                role: 'Member',
                date_joined: new Date().toISOString().split('T')[0],
                status: 'Active',
            });

            if (response.data.success) {
                setJoinedMinistryIds(prev => [...new Set([...prev, Number(ministry.ministry_id)])]);
                setSuccess(`You have joined ${ministry.ministry_name}. Parish records have been updated.`);
                setError('');
                fetchMinistries();
            } else {
                setError(response.data.message || 'Failed to join ministry.');
            }
        } catch (err) {
            console.error('Failed to join ministry:', err);
            setError('Error joining ministry: ' + (err.response?.data?.message || err.message));
        }
    };

    const filteredMinistries = ministries.filter(item =>
        item.ministry_name?.toLowerCase().includes(searchTerm.toLowerCase())
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

    if (isPersonView) {
        return (
            <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', py: 4 }}>
                <Container maxWidth="lg">
                    <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <IconButton onClick={() => navigate('/person-dashboard')} sx={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
                            <ArrowBackIcon />
                        </IconButton>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>Ministries</Typography>
                            <Typography variant="body2" sx={{ color: '#64748b' }}>Available ministries and service opportunities in the parish.</Typography>
                        </Box>
                    </Box>

                    {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
                    {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} md={6}>
                            <Card sx={{ borderRadius: 3, border: '1px solid rgba(148, 163, 184, 0.18)' }}>
                                <CardContent>
                                    <Typography color="textSecondary" gutterBottom>Total Ministries</Typography>
                                    <Typography variant="h5" sx={{ color: '#1e3a8a', fontWeight: 700 }}>{ministries.length}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Card sx={{ borderRadius: 3, border: '1px solid rgba(148, 163, 184, 0.18)' }}>
                                <CardContent>
                                    <Typography color="textSecondary" gutterBottom>My Involvement</Typography>
                                    <Typography variant="h5" sx={{ color: '#059669', fontWeight: 700 }}>{joinedMinistryIds.length}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    <Box sx={{ mb: 3 }}>
                        <TextField
                            fullWidth
                            placeholder="Search ministries..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            size="small"
                            variant="outlined"
                            sx={{ backgroundColor: '#ffffff' }}
                        />
                    </Box>

                    <Box sx={{ display: 'grid', gap: 2 }}>
                        {filteredMinistries.length > 0 ? (
                            filteredMinistries.map((ministry) => {
                                const joined = joinedMinistryIds.includes(Number(ministry.ministry_id));
                                return (
                                    <Paper key={ministry.ministry_id} elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid rgba(148, 163, 184, 0.2)', backgroundColor: '#ffffff' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                                            <Box>
                                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>{ministry.ministry_name}</Typography>
                                                <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                                                    {Number(ministry.volunteer_count || 0)} active volunteers
                                                </Typography>
                                            </Box>
                                            <Chip
                                                label={joined ? 'Joined' : 'Open'}
                                                size="small"
                                                sx={{
                                                    bgcolor: joined ? '#d1fae5' : '#e0f2fe',
                                                    color: joined ? '#166534' : '#075985',
                                                    fontWeight: 700,
                                                }}
                                            />
                                        </Box>
                                        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                                            <Button
                                                variant={joined ? 'outlined' : 'contained'}
                                                onClick={() => handleJoinMinistry(ministry)}
                                                disabled={joined}
                                                sx={{
                                                    backgroundColor: joined ? 'transparent' : '#1e3a8a',
                                                    borderColor: joined ? '#cbd5e1' : '#1e3a8a',
                                                    color: joined ? '#475569' : '#ffffff',
                                                    '&:hover': { backgroundColor: joined ? '#f8fafc' : '#1e40af' },
                                                }}
                                            >
                                                {joined ? 'Joined' : 'Join Ministry'}
                                            </Button>
                                        </Box>
                                    </Paper>
                                );
                            })
                        ) : (
                            <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: 3, border: '1px solid rgba(148, 163, 184, 0.2)' }}>
                                <Typography variant="body1" sx={{ color: '#475569' }}>No ministries found.</Typography>
                            </Paper>
                        )}
                    </Box>
                </Container>
            </Box>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        Ministries
                    </Typography>
                    {canCreate && (
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => handleOpenDialog()}
                        >
                            New Ministry
                        </Button>
                    )}
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

            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Total Ministries
                            </Typography>
                            <Typography variant="h5" sx={{ color: '#1e3a8a', fontWeight: 700 }}>
                                {ministries.length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Box sx={{ mb: 3 }}>
                <TextField
                    fullWidth
                    placeholder="Search ministries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    size="small"
                    variant="outlined"
                />
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                            <TableCell sx={{ fontWeight: 700 }}>Ministry Name</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Volunteers</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredMinistries.length > 0 ? (
                            filteredMinistries.map((ministry) => (
                                <TableRow key={ministry.ministry_id}>
                                    <TableCell sx={{ fontWeight: 600 }}>
                                        {ministry.ministry_name}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={ministry.volunteer_count || 0}
                                            size="small"
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        {canUpdate && (
                                            <IconButton
                                                size="small"
                                                onClick={() => handleOpenDialog(ministry)}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        )}
                                        {canDelete && (
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => handleDelete(ministry.ministry_id)}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={3} align="center" sx={{ py: 3, color: '#64748b' }}>
                                    No ministries found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingItem ? 'Edit Ministry' : 'New Ministry'}
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <TextField
                        fullWidth
                        label="Ministry Name"
                        name="ministry_name"
                        value={formData.ministry_name}
                        onChange={handleInputChange}
                        margin="normal"
                        required
                        placeholder="e.g., Music Ministry, Youth Group"
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

export default Ministries;