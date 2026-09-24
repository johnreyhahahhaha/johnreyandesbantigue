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
    Autocomplete,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    CircularProgress,
    Alert,
    Typography,
    Card,
    CardContent,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    IconButton,
} from '@mui/material';
import { Add as AddIcon, ArrowBack as ArrowBackIcon, PersonAdd as PersonAddIcon } from '@mui/icons-material';
import { usePermission } from '../contexts/PermissionContext';

const API_BASE_URL = 'http://165.22.181.147/api';

const PriestSearchField = ({ persons, value, onChange, optional = false }) => {
    const selectedPerson = persons.find((person) => String(person.person_id) === String(value)) || null;
    const selectedName = selectedPerson
        ? `${selectedPerson.first_name} ${selectedPerson.middle_name ? `${selectedPerson.middle_name} ` : ''}${selectedPerson.last_name}`
        : '';
    const [inputValue, setInputValue] = useState(selectedName);

    useEffect(() => {
        setInputValue(selectedName);
    }, [selectedName]);

    return (
        <Autocomplete
            fullWidth
            options={persons}
            value={selectedPerson}
            inputValue={inputValue}
            open={Boolean(inputValue.trim()) && inputValue !== selectedName}
            onInputChange={(event, newInputValue) => setInputValue(newInputValue)}
            onChange={(event, person) => onChange(person?.person_id || '')}
            getOptionLabel={(person) => `${person.first_name} ${person.middle_name ? `${person.middle_name} ` : ''}${person.last_name}`}
            isOptionEqualToValue={(option, person) => option.person_id === person.person_id}
            clearOnBlur={false}
            popupIcon={null}
            noOptionsText="No matching person"
            filterOptions={(options, state) => options.filter((person) => {
                const name = `${person.first_name} ${person.middle_name || ''} ${person.last_name}`.toLowerCase();
                return name.includes(state.inputValue.trim().toLowerCase());
            })}
            renderInput={(params) => <TextField {...params} label={optional ? 'Priest (Optional)' : 'Priest'} margin="dense" />}
        />
    );
};

const Sacraments = () => {
    const navigate = useNavigate();
    const { canCreate } = usePermission();
    const [baptisms, setBaptisms] = useState([]);
    const [marriages, setMarriages] = useState([]);
    const [confirmations, setConfirmations] = useState([]);
    const [communions, setCommunions] = useState([]);
    const [persons, setPersons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState(0);
    const [openDialog, setOpenDialog] = useState(false);
    const [openQuickPersonDialog, setOpenQuickPersonDialog] = useState(false);
    const [quickPersonTarget, setQuickPersonTarget] = useState('person_id');
    const [dialogType, setDialogType] = useState('baptism');
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({});
    const [quickPersonData, setQuickPersonData] = useState({
        first_name: '',
        middle_name: '',
        last_name: '',
        gender: 'Male',
        birth_date: '',
    });

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [baptismRes, marriageRes, confirmRes, communionRes, personRes] = await Promise.all([
                fetch(`${API_BASE_URL}/sacraments.php?type=baptismal`),
                fetch(`${API_BASE_URL}/sacraments.php?type=marriage`),
                fetch(`${API_BASE_URL}/sacraments.php?type=confirmation`),
                fetch(`${API_BASE_URL}/sacraments.php?type=communion`),
                fetch(`${API_BASE_URL}/persons.php`)
            ]);

            // Helper function to safely parse JSON
            const parseJSON = async (response, endpointName) => {
                const text = await response.text();

                if (!text) {
                    throw new Error(`${endpointName} returned empty response`);
                }
                
                try {
                    return JSON.parse(text);
                } catch (e) {
                    throw new Error(`${endpointName} returned invalid JSON: ${text.substring(0, 100)}`);
                }
            };

            const [baptismData, marriageData, confirmData, communionData, personData] = await Promise.all([
                parseJSON(baptismRes, 'Baptisms'),
                parseJSON(marriageRes, 'Marriages'),
                parseJSON(confirmRes, 'Confirmations'),
                parseJSON(communionRes, 'Communions'),
                parseJSON(personRes, 'Persons')
            ]);

            if (baptismData.success) setBaptisms(baptismData.data || []);
            if (marriageData.success) setMarriages(marriageData.data || []);
            if (confirmData.success) setConfirmations(confirmData.data || []);
            if (communionData && communionData.success) setCommunions(communionData.data || []);
            if (personData.success) setPersons(personData.data || []);
            setError('');
        } catch (err) {
            setError('Error fetching data: ' + err.message);
            console.error('Full error:', err);
        } finally {
            setLoading(false);
        }
    };

    const marriedPersonIds = new Set(
        marriages
            .flatMap((m) => [m.groom_id, m.bride_id])
            .filter((id) => id !== undefined && id !== null)
            .map((id) => Number(id))
    );

    const isPersonAlreadyMarried = (personId) => marriedPersonIds.has(Number(personId));

    const handleAddSacrament = async () => {
        if (!formData.start_datetime || !formData.end_datetime) {
            setError('Please fill in Start Date/Time and End Date/Time so the sacrament can be scheduled correctly.');
            return;
        }

        if (formData.start_datetime >= formData.end_datetime) {
            setError('End Date/Time must be later than Start Date/Time.');
            return;
        }

        const validPersonIds = new Set(persons.map((person) => Number(person.person_id)));
        const selectedPersonIds = ['baptism', 'confirmation', 'communion'].includes(dialogType)
            ? (formData.person_ids || [])
            : [formData.person_id];

        if (dialogType === 'baptism') {
            const invalidFather = Array.isArray(formData.father_id)
                ? formData.father_id.filter((id) => id !== '' && id !== null && id !== undefined && !Number.isNaN(Number(id)) && !validPersonIds.has(Number(id)))
                : (formData.father_id !== '' && formData.father_id !== undefined && formData.father_id !== null && !Number.isNaN(Number(formData.father_id)) && !validPersonIds.has(Number(formData.father_id)) ? [formData.father_id] : []);
            const invalidMother = Array.isArray(formData.mother_id)
                ? formData.mother_id.filter((id) => id !== '' && id !== null && id !== undefined && !Number.isNaN(Number(id)) && !validPersonIds.has(Number(id)))
                : (formData.mother_id !== '' && formData.mother_id !== undefined && formData.mother_id !== null && !Number.isNaN(Number(formData.mother_id)) && !validPersonIds.has(Number(formData.mother_id)) ? [formData.mother_id] : []);

            if (invalidFather.length || invalidMother.length) {
                setError('A selected parent must match a registered person in the dropdown. If the parent is not registered, write the name manually instead.');
                return;
            }

            if (!selectedPersonIds.length || !formData.baptism_date || !formData.priest_id) {
                setError('Please fill in at least one Person, Baptism Date, and Priest');
                return;
            }
        }

        if (dialogType === 'marriage') {
            if (!formData.groom_id || !formData.bride_id || !formData.marriage_date) {
                setError('Please fill in: Groom, Bride, and Marriage Date');
                return;
            }

            if (formData.groom_id === formData.bride_id) {
                setError('Groom and bride cannot be the same person.');
                return;
            }

            if (isPersonAlreadyMarried(formData.groom_id) || isPersonAlreadyMarried(formData.bride_id)) {
                setError('One or both selected persons are already married. Please select unmarried persons.');
                return;
            }
        }

        // client-side validation for required confirmation fields
        if (dialogType === 'confirmation') {
            if (!selectedPersonIds.length || !formData.confirmation_date || !formData.registry_book_no ||
                formData.registry_book_no === '' || !formData.page_no || formData.page_no === '' ||
                !formData.entry_no || formData.entry_no === '') {
                setError('Please fill in at least one Person, Confirmation Date, Registry Book No, Page No and Entry No');
                return;
            }
        }

        if (dialogType === 'communion' && (!selectedPersonIds.length || !formData.communion_date)) {
            setError('Please fill in at least one Person and Communion Date');
            return;
        }

        const splitBulkField = (value) => Array.isArray(value)
            ? value.map((item) => String(item).trim())
            : String(value ?? '').split(';').map((item) => item.trim());
        const getBulkValue = (value, index) => {
            const values = splitBulkField(value);
            return values.length === 1 ? values[0] : values[index] || '';
        };
        const bulkFields = dialogType === 'baptism'
            ? ['baptism_date', 'priest_id', 'father_id', 'mother_id', 'father_name', 'mother_name', 'book_no', 'page_no', 'line_no', 'godparents', 'remarks', 'start_datetime', 'end_datetime']
            : dialogType === 'confirmation'
                ? ['confirmation_date', 'registry_book_no', 'page_no', 'entry_no', 'confirming_bishop', 'sponsor_names', 'start_datetime', 'end_datetime']
                : dialogType === 'communion'
                    ? ['communion_date', 'priest_id', 'remarks', 'start_datetime', 'end_datetime']
                    : [];
        const selectedCount = selectedPersonIds.length;
        const invalidBulkField = bulkFields.find((field) => {
            const values = splitBulkField(formData[field]);
            return values.length > 1 && values.length !== selectedCount;
        });

        if (invalidBulkField) {
            setError(`${invalidBulkField} must contain one value for everyone or one value for each selected person.`);
            return;
        }

        const supportsBulkPersonValidation = ['baptism', 'confirmation', 'communion'].includes(dialogType);
        if (supportsBulkPersonValidation && selectedPersonIds.length > 0) {
            const uniquePersonIds = dedupePersonIds(selectedPersonIds);
            if (uniquePersonIds.length !== selectedPersonIds.length) {
                setError('Duplicate person selected. The same person was removed from the list before saving.');
                return;
            }
        }

        try {
            const responsePersonIds = supportsBulkPersonValidation ? dedupePersonIds(selectedPersonIds) : [formData.person_id || formData.groom_id || formData.bride_id].filter(Boolean);
            const responses = await Promise.all(responsePersonIds.map((personId, index) => fetch(`${API_BASE_URL}/sacraments.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    ...Object.fromEntries(bulkFields.map((field) => [field, getBulkValue(formData[field], index)])),
                    person_id: personId,
                    type: dialogType,
                })
            })));

            const results = await Promise.all(responses.map(async (response) => {
                const text = await response.text();
                let data;
                try {
                    data = text ? JSON.parse(text) : null;
                } catch (jsonErr) {
                    throw new Error('Invalid server response: ' + text);
                }
                if (!response.ok || !data?.success) {
                    throw new Error(data?.message || response.statusText || 'Server error');
                }
                return data;
            }));

            if (results.length) {
                setOpenDialog(false);
                setFormData({});
                setError('');
                fetchAllData();
            }
        } catch (err) {
            setError('Error: ' + err.message);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const dedupePersonIds = (ids = []) => {
        const normalized = Array.isArray(ids) ? ids : [ids];
        return [...new Set(normalized
            .filter((id) => id !== '' && id !== null && id !== undefined)
            .map((id) => String(id)) )];
    };

    const handleQuickPersonChange = (e) => {
        const { name, value } = e.target;
        setQuickPersonData(prev => ({ ...prev, [name]: value }));
    };

    const handleQuickPersonSubmit = async () => {
        const { first_name, last_name, gender, birth_date } = quickPersonData;
        const names = first_name.split(';').map((name) => name.trim()).filter(Boolean);
        const isBulkPersonAdd = quickPersonTarget === 'person_ids';
        const splitValues = (value) => value.split(';').map((item) => item.trim());
        const middleNames = splitValues(quickPersonData.middle_name);
        const lastNames = splitValues(last_name);
        const genders = splitValues(gender).filter(Boolean);
        const birthDates = splitValues(birth_date).filter(Boolean);

        if (!names.length || (!isBulkPersonAdd && !last_name.trim()) || !gender || !birth_date) {
            setError(isBulkPersonAdd
                ? 'Please enter at least one name, gender, and birth date.'
                : 'Please fill in the person\'s first name, last name, gender, and birth date.');
            return;
        }

        if (isBulkPersonAdd &&
            (genders.length !== 1 && genders.length !== names.length ||
                birthDates.length !== 1 && birthDates.length !== names.length ||
                (middleNames.length > 1 && middleNames.length !== names.length) ||
                (lastNames.length > 1 && lastNames.length !== names.length))) {
            setError('Enter one value for everyone, or one value for each person, in the same order.');
            return;
        }

        if (isBulkPersonAdd && genders.some((value) => !['Male', 'Female'].includes(value))) {
            setError('Gender values must be Male or Female, separated by semicolons.');
            return;
        }

        try {
            const createdPeople = await Promise.all(names.map(async (name, index) => {
                const parsedFirstName = name;
                const parsedMiddleName = isBulkPersonAdd
                    ? (middleNames.length === 1 ? middleNames[0] : middleNames[index] || '')
                    : quickPersonData.middle_name;
                const parsedLastName = isBulkPersonAdd
                    ? (lastNames.length === 1 ? lastNames[0] : lastNames[index] || '')
                    : last_name;
                const personData = {
                    ...quickPersonData,
                    first_name: parsedFirstName,
                    middle_name: parsedMiddleName,
                    last_name: parsedLastName,
                    gender: isBulkPersonAdd ? genders[genders.length === 1 ? 0 : index] : gender,
                    birth_date: isBulkPersonAdd ? birthDates[birthDates.length === 1 ? 0 : index] : birth_date,
                    religion: 'Roman Catholic',
                    nationality: 'Filipino',
                    civil_status: 'Single',
                    is_alive: 1,
                };
                const response = await fetch(`${API_BASE_URL}/persons.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(personData),
                });
                const data = await response.json();
                if (!response.ok || !data.success) {
                    throw new Error(data.message || `Failed to create ${name}`);
                }
                return { ...personData, person_id: data.person_id };
            }));

            setPersons(prev => [...createdPeople, ...prev]);
            setFormData(prev => {
                if (quickPersonTarget === 'person_ids') {
                    const mergedIds = dedupePersonIds([...(prev.person_ids || []), ...createdPeople.map((person) => person.person_id)]);
                    return { ...prev, person_ids: mergedIds };
                }
                return { ...prev, [quickPersonTarget]: createdPeople[0].person_id };
            });
            setQuickPersonData({ first_name: '', middle_name: '', last_name: '', gender: 'Male', birth_date: '' });
            setOpenQuickPersonDialog(false);
            setError('');
        } catch (err) {
            setError('Error creating person: ' + err.message);
        }
    };

    const getPersonName = (personId) => {
        const person = persons.find(p => p.person_id == personId);
        return person ? `${person.first_name} ${person.last_name}` : 'N/A';
    };

    const getParentDisplayName = (record, idField, nameField) => {
        const manualName = record?.[nameField]?.trim();
        if (manualName) return manualName;
        const linkedId = record?.[idField];
        return linkedId ? getPersonName(linkedId) : 'N/A';
    };

    const filterRecords = (records, searchTerm, recordType = 'general') => {
        if (!searchTerm) return records;
        const lowerSearch = searchTerm.toLowerCase();
        
        // Special handling for marriage records which have groom_id and bride_id
        if (recordType === 'marriage') {
            return records.filter(record => {
                const groomName = getPersonName(record.groom_id).toLowerCase();
                const brideName = getPersonName(record.bride_id).toLowerCase();
                return groomName.includes(lowerSearch) || 
                       brideName.includes(lowerSearch) || 
                       (record.marriage_date && record.marriage_date.includes(lowerSearch));
            });
        }
        
        return records.filter(record => {
            const personName = getPersonName(record.person_id).toLowerCase();
            return personName.includes(lowerSearch) || 
                   (record.baptism_date && record.baptism_date.includes(lowerSearch)) ||
                   (record.marriage_date && record.marriage_date.includes(lowerSearch)) ||
                   (record.confirmation_date && record.confirmation_date.includes(lowerSearch)) ||
                   (record.communion_date && record.communion_date.includes(lowerSearch));
        });
    };

    const filteredBaptisms = filterRecords(baptisms, searchTerm);
    const filteredMarriages = filterRecords(marriages, searchTerm, 'marriage');
    const filteredConfirmations = filterRecords(confirmations, searchTerm);
    const filteredCommunions = filterRecords(communions, searchTerm);

    const tableContainerSx = {
        overflowX: 'auto',
        width: '100%',
        maxWidth: '100%',
        bgcolor: '#ffffff',
        borderRadius: 2,
    };

    const tableSx = {
        minWidth: { xs: 760, md: 980 },
        width: '100%',
        tableLayout: 'auto',
        '& th, & td': {
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
            px: { xs: 1, sm: 1.25, md: 1.5 },
            py: { xs: 0.8, md: 1 },
            fontSize: { xs: '0.75rem', md: '0.875rem' },
        },
    };

    if (loading) return <CircularProgress />;

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#edf3f1' }}>
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 2,
                px: { xs: 1.5, md: 2 },
                py: { xs: 1.5, md: 3 },
                background: 'linear-gradient(110deg, #123b50 0%, #0b6b68 70%, #d1a557 155%)',
                boxShadow: '0 12px 26px rgba(13, 70, 76, 0.14)',
            }}>
                <Container maxWidth="lg" sx={{ px: { xs: 0.5, md: 2 }, display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1.25, sm: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <IconButton
                        onClick={() => navigate('/dashboard')}
                        sx={{
                            backgroundColor: 'rgba(255,255,255,0.14)',
                            color: 'white',
                            '&:hover': {
                                backgroundColor: 'rgba(255,255,255,0.24)',
                            },
                        }}
                    >
                        <ArrowBackIcon />
                    </IconButton>
                    <Box>
                        <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: '0.12em' }}>
                            Parish registry
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: 'white', lineHeight: 1.15 }}>
                            Sacrament records
                        </Typography>
                    </Box>
                </Box>
                {canCreate('sacraments') && (
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
                        const types = ['baptism','marriage','confirmation','communion'];
                        const initial = types[activeTab] || 'baptism';
                        setDialogType(initial);
                        setFormData({});
                        setOpenDialog(true);
                    }} sx={{ bgcolor: '#d6a85a', color: '#123b50', '&:hover': { bgcolor: '#e3ba70' }, boxShadow: 'none' }}>
                        Add Sacrament
                    </Button>
                )}
                </Container>
            </Box>

            <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 }, px: { xs: 0.75, md: 2 } }}>
            <Grid container spacing={2} sx={{ mb: 2.5 }}>
                {[
                    ['Baptisms', baptisms.length, '#168fa3'],
                    ['Marriages', marriages.length, '#d49347'],
                    ['Confirmations', confirmations.length, '#7d6acb'],
                    ['Communions', communions.length, '#25a878'],
                ].map(([label, value, color]) => (
                    <Grid item xs={12} sm={6} md={4} lg={2.4} key={label}>
                        <Card sx={{ height: '100%', borderRadius: 2.5, border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 5px 16px rgba(26, 67, 74, 0.05)' }}>
                            <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                                <Typography variant="caption" sx={{ color: '#718784', fontWeight: 700 }}>{label}</Typography>
                                <Typography variant="h5" sx={{ mt: 0.5, color, fontWeight: 800, fontSize: { xs: '1.5rem', sm: '2rem' } }}>{value}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

            <Card sx={{ mb: 2.5, p: { xs: 1.5, md: 2 }, borderRadius: 2.5, border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 5px 16px rgba(26, 67, 74, 0.05)' }}>
                <TextField
                    fullWidth
                    label="Search by person or date"
                    variant="outlined"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Type a name or date..."
                    size="small"
                    sx={{ '& .MuiInputBase-root': { fontSize: { xs: '0.95rem', md: '1rem' } } }}
                />
                <Tabs
                    value={activeTab}
                    onChange={(e, v) => setActiveTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    allowScrollButtonsMobile
                    sx={{ mt: 1, minHeight: 42, '& .MuiTab-root': { minWidth: { xs: 120, sm: 140 } } }}
                >
                    <Tab label={`Baptisms (${filteredBaptisms.length})`} />
                    <Tab label={`Marriages (${filteredMarriages.length})`} />
                    <Tab label={`Confirmations (${filteredConfirmations.length})`} />
                    <Tab label={`Communions (${filteredCommunions.length})`} />
                </Tabs>
            </Card>

            {/* Baptisms Tab */}
            {activeTab === 0 && (
                <TableContainer component={Paper} sx={tableContainerSx}>
                    <Table sx={tableSx}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Person</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Baptism Date</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Priest</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Father</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Mother</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Book/Page</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Godparents</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Remarks</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredBaptisms.map((b) => (
                                <TableRow key={b.baptism_id} hover>
                                    <TableCell>{getPersonName(b.person_id)}</TableCell>
                                    <TableCell>{b.baptism_date}</TableCell>
                                    <TableCell>{getPersonName(b.priest_id)}</TableCell>
                                    <TableCell>{getParentDisplayName(b, 'father_id', 'father_name')}</TableCell>
                                    <TableCell>{getParentDisplayName(b, 'mother_id', 'mother_name')}</TableCell>
                                    <TableCell>{b.book_no}/{b.page_no}</TableCell>
                                    <TableCell>{b.godparents || '-'}</TableCell>
                                    <TableCell>{b.remarks || '-'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Marriages Tab */}
            {activeTab === 1 && (
                <TableContainer component={Paper} sx={tableContainerSx}>
                    <Table sx={tableSx}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Groom</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Groom Status</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Bride</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Bride Status</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Marriage Date</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Priest</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>License</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Book/Page</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Banns Date</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Civil Marriage Info</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Witnesses</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredMarriages.map((m) => (
                                <TableRow key={m.marriage_id} hover>
                                    <TableCell>{getPersonName(m.groom_id)}</TableCell>
                                    <TableCell>{m.groom_status || '-'}</TableCell>
                                    <TableCell>{getPersonName(m.bride_id)}</TableCell>
                                    <TableCell>{m.bride_status || '-'}</TableCell>
                                    <TableCell>{m.marriage_date}</TableCell>
                                    <TableCell>{getPersonName(m.priest_id)}</TableCell>
                                    <TableCell>{m.license_no}</TableCell>
                                    <TableCell>{m.book_no && m.page_no ? `${m.book_no}/${m.page_no}` : '-'}</TableCell>
                                    <TableCell>{m.banns_date || '-'}</TableCell>
                                    <TableCell>{m.civil_marriage_info || '-'}</TableCell>
                                    <TableCell>{m.witnesses || '-'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Confirmations Tab */}
            {activeTab === 2 && (
                <TableContainer component={Paper} sx={tableContainerSx}>
                    <Table sx={tableSx}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Person</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Confirmation Date</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Bishop</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Sponsors</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Registry Book</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Page</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Entry</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredConfirmations.map((c) => (
                                <TableRow key={c.confirmation_id} hover>
                                    <TableCell>{getPersonName(c.person_id)}</TableCell>
                                    <TableCell>{c.confirmation_date}</TableCell>
                                    <TableCell>{c.confirming_bishop}</TableCell>
                                    <TableCell>{c.sponsor_names}</TableCell>
                                    <TableCell>{c.registry_book_no}</TableCell>
                                    <TableCell>{c.page_no}</TableCell>
                                    <TableCell>{c.entry_no}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Communions Tab */}
            {activeTab === 3 && (
                <TableContainer component={Paper} sx={tableContainerSx}>
                    <Table sx={tableSx}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Person</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Communion Date</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Priest</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Remarks</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredCommunions.map((c) => (
                                <TableRow key={c.communion_id} hover>
                                    <TableCell>{getPersonName(c.person_id)}</TableCell>
                                    <TableCell>{c.communion_date}</TableCell>
                                    <TableCell>{getPersonName(c.priest_id)}</TableCell>
                                    <TableCell>{c.remarks || '-'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Add Sacrament Dialog */}
            <Dialog
                open={openDialog}
                onClose={() => setOpenDialog(false)}
                maxWidth="sm"
                fullWidth
                sx={{
                    '& .MuiDialog-paper': {
                        m: { xs: 1, sm: 2 },
                        maxHeight: '90vh',
                        width: '100%',
                    },
                }}
            >
                <DialogTitle sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>Add Sacrament Record</DialogTitle>
                <DialogContent sx={{ pt: 2, px: { xs: 2, sm: 3 }, maxHeight: '70vh', overflowY: 'auto' }}>
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
                            <MenuItem value="communion">Communion</MenuItem>
                        </Select>
                    </FormControl>

                    <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
                        <TextField
                            fullWidth
                            required
                            label="Start Date/Time"
                            type="datetime-local"
                            name="start_datetime"
                            value={formData.start_datetime || ''}
                            onChange={handleInputChange}
                            margin="dense"
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            fullWidth
                            required
                            label="End Date/Time"
                            type="datetime-local"
                            name="end_datetime"
                            value={formData.end_datetime || ''}
                            onChange={handleInputChange}
                            margin="dense"
                            InputLabelProps={{ shrink: true }}
                        />
                    </Box>

                    {dialogType === 'baptism' && (
                        <>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                <FormControl fullWidth margin="dense">
                                    <InputLabel>Person(s)</InputLabel>
                                    <Select
                                        multiple
                                        name="person_ids"
                                        value={formData.person_ids || []}
                                        label="Person(s)"
                                        onChange={handleInputChange}
                                        renderValue={(selected) => `${selected.length} person${selected.length === 1 ? '' : 's'} selected`}
                                    >
                                        {persons.map((p) => (
                                            <MenuItem key={p.person_id} value={p.person_id}>
                                                {p.first_name} {p.middle_name ? `${p.middle_name} ` : ''}{p.last_name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <Button
                                    variant="outlined"
                                    startIcon={<PersonAddIcon />}
                                    onClick={() => {
                                        setQuickPersonTarget('person_ids');
                                        setOpenQuickPersonDialog(true);
                                    }}
                                    sx={{ mt: 1, whiteSpace: 'nowrap' }}
                                >
                                    New Person
                                </Button>
                            </Box>
                            <TextField fullWidth label="Baptism Date(s), in order" type="text" name="baptism_date" value={formData.baptism_date || ''} onChange={handleInputChange} margin="dense" placeholder="YYYY-MM-DD; YYYY-MM-DD" />
                            <PriestSearchField
                                persons={persons}
                                value={formData.priest_id || ''}
                                onChange={(priestId) => setFormData((prev) => ({ ...prev, priest_id: priestId }))}
                            />
                            <FormControl fullWidth margin="dense">
                                <InputLabel>Registered Father(s), in order (Optional)</InputLabel>
                                <Select
                                    multiple
                                    name="father_id"
                                    value={formData.father_id || []}
                                    label="Registered Father(s), in order (Optional)"
                                    onChange={handleInputChange}
                                    renderValue={(selected) => selected.map((id) => getPersonName(id)).join('; ')}
                                >
                                    {persons.map((p) => (
                                        <MenuItem key={p.person_id} value={p.person_id}>
                                            {p.first_name} {p.last_name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <TextField
                                fullWidth
                                label="Father Name (if not in registry)"
                                name="father_name"
                                value={formData.father_name || ''}
                                onChange={handleInputChange}
                                margin="dense"
                                placeholder="e.g. Juan Dela Cruz"
                            />
                            <FormControl fullWidth margin="dense">
                                <InputLabel>Registered Mother(s), in order (Optional)</InputLabel>
                                <Select
                                    multiple
                                    name="mother_id"
                                    value={formData.mother_id || []}
                                    label="Registered Mother(s), in order (Optional)"
                                    onChange={handleInputChange}
                                    renderValue={(selected) => selected.map((id) => getPersonName(id)).join('; ')}
                                >
                                    {persons.map((p) => (
                                        <MenuItem key={p.person_id} value={p.person_id}>
                                            {p.first_name} {p.last_name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <TextField
                                fullWidth
                                label="Mother Name (if not in registry)"
                                name="mother_name"
                                value={formData.mother_name || ''}
                                onChange={handleInputChange}
                                margin="dense"
                                placeholder="e.g. Maria Santos"
                            />
                            <TextField fullWidth label="Book No(s), in order" name="book_no" value={formData.book_no || ''} onChange={handleInputChange} margin="dense" placeholder="1; 2; 3" />
                            <TextField fullWidth label="Page No(s), in order" name="page_no" value={formData.page_no || ''} onChange={handleInputChange} margin="dense" placeholder="10; 11; 12" />
                            <TextField fullWidth label="Line No(s), in order" name="line_no" value={formData.line_no || ''} onChange={handleInputChange} margin="dense" placeholder="1; 2; 3" />
                            <TextField fullWidth label="Godparents (in order)" name="godparents" value={formData.godparents || ''} onChange={handleInputChange} margin="dense" multiline rows={2} placeholder="Ana; Ben; Carlo" />
                            <TextField fullWidth label="Remarks (in order)" name="remarks" value={formData.remarks || ''} onChange={handleInputChange} margin="dense" multiline rows={2} />
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
                                    {persons.map((p) => {
                                        const married = isPersonAlreadyMarried(p.person_id);
                                        return (
                                            <MenuItem key={p.person_id} value={p.person_id} disabled={married}>
                                                {p.first_name} {p.last_name}{married ? ' (already married)' : ''}
                                            </MenuItem>
                                        );
                                    })}
                                </Select>
                            </FormControl>
                            <Button
                                variant="outlined"
                                startIcon={<PersonAddIcon />}
                                onClick={() => {
                                    setQuickPersonTarget('groom_id');
                                    setOpenQuickPersonDialog(true);
                                }}
                                sx={{ mb: 1, whiteSpace: 'nowrap' }}
                            >
                                New Groom
                            </Button>
                            <FormControl fullWidth margin="dense">
                                <InputLabel>Groom Status</InputLabel>
                                <Select
                                    name="groom_status"
                                    value={formData.groom_status || ''}
                                    label="Groom Status"
                                    onChange={handleInputChange}
                                >
                                    <MenuItem value="Single">Single</MenuItem>
                                    <MenuItem value="Widowed">Widowed</MenuItem>
                                    <MenuItem value="Annulled">Annulled</MenuItem>
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
                                    {persons.map((p) => {
                                        const married = isPersonAlreadyMarried(p.person_id);
                                        return (
                                            <MenuItem key={p.person_id} value={p.person_id} disabled={married}>
                                                {p.first_name} {p.last_name}{married ? ' (already married)' : ''}
                                            </MenuItem>
                                        );
                                    })}
                                </Select>
                            </FormControl>
                            <Button
                                variant="outlined"
                                startIcon={<PersonAddIcon />}
                                onClick={() => {
                                    setQuickPersonTarget('bride_id');
                                    setOpenQuickPersonDialog(true);
                                }}
                                sx={{ mb: 1, whiteSpace: 'nowrap' }}
                            >
                                New Bride
                            </Button>
                            <FormControl fullWidth margin="dense">
                                <InputLabel>Bride Status</InputLabel>
                                <Select
                                    name="bride_status"
                                    value={formData.bride_status || ''}
                                    label="Bride Status"
                                    onChange={handleInputChange}
                                >
                                    <MenuItem value="Single">Single</MenuItem>
                                    <MenuItem value="Widowed">Widowed</MenuItem>
                                    <MenuItem value="Annulled">Annulled</MenuItem>
                                </Select>
                            </FormControl>
                            <TextField fullWidth label="Marriage Date" type="date" name="marriage_date" value={formData.marriage_date || ''} onChange={handleInputChange} margin="dense" InputLabelProps={{ shrink: true }} />
                            <PriestSearchField
                                persons={persons}
                                value={formData.priest_id || ''}
                                onChange={(priestId) => setFormData((prev) => ({ ...prev, priest_id: priestId }))}
                            />
                            <TextField fullWidth label="License No" name="license_no" value={formData.license_no || ''} onChange={handleInputChange} margin="dense" />
                            <TextField fullWidth label="Book No" type="number" name="book_no" value={formData.book_no || ''} onChange={handleInputChange} margin="dense" />
                            <TextField fullWidth label="Page No" type="number" name="page_no" value={formData.page_no || ''} onChange={handleInputChange} margin="dense" />
                            <TextField fullWidth label="Banns Date" type="date" name="banns_date" value={formData.banns_date || ''} onChange={handleInputChange} margin="dense" InputLabelProps={{ shrink: true }} />
                            <TextField fullWidth label="Civil Marriage Info" name="civil_marriage_info" value={formData.civil_marriage_info || ''} onChange={handleInputChange} margin="dense" multiline rows={2} />
                            <TextField fullWidth label="Witnesses" name="witnesses" value={formData.witnesses || ''} onChange={handleInputChange} margin="dense" multiline rows={2} />
                        </>
                    )}
                    {dialogType === 'confirmation' && (
                        <>
                            <FormControl fullWidth margin="dense">
                                <InputLabel>Person</InputLabel>
                                <Select
                                    multiple
                                    name="person_ids"
                                    value={formData.person_ids || []}
                                    label="Person"
                                    onChange={handleInputChange}
                                    renderValue={(selected) => `${selected.length} person${selected.length === 1 ? '' : 's'} selected`}
                                >
                                    {persons.map((p) => (
                                        <MenuItem key={p.person_id} value={p.person_id}>
                                            {p.first_name} {p.last_name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <Button
                                variant="outlined"
                                startIcon={<PersonAddIcon />}
                                onClick={() => {
                                    setQuickPersonTarget('person_ids');
                                    setOpenQuickPersonDialog(true);
                                }}
                                sx={{ mb: 1, whiteSpace: 'nowrap' }}
                            >
                                New Person
                            </Button>
                            <TextField fullWidth label="Confirmation Date(s), in order" type="text" name="confirmation_date" value={formData.confirmation_date || ''} onChange={handleInputChange} margin="dense" placeholder="YYYY-MM-DD; YYYY-MM-DD" />
                            <TextField fullWidth label="Bishop Name(s), in order" name="confirming_bishop" value={formData.confirming_bishop || ''} onChange={handleInputChange} margin="dense" />
                            <TextField fullWidth label="Sponsors (in order)" name="sponsor_names" value={formData.sponsor_names || ''} onChange={handleInputChange} margin="dense" multiline rows={2} />
                            <TextField fullWidth label="Registry Book No(s), in order" name="registry_book_no" value={formData.registry_book_no || ''} onChange={handleInputChange} margin="dense" placeholder="1; 2; 3" />
                            <TextField fullWidth label="Page No(s), in order" name="page_no" value={formData.page_no || ''} onChange={handleInputChange} margin="dense" placeholder="10; 11; 12" />
                            <TextField fullWidth label="Entry No(s), in order" name="entry_no" value={formData.entry_no || ''} onChange={handleInputChange} margin="dense" placeholder="1; 2; 3" />
                        </>
                    )}
                    {dialogType === 'communion' && (
                        <>
                            <FormControl fullWidth margin="dense">
                                <InputLabel>Person</InputLabel>
                                <Select
                                    multiple
                                    name="person_ids"
                                    value={formData.person_ids || []}
                                    label="Person"
                                    onChange={handleInputChange}
                                    renderValue={(selected) => `${selected.length} person${selected.length === 1 ? '' : 's'} selected`}
                                >
                                    {persons.map((p) => (
                                        <MenuItem key={p.person_id} value={p.person_id}>
                                            {p.first_name} {p.last_name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <Button
                                variant="outlined"
                                startIcon={<PersonAddIcon />}
                                onClick={() => {
                                    setQuickPersonTarget('person_ids');
                                    setOpenQuickPersonDialog(true);
                                }}
                                sx={{ mb: 1, whiteSpace: 'nowrap' }}
                            >
                                New Person
                            </Button>
                            <TextField fullWidth label="Communion Date" type="date" name="communion_date" value={formData.communion_date || ''} onChange={handleInputChange} margin="dense" InputLabelProps={{ shrink: true }} />
                            <PriestSearchField
                                persons={persons}
                                value={formData.priest_id || ''}
                                optional
                                onChange={(priestId) => setFormData((prev) => ({ ...prev, priest_id: priestId }))}
                            />
                            <TextField fullWidth label="Remarks" name="remarks" value={formData.remarks || ''} onChange={handleInputChange} margin="dense" multiline rows={2} />
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button onClick={handleAddSacrament} variant="contained">Add</Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={openQuickPersonDialog}
                onClose={() => setOpenQuickPersonDialog(false)}
                maxWidth="xs"
                fullWidth
                sx={{
                    '& .MuiDialog-paper': {
                        m: { xs: 1, sm: 2 },
                        maxHeight: '85vh',
                        width: '100%',
                    },
                }}
            >
                <DialogTitle sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>Quick Add Person</DialogTitle>
                <DialogContent sx={{ pt: 2, px: { xs: 2, sm: 3 }, maxHeight: '70vh', overflowY: 'auto' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Add the child here, then continue the baptism record without leaving this form.
                    </Typography>
                    <TextField
                        fullWidth
                        required
                        label={quickPersonTarget === 'person_ids' ? 'Names (separate with ;)' : 'First Name'}
                        name="first_name"
                        value={quickPersonData.first_name}
                        onChange={handleQuickPersonChange}
                        margin="dense"
                        autoFocus
                        multiline={quickPersonTarget === 'person_ids'}
                        rows={quickPersonTarget === 'person_ids' ? 3 : undefined}
                        placeholder={quickPersonTarget === 'person_ids' ? 'Alex; John; Jay' : undefined}
                    />
                    <TextField
                        fullWidth
                        label={quickPersonTarget === 'person_ids' ? 'Middle Name(s), in order (Optional)' : 'Middle Name'}
                        name="middle_name"
                        value={quickPersonData.middle_name}
                        onChange={handleQuickPersonChange}
                        margin="dense"
                        placeholder={quickPersonTarget === 'person_ids' ? 'M.; N.; O.' : undefined}
                    />
                    <TextField
                        fullWidth
                        required={quickPersonTarget !== 'person_ids'}
                        label={quickPersonTarget === 'person_ids' ? 'Last Name (Optional)' : 'Last Name'}
                        name="last_name"
                        value={quickPersonData.last_name}
                        onChange={handleQuickPersonChange}
                        margin="dense"
                        placeholder={quickPersonTarget === 'person_ids' ? 'Santos; Cruz; Reyes' : undefined}
                    />
                    {quickPersonTarget === 'person_ids' ? (
                        <>
                            <TextField
                                fullWidth
                                required
                                label="Gender(s), in order"
                                name="gender"
                                value={quickPersonData.gender}
                                onChange={handleQuickPersonChange}
                                margin="dense"
                                placeholder="Male; Female; Male"
                            />
                            <TextField
                                fullWidth
                                required
                                label="Birthday(s), in order"
                                name="birth_date"
                                value={quickPersonData.birth_date}
                                onChange={handleQuickPersonChange}
                                margin="dense"
                                placeholder="2010-01-01; 2011-02-02; 2012-03-03"
                            />
                        </>
                    ) : (
                        <>
                            <FormControl fullWidth margin="dense" required>
                                <InputLabel>Gender</InputLabel>
                                <Select name="gender" value={quickPersonData.gender} label="Gender" onChange={handleQuickPersonChange}>
                                    <MenuItem value="Male">Male</MenuItem>
                                    <MenuItem value="Female">Female</MenuItem>
                                </Select>
                            </FormControl>
                            <TextField fullWidth required label="Birth Date" type="date" name="birth_date" value={quickPersonData.birth_date} onChange={handleQuickPersonChange} margin="dense" InputLabelProps={{ shrink: true }} />
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenQuickPersonDialog(false)}>Cancel</Button>
                    <Button onClick={handleQuickPersonSubmit} variant="contained">Add and Select</Button>
                </DialogActions>
            </Dialog>
            </Container>
        </Box>
    );
};

export default Sacraments;
