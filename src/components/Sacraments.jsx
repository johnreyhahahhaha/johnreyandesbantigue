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
    CircularProgress,
    Alert,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

const API_BASE_URL = 'http://localhost/josephus/st.joseph/public/api';

const Sacraments = () => {
    const [baptisms, setBaptisms] = useState([]);
    const [marriages, setMarriages] = useState([]);
    const [confirmations, setConfirmations] = useState([]);
    const [persons, setPersons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState(0);
    const [openDialog, setOpenDialog] = useState(false);
    const [dialogType, setDialogType] = useState('baptism');
    const [formData, setFormData] = useState({});

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [baptismRes, marriageRes, confirmRes, personRes] = await Promise.all([
                fetch(`${API_BASE_URL}/sacraments.php?type=baptismal`),
                fetch(`${API_BASE_URL}/sacraments.php?type=marriage`),
                fetch(`${API_BASE_URL}/sacraments.php?type=confirmation`),
                fetch(`${API_BASE_URL}/persons.php`)
            ]);

            // Helper function to safely parse JSON
            const parseJSON = async (response, endpointName) => {
                const text = await response.text();
                console.log(`${endpointName} Response:`, text);
                
                if (!text) {
                    throw new Error(`${endpointName} returned empty response`);
                }
                
                try {
                    return JSON.parse(text);
                } catch (e) {
                    throw new Error(`${endpointName} returned invalid JSON: ${text.substring(0, 100)}`);
                }
            };

            const [baptismData, marriageData, confirmData, personData] = await Promise.all([
                parseJSON(baptismRes, 'Baptisms'),
                parseJSON(marriageRes, 'Marriages'),
                parseJSON(confirmRes, 'Confirmations'),
                parseJSON(personRes, 'Persons')
            ]);

            if (baptismData.success) setBaptisms(baptismData.data || []);
            if (marriageData.success) setMarriages(marriageData.data || []);
            if (confirmData.success) setConfirmations(confirmData.data || []);
            if (personData.success) setPersons(personData.data || []);
            setError('');
        } catch (err) {
            setError('Error fetching data: ' + err.message);
            console.error('Full error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddSacrament = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/sacraments.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, type: dialogType })
            });
            const data = await response.json();

            if (data.success) {
                setOpenDialog(false);
                setFormData({});
                fetchAllData();
            } else {
                setError('Failed to add sacrament');
            }
        } catch (err) {
            setError('Error: ' + err.message);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const getPersonName = (personId) => {
        const person = persons.find(p => p.person_id == personId);
        return person ? `${person.first_name} ${person.last_name}` : 'N/A';
    };

    if (loading) return <CircularProgress />;

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    Sacrament Records
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
                    setDialogType('baptism');
                    setOpenDialog(true);
                }}>
                    Add Sacrament
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tab label={`Baptisms (${baptisms.length})`} />
                <Tab label={`Marriages (${marriages.length})`} />
                <Tab label={`Confirmations (${confirmations.length})`} />
            </Tabs>

            {/* Baptisms Tab */}
            {activeTab === 0 && (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Person</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Baptism Date</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Priest</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Father</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Mother</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Book/Page</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {baptisms.map((b) => (
                                <TableRow key={b.baptism_id} hover>
                                    <TableCell>{getPersonName(b.person_id)}</TableCell>
                                    <TableCell>{b.baptism_date}</TableCell>
                                    <TableCell>{getPersonName(b.priest_id)}</TableCell>
                                    <TableCell>{getPersonName(b.father_id)}</TableCell>
                                    <TableCell>{getPersonName(b.mother_id)}</TableCell>
                                    <TableCell>{b.book_no}/{b.page_no}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Marriages Tab */}
            {activeTab === 1 && (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Groom</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Bride</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Marriage Date</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Priest</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>License</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {marriages.map((m) => (
                                <TableRow key={m.marriage_id} hover>
                                    <TableCell>{getPersonName(m.groom_id)}</TableCell>
                                    <TableCell>{getPersonName(m.bride_id)}</TableCell>
                                    <TableCell>{m.marriage_date}</TableCell>
                                    <TableCell>{getPersonName(m.priest_id)}</TableCell>
                                    <TableCell>{m.license_no}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Confirmations Tab */}
            {activeTab === 2 && (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Person</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Confirmation Date</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Bishop</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Sponsors</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {confirmations.map((c) => (
                                <TableRow key={c.confirmation_id} hover>
                                    <TableCell>{getPersonName(c.person_id)}</TableCell>
                                    <TableCell>{c.confirmation_date}</TableCell>
                                    <TableCell>{c.confirming_bishop}</TableCell>
                                    <TableCell>{c.sponsor_names}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Add Sacrament Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Sacrament Record</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
                        <InputLabel>Sacrament Type</InputLabel>
                        <Select
                            value={dialogType}
                            label="Sacrament Type"
                            onChange={(e) => {
                                setDialogType(e.target.value);
                                setFormData({});
                            }}
                        >
                            <MenuItem value="baptism">Baptism</MenuItem>
                            <MenuItem value="marriage">Marriage</MenuItem>
                            <MenuItem value="confirmation">Confirmation</MenuItem>
                        </Select>
                    </FormControl>

                    {dialogType === 'baptism' && (
                        <>
                            <FormControl fullWidth margin="dense">
                                <InputLabel>Person</InputLabel>
                                <Select
                                    name="person_id"
                                    value={formData.person_id || ''}
                                    label="Person"
                                    onChange={handleInputChange}
                                >
                                    {persons.map((p) => (
                                        <MenuItem key={p.person_id} value={p.person_id}>
                                            {p.first_name} {p.last_name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <TextField fullWidth label="Baptism Date" type="date" name="baptism_date" value={formData.baptism_date || ''} onChange={handleInputChange} margin="dense" InputLabelProps={{ shrink: true }} />
                            <FormControl fullWidth margin="dense">
                                <InputLabel>Priest</InputLabel>
                                <Select
                                    name="priest_id"
                                    value={formData.priest_id || ''}
                                    label="Priest"
                                    onChange={handleInputChange}
                                >
                                    {persons.map((p) => (
                                        <MenuItem key={p.person_id} value={p.person_id}>
                                            {p.first_name} {p.last_name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl fullWidth margin="dense">
                                <InputLabel>Father (Optional)</InputLabel>
                                <Select
                                    name="father_id"
                                    value={formData.father_id || ''}
                                    label="Father (Optional)"
                                    onChange={handleInputChange}
                                >
                                    <MenuItem value="">None</MenuItem>
                                    {persons.map((p) => (
                                        <MenuItem key={p.person_id} value={p.person_id}>
                                            {p.first_name} {p.last_name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl fullWidth margin="dense">
                                <InputLabel>Mother (Optional)</InputLabel>
                                <Select
                                    name="mother_id"
                                    value={formData.mother_id || ''}
                                    label="Mother (Optional)"
                                    onChange={handleInputChange}
                                >
                                    <MenuItem value="">None</MenuItem>
                                    {persons.map((p) => (
                                        <MenuItem key={p.person_id} value={p.person_id}>
                                            {p.first_name} {p.last_name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <TextField fullWidth label="Book No" name="book_no" value={formData.book_no || ''} onChange={handleInputChange} margin="dense" type="number" />
                            <TextField fullWidth label="Page No" name="page_no" value={formData.page_no || ''} onChange={handleInputChange} margin="dense" type="number" />
                        </>
                    )}
                    {dialogType === 'marriage' && (
                        <>
                            <FormControl fullWidth margin="dense">
                                <InputLabel>Groom</InputLabel>
                                <Select
                                    name="groom_id"
                                    value={formData.groom_id || ''}
                                    label="Groom"
                                    onChange={handleInputChange}
                                >
                                    {persons.map((p) => (
                                        <MenuItem key={p.person_id} value={p.person_id}>
                                            {p.first_name} {p.last_name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl fullWidth margin="dense">
                                <InputLabel>Bride</InputLabel>
                                <Select
                                    name="bride_id"
                                    value={formData.bride_id || ''}
                                    label="Bride"
                                    onChange={handleInputChange}
                                >
                                    {persons.map((p) => (
                                        <MenuItem key={p.person_id} value={p.person_id}>
                                            {p.first_name} {p.last_name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <TextField fullWidth label="Marriage Date" type="date" name="marriage_date" value={formData.marriage_date || ''} onChange={handleInputChange} margin="dense" InputLabelProps={{ shrink: true }} />
                            <FormControl fullWidth margin="dense">
                                <InputLabel>Priest</InputLabel>
                                <Select
                                    name="priest_id"
                                    value={formData.priest_id || ''}
                                    label="Priest"
                                    onChange={handleInputChange}
                                >
                                    {persons.map((p) => (
                                        <MenuItem key={p.person_id} value={p.person_id}>
                                            {p.first_name} {p.last_name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <TextField fullWidth label="License No" name="license_no" value={formData.license_no || ''} onChange={handleInputChange} margin="dense" />
                        </>
                    )}
                    {dialogType === 'confirmation' && (
                        <>
                            <FormControl fullWidth margin="dense">
                                <InputLabel>Person</InputLabel>
                                <Select
                                    name="person_id"
                                    value={formData.person_id || ''}
                                    label="Person"
                                    onChange={handleInputChange}
                                >
                                    {persons.map((p) => (
                                        <MenuItem key={p.person_id} value={p.person_id}>
                                            {p.first_name} {p.last_name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <TextField fullWidth label="Confirmation Date" type="date" name="confirmation_date" value={formData.confirmation_date || ''} onChange={handleInputChange} margin="dense" InputLabelProps={{ shrink: true }} />
                            <TextField fullWidth label="Bishop Name" name="confirming_bishop" value={formData.confirming_bishop || ''} onChange={handleInputChange} margin="dense" />
                            <TextField fullWidth label="Sponsors" name="sponsor_names" value={formData.sponsor_names || ''} onChange={handleInputChange} margin="dense" multiline rows={2} />
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button onClick={handleAddSacrament} variant="contained">Add</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default Sacraments;
