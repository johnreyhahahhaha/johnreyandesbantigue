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
    CircularProgress,
    Alert,
    Typography,
    IconButton,
    Card,
    CardContent,
    Grid,
    Chip,
    MenuItem,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import axios from 'axios';
import { usePermission } from '../contexts/PermissionContext';

const API_BASE_URL = 'http://165.22.181.147/api';

const SeminarAttendance = () => {
    const navigate = useNavigate();
    const { canCreate, canDelete, canUpdate } = usePermission();
    const [attendance, setAttendance] = useState([]);
    const [seminarTypes, setSeminarTypes] = useState([]);
    const [persons, setPersons] = useState([]);
    const [baptisms, setBaptisms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        person_ids: [],
        attendee_names: '',
        seminar_type_id: '',
        seminar_date: new Date().toISOString().split('T')[0],
        status: 'Present',
        related_record_type: '',
        related_record_id: '',
        participant_role: '',
    });

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [attendanceRes, typesRes, personsRes, baptismsRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/seminar-attendance.php`),
                axios.get(`${API_BASE_URL}/seminar-types.php`),
                axios.get(`${API_BASE_URL}/persons.php`),
                axios.get(`${API_BASE_URL}/baptismal-records.php`),
            ]);

            if (attendanceRes.data.success) {
                setAttendance(attendanceRes.data.data || []);
            }
            if (typesRes.data.success) {
                setSeminarTypes(typesRes.data.data || []);
            }
            if (personsRes.data.success) {
                setPersons(personsRes.data.data || []);
            }
            if (baptismsRes.data.success) {
                setBaptisms(baptismsRes.data.data || []);
            }
            setError('');
        } catch (err) {
            setError('Error fetching data: ' + err.message);
            console.error('Full error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (item = null) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                person_ids: item.person_id ? [String(item.person_id)] : [],
                attendee_names: item.attendee_name || '',
                seminar_type_id: item.seminar_type_id || '',
                seminar_date: item.seminar_date || new Date().toISOString().split('T')[0],
                status: item.status || 'Present',
                related_record_type: item.related_record_type || '',
                related_record_id: item.related_record_id || '',
                participant_role: item.participant_role || '',
            });
        } else {
            setEditingItem(null);
            setFormData({
                person_ids: [],
                attendee_names: '',
                seminar_type_id: '',
                seminar_date: new Date().toISOString().split('T')[0],
                status: 'Present',
                related_record_type: '',
                related_record_id: '',
                participant_role: '',
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
        setFormData(prev => ({ ...prev, [name]: name === 'person_ids' ? value : value }));
    };

    const handleSave = async () => {
        const guestNames = formData.attendee_names.split(/[;\n]+/).map(name => name.trim()).filter(Boolean);
        const attendees = [
            ...formData.person_ids.map(personId => ({ person_id: personId })),
            ...guestNames.map(attendee_name => ({ attendee_name })),
        ];
        if (!attendees.length) {
            setError('Select at least one registered person or enter a guest name');
            return;
        }
        if (!formData.seminar_type_id) {
            setError('Seminar type is required');
            return;
        }

        try {
            if (editingItem) {
                const response = await axios.put(`${API_BASE_URL}/seminar-attendance.php`, {
                    attendance_id: editingItem.attendance_id,
                    ...formData,
                    person_id: formData.person_ids[0] || '',
                    attendee_name: guestNames[0] || '',
                });
                if (response.data.success) {
                    setSuccess('Attendance record updated successfully');
                    fetchAllData();
                    handleCloseDialog();
                } else {
                    setError(response.data.message || 'Failed to update attendance');
                }
            } else {
                const response = await axios.post(`${API_BASE_URL}/seminar-attendance.php`, { ...formData, attendees });
                if (response.data.success) {
                    setSuccess('Attendance record created successfully');
                    fetchAllData();
                    handleCloseDialog();
                } else {
                    setError(response.data.message || 'Failed to create attendance');
                }
            }
        } catch (err) {
            setError('Error saving attendance: ' + err.message);
            console.error('Full error:', err);
        }
    };

    const handleDelete = async (attendanceId) => {
        if (!window.confirm('Are you sure you want to delete this attendance record?')) {
            return;
        }

        try {
            const response = await axios.delete(`${API_BASE_URL}/seminar-attendance.php`, {
                data: { attendance_id: attendanceId }
            });
            if (response.data.success) {
                setSuccess('Attendance record deleted successfully');
                fetchAllData();
            } else {
                setError(response.data.message || 'Failed to delete attendance');
            }
        } catch (err) {
            setError('Error deleting attendance: ' + err.message);
        }
    };

    const getPersonName = (personId) => {
        const person = persons.find(p => p.person_id == personId);
        return person ? `${person.first_name} ${person.last_name}` : '-';
    };

    const getAttendeeName = (record) => record.attendee_name || (record.person_id ? getPersonName(record.person_id) : 'Guest');

    const getSeminarName = (seminarTypeId) => {
        const seminar = seminarTypes.find(s => s.seminar_type_id == seminarTypeId);
        return seminar ? seminar.seminar_name : '-';
    };

    const filteredAttendance = attendance.filter(item =>
        getPersonName(item.person_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
        getSeminarName(item.seminar_type_id).toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = {
        total: attendance.length,
        present: attendance.filter(a => a.status === 'Present').length,
        absent: attendance.filter(a => a.status === 'Absent').length,
        excused: attendance.filter(a => a.status === 'Excused').length,
    };

    if (loading) {
        return (
            <Container>
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                    <CircularProgress />
                </Box>
            </Container>
        );
    }

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#edf3f1' }}>
        <Box sx={{ py: { xs: 2.5, md: 3 }, background: 'linear-gradient(110deg, #123b50 0%, #0b6b68 70%, #d1a557 155%)', boxShadow: '0 12px 26px rgba(13, 70, 76, 0.14)' }}>
            <Container maxWidth="lg">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <IconButton onClick={() => navigate('/dashboard')} aria-label="Back to dashboard" sx={{ backgroundColor: 'rgba(255,255,255,0.14)', color: 'white', '&:hover': { backgroundColor: 'rgba(255,255,255,0.24)' } }}><ArrowBackIcon /></IconButton>
                    <Box>
                        <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: '0.12em' }}>Parish formation</Typography>
                        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, color: 'white', lineHeight: 1.15 }}>Seminar Attendance</Typography>
                    </Box>
                </Box>
                {canCreate && <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()} sx={{ bgcolor: '#d6a85a', color: '#123b50', '&:hover': { bgcolor: '#e3ba70' }, boxShadow: 'none' }}>Record Attendance</Button>}
            </Box>
            </Container>
        </Box>
        <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
            <Box sx={{ mb: 3 }}>
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

            {/* Statistics Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ borderRadius: 3, border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)' }}>
                        <CardContent sx={{ p: 2.5 }}>
                            <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700 }}>
                                Total Attendances
                            </Typography>
                            <Typography variant="h5">
                                {stats.total}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ borderRadius: 3, borderTop: '3px solid #25a878', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)' }}>
                        <CardContent sx={{ p: 2.5 }}>
                            <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700 }}>
                                Present
                            </Typography>
                            <Typography variant="h5" sx={{ color: 'success.main' }}>
                                {stats.present}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ borderRadius: 3, borderTop: '3px solid #dc6262', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)' }}>
                        <CardContent sx={{ p: 2.5 }}>
                            <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700 }}>
                                Absent
                            </Typography>
                            <Typography variant="h5" sx={{ color: 'error.main' }}>
                                {stats.absent}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ borderRadius: 3, borderTop: '3px solid #d49347', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)' }}>
                        <CardContent sx={{ p: 2.5 }}>
                            <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700 }}>
                                Excused
                            </Typography>
                            <Typography variant="h5" sx={{ color: 'warning.main' }}>
                                {stats.excused}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Search and Add Button */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2.5, p: 2, borderRadius: 2.5, bgcolor: '#ffffff', border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 5px 16px rgba(26, 67, 74, 0.05)', flexWrap: 'wrap' }}>
                <TextField
                    placeholder="Search attendance..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    size="small"
                    sx={{ flex: 1, minWidth: '200px' }}
                />
            </Box>

            {/* Attendance Table */}
            <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)', overflow: 'auto' }}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f1f6f5' }}>
                        <TableRow>
                            <TableCell>Person</TableCell>
                            <TableCell>Seminar</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Linked Record</TableCell>
                            <TableCell>Role</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredAttendance.length > 0 ? (
                            filteredAttendance.map((record) => (
                                <TableRow key={record.attendance_id}>
                                    <TableCell>
                                        {getAttendeeName(record)}
                                    </TableCell>
                                    <TableCell>
                                        {getSeminarName(record.seminar_type_id)}
                                    </TableCell>
                                    <TableCell>
                                        {record.seminar_date ? new Date(record.seminar_date).toLocaleDateString() : '-'}
                                    </TableCell>
                                    <TableCell>
                                        {record.status}
                                    </TableCell>
                                    <TableCell>
                                        {record.related_record_type && record.related_record_id
                                            ? `${record.related_record_type} #${record.related_record_id}`
                                            : '-'}
                                    </TableCell>
                                    <TableCell>{record.participant_role || '-'}</TableCell>
                                    <TableCell align="right">
                                        {canUpdate && (
                                            <IconButton
                                                size="small"
                                                onClick={() => handleOpenDialog(record)}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        )}
                                        {canDelete && (
                                            <IconButton
                                                size="small"
                                                onClick={() => handleDelete(record.attendance_id)}
                                                color="error"
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} align="center">
                                    No attendance records found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Add/Edit Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingItem ? 'Edit Attendance' : 'Record Attendance'}
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <TextField
                        fullWidth
                        select
                        label="Registered Persons (optional)"
                        name="person_ids"
                        value={formData.person_ids}
                        onChange={handleInputChange}
                        margin="normal"
                        SelectProps={{
                            multiple: true,
                            renderValue: (selected) => {
                                if (!selected.length) return 'No registered persons selected';
                                return `${selected.length} registered person${selected.length === 1 ? '' : 's'} selected`;
                            },
                        }}
                    >
                        <MenuItem disabled value="">
                            No registered persons selected
                        </MenuItem>
                        {persons.map((person) => (
                            <MenuItem key={person.person_id} value={String(person.person_id)}>
                                {person.first_name} {person.last_name}
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        fullWidth
                        label="Guest Names (no account needed)"
                        name="attendee_names"
                        value={formData.attendee_names}
                        onChange={handleInputChange}
                        margin="normal"
                        multiline
                        rows={2}
                        placeholder="One name per line or separated by semicolon"
                    />
                    <TextField
                        fullWidth
                        select
                        label="Seminar"
                        name="seminar_type_id"
                        value={formData.seminar_type_id}
                        onChange={handleInputChange}
                        margin="normal"
                        required
                    >
                        <MenuItem value="">-- Select Seminar --</MenuItem>
                        {seminarTypes.map((type) => (
                            <MenuItem key={type.seminar_type_id} value={String(type.seminar_type_id)}>
                                {type.seminar_name}
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        fullWidth
                        label="Seminar Date"
                        name="seminar_date"
                        type="date"
                        value={formData.seminar_date}
                        onChange={handleInputChange}
                        margin="normal"
                        InputLabelProps={{
                            shrink: true,
                        }}
                    />
                    <TextField
                        fullWidth
                        select
                        label="Status"
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        margin="normal"
                    >
                        <MenuItem value="Present">Present</MenuItem>
                        <MenuItem value="Absent">Absent</MenuItem>
                        <MenuItem value="Excused">Excused</MenuItem>
                    </TextField>
                    <TextField
                        fullWidth
                        select
                        label="Related Record (Optional)"
                        name="related_record_id"
                        value={formData.related_record_id}
                        onChange={(e) => setFormData(prev => ({
                            ...prev,
                            related_record_type: e.target.value ? 'Baptismal' : '',
                            related_record_id: e.target.value,
                        }))}
                        margin="normal"
                    >
                        <MenuItem value="">-- General Seminar --</MenuItem>
                        {baptisms.map((record) => (
                            <MenuItem key={record.baptism_id} value={String(record.baptism_id)}>
                                Baptism #{record.baptism_id} - {getPersonName(record.person_id)} ({record.baptism_date})
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        fullWidth
                        select
                        label="Participant Role (Optional)"
                        name="participant_role"
                        value={formData.participant_role}
                        onChange={handleInputChange}
                        margin="normal"
                    >
                        <MenuItem value="">-- Select Role --</MenuItem>
                        <MenuItem value="Godparent">Godparent</MenuItem>
                        <MenuItem value="Parent">Parent</MenuItem>
                        <MenuItem value="Guardian">Guardian</MenuItem>
                        <MenuItem value="Candidate">Candidate</MenuItem>
                        <MenuItem value="Groom">Groom</MenuItem>
                        <MenuItem value="Bride">Bride</MenuItem>
                    </TextField>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained">
                        {editingItem ? 'Update' : 'Record'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
        </Box>
    );
};

export default SeminarAttendance;
