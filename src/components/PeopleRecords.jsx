import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Info as InfoIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
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
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { personAPI, sacramentAPI, documentAPI, API_BASE_URL } from '../api/apiClient';
import { usePermission } from '../contexts/PermissionContext';

const PeopleRecords = () => {
    const navigate = useNavigate();
    const { canCreate, canUpdate, canDelete } = usePermission();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openDetailDialog, setOpenDetailDialog] = useState(false);
    const [selectedSacrament, setSelectedSacrament] = useState(null);
    const [selectedPerson, setSelectedPerson] = useState(null);
    const [tabValue, setTabValue] = useState(0);
    const [error, setError] = useState('');
    const [sacraments, setSacraments] = useState({});
    const [documentRequests, setDocumentRequests] = useState({});
    const [households, setHouseholds] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sacramentSearchTerm, setSacramentSearchTerm] = useState('');
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formErrors, setFormErrors] = useState({});
    const [formData, setFormData] = useState({
        first_name: '',
        middle_name: '',
        last_name: '',
        suffix: '',
        gender: 'Male',
        birth_date: '',
        birth_place: '',
        address: '',
        contact_no: '',
        email: '',
        civil_status: 'Single',
        is_alive: 1,
        household_id: '',
        religion: 'Roman Catholic',
        nationality: 'Filipino',
        occupation: '',
        priest_license_no: '',
        ordination_date: '',
       
    });

    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

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
                // fetch households for dropdowns
                try {
                    const hRes = await fetch(`${API_BASE_URL}/households.php`);
                    const hText = await hRes.text();
                    const hData = hText ? JSON.parse(hText) : null;
                    if (hData && hData.success) setHouseholds(hData.data || []);
                } catch (hhErr) {
                    console.warn('Failed to load households for PeopleRecords:', hhErr);
                }
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
            const [baptismsRes, marriagesRes, confirmationsRes, communionsRes] = await Promise.all([
                sacramentAPI.getBaptisms(),
                sacramentAPI.getMarriages(),
                sacramentAPI.getConfirmations(),
                fetch(`${API_BASE_URL}/sacraments.php?type=communion`).then((response) => response.json()),
            ]);
            
            const sacramentMap = {};
            if (baptismsRes.data.success) {
                baptismsRes.data.data?.forEach(b => {
                    if (!sacramentMap[b.person_id]) sacramentMap[b.person_id] = [];
                    sacramentMap[b.person_id].push({ type: 'Baptism', date: b.baptism_date, record: b });
                });
            }
            if (marriagesRes.data.success) {
                marriagesRes.data.data?.forEach(m => {
                    if (!sacramentMap[m.groom_id]) sacramentMap[m.groom_id] = [];
                    if (!sacramentMap[m.bride_id]) sacramentMap[m.bride_id] = [];
                    sacramentMap[m.groom_id].push({ type: 'Marriage', date: m.marriage_date, record: m });
                    sacramentMap[m.bride_id].push({ type: 'Marriage', date: m.marriage_date, record: m });
                });
            }
            if (confirmationsRes.data.success) {
                confirmationsRes.data.data?.forEach(c => {
                    if (!sacramentMap[c.person_id]) sacramentMap[c.person_id] = [];
                    sacramentMap[c.person_id].push({ type: 'Confirmation', date: c.confirmation_date, record: c });
                });
            }
            if (communionsRes.success) {
                communionsRes.data?.forEach(c => {
                    if (!sacramentMap[c.person_id]) sacramentMap[c.person_id] = [];
                    sacramentMap[c.person_id].push({ type: 'Communion', date: c.communion_date, record: c });
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
        if (!validateForm()) return;

        try {
            const requestData = {
                ...formData,
                household_id: formData.household_id === '' ? null : formData.household_id,
            };
            let response;
            if (isEditMode && editingId) {
                response = await personAPI.updatePerson(editingId, requestData);
            } else {
                response = await personAPI.createPerson(requestData);
            }
            
            const data = response.data;

            if (data.success) {
                setOpenDialog(false);
                resetForm();
                fetchRecords();
                setError('');
            } else {
                setError((isEditMode ? 'Failed to update record: ' : 'Failed to add record: ') + (data.message || ''));
            }
        } catch (err) {
            setError((isEditMode ? 'Error updating record: ' : 'Error adding record: ') + (err.response?.data?.message || err.message));
        }
    };

    const handleOpenEdit = (person) => {
        setFormData({
            first_name: person.first_name || '',
            middle_name: person.middle_name || '',
            last_name: person.last_name || '',
            suffix: person.suffix || '',
            gender: person.gender || 'Male',
            birth_date: person.birth_date || '',
            birth_place: person.birth_place || '',
            address: person.address || '',
            contact_no: person.contact_no || '',
            email: person.email || '',
            civil_status: person.civil_status || 'Single',
            is_alive: Number(person.is_alive) === 0 ? 0 : 1,
            household_id: person.household_id || '',
            religion: person.religion || 'Roman Catholic',
            nationality: person.nationality || 'Filipino',
            occupation: person.occupation || '',
            priest_license_no: person.priest_license_no || '',
            ordination_date: person.ordination_date || '',
           
        });
        setIsEditMode(true);
        setEditingId(person.person_id);
        setFormErrors({});
        setOpenDialog(true);
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

    const validateForm = () => {
        const errors = {};
        
        if (!formData.first_name?.trim()) errors.first_name = 'First name is required';
        if (!formData.last_name?.trim()) errors.last_name = 'Last name is required';
        if (!formData.birth_date) errors.birth_date = 'Birth date is required';
        if (formData.birth_date && new Date(formData.birth_date) > new Date()) {
            errors.birth_date = 'Birth date cannot be in the future';
        }
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = 'Email format is invalid';
        }
        if (formData.contact_no && !/^[0-9-+() ]*$/.test(formData.contact_no)) {
            errors.contact_no = 'Contact number contains invalid characters';
        }
        
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const resetForm = () => {
        setFormData({
            first_name: '',
            middle_name: '',
            last_name: '',
            suffix: '',
            gender: 'Male',
            birth_date: '',
            birth_place: '',
            address: '',
            contact_no: '',
            email: '',
            civil_status: 'Single',
            is_alive: 1,
            household_id: '',
            religion: 'Roman Catholic',
            nationality: 'Filipino',
            occupation: '',
            priest_license_no: '',
            ordination_date: '',
            
        });
        setFormErrors({});
        setIsEditMode(false);
        setEditingId(null);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'is_alive' ? parseInt(value) : value
        }));
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const compressImage = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    // Resize to max 300x300px while maintaining aspect ratio
                    const maxSize = 300;
                    if (width > height) {
                        if (width > maxSize) {
                            height = (height * maxSize) / width;
                            width = maxSize;
                        }
                    } else {
                        if (height > maxSize) {
                            width = (width * maxSize) / height;
                            height = maxSize;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Convert to base64 with reduced quality (0.7 = 70% quality)
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                    resolve(compressedBase64);
                };
                img.onerror = () => reject(new Error('Failed to load image'));
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
        });
    };

    const handleFileChange = async (e) => {
        const { name, files } = e.target;
        if (files && files[0]) {
            const file = files[0];
            
            // Check file type
            if (!file.type.startsWith('image/')) {
                setError('Please select a valid image file');
                return;
            }
            
            // Check file size (max 5MB before compression)
            if (file.size > 5 * 1024 * 1024) {
                setError('Image file size must be less than 5MB');
                return;
            }
            
            try {
                const compressedBase64 = await compressImage(file);
                setFormData(prev => ({
                    ...prev,
                    [name]: compressedBase64,
                }));
                setError(''); // Clear any previous errors
            } catch (err) {
                setError('Failed to process image: ' + err.message);
            }
        }
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

    const getPersonName = (personId) => {
        const person = records.find((record) => String(record.person_id) === String(personId));
        if (!person) return 'N/A';

        return [person.first_name, person.middle_name, person.last_name, person.suffix]
            .filter(Boolean)
            .join(' ');
    };

    const getSacramentDetail = (key, value) => {
        const personReferenceLabels = {
            person_id: 'person name',
            priest_id: 'priest name',
            groom_id: 'groom name',
            bride_id: 'bride name',
            father_id: 'father name',
            mother_id: 'mother name',
        };
        const joinedNameFields = ['groom_first', 'groom_last', 'bride_first', 'bride_last', 'priest_first', 'priest_last'];

        if (key.endsWith('_id')) {
            if (!personReferenceLabels[key]) return null;
            return { label: personReferenceLabels[key], value: getPersonName(value) };
        }

        if (joinedNameFields.includes(key)) return null;

        return { label: key.replace(/_/g, ' '), value: String(value) };
    };

    const filteredRecords = records.filter(person => {
        const fullName = `${person.first_name} ${person.middle_name || ''} ${person.last_name}`.toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        // Check if name search term matches name
        const nameMatch = searchTerm === '' || fullName.includes(searchLower);
        
        // Check the selected sacrament type
        const sacramentMatch = sacramentSearchTerm === '' || sacraments[person.person_id]?.some(sac => 
            sac.type === sacramentSearchTerm
        ) || false;
        
        return nameMatch && sacramentMatch;
    });

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
                <CircularProgress />
            </Container>
        );
    }

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#edf3f1' }}>
            <Box sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
                px: { xs: 1.5, md: 2 },
                py: { xs: 1.5, md: 3 },
                background: 'linear-gradient(110deg, #123b50 0%, #0b6b68 70%, #d1a557 155%)',
                boxShadow: '0 12px 26px rgba(13, 70, 76, 0.14)',
                gap: 1,
            }}>
                <Container maxWidth="lg" sx={{ px: { xs: 0.5, md: 2 }, display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1.25, sm: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
                    <IconButton
                        onClick={() => navigate('/dashboard')}
                        sx={{
                            backgroundColor: 'rgba(255,255,255,0.14)',
                            color: 'white',
                            p: { xs: 0.75, sm: 1 },
                            '&:hover': {
                                backgroundColor: 'rgba(255,255,255,0.24)',
                            },
                        }}
                    >
                        <ArrowBackIcon sx={{ fontSize: { xs: 18, sm: 24 } }} />
                    </IconButton>
                    <Box>
                        <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: '0.12em', fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>
                            Parish directory
                        </Typography>
                        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, color: 'white', lineHeight: 1.15, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                            People records
                        </Typography>
                    </Box>
                </Box>
                {canCreate('people_records') && (
                    <Button variant="contained" startIcon={<AddIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />} onClick={() => setOpenDialog(true)} sx={{ bgcolor: '#d6a85a', color: '#123b50', '&:hover': { bgcolor: '#e3ba70' }, boxShadow: 'none', py: { xs: 0.7, sm: 1 }, px: { xs: 1.5, sm: 2 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                        Add Person
                    </Button>
                )}
                </Container>
            </Box>

            <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 }, px: { xs: 0.75, md: 2 } }}>
            <Box sx={{ display: 'flex', gap: { xs: 1.25, sm: 2 }, mb: 2.5, p: { xs: 1.25, sm: 2 }, borderRadius: 2.5, bgcolor: '#ffffff', border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 5px 16px rgba(26, 67, 74, 0.05)', flexDirection: { xs: 'column', sm: 'row' } }}>
                <TextField
                    label="Search by name"
                    variant="outlined"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{ flex: 1, '& .MuiInputBase-root': { fontSize: { xs: '0.8rem', sm: '0.875rem' } }, '& .MuiInputLabel-root': { fontSize: { xs: '0.78rem', sm: '0.875rem' } } }}
                    placeholder="Type a name..."
                    size="small"
                />
                <FormControl size="small" sx={{ flex: 1 }}>
                    <InputLabel id="sacrament-search-label">Search by sacrament</InputLabel>
                    <Select
                        labelId="sacrament-search-label"
                        label="Search by sacrament"
                        value={sacramentSearchTerm}
                        onChange={(e) => setSacramentSearchTerm(e.target.value)}
                        sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                    >
                        <MenuItem value="">All Sacraments</MenuItem>
                        <MenuItem value="Baptism">Baptism</MenuItem>
                        <MenuItem value="Marriage">Marriage</MenuItem>
                        <MenuItem value="Confirmation">Confirmation</MenuItem>
                        <MenuItem value="Communion">Communion</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

            {isSmall ? (
                <Grid container spacing={1.25}>
                    {filteredRecords.map(person => (
                        <Grid item xs={12} key={person.person_id}>
                            <Card sx={{ borderRadius: 2.5, border: '1px solid rgba(17, 75, 80, 0.08)', boxShadow: '0 8px 20px rgba(26, 67, 74, 0.05)' }}>
                                <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#123b50', fontSize: { xs: '0.96rem', sm: '1.05rem' } }}>
                                        {person.first_name} {person.last_name}
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontSize: { xs: '0.78rem', sm: '0.85rem' } }}>Age: {getAgeFromBirthDate(person.birth_date)}</Typography>
                                    <Typography variant="body2" sx={{ fontSize: { xs: '0.78rem', sm: '0.85rem' } }}>Status: {person.civil_status}</Typography>
                                    <Typography variant="body2" sx={{ fontSize: { xs: '0.78rem', sm: '0.85rem' } }}>Contact: {person.contact_no || 'N/A'}</Typography>
                                    <Box sx={{ mt: 1.25, display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                                        <Button size="small" onClick={() => handleOpenDetail(person)} sx={{ fontSize: { xs: '0.72rem', sm: '0.8rem' } }}>
                                            Details
                                        </Button>
                                        {canUpdate('people_records') && (
                                            <Button size="small" onClick={() => handleOpenEdit(person)} sx={{ fontSize: { xs: '0.72rem', sm: '0.8rem' } }}>
                                                Edit
                                            </Button>
                                        )}
                                        {canDelete('people_records') && (
                                            <Button size="small" color="error" onClick={() => handleDeleteRecord(person.person_id)} sx={{ fontSize: { xs: '0.72rem', sm: '0.8rem' } }}>
                                                Delete
                                            </Button>
                                        )}
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            ) : (
                <TableContainer component={Paper} sx={{ overflowX: 'auto', borderRadius: 3, border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)' }}>
                    <Table>
                    <TableHead>
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
                        {filteredRecords.map((person) => (
                            <TableRow key={person.person_id} hover>
                                <TableCell sx={{ fontWeight: 700, color: '#123b50' }}>{person.first_name} {person.last_name}</TableCell>
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
                                    <Chip label={Number(person.is_alive) === 1 ? 'Active' : 'Deceased'} color={Number(person.is_alive) === 1 ? 'success' : 'default'} size="small" />
                                </TableCell>
                                <TableCell align="center">
                                    <IconButton size="small" onClick={() => handleOpenDetail(person)} title="View Details" sx={{ color: '#168fa3', '&:hover': { bgcolor: '#e6f4f2' } }}>
                                        <InfoIcon />
                                    </IconButton>
                                    {canUpdate('people_records') && (
                                        <IconButton size="small" onClick={() => handleOpenEdit(person)} title="Edit" sx={{ color: '#d49347', '&:hover': { bgcolor: '#fff4df' } }}>
                                            <EditIcon />
                                        </IconButton>
                                    )}
                                    {canDelete('people_records') && (
                                        <IconButton size="small" onClick={() => handleDeleteRecord(person.person_id)} title="Delete" sx={{ color: '#b75c56', '&:hover': { bgcolor: '#fff0ee' } }}>
                                            <DeleteIcon />
                                        </IconButton>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={openDialog} onClose={() => { setOpenDialog(false); resetForm(); }} maxWidth="sm" fullWidth>
                <DialogTitle>{isEditMode ? 'Edit Person' : 'Add New Person'}</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <TextField 
                        fullWidth 
                        label="First Name" 
                        name="first_name" 
                        value={formData.first_name} 
                        onChange={handleInputChange} 
                        margin="dense" 
                        required 
                        error={!!formErrors.first_name}
                        helperText={formErrors.first_name}
                    />
                    <TextField fullWidth label="Middle Name" name="middle_name" value={formData.middle_name} onChange={handleInputChange} margin="dense" />
                    <TextField 
                        fullWidth 
                        label="Last Name" 
                        name="last_name" 
                        value={formData.last_name} 
                        onChange={handleInputChange} 
                        margin="dense" 
                        required
                        error={!!formErrors.last_name}
                        helperText={formErrors.last_name}
                    />
                    <TextField fullWidth label="Suffix (Jr., Sr., etc.)" name="suffix" value={formData.suffix} onChange={handleInputChange} margin="dense" />
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Gender</InputLabel>
                        <Select name="gender" value={formData.gender} onChange={handleInputChange}>
                            <MenuItem value="Male">Male</MenuItem>
                            <MenuItem value="Female">Female</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField 
                        fullWidth 
                        label="Birth Date" 
                        name="birth_date" 
                        type="date" 
                        value={formData.birth_date} 
                        onChange={handleInputChange} 
                        margin="dense" 
                        InputLabelProps={{ shrink: true }} 
                        required
                        error={!!formErrors.birth_date}
                        helperText={formErrors.birth_date}
                    />
                    <TextField fullWidth label="Birth Place" name="birth_place" value={formData.birth_place} onChange={handleInputChange} margin="dense" />
                    <TextField fullWidth label="Address" name="address" value={formData.address} onChange={handleInputChange} margin="dense" multiline rows={2} />
                    <TextField 
                        fullWidth 
                        label="Contact No" 
                        name="contact_no" 
                        value={formData.contact_no} 
                        onChange={handleInputChange} 
                        margin="dense"
                        error={!!formErrors.contact_no}
                        helperText={formErrors.contact_no}
                    />
                    <TextField 
                        fullWidth 
                        label="Email" 
                        name="email" 
                        type="email" 
                        value={formData.email} 
                        onChange={handleInputChange} 
                        margin="dense" 
                        required
                        error={!!formErrors.email}
                        helperText={formErrors.email}
                    />
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Civil Status</InputLabel>
                        <Select name="civil_status" value={formData.civil_status} onChange={handleInputChange}>
                            <MenuItem value="Single">Single</MenuItem>
                            <MenuItem value="Married">Married</MenuItem>
                            <MenuItem value="Widowed">Widowed</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Status</InputLabel>
                        <Select name="is_alive" value={formData.is_alive} onChange={handleInputChange}>
                            <MenuItem value={1}>Active</MenuItem>
                            <MenuItem value={0}>Deceased</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Household</InputLabel>
                        <Select
                            name="household_id"
                            value={formData.household_id === null ? '' : formData.household_id}
                            label="Household"
                            onChange={handleInputChange}
                        >
                            <MenuItem value="">-- None --</MenuItem>
                            {households.map(h => (
                                <MenuItem key={h.household_id} value={h.household_id}>{h.household_name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField fullWidth label="Religion" name="religion" value={formData.religion} onChange={handleInputChange} margin="dense" />
                    <TextField fullWidth label="Nationality" name="nationality" value={formData.nationality} onChange={handleInputChange} margin="dense" />
                    <TextField fullWidth label="Occupation" name="occupation" value={formData.occupation} onChange={handleInputChange} margin="dense" />
                    <TextField fullWidth label="Priest License No" name="priest_license_no" value={formData.priest_license_no} onChange={handleInputChange} margin="dense" />
                    <TextField fullWidth label="Ordination Date" name="ordination_date" type="date" value={formData.ordination_date} onChange={handleInputChange} margin="dense" InputLabelProps={{ shrink: true }} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setOpenDialog(false); resetForm(); }}>Cancel</Button>
                    <Button onClick={handleAddRecord} variant="contained">{isEditMode ? 'Update' : 'Add'}</Button>
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
                                    <Grid item xs={12}>
                                        <Typography color="textSecondary" sx={{ fontWeight: 600 }}>Full Name</Typography>
                                        <Typography>{selectedPerson.first_name} {selectedPerson.middle_name} {selectedPerson.last_name} {selectedPerson.suffix ? selectedPerson.suffix : ''}</Typography>
                                    </Grid>
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
                                        <Typography color="textSecondary">Birth Place</Typography>
                                        <Typography>{selectedPerson.birth_place}</Typography>
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
                                    <Grid item xs={6}>
                                        <Typography color="textSecondary">Religion</Typography>
                                        <Typography>{selectedPerson.religion}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography color="textSecondary">Nationality</Typography>
                                        <Typography>{selectedPerson.nationality}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography color="textSecondary">Occupation</Typography>
                                        <Typography>{selectedPerson.occupation}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography color="textSecondary">Status</Typography>
                                        <Typography>{Number(selectedPerson.is_alive) === 1 ? 'Active' : 'Deceased'}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography color="textSecondary">Household ID</Typography>
                                        <Typography>{selectedPerson.household_id || 'N/A'}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography color="textSecondary">Priest License No</Typography>
                                        <Typography>{selectedPerson.priest_license_no || 'N/A'}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography color="textSecondary">Ordination Date</Typography>
                                        <Typography>{selectedPerson.ordination_date || 'N/A'}</Typography>
                                    </Grid>
                                    
                                    <Grid item xs={6}>
                                        <Typography color="textSecondary" sx={{ fontSize: '0.85rem', fontStyle: 'italic' }}>Created At</Typography>
                                        <Typography sx={{ fontSize: '0.85rem' }}>{selectedPerson.created_at ? new Date(selectedPerson.created_at).toLocaleString() : 'N/A'}</Typography>
                                    </Grid>
                                </Grid>
                            </Box>
                        )}

                        {tabValue === 1 && (
                            <Box sx={{ mt: 2 }}>
                                {sacraments[selectedPerson.person_id]?.length > 0 ? (
                                    <Box>
                                        {sacraments[selectedPerson.person_id].map((sac, idx) => (
                                            <Card
                                                key={idx}
                                                onClick={() => setSelectedSacrament(sac)}
                                                sx={{ mb: 1, cursor: 'pointer', border: '1px solid transparent', '&:hover': { boxShadow: 3, borderColor: 'primary.main' } }}
                                            >
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
            <Dialog
                open={Boolean(selectedSacrament)}
                onClose={() => setSelectedSacrament(null)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>{selectedSacrament?.type || 'Sacrament'} Details</DialogTitle>
                <DialogContent dividers>
                    {selectedSacrament?.record && Object.entries(selectedSacrament.record).map(([key, value]) => {
                        if (value === null || value === '') return null;

                        const detail = getSacramentDetail(key, value);
                        if (!detail) return null;

                        return (
                            <Box key={key} sx={{ mb: 1.5 }}>
                                <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase' }}>
                                    {detail.label}
                                </Typography>
                                <Typography>{detail.value}</Typography>
                            </Box>
                        );
                    })}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSelectedSacrament(null)}>Close</Button>
                </DialogActions>
            </Dialog>
            </Container>
        </Box>
    );
};

export default PeopleRecords;
