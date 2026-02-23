import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    Alert,
    CircularProgress,
    Typography,
    Container,
    Grid,
    Paper,
    Divider,
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = 'http://localhost/josephus/st.joseph/public/api';

const SendNotification = () => {
    const [notifType, setNotifType] = useState('Email');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [subject, setSubject] = useState('Notification from St. Joseph Parish');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [persons, setPersons] = useState([]);
    const [selectedPersonId, setSelectedPersonId] = useState('');
    const [loadingPersons, setLoadingPersons] = useState(true);

    // Fetch persons on component mount
    useEffect(() => {
        fetchPersons();
    }, []);

    const fetchPersons = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/persons.php`);
            if (response.data.success) {
                setPersons(response.data.data || []);
            }
        } catch (err) {
            console.error('Error fetching persons:', err);
        } finally {
            setLoadingPersons(false);
        }
    };

    // Handle person selection and auto-populate recipient
    const handlePersonSelect = (personId) => {
        setSelectedPersonId(personId);
        setError('');

        if (!personId) {
            setEmail('');
            setPhone('');
            return;
        }

        const selectedPerson = persons.find(p => p.person_id == personId);
        if (selectedPerson) {
            if (notifType === 'Email') {
                setEmail(selectedPerson.email || '');
            } else {
                setPhone(selectedPerson.contact_no || '');
            }
        }
    };

    // Handle notification type change and auto-populate if person selected
    const handleNotifTypeChange = (value) => {
        setNotifType(value);
        setError('');

        if (selectedPersonId) {
            const selectedPerson = persons.find(p => p.person_id == selectedPersonId);
            if (selectedPerson) {
                if (value === 'Email') {
                    setEmail(selectedPerson.email || '');
                    setPhone('');
                } else {
                    setPhone(selectedPerson.contact_no || '');
                    setEmail('');
                }
            }
        } else {
            setEmail('');
            setPhone('');
        }
    };

    const handleSendNotification = async () => {
        let recipient = '';

        // Determine recipient based on type
        if (notifType === 'Email') {
            recipient = email.trim();
            if (!recipient) {
                if (selectedPersonId) {
                    const person = persons.find(p => p.person_id == selectedPersonId);
                    setError(`⚠️ ${person?.first_name} ${person?.last_name} ay walang email address sa sistema`);
                } else {
                    setError('Mangyaring itype ang email address');
                }
                return;
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(recipient)) {
                setError('Invalid email format. Example: user@gmail.com');
                return;
            }
        } else {
            recipient = phone.trim();
            if (!recipient) {
                if (selectedPersonId) {
                    const person = persons.find(p => p.person_id == selectedPersonId);
                    setError(`⚠️ ${person?.first_name} ${person?.last_name} ay walang phone number sa sistema`);
                } else {
                    setError('Mangyaring itype ang phone number');
                }
                return;
            }
            const phoneRegex = /^(\+63|0)[0-9]{9,10}$/;
            if (!phoneRegex.test(recipient)) {
                setError('Invalid phone format. Example: 09123456789 or +639123456789');
                return;
            }
        }

        if (!message.trim()) {
            setError('Mangyaring itype ang mensahe');
            return;
        }

        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const response = await axios.post(`${API_BASE_URL}/send-notification.php`, {
                notif_type: notifType,
                recipient: recipient,
                subject: subject || 'Notification from St. Joseph Parish',
                message_body: message.trim(),
                person_id: selectedPersonId || null,
            });

            if (response.data.success) {
                setSuccess(`✅ ${notifType} ay matagumpay na nagpadala!`);
                setEmail('');
                setPhone('');
                setMessage('');
                setSubject('Notification from St. Joseph Parish');
                setSelectedPersonId('');
            } else {
                setError(response.data.message || 'Failed to send');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'May error sa pagpadala');
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="sm" sx={{ py: 4 }}>
            <Card elevation={3}>
                <CardContent sx={{ p: 4 }}>
                    <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: 'bold', mb: 3, textAlign: 'center' }}>
                        📬 Magpadala ng Notification
                    </Typography>

                    <Divider sx={{ mb: 3 }} />

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

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        {/* Step 1: Select Person (Optional) */}
                        <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                                STEP 1: Pumili ng Parishioner (Optional)
                            </Typography>
                            <FormControl fullWidth>
                                <InputLabel>Parishioner</InputLabel>
                                <Select
                                    value={selectedPersonId}
                                    onChange={(e) => handlePersonSelect(e.target.value)}
                                    label="Parishioner"
                                    disabled={loading || loadingPersons}
                                >
                                    <MenuItem value="">--- Walang parishioner (Manual Entry) ---</MenuItem>
                                    {persons.map(person => (
                                        <MenuItem key={person.person_id} value={person.person_id}>
                                            {person.first_name} {person.middle_name} {person.last_name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <Typography variant="caption" sx={{ color: '#666', mt: 0.5, display: 'block' }}>
                                Piliin ang parishioner para auto-populate ng contact info, o maniwala nang wala kung gusto mo ng manual entry
                            </Typography>
                        </Box>

                        <Divider />

                        {/* Step 2: Choose Type */}
                        <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                                STEP 2: Piliin ang Uri ng Notification
                            </Typography>
                            <FormControl fullWidth>
                                <InputLabel>Uri ng Notification</InputLabel>
                                <Select
                                    value={notifType}
                                    onChange={(e) => handleNotifTypeChange(e.target.value)}
                                    label="Uri ng Notification"
                                    disabled={loading}
                                >
                                    <MenuItem value="Email">📧 EMAIL</MenuItem>
                                    <MenuItem value="SMS">📱 SMS</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>

                        <Divider />

                        {/* Step 3: Enter Recipient - EMAIL */}
                        {notifType === 'Email' && (
                            <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                                    STEP 3: Itype ang Email Address
                                </Typography>
                                <TextField
                                    fullWidth
                                    label="Email Address"
                                    type="email"
                                    placeholder="example@gmail.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={loading}
                                    variant="outlined"
                                    helperText={selectedPersonId ? `Auto-populated from: ${persons.find(p => p.person_id == selectedPersonId)?.first_name} ${persons.find(p => p.person_id == selectedPersonId)?.last_name}` : 'Itype ang email ng recipient'}
                                />
                            </Box>
                        )}

                        {/* Step 3: Enter Recipient - SMS */}
                        {notifType === 'SMS' && (
                            <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                                    STEP 3: Itype ang Phone Number
                                </Typography>
                                <TextField
                                    fullWidth
                                    label="Phone Number"
                                    type="tel"
                                    placeholder="09123456789"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    disabled={loading}
                                    variant="outlined"
                                    helperText={selectedPersonId ? `Auto-populated from: ${persons.find(p => p.person_id == selectedPersonId)?.first_name} ${persons.find(p => p.person_id == selectedPersonId)?.last_name}` : 'Itype ang phone number ng recipient (09xx o +639xx)'}
                                />
                            </Box>
                        )}

                        <Divider />

                        {/* Step 4: Subject (Email only) */}
                        {notifType === 'Email' && (
                            <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                                    STEP 4: Subject ng Email
                                </Typography>
                                <TextField
                                    fullWidth
                                    label="Email Subject"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    disabled={loading}
                                    variant="outlined"
                                    helperText="Optional"
                                />
                                <Divider sx={{ my: 2 }} />
                            </Box>
                        )}

                        {/* Step Message */}
                        <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                                STEP {notifType === 'Email' ? '5' : '4'}: Mensahe
                            </Typography>
                            <TextField
                                fullWidth
                                label="Message"
                                multiline
                                rows={5}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                disabled={loading}
                                variant="outlined"
                                placeholder="Itype dito ang iyong mensahe..."
                            />
                        </Box>

                        <Divider />

                        {/* Info Box */}
                        <Paper sx={{ p: 2, backgroundColor: '#e3f2fd', border: '1px solid #bbdefb' }}>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                                <strong>ℹ️ Para sa {notifType}:</strong>
                                {notifType === 'Email'
                                    ? ' Ang email ay ipapadala sa email address na itinype mo.'
                                    : ' Ang SMS ay ipapadala sa phone number na itinype mo.'}
                            </Typography>
                            {selectedPersonId && (
                                <Typography variant="body2" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                                    ✓ Parishioner ID tracked: {selectedPersonId}
                                </Typography>
                            )}
                        </Paper>

                        {/* Send Button */}
                        <Button
                            fullWidth
                            variant="contained"
                            color="primary"
                            size="large"
                            onClick={handleSendNotification}
                            disabled={loading}
                            sx={{
                                py: 1.5,
                                fontSize: '1rem',
                                fontWeight: 'bold',
                            }}
                        >
                            {loading ? (
                                <>
                                    <CircularProgress size={20} sx={{ mr: 1 }} />
                                    Nagpapadala...
                                </>
                            ) : (
                                <>
                                    <SendIcon sx={{ mr: 1 }} />
                                    Magpadala ng {notifType}
                                </>
                            )}
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        </Container>
    );
};

export default SendNotification;
