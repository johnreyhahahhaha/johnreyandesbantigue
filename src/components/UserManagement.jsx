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
} from '@mui/material';
import { Add as AddIcon, Lock as LockIcon } from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = 'http://localhost/josephus/st.joseph/public/api';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
    const [error, setError] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        user_role: 'Secretary',
        person_id: '',
    });
    const [passwordData, setPasswordData] = useState({
        new_password: '',
        confirm_password: '',
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/users.php`);
            
            if (response.data.success) {
                setUsers(response.data.data);
                setError('');
            } else {
                setError('Failed to fetch users: ' + (response.data.message || 'Unknown error'));
                setUsers([]);
            }
        } catch (err) {
            setError('Error fetching users: ' + (err.response?.data?.message || err.message));
            console.error('Fetch error:', err);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const getRoleColor = (role) => {
        switch (role) {
            case 'Admin':
                return 'error';
            case 'Priest':
                return 'warning';
            case 'Secretary':
                return 'info';
            case 'Treasurer':
                return 'success';
            default:
                return 'default';
        }
    };

    const handleAddUser = async () => {
        if (!formData.username || !formData.password || !formData.person_id) {
            setError('Please fill in all required fields');
            return;
        }

        try {
            const response = await axios.post(`${API_BASE_URL}/users.php`, formData);
            const data = response.data;

            if (data.success) {
                setOpenDialog(false);
                setFormData({
                    username: '',
                    password: '',
                    user_role: 'Secretary',
                    person_id: '',
                });
                fetchUsers();
            } else {
                setError('Failed to add user: ' + (data.message || 'Unknown error'));
            }
        } catch (err) {
            setError('Error adding user: ' + err.message);
        }
    };

    const handleChangePassword = async () => {
        if (passwordData.new_password !== passwordData.confirm_password) {
            setError('Passwords do not match');
            return;
        }

        if (!passwordData.new_password) {
            setError('Please enter a new password');
            return;
        }

        try {
            const response = await axios.put(`${API_BASE_URL}/users.php`, {
                user_id: selectedUser.user_id,
                password: passwordData.new_password,
            });
            const data = response.data;

            if (data.success) {
                setOpenPasswordDialog(false);
                setPasswordData({
                    new_password: '',
                    confirm_password: '',
                });
                setError('');
                fetchUsers();
            } else {
                setError('Failed to change password');
            }
        } catch (err) {
            setError('Error changing password: ' + err.message);
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
                                User Management
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#64748b' }}>
                                Manage system user accounts and permissions
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
                            Add User
                        </Button>
                    </Box>
                </Container>
            </Box>

            {/* Content Section */}
            <Container maxWidth="lg" sx={{ py: 4 }}>
                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                <TableContainer component={Paper} sx={{ backgroundColor: '#fff', borderRadius: 1, overflow: 'auto' }}>
                    <Table sx={{ minWidth: 750 }}>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>ID</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Username</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Person Name</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Role</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Last Login</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {users && users.length > 0 ? (
                                users.map((user) => (
                                    <TableRow 
                                        key={user.user_id}
                                        sx={{
                                            '&:nth-of-type(odd)': { backgroundColor: '#f8fafc' },
                                            '&:hover': { backgroundColor: '#f1f5f9' },
                                            transition: 'background-color 0.2s ease'
                                        }}
                                    >
                                        <TableCell>{user.user_id || '-'}</TableCell>
                                        <TableCell sx={{ fontWeight: 500 }}>{user.username || '-'}</TableCell>
                                        <TableCell>{`${user.first_name || ''} ${user.last_name || ''}`.trim() || '-'}</TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={user.user_role || '-'} 
                                                color={getRoleColor(user.user_role)}
                                                size="small"
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>{user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}</TableCell>
                                        <TableCell>
                                            <Button 
                                                size="small" 
                                                variant="outlined"
                                                startIcon={<LockIcon />}
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setOpenPasswordDialog(true);
                                                }}
                                            >
                                                Reset Password
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 3, color: '#64748b' }}>
                                        No users found
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Container>

            {/* Add User Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add New User</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <TextField
                        fullWidth
                        label="Person ID"
                        type="number"
                        value={formData.person_id}
                        onChange={(e) => setFormData({ ...formData, person_id: e.target.value })}
                        margin="normal"
                        required
                        helperText="Enter the ID of the person from People Records"
                    />
                    <TextField
                        fullWidth
                        label="Username"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        margin="normal"
                        required
                    />
                    <TextField
                        fullWidth
                        label="Password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        margin="normal"
                        required
                    />
                    <FormControl fullWidth margin="normal">
                        <InputLabel>User Role</InputLabel>
                        <Select
                            value={formData.user_role}
                            onChange={(e) => setFormData({ ...formData, user_role: e.target.value })}
                            label="User Role"
                        >
                            <MenuItem value="Admin">Admin</MenuItem>
                            <MenuItem value="Priest">Priest</MenuItem>
                            <MenuItem value="Secretary">Secretary</MenuItem>
                            <MenuItem value="Treasurer">Treasurer</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button onClick={handleAddUser} variant="contained">Add User</Button>
                </DialogActions>
            </Dialog>

            {/* Change Password Dialog */}
            <Dialog open={openPasswordDialog} onClose={() => setOpenPasswordDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Reset Password - {selectedUser?.username}</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        Enter a new password for this user account.
                    </Alert>
                    <TextField
                        fullWidth
                        label="New Password"
                        type="password"
                        value={passwordData.new_password}
                        onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                        margin="normal"
                        required
                    />
                    <TextField
                        fullWidth
                        label="Confirm Password"
                        type="password"
                        value={passwordData.confirm_password}
                        onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                        margin="normal"
                        required
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenPasswordDialog(false)}>Cancel</Button>
                    <Button onClick={handleChangePassword} variant="contained">Change Password</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default UserManagement;
