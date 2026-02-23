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
    Tabs,
    Tab,
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
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = 'http://localhost/josephus/st.joseph/public/api';

const Community = () => {
    const [volunteers, setVolunteers] = useState([]);
    const [ministries, setMinistries] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [communityAid, setCommunityAid] = useState([]);
    const [persons, setPersons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(0);
    const [openDialog, setOpenDialog] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        volunteer_person_id: '',
        ministry_id: '',
        role: '',
        date_joined: new Date().toISOString().split('T')[0],
        status: 'Active',
    });

    const tabLabels = ['Volunteers', 'Ministries', 'Programs', 'Community Aid'];

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [volunteersRes, ministriesRes, programsRes, aidRes, personsRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/community.php?type=volunteers`),
                axios.get(`${API_BASE_URL}/community.php?type=ministries`),
                axios.get(`${API_BASE_URL}/community.php?type=programs`),
                axios.get(`${API_BASE_URL}/community.php?type=community_aid`),
                axios.get(`${API_BASE_URL}/persons.php`),
            ]);

            const volunteersData = volunteersRes.data.success ? volunteersRes.data.data || [] : [];
            const ministriesData = ministriesRes.data.success ? ministriesRes.data.data || [] : [];
            const programsData = programsRes.data.success ? programsRes.data.data || [] : [];
            const aidData = aidRes.data.success ? aidRes.data.data || [] : [];
            const personsData = personsRes.data.success ? personsRes.data.data || [] : [];

            setVolunteers(volunteersData);
            setMinistries(ministriesData);
            setPrograms(programsData);
            setCommunityAid(aidData);
            setPersons(personsData);
            setError('');
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.response?.statusText || err.message;
            setError('Error fetching data: ' + errorMsg);
            console.error('Community fetch error:', err);
            setVolunteers([]);
            setMinistries([]);
            setPrograms([]);
            setCommunityAid([]);
            setPersons([]);
        } finally {
            setLoading(false);
        }
    };

    const getPersonName = (personId) => {
        const person = persons.find(p => p.person_id == personId);
        return person ? `${person.first_name} ${person.last_name}` : 'Unknown';
    };

    const getMinistryName = (ministryId) => {
        const ministry = ministries.find(m => m.ministry_id == ministryId);
        return ministry ? ministry.ministry_name : 'Unknown';
    };

    const getProgramName = (programId) => {
        const program = programs.find(p => p.program_id == programId);
        return program ? program.program_name : 'Unknown';
    };

    const handleAddVolunteer = async () => {
        if (!formData.volunteer_person_id || !formData.ministry_id) {
            setError('Please fill all required fields');
            return;
        }
        try {
            const response = await axios.post(`${API_BASE_URL}/community.php?type=volunteers`, {
                person_id: formData.volunteer_person_id,
                ministry_id: formData.ministry_id,
                role: formData.role,
                date_joined: formData.date_joined,
                status: formData.status,
            });

            if (response.data.success) {
                setOpenDialog(false);
                setFormData({
                    volunteer_person_id: '',
                    ministry_id: '',
                    role: '',
                    date_joined: new Date().toISOString().split('T')[0],
                    status: 'Active',
                });
                fetchAllData();
            } else {
                setError('Failed to add volunteer');
            }
        } catch (err) {
            setError('Error adding volunteer: ' + err.message);
        }
    };

    const handleDeleteVolunteer = async (volunteerId) => {
        if (window.confirm('Remove this volunteer?')) {
            try {
                const response = await axios.delete(`${API_BASE_URL}/community.php?id=${volunteerId}&type=volunteer`);
                if (response.data.success) {
                    fetchAllData();
                } else {
                    setError('Failed to delete volunteer');
                }
            } catch (err) {
                setError('Error deleting volunteer: ' + err.message);
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
                                Community
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#64748b' }}>
                                Manage volunteers, ministries, programs, and community aid
                            </Typography>
                        </Box>
                        {activeTab === 0 && (
                            <Button 
                                variant="contained" 
                                startIcon={<AddIcon />}
                                onClick={() => setOpenDialog(true)}
                                sx={{
                                    backgroundColor: '#1e3a8a',
                                    '&:hover': { backgroundColor: '#1e40af' }
                                }}
                            >
                                Add Volunteer
                            </Button>
                        )}
                    </Box>
                </Container>
            </Box>

            {/* Content Section */}
            <Container maxWidth="lg" sx={{ py: 4 }}>
                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                {/* Summary Cards */}
                {activeTab === 0 && (
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} sm={6} md={4}>
                            <Card sx={{ boxShadow: 1 }}>
                                <CardContent>
                                    <Typography color="textSecondary" gutterBottom>
                                        Total Volunteers
                                    </Typography>
                                    <Typography variant="h5" sx={{ color: '#1e3a8a', fontWeight: 700 }}>
                                        {volunteers.length}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <Card sx={{ boxShadow: 1 }}>
                                <CardContent>
                                    <Typography color="textSecondary" gutterBottom>
                                        Active Ministries
                                    </Typography>
                                    <Typography variant="h5" sx={{ color: '#059669', fontWeight: 700 }}>
                                        {ministries.length}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <Card sx={{ boxShadow: 1 }}>
                                <CardContent>
                                    <Typography color="textSecondary" gutterBottom>
                                        Active Programs
                                    </Typography>
                                    <Typography variant="h5" sx={{ color: '#7c3aed', fontWeight: 700 }}>
                                        {programs.length}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                )}

                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                    <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
                        {tabLabels.map((label, idx) => (
                            <Tab key={idx} label={label} />
                        ))}
                    </Tabs>
                </Box>

                <TableContainer component={Paper} sx={{ backgroundColor: '#fff', borderRadius: 1, overflow: 'auto' }}>
                    <Table sx={{ minWidth: 750 }}>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                {activeTab === 0 && (
                                    <>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Person</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Ministry</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Role</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Joined</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Status</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Action</TableCell>
                                    </>
                                )}
                                {activeTab === 1 && (
                                    <>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Ministry Name</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Description</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Volunteers</TableCell>
                                    </>
                                )}
                                {activeTab === 2 && (
                                    <>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Program Name</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Budget</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Beneficiaries</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Status</TableCell>
                                    </>
                                )}
                                {activeTab === 3 && (
                                    <>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Person</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Program</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Aid Type</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Amount</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Date</TableCell>
                                    </>
                                )}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {activeTab === 0 && volunteers && volunteers.length > 0 ? (
                                volunteers.map((record) => (
                                    <TableRow
                                        key={record.volunteer_id}
                                        sx={{
                                            '&:nth-of-type(odd)': { backgroundColor: '#f8fafc' },
                                            '&:hover': { backgroundColor: '#f1f5f9' },
                                        }}
                                    >
                                        <TableCell>{getPersonName(record.person_id)}</TableCell>
                                        <TableCell>{getMinistryName(record.ministry_id)}</TableCell>
                                        <TableCell>{record.role || '-'}</TableCell>
                                        <TableCell>{record.date_joined || '-'}</TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={record.status || 'Active'} 
                                                color={record.status === 'Active' ? 'success' : 'default'}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <IconButton 
                                                size="small" 
                                                color="error"
                                                onClick={() => handleDeleteVolunteer(record.volunteer_id)}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : activeTab === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 3, color: '#64748b' }}>
                                        No volunteers found
                                    </TableCell>
                                </TableRow>
                            ) : null}

                            {activeTab === 1 && ministries && ministries.length > 0 ? (
                                ministries.map((ministry) => (
                                    <TableRow
                                        key={ministry.ministry_id}
                                        sx={{
                                            '&:nth-of-type(odd)': { backgroundColor: '#f8fafc' },
                                            '&:hover': { backgroundColor: '#f1f5f9' },
                                        }}
                                    >
                                        <TableCell>{ministry.ministry_name}</TableCell>
                                        <TableCell>{ministry.description || '-'}</TableCell>
                                        <TableCell>
                                            {volunteers.filter(v => v.ministry_id === ministry.ministry_id).length}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : activeTab === 1 ? (
                                <TableRow>
                                    <TableCell colSpan={3} sx={{ textAlign: 'center', py: 3, color: '#64748b' }}>
                                        No ministries found
                                    </TableCell>
                                </TableRow>
                            ) : null}

                            {activeTab === 2 && programs && programs.length > 0 ? (
                                programs.map((program) => (
                                    <TableRow
                                        key={program.program_id}
                                        sx={{
                                            '&:nth-of-type(odd)': { backgroundColor: '#f8fafc' },
                                            '&:hover': { backgroundColor: '#f1f5f9' },
                                        }}
                                    >
                                        <TableCell>{program.program_name}</TableCell>
                                        <TableCell>₱{parseFloat(program.budget || 0).toFixed(2)}</TableCell>
                                        <TableCell>
                                            {communityAid.filter(a => a.program_id === program.program_id).length}
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={program.status || 'Active'} size="small" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : activeTab === 2 ? (
                                <TableRow>
                                    <TableCell colSpan={4} sx={{ textAlign: 'center', py: 3, color: '#64748b' }}>
                                        No programs found
                                    </TableCell>
                                </TableRow>
                            ) : null}

                            {activeTab === 3 && communityAid && communityAid.length > 0 ? (
                                communityAid.map((aid) => (
                                    <TableRow
                                        key={aid.aid_id}
                                        sx={{
                                            '&:nth-of-type(odd)': { backgroundColor: '#f8fafc' },
                                            '&:hover': { backgroundColor: '#f1f5f9' },
                                        }}
                                    >
                                        <TableCell>{getPersonName(aid.person_id)}</TableCell>
                                        <TableCell>{getProgramName(aid.program_id)}</TableCell>
                                        <TableCell>{aid.aid_type || '-'}</TableCell>
                                        <TableCell>₱{parseFloat(aid.amount || 0).toFixed(2)}</TableCell>
                                        <TableCell>{aid.date_given || '-'}</TableCell>
                                    </TableRow>
                                ))
                            ) : activeTab === 3 ? (
                                <TableRow>
                                    <TableCell colSpan={5} sx={{ textAlign: 'center', py: 3, color: '#64748b' }}>
                                        No aid records found
                                    </TableCell>
                                </TableRow>
                            ) : null}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Container>

            {/* Add Volunteer Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Volunteer</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Person</InputLabel>
                        <Select
                            value={formData.volunteer_person_id}
                            onChange={(e) => setFormData({ ...formData, volunteer_person_id: e.target.value })}
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
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Ministry</InputLabel>
                        <Select
                            value={formData.ministry_id}
                            onChange={(e) => setFormData({ ...formData, ministry_id: e.target.value })}
                            label="Ministry"
                        >
                            <MenuItem value="">-- Select Ministry --</MenuItem>
                            {ministries.map((ministry) => (
                                <MenuItem key={ministry.ministry_id} value={ministry.ministry_id}>
                                    {ministry.ministry_name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        label="Role"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        margin="normal"
                    />
                    <TextField
                        fullWidth
                        label="Date Joined"
                        type="date"
                        value={formData.date_joined}
                        onChange={(e) => setFormData({ ...formData, date_joined: e.target.value })}
                        margin="normal"
                        InputLabelProps={{ shrink: true }}
                    />
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Status</InputLabel>
                        <Select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            label="Status"
                        >
                            <MenuItem value="Active">Active</MenuItem>
                            <MenuItem value="Inactive">Inactive</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button onClick={handleAddVolunteer} variant="contained">Add</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Community;
