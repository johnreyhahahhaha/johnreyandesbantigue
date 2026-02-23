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
    CircularProgress,
    Alert,
    Typography,
    IconButton,
    Card,
    CardContent,
    Grid,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = 'http://localhost/josephus/st.joseph/public/api';

const CemeteryRecords = () => {
    const [records, setRecords] = useState([]);
    const [persons, setPersons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [formData, setFormData] = useState({
        deceased_id: '',
        block_no: '',
        row_no: '',
        lot_type: 'Common',
        lease_start: '',
        lease_end: '',
    });

    useEffect(() => {
        fetchRecords();
        fetchPersons();
    }, []);

    const fetchRecords = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/cemetery-records.php`);
            if (response.data.success) {
                setRecords(response.data.data);
                setError('');
            }
        } catch (err) {
            setError('Error fetching cemetery records');
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
            deceased_id: '',
            block_no: '',
            row_no: '',
            lot_type: 'Common',
            lease_start: '',
            lease_end: '',
        });
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
    };

    const handleAddRecord = async () => {
        if (!formData.deceased_id || !formData.block_no || !formData.row_no) {
            setError('Please fill in all required fields');
            return;
        }

        try {
            const response = await axios.post(`${API_BASE_URL}/cemetery-records.php`, formData);
            if (response.data.success) {
                setSuccess('Cemetery record added successfully');
                fetchRecords();
                handleCloseDialog();
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error adding cemetery record');
        }
    };

    const handleDeleteRecord = async (lotId) => {
        if (window.confirm('Are you sure you want to delete this cemetery record?')) {
            try {
                const response = await axios.delete(`${API_BASE_URL}/cemetery-records.php?id=${lotId}`);
                if (response.data.success) {
                    setSuccess('Cemetery record deleted successfully');
                    fetchRecords();
                    setTimeout(() => setSuccess(''), 3000);
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Error deleting cemetery record');
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
                <Typography variant="h4">Cemetery Records</Typography>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={handleOpenDialog}
                >
                    Add Cemetery Record
                </Button>
            </Box>

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 1 }}>
                                <Typography color="textSecondary" gutterBottom>
                                    Total Lots
                                </Typography>
                                <Typography variant="h5">{records.length}</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Box sx={{ p: 2, bgcolor: '#f3e5f5', borderRadius: 1 }}>
                                <Typography color="textSecondary" gutterBottom>
                                    Common Lots
                                </Typography>
                                <Typography variant="h5">
                                    {records.filter(r => r.lot_type === 'Common').length}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Box sx={{ p: 2, bgcolor: '#e8f5e9', borderRadius: 1 }}>
                                <Typography color="textSecondary" gutterBottom>
                                    Apartment-Type
                                </Typography>
                                <Typography variant="h5">
                                    {records.filter(r => r.lot_type === 'Apartment-Type').length}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Box sx={{ p: 2, bgcolor: '#fff3e0', borderRadius: 1 }}>
                                <Typography color="textSecondary" gutterBottom>
                                    Private Lots
                                </Typography>
                                <Typography variant="h5">
                                    {records.filter(r => r.lot_type === 'Private').length}
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell><strong>Lot ID</strong></TableCell>
                            <TableCell><strong>Deceased</strong></TableCell>
                            <TableCell><strong>Block</strong></TableCell>
                            <TableCell><strong>Row</strong></TableCell>
                            <TableCell><strong>Type</strong></TableCell>
                            <TableCell><strong>Lease Start</strong></TableCell>
                            <TableCell><strong>Lease End</strong></TableCell>
                            <TableCell align="center"><strong>Actions</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {records.length > 0 ? (
                            records.map((record) => (
                                <TableRow key={record.lot_id} hover>
                                    <TableCell>{record.lot_id}</TableCell>
                                    <TableCell>{record.first_name} {record.last_name}</TableCell>
                                    <TableCell>{record.block_no}</TableCell>
                                    <TableCell>{record.row_no}</TableCell>
                                    <TableCell>{record.lot_type}</TableCell>
                                    <TableCell>{record.lease_start}</TableCell>
                                    <TableCell>{record.lease_end}</TableCell>
                                    <TableCell align="center">
                                        <IconButton
                                            color="error"
                                            size="small"
                                            onClick={() => handleDeleteRecord(record.lot_id)}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                                    No cemetery records found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Add Cemetery Record</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <FormControl fullWidth margin="normal" required>
                        <InputLabel>Deceased Person</InputLabel>
                        <Select
                            value={formData.deceased_id}
                            onChange={(e) => setFormData({ ...formData, deceased_id: e.target.value })}
                            label="Deceased Person"
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
                        label="Block Number"
                        value={formData.block_no}
                        onChange={(e) => setFormData({ ...formData, block_no: e.target.value })}
                        required
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Row Number"
                        value={formData.row_no}
                        onChange={(e) => setFormData({ ...formData, row_no: e.target.value })}
                        required
                    />
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Lot Type</InputLabel>
                        <Select
                            value={formData.lot_type}
                            onChange={(e) => setFormData({ ...formData, lot_type: e.target.value })}
                            label="Lot Type"
                        >
                            <MenuItem value="Common">Common</MenuItem>
                            <MenuItem value="Apartment-Type">Apartment-Type</MenuItem>
                            <MenuItem value="Private">Private</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Lease Start Date"
                        type="date"
                        value={formData.lease_start}
                        onChange={(e) => setFormData({ ...formData, lease_start: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Lease End Date"
                        type="date"
                        value={formData.lease_end}
                        onChange={(e) => setFormData({ ...formData, lease_end: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleAddRecord} variant="contained" color="primary">
                        Add
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default CemeteryRecords;
