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
    Tabs,
    Tab,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import axios from 'axios';
import { usePermission } from '../contexts/PermissionContext';

const API_BASE_URL = 'http://165.22.181.147/api';

const CemeteryRecords = () => {
    const navigate = useNavigate();
    const { canCreate, canDelete, canUpdate } = usePermission();
    const [activeTab, setActiveTab] = useState(0);
    const [records, setRecords] = useState([]);
    const [contracts, setContracts] = useState([]);
    const [sections, setSections] = useState([]);
    const [structures, setStructures] = useState([]);
    const [burialRecords, setBurialRecords] = useState([]);
    const [exhumationRecords, setExhumationRecords] = useState([]);
    const [transferRecords, setTransferRecords] = useState([]);
    const [persons, setPersons] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [dialogType, setDialogType] = useState(''); // 'record', 'contract', 'section', 'structure', 'burial', 'exhumation'
    const [editingItem, setEditingItem] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [openBurialPersonDialog, setOpenBurialPersonDialog] = useState(false);
    const [burialPersonData, setBurialPersonData] = useState({
        first_name: '',
        middle_name: '',
        last_name: '',
        gender: 'Male',
        birth_date: '',
        religion: '',
    });
    const [formData, setFormData] = useState({
        // Records
        deceased_id: '',
        block_no: '',
        row_no: '',
        lot_type: 'Common',
        lease_start: '',
        lease_end: '',
        // Contracts
        contract_type: 'Lot',
        start_date: '',
        expiration_date: '',
        representative_name: '',
        contact_number: '',
        contract_status: 'Active',
        payment_id: '',
        notice_count: 0,
        is_archived: false,
        amount_paid: '',
        payment_date: '',
        payment_method: 'Cash',
        // Sections
        section_name: '',
        // Structures
        block_name: '',
        level_number: '',
        niche_number: '',
        status: 'Vacant',
        current_occupant_id: '',
        section_id: '',
        // Burial Records
        person_id: '',
        death_date: '',
        burial_date: '',
        cause_of_death: '',
        priest_id: '',
        place_of_interment: '',
        record_id: '',
        contract_id: '',
        struct_id: '',
        ledger_id: '',
        // Exhumation Records
        exhumation_deceased_id: '',
        original_struct_id: '',
        exhumation_date: '',
        reason: '',
        new_location: '',
        witnessed_by: '',
        processed_by: '',
        exhumation_amount_paid: '',
        exhumation_payment_date: '',
        exhumation_payment_method: 'Cash',
        exhumation_ledger_id: '',
        transfer_contract_id: '',
        transfer_destination_struct_id: '',
        transfer_destination_location: '',
        transfer_reason: 'Expired Lease',
        transfer_notes: ''
    });

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchRecords(),
                fetchContracts(),
                fetchSections(),
                fetchStructures(),
                fetchBurialRecords(),
                fetchExhumationRecords(),
                fetchTransferRecords(),
                fetchPersons(),
                fetchUsers(),
                checkCemeteryContractNotifications(),
            ]);
        } catch (err) {
            setError('Error fetching data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchRecords = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/cemetery-records.php`);
            if (response.data.success) {
                setRecords(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching cemetery records:', err);
        }
    };

    const fetchContracts = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/cemetery-contracts.php`);
            if (response.data.success) {
                setContracts(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching cemetery contracts:', err);
        }
    };

    const fetchSections = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/cemetery-sections.php`);
            if (response.data.success) {
                setSections(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching cemetery sections:', err);
        }
    };

    const fetchStructures = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/cemetery-structures.php`);
            if (response.data.success) {
                setStructures(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching cemetery structures:', err);
        }
    };

    const fetchBurialRecords = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/burial-records.php`);
            if (response.data.success) {
                setBurialRecords(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching burial records:', err);
        }
    };

    const fetchExhumationRecords = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/exhumation-records.php`);
            if (response.data.success) {
                setExhumationRecords(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching exhumation records:', err);
        }
    };

    const fetchTransferRecords = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/cemetery-transfers.php`);
            if (response.data.success) {
                setTransferRecords(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching cemetery transfers:', err);
        }
    };

    const fetchPersons = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/persons.php`);
            if (response.data.success) {
                setPersons(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching persons:', err);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/users.php`);
            if (response.data.success) {
                setUsers(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching system users:', err);
        }
    };

    const getPersonCemeteryLinks = (personId) => {
        if (!personId) {
            return { record_id: '', contract_id: '', struct_id: '' };
        }

        const numericPersonId = Number(personId);
        const matchingRecord = records.find((record) => Number(record.deceased_id) === numericPersonId);
        const matchingContract = contracts.find(
            (contract) => Number(contract.deceased_id) === numericPersonId && Number(contract.is_archived || 0) !== 1
        );
        const matchingStructure = structures.find(
            (structure) => Number(structure.current_occupant_id) === numericPersonId
        );

        return {
            record_id: matchingRecord?.lot_id || '',
            contract_id: matchingContract?.contract_id || '',
            struct_id: matchingStructure?.struct_id || '',
        };
    };

    const getPersonBurialDates = (personId) => {
        const burial = burialRecords.find((record) => Number(record.person_id) === Number(personId));
        if (!burial?.burial_date) {
            return { start_date: '', expiration_date: '' };
        }

        const expirationDate = new Date(`${burial.burial_date}T00:00:00`);
        expirationDate.setFullYear(expirationDate.getFullYear() + 10);

        return {
            start_date: burial.burial_date,
            expiration_date: expirationDate.toISOString().slice(0, 10),
        };
    };

    const getPersonCemeteryDefaults = (personId) => {
        const person = persons.find((item) => Number(item.person_id) === Number(personId));
        const links = getPersonCemeteryLinks(personId);
        const burialDates = getPersonBurialDates(personId);
        const record = records.find((item) => Number(item.lot_id) === Number(links.record_id));
        const contract = contracts.find((item) => Number(item.contract_id) === Number(links.contract_id));

        return {
            ...links,
            ...burialDates,
            representative_name: contract?.representative_name || `${person?.first_name || ''} ${person?.last_name || ''}`.trim(),
            contact_number: contract?.contact_number || person?.contact_no || '',
            block_no: record?.block_no || '',
            row_no: record?.row_no || '',
            lot_type: record?.lot_type || 'Common',
        };
    };

    useEffect(() => {
        if (!formData.person_id) return;

        const { record_id, contract_id, struct_id } = getPersonCemeteryLinks(formData.person_id);

        setFormData((prev) => {
            return {
                ...prev,
                record_id,
                contract_id,
                struct_id,
            };
        });
    }, [formData.person_id, records, contracts, structures]);

    const checkCemeteryContractNotifications = async () => {
        try {
            await axios.get(`${API_BASE_URL}/check-cemetery-contract-notifications.php`);
        } catch (err) {
            console.error('Error checking cemetery contract notifications:', err);
        }
    };

    const handleOpenDialog = (type, item = null) => {
        setDialogType(type);
        setEditingItem(item);
        
        if (item) {
            // Editing mode
            if (type === 'record') {
                setFormData({
                    deceased_id: item.deceased_id || '',
                    block_no: item.block_no || '',
                    row_no: item.row_no || '',
                    lot_type: item.lot_type || 'Common',
                    lease_start: item.lease_start || '',
                    lease_end: item.lease_end || '',
                });
            } else if (type === 'contract') {
                setFormData({
                    deceased_id: item.deceased_id || '',
                    struct_id: item.struct_id || '',
                    contract_type: item.contract_type || 'Lot',
                    start_date: item.start_date || '',
                    expiration_date: item.expiration_date || '',
                    representative_name: item.representative_name || '',
                    contact_number: item.contact_number || '',
                    contract_status: item.status === 'For Transfer' ? 'Expired' : (item.status || 'Active'),
                    payment_id: item.payment_id || '',
                    notice_count: item.notice_count || 0,
                    is_archived: item.is_archived || false,
                    amount_paid: item.amount_paid || '',
                    payment_date: item.payment_date || '',
                    payment_method: item.payment_method || 'Cash',
                });
            } else if (type === 'section') {
                setFormData({
                    section_name: item.section_name || '',
                });
            } else if (type === 'structure') {
                setFormData({
                    block_name: item.block_name || '',
                    level_number: item.level_number || '',
                    niche_number: item.niche_number || '',
                    status: item.status || 'Vacant',
                    current_occupant_id: item.current_occupant_id || '',
                    section_id: item.section_id || '',
                });
            } else if (type === 'burial') {
                setFormData({
                    person_id: item.person_id || '',
                    death_date: item.death_date || '',
                    burial_date: item.burial_date || '',
                    cause_of_death: item.cause_of_death || '',
                    priest_id: item.priest_id || '',
                    place_of_interment: item.place_of_interment || '',
                    record_id: item.record_id || '',
                    contract_id: item.contract_id || '',
                    struct_id: item.struct_id || '',
                    burial_amount_paid: item.amount_paid || '',
                    burial_payment_date: item.payment_date || '',
                    burial_payment_method: item.payment_method || 'Cash',
                });
            } else if (type === 'exhumation') {
                setFormData({
                    exhumation_deceased_id: item.deceased_id || '',
                    original_struct_id: item.original_struct_id || '',
                    exhumation_date: item.exhumation_date || '',
                    reason: item.reason || '',
                    new_location: item.new_location || '',
                    witnessed_by: item.witnessed_by || '',
                    processed_by: item.processed_by || '',
                    exhumation_amount_paid: item.amount_paid || '',
                    exhumation_payment_date: item.payment_date || '',
                    exhumation_payment_method: item.payment_method || 'Cash',
                    exhumation_ledger_id: item.ledger_id || ''
                });
            } else if (type === 'transfer') {
                setFormData({
                    transfer_contract_id: item.contract_id || '',
                    transfer_destination_struct_id: '',
                    transfer_destination_location: '',
                    transfer_reason: 'Expired Lease',
                    transfer_notes: ''
                });
            }
        } else {
            // Adding mode
            if (type === 'record') {
                setFormData({
                    deceased_id: '',
                    block_no: '',
                    row_no: '',
                    lot_type: 'Common',
                    lease_start: '',
                    lease_end: '',
                });
            } else if (type === 'contract') {
                setFormData({
                    deceased_id: '',
                    struct_id: '',
                    contract_type: 'Lot',
                    start_date: '',
                    expiration_date: '',
                    representative_name: '',
                    contact_number: '',
                    contract_status: 'Active',
                    payment_id: '',
                    notice_count: 0,
                    is_archived: false,
                    amount_paid: '',
                    payment_date: '',
                    payment_method: 'Cash',
                });
            } else if (type === 'section') {
                setFormData({
                    section_name: '',
                });
            } else if (type === 'structure') {
                setFormData({
                    block_name: '',
                    level_number: '',
                    niche_number: '',
                    status: 'Vacant',
                    current_occupant_id: '',
                    section_id: '',
                });
            } else if (type === 'burial') {
                setFormData({
                    person_id: '',
                    death_date: '',
                    burial_date: '',
                    cause_of_death: '',
                    priest_id: '',
                    place_of_interment: '',
                    record_id: '',
                    contract_id: '',
                    struct_id: '',
                    burial_amount_paid: '',
                    burial_payment_date: '',
                    burial_payment_method: 'Cash',
                });
            } else if (type === 'exhumation') {
                setFormData({
                    exhumation_deceased_id: '',
                    original_struct_id: '',
                    exhumation_date: '',
                    reason: '',
                    new_location: '',
                    witnessed_by: '',
                    processed_by: '',
                    exhumation_amount_paid: '',
                    exhumation_payment_date: '',
                    exhumation_payment_method: 'Cash',
                    exhumation_ledger_id: ''
                });
            } else if (type === 'transfer') {
                setFormData({
                    transfer_contract_id: item?.contract_id || '',
                    transfer_destination_struct_id: '',
                    transfer_destination_location: '',
                    transfer_reason: 'Expired Lease',
                    transfer_notes: ''
                });
            }
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setDialogType('');
        setEditingItem(null);
    };

    const handleSubmit = async () => {
        if (dialogType === 'record') {
            await handleSubmitRecord();
        } else if (dialogType === 'contract') {
            await handleSubmitContract();
        } else if (dialogType === 'section') {
            await handleSubmitSection();
        } else if (dialogType === 'structure') {
            await handleSubmitStructure();
        } else if (dialogType === 'burial') {
            await handleSubmitBurial();
        } else if (dialogType === 'exhumation') {
            await handleSubmitExhumation();
        } else if (dialogType === 'transfer') {
            await handleSubmitTransfer();
        }
    };

    const handleSubmitRecord = async () => {
        if (!formData.deceased_id || !formData.block_no || !formData.row_no) {
            setError('Please fill in all required fields');
            return;
        }

        try {
            let response;
            if (editingItem) {
                response = await axios.put(`${API_BASE_URL}/cemetery-records.php`, {
                    lot_id: editingItem.lot_id,
                    ...formData
                });
            } else {
                response = await axios.post(`${API_BASE_URL}/cemetery-records.php`, formData);
            }
            
            if (response.data.success) {
                setSuccess(`Cemetery record ${editingItem ? 'updated' : 'added'} successfully`);
                fetchRecords();
                handleCloseDialog();
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err) {
            setError(err.response?.data?.message || `Error ${editingItem ? 'updating' : 'adding'} cemetery record`);
        }
    };

    const handleSubmitContract = async () => {
        if (!formData.contract_type || !formData.start_date || !formData.expiration_date || 
            !formData.representative_name || !formData.contact_number) {
            setError('Please fill in all required fields');
            return;
        }
        if (formData.expiration_date <= formData.start_date) {
            setError('Expiration date must be later than the start date');
            return;
        }

        try {
            let response;
            const contractData = {
                ...formData,
                status: formData.contract_status
            };
            delete contractData.contract_status;

            if (editingItem) {
                response = await axios.put(`${API_BASE_URL}/cemetery-contracts.php`, {
                    contract_id: editingItem.contract_id,
                    ...contractData
                });
            } else {
                response = await axios.post(`${API_BASE_URL}/cemetery-contracts.php`, contractData);
            }
            
            if (response.data.success) {
                setSuccess(`Cemetery contract ${editingItem ? 'updated' : 'added'} successfully`);
                fetchContracts();
                handleCloseDialog();
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err) {
            setError(err.response?.data?.message || `Error ${editingItem ? 'updating' : 'adding'} cemetery contract`);
        }
    };

    const handleSubmitSection = async () => {
        if (!formData.section_name) {
            setError('Please fill in section name');
            return;
        }

        try {
            let response;
            if (editingItem) {
                response = await axios.put(`${API_BASE_URL}/cemetery-sections.php`, {
                    section_id: editingItem.section_id,
                    ...formData
                });
            } else {
                response = await axios.post(`${API_BASE_URL}/cemetery-sections.php`, formData);
            }
            
            if (response.data.success) {
                setSuccess(`Cemetery section ${editingItem ? 'updated' : 'added'} successfully`);
                fetchSections();
                handleCloseDialog();
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err) {
            setError(err.response?.data?.message || `Error ${editingItem ? 'updating' : 'adding'} cemetery section`);
        }
    };

    const handleSubmitStructure = async () => {
        if (!formData.block_name || !formData.level_number || !formData.niche_number) {
            setError('Please fill in all required fields');
            return;
        }

        try {
            let response;
            if (editingItem) {
                response = await axios.put(`${API_BASE_URL}/cemetery-structures.php`, {
                    struct_id: editingItem.struct_id,
                    ...formData
                });
            } else {
                response = await axios.post(`${API_BASE_URL}/cemetery-structures.php`, formData);
            }
            
            if (response.data.success) {
                setSuccess(`Cemetery structure ${editingItem ? 'updated' : 'added'} successfully`);
                fetchStructures();
                handleCloseDialog();
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err) {
            setError(err.response?.data?.message || `Error ${editingItem ? 'updating' : 'adding'} cemetery structure`);
        }
    };

    const handleSubmitBurial = async () => {
        if (!formData.person_id || !formData.death_date || !formData.burial_date || !formData.cause_of_death || !formData.place_of_interment) {
            setError('Select a deceased person and fill in all required fields');
            return;
        }
        if (!formData.record_id && !formData.contract_id && !formData.struct_id) {
            setError('Assign a cemetery record, contract, or structure before recording the burial');
            return;
        }

        try {
            let response;
            const burialData = {
                person_id: formData.person_id,
                death_date: formData.death_date,
                burial_date: formData.burial_date,
                cause_of_death: formData.cause_of_death,
                priest_id: formData.priest_id,
                place_of_interment: formData.place_of_interment,
                record_id: formData.record_id,
                contract_id: formData.contract_id,
                struct_id: formData.struct_id,
                amount_paid: formData.burial_amount_paid,
                payment_date: formData.burial_payment_date,
                payment_method: formData.burial_payment_method
            };

            if (editingItem) {
                response = await axios.put(`${API_BASE_URL}/burial-records.php`, {
                    burial_id: editingItem.burial_id,
                    ...burialData
                });
            } else {
                response = await axios.post(`${API_BASE_URL}/burial-records.php`, burialData);
            }
            
            if (response.data.success) {
                setSuccess(`Burial record ${editingItem ? 'updated' : 'added'} successfully`);
                fetchBurialRecords();
                checkCemeteryContractNotifications();
                handleCloseDialog();
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err) {
            setError(err.response?.data?.message || `Error ${editingItem ? 'updating' : 'adding'} burial record`);
        }
    };

    const handleAddBurialPerson = async () => {
        if (!burialPersonData.first_name || !burialPersonData.last_name || !burialPersonData.gender || !burialPersonData.birth_date) {
            setError('Please fill in the new person\'s first name, last name, gender, and birth date');
            return;
        }

        try {
            const response = await axios.post(`${API_BASE_URL}/persons.php`, {
                ...burialPersonData,
                civil_status: 'Single',
                nationality: 'Filipino',
                is_alive: 0,
            });

            if (response.data.success) {
                const newPerson = { ...burialPersonData, person_id: response.data.person_id };
                setPersons((currentPersons) => [newPerson, ...currentPersons]);
                setFormData((currentFormData) => ({
                    ...currentFormData,
                    person_id: response.data.person_id,
                }));
                setBurialPersonData({ first_name: '', middle_name: '', last_name: '', gender: 'Male', birth_date: '', religion: '' });
                setOpenBurialPersonDialog(false);
                setError('');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error adding deceased person');
        }
    };

    const handleSubmitExhumation = async () => {
        if (!formData.exhumation_deceased_id || !formData.original_struct_id || !formData.exhumation_date || 
            !formData.reason || !formData.new_location || !formData.witnessed_by) {
            setError('Please fill in all required fields');
            return;
        }

        try {
            let response;
            const exhumationData = {
                deceased_id: formData.exhumation_deceased_id,
                original_struct_id: formData.original_struct_id,
                exhumation_date: formData.exhumation_date,
                reason: formData.reason,
                new_location: formData.new_location,
                witnessed_by: formData.witnessed_by,
                processed_by: formData.processed_by,
                amount_paid: formData.exhumation_amount_paid,
                payment_date: formData.exhumation_payment_date,
                payment_method: formData.exhumation_payment_method
            };

            if (editingItem) {
                response = await axios.put(`${API_BASE_URL}/exhumation-records.php`, {
                    exhumation_id: editingItem.exhumation_id,
                    ...exhumationData
                });
            } else {
                response = await axios.post(`${API_BASE_URL}/exhumation-records.php`, exhumationData);
            }
            
            if (response.data.success) {
                setSuccess(`Exhumation record ${editingItem ? 'updated' : 'added'} successfully`);
                fetchExhumationRecords();
                handleCloseDialog();
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err) {
            setError(err.response?.data?.message || `Error ${editingItem ? 'updating' : 'adding'} exhumation record`);
        }
    };

    const handleSubmitTransfer = async () => {
        if (!formData.transfer_contract_id || (!formData.transfer_destination_struct_id && !formData.transfer_destination_location)) {
            setError('Select a contract and provide a destination structure or location');
            return;
        }

        try {
            const response = await axios.post(`${API_BASE_URL}/cemetery-transfers.php`, {
                contract_id: formData.transfer_contract_id,
                destination_struct_id: formData.transfer_destination_struct_id,
                destination_location: formData.transfer_destination_location,
                reason: formData.transfer_reason,
                notes: formData.transfer_notes
            });
            if (response.data.success) {
                setSuccess('Transfer request created successfully');
                fetchTransferRecords();
                handleCloseDialog();
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error creating transfer request');
        }
    };

    const handleTransferStatus = async (transferId, status) => {
        try {
            const response = await axios.put(`${API_BASE_URL}/cemetery-transfers.php`, {
                transfer_id: transferId,
                status
            });
            if (response.data.success) {
                setSuccess(`Transfer request ${status.toLowerCase()} successfully`);
                fetchTransferRecords();
                fetchContracts();
                fetchStructures();
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err) {
            setError(err.response?.data?.message || `Error changing transfer to ${status.toLowerCase()}`);
        }
    };

    const handleRenewContract = async (contract) => {
        const expirationDate = window.prompt('New expiration date (YYYY-MM-DD)', contract.expiration_date || '');
        if (!expirationDate) return;
        try {
            const response = await axios.put(`${API_BASE_URL}/cemetery-contracts.php`, {
                action: 'renew',
                contract_id: contract.contract_id,
                expiration_date: expirationDate,
                amount_paid: contract.amount_paid || 0,
                payment_date: new Date().toISOString().slice(0, 10),
                payment_method: contract.payment_method || 'Cash'
            });
            if (response.data.success) {
                setSuccess('Cemetery contract renewed successfully');
                fetchContracts();
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error renewing cemetery contract');
        }
    };

    const handleDelete = async (type, id) => {
        if (!window.confirm(`Are you sure you want to delete this cemetery ${type}?`)) {
            return;
        }

        try {
            let endpoint;
            let deleteConfig = {};
            
            switch (type) {
                case 'record':
                    endpoint = 'cemetery-records.php';
                    deleteConfig = {
                        data: { lot_id: id },
                        headers: { 'Content-Type': 'application/json' }
                    };
                    break;
                case 'contract':
                    endpoint = 'cemetery-contracts.php';
                    deleteConfig = {
                        data: { contract_id: id },
                        headers: { 'Content-Type': 'application/json' }
                    };
                    break;
                case 'section':
                    endpoint = 'cemetery-sections.php';
                    deleteConfig = {
                        data: { section_id: id },
                        headers: { 'Content-Type': 'application/json' }
                    };
                    break;
                case 'structure':
                    endpoint = 'cemetery-structures.php';
                    deleteConfig = {
                        data: { struct_id: id },
                        headers: { 'Content-Type': 'application/json' }
                    };
                    break;
                case 'burial':
                    endpoint = 'burial-records.php';
                    deleteConfig = {
                        data: { burial_id: id },
                        headers: { 'Content-Type': 'application/json' }
                    };
                    break;
                case 'exhumation':
                    endpoint = 'exhumation-records.php';
                    deleteConfig = {
                        data: { exhumation_id: id },
                        headers: { 'Content-Type': 'application/json' }
                    };
                    break;
                default:
                    return;
            }

            const response = await axios.delete(`${API_BASE_URL}/${endpoint}`, deleteConfig);
            if (response.data.success) {
                setSuccess(`Cemetery ${type} deleted successfully`);
                
                // Refresh the appropriate data
                switch (type) {
                    case 'record':
                        fetchRecords();
                        break;
                    case 'contract':
                        fetchContracts();
                        break;
                    case 'section':
                        fetchSections();
                        break;
                    case 'structure':
                        fetchStructures();
                        break;
                    case 'burial':
                        fetchBurialRecords();
                        break;
                    case 'exhumation':
                        fetchExhumationRecords();
                        break;
                }
                
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err) {
            setError(err.response?.data?.message || `Error deleting cemetery ${type}`);
        }
    };

    const renderRecordsTab = () => (
        <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3 }}>
                <Typography variant="h5" sx={{ color: '#123b50', fontWeight: 800 }}>Cemetery records</Typography>
                {canCreate('cemetery_records') && (
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog('record')}
                        sx={{ bgcolor: '#d6a85a', color: '#123b50', '&:hover': { bgcolor: '#e3ba70' }, boxShadow: 'none' }}
                    >
                        Add Cemetery Record
                    </Button>
                )}
            </Box>

            <Card sx={{ mb: 3, borderRadius: 3, border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)' }}>
                <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Box sx={{ p: 2, bgcolor: '#e5f3f6', borderTop: '3px solid #168fa3', borderRadius: 2 }}>
                                <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700 }}>
                                    Total Lots
                                </Typography>
                                <Typography variant="h5">{records.length}</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Box sx={{ p: 2, bgcolor: '#f1e9f6', borderTop: '3px solid #7d6acb', borderRadius: 2 }}>
                                <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700 }}>
                                    Common Lots
                                </Typography>
                                <Typography variant="h5">
                                    {records.filter(r => r.lot_type === 'Common').length}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Box sx={{ p: 2, bgcolor: '#e8f4ec', borderTop: '3px solid #25a878', borderRadius: 2 }}>
                                <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700 }}>
                                    Apartment-Type
                                </Typography>
                                <Typography variant="h5">
                                    {records.filter(r => r.lot_type === 'Apartment-Type').length}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Box sx={{ p: 2, bgcolor: '#fff4df', borderTop: '3px solid #d49347', borderRadius: 2 }}>
                                <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700 }}>
                                    Private Lots
                                </Typography>
                                <Typography variant="h5">
                                    {records.filter(r => r.lot_type === 'Private').length}
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)', overflow: 'hidden' }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell><strong>Lot ID</strong></TableCell>
                            <TableCell><strong>Deceased</strong></TableCell>
                            <TableCell><strong>Block</strong></TableCell>
                            <TableCell><strong>Row</strong></TableCell>
                            <TableCell><strong>Type</strong></TableCell>
                            <TableCell><strong>Lease Start</strong></TableCell>
                            <TableCell><strong>Lease End</strong></TableCell>
                            <TableCell align="center"><strong>Actions</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {records.length > 0 ? (
                            records.map((record) => (
                                <TableRow key={record.lot_id} hover>
                                    <TableCell>{record.lot_id}</TableCell>
                                    <TableCell>{record.first_name} {record.last_name}</TableCell>
                                    <TableCell>{record.block_no}</TableCell>
                                    <TableCell>{record.row_no}</TableCell>
                                    <TableCell>{record.lot_type}</TableCell>
                                    <TableCell>{record.lease_start}</TableCell>
                                    <TableCell>{record.lease_end}</TableCell>
                                    <TableCell align="center">
                                        {canUpdate('cemetery_records') && (
                                            <IconButton
                                                color="primary"
                                                size="small"
                                                onClick={() => handleOpenDialog('record', record)}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        )}
                                        {canDelete('cemetery_records') && (
                                            <IconButton
                                                color="error"
                                                size="small"
                                                onClick={() => handleDelete('record', record.lot_id)}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={11} align="center" sx={{ py: 3 }}>
                                    No burial records found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </>
    );

    const renderContractsTab = () => (
        <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5">Cemetery Contracts</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    {canCreate('cemetery_contracts') && (
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<AddIcon />}
                            onClick={() => handleOpenDialog('contract')}
                        >
                            Add Contract
                        </Button>
                    )}
                </Box>
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell><strong>Contract ID</strong></TableCell>
                            <TableCell><strong>Deceased</strong></TableCell>
                            <TableCell><strong>Type</strong></TableCell>
                            <TableCell><strong>Start Date</strong></TableCell>
                            <TableCell><strong>Expiration</strong></TableCell>
                            <TableCell><strong>Representative</strong></TableCell>
                            <TableCell><strong>Status</strong></TableCell>
                            <TableCell align="center"><strong>Actions</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {contracts.length > 0 ? (
                            contracts.map((contract) => (
                                <TableRow key={contract.contract_id} hover>
                                    <TableCell>{contract.contract_id}</TableCell>
                                    <TableCell>{contract.first_name} {contract.last_name}</TableCell>
                                    <TableCell>{contract.contract_type}</TableCell>
                                    <TableCell>{contract.start_date}</TableCell>
                                    <TableCell>{contract.expiration_date}</TableCell>
                                    <TableCell>{contract.representative_name}</TableCell>
                                    <TableCell>{contract.status}</TableCell>
                                    <TableCell align="center">
                                        {canUpdate('cemetery_contracts') && (
                                            <IconButton
                                                color="primary"
                                                size="small"
                                                onClick={() => handleOpenDialog('contract', contract)}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        )}
                                        {canUpdate('cemetery_contracts') && contract.status === 'Expired' && (
                                            <Button size="small" onClick={() => handleRenewContract(contract)}>
                                                Renew
                                            </Button>
                                        )}
                                        {canCreate('exhumation_records') && contract.status === 'Expired' && (
                                            <Button size="small" onClick={() => handleOpenDialog('transfer', contract)}>
                                                Transfer
                                            </Button>
                                        )}
                                        {canDelete('cemetery_contracts') && (
                                            <IconButton
                                                color="error"
                                                size="small"
                                                onClick={() => handleDelete('contract', contract.contract_id)}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                                    No cemetery contracts found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </>
    );

    const renderSectionsTab = () => (
        <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5">Cemetery Sections</Typography>
                {canCreate('cemetery_sections') && (
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog('section')}
                    >
                        Add Section
                    </Button>
                )}
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell><strong>Section ID</strong></TableCell>
                            <TableCell><strong>Section Name</strong></TableCell>
                            <TableCell align="center"><strong>Actions</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sections.length > 0 ? (
                            sections.map((section) => (
                                <TableRow key={section.section_id} hover>
                                    <TableCell>{section.section_id}</TableCell>
                                    <TableCell>{section.section_name}</TableCell>
                                    <TableCell align="center">
                                        {canUpdate('cemetery_sections') && (
                                            <IconButton
                                                color="primary"
                                                size="small"
                                                onClick={() => handleOpenDialog('section', section)}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        )}
                                        {canDelete('cemetery_sections') && (
                                            <IconButton
                                                color="error"
                                                size="small"
                                                onClick={() => handleDelete('section', section.section_id)}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                                    No cemetery sections found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </>
    );

    const renderStructuresTab = () => (
        <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5">Cemetery Structures</Typography>
                {canCreate('cemetery_structures') && (
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog('structure')}
                    >
                        Add Structure
                    </Button>
                )}
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell><strong>Struct ID</strong></TableCell>
                            <TableCell><strong>Block</strong></TableCell>
                            <TableCell><strong>Level</strong></TableCell>
                            <TableCell><strong>Niche</strong></TableCell>
                            <TableCell><strong>Section</strong></TableCell>
                            <TableCell><strong>Occupant</strong></TableCell>
                            <TableCell><strong>Status</strong></TableCell>
                            <TableCell align="center"><strong>Actions</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {structures.length > 0 ? (
                            structures.map((structure) => (
                                <TableRow key={structure.struct_id} hover>
                                    <TableCell>{structure.struct_id}</TableCell>
                                    <TableCell>{structure.block_name}</TableCell>
                                    <TableCell>{structure.level_number}</TableCell>
                                    <TableCell>{structure.niche_number}</TableCell>
                                    <TableCell>{structure.section_name}</TableCell>
                                    <TableCell>{structure.first_name} {structure.last_name}</TableCell>
                                    <TableCell>{structure.status}</TableCell>
                                    <TableCell align="center">
                                        {canUpdate('cemetery_structures') && (
                                            <IconButton
                                                color="primary"
                                                size="small"
                                                onClick={() => handleOpenDialog('structure', structure)}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        )}
                                        {canDelete('cemetery_structures') && (
                                            <IconButton
                                                color="error"
                                                size="small"
                                                onClick={() => handleDelete('structure', structure.struct_id)}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                                    No cemetery structures found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </>
    );

    const renderBurialRecordsTab = () => (
        <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5">Burial Records</Typography>
                {canCreate('burial_records') && (
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog('burial')}
                    >
                        Add Burial Record
                    </Button>
                )}
            </Box>

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={4}>
                            <Box sx={{ p: 2, bgcolor: '#e8f5e9', borderRadius: 1 }}>
                                <Typography color="textSecondary" gutterBottom>
                                    Total Burials
                                </Typography>
                                <Typography variant="h5">{burialRecords.length}</Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell><strong>Burial ID</strong></TableCell>
                            <TableCell><strong>Person</strong></TableCell>
                            <TableCell><strong>Death Date</strong></TableCell>
                            <TableCell><strong>Burial Date</strong></TableCell>
                            <TableCell><strong>Cause of Death</strong></TableCell>
                            <TableCell><strong>Priest</strong></TableCell>
                            <TableCell><strong>Place of Interment</strong></TableCell>
                            <TableCell><strong>Cemetery Record</strong></TableCell>
                            <TableCell><strong>Structure</strong></TableCell>
                            <TableCell><strong>Contract</strong></TableCell>
                            <TableCell align="center"><strong>Actions</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {burialRecords.length > 0 ? (
                            burialRecords.map((burial) => (
                                <TableRow key={burial.burial_id} hover>
                                    <TableCell>{burial.burial_id}</TableCell>
                                    <TableCell>{burial.first_name} {burial.last_name}</TableCell>
                                    <TableCell>{burial.death_date}</TableCell>
                                    <TableCell>{burial.burial_date}</TableCell>
                                    <TableCell>{burial.cause_of_death}</TableCell>
                                    <TableCell>{burial.priest_first} {burial.priest_last}</TableCell>
                                    <TableCell>{burial.place_of_interment}</TableCell>
                                    <TableCell>{burial.record_block_no ? `${burial.record_block_no}/${burial.record_row_no}` : 'â€”'}</TableCell>
                                    <TableCell>{burial.struct_block_name ? `${burial.struct_block_name} ${burial.struct_niche_number}` : 'â€”'}</TableCell>
                                    <TableCell>{burial.contract_type || 'â€”'}</TableCell>
                                    <TableCell align="center">
                                        {canUpdate('burial_records') && (
                                            <IconButton
                                                color="primary"
                                                size="small"
                                                onClick={() => handleOpenDialog('burial', burial)}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        )}
                                        {canDelete('burial_records') && (
                                            <IconButton
                                                color="error"
                                                size="small"
                                                onClick={() => handleDelete('burial', burial.burial_id)}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                                    No burial records found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </>
    );

    const renderExhumationRecordsTab = () => (
        <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5">Exhumation Records</Typography>
                {canCreate('exhumation_records') && (
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog('exhumation')}
                    >
                        Add Exhumation Record
                    </Button>
                )}
            </Box>

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={4}>
                            <Box sx={{ p: 2, bgcolor: '#fff3e0', borderRadius: 1 }}>
                                <Typography color="textSecondary" gutterBottom>
                                    Total Exhumations
                                </Typography>
                                <Typography variant="h5">{exhumationRecords.length}</Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell><strong>Exhumation ID</strong></TableCell>
                            <TableCell><strong>Deceased</strong></TableCell>
                            <TableCell><strong>Original Structure</strong></TableCell>
                            <TableCell><strong>Exhumation Date</strong></TableCell>
                            <TableCell><strong>Reason</strong></TableCell>
                            <TableCell><strong>New Location</strong></TableCell>
                            <TableCell><strong>Witnessed By</strong></TableCell>
                            <TableCell align="center"><strong>Actions</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {exhumationRecords.length > 0 ? (
                            exhumationRecords.map((exhumation) => (
                                <TableRow key={exhumation.exhumation_id} hover>
                                    <TableCell>{exhumation.exhumation_id}</TableCell>
                                    <TableCell>{exhumation.first_name} {exhumation.last_name}</TableCell>
                                    <TableCell>{exhumation.block_name} - {exhumation.niche_number}</TableCell>
                                    <TableCell>{exhumation.exhumation_date}</TableCell>
                                    <TableCell>{exhumation.reason}</TableCell>
                                    <TableCell>{exhumation.new_location}</TableCell>
                                    <TableCell>{exhumation.witnessed_by}</TableCell>
                                    <TableCell align="center">
                                        {canUpdate('exhumation_records') && (
                                            <IconButton
                                                color="primary"
                                                size="small"
                                                onClick={() => handleOpenDialog('exhumation', exhumation)}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        )}
                                        {canDelete('exhumation_records') && (
                                            <IconButton
                                                color="error"
                                                size="small"
                                                onClick={() => handleDelete('exhumation', exhumation.exhumation_id)}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                                    No exhumation records found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </>
    );

    const renderTransfersTab = () => (
        <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5">Transfer Review Queue</Typography>
            </Box>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell><strong>Request</strong></TableCell>
                            <TableCell><strong>Deceased</strong></TableCell>
                            <TableCell><strong>From</strong></TableCell>
                            <TableCell><strong>Destination</strong></TableCell>
                            <TableCell><strong>Reason</strong></TableCell>
                            <TableCell><strong>Status</strong></TableCell>
                            <TableCell align="center"><strong>Actions</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {transferRecords.length > 0 ? transferRecords.map((transfer) => (
                            <TableRow key={transfer.transfer_id} hover>
                                <TableCell>{transfer.transfer_id}</TableCell>
                                <TableCell>{transfer.first_name} {transfer.last_name}</TableCell>
                                <TableCell>{transfer.original_block || '-'} {transfer.original_niche || ''}</TableCell>
                                <TableCell>{transfer.destination_block ? `${transfer.destination_block} ${transfer.destination_niche}` : transfer.destination_location}</TableCell>
                                <TableCell>{transfer.reason}</TableCell>
                                <TableCell>{transfer.status}</TableCell>
                                <TableCell align="center">
                                    {transfer.status === 'Pending' && canUpdate('cemetery_contracts') && (
                                        <>
                                            <Button size="small" onClick={() => handleTransferStatus(transfer.transfer_id, 'Approved')}>Approve</Button>
                                            <Button size="small" color="error" onClick={() => handleTransferStatus(transfer.transfer_id, 'Rejected')}>Reject</Button>
                                        </>
                                    )}
                                    {transfer.status === 'Approved' && canUpdate('cemetery_contracts') && (
                                        <Button size="small" onClick={() => handleTransferStatus(transfer.transfer_id, 'Completed')}>Complete</Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow><TableCell colSpan={7} align="center" sx={{ py: 3 }}>No transfer requests found</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </>
    );

    const renderDialogContent = () => {
        if (dialogType === 'record') {
            return (
                <>
                    <FormControl fullWidth margin="normal" required>
                        <InputLabel>Deceased Person</InputLabel>
                        <Select
                            value={formData.deceased_id}
                            onChange={(e) => {
                                const defaults = getPersonCemeteryDefaults(e.target.value);
                                setFormData({
                                    ...formData,
                                    deceased_id: e.target.value,
                                    block_no: formData.block_no || defaults.block_no,
                                    row_no: formData.row_no || defaults.row_no,
                                    lot_type: formData.lot_type || defaults.lot_type,
                                    lease_start: formData.lease_start || defaults.start_date,
                                    lease_end: formData.lease_end || defaults.expiration_date,
                                });
                            }}
                            label="Deceased Person"
                        >
                            <MenuItem value="">Select a person</MenuItem>
                            {persons.map((person) => (
                                <MenuItem key={person.person_id} value={person.person_id}>
                                    {person.first_name} {person.last_name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Block Number"
                        value={formData.block_no}
                        onChange={(e) => setFormData({ ...formData, block_no: e.target.value })}
                        required
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Row Number"
                        value={formData.row_no}
                        onChange={(e) => setFormData({ ...formData, row_no: e.target.value })}
                        required
                    />
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Lot Type</InputLabel>
                        <Select
                            value={formData.lot_type}
                            onChange={(e) => setFormData({ ...formData, lot_type: e.target.value })}
                            label="Lot Type"
                        >
                            <MenuItem value="Common">Common</MenuItem>
                            <MenuItem value="Apartment-Type">Apartment-Type</MenuItem>
                            <MenuItem value="Private">Private</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Lease Start Date"
                        type="date"
                        value={formData.lease_start}
                        onChange={(e) => setFormData({ ...formData, lease_start: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Lease End Date"
                        type="date"
                        value={formData.lease_end}
                        onChange={(e) => setFormData({ ...formData, lease_end: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                    />
                </>
            );
        } else if (dialogType === 'contract') {
            return (
                <>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Deceased Person</InputLabel>
                        <Select
                            value={formData.deceased_id}
                            onChange={(e) => {
                                const selectedPersonId = e.target.value;
                                const defaults = getPersonCemeteryDefaults(selectedPersonId);
                                setFormData({
                                    ...formData,
                                    deceased_id: selectedPersonId,
                                    ...(defaults.start_date ? {
                                        start_date: formData.start_date || defaults.start_date,
                                        expiration_date: formData.expiration_date || defaults.expiration_date,
                                    } : {}),
                                    struct_id: formData.struct_id || defaults.struct_id,
                                    representative_name: formData.representative_name || defaults.representative_name,
                                    contact_number: formData.contact_number || defaults.contact_number,
                                });
                            }}
                            label="Deceased Person"
                        >
                            <MenuItem value="">Select a person (optional)</MenuItem>
                            {persons.map((person) => (
                                <MenuItem key={person.person_id} value={person.person_id}>
                                    {person.first_name} {person.last_name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Structure</InputLabel>
                        <Select
                            value={formData.struct_id}
                            onChange={(e) => setFormData({ ...formData, struct_id: e.target.value })}
                            label="Structure"
                        >
                            <MenuItem value="">Select a structure (optional)</MenuItem>
                            {structures.filter((structure) => structure.status === 'Vacant' || String(structure.struct_id) === String(formData.struct_id)).map((structure) => (
                                <MenuItem key={structure.struct_id} value={structure.struct_id}>
                                    {structure.block_name} - Level {structure.level_number} - Niche {structure.niche_number}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="normal" required>
                        <InputLabel>Contract Type</InputLabel>
                        <Select
                            value={formData.contract_type}
                            onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })}
                            label="Contract Type"
                        >
                            <MenuItem value="Ossuary">Ossuary</MenuItem>
                            <MenuItem value="Niche Rental">Niche Rental</MenuItem>
                            <MenuItem value="Lot">Lot</MenuItem>
                            <MenuItem value="Mass Grave">Mass Grave</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Start Date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                        required
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Expiration Date"
                        type="date"
                        value={formData.expiration_date}
                        onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                        required
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Representative Name"
                        value={formData.representative_name}
                        onChange={(e) => setFormData({ ...formData, representative_name: e.target.value })}
                        required
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Contact Number"
                        value={formData.contact_number}
                        onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                        required
                    />
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Status</InputLabel>
                        <Select
                            value={formData.contract_status}
                            onChange={(e) => setFormData({ ...formData, contract_status: e.target.value })}
                            label="Status"
                        >
                            <MenuItem value="Active">Active</MenuItem>
                            <MenuItem value="Expired">Expired</MenuItem>
                            <MenuItem value="For Transfer">For Transfer</MenuItem>
                            <MenuItem value="Transferred">Transferred</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Amount Paid"
                        type="number"
                        inputProps={{ step: '0.01', min: '0' }}
                        value={formData.amount_paid}
                        onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })}
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Payment Date"
                        type="date"
                        value={formData.payment_date}
                        onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                    />
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Payment Method</InputLabel>
                        <Select
                            value={formData.payment_method}
                            onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                            label="Payment Method"
                        >
                            <MenuItem value="Cash">Cash</MenuItem>
                            <MenuItem value="GCash">GCash</MenuItem>
                            <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                            <MenuItem value="Check">Check</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Notice Count"
                        type="number"
                        inputProps={{ min: '0' }}
                        value={formData.notice_count}
                        onChange={(e) => setFormData({ ...formData, notice_count: e.target.value })}
                    />
                </>
            );
        } else if (dialogType === 'section') {
            return (
                <TextField
                    fullWidth
                    margin="normal"
                    label="Section Name"
                    value={formData.section_name}
                    onChange={(e) => setFormData({ ...formData, section_name: e.target.value })}
                    required
                />
            );
        } else if (dialogType === 'structure') {
            return (
                <>
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Block Name"
                        value={formData.block_name}
                        onChange={(e) => setFormData({ ...formData, block_name: e.target.value })}
                        required
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Level Number"
                        type="number"
                        value={formData.level_number}
                        onChange={(e) => setFormData({ ...formData, level_number: e.target.value })}
                        required
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Niche Number"
                        value={formData.niche_number}
                        onChange={(e) => setFormData({ ...formData, niche_number: e.target.value })}
                        required
                    />
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Section</InputLabel>
                        <Select
                            value={formData.section_id}
                            onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
                            label="Section"
                        >
                            <MenuItem value="">Select a section</MenuItem>
                            {sections.map((section) => (
                                <MenuItem key={section.section_id} value={section.section_id}>
                                    {section.section_name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Current Occupant</InputLabel>
                        <Select
                            value={formData.current_occupant_id}
                            onChange={(e) => setFormData({ ...formData, current_occupant_id: e.target.value })}
                            label="Current Occupant"
                        >
                            <MenuItem value="">Select an occupant (optional)</MenuItem>
                            {persons.map((person) => (
                                <MenuItem key={person.person_id} value={person.person_id}>
                                    {person.first_name} {person.last_name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Status</InputLabel>
                        <Select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            label="Status"
                        >
                            <MenuItem value="Vacant">Vacant</MenuItem>
                            <MenuItem value="Occupied">Occupied</MenuItem>
                            <MenuItem value="Expired">Expired</MenuItem>
                            <MenuItem value="Reserved">Reserved</MenuItem>
                        </Select>
                    </FormControl>
                </>
            );
        } else if (dialogType === 'burial') {
            return (
                <>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <FormControl fullWidth margin="normal">
                            <InputLabel>Deceased Person</InputLabel>
                            <Select
                                value={formData.person_id}
                                onChange={(e) => {
                                    const selectedPersonId = e.target.value;
                                    const linkedData = getPersonCemeteryLinks(selectedPersonId);
                                    setFormData({
                                        ...formData,
                                        person_id: selectedPersonId,
                                        record_id: linkedData.record_id,
                                        contract_id: linkedData.contract_id,
                                        struct_id: linkedData.struct_id,
                                    });
                                }}
                                label="Deceased Person"
                                required
                            >
                                <MenuItem value="">Select a person</MenuItem>
                                {persons.map((person) => (
                                    <MenuItem key={person.person_id} value={person.person_id}>
                                        {person.first_name} {person.middle_name ? `${person.middle_name} ` : ''}{person.last_name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Button
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={() => setOpenBurialPersonDialog(true)}
                            sx={{ mt: 2, whiteSpace: 'nowrap' }}
                        >
                            New Person
                        </Button>
                    </Box>
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Death Date"
                        type="date"
                        value={formData.death_date}
                        onChange={(e) => setFormData({ ...formData, death_date: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                        required
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Burial Date"
                        type="date"
                        value={formData.burial_date}
                        onChange={(e) => setFormData({ ...formData, burial_date: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                        required
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Cause of Death"
                        value={formData.cause_of_death}
                        onChange={(e) => setFormData({ ...formData, cause_of_death: e.target.value })}
                        required
                    />
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Priest</InputLabel>
                        <Select
                            value={formData.priest_id}
                            onChange={(e) => setFormData({ ...formData, priest_id: e.target.value })}
                            label="Priest"
                        >
                            <MenuItem value="">Select a priest (optional)</MenuItem>
                            {persons.map((person) => (
                                <MenuItem key={person.person_id} value={person.person_id}>
                                    {person.first_name} {person.last_name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Cemetery Record</InputLabel>
                        <Select
                            value={formData.record_id}
                            onChange={(e) => setFormData({ ...formData, record_id: e.target.value })}
                            label="Cemetery Record"
                        >
                            <MenuItem value="">Select a cemetery record</MenuItem>
                            {records.map((record) => (
                                <MenuItem key={record.lot_id} value={record.lot_id}>
                                    {record.block_no} / {record.row_no} ({record.lot_type})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Cemetery Contract</InputLabel>
                        <Select
                            value={formData.contract_id}
                            onChange={(e) => setFormData({ ...formData, contract_id: e.target.value })}
                            label="Cemetery Contract"
                        >
                            <MenuItem value="">Select a cemetery contract</MenuItem>
                            {contracts.map((contract) => (
                                <MenuItem key={contract.contract_id} value={contract.contract_id}>
                                    {contract.contract_type} - {contract.representative_name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Cemetery Structure</InputLabel>
                        <Select
                            value={formData.struct_id}
                            onChange={(e) => setFormData({ ...formData, struct_id: e.target.value })}
                            label="Cemetery Structure"
                        >
                            <MenuItem value="">Select a cemetery structure</MenuItem>
                            {structures.map((structure) => (
                                <MenuItem key={structure.struct_id} value={structure.struct_id}>
                                    {structure.block_name} - {structure.niche_number} ({structure.section_name || structure.section_id})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Place of Interment"
                        value={formData.place_of_interment}
                        onChange={(e) => setFormData({ ...formData, place_of_interment: e.target.value })}
                        required
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Amount Paid (for Burial Service)"
                        type="number"
                        inputProps={{ step: '0.01', min: '0' }}
                        value={formData.burial_amount_paid}
                        onChange={(e) => setFormData({ ...formData, burial_amount_paid: e.target.value })}
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Payment Date"
                        type="date"
                        value={formData.burial_payment_date}
                        onChange={(e) => setFormData({ ...formData, burial_payment_date: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                    />
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Payment Method</InputLabel>
                        <Select
                            value={formData.burial_payment_method}
                            onChange={(e) => setFormData({ ...formData, burial_payment_method: e.target.value })}
                            label="Payment Method"
                        >
                            <MenuItem value="Cash">Cash</MenuItem>
                            <MenuItem value="GCash">GCash</MenuItem>
                            <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                            <MenuItem value="Check">Check</MenuItem>
                        </Select>
                    </FormControl>
                </>
            );
        } else if (dialogType === 'exhumation') {
            return (
                <>
                    <FormControl fullWidth margin="normal" required>
                        <InputLabel>Deceased Person</InputLabel>
                        <Select
                            value={formData.exhumation_deceased_id}
                            onChange={(e) => {
                                const defaults = getPersonCemeteryDefaults(e.target.value);
                                setFormData({
                                    ...formData,
                                    exhumation_deceased_id: e.target.value,
                                    original_struct_id: formData.original_struct_id || defaults.struct_id,
                                });
                            }}
                            label="Deceased Person"
                        >
                            <MenuItem value="">Select a person</MenuItem>
                            {persons.map((person) => (
                                <MenuItem key={person.person_id} value={person.person_id}>
                                    {person.first_name} {person.last_name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="normal" required>
                        <InputLabel>Original Structure</InputLabel>
                        <Select
                            value={formData.original_struct_id}
                            onChange={(e) => setFormData({ ...formData, original_struct_id: e.target.value })}
                            label="Original Structure"
                        >
                            <MenuItem value="">Select a structure</MenuItem>
                            {structures.map((structure) => (
                                <MenuItem key={structure.struct_id} value={structure.struct_id}>
                                    {structure.block_name} - {structure.niche_number} ({structure.section_name})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Exhumation Date"
                        type="date"
                        value={formData.exhumation_date}
                        onChange={(e) => setFormData({ ...formData, exhumation_date: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                        required
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Reason"
                        value={formData.reason}
                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                        required
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="New Location"
                        value={formData.new_location}
                        onChange={(e) => setFormData({ ...formData, new_location: e.target.value })}
                        required
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Witnessed By"
                        value={formData.witnessed_by}
                        onChange={(e) => setFormData({ ...formData, witnessed_by: e.target.value })}
                        required
                    />
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Processed By</InputLabel>
                        <Select
                            value={formData.processed_by}
                            onChange={(e) => setFormData({ ...formData, processed_by: e.target.value })}
                            label="Processed By"
                        >
                            <MenuItem value="">Select a user (optional)</MenuItem>
                            {users.map((user) => (
                                <MenuItem key={user.user_id} value={user.user_id}>
                                    {user.first_name} {user.last_name} ({user.username})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Amount Paid"
                        type="number"
                        inputProps={{ step: '0.01', min: '0' }}
                        value={formData.exhumation_amount_paid}
                        onChange={(e) => setFormData({ ...formData, exhumation_amount_paid: e.target.value })}
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Payment Date"
                        type="date"
                        value={formData.exhumation_payment_date}
                        onChange={(e) => setFormData({ ...formData, exhumation_payment_date: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                    />
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Payment Method</InputLabel>
                        <Select
                            value={formData.exhumation_payment_method}
                            onChange={(e) => setFormData({ ...formData, exhumation_payment_method: e.target.value })}
                            label="Payment Method"
                        >
                            <MenuItem value="Cash">Cash</MenuItem>
                            <MenuItem value="GCash">GCash</MenuItem>
                            <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                            <MenuItem value="Check">Check</MenuItem>
                        </Select>
                    </FormControl>
                </>
            );
        } else if (dialogType === 'transfer') {
            return (
                <>
                    <FormControl fullWidth margin="normal" required>
                        <InputLabel>Contract</InputLabel>
                        <Select
                            value={formData.transfer_contract_id}
                            onChange={(e) => setFormData({ ...formData, transfer_contract_id: e.target.value })}
                            label="Contract"
                        >
                            <MenuItem value="">Select a contract</MenuItem>
                            {contracts.filter((contract) => ['Expired', 'For Transfer'].includes(contract.status)).map((contract) => (
                                <MenuItem key={contract.contract_id} value={contract.contract_id}>
                                    #{contract.contract_id} - {contract.first_name} {contract.last_name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Destination Structure</InputLabel>
                        <Select
                            value={formData.transfer_destination_struct_id}
                            onChange={(e) => setFormData({ ...formData, transfer_destination_struct_id: e.target.value })}
                            label="Destination Structure"
                        >
                            <MenuItem value="">Use another location instead</MenuItem>
                            {structures.filter((structure) => structure.status === 'Vacant').map((structure) => (
                                <MenuItem key={structure.struct_id} value={structure.struct_id}>
                                    {structure.block_name} - {structure.niche_number} ({structure.section_name || structure.section_id})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Destination Location"
                        value={formData.transfer_destination_location}
                        onChange={(e) => setFormData({ ...formData, transfer_destination_location: e.target.value })}
                        helperText="Use this for a mass grave, ossuary, or external location."
                    />
                    <FormControl fullWidth margin="normal" required>
                        <InputLabel>Reason</InputLabel>
                        <Select
                            value={formData.transfer_reason}
                            onChange={(e) => setFormData({ ...formData, transfer_reason: e.target.value })}
                            label="Reason"
                        >
                            <MenuItem value="Expired Lease">Expired Lease</MenuItem>
                            <MenuItem value="Family Request">Family Request</MenuItem>
                            <MenuItem value="Transfer">Transfer</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Notes"
                        multiline
                        minRows={2}
                        value={formData.transfer_notes}
                        onChange={(e) => setFormData({ ...formData, transfer_notes: e.target.value })}
                    />
                </>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress />
            </Container>
        );
    }

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#edf3f1' }}>
        <Box sx={{ py: { xs: 2.5, md: 3 }, background: 'linear-gradient(110deg, #123b50 0%, #0b6b68 70%, #d1a557 155%)', boxShadow: '0 12px 26px rgba(13, 70, 76, 0.14)' }}>
            <Container maxWidth="lg">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <IconButton onClick={() => navigate('/dashboard')} aria-label="Back to dashboard" sx={{ backgroundColor: 'rgba(255,255,255,0.14)', color: 'white', '&:hover': { backgroundColor: 'rgba(255,255,255,0.24)' } }}>
                        <ArrowBackIcon />
                    </IconButton>
                    <Box>
                        <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: '0.12em' }}>
                            Memorial stewardship
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: 'white', lineHeight: 1.15 }}>
                            Cemetery management
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.78)', mt: 0.5 }}>
                            Lots, contracts, burials, and records in one workspace.
                        </Typography>
                    </Box>
                </Box>
            </Container>
        </Box>
        <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
                    <Tab label="Cemetery Records" />
                    <Tab label="Contracts" />
                    <Tab label="Sections" />
                    <Tab label="Structures" />
                    <Tab label="Burial Records" />
                    <Tab label="Exhumation Records" />
                    <Tab label="Transfers" />
                </Tabs>
            </Box>

            {activeTab === 0 && renderRecordsTab()}
            {activeTab === 1 && renderContractsTab()}
            {activeTab === 2 && renderSectionsTab()}
            {activeTab === 3 && renderStructuresTab()}
            {activeTab === 4 && renderBurialRecordsTab()}
            {activeTab === 5 && renderExhumationRecordsTab()}
            {activeTab === 6 && renderTransfersTab()}

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>
                    {editingItem ? 'Edit' : 'Add'} {dialogType === 'record' ? 'Cemetery Record' : 
                                                   dialogType === 'contract' ? 'Cemetery Contract' :
                                                   dialogType === 'section' ? 'Cemetery Section' :
                                                   dialogType === 'structure' ? 'Cemetery Structure' :
                                                   dialogType === 'burial' ? 'Burial Record' :
                                                   dialogType === 'exhumation' ? 'Exhumation Record' :
                                                   'Transfer Request'}
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    {renderDialogContent()}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained" color="primary">
                        {dialogType === 'transfer' ? 'Submit Request' : editingItem ? 'Update' : 'Add'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={openBurialPersonDialog}
                onClose={() => setOpenBurialPersonDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Add Deceased Person</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <TextField
                        fullWidth
                        margin="normal"
                        label="First Name"
                        value={burialPersonData.first_name}
                        onChange={(e) => setBurialPersonData({ ...burialPersonData, first_name: e.target.value })}
                        required
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Middle Name (optional)"
                        value={burialPersonData.middle_name}
                        onChange={(e) => setBurialPersonData({ ...burialPersonData, middle_name: e.target.value })}
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Last Name"
                        value={burialPersonData.last_name}
                        onChange={(e) => setBurialPersonData({ ...burialPersonData, last_name: e.target.value })}
                        required
                    />
                    <FormControl fullWidth margin="normal" required>
                        <InputLabel>Gender</InputLabel>
                        <Select
                            value={burialPersonData.gender}
                            onChange={(e) => setBurialPersonData({ ...burialPersonData, gender: e.target.value })}
                            label="Gender"
                        >
                            <MenuItem value="Male">Male</MenuItem>
                            <MenuItem value="Female">Female</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Birth Date"
                        type="date"
                        value={burialPersonData.birth_date}
                        onChange={(e) => setBurialPersonData({ ...burialPersonData, birth_date: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                        required
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Religion (optional)"
                        placeholder="e.g. Iglesia ni Cristo, Islam, None"
                        value={burialPersonData.religion}
                        onChange={(e) => setBurialPersonData({ ...burialPersonData, religion: e.target.value })}
                    />
                    <Typography variant="caption" color="text.secondary">
                        No user account is needed to add a deceased person.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenBurialPersonDialog(false)}>Cancel</Button>
                    <Button onClick={handleAddBurialPerson} variant="contained">Add Person</Button>
                </DialogActions>
            </Dialog>
        </Container>
        </Box>
    );
};

export default CemeteryRecords;
