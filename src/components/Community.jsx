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
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Group as GroupIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import axios from 'axios';
import { usePermission } from '../contexts/PermissionContext';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = 'http://165.22.181.147/api';

const Community = () => {
    const navigate = useNavigate();
    const { canCreate, canDelete } = usePermission();
    const { user } = useAuth();
    const [volunteers, setVolunteers] = useState([]);
    const [ministries, setMinistries] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [communityAid, setCommunityAid] = useState([]);
    const [communityActivities, setCommunityActivities] = useState([]);
    const [activityParticipants, setActivityParticipants] = useState([]);
    const [households, setHouseholds] = useState([]);
    const [rolePermissions, setRolePermissions] = useState([]);
    const [persons, setPersons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(0);
    const [openDialog, setOpenDialog] = useState(false);
    const [openHouseholdDialog, setOpenHouseholdDialog] = useState(false);
    const [openPermissionDialog, setOpenPermissionDialog] = useState(false);
    const [openMinistryDialog, setOpenMinistryDialog] = useState(false);
    const [openProgramDialog, setOpenProgramDialog] = useState(false);
    const [openAidDialog, setOpenAidDialog] = useState(false);
    const [openActivityDialog, setOpenActivityDialog] = useState(false);
    const [openMembersDialog, setOpenMembersDialog] = useState(false);
    const [openParticipantsDialog, setOpenParticipantsDialog] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState(null);
    const [editingParticipant, setEditingParticipant] = useState(null);
    const [participantData, setParticipantData] = useState({ person_ids: [], attendee_names: '', participant_role: 'Participant', status: 'Registered' });
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [selectedHouseholdName, setSelectedHouseholdName] = useState('');
    const [error, setError] = useState('');
    const [availablePermissions, setAvailablePermissions] = useState([]);
    const [formData, setFormData] = useState({
        volunteer_person_id: '',
        ministry_id: '',
        role: '',
        date_joined: new Date().toISOString().split('T')[0],
        status: 'Active',
    });
    const [householdData, setHouseholdData] = useState({
        household_name: '',
        address: '',
        barangay_area: '',
        contact_number: '',
    });
    const [permissionData, setPermissionData] = useState({
        role_name: '',
        perm_id: '',
    });
    const [ministryData, setMinistryData] = useState({
        ministry_name: '',
    });
    const [programData, setProgramData] = useState({
        program_name: '',
        objective: '',
        budget: '',
    });
    const [aidData, setAidData] = useState({
        program_id: '',
        person_id: '',
        aid_received: '',
        date_given: new Date().toISOString().split('T')[0],
    });
    const [activityData, setActivityData] = useState({
        activity_name: '',
        activity_type: 'combined',
        description: '',
        ministry_id: '',
        program_id: '',
        coordinator_id: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        status: 'planned',
        budget_allocated: '',
        beneficiaries_target: '',
    });

    const isAdmin = user?.user_role === 'Admin';
    const tabLabels = ['Community Activities', 'Volunteers', 'Ministries', 'Programs', 'Community Aid', 'Households', ...(isAdmin ? ['Role Permissions'] : [])];

    useEffect(() => {
        fetchAllData();
    }, [isAdmin, user?.user_id]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [volunteersRes, ministriesRes, programsRes, aidRes, personsRes, householdsRes, rolesRes, activitiesRes, participantsRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/community.php?type=volunteers`),
                axios.get(`${API_BASE_URL}/community.php?type=ministries`),
                axios.get(`${API_BASE_URL}/community.php?type=programs`),
                axios.get(`${API_BASE_URL}/community.php?type=community_aid`),
                axios.get(`${API_BASE_URL}/persons.php`),
                axios.get(`${API_BASE_URL}/households.php`),
                isAdmin
                    ? axios.get(`${API_BASE_URL}/role_permissions.php?user_id=${user.user_id}`)
                    : Promise.resolve({ data: { success: true, data: [] } }),
                axios.get(`${API_BASE_URL}/community.php?type=activities`),
                axios.get(`${API_BASE_URL}/community-activity-participants.php`),
            ]);

            const volunteersData = volunteersRes.data.success ? volunteersRes.data.data || [] : [];
            const ministriesData = ministriesRes.data.success ? ministriesRes.data.data || [] : [];
            const programsData = programsRes.data.success ? programsRes.data.data || [] : [];
            const aidData = aidRes.data.success ? aidRes.data.data || [] : [];
            const personsData = personsRes.data.success ? personsRes.data.data || [] : [];
            const householdsData = householdsRes.data.success ? householdsRes.data.data || [] : [];
            const rolesData = rolesRes.data.success ? rolesRes.data.data || [] : [];
            const activitiesData = activitiesRes.data.success ? activitiesRes.data.data || [] : [];
            const participantsData = participantsRes.data.success ? participantsRes.data.data || [] : [];

            setCommunityActivities(activitiesData);
            setActivityParticipants(participantsData);
            setVolunteers(volunteersData);
            setMinistries(ministriesData);
            setPrograms(programsData);
            setCommunityAid(aidData);
            setPersons(personsData);
            setHouseholds(householdsData);
            setRolePermissions(rolesData);
            setAvailablePermissions(rolesRes.data.available_permissions || []);
            setError('');
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.response?.statusText || err.message;
            setError('Error fetching data: ' + errorMsg);
            console.error('Community fetch error:', err);
            setCommunityActivities([]);
            setVolunteers([]);
            setMinistries([]);
            setPrograms([]);
            setCommunityAid([]);
            setPersons([]);
            setHouseholds([]);
            setRolePermissions([]);
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

    const getActivityParticipantCount = (communityId) => activityParticipants.filter((item) => Number(item.community_id) === Number(communityId)).length;

    const handleOpenParticipants = (activity) => {
        setSelectedActivity(activity);
        setEditingParticipant(null);
        setParticipantData({ person_ids: [], attendee_names: '', participant_role: 'Participant', status: 'Registered' });
        setOpenParticipantsDialog(true);
    };

    const handleEditParticipant = (participant) => {
        setEditingParticipant(participant);
        setSelectedActivity({ community_id: participant.community_id, activity_name: participant.activity_name });
        setParticipantData({
            person_ids: participant.person_id ? [String(participant.person_id)] : [],
            attendee_names: participant.attendee_name || '',
            participant_role: participant.participant_role || 'Participant',
            status: participant.status || 'Registered',
        });
        setOpenParticipantsDialog(true);
    };

    const handleDeleteParticipant = async (participantId) => {
        if (!window.confirm('Delete this activity participant?')) return;
        try {
            const response = await axios.delete(`${API_BASE_URL}/community-activity-participants.php?participant_id=${participantId}`);
            if (response.data.success) fetchAllData();
            else setError(response.data.message || 'Failed to delete participant');
        } catch (err) {
            setError('Error deleting participant: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleSaveParticipants = async () => {
        const guestNames = participantData.attendee_names.split(/[;\n]+/).map((name) => name.trim()).filter(Boolean);
        const attendees = [
            ...participantData.person_ids.map((person_id) => ({ person_id })),
            ...guestNames.map((attendee_name) => ({ attendee_name })),
        ];
        if (!attendees.length) {
            setError('Select at least one person or enter a guest name');
            return;
        }
        try {
            const response = editingParticipant
                ? await axios.put(`${API_BASE_URL}/community-activity-participants.php`, {
                    participant_id: editingParticipant.participant_id,
                    person_id: participantData.person_ids[0] || null,
                    attendee_name: guestNames[0] || '',
                    participant_role: participantData.participant_role,
                    status: participantData.status,
                })
                : await axios.post(`${API_BASE_URL}/community-activity-participants.php`, {
                community_id: selectedActivity.community_id,
                attendees,
                participant_role: participantData.participant_role,
                status: participantData.status,
            });
            if (response.data.success) {
                setOpenParticipantsDialog(false);
                setEditingParticipant(null);
                fetchAllData();
            } else setError(response.data.message || 'Failed to save participants');
        } catch (err) {
            setError('Error saving participants: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleDeleteHousehold = async (householdId) => {
        if (window.confirm('Delete this household?')) {
            try {
                const response = await axios.delete(`${API_BASE_URL}/households.php?household_id=${householdId}`);
                if (response.data.success) {
                    fetchAllData();
                } else {
                    setError('Failed to delete household');
                }
            } catch (err) {
                setError('Error deleting household: ' + err.message);
            }
        }
    };

    const handleDeletePermission = async (roleName, permId) => {
        if (window.confirm('Remove this permission from the role?')) {
            try {
                const response = await axios.delete(`${API_BASE_URL}/role_permissions.php?role_name=${roleName}&perm_id=${permId}&user_id=${user.user_id}`);
                if (response.data.success) {
                    fetchAllData();
                } else {
                    setError('Failed to remove permission');
                }
            } catch (err) {
                setError('Error removing permission: ' + err.message);
            }
        }
    };

    const handleAddHousehold = async () => {
        if (!householdData.household_name) {
            setError('Please enter household name');
            return;
        }
        try {
            const response = await axios.post(`${API_BASE_URL}/households.php`, householdData);
            if (response.data.success) {
                setOpenHouseholdDialog(false);
                setHouseholdData({
                    household_name: '',
                    address: '',
                    barangay_area: '',
                    contact_number: '',
                });
                fetchAllData();
            } else {
                setError('Failed to add household');
            }
        } catch (err) {
            setError('Error adding household: ' + err.message);
        }
    };

    const handleAddPermission = async () => {
        if (!permissionData.role_name || !permissionData.perm_id) {
            setError('Please select role and permission');
            return;
        }
        try {
            const response = await axios.post(`${API_BASE_URL}/role_permissions.php`, {
                role_name: permissionData.role_name,
                perm_id: permissionData.perm_id,
                user_id: user.user_id,
            });
            if (response.data.success) {
                setOpenPermissionDialog(false);
                setPermissionData({
                    role_name: '',
                    perm_id: '',
                });
                fetchAllData();
            } else {
                setError('Failed to add permission');
            }
        } catch (err) {
            setError('Error adding permission: ' + err.message);
        }
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

    const handleAddMinistry = async () => {
        if (!ministryData.ministry_name) {
            setError('Please enter ministry name');
            return;
        }
        try {
            const response = await axios.post(`${API_BASE_URL}/ministries.php`, {
                ministry_name: ministryData.ministry_name,
            });
            if (response.data.success) {
                setOpenMinistryDialog(false);
                setMinistryData({
                    ministry_name: '',
                });
                fetchAllData();
            } else {
                setError('Failed to add ministry');
            }
        } catch (err) {
            setError('Error adding ministry: ' + err.message);
        }
    };

    const handleAddProgram = async () => {
        if (!programData.program_name || !programData.budget) {
            setError('Please fill all required fields');
            return;
        }
        try {
            const response = await axios.post(`${API_BASE_URL}/community.php?type=programs`, {
                program_name: programData.program_name,
                objective: programData.objective,
                budget: parseFloat(programData.budget),
            });
            if (response.data.success) {
                setOpenProgramDialog(false);
                setProgramData({
                    program_name: '',
                    objective: '',
                    budget: '',
                });
                fetchAllData();
            } else {
                setError('Failed to add program');
            }
        } catch (err) {
            setError('Error adding program: ' + err.message);
        }
    };

    const handleAddActivity = async () => {
        if (!activityData.activity_name) {
            setError('Please enter activity name');
            return;
        }
        try {
            const response = await axios.post(`${API_BASE_URL}/community.php?type=activities`, {
                activity_name: activityData.activity_name,
                activity_type: activityData.activity_type,
                description: activityData.description,
                ministry_id: activityData.ministry_id || null,
                program_id: activityData.program_id || null,
                coordinator_id: activityData.coordinator_id || null,
                start_date: activityData.start_date,
                end_date: activityData.end_date,
                status: activityData.status,
                budget_allocated: parseFloat(activityData.budget_allocated || 0),
                beneficiaries_target: parseInt(activityData.beneficiaries_target || 0),
            });
            if (response.data.success) {
                setOpenActivityDialog(false);
                setActivityData({
                    activity_name: '',
                    activity_type: 'combined',
                    description: '',
                    ministry_id: '',
                    program_id: '',
                    coordinator_id: '',
                    start_date: new Date().toISOString().split('T')[0],
                    end_date: '',
                    status: 'planned',
                    budget_allocated: '',
                    beneficiaries_target: '',
                });
                fetchAllData();
            } else {
                setError('Failed to add activity');
            }
        } catch (err) {
            setError('Error adding activity: ' + err.message);
        }
    };

    const handleAddAid = async () => {
        if (!aidData.program_id || !aidData.person_id || !aidData.aid_received) {
            setError('Please fill all required fields');
            return;
        }
        try {
            const response = await axios.post(`${API_BASE_URL}/social_programs.php`, {
                action: 'add_beneficiary',
                program_id: aidData.program_id,
                person_id: aidData.person_id,
                aid_received: aidData.aid_received,
                date_given: aidData.date_given,
                user_id: user?.user_id,
            });
            if (response.data.success) {
                setOpenAidDialog(false);
                setAidData({
                    program_id: '',
                    person_id: '',
                    aid_received: '',
                    date_given: new Date().toISOString().split('T')[0],
                });
                fetchAllData();
            } else {
                setError('Failed to add beneficiary');
            }
        } catch (err) {
            setError('Error adding beneficiary: ' + err.message);
        }
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
                                Parish life
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 800, color: 'white', mb: 0.5, lineHeight: 1.15 }}>
                                Community
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.78)' }}>
                                People, programs, ministries, and care in one workspace.
                            </Typography>
                            </Box>
                        </Box>
                        {activeTab === 0 && canCreate('community') && (
                            <Button 
                                variant="contained" 
                                startIcon={<AddIcon />}
                                onClick={() => setOpenActivityDialog(true)}
                                sx={{ backgroundColor: '#d6a85a', color: '#123b50', '&:hover': { backgroundColor: '#e3ba70' }, boxShadow: 'none' }}
                            >
                                Add Activity
                            </Button>
                        )}
                        {activeTab === 1 && canCreate('community') && (
                            <Button 
                                variant="contained" 
                                startIcon={<AddIcon />}
                                onClick={() => setOpenDialog(true)}
                                sx={{ backgroundColor: '#d6a85a', color: '#123b50', '&:hover': { backgroundColor: '#e3ba70' }, boxShadow: 'none' }}
                            >
                                Add Volunteer
                            </Button>
                        )}
                        {activeTab === 2 && canCreate('community') && (
                            <Button 
                                variant="contained" 
                                startIcon={<AddIcon />}
                                onClick={() => setOpenMinistryDialog(true)}
                                sx={{ backgroundColor: '#d6a85a', color: '#123b50', '&:hover': { backgroundColor: '#e3ba70' }, boxShadow: 'none' }}
                            >
                                Add Ministry
                            </Button>
                        )}
                        {activeTab === 3 && canCreate('community') && (
                            <Button 
                                variant="contained" 
                                startIcon={<AddIcon />}
                                onClick={() => setOpenProgramDialog(true)}
                                sx={{ backgroundColor: '#d6a85a', color: '#123b50', '&:hover': { backgroundColor: '#e3ba70' }, boxShadow: 'none' }}
                            >
                                Add Program
                            </Button>
                        )}
                        {activeTab === 4 && canCreate('community') && (
                            <Button 
                                variant="contained" 
                                startIcon={<AddIcon />}
                                onClick={() => setOpenAidDialog(true)}
                                sx={{ backgroundColor: '#d6a85a', color: '#123b50', '&:hover': { backgroundColor: '#e3ba70' }, boxShadow: 'none' }}
                            >
                                Add Beneficiary
                            </Button>
                        )}
                        {activeTab === 5 && canCreate('community') && (
                            <Button 
                                variant="contained" 
                                startIcon={<AddIcon />}
                                onClick={() => setOpenHouseholdDialog(true)}
                                sx={{ backgroundColor: '#d6a85a', color: '#123b50', '&:hover': { backgroundColor: '#e3ba70' }, boxShadow: 'none' }}
                            >
                                Add Household
                            </Button>
                        )}
                        {activeTab === 6 && isAdmin && (
                            <Button 
                                variant="contained" 
                                startIcon={<AddIcon />}
                                onClick={() => setOpenPermissionDialog(true)}
                                sx={{ backgroundColor: '#d6a85a', color: '#123b50', '&:hover': { backgroundColor: '#e3ba70' }, boxShadow: 'none' }}
                            >
                                Assign Permission
                            </Button>
                        )}
                    </Box>
                </Container>
            </Box>

            {/* Content Section */}
            <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                {/* Summary Cards */}
                {activeTab === 0 && (
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
                        <Card sx={{ borderTop: '3px solid #168fa3' }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700 }}>
                                    Total Community Activities
                                </Typography>
                                <Typography variant="h5" sx={{ color: '#0891b2', fontWeight: 700 }}>
                                    {communityActivities.length}
                                </Typography>
                            </CardContent>
                        </Card>
                        <Card sx={{ borderTop: '3px solid #25a878' }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700 }}>
                                    Active Activities
                                </Typography>
                                <Typography variant="h5" sx={{ color: '#059669', fontWeight: 700 }}>
                                    {communityActivities.filter(a => a.status === 'active').length}
                                </Typography>
                            </CardContent>
                        </Card>
                        <Card sx={{ borderTop: '3px solid #d49347' }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700 }}>
                                    Total Budget
                                </Typography>
                                <Typography variant="h5" sx={{ color: '#7c3aed', fontWeight: 700 }}>
                                    â‚±{communityActivities.reduce((sum, a) => sum + (parseFloat(a.budget_allocated || 0)), 0).toFixed(2)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Box>
                )}

                <Box sx={{ mb: 3, px: { xs: 1, md: 1.5 }, borderRadius: 2.5, bgcolor: '#ffffff', border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 5px 16px rgba(26, 67, 74, 0.05)', overflow: 'hidden' }}>
                    <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto">
                        {tabLabels.map((label, idx) => (
                            <Tab key={idx} label={label} />
                        ))}
                    </Tabs>
                </Box>

                <TableContainer component={Paper} sx={{ backgroundColor: '#fff', borderRadius: 3, overflow: 'auto', border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)' }}>
                    <Table sx={{ minWidth: 750 }}>
                        <TableHead>
                            <TableRow>
                                {activeTab === 0 && (
                                    <>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Activity Name</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Type</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Coordinator</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Start Date</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Status</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Budget</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Beneficiaries</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Participants</TableCell>
                                    </>
                                )}
                                {activeTab === 1 && (
                                    <>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Person</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Ministry</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Role</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Joined</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Status</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Action</TableCell>
                                    </>
                                )}
                                {activeTab === 2 && (
                                    <>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Ministry Name</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Description</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Volunteers</TableCell>
                                    </>
                                )}
                                {activeTab === 3 && (
                                    <>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Program Name</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Budget</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Beneficiaries</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Status</TableCell>
                                    </>
                                )}
                                {activeTab === 4 && (
                                    <>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Person</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Program</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Aid Received</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Date</TableCell>
                                    </>
                                )}
                                {activeTab === 5 && (
                                    <>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Household Name</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Address</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Barangay</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Contact</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Members</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Action</TableCell>
                                    </>
                                )}
                                {activeTab === 6 && isAdmin && (
                                    <>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Role</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Permission</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Description</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Action</TableCell>
                                    </>
                                )}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {activeTab === 0 && communityActivities && communityActivities.length > 0 ? (
                                communityActivities.map((activity) => (
                                    <TableRow
                                        key={activity.community_id}
                                        sx={{
                                            '&:nth-of-type(odd)': { backgroundColor: '#f8fafc' },
                                            '&:hover': { backgroundColor: '#f1f5f9' },
                                        }}
                                    >
                                        <TableCell sx={{ fontWeight: 500 }}>{activity.activity_name}</TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={activity.activity_type} 
                                                size="small"
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>{activity.coordinator_id ? getPersonName(activity.coordinator_id) : '-'}</TableCell>
                                        <TableCell>{activity.start_date || '-'}</TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={activity.status || 'planned'} 
                                                color={activity.status === 'active' ? 'success' : activity.status === 'completed' ? 'info' : activity.status === 'cancelled' ? 'error' : 'default'}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>â‚±{parseFloat(activity.budget_allocated || 0).toFixed(2)}</TableCell>
                                        <TableCell>{activity.beneficiaries_served || 0}/{activity.beneficiaries_target || 0}</TableCell>
                                        <TableCell>
                                            <Button size="small" startIcon={<GroupIcon />} onClick={() => handleOpenParticipants(activity)}>
                                                {getActivityParticipantCount(activity.community_id)}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : activeTab === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 3, color: '#64748b' }}>
                                        No community activities found
                                    </TableCell>
                                </TableRow>
                            ) : null}

                            {activeTab === 1 && volunteers && volunteers.length > 0 ? (
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
                                            {canDelete('community') && (
                                                <IconButton 
                                                    size="small" 
                                                    color="error"
                                                    onClick={() => handleDeleteVolunteer(record.volunteer_id)}
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : activeTab === 1 ? (
                                <TableRow>
                                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 3, color: '#64748b' }}>
                                        No volunteers found
                                    </TableCell>
                                </TableRow>
                            ) : null}

                            {activeTab === 2 && ministries && ministries.length > 0 ? (
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
                            ) : activeTab === 2 ? (
                                <TableRow>
                                    <TableCell colSpan={3} sx={{ textAlign: 'center', py: 3, color: '#64748b' }}>
                                        No ministries found
                                    </TableCell>
                                </TableRow>
                            ) : null}

                            {activeTab === 3 && programs && programs.length > 0 ? (
                                programs.map((program) => (
                                    <TableRow
                                        key={program.program_id}
                                        sx={{
                                            '&:nth-of-type(odd)': { backgroundColor: '#f8fafc' },
                                            '&:hover': { backgroundColor: '#f1f5f9' },
                                        }}
                                    >
                                        <TableCell>{program.program_name}</TableCell>
                                        <TableCell>â‚±{parseFloat(program.budget || 0).toFixed(2)}</TableCell>
                                        <TableCell>
                                            {communityAid.filter(a => a.program_id === program.program_id).length}
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={program.status || 'Active'} size="small" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : activeTab === 3 ? (
                                <TableRow>
                                    <TableCell colSpan={4} sx={{ textAlign: 'center', py: 3, color: '#64748b' }}>
                                        No programs found
                                    </TableCell>
                                </TableRow>
                            ) : null}

                            {activeTab === 4 && communityAid && communityAid.length > 0 ? (
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
                                        <TableCell>{aid.aid_received || '-'}</TableCell>
                                        <TableCell>{aid.date_given || '-'}</TableCell>
                                    </TableRow>
                                ))
                            ) : activeTab === 4 ? (
                                <TableRow>
                                    <TableCell colSpan={4} sx={{ textAlign: 'center', py: 3, color: '#64748b' }}>
                                        No aid records found
                                    </TableCell>
                                </TableRow>
                            ) : null}

                            {activeTab === 5 && households && households.length > 0 ? (
                                households.map((household) => (
                                    <TableRow
                                        key={household.household_id}
                                        sx={{
                                            '&:nth-of-type(odd)': { backgroundColor: '#f8fafc' },
                                            '&:hover': { backgroundColor: '#f1f5f9' },
                                        }}
                                    >
                                        <TableCell sx={{ fontWeight: 600 }}>{household.household_name}</TableCell>
                                        <TableCell>{household.address || '-'}</TableCell>
                                        <TableCell>{household.barangay_area || '-'}</TableCell>
                                        <TableCell>{household.contact_number || '-'}</TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                icon={<GroupIcon />}
                                                label={persons.filter(p => p.household_id === household.household_id).length}
                                                clickable
                                                onClick={() => {
                                                    const members = persons.filter(p => p.household_id == household.household_id);
                                                    setSelectedMembers(members);
                                                    setSelectedHouseholdName(household.household_name || '');
                                                    setOpenMembersDialog(true);
                                                }}
                                                sx={{ cursor: 'pointer' }}
                                                aria-label={`View members of ${household.household_name || ''}`}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {canDelete('community') && (
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleDeleteHousehold(household.household_id)}
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : activeTab === 5 ? (
                                <TableRow>
                                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 3, color: '#64748b' }}>
                                        No households found
                                    </TableCell>
                                </TableRow>
                            ) : null}

                            {activeTab === 6 && isAdmin && rolePermissions && rolePermissions.length > 0 ? (
                                rolePermissions.map((rp, idx) => (
                                    <TableRow
                                        key={idx}
                                        sx={{
                                            '&:nth-of-type(odd)': { backgroundColor: '#f8fafc' },
                                            '&:hover': { backgroundColor: '#f1f5f9' },
                                        }}
                                    >
                                        <TableCell sx={{ fontWeight: 600 }}>{rp.role_name}</TableCell>
                                        <TableCell>{rp.perm_name || '-'}</TableCell>
                                        <TableCell sx={{ fontSize: '0.85rem' }}>{rp.description || '-'}</TableCell>
                                        <TableCell>
                                            {canDelete('community') && (
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleDeletePermission(rp.role_name, rp.perm_id)}
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : activeTab === 6 && isAdmin ? (
                                <TableRow>
                                    <TableCell colSpan={4} sx={{ textAlign: 'center', py: 3, color: '#64748b' }}>
                                        No role permissions found
                                    </TableCell>
                                </TableRow>
                            ) : null}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Container>

            {/* Add Community Activity Dialog */}
            <Dialog open={openActivityDialog} onClose={() => setOpenActivityDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Community Activity</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <TextField
                        fullWidth
                        label="Activity Name"
                        value={activityData.activity_name}
                        onChange={(e) => setActivityData({ ...activityData, activity_name: e.target.value })}
                        margin="normal"
                    />
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Activity Type</InputLabel>
                        <Select
                            value={activityData.activity_type}
                            onChange={(e) => setActivityData({ ...activityData, activity_type: e.target.value })}
                            label="Activity Type"
                        >
                            <MenuItem value="ministry">Ministry</MenuItem>
                            <MenuItem value="program">Program</MenuItem>
                            <MenuItem value="aid">Aid</MenuItem>
                            <MenuItem value="combined">Combined</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        label="Description"
                        value={activityData.description}
                        onChange={(e) => setActivityData({ ...activityData, description: e.target.value })}
                        margin="normal"
                        multiline
                        rows={2}
                    />
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Ministry (Optional)</InputLabel>
                        <Select
                            value={activityData.ministry_id}
                            onChange={(e) => setActivityData({ ...activityData, ministry_id: e.target.value })}
                            label="Ministry (Optional)"
                        >
                            <MenuItem value="">-- Select Ministry --</MenuItem>
                            {ministries.map((ministry) => (
                                <MenuItem key={ministry.ministry_id} value={ministry.ministry_id}>
                                    {ministry.ministry_name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Program (Optional)</InputLabel>
                        <Select
                            value={activityData.program_id}
                            onChange={(e) => setActivityData({ ...activityData, program_id: e.target.value })}
                            label="Program (Optional)"
                        >
                            <MenuItem value="">-- Select Program --</MenuItem>
                            {programs.map((program) => (
                                <MenuItem key={program.program_id} value={program.program_id}>
                                    {program.program_name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Coordinator (Optional)</InputLabel>
                        <Select
                            value={activityData.coordinator_id}
                            onChange={(e) => setActivityData({ ...activityData, coordinator_id: e.target.value })}
                            label="Coordinator (Optional)"
                        >
                            <MenuItem value="">-- Select Coordinator --</MenuItem>
                            {persons.map((person) => (
                                <MenuItem key={person.person_id} value={person.person_id}>
                                    {person.first_name} {person.last_name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        label="Start Date"
                        type="date"
                        value={activityData.start_date}
                        onChange={(e) => setActivityData({ ...activityData, start_date: e.target.value })}
                        margin="normal"
                        InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        fullWidth
                        label="End Date"
                        type="date"
                        value={activityData.end_date}
                        onChange={(e) => setActivityData({ ...activityData, end_date: e.target.value })}
                        margin="normal"
                        InputLabelProps={{ shrink: true }}
                    />
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Status</InputLabel>
                        <Select
                            value={activityData.status}
                            onChange={(e) => setActivityData({ ...activityData, status: e.target.value })}
                            label="Status"
                        >
                            <MenuItem value="planned">Planned</MenuItem>
                            <MenuItem value="active">Active</MenuItem>
                            <MenuItem value="completed">Completed</MenuItem>
                            <MenuItem value="cancelled">Cancelled</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        label="Budget Allocated"
                        type="number"
                        value={activityData.budget_allocated}
                        onChange={(e) => setActivityData({ ...activityData, budget_allocated: e.target.value })}
                        margin="normal"
                    />
                    <TextField
                        fullWidth
                        label="Target Beneficiaries"
                        type="number"
                        value={activityData.beneficiaries_target}
                        onChange={(e) => setActivityData({ ...activityData, beneficiaries_target: e.target.value })}
                        margin="normal"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenActivityDialog(false)}>Cancel</Button>
                    <Button onClick={handleAddActivity} variant="contained">Add Activity</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openParticipantsDialog} onClose={() => setOpenParticipantsDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editingParticipant ? 'Edit Activity Participant' : 'Add Activity Participants'}</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {selectedActivity?.activity_name || 'Community activity'}
                    </Typography>
                    {!editingParticipant && activityParticipants.filter((item) => Number(item.community_id) === Number(selectedActivity?.community_id)).map((participant) => (
                        <Stack key={participant.participant_id} direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                            <Typography variant="body2">
                                {participant.attendee_name || getPersonName(participant.person_id)} ({participant.participant_role})
                            </Typography>
                            <Stack direction="row">
                                <IconButton size="small" onClick={() => handleEditParticipant(participant)}><EditIcon /></IconButton>
                                <IconButton size="small" color="error" onClick={() => handleDeleteParticipant(participant.participant_id)}><DeleteIcon /></IconButton>
                            </Stack>
                        </Stack>
                    ))}
                    <TextField
                        fullWidth
                        select
                        label="Registered Persons (optional)"
                        value={participantData.person_ids}
                        onChange={(event) => setParticipantData((previous) => ({ ...previous, person_ids: event.target.value }))}
                        SelectProps={{ multiple: true, renderValue: (selected) => selected.length ? `${selected.length} person(s) selected` : 'No registered persons selected' }}
                        margin="normal"
                    >
                        {persons.map((person) => (
                            <MenuItem key={person.person_id} value={String(person.person_id)}>
                                {person.first_name} {person.last_name}
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        fullWidth
                        label="Guest Names (no account needed)"
                        value={participantData.attendee_names}
                        onChange={(event) => setParticipantData((previous) => ({ ...previous, attendee_names: event.target.value }))}
                        margin="normal"
                        multiline
                        rows={2}
                        placeholder="One name per line or separated by semicolon"
                    />
                    <TextField
                        fullWidth
                        select
                        label="Participant Role"
                        value={participantData.participant_role}
                        onChange={(event) => setParticipantData((previous) => ({ ...previous, participant_role: event.target.value }))}
                        margin="normal"
                    >
                        <MenuItem value="Participant">Participant</MenuItem>
                        <MenuItem value="Volunteer">Volunteer</MenuItem>
                        <MenuItem value="Coordinator">Coordinator</MenuItem>
                        <MenuItem value="Beneficiary">Beneficiary</MenuItem>
                    </TextField>
                    <TextField
                        fullWidth
                        select
                        label="Status"
                        value={participantData.status}
                        onChange={(event) => setParticipantData((previous) => ({ ...previous, status: event.target.value }))}
                        margin="normal"
                    >
                        <MenuItem value="Registered">Registered</MenuItem>
                        <MenuItem value="Present">Present</MenuItem>
                        <MenuItem value="Absent">Absent</MenuItem>
                        <MenuItem value="Completed">Completed</MenuItem>
                    </TextField>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenParticipantsDialog(false)}>Cancel</Button>
                    <Button onClick={handleSaveParticipants} variant="contained">Save Participants</Button>
                </DialogActions>
            </Dialog>

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

            {/* Add Household Dialog */}
            <Dialog open={openHouseholdDialog} onClose={() => setOpenHouseholdDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Household</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <TextField
                        fullWidth
                        label="Household Name"
                        value={householdData.household_name}
                        onChange={(e) => setHouseholdData({ ...householdData, household_name: e.target.value })}
                        margin="normal"
                        required
                    />
                    <TextField
                        fullWidth
                        label="Address"
                        value={householdData.address}
                        onChange={(e) => setHouseholdData({ ...householdData, address: e.target.value })}
                        margin="normal"
                        multiline
                        rows={2}
                    />
                    <TextField
                        fullWidth
                        label="Barangay Area"
                        value={householdData.barangay_area}
                        onChange={(e) => setHouseholdData({ ...householdData, barangay_area: e.target.value })}
                        margin="normal"
                    />
                    <TextField
                        fullWidth
                        label="Contact Number"
                        value={householdData.contact_number}
                        onChange={(e) => setHouseholdData({ ...householdData, contact_number: e.target.value })}
                        margin="normal"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenHouseholdDialog(false)}>Cancel</Button>
                    <Button onClick={handleAddHousehold} variant="contained">Add Household</Button>
                </DialogActions>
            </Dialog>

            {/* Assign Role Permission Dialog */}
            <Dialog open={openPermissionDialog && isAdmin} onClose={() => setOpenPermissionDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Assign Permission to Role</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Role</InputLabel>
                        <Select
                            value={permissionData.role_name}
                            onChange={(e) => setPermissionData({ ...permissionData, role_name: e.target.value })}
                            label="Role"
                        >
                            <MenuItem value="">-- Select Role --</MenuItem>
                            <MenuItem value="Admin">Admin</MenuItem>
                            <MenuItem value="Priest">Priest</MenuItem>
                            <MenuItem value="Secretary">Secretary</MenuItem>
                            <MenuItem value="Treasurer">Treasurer</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Permission</InputLabel>
                        <Select
                            value={permissionData.perm_id}
                            onChange={(e) => setPermissionData({ ...permissionData, perm_id: e.target.value })}
                            label="Permission"
                        >
                            <MenuItem value="">-- Select Permission --</MenuItem>
                            {availablePermissions.map((perm) => (
                                <MenuItem key={perm.perm_id} value={perm.perm_id}>
                                    {perm.perm_name} - {perm.description}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenPermissionDialog(false)}>Cancel</Button>
                    <Button onClick={handleAddPermission} variant="contained">Assign Permission</Button>
                </DialogActions>
            </Dialog>

            {/* Members Dialog */}
            <Dialog open={openMembersDialog} onClose={() => setOpenMembersDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Members â€” {selectedHouseholdName || ''}</DialogTitle>
                <DialogContent dividers>
                    {selectedMembers && selectedMembers.length > 0 ? (
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Contact</TableCell>
                                    <TableCell>Household ID</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {selectedMembers.map((m) => (
                                    <TableRow key={m.person_id} hover>
                                        <TableCell>{m.first_name} {m.middle_name || ''} {m.last_name}</TableCell>
                                        <TableCell>{m.contact_no || '-'}</TableCell>
                                        <TableCell>{m.household_id || '-'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <Typography>No members assigned to this household.</Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenMembersDialog(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Add Ministry Dialog */}
            <Dialog open={openMinistryDialog} onClose={() => setOpenMinistryDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Ministry</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <TextField
                        autoFocus
                        fullWidth
                        label="Ministry Name"
                        value={ministryData.ministry_name}
                        onChange={(e) => setMinistryData({ ...ministryData, ministry_name: e.target.value })}
                        margin="normal"
                        required
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenMinistryDialog(false)}>Cancel</Button>
                    <Button onClick={handleAddMinistry} variant="contained">Add Ministry</Button>
                </DialogActions>
            </Dialog>

            {/* Add Program Dialog */}
            <Dialog open={openProgramDialog} onClose={() => setOpenProgramDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Program</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <TextField
                        autoFocus
                        fullWidth
                        label="Program Name"
                        value={programData.program_name}
                        onChange={(e) => setProgramData({ ...programData, program_name: e.target.value })}
                        margin="normal"
                        required
                    />
                    <TextField
                        fullWidth
                        label="Objective"
                        value={programData.objective}
                        onChange={(e) => setProgramData({ ...programData, objective: e.target.value })}
                        margin="normal"
                        multiline
                        rows={3}
                    />
                    <TextField
                        fullWidth
                        label="Budget"
                        type="number"
                        value={programData.budget}
                        onChange={(e) => setProgramData({ ...programData, budget: e.target.value })}
                        margin="normal"
                        required
                        InputProps={{
                            startAdornment: <span>â‚±</span>,
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenProgramDialog(false)}>Cancel</Button>
                    <Button onClick={handleAddProgram} variant="contained">Add Program</Button>
                </DialogActions>
            </Dialog>

            {/* Add Beneficiary Dialog */}
            <Dialog open={openAidDialog} onClose={() => setOpenAidDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Beneficiary</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Program</InputLabel>
                        <Select
                            value={aidData.program_id}
                            onChange={(e) => setAidData({ ...aidData, program_id: e.target.value })}
                            label="Program"
                            required
                        >
                            <MenuItem value="">-- Select Program --</MenuItem>
                            {programs.map((program) => (
                                <MenuItem key={program.program_id} value={program.program_id}>
                                    {program.program_name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Person</InputLabel>
                        <Select
                            value={aidData.person_id}
                            onChange={(e) => setAidData({ ...aidData, person_id: e.target.value })}
                            label="Person"
                            required
                        >
                            <MenuItem value="">-- Select Person --</MenuItem>
                            {persons.map((person) => (
                                <MenuItem key={person.person_id} value={person.person_id}>
                                    {person.first_name} {person.last_name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        label="Aid Received"
                        value={aidData.aid_received}
                        onChange={(e) => setAidData({ ...aidData, aid_received: e.target.value })}
                        margin="normal"
                        required
                        multiline
                        rows={3}
                        placeholder="Describe the aid provided (e.g., Food assistance, Medical help, Financial support)"
                    />
                    <TextField
                        fullWidth
                        label="Date Given"
                        type="date"
                        value={aidData.date_given}
                        onChange={(e) => setAidData({ ...aidData, date_given: e.target.value })}
                        margin="normal"
                        required
                        InputLabelProps={{
                            shrink: true,
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAidDialog(false)}>Cancel</Button>
                    <Button onClick={handleAddAid} variant="contained">Add Beneficiary</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Community;
