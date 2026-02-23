import React, { useState, useEffect } from 'react';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Info as InfoIcon } from '@mui/icons-material';
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
    Tabs,
    Tab,
    Card,
    CardContent,
    Grid,
    IconButton,
    Chip,
} from '@mui/material';
import { personAPI, sacramentAPI, documentAPI } from '../api/apiClient';

const PeopleRecords = () => {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openDetailDialog, setOpenDetailDialog] = useState(false);
    const [selectedPerson, setSelectedPerson] = useState(null);
    const [tabValue, setTabValue] = useState(0);
    const [error, setError] = useState('');
    const [sacraments, setSacraments] = useState({});
    const [documentRequests, setDocumentRequests] = useState({});
    const [formData, setFormData] = useState({
        first_name: '',
        middle_name: '',
        last_name: '',
        gender: 'Male',
        birth_date: '',
        birth_place: '',
        address: '',
        contact_no: '',
        email: '',
        civil_status: 'Single',
        is_alive: 1,
    });

    useEffect(() => {
        fetchRecords();
    }, []);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const response = await personAPI.getAllPersons();
            const data = response.data;
            
            if (data.success) {
                setRecords(data.data || []);
                setError('');
                fetchSacraments();
                fetchDocumentRequests();
            } else {
                setError('Failed to fetch records');
            }
        } catch (err) {
            setError('Error fetching records: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchSacraments = async () => {
        try {
            const [baptismsRes, marriagesRes, confirmationsRes] = await Promise.all([
                sacramentAPI.getBaptisms(),
                sacramentAPI.getMarriages(),
                sacramentAPI.getConfirmations(),
            ]);
            
            const sacramentMap = {};
            if (baptismsRes.data.success) {
                baptismsRes.data.data?.forEach(b => {
                    if (!sacramentMap[b.person_id]) sacramentMap[b.person_id] = [];
                    sacramentMap[b.person_id].push({ type: 'Baptism', date: b.baptism_date });
                });
            }
            if (marriagesRes.data.success) {
                marriagesRes.data.data?.forEach(m => {
                    if (!sacramentMap[m.groom_id]) sacramentMap[m.groom_id] = [];
                    if (!sacramentMap[m.bride_id]) sacramentMap[m.bride_id] = [];
                    sacramentMap[m.groom_id].push({ type: 'Marriage', date: m.marriage_date });
                    sacramentMap[m.bride_id].push({ type: 'Marriage', date: m.marriage_date });
                });
            }
            if (confirmationsRes.data.success) {
                confirmationsRes.data.data?.forEach(c => {
                    if (!sacramentMap[c.person_id]) sacramentMap[c.person_id] = [];
                    sacramentMap[c.person_id].push({ type: 'Confirmation', date: c.confirmation_date });
                });
            }
            setSacraments(sacramentMap);
        } catch (err) {
            console.error('Error fetching sacraments:', err);
        }
    };

    const fetchDocumentRequests = async () => {
        try {
            const response = await documentAPI.getAllRequests();
            const data = response.data;
            
            if (data.success) {
                const docMap = {};
                data.data?.forEach(doc => {
                    if (!docMap[doc.person_id]) docMap[doc.person_id] = [];
                    docMap[doc.person_id].push(doc);
                });
                setDocumentRequests(docMap);
            }
        } catch (err) {
            console.error('Error fetching document requests:', err);
        }
    };

    const handleAddRecord = async () => {
        try {
            const response = await personAPI.createPerson(formData);
            const data = response.data;

            if (data.success) {
                setOpenDialog(false);
                setFormData({
                    first_name: '',
                    middle_name: '',
                    last_name: '',
                    gender: 'Male',
                    birth_date: '',
                    birth_place: '',
                    address: '',
                    contact_no: '',
                    email: '',
                    civil_status: 'Single',
                    is_alive: 1,
                });
                fetchRecords();
            } else {
                setError('Failed to add record: ' + (data.message || ''));
            }
        } catch (err) {
            setError('Error adding record: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleDeleteRecord = async (personId) => {
        if (window.confirm('Are you sure?')) {
            try {
                const response = await personAPI.deletePerson(personId);
                const data = response.data;
                if (data.success) {
                    fetchRecords();
                } else {
                    setError('Failed to delete');
                }
            } catch (err) {
                setError('Error deleting record: ' + (err.response?.data?.message || err.message));
            }
        }
    };

    const handleOpenDetail = (person) => {
        setSelectedPerson(person);
        setTabValue(0);
        setOpenDetailDialog(true);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'is_alive' ? parseInt(value) : value
        }));
    };

    const getAgeFromBirthDate = (birthDate) => {
        if (!birthDate) return 'N/A';
        
        // Parse date string (YYYY-MM-DD format) to avoid timezone issues
        const dateParts = birthDate.split('-');
        const birth = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
        
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    };

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
                <CircularProgress />
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
                    People Records
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}>
                    Add Person
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <TableContainer component={Paper}>
                <Table>
                    <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Age</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Civil Status</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Contact</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Sacraments</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {records.map((person) => (
                            <TableRow key={person.person_id} hover>
                                <TableCell>{person.first_name} {person.last_name}</TableCell>
                                <TableCell>{getAgeFromBirthDate(person.birth_date)}</TableCell>
                                <TableCell>{person.civil_status}</TableCell>
                                <TableCell>{person.contact_no || 'N/A'}</TableCell>
                                <TableCell>
                                    {sacraments[person.person_id]?.length > 0 ? (
                                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                            {sacraments[person.person_id].slice(0, 2).map((sac, idx) => (
                                                <Chip key={idx} label={sac.type} size="small" variant="outlined" />
                                            ))}
                                            {sacraments[person.person_id].length > 2 && (
                                                <Chip label={`+${sacraments[person.person_id].length - 2}`} size="small" />
                                            )}
                                        </Box>
                                    ) : (
                                        <Typography variant="body2" color="textSecondary">None</Typography>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Chip label={person.is_alive ? 'Active' : 'Deceased'} color={person.is_alive ? 'success' : 'default'} size="small" />
                                </TableCell>
                                <TableCell align="center">
                                    <IconButton size="small" onClick={() => handleOpenDetail(person)} title="View Details">
                                        <InfoIcon />
                                    </IconButton>
                                    <IconButton size="small" onClick={() => handleDeleteRecord(person.person_id)} title="Delete">
                                        <DeleteIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Add Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add New Person</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <TextField fullWidth label="First Name" name="first_name" value={formData.first_name} onChange={handleInputChange} margin="dense" required />
                    <TextField fullWidth label="Middle Name" name="middle_name" value={formData.middle_name} onChange={handleInputChange} margin="dense" />
                    <TextField fullWidth label="Last Name" name="last_name" value={formData.last_name} onChange={handleInputChange} margin="dense" required />
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Gender</InputLabel>
                        <Select name="gender" value={formData.gender} onChange={handleInputChange}>
                            <MenuItem value="Male">Male</MenuItem>
                            <MenuItem value="Female">Female</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField fullWidth label="Birth Date" name="birth_date" type="date" value={formData.birth_date} onChange={handleInputChange} margin="dense" InputLabelProps={{ shrink: true }} required />
                    <TextField fullWidth label="Birth Place" name="birth_place" value={formData.birth_place} onChange={handleInputChange} margin="dense" />
                    <TextField fullWidth label="Address" name="address" value={formData.address} onChange={handleInputChange} margin="dense" multiline rows={2} />
                    <TextField fullWidth label="Contact No" name="contact_no" value={formData.contact_no} onChange={handleInputChange} margin="dense" />
                    <TextField fullWidth label="Email" name="email" type="email" value={formData.email} onChange={handleInputChange} margin="dense" required />
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Civil Status</InputLabel>
                        <Select name="civil_status" value={formData.civil_status} onChange={handleInputChange}>
                            <MenuItem value="Single">Single</MenuItem>
                            <MenuItem value="Married">Married</MenuItem>
                            <MenuItem value="Widowed">Widowed</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button onClick={handleAddRecord} variant="contained">Add</Button>
                </DialogActions>
            </Dialog>

            {/* Detail Dialog */}
            {selectedPerson && (
                <Dialog open={openDetailDialog} onClose={() => setOpenDetailDialog(false)} maxWidth="md" fullWidth>
                    <DialogTitle>{selectedPerson.first_name} {selectedPerson.last_name}</DialogTitle>
                    <DialogContent sx={{ pt: 2 }}>
                        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
                            <Tab label="Personal Info" />
                            <Tab label="Sacraments" />
                            <Tab label="Documents" />
                        </Tabs>

                        {tabValue === 0 && (
                            <Box sx={{ mt: 2 }}>
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <Typography color="textSecondary">Birth Date</Typography>
                                        <Typography>{selectedPerson.birth_date}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography color="textSecondary">Age</Typography>
                                        <Typography>{getAgeFromBirthDate(selectedPerson.birth_date)}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography color="textSecondary">Gender</Typography>
                                        <Typography>{selectedPerson.gender}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography color="textSecondary">Civil Status</Typography>
                                        <Typography>{selectedPerson.civil_status}</Typography>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography color="textSecondary">Address</Typography>
                                        <Typography>{selectedPerson.address}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography color="textSecondary">Contact</Typography>
                                        <Typography>{selectedPerson.contact_no}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography color="textSecondary">Email</Typography>
                                        <Typography>{selectedPerson.email}</Typography>
                                    </Grid>
                                </Grid>
                            </Box>
                        )}

                        {tabValue === 1 && (
                            <Box sx={{ mt: 2 }}>
                                {sacraments[selectedPerson.person_id]?.length > 0 ? (
                                    <Box>
                                        {sacraments[selectedPerson.person_id].map((sac, idx) => (
                                            <Card key={idx} sx={{ mb: 1 }}>
                                                <CardContent>
                                                    <Typography variant="h6">{sac.type}</Typography>
                                                    <Typography color="textSecondary">Date: {sac.date}</Typography>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </Box>
                                ) : (
                                    <Typography>No sacraments recorded</Typography>
                                )}
                            </Box>
                        )}

                        {tabValue === 2 && (
                            <Box sx={{ mt: 2 }}>
                                {documentRequests[selectedPerson.person_id]?.length > 0 ? (
                                    <Box>
                                        {documentRequests[selectedPerson.person_id].map((doc, idx) => (
                                            <Card key={idx} sx={{ mb: 1 }}>
                                                <CardContent>
                                                    <Typography variant="h6">{doc.document_type}</Typography>
                                                    <Typography color="textSecondary">Status: {doc.status}</Typography>
                                                    <Typography variant="body2">Purpose: {doc.purpose}</Typography>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </Box>
                                ) : (
                                    <Typography>No document requests</Typography>
                                )}
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenDetailDialog(false)}>Close</Button>
                    </DialogActions>
                </Dialog>
            )}
        </Container>
    );
};

export default PeopleRecords;
