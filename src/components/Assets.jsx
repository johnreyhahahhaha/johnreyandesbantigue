import React, { useState, useEffect } from 'react';

import { useNavigate, useLocation } from 'react-router-dom';
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
    Typography,
    Chip,
    IconButton,
    Card,
    CardContent,
    Grid,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import axios from 'axios';
import { usePermission } from '../contexts/PermissionContext';

const API_BASE_URL = 'http://165.22.181.147/api';

const Assets = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { canCreate, canUpdate, canDelete } = usePermission();
    const [assets, setAssets] = useState([]);
    const [maintenance, setMaintenance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openMaintenanceDialog, setOpenMaintenanceDialog] = useState(false);
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [selectedAssetId, setSelectedAssetId] = useState(null);
    const [formData, setFormData] = useState({
        item_name: '',
        category: 'Furniture',
        status: 'Good',
        acquisition_date: new Date().toISOString().split('T')[0],
        value: ''
    });
    const [maintenanceData, setMaintenanceData] = useState({
        maintenance_date: new Date().toISOString().split('T')[0],
        description: '',
        cost: '',
        next_schedule: '',
    });
    const [editingMaintenanceId, setEditingMaintenanceId] = useState(null); // track maintenance edits

    // pagination/search state
    const [page, setPage] = useState(0);             // zero-based for MUI
    const [perPage, setPerPage] = useState(20);
    const [totalAssets, setTotalAssets] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // when the location.search changes (back/forward or manual) update filters
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const p = parseInt(params.get('page') || '1', 10) - 1;
        const pp = parseInt(params.get('per_page') || '20', 10);
        const s = params.get('search') || '';
        const st = params.get('status') || '';
        setPage(p >= 0 ? p : 0);
        setPerPage(pp);
        setSearchTerm(s);
        setStatusFilter(st);
        fetchAllData();
    }, [location.search]);

    const updateUrl = (newPage, newPerPage, newSearch, newStatus) => {
        const params = new URLSearchParams();
        params.append('page', newPage + 1);
        params.append('per_page', newPerPage);
        if (newSearch) params.append('search', newSearch);
        if (newStatus) params.append('status', newStatus);
        navigate({ search: params.toString() }, { replace: false });
    };

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', page + 1);
            params.append('per_page', perPage);
            if (searchTerm) params.append('search', searchTerm);
            if (statusFilter) params.append('status', statusFilter);

            const [assetsRes, maintenanceRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/assets.php?` + params.toString()),
                axios.get(`${API_BASE_URL}/assets.php?type=maintenance`),
            ]);

            const assetsData = assetsRes.data.success ? assetsRes.data.data || [] : [];
            const maintenanceData = maintenanceRes.data.success ? maintenanceRes.data.data || [] : [];
            const total = assetsRes.data.total || 0;

            setAssets(assetsData);
            setMaintenance(maintenanceData);
            setTotalAssets(total);
            setError('');
        } catch (err) {
            setError('Error fetching data: ' + (err.response?.data?.message || err.message));
            setAssets([]);
            setMaintenance([]);
            setTotalAssets(0);
        } finally {
            setLoading(false);
        }
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
        updateUrl(newPage, perPage, searchTerm, statusFilter);
    };

    const handleChangeRowsPerPage = (event) => {
        const newPer = parseInt(event.target.value, 10);
        setPerPage(newPer);
        setPage(0);
        updateUrl(0, newPer, searchTerm, statusFilter);
    };

    const handleSearch = (e) => {
        const term = e.target.value;
        setSearchTerm(term);
        setPage(0);
        updateUrl(0, perPage, term, statusFilter);
    };

    const handleStatusFilter = (e) => {
        const st = e.target.value;
        setStatusFilter(st);
        setPage(0);
        updateUrl(0, perPage, searchTerm, st);
    };

    const getMaintenanceHistory = (assetId) => {
        return maintenance.filter(m => m.asset_id === assetId);
    };

    const getAssetStatus = (status) => {
        const colors = {
            'Good': 'success',
            'Under Repair': 'warning',
            'For Disposal': 'error',
        };
        return colors[status] || 'default';
    };

    const handleAddAsset = async () => {
        if (!formData.item_name || !formData.value) {
            setError('Please fill all required fields');
            return;
        }
        try {
            const endpoint = editingId 
                ? `${API_BASE_URL}/assets.php?id=${editingId}` 
                : `${API_BASE_URL}/assets.php`;
            const method = editingId ? 'put' : 'post';
            
            const response = await axios[method](endpoint, formData);

            if (response.data.success) {
                setOpenDialog(false);
                setEditingId(null);
                setFormData({
                    item_name: '',
                    category: 'Furniture',
                    status: 'Good',
                    acquisition_date: new Date().toISOString().split('T')[0],
                    value: ''
                });
                fetchAllData();
            } else {
                setError('Failed to save asset');
            }
        } catch (err) {
            setError('Error saving asset: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleAddMaintenance = async () => {
        if (!selectedAssetId || !maintenanceData.description || !maintenanceData.cost) {
            setError('Please fill all required fields');
            return;
        }
        try {
            let response;
            if (editingMaintenanceId) {
                response = await axios.put(`${API_BASE_URL}/assets.php?type=maintenance`, {
                    maint_id: editingMaintenanceId,
                    asset_id: selectedAssetId,
                    maintenance_date: maintenanceData.maintenance_date,
                    description: maintenanceData.description,
                    cost: parseFloat(maintenanceData.cost),
                    next_schedule: maintenanceData.next_schedule || null,
                });
            } else {
                response = await axios.post(`${API_BASE_URL}/assets.php?type=maintenance`, {
                    asset_id: selectedAssetId,
                    maintenance_date: maintenanceData.maintenance_date,
                    description: maintenanceData.description,
                    cost: parseFloat(maintenanceData.cost),
                    next_schedule: maintenanceData.next_schedule || null,
                });
            }

            if (response.data.success) {
                setOpenMaintenanceDialog(false);
                setSelectedAssetId(null);
                setEditingMaintenanceId(null);
                setMaintenanceData({
                    maintenance_date: new Date().toISOString().split('T')[0],
                    description: '',
                    cost: '',
                    next_schedule: '',
                });
                fetchAllData();
            } else {
                setError(editingMaintenanceId ? 'Failed to update maintenance record' : 'Failed to add maintenance record');
            }
        } catch (err) {
            setError('Error saving maintenance: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleDeleteAsset = async (assetId) => {
        if (window.confirm('Delete this asset?')) {
            try {
                const response = await axios.delete(`${API_BASE_URL}/assets.php?id=${assetId}`);
                if (response.data.success) {
                    fetchAllData();
                } else {
                    setError('Failed to delete asset');
                }
            } catch (err) {
                setError('Error deleting asset: ' + err.message);
            }
        }
    };

    const handleEditMaintenance = (record) => {
        setEditingMaintenanceId(record.maint_id);
        setSelectedAssetId(record.asset_id);
        setMaintenanceData({
            maintenance_date: record.maintenance_date,
            description: record.description,
            cost: record.cost,
        });
        setOpenMaintenanceDialog(true);
    };

    const handleDeleteMaintenance = async (maintId) => {
        if (window.confirm('Delete this maintenance record?')) {
            try {
                const response = await axios.delete(`${API_BASE_URL}/assets.php?type=maintenance&id=${maintId}`);
                if (response.data.success) {
                    fetchAllData();
                } else {
                    setError('Failed to delete maintenance record');
                }
            } catch (err) {
                setError('Error deleting maintenance: ' + err.message);
            }
        }
    };

    const handleEditAsset = (asset) => {
        setEditingId(asset.asset_id);
        setFormData({
            item_name: asset.item_name,
            category: asset.category,
            status: asset.status,
            acquisition_date: asset.acquisition_date,
            value: asset.value,
        });
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingId(null);
        setFormData({
            item_name: '',
            category: 'Furniture',
            status: 'Good',
            acquisition_date: new Date().toISOString().split('T')[0],
            value: '',
        });
    };

    const handleCloseMaintenanceDialog = () => {
        setOpenMaintenanceDialog(false);
        setSelectedAssetId(null);
        setEditingMaintenanceId(null);
        setMaintenanceData({
            maintenance_date: new Date().toISOString().split('T')[0],
            description: '',
            cost: '',
        });
    };

    if (loading) {
        return <CircularProgress />;
    }

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#edf3f1' }}>
            {/* Header Section */}
            <Box sx={{ py: { xs: 2.5, md: 3 }, background: 'linear-gradient(110deg, #123b50 0%, #0b6b68 70%, #d1a557 155%)', boxShadow: '0 12px 26px rgba(13, 70, 76, 0.14)' }}>
                <Container maxWidth="lg">
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <IconButton onClick={() => navigate('/dashboard')} aria-label="Back to dashboard" sx={{ backgroundColor: 'rgba(255,255,255,0.14)', color: 'white', '&:hover': { backgroundColor: 'rgba(255,255,255,0.24)' } }}>
                                <ArrowBackIcon />
                            </IconButton>
                            <Box>
                            <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: '0.12em' }}>
                                Stewardship workspace
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 800, color: 'white', mb: 0.5, lineHeight: 1.15 }}>
                                Parish inventory
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.78)' }}>
                                Property, equipment, and maintenance in one view.
                            </Typography>
                            </Box>
                        </Box>
                        {canCreate('assets') && (
                            <Button 
                                variant="contained" 
                                startIcon={<AddIcon />}
                                onClick={() => setOpenDialog(true)}
                                sx={{ backgroundColor: '#d6a85a', color: '#123b50', '&:hover': { backgroundColor: '#e3ba70' }, boxShadow: 'none' }}
                            >
                                Add Inventory
                            </Button>
                        )}
                    </Box>
                </Container>
            </Box>

            {/* Content Section */}
            <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                {/* search and filter bar */}
                <Box sx={{ mb: 2.5, p: 2, borderRadius: 2.5, bgcolor: '#ffffff', border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 5px 16px rgba(26, 67, 74, 0.05)', display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <TextField
                        size="small"
                        placeholder="Search assets..."
                        value={searchTerm}
                        onChange={handleSearch}
                        onKeyDown={(e) => { if (e.key === 'Enter') fetchAllData(); }}
                        InputProps={{ endAdornment: (
                            <Button onClick={() => fetchAllData()} sx={{ color: '#0b6b68', fontWeight: 800 }}>Go</Button>
                        )}}
                    />
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Status</InputLabel>
                        <Select
                            value={statusFilter}
                            label="Status"
                            onChange={handleStatusFilter}
                        >
                            <MenuItem value="">All</MenuItem>
                            <MenuItem value="Good">Good</MenuItem>
                            <MenuItem value="Under Repair">Under Repair</MenuItem>
                            <MenuItem value="For Disposal">For Disposal</MenuItem>
                        </Select>
                    </FormControl>
                </Box>

                {/* Summary Cards */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={4}>
                        <Card sx={{ borderTop: '3px solid #7d6acb' }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700 }}>
                                    Total Assets
                                </Typography>
                                <Typography variant="h5" sx={{ color: '#8b5cf6', fontWeight: 700 }}>
                                    {totalAssets}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <Card sx={{ borderTop: '3px solid #25a878' }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700 }}>
                                    Good Condition
                                </Typography>
                                <Typography variant="h5" sx={{ color: '#059669', fontWeight: 700 }}>
                                    {assets.filter(a => a.status === 'Good').length}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <Card sx={{ borderTop: '3px solid #d49347' }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700 }}>
                                    Under Repair
                                </Typography>
                                <Typography variant="h5" sx={{ color: '#f59e0b', fontWeight: 700 }}>
                                    {assets.filter(a => a.status === 'Under Repair').length}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                <TableContainer component={Paper} sx={{ backgroundColor: '#fff', borderRadius: 3, overflow: 'auto', border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)' }}>
                    <Table sx={{ minWidth: 750 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Item Name</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Category</TableCell>
                                                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Acquisition Date</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Value</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Maintenance</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {assets && assets.length > 0 ? (
                                assets.map((asset) => {
                                    const history = getMaintenanceHistory(asset.asset_id);
                                    return (
                                        <React.Fragment key={asset.asset_id}>
                                            <TableRow 
                                                sx={{
                                                    '&:nth-of-type(odd)': { backgroundColor: '#f8fafc' },
                                                    '&:hover': { backgroundColor: '#f1f5f9' },
                                                }}
                                            >
                                                <TableCell sx={{ fontWeight: 700, color: '#123b50' }}>{asset.item_name}</TableCell>
                                                <TableCell><Chip label={asset.category} size="small" /></TableCell>
                                                <TableCell>{asset.acquisition_date}</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>â‚±{parseFloat(asset.value).toFixed(2)}</TableCell>
                                                <TableCell>
                                                    <Chip 
                                                        label={asset.status} 
                                                        color={getAssetStatus(asset.status)}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                        <Typography variant="body2" sx={{ fontSize: '0.82rem', color: '#56716f', fontWeight: 600 }}>
                                                        {history.length} records
                                                    </Typography>
                                                    <Button 
                                                        size="small"
                                                        onClick={() => {
                                                            setSelectedAssetId(asset.asset_id);
                                                            setOpenMaintenanceDialog(true);
                                                        }}
                                                        sx={{ mt: 0.5, color: '#0b6b68', fontWeight: 700 }}
                                                    >
                                                        Add
                                                    </Button>
                                                </TableCell>
                                                <TableCell>
                                                    {canUpdate('assets') && (
                                                        <IconButton 
                                                            size="small"
                                                            onClick={() => handleEditAsset(asset)}
                                                        >
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                    )}
                                                    {canDelete('assets') && (
                                                        <IconButton 
                                                            size="small" 
                                                            color="error"
                                                            onClick={() => handleDeleteAsset(asset.asset_id)}
                                                        >
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                            {history.length > 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={8} sx={{ backgroundColor: '#f0f7f4', py: 1.5, px: 2.5, borderTop: '1px solid #dce9e5' }}>
                                                        <Typography variant="subtitle2" sx={{ mb: 1, color: '#123b50', fontWeight: 800 }}>Maintenance history</Typography>
                                                        <Table size="small">
                                                            <TableHead>
                                                                <TableRow>
                                                                    <TableCell>Date</TableCell>
                                                                    <TableCell>Description</TableCell>
                                                                    <TableCell>Cost</TableCell>
                                                                    <TableCell>Next Schedule</TableCell>
                                                                    <TableCell>Actions</TableCell>
                                                                </TableRow>
                                                            </TableHead>
                                                            <TableBody>
                                                                {history.map((h) => (
                                                                    <TableRow key={h.maint_id}>
                                                                        <TableCell>{h.maintenance_date}</TableCell>
                                                                        <TableCell>{h.description}</TableCell>
                                                                        <TableCell>â‚±{parseFloat(h.cost).toFixed(2)}</TableCell>
                                                                        <TableCell>{h.next_schedule || '-'}</TableCell>
                                                                        <TableCell>
                                                                            <IconButton size="small" onClick={() => handleEditMaintenance(h)}>
                                                                                <EditIcon fontSize="small" />
                                                                            </IconButton>
                                                                            <IconButton size="small" color="error" onClick={() => handleDeleteMaintenance(h.maint_id)}>
                                                                                <DeleteIcon fontSize="small" />
                                                                            </IconButton>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 3, color: '#64748b' }}>
                                        No Inventory found
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Container>

            {/* Add/Edit Asset Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>{editingId ? 'Edit Asset' : 'Add New Asset'}</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <TextField
                        fullWidth
                        label="Item Name"
                        value={formData.item_name}
                        onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                        margin="normal"
                        required
                    />
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Category</InputLabel>
                        <Select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            label="Category"
                        >
                            <MenuItem value="Liturgical">Liturgical</MenuItem>
                            <MenuItem value="Electronics">Electronics</MenuItem>
                            <MenuItem value="Furniture">Furniture</MenuItem>
                            <MenuItem value="Vehicle">Vehicle</MenuItem>
                            <MenuItem value="Building">Building</MenuItem>
                            <MenuItem value="Other">Other</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Status</InputLabel>
                        <Select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            label="Status"
                        >
                            <MenuItem value="Good">Good</MenuItem>
                            <MenuItem value="Under Repair">Under Repair</MenuItem>
                            <MenuItem value="For Disposal">For Disposal</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        label="Acquisition Date"
                        type="date"
                        value={formData.acquisition_date}
                        onChange={(e) => setFormData({ ...formData, acquisition_date: e.target.value })}
                        margin="normal"
                        InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        fullWidth
                        label="Value"
                        type="number"
                        value={formData.value}
                        onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                        margin="normal"
                        required
                        inputProps={{ step: '0.01' }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleAddAsset} variant="contained">
                        {editingId ? 'Update' : 'Add'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Add Maintenance Dialog */}
            <Dialog open={openMaintenanceDialog} onClose={handleCloseMaintenanceDialog} maxWidth="sm" fullWidth>
                <DialogTitle>{editingMaintenanceId ? 'Edit Maintenance Record' : 'Add Maintenance Record'}</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <TextField
                        fullWidth
                        label="Maintenance Date"
                        type="date"
                        value={maintenanceData.maintenance_date}
                        onChange={(e) => setMaintenanceData({ ...maintenanceData, maintenance_date: e.target.value })}
                        margin="normal"
                        InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        fullWidth
                        label="Description"
                        value={maintenanceData.description}
                        onChange={(e) => setMaintenanceData({ ...maintenanceData, description: e.target.value })}
                        margin="normal"
                        multiline
                        rows={3}
                        required
                    />
                    <TextField
                        fullWidth
                        label="Cost"
                        type="number"
                        value={maintenanceData.cost}
                        onChange={(e) => setMaintenanceData({ ...maintenanceData, cost: e.target.value })}
                        margin="normal"
                        required
                        inputProps={{ step: '0.01' }}
                    />
                    <TextField
                        fullWidth
                        label="Next Schedule"
                        type="date"
                        value={maintenanceData.next_schedule}
                        onChange={(e) => setMaintenanceData({ ...maintenanceData, next_schedule: e.target.value })}
                        margin="normal"
                        InputLabelProps={{ shrink: true }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseMaintenanceDialog}>Cancel</Button>
                    <Button onClick={handleAddMaintenance} variant="contained">{editingMaintenanceId ? 'Update' : 'Add'}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Assets;
