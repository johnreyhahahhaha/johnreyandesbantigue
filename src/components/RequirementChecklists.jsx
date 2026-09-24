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
    Chip,
    Autocomplete,
    Checkbox,
    ListItemText,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import axios from 'axios';
import { usePermission } from '../contexts/PermissionContext';

const API_BASE_URL = 'http://165.22.181.147/api';

const REQUIREMENT_OPTIONS = {
    Baptism: [
        'Birth Certificate / PSA Certificate',
        'Parents\' Marriage Certificate',
        'List of Godparents',
        'Godparents\' Valid IDs',
        'Baptismal Seminar',
        'Parish Clearance',
    ],
    Marriage: [
        'Baptismal Certificate',
        'Confirmation Certificate',
        'Birth Certificate / PSA Certificate',
        'CENOMAR',
        'Marriage License',
        'Marriage Preparation Seminar',
        'Marriage Banns',
        'Valid IDs',
        'List of Witnesses',
    ],
    Confirmation: [
        'Baptismal Certificate',
        'Confirmation Seminar',
        'Sponsor / Godparent Information',
        'Sponsor / Godparent Valid ID',
        'Valid ID',
        'Parish Clearance',
    ],
};

const RequirementChecklists = () => {
    const navigate = useNavigate();
    const { canCreate, canUpdate, canDelete } = usePermission();
    const [checklists, setChecklists] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [applicantDialogOpen, setApplicantDialogOpen] = useState(false);
    const [applicantSearch, setApplicantSearch] = useState('');
    const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);
    const [people, setPeople] = useState([]);
    const [submissionForm, setSubmissionForm] = useState({ person_id: '', category: 'Baptism', check_id: [], status: 'Submitted', notes: '' });
    const [formData, setFormData] = useState({
        category: 'Baptism',
        requirement_name: '',
        is_submitted: false,
        date_submitted: '',
        baptism_id: '',
        marriage_id: '',
        confirmation_id: '',
        record_id: '',
    });
    // lists used for selecting by name instead of id
    const [baptismals, setBaptismals] = useState([]);
    const [marriages, setMarriages] = useState([]);
    const [confirmations, setConfirmations] = useState([]);
    
    const getPersonName = (item) => {
        if (!item) return '';
        // sacraments API returns first_name/last_name for the person involved
        return item.first_name && item.last_name ? `${item.first_name} ${item.last_name}` : 'Unknown';
    };

    const getRelatedLabel = (check) => {
        const cat = check.category;
        const key = `${cat.toLowerCase()}_id`;
        const id = check[key];
        if (!id) return '-';
        let list = [];
        if (cat === 'Baptism') list = baptismals;
        if (cat === 'Marriage') list = marriages;
        if (cat === 'Confirmation') list = confirmations;
        const rec = list.find(r => r[`${cat.toLowerCase()}_id`] == id);
        if (rec) {
            let dateField = cat === 'Marriage' ? rec.marriage_date : (cat === 'Confirmation' ? rec.confirmation_date : rec.baptism_date);
            return `${getPersonName(rec)}${dateField ? ' (' + dateField + ')' : ''}`;
        }
        return id;
    };

    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        fetchChecklists();
        fetchSubmissions();
        fetchSacraments();
        fetchPeople();
    }, []);

    const fetchChecklists = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/requirement-checklists.php`);
            if (response.data.success) {
                setChecklists(response.data.data);
                setError('');
            }
        } catch (err) {
            setError('Error fetching requirement checklists');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchSubmissions = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/requirement-submissions.php`);
            setSubmissions(response.data?.success ? response.data.data || [] : []);
        } catch (err) {
            console.error('Error fetching requirement submissions', err);
            setSubmissions([]);
        }
    };

    const fetchPeople = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/persons.php`);
            setPeople(response.data?.success ? response.data.data || [] : []);
        } catch (err) {
            console.error('Error fetching people', err);
        }
    };

    const handleRecordSubmission = async () => {
        if (!submissionForm.person_id || submissionForm.check_id.length === 0) {
            setError('Select a person and at least one requirement first');
            return;
        }
        try {
            const responses = await Promise.all(submissionForm.check_id.map((checkId) => axios.post(
                `${API_BASE_URL}/requirement-submissions.php`,
                { ...submissionForm, check_id: checkId },
            )));
            const failedResponse = responses.find((response) => !response.data?.success);
            if (failedResponse) throw new Error(failedResponse.data?.message || 'Unable to record submission');
            await fetchSubmissions();
            setSubmissionDialogOpen(false);
            setSubmissionForm({ person_id: '', category: 'Baptism', check_id: [], status: 'Submitted', notes: '' });
            setSuccess(`${responses.length} paper submission${responses.length > 1 ? 's' : ''} recorded`);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Error recording submission');
        }
    };

    const fetchSacraments = async () => {
        try {
            const [baptismRes, marriageRes, confirmRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/sacraments.php?type=baptismal`),
                axios.get(`${API_BASE_URL}/sacraments.php?type=marriage`),
                axios.get(`${API_BASE_URL}/sacraments.php?type=confirmation`),
            ]);

            setBaptismals(baptismRes.data.success ? baptismRes.data.data || [] : []);
            setMarriages(marriageRes.data.success ? marriageRes.data.data || [] : []);
            setConfirmations(confirmRes.data.success ? confirmRes.data.data || [] : []);
        } catch (err) {
            console.error('Error fetching sacraments lists', err);
        }
    };


    const handleOpenDialog = () => {
        setFormData({
            category: 'Baptism',
            requirement_name: '',
            is_submitted: false,
            date_submitted: '',
            baptism_id: '',
            marriage_id: '',
            confirmation_id: '',
            record_id: '',
        });
        setEditingId(null);
        setError('');
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
    };

    const handleOpenEditDialog = (checklist) => {
        setFormData({
            category: checklist.category,
            requirement_name: checklist.requirement_name,
            is_submitted: !!checklist.is_submitted,
            date_submitted: checklist.date_submitted ? checklist.date_submitted.split(' ')[0] : '',
            baptism_id: checklist.baptism_id || '',
            marriage_id: checklist.marriage_id || '',
            confirmation_id: checklist.confirmation_id || '',
            record_id: checklist.record_id || '',
        });
        setEditingId(checklist.isCatalog ? null : checklist.check_id);
        setOpenEditDialog(true);
    };

    const handleCloseEditDialog = () => {
        setOpenEditDialog(false);
    };

    const handleAddChecklist = async () => {
        if (!formData.requirement_name) {
            setError('Please fill in all required fields');
            return;
        }
        try {
            const submitData = {
                ...formData,
                baptism_id: '',
                marriage_id: '',
                confirmation_id: '',
                record_id: ''
            };
            const response = await axios.post(`${API_BASE_URL}/requirement-checklists.php`, submitData);
            if (response.data.success) {
                setSuccess('Requirement checklist created successfully');
                fetchChecklists();
                handleCloseDialog();
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error creating requirement checklist');
        }
    };

    const handleUpdateChecklist = async () => {
        if (!formData.requirement_name) {
            setError('Please fill in all required fields');
            return;
        }
        try {
            const submitData = {
                ...formData,
                baptism_id: '',
                marriage_id: '',
                confirmation_id: '',
                record_id: ''
            };
            const response = editingId
                ? await axios.put(`${API_BASE_URL}/requirement-checklists.php?id=${editingId}`, submitData)
                : await axios.post(`${API_BASE_URL}/requirement-checklists.php`, submitData);
            if (response.data.success) {
                setSuccess('Requirement checklist updated successfully');
                fetchChecklists();
                handleCloseEditDialog();
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error updating requirement checklist');
        }
    };

    const handleDeleteChecklist = async (checkId) => {
        if (window.confirm('Are you sure you want to delete this requirement checklist?')) {
            try {
                const response = await axios.delete(`${API_BASE_URL}/requirement-checklists.php?id=${checkId}`);
                if (response.data.success) {
                    setSuccess('Requirement checklist deleted successfully');
                    fetchChecklists();
                    setTimeout(() => setSuccess(''), 3000);
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Error deleting requirement checklist');
            }
        }
    };

    const handleReviewSubmission = async (submissionId, status) => {
        try {
            const submission = submissions.find((item) => Number(item.submission_id) === Number(submissionId));
            if (!submission) return;
            const response = await axios.put(`${API_BASE_URL}/requirement-submissions.php`, {
                check_id: submission.check_id,
                person_id: submission.person_id,
                status,
                notes: submission.notes || '',
            });
            if (!response.data?.success) throw new Error(response.data?.message || 'Unable to update submission');
            await fetchSubmissions();
            setSuccess(`Requirement marked ${status.toLowerCase()}`);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Error updating submission');
        }
    };

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress />
            </Container>
        );
    }

    const displayChecklists = Object.entries(REQUIREMENT_OPTIONS).flatMap(([category, standardRequirements]) => {
        const categoryItems = checklists.filter((item) => item.category === category);
        const standardItems = standardRequirements.map((name) => categoryItems.find((item) => item.requirement_name === name) || ({
            check_id: `catalog-${category}-${name}`,
            category,
            requirement_name: name,
            is_submitted: false,
            isCatalog: true,
        }));
        const customItems = categoryItems.filter((item) => !standardRequirements.includes(item.requirement_name));
        return [...standardItems, ...customItems];
    });
    const filteredChecklists = displayChecklists.filter((checklist) => {
        const matchesCategory = categoryFilter === 'All' || checklist.category === categoryFilter;
        const matchesSearch = checklist.requirement_name.toLowerCase().includes(searchTerm.trim().toLowerCase());
        return matchesCategory && matchesSearch;
    });
    const baptismChecklists = filteredChecklists.filter(c => c.category === 'Baptism');
    const marriageChecklists = filteredChecklists.filter(c => c.category === 'Marriage');
    const confirmationChecklists = filteredChecklists.filter(c => c.category === 'Confirmation');
    const submissionsByApplicant = submissions.reduce((groups, submission) => {
        const applicantId = String(submission.person_id);
        if (!groups[applicantId]) {
            groups[applicantId] = {
                personId: submission.person_id,
                name: `${submission.first_name || ''} ${submission.last_name || ''}`.trim() || `Person #${submission.person_id}`,
                items: [],
            };
        }
        groups[applicantId].items.push(submission);
        return groups;
    }, {});
    const applicantGroups = Object.values(submissionsByApplicant);
    const filteredApplicantGroups = applicantGroups.filter((applicant) =>
        applicant.name.toLowerCase().includes(applicantSearch.trim().toLowerCase())
    );
    const renderApplicantGroup = (applicant) => {
        const approved = applicant.items.filter((item) => item.status === 'Approved').length;
        const submitted = applicant.items.filter((item) => item.status === 'Submitted').length;
        return (
            <Box key={applicant.personId} sx={{ mb: 2, p: 2, border: '1px solid #dce9e5', borderRadius: 2, bgcolor: '#f8fbfa' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 1, mb: 1.25, flexWrap: 'wrap' }}>
                    <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#123b50' }}>{applicant.name}</Typography>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>{approved} approved Â· {submitted} awaiting review Â· {applicant.items.length} submitted items</Typography>
                    </Box>
                    <Chip label={`${approved}/${applicant.items.length} approved`} size="small" color={approved === applicant.items.length ? 'success' : 'warning'} />
                </Box>
                {applicant.items.map((submission) => (
                    <Box key={submission.submission_id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, py: 1, borderTop: '1px solid #e5eeeb', flexWrap: 'wrap' }}>
                        <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{submission.requirement_name}</Typography>
                            <Typography variant="caption" sx={{ color: '#64748b' }}>{submission.category}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip label={submission.status} size="small" color={submission.status === 'Approved' ? 'success' : submission.status === 'Rejected' ? 'error' : 'warning'} />
                            {canUpdate('requirement_checklists') && submission.status === 'Submitted' && (
                                <>
                                    <Button size="small" variant="contained" color="success" onClick={() => handleReviewSubmission(submission.submission_id, 'Approved')}>Approve</Button>
                                    <Button size="small" variant="outlined" color="error" onClick={() => handleReviewSubmission(submission.submission_id, 'Rejected')}>Reject</Button>
                                </>
                            )}
                        </Box>
                    </Box>
                ))}
            </Box>
        );
    };

    return (
        <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 }, minHeight: '100vh', bgcolor: '#edf3f1' }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Box sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
                mb: 3,
                px: { xs: 2, md: 3 },
                py: { xs: 2, md: 2.5 },
                borderRadius: 3,
                background: 'linear-gradient(110deg, #123b50 0%, #0b6b68 70%, #d1a557 155%)',
                boxShadow: '0 12px 26px rgba(13, 70, 76, 0.14)',
                gap: 1,
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <IconButton
                        onClick={() => navigate('/dashboard')}
                        sx={{
                            backgroundColor: 'rgba(255,255,255,0.14)',
                            color: 'white',
                            '&:hover': { backgroundColor: 'rgba(255,255,255,0.24)' },
                        }}
                        aria-label="Back to dashboard"
                    >
                        <ArrowBackIcon />
                    </IconButton>
                    <Box>
                        <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: '0.12em' }}>
                            Parish services
                        </Typography>
                        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, color: 'white', lineHeight: 1.15 }}>
                            Requirement Checklists
                        </Typography>
                    </Box>
                </Box>
                {canCreate('requirement_checklists') && (
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={handleOpenDialog}
                        sx={{ bgcolor: '#d6a85a', color: '#123b50', '&:hover': { bgcolor: '#e3ba70' }, boxShadow: 'none' }}
                    >
                        Add Checklist
                    </Button>
                )}
            </Box>

            <Card sx={{ mb: 3, borderRadius: 3, border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)' }}>
                <CardContent>
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={12} md={5}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Search requirement"
                                placeholder="e.g. CENOMAR, baptismal certificate"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Filter by sacrament</InputLabel>
                                <Select
                                    value={categoryFilter}
                                    label="Filter by sacrament"
                                    onChange={(event) => setCategoryFilter(event.target.value)}
                                >
                                    <MenuItem value="All">All Sacraments</MenuItem>
                                    <MenuItem value="Baptism">Baptism</MenuItem>
                                    <MenuItem value="Marriage">Marriage</MenuItem>
                                    <MenuItem value="Confirmation">Confirmation</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={3} sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ color: '#64748b' }}>
                                Showing {filteredChecklists.length} of {displayChecklists.length} requirements
                            </Typography>
                        </Grid>
                    </Grid>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 1 }}>
                                <Typography color="textSecondary" gutterBottom>
                                    Total Items
                                </Typography>
                                <Typography variant="h5">{displayChecklists.length}</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Box sx={{ p: 2, bgcolor: '#f3e5f5', borderRadius: 1 }}>
                                <Typography color="textSecondary" gutterBottom>
                                    Baptism Items
                                </Typography>
                                <Typography variant="h5">{baptismChecklists.length}</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Box sx={{ p: 2, bgcolor: '#e8f5e9', borderRadius: 1 }}>
                                <Typography color="textSecondary" gutterBottom>
                                    Marriage Items
                                </Typography>
                                <Typography variant="h5">{marriageChecklists.length}</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Box sx={{ p: 2, bgcolor: '#fff3e0', borderRadius: 1 }}>
                                <Typography color="textSecondary" gutterBottom>
                                    Confirmation Items
                                </Typography>
                                <Typography variant="h5">{confirmationChecklists.length}</Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)', overflow: 'auto' }}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f1f6f5' }}>
                        <TableRow>
                        <TableCell><strong>Check ID</strong></TableCell>
                        <TableCell><strong>Category</strong></TableCell>
                        <TableCell><strong>Requirement / Document</strong></TableCell>
                        <TableCell align="center"><strong>Actions</strong></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {filteredChecklists.length > 0 ? (
                        filteredChecklists.map((checklist) => (
                            <TableRow key={checklist.check_id} hover>
                                <TableCell>{checklist.check_id}</TableCell>
                                <TableCell>{checklist.category}</TableCell>
                                <TableCell>{checklist.requirement_name}</TableCell>
                                <TableCell align="center">
                                    {canUpdate('requirement_checklists') && (
                                        <IconButton
                                            color="primary"
                                            size="small"
                                            onClick={() => handleOpenEditDialog(checklist)}
                                        >
                                            <EditIcon />
                                        </IconButton>
                                    )}
                                    {canDelete('requirement_checklists') && !checklist.isCatalog && (
                                        <IconButton
                                            color="error"
                                            size="small"
                                            onClick={() => handleDeleteChecklist(checklist.check_id)}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                                No requirements match your filter
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={applicantDialogOpen} onClose={() => setApplicantDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ fontWeight: 800, color: '#123b50' }}>All Applicant Submissions</DialogTitle>
                <DialogContent dividers>
                    <TextField
                        fullWidth
                        size="small"
                        label="Search applicant"
                        placeholder="Type a person name"
                        value={applicantSearch}
                        onChange={(event) => setApplicantSearch(event.target.value)}
                        sx={{ mb: 2 }}
                    />
                    {filteredApplicantGroups.length > 0 ? filteredApplicantGroups.map(renderApplicantGroup) : (
                        <Typography variant="body2" sx={{ color: '#64748b' }}>No applicant matches your search.</Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setApplicantDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={submissionDialogOpen} onClose={() => setSubmissionDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Record Paper Submission</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>
                        I-record ang papel na personal na ipinasa sa parish office. Walang file upload na kailangan.
                    </Typography>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Person</InputLabel>
                        <Select
                            value={submissionForm.person_id}
                            label="Person"
                            onChange={(event) => setSubmissionForm({ ...submissionForm, person_id: event.target.value })}
                        >
                            {people.map((person) => (
                                <MenuItem key={person.person_id} value={person.person_id}>
                                    {person.first_name} {person.last_name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Sacrament</InputLabel>
                        <Select
                            value={submissionForm.category}
                            label="Sacrament"
                            onChange={(event) => setSubmissionForm({ ...submissionForm, category: event.target.value, check_id: [] })}
                        >
                            {Object.keys(REQUIREMENT_OPTIONS).map((category) => <MenuItem key={category} value={category}>{category}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Requirement</InputLabel>
                        <Select
                            multiple
                            value={submissionForm.check_id}
                            label="Requirement"
                            renderValue={(selected) => selected.map((checkId) => {
                                const checklist = checklists.find((item) => item.check_id === checkId);
                                return checklist?.requirement_name || checkId;
                            }).join(', ')}
                            onChange={(event) => setSubmissionForm({ ...submissionForm, check_id: event.target.value })}
                        >
                            {checklists.filter((checklist) => checklist.category === submissionForm.category).map((checklist) => (
                                <MenuItem key={checklist.check_id} value={checklist.check_id}>
                                    <Checkbox checked={submissionForm.check_id.includes(checklist.check_id)} size="small" />
                                    <ListItemText primary={checklist.requirement_name} />
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Status</InputLabel>
                        <Select
                            value={submissionForm.status}
                            label="Status"
                            onChange={(event) => setSubmissionForm({ ...submissionForm, status: event.target.value })}
                        >
                            <MenuItem value="Submitted">Submitted for review</MenuItem>
                            <MenuItem value="Rejected">Rejected / needs correction</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        margin="normal"
                        label="Note"
                        placeholder="Halimbawa: Kulang ang valid ID ng godparent."
                        value={submissionForm.notes}
                        onChange={(event) => setSubmissionForm({ ...submissionForm, notes: event.target.value })}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSubmissionDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleRecordSubmission} variant="contained">Save</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Add Requirement Checklist</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Category</InputLabel>
                        <Select
                            value={formData.category}
                            onChange={(e) => {
                                const newCat = e.target.value;
                                setFormData({
                                    ...formData,
                                    category: newCat,
                                    baptism_id: '',
                                    marriage_id: '',
                                    confirmation_id: '',
                                    record_id: ''
                                });
                            }}
                            label="Category"
                        >
                            <MenuItem value="Baptism">Baptism</MenuItem>
                            <MenuItem value="Marriage">Marriage</MenuItem>
                            <MenuItem value="Confirmation">Confirmation</MenuItem>
                        </Select>
                    </FormControl>
                    <Autocomplete
                        freeSolo
                        fullWidth
                        options={REQUIREMENT_OPTIONS[formData.category]}
                        value={formData.requirement_name}
                        onChange={(_, value) => setFormData({ ...formData, requirement_name: value || '' })}
                        onInputChange={(_, value) => setFormData({ ...formData, requirement_name: value })}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                margin="normal"
                                label="Requirement"
                                placeholder="Piliin o ilagay ang kailangang dokumento/proseso"
                                helperText="Requirement lamang ang ilagay, hindi pangalan ng tao."
                                required
                            />
                        )}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleAddChecklist} variant="contained" color="primary">
                        Add
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openEditDialog} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Edit Requirement Checklist</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Category</InputLabel>
                        <Select
                            value={formData.category}
                            onChange={(e) => {
                                const newCat = e.target.value;
                                setFormData(prev => ({
                                    ...prev,
                                    category: newCat,
                                    baptism_id: '',
                                    marriage_id: '',
                                    confirmation_id: '',
                                    record_id: ''
                                }));
                            }}
                            label="Category"
                        >
                            <MenuItem value="Baptism">Baptism</MenuItem>
                            <MenuItem value="Marriage">Marriage</MenuItem>
                            <MenuItem value="Confirmation">Confirmation</MenuItem>
                        </Select>
                    </FormControl>
                    <Autocomplete
                        freeSolo
                        fullWidth
                        options={REQUIREMENT_OPTIONS[formData.category]}
                        value={formData.requirement_name}
                        onChange={(_, value) => setFormData({ ...formData, requirement_name: value || '' })}
                        onInputChange={(_, value) => setFormData({ ...formData, requirement_name: value })}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                margin="normal"
                                label="Requirement"
                                placeholder="Piliin o ilagay ang kailangang dokumento/proseso"
                                helperText="Requirement lamang ang ilagay, hindi pangalan ng tao."
                                required
                            />
                        )}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseEditDialog}>Cancel</Button>
                    <Button onClick={handleUpdateChecklist} variant="contained" color="primary">
                        Update
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default RequirementChecklists;
