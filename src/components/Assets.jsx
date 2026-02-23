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
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = 'http://localhost/josephus/st.joseph/public/api';

const Assets = () => {
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
        value: '',
        location: '',
    });
    const [maintenanceData, setMaintenanceData] = useState({
        maintenance_date: new Date().toISOString().split('T')[0],
        description: '',
        cost: '',
    });

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [assetsRes, maintenanceRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/assets.php`),
                axios.get(`${API_BASE_URL}/assets.php?type=maintenance`),
            ]);

            const assetsData = assetsRes.data.success ? assetsRes.data.data || [] : [];
            const maintenanceData = maintenanceRes.data.success ? maintenanceRes.data.data || [] : [];

            setAssets(assetsData);
            setMaintenance(maintenanceData);
            setError('');
        } catch (err) {
            setError('Error fetching data: ' + (err.response?.data?.message || err.message));
            setAssets([]);
            setMaintenance([]);
        } finally {
            setLoading(false);
        }
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
                    value: '',
                    location: '',
                });
                fetchAllData();
            } else {
                setError('Failed to save asset');
            }
        } catch (err) {
            setError('Error saving asset: ' + err.message);
        }
    };

    const handleAddMaintenance = async () => {
        if (!selectedAssetId || !maintenanceData.description || !maintenanceData.cost) {
            setError('Please fill all required fields');
            return;
        }
        try {
            const response = await axios.post(`${API_BASE_URL}/assets.php?type=maintenance`, {
                asset_id: selectedAssetId,
                maintenance_date: maintenanceData.maintenance_date,
                description: maintenanceData.description,
                cost: parseFloat(maintenanceData.cost),
            });

            if (response.data.success) {
                setOpenMaintenanceDialog(false);
                setSelectedAssetId(null);
                setMaintenanceData({
                    maintenance_date: new Date().toISOString().split('T')[0],
                    description: '',
                    cost: '',
                });
                fetchAllData();
            } else {
                setError('Failed to add maintenance record');
            }
        } catch (err) {
            setError('Error adding maintenance: ' + err.message);
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

    const handleEditAsset = (asset) => {
        setEditingId(asset.asset_id);
        setFormData({
            item_name: asset.item_name,
            category: asset.category,
            status: asset.status,
            acquisition_date: asset.acquisition_date,
            value: asset.value,
            location: asset.location || '',
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
            location: '',
        });
    };

    const handleCloseMaintenanceDialog = () => {
        setOpenMaintenanceDialog(false);
        setSelectedAssetId(null);
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
        <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc' }}>
            {/* Header Section */}
            <Box sx={{ bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0', py: 3 }}>
                <Container maxWidth="lg">
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 0.5 }}>
                                Parish Assets
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#64748b' }}>
                                Track and manage parish property, equipment, and maintenance
                            </Typography>
                        </Box>
                        <Button 
                            variant="contained" 
                            startIcon={<AddIcon />}
                            onClick={() => setOpenDialog(true)}
                            sx={{
                                backgroundColor: '#1e3a8a',
                                '&:hover': { backgroundColor: '#1e40af' }
                            }}
                        >
                            Add Asset
                        </Button>
                    </Box>
                </Container>
            </Box>

            {/* Content Section */}
            <Container maxWidth="lg" sx={{ py: 4 }}>
                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                {/* Summary Cards */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={4}>
                        <Card sx={{ boxShadow: 1 }}>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Total Assets
                                </Typography>
                                <Typography variant="h5" sx={{ color: '#8b5cf6', fontWeight: 700 }}>
                                    {assets.length}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <Card sx={{ boxShadow: 1 }}>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Good Condition
                                </Typography>
                                <Typography variant="h5" sx={{ color: '#059669', fontWeight: 700 }}>
                                    {assets.filter(a => a.status === 'Good').length}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <Card sx={{ boxShadow: 1 }}>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Under Repair
                                </Typography>
                                <Typography variant="h5" sx={{ color: '#f59e0b', fontWeight: 700 }}>
                                    {assets.filter(a => a.status === 'Under Repair').length}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                <TableContainer component={Paper} sx={{ backgroundColor: '#fff', borderRadius: 1, overflow: 'auto' }}>
                    <Table sx={{ minWidth: 750 }}>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Item Name</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Category</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Location</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Acquisition Date</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Value</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Maintenance</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {assets && assets.length > 0 ? (
                                assets.map((asset) => (
                                    <TableRow 
                                        key={asset.asset_id}
                                        sx={{
                                            '&:nth-of-type(odd)': { backgroundColor: '#f8fafc' },
                                            '&:hover': { backgroundColor: '#f1f5f9' },
                                        }}
                                    >
                                        <TableCell sx={{ fontWeight: 600 }}>{asset.item_name}</TableCell>
                                        <TableCell><Chip label={asset.category} size="small" /></TableCell>
                                        <TableCell>{asset.location || '-'}</TableCell>
                                        <TableCell>{asset.acquisition_date}</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>₱{parseFloat(asset.value).toFixed(2)}</TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={asset.status} 
                                                color={getAssetStatus(asset.status)}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                                                {getMaintenanceHistory(asset.asset_id).length} records
                                            </Typography>
                                            <Button 
                                                size="small"
                                                onClick={() => {
                                                    setSelectedAssetId(asset.asset_id);
                                                    setOpenMaintenanceDialog(true);
                                                }}
                                                sx={{ mt: 0.5 }}
                                            >
                                                Add
                                            </Button>
                                        </TableCell>
                                        <TableCell>
                                            <IconButton 
                                                size="small"
                                                onClick={() => handleEditAsset(asset)}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton 
                                                size="small" 
                                                color="error"
                                                onClick={() => handleDeleteAsset(asset.asset_id)}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 3, color: '#64748b' }}>
                                        No assets found
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
                    <TextField
                        fullWidth
                        label="Location"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        margin="normal"
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
                <DialogTitle>Add Maintenance Record</DialogTitle>
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
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseMaintenanceDialog}>Cancel</Button>
                    <Button onClick={handleAddMaintenance} variant="contained">Add</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Assets;
