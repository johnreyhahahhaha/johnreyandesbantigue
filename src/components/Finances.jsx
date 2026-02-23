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
    Card,
    CardContent,
    Grid,
    Typography,
    Tabs,
    Tab,
    Chip,
    IconButton,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = 'http://localhost/josephus/st.joseph/public/api';

const Finances = () => {
    const [donations, setDonations] = useState([]);
    const [massIntentions, setMassIntentions] = useState([]);
    const [lentenOfferings, setLentenOfferings] = useState([]);
    const [ledger, setLedger] = useState([]);
    const [persons, setPersons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [error, setError] = useState('');
    const [tabValue, setTabValue] = useState(0);
    const [recordType, setRecordType] = useState('donation'); // 'donation', 'mass_intention', 'lenten_offering'
    const [totals, setTotals] = useState({ donations: 0, massIntentions: 0, lentenOfferings: 0, income: 0, expense: 0 });
    const [formData, setFormData] = useState({
        donor_id: '',
        amount: '',
        donation_date: new Date().toISOString().split('T')[0],
        donation_type: 'Love Offering',
        remarks: '',
        intention_description: '',
        mass_date: new Date().toISOString().split('T')[0],
        status: 'Soul',
        offering_date: new Date().toISOString().split('T')[0],
    });

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [donationsRes, massIntentionsRes, lentenRes, ledgerRes, personsRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/finances.php?type=donations`),
                axios.get(`${API_BASE_URL}/finances.php?type=mass_intentions`),
                axios.get(`${API_BASE_URL}/finances.php?type=lenten_offerings`),
                axios.get(`${API_BASE_URL}/finances.php?type=ledger`),
                axios.get(`${API_BASE_URL}/persons.php`),
            ]);

            const donationsData = donationsRes.data.success ? donationsRes.data.data || [] : [];
            const massIntentionsData = massIntentionsRes.data.success ? massIntentionsRes.data.data || [] : [];
            const lentenData = lentenRes.data.success ? lentenRes.data.data || [] : [];
            const ledgerData = ledgerRes.data.success ? ledgerRes.data.data || [] : [];
            const personsData = personsRes.data.success ? personsRes.data.data || [] : [];

            setDonations(donationsData);
            setMassIntentions(massIntentionsData);
            setLentenOfferings(lentenData);
            setLedger(ledgerData);
            setPersons(personsData);
            calculateTotals(donationsData, massIntentionsData, lentenData, ledgerData);
            setError('');
        } catch (err) {
            setError('Error fetching data: ' + (err.response?.data?.message || err.message));
            setDonations([]);
            setMassIntentions([]);
            setLentenOfferings([]);
            setLedger([]);
            setPersons([]);
        } finally {
            setLoading(false);
        }
    };

    const calculateTotals = (donationsData, massIntentionsData, lentenData, ledgerData) => {
        const donationTotal = donationsData.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
        const massIntentionTotal = massIntentionsData.reduce((sum, m) => sum + parseFloat(m.amount || 0), 0);
        const lentenTotal = lentenData.reduce((sum, l) => sum + parseFloat(l.amount || 0), 0);
        
        const income = ledgerData
            .filter((l) => l.trans_type === 'Income')
            .reduce((sum, l) => sum + parseFloat(l.amount || 0), 0);

        const expense = ledgerData
            .filter((l) => l.trans_type === 'Expense')
            .reduce((sum, l) => sum + parseFloat(l.amount || 0), 0);

        setTotals({ 
            donations: donationTotal, 
            massIntentions: massIntentionTotal,
            lentenOfferings: lentenTotal,
            income, 
            expense 
        });
    };

    const getPersonName = (personId) => {
        const person = persons.find(p => p.person_id == personId);
        return person ? `${person.first_name} ${person.last_name}` : 'Unknown';
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddRecord = async () => {
        if (!formData.donor_id || !formData.amount) {
            setError('Please fill all required fields');
            return;
        }
        try {
            const payload = {
                type: recordType,
                person_id: formData.donor_id,
                amount: parseFloat(formData.amount),
            };

            if (recordType === 'donation') {
                payload.donation_type = formData.donation_type;
            } else if (recordType === 'mass_intention') {
                payload.mass_date = formData.mass_date;
                payload.intention_description = formData.intention_description;
                payload.status = formData.status;
            } else if (recordType === 'lenten_offering') {
                // Lenten offerings are stored as donations with type 'Project Donation'
            }

            const response = await axios.post(`${API_BASE_URL}/finances.php`, payload);

            if (response.data.success) {
                setOpenDialog(false);
                setFormData({
                    donor_id: '',
                    amount: '',
                    donation_date: new Date().toISOString().split('T')[0],
                    donation_type: 'Love Offering',
                    remarks: '',
                    intention_description: '',
                    mass_date: new Date().toISOString().split('T')[0],
                    status: 'Soul',
                    offering_date: new Date().toISOString().split('T')[0],
                });
                fetchAllData();
            } else {
                setError('Failed to add record: ' + (response.data.message || 'Unknown error'));
            }
        } catch (err) {
            setError('Error adding record: ' + err.message);
        }
    };

    const handleDelete = async (id, type) => {
        if (window.confirm('Delete this record?')) {
            try {
                const response = await axios.delete(`${API_BASE_URL}/finances.php?id=${id}&type=${type}`);
                if (response.data.success) {
                    fetchAllData();
                } else {
                    setError('Failed to delete record');
                }
            } catch (err) {
                setError('Error deleting record: ' + err.message);
            }
        }
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
                                Finances
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#64748b' }}>
                                Track donations, mass intentions, lenten offerings, and parish financial ledger
                            </Typography>
                        </Box>
                        <Button 
                            variant="contained" 
                            startIcon={<AddIcon />}
                            onClick={() => {
                                setRecordType('donation');
                                setFormData({
                                    donor_id: '',
                                    amount: '',
                                    donation_date: new Date().toISOString().split('T')[0],
                                    donation_type: 'Love Offering',
                                    remarks: '',
                                    intention_description: '',
                                    mass_date: new Date().toISOString().split('T')[0],
                                    status: 'Soul',
                                    offering_date: new Date().toISOString().split('T')[0],
                                });
                                setOpenDialog(true);
                            }}
                            sx={{
                                backgroundColor: '#1e3a8a',
                                '&:hover': { backgroundColor: '#1e40af' }
                            }}
                        >
                            Add Record
                        </Button>
                    </Box>
                </Container>
            </Box>

            {/* Content Section */}
            <Container maxWidth="lg" sx={{ py: 4 }}>
                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                {/* Summary Cards */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ boxShadow: 1, '&:hover': { boxShadow: 2 } }}>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Total Donations
                                </Typography>
                                <Typography variant="h5" sx={{ color: '#059669', fontWeight: 700 }}>
                                    ₱{totals.donations.toFixed(2)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ boxShadow: 1, '&:hover': { boxShadow: 2 } }}>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Mass Intentions
                                </Typography>
                                <Typography variant="h5" sx={{ color: '#0891b2', fontWeight: 700 }}>
                                    ₱{totals.massIntentions.toFixed(2)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>  
                        <Card sx={{ boxShadow: 1, '&:hover': { boxShadow: 2 } }}>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Lenten Offerings
                                </Typography>
                                <Typography variant="h5" sx={{ color: '#7c3aed', fontWeight: 700 }}>
                                    ₱{totals.lentenOfferings.toFixed(2)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ boxShadow: 1, '&:hover': { boxShadow: 2 } }}>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Total Income
                                </Typography>
                                <Typography variant="h5" sx={{ color: '#7c3aed', fontWeight: 700 }}>
                                    ₱{totals.income.toFixed(2)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ boxShadow: 1, '&:hover': { boxShadow: 2 } }}>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Balance
                                </Typography>
                                <Typography 
                                    variant="h5" 
                                    sx={{ 
                                        color: totals.income >= totals.donations + totals.massIntentions + totals.lentenOfferings ? '#059669' : '#dc2626',
                                        fontWeight: 700
                                    }}
                                >
                                    ₱{(totals.income - (totals.donations + totals.massIntentions + totals.lentenOfferings)).toFixed(2)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {/* Tabbed Interface */}
                <Paper sx={{ mb: 3 }}>
                    <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
                        <Tab label={`Donations (${donations.length})`} />
                        <Tab label={`Mass Intentions (${massIntentions.length})`} />
                        <Tab label={`Lenten Offerings (${lentenOfferings.length})`} />
                        <Tab label={`Ledger (${ledger.length})`} />
                    </Tabs>
                </Paper>

                {/* Donations Table */}
                {tabValue === 0 && (
                    <TableContainer component={Paper} sx={{ backgroundColor: '#fff', borderRadius: 1, overflow: 'auto' }}>
                        <Table sx={{ minWidth: 750 }}>
                            <TableHead>
                                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Donor</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Amount</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Type</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Date</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Remarks</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {donations && donations.length > 0 ? (
                                    donations.map((donation) => (
                                        <TableRow 
                                            key={donation.donation_id}
                                            sx={{
                                                '&:nth-of-type(odd)': { backgroundColor: '#f8fafc' },
                                                '&:hover': { backgroundColor: '#f1f5f9' },
                                            }}
                                        >
                                            <TableCell>{getPersonName(donation.person_id)}</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>₱{parseFloat(donation.amount).toFixed(2)}</TableCell>
                                            <TableCell><Chip label={donation.donation_type} size="small" /></TableCell>
                                            <TableCell>{donation.donation_date}</TableCell>
                                            <TableCell>{donation.remarks || '-'}</TableCell>
                                            <TableCell>
                                                <IconButton 
                                                    size="small" 
                                                    color="error"
                                                    onClick={() => handleDelete(donation.donation_id, 'donation')}
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} sx={{ textAlign: 'center', py: 3, color: '#64748b' }}>
                                            No donations found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}

                {/* Mass Intentions Table */}
                {tabValue === 1 && (
                    <TableContainer component={Paper} sx={{ backgroundColor: '#fff', borderRadius: 1, overflow: 'auto' }}>
                        <Table sx={{ minWidth: 750 }}>
                            <TableHead>
                                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Person</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Amount</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Intention</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Date</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {massIntentions && massIntentions.length > 0 ? (
                                    massIntentions.map((intention) => (
                                        <TableRow 
                                            key={intention.mass_intention_id}
                                            sx={{
                                                '&:nth-of-type(odd)': { backgroundColor: '#f8fafc' },
                                                '&:hover': { backgroundColor: '#f1f5f9' },
                                            }}
                                        >
                                            <TableCell>{getPersonName(intention.person_id)}</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>₱{parseFloat(intention.amount).toFixed(2)}</TableCell>
                                            <TableCell>{intention.intention_description || '-'}</TableCell>
                                            <TableCell>{intention.mass_date}</TableCell>
                                            <TableCell><Chip label={intention.status || 'Pending'} size="small" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} sx={{ textAlign: 'center', py: 3, color: '#64748b' }}>
                                            No mass intentions found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}

                {/* Lenten Offerings Table */}
                {tabValue === 2 && (
                    <TableContainer component={Paper} sx={{ backgroundColor: '#fff', borderRadius: 1, overflow: 'auto' }}>
                        <Table sx={{ minWidth: 750 }}>
                            <TableHead>
                                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Person</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Amount</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Date</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Remarks</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {lentenOfferings && lentenOfferings.length > 0 ? (
                                    lentenOfferings.map((offering) => (
                                        <TableRow 
                                            key={offering.lenten_offering_id}
                                            sx={{
                                                '&:nth-of-type(odd)': { backgroundColor: '#f8fafc' },
                                                '&:hover': { backgroundColor: '#f1f5f9' },
                                            }}
                                        >
                                            <TableCell>{getPersonName(offering.person_id)}</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>₱{parseFloat(offering.amount).toFixed(2)}</TableCell>
                                            <TableCell>{offering.offering_date}</TableCell>
                                            <TableCell>{offering.remarks || '-'}</TableCell>
                                            <TableCell>
                                                <IconButton 
                                                    size="small" 
                                                    color="error"
                                                    onClick={() => handleDelete(offering.lenten_offering_id, 'lenten_offering')}
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} sx={{ textAlign: 'center', py: 3, color: '#64748b' }}>
                                            No lenten offerings found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}

                {/* Ledger Table */}
                {tabValue === 3 && (
                    <TableContainer component={Paper} sx={{ backgroundColor: '#fff', borderRadius: 1, overflow: 'auto' }}>
                        <Table sx={{ minWidth: 750 }}>
                            <TableHead>
                                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Type</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Category</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Amount</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Date</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Description</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {ledger && ledger.length > 0 ? (
                                    ledger.map((entry) => (
                                        <TableRow 
                                            key={entry.ledger_id}
                                            sx={{
                                                '&:nth-of-type(odd)': { backgroundColor: '#f8fafc' },
                                                '&:hover': { backgroundColor: '#f1f5f9' },
                                            }}
                                        >
                                            <TableCell>
                                                <Chip 
                                                    label={entry.trans_type} 
                                                    color={entry.trans_type === 'Income' ? 'success' : 'error'}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>{entry.category || '-'}</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>
                                                ₱{parseFloat(entry.amount).toFixed(2)}
                                            </TableCell>
                                            <TableCell>{entry.trans_date}</TableCell>
                                            <TableCell>{entry.description || '-'}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} sx={{ textAlign: 'center', py: 3, color: '#64748b' }}>
                                            No ledger entries found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Container>

            {/* Add Record Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Financial Record</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    {/* Record Type Selector */}
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Record Type</InputLabel>
                        <Select
                            value={recordType}
                            label="Record Type"
                            onChange={(e) => {
                                setRecordType(e.target.value);
                                setFormData({
                                    donor_id: '',
                                    amount: '',
                                    donation_date: new Date().toISOString().split('T')[0],
                                    donation_type: 'Love Offering',
                                    remarks: '',
                                    intention_description: '',
                                    mass_date: new Date().toISOString().split('T')[0],
                                    status: 'Soul',
                                    offering_date: new Date().toISOString().split('T')[0],
                                });
                            }}
                        >
                            <MenuItem value="donation">Donation</MenuItem>
                            <MenuItem value="mass_intention">Mass Intention</MenuItem>
                            <MenuItem value="lenten_offering">Lenten Offering</MenuItem>
                        </Select>
                    </FormControl>

                    {/* Donor Selection - Common to all types */}
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Person</InputLabel>
                        <Select
                            value={formData.donor_id || ''}
                            onChange={(e) => setFormData({ ...formData, donor_id: e.target.value })}
                            label="Person"
                        >
                            <MenuItem value="">-- Select Person --</MenuItem>
                            {persons.map((person) => (
                                <MenuItem key={person.person_id} value={person.person_id}>
                                    {person.first_name} {person.last_name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Amount - Common to all types */}
                    <TextField
                        fullWidth
                        label="Amount"
                        type="number"
                        value={formData.amount || ''}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        margin="normal"
                        required
                        inputProps={{ step: '0.01' }}
                    />

                    {/* Donation-specific fields */}
                    {recordType === 'donation' && (
                        <>
                            <FormControl fullWidth margin="normal">
                                <InputLabel>Donation Type</InputLabel>
                                <Select
                                    value={formData.donation_type || 'Love Offering'}
                                    onChange={(e) => setFormData({ ...formData, donation_type: e.target.value })}
                                    label="Donation Type"
                                >
                                    <MenuItem value="Tithe">Tithe</MenuItem>
                                    <MenuItem value="Love Offering">Love Offering</MenuItem>
                                    <MenuItem value="Mass Intention Fee">Mass Intention Fee</MenuItem>
                                </Select>
                            </FormControl>
                        </>
                    )}

                    {/* Mass Intention-specific fields */}
                    {recordType === 'mass_intention' && (
                        <>
                            <TextField
                                fullWidth
                                label="Intention Description"
                                value={formData.intention_description || ''}
                                onChange={(e) => setFormData({ ...formData, intention_description: e.target.value })}
                                margin="normal"
                                multiline
                                rows={2}
                            />
                            <TextField
                                fullWidth
                                label="Mass Date"
                                type="date"
                                value={formData.mass_date || new Date().toISOString().split('T')[0]}
                                onChange={(e) => setFormData({ ...formData, mass_date: e.target.value })}
                                margin="normal"
                                InputLabelProps={{ shrink: true }}
                            />
                            <FormControl fullWidth margin="normal">
                                <InputLabel>Intention Type</InputLabel>
                                <Select
                                    value={formData.status || 'Soul'}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    label="Intention Type"
                                >
                                    <MenuItem value="Soul">Soul</MenuItem>
                                    <MenuItem value="Thanksgiving">Thanksgiving</MenuItem>
                                    <MenuItem value="Healing">Healing</MenuItem>
                                    <MenuItem value="Petition">Petition</MenuItem>
                                </Select>
                            </FormControl>
                        </>
                    )}

                    {/* Lenten Offering-specific fields */}
                    {recordType === 'lenten_offering' && (
                        <>
                            <TextField
                                fullWidth
                                label="Date"
                                type="date"
                                value={formData.offering_date || new Date().toISOString().split('T')[0]}
                                onChange={(e) => setFormData({ ...formData, offering_date: e.target.value })}
                                margin="normal"
                                InputLabelProps={{ shrink: true }}
                            />
                            <TextField
                                fullWidth
                                label="Remarks"
                                value={formData.remarks || ''}
                                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                margin="normal"
                                multiline
                                rows={2}
                            />
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setOpenDialog(false);
                        setFormData({
                            donor_id: '',
                            amount: '',
                            donation_date: new Date().toISOString().split('T')[0],
                            donation_type: 'Love Offering',
                            remarks: '',
                            intention_description: '',
                            mass_date: new Date().toISOString().split('T')[0],
                            status: 'Soul',
                            offering_date: new Date().toISOString().split('T')[0],
                        });
                    }}>Cancel</Button>
                    <Button onClick={handleAddRecord} variant="contained">Add</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Finances;
