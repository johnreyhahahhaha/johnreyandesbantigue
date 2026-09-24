import React, { useState, useEffect, useMemo } from 'react';
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
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    CircularProgress,
    Alert,
    Card,
    CardContent,
    Grid,
    Typography,
    Tabs,
    Tab,
    Chip,
    IconButton,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, ArrowBack as ArrowBackIcon, Edit as EditIcon, Print as PrintIcon } from '@mui/icons-material';
import axios from 'axios';
import Chart from 'react-apexcharts';
import { usePermission } from '../contexts/PermissionContext';
import { useAuth } from '../contexts/AuthContext';
import { formatSafeIsoDate } from '../utils/formatters';

const API_BASE_URL = 'http://165.22.181.147/api';

const Finances = () => {
    const navigate = useNavigate();
    const { canCreate, canDelete } = usePermission();
    const { user } = useAuth();
    const [donations, setDonations] = useState([]);
    const [massIntentions, setMassIntentions] = useState([]);
    const [lentenOfferings, setLentenOfferings] = useState([]);
    const [ledger, setLedger] = useState([]);
    const [officialReceipts, setOfficialReceipts] = useState([]);
    const [persons, setPersons] = useState([]);
    const [serviceFees, setServiceFees] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openServiceFeeDialog, setOpenServiceFeeDialog] = useState(false);
    const [openReceiptDialog, setOpenReceiptDialog] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [tabValue, setTabValue] = useState(window.location.pathname.endsWith('/mass-intentions') || window.location.pathname === '/mass-intentions' ? 1 : 0);
    const [ledgerPrintDate, setLedgerPrintDate] = useState(new Date().toISOString().split('T')[0]);
    const [printLoading, setPrintLoading] = useState(false);
    const [recordType, setRecordType] = useState('donation'); // 'donation', 'mass_intention', 'lenten_offering'
    const [categories, setCategories] = useState([]);
    const [editingFee, setEditingFee] = useState(null);
    const [editingReceipt, setEditingReceipt] = useState(null);
    const [editingDonation, setEditingDonation] = useState(null);
    const [editingMassIntention, setEditingMassIntention] = useState(null);
    const [editingLentenOffering, setEditingLentenOffering] = useState(null);
    const [totals, setTotals] = useState({ donations: 0, massIntentions: 0, lentenOfferings: 0, income: 0, expense: 0, balance: 0 });
    const [formData, setFormData] = useState({
        donor_id: '',
        donor_name: '',
        amount: '',
        donation_date: new Date().toISOString().split('T')[0],
        donation_type: 'Love Offering',
        payment_method: 'Cash',
        payment_status: 'Paid',
        or_number: '',
        reference_no: '',
        remarks: '',
        fee_id: '',
        received_by_user_id: '',
        intention_description: '',
        mass_date: new Date().toISOString().split('T')[0],
        status: 'Soul',
        offering_date: new Date().toISOString().split('T')[0],
    });
    const [serviceFeeFormData, setServiceFeeFormData] = useState({
        service_name: '',
        description: '',
        amount: '',
        service_type: 'General',
        is_active: 1,
    });
    const [receiptFormData, setReceiptFormData] = useState({
        person_id: '',
        total_amount: '',
        payment_method: 'Cash',
        payment_date: new Date().toISOString().split('T')[0],
        or_number: '',
        remarks: '',
    });

    useEffect(() => {
        fetchAllData();
    }, []);

    // Auto-clear success/error messages after 5 seconds
    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => setSuccess(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [success]);

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const isPersonScope = user?.user_role === 'Person' && user?.person_id;
            const scopePersonId = isPersonScope ? Number(user.person_id) : null;
            const appendScope = (records = []) => {
                if (!scopePersonId) return records;
                return records.filter((row) => Number(row.person_id) === scopePersonId);
            };

            const [donationsRes, massIntentionsRes, lentenRes, ledgerRes, personsRes, feesRes, usersRes, categoriesRes, receiptsRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/finances.php?type=donations${isPersonScope ? `&user_id=${user.user_id}` : ''}`),
                axios.get(`${API_BASE_URL}/finances.php?type=mass_intentions${isPersonScope ? `&user_id=${user.user_id}` : ''}`),
                axios.get(`${API_BASE_URL}/finances.php?type=lenten_offerings${isPersonScope ? `&user_id=${user.user_id}` : ''}`),
                axios.get(`${API_BASE_URL}/finances.php?type=ledger${isPersonScope ? `&user_id=${user.user_id}` : ''}`),
                axios.get(`${API_BASE_URL}/persons.php`),
                axios.get(`${API_BASE_URL}/service-fees.php`),
                axios.get(`${API_BASE_URL}/users.php`),
                axios.get(`${API_BASE_URL}/finances.php?type=categories`),
                axios.get(`${API_BASE_URL}/official-receipts.php`),
            ]);

            const donationsData = donationsRes.data.success ? donationsRes.data.data || [] : [];
            const massIntentionsData = massIntentionsRes.data.success ? massIntentionsRes.data.data || [] : [];
            const lentenData = lentenRes.data.success ? lentenRes.data.data || [] : [];
            const ledgerData = ledgerRes.data.success ? ledgerRes.data.data || [] : [];
            const personsData = personsRes.data.success ? personsRes.data.data || [] : [];
            const feesData = feesRes.data.success ? feesRes.data.data || [] : [];
            const usersData = usersRes.data.success ? usersRes.data.data || [] : [];
            const categoriesData = categoriesRes.data.success ? categoriesRes.data.data || [] : [];
            const receiptsData = receiptsRes.data.success ? receiptsRes.data.data || [] : [];

            const scopedDonations = appendScope(donationsData);
            const scopedMassIntentions = appendScope(massIntentionsData);
            const scopedLentenOfferings = appendScope(lentenData);
            const scopedLedger = isPersonScope ? [] : ledgerData;

            setDonations(scopedDonations);
            setMassIntentions(scopedMassIntentions);
            setLentenOfferings(scopedLentenOfferings);
            setLedger(scopedLedger);
            setPersons(personsData);
            setServiceFees(feesData);
            setUsers(usersData);
            setCategories(categoriesData);
            setOfficialReceipts(receiptsData);
            calculateTotals(scopedDonations, scopedMassIntentions, scopedLentenOfferings, scopedLedger);
            setError('');
        } catch (err) {
            setError('Error fetching data: ' + (err.response?.data?.message || err.message));
            setDonations([]);
            setMassIntentions([]);
            setLentenOfferings([]);
            setLedger([]);
            setOfficialReceipts([]);
            setPersons([]);
            setCategories([]);
        } finally {
            setLoading(false);
        }
    };

    const calculateTotals = (donationsData, massIntentionsData, lentenData, ledgerData) => {
        const donationTotal = donationsData.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
        const massIntentionTotal = massIntentionsData.reduce((sum, m) => sum + parseFloat(m.amount || 0), 0);
        const lentenTotal = lentenData.reduce((sum, l) => sum + parseFloat(l.amount || 0), 0);
        
        const income = ledgerData
            .filter((l) => l.trans_type === 'Income')
            .reduce((sum, l) => sum + parseFloat(l.amount || 0), 0);

        const expense = ledgerData
            .filter((l) => l.trans_type === 'Expense')
            .reduce((sum, l) => sum + parseFloat(l.amount || 0), 0);

        // Correct balance calculation: Income - Expense (not Income - Donations)
        const balance = income - expense;

        setTotals({ 
            donations: donationTotal, 
            massIntentions: massIntentionTotal,
            lentenOfferings: lentenTotal,
            income, 
            expense,
            balance
        });
    };

    const donationsSeries = useMemo(() => {
        const dayMap = {};
        let minDate = null;
        let maxDate = null;

        // Aggregate donations by day and find date range
        donations.forEach((r) => {
            const raw = r.donation_date || r.date || r.created_at;
            const d = raw ? new Date(raw) : null;
            if (!d || Number.isNaN(d.getTime())) return;
            const day = formatSafeIsoDate(raw);
            if (!day) return;
            dayMap[day] = (dayMap[day] || 0) + parseFloat(r.amount || 0);
            
            // Track min and max dates
            if (!minDate || d < minDate) minDate = d;
            if (!maxDate || d > maxDate) maxDate = d;
        });

        // If no donations, return empty data
        if (!minDate || !maxDate) {
            return [{ name: 'Donations', data: [] }];
        }

        // Generate all dates from min to max
        const allDays = [];
        const currentDate = new Date(minDate);
        while (currentDate <= maxDate) {
            const day = formatSafeIsoDate(currentDate);
            if (day) allDays.push(day);
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Map all days with values (0 for days without donations)
        const chartData = allDays.map((day) => ({ 
            x: day, 
            y: Math.round((dayMap[day] || 0) * 100) / 100 
        }));

        return [{ name: 'Donations', data: chartData }];
    }, [donations]);

    const donationsChartOptions = useMemo(() => ({
        chart: { type: 'area', toolbar: { show: false }, zoom: { enabled: false } },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 2 },
        xaxis: { type: 'datetime', labels: { format: 'dd MMM' }, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { labels: { style: { colors: '#64748b' } }, min: 0 },
        tooltip: { x: { format: 'dd MMM yyyy' }, shared: true },
        fill: { type: 'gradient', gradient: { opacityFrom: 0.5, opacityTo: 0.1 } },
        colors: ['#059669'],
        markers: { size: 3 },
        legend: { show: false },
    }), [donations]);

    const getPersonName = (personId, fallbackName = '') => {
        const person = persons.find(p => p.person_id == personId);
        if (person) {
            const fullName = `${person.first_name || ''} ${person.last_name || ''}`.trim();
            if (fullName) return fullName;
        }

        const customName = (fallbackName || '').trim();
        if (customName) return customName;

        return 'Unknown';
    };

    const getMassIntentionPersonName = (intention) => {
        if (!intention) return 'Unknown';
        const rawName = [
            intention.person_name,
            intention.offered_by,
            intention.donor_name,
            intention.intention_names,
            intention.intention_description,
        ].find((value) => typeof value === 'string' && value.trim());

        if (rawName && rawName.trim()) return rawName.trim();

        if (intention.person_id) {
            const person = persons.find((p) => Number(p.person_id) === Number(intention.person_id));
            if (person) {
                return `${person.first_name || ''} ${person.last_name || ''}`.trim() || 'Unknown';
            }
        }

        return 'Unknown';
    };

    const getOfficialReceiptPersonName = (receipt) => {
        if (!receipt) return 'Unknown';

        if (receipt.payor_person_id) {
            const person = persons.find((p) => Number(p.person_id) === Number(receipt.payor_person_id));
            if (person) {
                const fullName = `${person.first_name || ''} ${person.last_name || ''}`.trim();
                if (fullName) return fullName;
            }
        }

        const customName = [
            receipt.payor_name,
            receipt.person_name,
            receipt.donor_name,
            receipt.first_name,
        ].find((value) => typeof value === 'string' && value.trim());

        if (customName && customName.trim()) {
            const fullName = `${customName}`.trim();
            if (fullName && fullName !== 'Unknown') return fullName;
        }

        const matchingDonation = donations.find((donation) => donation.or_number === receipt.or_number);
        if (matchingDonation?.donor_name) {
            return matchingDonation.donor_name.trim();
        }

        const fallbackName = `${receipt.first_name || ''} ${receipt.last_name || ''}`.trim();
        return fallbackName || 'Unknown';
    };

    const fetchLedgerByDate = async (date) => {
        const response = await axios.get(`${API_BASE_URL}/finances.php`, {
            params: {
                type: 'ledger',
                date,
            },
        });
        return response.data.success ? response.data.data || [] : [];
    };

    const getLedgerDonorName = (entry) => {
        if (entry.given_by_name) return entry.given_by_name;
        if (entry.person_name) return entry.person_name;
        if (entry.donor_name) return entry.donor_name;

        const description = entry.description || '';

        const byPersonIdMatch = description.match(/person_id:\s*(\d+)/i);
        if (byPersonIdMatch) {
            const personId = Number(byPersonIdMatch[1]);
            const person = persons.find((p) => String(p.person_id) === String(personId));
            if (person) {
                return `${person.first_name || ''} ${person.last_name || ''}`.trim() || person.username || 'Unknown';
            }
        }

        const byNameMatch = description.match(/(?:from|by|given by)\s+([A-Z][A-Za-z .'-]+?)(?:\s*-\s*|\s*$)/i);
        if (byNameMatch) {
            return byNameMatch[1].trim();
        }

        return entry.username || 'Unknown';
    };

    const buildLedgerPrintHtml = (entries, date) => {
        const rows = entries.map((entry) => `
            <tr>
                <td>${entry.trans_type || '-'}</td>
                <td>${entry.category || '-'}</td>
                <td>${getLedgerDonorName(entry)}</td>
                <td>${entry.username || 'Unknown'}</td>
                <td style="text-align:right;">â‚±${parseFloat(entry.amount || 0).toFixed(2)}</td>
                <td>${entry.trans_date || '-'}</td>
                <td>${(entry.description || '-').replace(/\n/g, '<br/>')}</td>
            </tr>
        `).join('');

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>Ledger Print - ${date}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; color: #101828; }
                    h1, h2 { margin: 0 0 12px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                    th, td { border: 1px solid #d1d5db; padding: 10px; }
                    th { background: #f3f4f6; text-align: left; }
                    td { vertical-align: top; }
                    .right { text-align: right; }
                </style>
            </head>
            <body>
                <h1>Daily Ledger</h1>
                <h2>Date: ${date}</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Category</th>
                            <th>Given By</th>
                            <th>Encoded By</th>
                            <th class="right">Amount</th>
                            <th>Date</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </body>
            </html>
        `;
    };

    const handlePrintLedger = async () => {
        setPrintLoading(true);
        setError('');

        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) {
            setPrintLoading(false);
            setError('Unable to open print window. Please allow pop-ups for this site.');
            return;
        }

        try {
            const entries = await fetchLedgerByDate(ledgerPrintDate);
            if (!entries || entries.length === 0) {
                setError(`No ledger entries found for ${ledgerPrintDate}`);
                printWindow.close();
                return;
            }

            const html = buildLedgerPrintHtml(entries, ledgerPrintDate);
            printWindow.document.open();
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        } catch (err) {
            setError('Failed to print ledger: ' + (err.response?.data?.message || err.message));
            printWindow.close();
        } finally {
            setPrintLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddRecord = async () => {
        const selectedPerson = persons.find((p) => String(p.person_id) === String(formData.donor_id));
        const donorName = (formData.donor_name || '').trim() || (selectedPerson ? `${selectedPerson.first_name || ''} ${selectedPerson.last_name || ''}`.trim() : '');

        if ((!formData.donor_id && !donorName) || !formData.amount) {
            setError('Please select a person or type the donor name, and enter the amount');
            return;
        }
        setError('');
        setSuccess('');
        try {
            const payload = {
                type: recordType,
                person_id: formData.donor_id || null,
                donor_name: donorName,
                amount: parseFloat(formData.amount),
                user_id: user?.user_id || null,
            };

            if (recordType === 'donation') {
                payload.donation_type = formData.donation_type;
                payload.payment_method = formData.payment_method;
                payload.payment_status = formData.payment_status;
                payload.or_number = formData.or_number;
                payload.reference_no = formData.reference_no;
                payload.remarks = formData.remarks;
                payload.donation_date = formData.donation_date;
                payload.fee_id = formData.fee_id || null;
                payload.received_by_user_id = formData.received_by_user_id || null;
                payload.donor_name = payload.donor_name || donorName;

                if (editingDonation) {
                    payload.donation_id = editingDonation.donation_id;
                    const response = await axios.put(`${API_BASE_URL}/finances.php`, payload);
                    if (response.data.success) {
                        setOpenDialog(false);
                        setFormData({
                            donor_id: '',
                            donor_name: '',
                            amount: '',
                            donation_date: new Date().toISOString().split('T')[0],
                            donation_type: 'Love Offering',
                            payment_method: 'Cash',
                            payment_status: 'Paid',
                            or_number: '',
                            reference_no: '',
                            remarks: '',
                            fee_id: '',
                            received_by_user_id: '',
                            intention_description: '',
                            mass_date: new Date().toISOString().split('T')[0],
                            mass_time: '',
                            status: 'Soul',
                            offering_date: new Date().toISOString().split('T')[0],
                        });
                        setEditingDonation(null);
                        setSuccess('Donation updated successfully');
                        fetchAllData();
                    } else {
                        setError('Failed to update record: ' + (response.data.message || 'Unknown error'));
                    }
                } else {
                    const response = await axios.post(`${API_BASE_URL}/finances.php`, payload);
                    if (response.data.success) {
                        setOpenDialog(false);
                        // Add new donation immediately to list (merge any auto-generated OR/reference)
                        if (response.data.data) {
                            const created = { ...response.data.data };
                            if (response.data.or_number) created.or_number = response.data.or_number;
                            if (response.data.reference_no) created.reference_no = response.data.reference_no;
                            setDonations(prev => [created, ...prev]);
                            calculateTotals([created, ...donations], massIntentions, lentenOfferings, ledger);
                        }
                        setFormData({
                            donor_id: '',
                            donor_name: '',
                            amount: '',
                            donation_date: new Date().toISOString().split('T')[0],
                            donation_type: 'Love Offering',
                            payment_method: 'Cash',
                            payment_status: 'Paid',
                            or_number: '',
                            reference_no: '',
                            remarks: '',
                            fee_id: '',
                            received_by_user_id: '',
                            intention_description: '',
                            mass_date: new Date().toISOString().split('T')[0],
                            mass_time: '',
                            status: 'Soul',
                            offering_date: new Date().toISOString().split('T')[0],
                        });
                        setSuccess('Donation created successfully');
                    } else {
                        setError('Failed to add record: ' + (response.data.message || 'Unknown error'));
                    }
                }
                return;

            } else if (recordType === 'mass_intention') {
                payload.mass_date = formData.mass_date;
                payload.mass_time = formData.mass_time;
                const selectedPerson = persons.find(p => p.person_id == formData.donor_id);
                const fallbackName = selectedPerson ? `${selectedPerson.first_name} ${selectedPerson.last_name}`.trim() : (formData.donor_name || '').trim();
                payload.intention_description = formData.intention_description || fallbackName;
                payload.person_name = fallbackName;
                payload.donor_name = fallbackName;
                payload.offered_by = fallbackName;
                payload.status = formData.status;
                payload.payment_status = formData.payment_status || 'Paid';

                if (editingMassIntention) {
                    payload.mass_intention_id = editingMassIntention.mass_intention_id;
                    const response = await axios.put(`${API_BASE_URL}/finances.php`, payload);
                    if (response.data.success) {
                        setOpenDialog(false);
                        setFormData({
                            donor_id: '',
                            donor_name: '',
                            amount: '',
                            donation_date: new Date().toISOString().split('T')[0],
                            donation_type: 'Love Offering',
                            payment_method: 'Cash',
                            payment_status: 'Paid',
                            or_number: '',
                            reference_no: '',
                            remarks: '',
                            fee_id: '',
                            received_by_user_id: '',
                            intention_description: '',
                            mass_date: new Date().toISOString().split('T')[0],
                            mass_time: '',
                            status: 'Soul',
                            offering_date: new Date().toISOString().split('T')[0],
                        });
                        setEditingMassIntention(null);
                        setSuccess('Mass intention updated successfully');
                        fetchAllData();
                    } else {
                        setError('Failed to update record: ' + (response.data.message || 'Unknown error'));
                    }
                } else {
                    const response = await axios.post(`${API_BASE_URL}/finances.php`, payload);
                    if (response.data.success) {
                        setOpenDialog(false);
                        // Add new mass intention immediately to list
                        if (response.data.data) {
                            setMassIntentions(prev => [response.data.data, ...prev]);
                            calculateTotals(donations, [response.data.data, ...massIntentions], lentenOfferings, ledger);
                        }
                        setFormData({
                            donor_id: '',
                            donor_name: '',
                            amount: '',
                            donation_date: new Date().toISOString().split('T')[0],
                            donation_type: 'Love Offering',
                            payment_method: 'Cash',
                            payment_status: 'Paid',
                            or_number: '',
                            reference_no: '',
                            remarks: '',
                            fee_id: '',
                            received_by_user_id: '',
                            intention_description: '',
                            mass_date: new Date().toISOString().split('T')[0],
                            mass_time: '',
                            status: 'Soul',
                            offering_date: new Date().toISOString().split('T')[0],
                        });
                        setSuccess('Mass intention created successfully');
                    } else {
                        setError('Failed to add record: ' + (response.data.message || 'Unknown error'));
                    }
                }
                return;

            } else if (recordType === 'lenten_offering') {
                payload.offering_date = formData.offering_date;
                payload.payment_method = formData.payment_method;
                payload.payment_status = formData.payment_status;
                payload.or_number = formData.or_number;
                payload.reference_no = formData.reference_no;
                payload.remarks = formData.remarks;
                payload.received_by_user_id = formData.received_by_user_id || null;
                payload.donor_name = payload.donor_name || donorName;

                if (editingLentenOffering) {
                    payload.lenten_offering_id = editingLentenOffering.lenten_offering_id;
                    const response = await axios.put(`${API_BASE_URL}/finances.php`, payload);
                    if (response.data.success) {
                        setOpenDialog(false);
                        setFormData({
                            donor_id: '',
                            donor_name: '',
                            amount: '',
                            donation_date: new Date().toISOString().split('T')[0],
                            donation_type: 'Love Offering',
                            payment_method: 'Cash',
                            payment_status: 'Paid',
                            or_number: '',
                            reference_no: '',
                            remarks: '',
                            fee_id: '',
                            received_by_user_id: '',
                            intention_description: '',
                            mass_date: new Date().toISOString().split('T')[0],
                            mass_time: '',
                            status: 'Soul',
                            offering_date: new Date().toISOString().split('T')[0],
                        });
                        setEditingLentenOffering(null);
                        setSuccess('Lenten offering updated successfully');
                        fetchAllData();
                    } else {
                        setError('Failed to update record: ' + (response.data.message || 'Unknown error'));
                    }
                } else {
                    const response = await axios.post(`${API_BASE_URL}/finances.php`, payload);
                    if (response.data.success) {
                        setOpenDialog(false);
                        // Add new lenten offering immediately to list (merge auto-generated OR/reference)
                        if (response.data.data) {
                            const created = { ...response.data.data };
                            if (response.data.or_number) created.or_number = response.data.or_number;
                            if (response.data.reference_no) created.reference_no = response.data.reference_no;
                            setLentenOfferings(prev => [created, ...prev]);
                            calculateTotals(donations, massIntentions, [created, ...lentenOfferings], ledger);
                        }
                        setFormData({
                            donor_id: '',
                            donor_name: '',
                            amount: '',
                            donation_date: new Date().toISOString().split('T')[0],
                            donation_type: 'Love Offering',
                            payment_method: 'Cash',
                            payment_status: 'Paid',
                            or_number: '',
                            reference_no: '',
                            remarks: '',
                            fee_id: '',
                            received_by_user_id: '',
                            intention_description: '',
                            mass_date: new Date().toISOString().split('T')[0],
                            mass_time: '',
                            status: 'Soul',
                            offering_date: new Date().toISOString().split('T')[0],
                        });
                        setSuccess('Lenten offering created successfully');
                    } else {
                        setError('Failed to add record: ' + (response.data.message || 'Unknown error'));
                    }
                }
                return;
            }

        } catch (err) {
            setError('Error adding record: ' + err.message);
        }
    };

    const handleDelete = async (id, type) => {
        if (window.confirm('Delete this record?')) {
            try {
                setError('');
                const response = await axios.delete(`${API_BASE_URL}/finances.php?id=${id}&type=${type}`);
                if (response.data.success) {
                    setSuccess('Record deleted successfully');
                    fetchAllData();
                } else {
                    setError('Failed to delete record: ' + (response.data.message || 'Unknown error'));
                }
            } catch (err) {
                setError('Error deleting record: ' + (err.response?.data?.message || err.message));
            }
        }
    };

    const handleEditDonation = (donation) => {
        setRecordType('donation');
        setEditingDonation(donation);
        setFormData({
            donor_id: donation.person_id || '',
            donor_name: donation.donor_name || '',
            amount: donation.amount || '',
            donation_date: donation.date_received ? donation.date_received.split(' ')[0] : new Date().toISOString().split('T')[0],
            donation_type: donation.donation_type || 'Love Offering',
            payment_method: donation.payment_method || 'Cash',
            payment_status: donation.payment_status || 'Paid',
            or_number: donation.or_number || '',
            reference_no: donation.reference_no || '',
            remarks: donation.remarks || '',
            fee_id: donation.fee_id || '',
            received_by_user_id: donation.received_by_user_id || '',
            intention_description: '',
            mass_date: new Date().toISOString().split('T')[0],
            mass_time: '',
            status: 'Soul',
            offering_date: new Date().toISOString().split('T')[0],
        });
        setError('');
        setSuccess('');
        setOpenDialog(true);
    };

    const handleEditMassIntention = (intention) => {
        setRecordType('mass_intention');
        setEditingMassIntention(intention);
        setFormData({
            donor_id: intention.person_id || '',
            donor_name: intention.person_name || intention.offered_by || intention.intention_names || '',
            amount: intention.amount || '',
            donation_date: new Date().toISOString().split('T')[0],
            donation_type: 'Love Offering',
            payment_method: 'Cash',
            payment_status: 'Paid',
            or_number: '',
            reference_no: '',
            remarks: '',
            fee_id: '',
            received_by_user_id: '',
            intention_description: intention.intention_description || intention.intention_names || '',
            mass_date: intention.mass_date || new Date().toISOString().split('T')[0],
            mass_time: intention.mass_time || '',
            status: intention.status || 'Soul',
            offering_date: new Date().toISOString().split('T')[0],
        });
        setError('');
        setSuccess('');
        setOpenDialog(true);
    };

    const handleEditLentenOffering = (offering) => {
        setRecordType('lenten_offering');
        setEditingLentenOffering(offering);
        setFormData({
            donor_id: offering.person_id || '',
            donor_name: offering.donor_name || '',
            amount: offering.amount || '',
            donation_date: new Date().toISOString().split('T')[0],
            donation_type: 'Love Offering',
            payment_method: offering.payment_method || 'Cash',
            payment_status: offering.payment_status || 'Paid',
            or_number: offering.or_number || '',
            reference_no: offering.reference_no || '',
            remarks: offering.remarks || '',
            fee_id: '',
            received_by_user_id: offering.received_by_user_id || '',
            intention_description: '',
            mass_date: new Date().toISOString().split('T')[0],
            mass_time: '',
            status: 'Soul',
            offering_date: offering.offering_date ? (typeof offering.offering_date === 'string' ? offering.offering_date.split(' ')[0] : offering.offering_date) : new Date().toISOString().split('T')[0],
        });
        setError('');
        setSuccess('');
        setOpenDialog(true);
    };

    const handleOpenServiceFeeDialog = (fee = null) => {
        setError('');
        setSuccess('');
        if (fee) {
            setEditingFee(fee);
            setServiceFeeFormData({
                service_name: fee.service_name || '',
                description: fee.description || '',
                amount: fee.amount || '',
                service_type: fee.service_type || 'General',
                is_active: fee.is_active || 1,
            });
        } else {
            setEditingFee(null);
            setServiceFeeFormData({
                service_name: '',
                description: '',
                amount: '',
                service_type: 'General',
                is_active: 1,
            });
        }
        setOpenServiceFeeDialog(true);
    };

    const handleCloseServiceFeeDialog = () => {
        setOpenServiceFeeDialog(false);
        setEditingFee(null);
        setError('');
        setSuccess('');
    };

    const handleServiceFeeInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setServiceFeeFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (checked ? 1 : 0) : value
        }));
    };

    const handleSaveServiceFee = async () => {
        if (!serviceFeeFormData.service_name.trim()) {
            setError('Service name is required');
            return;
        }
        if (!serviceFeeFormData.amount) {
            setError('Amount is required');
            return;
        }

        try {
            if (editingFee) {
                const response = await axios.put(`${API_BASE_URL}/service-fees.php`, {
                    fee_id: editingFee.fee_id,
                    ...serviceFeeFormData,
                });
                if (response.data.success) {
                    setSuccess('Service fee updated successfully');
                    fetchAllData();
                    handleCloseServiceFeeDialog();
                } else {
                    setError(response.data.message || 'Failed to update service fee');
                }
            } else {
                const response = await axios.post(`${API_BASE_URL}/service-fees.php`, serviceFeeFormData);
                if (response.data.success) {
                    setSuccess('Service fee created successfully');
                    fetchAllData();
                    handleCloseServiceFeeDialog();
                } else {
                    setError(response.data.message || 'Failed to create service fee');
                }
            }
        } catch (err) {
            setError('Error saving service fee: ' + err.message);
        }
    };

    const handleDeleteServiceFee = async (feeId) => {
        if (!window.confirm('Are you sure you want to delete this service fee?')) {
            return;
        }

        try {
            const response = await axios.delete(`${API_BASE_URL}/service-fees.php`, {
                data: { fee_id: feeId }
            });
            if (response.data.success) {
                setSuccess('Service fee deleted successfully');
                fetchAllData();
            } else {
                setError(response.data.message || 'Failed to delete service fee');
            }
        } catch (err) {
            setError('Error deleting service fee: ' + err.message);
        }
    };

    const handleOpenReceiptDialog = (receipt = null) => {
        setError('');
        setSuccess('');
        if (receipt) {
            setEditingReceipt(receipt);
            setReceiptFormData({
                person_id: receipt.payor_person_id || '',
                total_amount: receipt.total_amount || '',
                payment_method: receipt.payment_method || 'Cash',
                or_number: receipt.or_number || '',
            });
        } else {
            setEditingReceipt(null);
            setReceiptFormData({
                person_id: '',
                total_amount: '',
                payment_method: 'Cash',
                or_number: '',
            });
        }
        setOpenReceiptDialog(true);
    };

    const handleCloseReceiptDialog = () => {
        setOpenReceiptDialog(false);
        setEditingReceipt(null);
        setError('');
        setSuccess('');
    };

    const handleReceiptInputChange = (e) => {
        const { name, value } = e.target;
        setReceiptFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSaveReceipt = async () => {
        if (!receiptFormData.person_id || !receiptFormData.total_amount || !receiptFormData.or_number) {
            setError('Person, O.R. Number, and amount are required');
            return;
        }

        try {
            if (editingReceipt) {
                const response = await axios.put(`${API_BASE_URL}/official-receipts.php`, {
                    or_id: editingReceipt.or_id,
                    payor_person_id: parseInt(receiptFormData.person_id),
                    total_amount: parseFloat(receiptFormData.total_amount),
                    payment_method: receiptFormData.payment_method,
                    or_number: receiptFormData.or_number,
                });
                if (response.data.success) {
                    setSuccess('Official receipt updated successfully');
                    fetchAllData();
                    handleCloseReceiptDialog();
                } else {
                    setError(response.data.message || 'Failed to update official receipt');
                }
            } else {
                const response = await axios.post(`${API_BASE_URL}/official-receipts.php`, {
                    payor_person_id: parseInt(receiptFormData.person_id),
                    total_amount: parseFloat(receiptFormData.total_amount),
                    payment_method: receiptFormData.payment_method,
                    or_number: receiptFormData.or_number,
                });
                if (response.data.success) {
                    setSuccess('Official receipt created successfully');
                    fetchAllData();
                    handleCloseReceiptDialog();
                } else {
                    setError(response.data.message || 'Failed to create official receipt');
                }
            }
        } catch (err) {
            setError('Error saving official receipt: ' + err.message);
        }
    };

    const handleDeleteReceipt = async (orId) => {
        if (!window.confirm('Are you sure you want to delete this official receipt?')) {
            return;
        }

        try {
            const response = await axios.delete(`${API_BASE_URL}/official-receipts.php`, {
                data: { or_id: orId }
            });
            if (response.data.success) {
                setSuccess('Official receipt deleted successfully');
                fetchAllData();
            } else {
                setError(response.data.message || 'Failed to delete official receipt');
            }
        } catch (err) {
            setError('Error deleting official receipt: ' + err.message);
        }
    };

    const isPersonView = user?.user_role === 'Person';

    if (loading) {
        return <CircularProgress />;
    }

    if (isPersonView) {
        const totalPersonalDonation = donations.reduce((sum, donation) => sum + parseFloat(donation.amount || 0), 0);
        const totalPersonalMassIntentions = massIntentions.reduce((sum, intention) => sum + parseFloat(intention.amount || 0), 0);

        return (
            <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', py: 4 }}>
                <Container maxWidth="lg">
                    <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <IconButton onClick={() => navigate('/dashboard')} sx={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
                            <ArrowBackIcon />
                        </IconButton>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>My Financial Records</Typography>
                            <Typography variant="body2" sx={{ color: '#64748b' }}>Your personal donations and mass intentions.</Typography>
                        </Box>
                    </Box>

                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Card>
                                <CardContent>
                                    <Typography color="textSecondary" gutterBottom>Total Donations</Typography>
                                    <Typography variant="h5" sx={{ color: '#059669', fontWeight: 700 }}>
                                        â‚±{totalPersonalDonation.toFixed(2)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Card>
                                <CardContent>
                                    <Typography color="textSecondary" gutterBottom>Mass Intentions</Typography>
                                    <Typography variant="h5" sx={{ color: '#0891b2', fontWeight: 700 }}>
                                        â‚±{totalPersonalMassIntentions.toFixed(2)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, lg: 6 }}>
                            <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid #e2e8f0' }}>
                                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>Donations</Typography>
                                {donations.length > 0 ? (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                        {donations.map((donation) => (
                                            <Box key={donation.donation_id} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, p: 2, backgroundColor: '#f8fafc' }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 1 }}>
                                                    <Typography sx={{ fontWeight: 700 }}>{donation.donation_type || 'Donation'}</Typography>
                                                    <Typography sx={{ fontWeight: 700, color: '#059669' }}>â‚±{parseFloat(donation.amount || 0).toFixed(2)}</Typography>
                                                </Box>
                                                <Typography variant="body2" sx={{ color: '#64748b' }}>
                                                    {donation.donation_date || '-'} â€¢ {donation.payment_method || 'Cash'} â€¢ {donation.payment_status || 'Paid'}
                                                </Typography>
                                                {donation.or_number && (
                                                    <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>O.R. No: {donation.or_number}</Typography>
                                                )}
                                            </Box>
                                        ))}
                                    </Box>
                                ) : (
                                    <Typography sx={{ color: '#64748b', py: 2 }}>No donation records yet.</Typography>
                                )}
                            </Paper>
                        </Grid>

                        <Grid size={{ xs: 12, lg: 6 }}>
                            <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid #e2e8f0' }}>
                                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>Mass Intentions</Typography>
                                {massIntentions.length > 0 ? (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                        {massIntentions.map((intention) => (
                                            <Box key={intention.mass_intention_id} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, p: 2, backgroundColor: '#f8fafc' }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 1 }}>
                                                    <Typography sx={{ fontWeight: 700 }}>{intention.intention_description || 'Mass Intention'}</Typography>
                                                    <Typography sx={{ fontWeight: 700, color: '#0891b2' }}>â‚±{parseFloat(intention.amount || 0).toFixed(2)}</Typography>
                                                </Box>
                                                <Typography variant="body2" sx={{ color: '#64748b' }}>
                                                    {intention.mass_date || '-'} â€¢ {intention.mass_time || 'Time not set'}
                                                </Typography>
                                                {intention.status && (
                                                    <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>Status: {intention.status}</Typography>
                                                )}
                                            </Box>
                                        ))}
                                    </Box>
                                ) : (
                                    <Typography sx={{ color: '#64748b', py: 2 }}>No mass intentions yet.</Typography>
                                )}
                            </Paper>
                        </Grid>
                    </Grid>
                </Container>
            </Box>
        );
    }

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#edf3f1' }}>
            {/* Header Section */}
            <Box sx={{ py: { xs: 1.5, md: 3 }, px: { xs: 1, md: 2 }, background: 'linear-gradient(110deg, #123b50 0%, #0b6b68 70%, #d1a557 155%)', boxShadow: '0 12px 26px rgba(13, 70, 76, 0.14)' }}>
                <Container maxWidth="lg" sx={{ px: { xs: 0.5, md: 2 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1.25, sm: 2 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: { xs: 1, sm: 2 } }}>
                            <IconButton
                                onClick={() => navigate('/dashboard')}
                                sx={{
                                    backgroundColor: 'rgba(255,255,255,0.14)',
                                    color: 'white',
                                    p: { xs: 0.75, sm: 1 },
                                    mt: 0.25,
                                    '&:hover': {
                                        backgroundColor: 'rgba(255,255,255,0.24)',
                                    },
                                }}
                            >
                                <ArrowBackIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
                            </IconButton>
                            <Box>
                                <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: '0.12em', fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>
                                    Parish treasury
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 800, color: 'white', mb: 0.3, lineHeight: 1.15, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                                    Finances
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.78)', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                    A clear view of parish income, offerings, and records.
                                </Typography>
                            </Box>
                        </Box>
                        {canCreate('finances') && (
                            <Button 
                                variant="contained" 
                                startIcon={<AddIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />}
                                onClick={() => {
                                    setRecordType('donation');
                                    const defaultDonationType = categories.find(c => c.type === 'Revenue' && c.cat_name !== 'Project Donation')?.cat_name || 'Love Offering';
                                    setFormData({
                                        donor_id: '',
                                        amount: '',
                                        donation_date: new Date().toISOString().split('T')[0],
                                        donation_type: defaultDonationType,
                                        payment_method: 'Cash',
                                        or_number: '',
                                        reference_no: '',
                                        remarks: '',
                                        intention_description: '',
                                        mass_date: new Date().toISOString().split('T')[0],
                                        status: 'Soul',
                                        offering_date: new Date().toISOString().split('T')[0],
                                    });
                                    setOpenDialog(true);
                                }}
                                sx={{ backgroundColor: '#d6a85a', color: '#123b50', fontSize: { xs: '0.8rem', sm: '0.875rem' }, py: { xs: 0.75, sm: 1 }, px: { xs: 1.5, sm: 2.5 }, '&:hover': { backgroundColor: '#e3ba70' }, boxShadow: 'none' }}
                            >
                                Add Record
                            </Button>
                        )}
                    </Box>
                </Container>
            </Box>

            {/* Content Section */}
            <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 }, px: { xs: 0.75, md: 2 } }}>
                {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>{success}</Alert>}

                {/* Summary Cards */}
                <Grid container spacing={{ xs: 1, sm: 1.25 }} sx={{ mb: 2.5 }}>
                    <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
                        <Card sx={{ borderTop: '3px solid #168fa3', borderRadius: 2 }}>
                            <CardContent sx={{ p: { xs: 1.15, sm: 1.5 } }}>
                                <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                                    Total Donations
                                </Typography>
                                <Typography variant="h5" sx={{ color: '#059669', fontWeight: 700, fontSize: { xs: '0.95rem', sm: '1.25rem' } }}>
                                    â‚±{totals.donations.toFixed(2)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
                        <Card sx={{ borderTop: '3px solid #d49347', borderRadius: 2 }}>
                            <CardContent sx={{ p: { xs: 1.15, sm: 1.5 } }}>
                                <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                                    Mass Intentions
                                </Typography>
                                <Typography variant="h5" sx={{ color: '#0891b2', fontWeight: 700, fontSize: { xs: '0.95rem', sm: '1.25rem' } }}>
                                    â‚±{totals.massIntentions.toFixed(2)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>  
                        <Card sx={{ borderTop: '3px solid #7d6acb', borderRadius: 2 }}>
                            <CardContent sx={{ p: { xs: 1.15, sm: 1.5 } }}>
                                <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                                    Lenten Offerings
                                </Typography>
                                <Typography variant="h5" sx={{ color: '#7c3aed', fontWeight: 700, fontSize: { xs: '0.95rem', sm: '1.25rem' } }}>
                                    â‚±{totals.lentenOfferings.toFixed(2)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
                        <Card sx={{ borderTop: '3px solid #25a878', borderRadius: 2 }}>
                            <CardContent sx={{ p: { xs: 1.15, sm: 1.5 } }}>
                                <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                                    Total Income
                                </Typography>
                                <Typography variant="h5" sx={{ color: '#7c3aed', fontWeight: 700, fontSize: { xs: '0.95rem', sm: '1.25rem' } }}>
                                    â‚±{totals.income.toFixed(2)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
                        <Card sx={{ borderTop: `3px solid ${totals.balance >= 0 ? '#25a878' : '#b75c56'}`, borderRadius: 2 }}>
                            <CardContent sx={{ p: { xs: 1.15, sm: 1.5 } }}>
                                <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                                    Balance
                                </Typography>
                                <Typography 
                                    variant="h5" 
                                    sx={{ 
                                        color: totals.balance >= 0 ? '#059669' : '#dc2626',
                                        fontWeight: 700,
                                        fontSize: { xs: '0.95rem', sm: '1.25rem' }
                                    }}
                                >
                                    â‚±{totals.balance.toFixed(2)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
                {/* Donations Chart */}
                <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
                    <Grid size={{ xs: 12, md: 12 }}>
                        <Card sx={{ p: { xs: 1.5, sm: 2, md: 3 }, borderRadius: 3, border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)' }}>
                            <Typography variant="overline" sx={{ color: '#0b766f', fontWeight: 800, letterSpacing: '0.12em', fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>Income activity</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }}>Donations by day</Typography>
                            {donationsSeries[0] && donationsSeries[0].data && donationsSeries[0].data.length > 0 ? (
                                <Chart options={donationsChartOptions} series={donationsSeries} type="area" height={window.innerWidth < 600 ? 200 : 260}/>
                            ) : (
                                <Box sx={{ py: 4, textAlign: 'center', color: '#64748b' }}>No donation data to display</Box>
                            )}
                        </Card>
                    </Grid>
                </Grid>

                {/* Tabbed Interface */}
                <Paper sx={{ mb: 2.5, borderRadius: 2.5, border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 5px 16px rgba(26, 67, 74, 0.05)', overflow: 'hidden' }}>
                    <Tabs
                        value={tabValue}
                        onChange={(e, newValue) => setTabValue(newValue)}
                        variant="scrollable"
                        scrollButtons="auto"
                        allowScrollButtonsMobile
                        sx={{
                            '& .MuiTabs-flexContainer': {
                                flexWrap: 'wrap',
                                alignItems: 'stretch',
                            },
                            '& .MuiTab-root': {
                                fontSize: { xs: '0.7rem', sm: '0.875rem' },
                                py: { xs: 1, sm: 1.5 },
                                px: { xs: 0.75, sm: 1.5 },
                                minHeight: { xs: 42, sm: 48 },
                                minWidth: { xs: 'auto', sm: 120 },
                                flex: { xs: '1 1 140px', sm: '0 0 auto' },
                            },
                            '& .MuiTabs-scrollButtons': {
                                color: '#0f766e',
                            }
                        }}
                    >
                        <Tab label={`Donations (${donations.length})`} />
                        <Tab label={`Mass Intentions (${massIntentions.length})`} />
                        <Tab label={`Lenten Offerings (${lentenOfferings.length})`} />
                        <Tab label={`Official Receipts (${officialReceipts.length})`} />
                        <Tab label={`Service Fees (${serviceFees.length})`} />
                        <Tab label={`Ledger (${ledger.length})`} />
                    </Tabs>
                </Paper>

                {/* Donations Table */}
                {tabValue === 0 && (
                    <TableContainer component={Paper} sx={{ backgroundColor: '#fff', borderRadius: 3, overflow: 'auto', border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)' }}>
                        <Table sx={{ minWidth: { xs: 800, sm: 950 }, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                            <TableHead>
                                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }}>Donor</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }}>Amount</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }}>Type</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }}>Payment</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }}>O.R. No</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }}>Ref No</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }}>Fee</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }}>By</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }}>Remarks</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }}>Date</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }}>Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {donations && donations.length > 0 ? (
                                    donations.map((donation) => (
                                        <TableRow 
                                            key={donation.donation_id}
                                            sx={{
                                                '&:nth-of-type(odd)': { backgroundColor: '#f8fafc' },
                                                '&:hover': { backgroundColor: '#f1f5f9' },
                                                '& td': { fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }
                                            }}
                                        >
                                            <TableCell>{getPersonName(donation.person_id, donation.donor_name)}</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>â‚±{parseFloat(donation.amount).toFixed(2)}</TableCell>
                                            <TableCell><Chip label={donation.donation_type} size="small" /></TableCell>
                                            <TableCell>{donation.payment_method || '-'}</TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label={donation.payment_status || 'Paid'} 
                                                    size="small"
                                                    color={donation.payment_status === 'Paid' ? 'success' : donation.payment_status === 'Pending' ? 'warning' : 'default'}
                                                    variant={donation.payment_status === 'Paid' ? 'filled' : 'outlined'}
                                                />
                                            </TableCell>
                                            <TableCell>{donation.or_number || '-'}</TableCell>
                                            <TableCell>{donation.reference_no || '-'}</TableCell>
                                            <TableCell>
                                                {donation.fee_id ? 
                                                    serviceFees.find(f => f.fee_id == donation.fee_id)?.service_name || 'Unknown Fee'
                                                    : '-'
                                                }
                                            </TableCell>
                                            <TableCell>
                                                {donation.received_by_user_id ? 
                                                    users.find(u => u.user_id == donation.received_by_user_id)?.username || 'Unknown'
                                                    : '-'
                                                }
                                            </TableCell>
                                            <TableCell>{donation.remarks || '-'}</TableCell>
                                            <TableCell>{donation.donation_date}</TableCell>
                                            <TableCell>
                                                {canCreate('finances') && (
                                                    <IconButton 
                                                        size="small" 
                                                        onClick={() => handleEditDonation(donation)}
                                                        sx={{ p: { xs: 0.25, sm: 0.5 } }}
                                                    >
                                                        <EditIcon sx={{ fontSize: { xs: 16, sm: 20 } }} />
                                                    </IconButton>
                                                )}
                                                {canDelete('finances') && (
                                                    <IconButton 
                                                        size="small" 
                                                        color="error"
                                                        onClick={() => handleDelete(donation.donation_id, 'donation')}
                                                        sx={{ p: { xs: 0.25, sm: 0.5 } }}
                                                    >
                                                        <DeleteIcon sx={{ fontSize: { xs: 16, sm: 20 } }} />
                                                    </IconButton>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={12} sx={{ textAlign: 'center', py: 3, color: '#64748b' }}>
                                            No donations found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}

                {/* Mass Intentions Table */}
                {tabValue === 1 && (
                    <TableContainer component={Paper} sx={{ backgroundColor: '#fff', borderRadius: 3, overflow: 'auto', border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)' }}>
                        <Table sx={{ minWidth: { xs: 650, sm: 750 }, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                            <TableHead>
                                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }}>Person</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }}>Amount</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }}>Intention</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }}>Date</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }}>Time</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }} align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {massIntentions && massIntentions.length > 0 ? (
                                    massIntentions.map((intention) => (
                                        <TableRow 
                                            key={intention.mass_intention_id}
                                            sx={{
                                                '&:nth-of-type(odd)': { backgroundColor: '#f8fafc' },
                                                '&:hover': { backgroundColor: '#f1f5f9' },
                                                '& td': { fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }
                                            }}
                                        >
                                            <TableCell>{getMassIntentionPersonName(intention)}</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>â‚±{parseFloat(intention.amount).toFixed(2)}</TableCell>
                                            <TableCell>{intention.intention_description || '-'}</TableCell>
                                            <TableCell>{intention.mass_date}</TableCell>
                                            <TableCell>{intention.mass_time || '-'}</TableCell>
                                            <TableCell><Chip label={intention.status || 'Pending'} size="small" /></TableCell>
                                            <TableCell align="right">
                                                {canCreate('finances') && (
                                                    <IconButton 
                                                        size="small" 
                                                        onClick={() => handleEditMassIntention(intention)}
                                                        sx={{ p: { xs: 0.25, sm: 0.5 } }}
                                                    >
                                                        <EditIcon sx={{ fontSize: { xs: 16, sm: 20 } }} />
                                                    </IconButton>
                                                )}
                                                {canDelete('finances') && (
                                                    <IconButton 
                                                        size="small" 
                                                        color="error"
                                                        onClick={() => handleDelete(intention.mass_intention_id, 'mass_intention')}
                                                        sx={{ p: { xs: 0.25, sm: 0.5 } }}
                                                    >
                                                        <DeleteIcon sx={{ fontSize: { xs: 16, sm: 20 } }} />
                                                    </IconButton>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} sx={{ textAlign: 'center', py: 3, color: '#64748b' }}>
                                            No mass intentions found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}

                {/* Lenten Offerings Table */}
                {tabValue === 2 && (
                    <TableContainer component={Paper} sx={{ backgroundColor: '#fff', borderRadius: 3, overflow: 'auto', border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)' }}>
                        <Table sx={{ minWidth: { xs: 800, sm: 900 }, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                            <TableHead>
                                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }}>Person</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }}>Amount</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }}>Payment</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }}>O.R. No</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }}>Ref No</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }}>By</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }}>Remarks</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }}>Date</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }} align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {lentenOfferings && lentenOfferings.length > 0 ? (
                                    lentenOfferings.map((offering) => (
                                        <TableRow 
                                            key={offering.lenten_offering_id}
                                            sx={{
                                                '&:nth-of-type(odd)': { backgroundColor: '#f8fafc' },
                                                '&:hover': { backgroundColor: '#f1f5f9' },
                                                '& td': { fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }
                                            }}
                                        >
                                            <TableCell>{getPersonName(offering.person_id, offering.donor_name)}</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>â‚±{parseFloat(offering.amount).toFixed(2)}</TableCell>
                                            <TableCell>{offering.payment_method || '-'}</TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label={offering.payment_status || 'Paid'} 
                                                    size="small"
                                                    color={offering.payment_status === 'Paid' ? 'success' : offering.payment_status === 'Pending' ? 'warning' : 'default'}
                                                    variant={offering.payment_status === 'Paid' ? 'filled' : 'outlined'}
                                                />
                                            </TableCell>
                                            <TableCell>{offering.or_number || '-'}</TableCell>
                                            <TableCell>{offering.reference_no || '-'}</TableCell>
                                            <TableCell>
                                                {offering.received_by_user_id ? 
                                                    users.find(u => u.user_id == offering.received_by_user_id)?.username || 'Unknown'
                                                    : '-'
                                                }
                                            </TableCell>
                                            <TableCell sx={{ maxWidth: 150, wordBreak: 'break-word' }}>{offering.remarks || '-'}</TableCell>
                                            <TableCell>{offering.offering_date}</TableCell>
                                            <TableCell align="right">
                                                {canCreate('finances') && (
                                                    <IconButton 
                                                        size="small" 
                                                        onClick={() => handleEditLentenOffering(offering)}
                                                    >
                                                        <EditIcon />
                                                    </IconButton>
                                                )}
                                                {canDelete('finances') && (
                                                    <IconButton 
                                                        size="small" 
                                                        color="error"
                                                        onClick={() => handleDelete(offering.lenten_offering_id, 'lenten_offering')}
                                                    >
                                                        <DeleteIcon />
                                                    </IconButton>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={10} sx={{ textAlign: 'center', py: 3, color: '#64748b' }}>
                                            No lenten offerings found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}

                {/* Official Receipts Table */}
                {tabValue === 3 && (
                    <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
                            <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>Official Receipts Management</Typography>
                            {canCreate('finances') && (
                                <Button 
                                    variant="contained" 
                                    startIcon={<AddIcon />}
                                    onClick={() => handleOpenReceiptDialog()}
                                    sx={{
                                        backgroundColor: '#1e3a8a',
                                        fontSize: { xs: '0.8rem', sm: '0.875rem' },
                                        py: { xs: 0.75, sm: 1 },
                                        px: { xs: 1.5, sm: 2 },
                                        '&:hover': { backgroundColor: '#1e40af' }
                                    }}
                                >
                                    New Receipt
                                </Button>
                            )}
                        </Box>
                        <TableContainer component={Paper} sx={{ backgroundColor: '#fff', borderRadius: 3, overflow: 'auto', border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)' }}>
                            <Table sx={{ minWidth: { xs: 750, sm: 850 }, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                <TableHead>
                                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }}>O.R. Number</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }}>Person</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }}>Amount</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }}>Issued</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }}>Payment</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }}>Remarks</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }} align="right">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {officialReceipts && officialReceipts.length > 0 ? (
                                        officialReceipts.map((receipt) => (
                                            <TableRow 
                                                key={receipt.or_id}
                                                sx={{
                                                    '&:nth-of-type(odd)': { backgroundColor: '#f8fafc' },
                                                    '&:hover': { backgroundColor: '#f1f5f9' },
                                                    '& td': { fontSize: { xs: '0.65rem', sm: '0.875rem' }, p: { xs: 0.75, sm: 1 } }
                                                }}
                                            >
                                                <TableCell sx={{ fontWeight: 600 }}>{receipt.or_number}</TableCell>
                                                <TableCell>{getOfficialReceiptPersonName(receipt)}</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>â‚±{parseFloat(receipt.total_amount).toFixed(2)}</TableCell>
                                                <TableCell>{new Date(receipt.payment_date).toLocaleDateString()}</TableCell>
                                                <TableCell>
                                                    <Chip 
                                                        label={receipt.payment_method || 'Cash'} 
                                                        size="small"
                                                        color="primary"
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell sx={{ maxWidth: 150, wordBreak: 'break-word' }}>{receipt.remarks || '-'}</TableCell>
                                                <TableCell align="right">
                                                    {canCreate('finances') && (
                                                        <IconButton 
                                                            size="small" 
                                                            onClick={() => handleOpenReceiptDialog(receipt)}
                                                        >
                                                            <EditIcon />
                                                        </IconButton>
                                                    )}
                                                    {canDelete('finances') && (
                                                        <IconButton 
                                                            size="small" 
                                                            color="error"
                                                            onClick={() => handleDeleteReceipt(receipt.or_id)}
                                                        >
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={7} sx={{ textAlign: 'center', py: 3, color: '#64748b' }}>
                                                No official receipts found
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}

                {/* Service Fees Table */}
                {tabValue === 4 && (
                    <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">Service Fees Management</Typography>
                            {canCreate('finances') && (
                                <Button 
                                    variant="contained" 
                                    startIcon={<AddIcon />}
                                    onClick={() => handleOpenServiceFeeDialog()}
                                    sx={{
                                        backgroundColor: '#1e3a8a',
                                        '&:hover': { backgroundColor: '#1e40af' }
                                    }}
                                >
                                    Add Service Fee
                                </Button>
                            )}
                        </Box>
                        <TableContainer component={Paper} sx={{ backgroundColor: '#fff', borderRadius: 3, overflow: 'auto', border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)' }}>
                            <Table sx={{ minWidth: 750 }}>
                                <TableHead>
                                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Service Name</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Type</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Description</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }} align="right">Amount</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Status</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }} align="right">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {serviceFees && serviceFees.length > 0 ? (
                                        serviceFees.map((fee) => (
                                            <TableRow 
                                                key={fee.fee_id}
                                                sx={{
                                                    '&:nth-of-type(odd)': { backgroundColor: '#f8fafc' },
                                                    '&:hover': { backgroundColor: '#f1f5f9' },
                                                }}
                                            >
                                                <TableCell sx={{ fontWeight: 500 }}>
                                                    {fee.service_name}
                                                </TableCell>
                                                <TableCell>{fee.service_type || '-'}</TableCell>
                                                <TableCell sx={{ maxWidth: 200, wordBreak: 'break-word' }}>{fee.description || '-'}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 600 }}>
                                                    â‚±{parseFloat(fee.amount || 0).toFixed(2)}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip 
                                                        label={fee.is_active === 1 ? 'Active' : 'Inactive'} 
                                                        size="small"
                                                        color={fee.is_active === 1 ? 'success' : 'default'}
                                                        variant={fee.is_active === 1 ? 'filled' : 'outlined'}
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    {canCreate('finances') && (
                                                        <IconButton 
                                                            size="small" 
                                                            onClick={() => handleOpenServiceFeeDialog(fee)}
                                                        >
                                                            <EditIcon />
                                                        </IconButton>
                                                    )}
                                                    {canDelete('finances') && (
                                                        <IconButton 
                                                            size="small" 
                                                            color="error"
                                                            onClick={() => handleDeleteServiceFee(fee.fee_id)}
                                                        >
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} sx={{ textAlign: 'center', py: 3, color: '#64748b' }}>
                                                No service fees found
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}

                {/* Ledger Table */}
                {tabValue === 5 && (
                    <>
                        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                            <Typography variant="h6">Ledger</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                <TextField
                                    label="Print Date"
                                    type="date"
                                    size="small"
                                    value={ledgerPrintDate}
                                    onChange={(e) => setLedgerPrintDate(e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                />
                                <Button
                                    variant="contained"
                                    startIcon={<PrintIcon />}
                                    onClick={handlePrintLedger}
                                    disabled={printLoading}
                                >
                                    {printLoading ? 'Preparing...' : 'Print'}
                                </Button>
                            </Box>
                        </Box>
                        <TableContainer component={Paper} sx={{ backgroundColor: '#fff', borderRadius: 3, overflow: 'auto', border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)' }}>
                        <Table sx={{ minWidth: 750 }}>
                            <TableHead>
                                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Type</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Category</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Encoded By</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Amount</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Date</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Description</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {ledger && ledger.length > 0 ? (
                                    ledger.map((entry) => (
                                        <TableRow 
                                            key={entry.trans_id}
                                            sx={{
                                                '&:nth-of-type(odd)': { backgroundColor: '#f8fafc' },
                                                '&:hover': { backgroundColor: '#f1f5f9' },
                                            }}
                                        >
                                            <TableCell>
                                                <Chip 
                                                    label={entry.trans_type} 
                                                    color={entry.trans_type === 'Income' ? 'success' : 'error'}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>{entry.category || '-'}</TableCell>
                                            <TableCell>{entry.username || 'Unknown'}</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>
                                                â‚±{parseFloat(entry.amount).toFixed(2)}
                                            </TableCell>
                                            <TableCell>{entry.trans_date}</TableCell>
                                            <TableCell>{entry.description || '-'}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} sx={{ textAlign: 'center', py: 3, color: '#64748b' }}>
                                            No ledger entries found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    </>
                )}
            </Container>

            {/* Add Record Dialog */}
            <Dialog open={openDialog} onClose={() => {
                setOpenDialog(false);
                setEditingDonation(null);
                setEditingMassIntention(null);
                setEditingLentenOffering(null);
                setFormData({
                    donor_id: '',
                    amount: '',
                    donation_date: new Date().toISOString().split('T')[0],
                    donation_type: 'Love Offering',
                    payment_method: 'Cash',
                    or_number: '',
                    reference_no: '',
                    remarks: '',
                    intention_description: '',
                    mass_date: new Date().toISOString().split('T')[0],
                    status: 'Soul',
                    offering_date: new Date().toISOString().split('T')[0],
                });
            }} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingDonation ? 'Edit Donation' : editingMassIntention ? 'Edit Mass Intention' : editingLentenOffering ? 'Edit Lenten Offering' : 'Add Financial Record'}
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    {/* Record Type Selector */}
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Record Type</InputLabel>
                        <Select
                            value={recordType}
                            label="Record Type"
                            onChange={(e) => {
                                setRecordType(e.target.value);
                                setFormData({
                                    donor_id: '',
                                    amount: '',
                                    donation_date: new Date().toISOString().split('T')[0],
                                    donation_type: 'Love Offering',
                                    remarks: '',
                                    intention_description: '',
                                    mass_date: new Date().toISOString().split('T')[0],
                                    status: 'Soul',
                                    offering_date: new Date().toISOString().split('T')[0],
                                });
                            }}
                        >
                            <MenuItem value="donation">Donation</MenuItem>
                            <MenuItem value="mass_intention">Mass Intention</MenuItem>
                            <MenuItem value="lenten_offering">Lenten Offering</MenuItem>
                        </Select>
                    </FormControl>

                    {/* Donor Selection - Common to all types */}
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Person / Donor Name"
                        value={formData.donor_name || ''}
                        onChange={(e) => setFormData({ ...formData, donor_name: e.target.value, donor_id: '' })}
                        placeholder="Type a name if not registered"
                        helperText="You can choose from the list below or type a name for unregistered donors."
                    />

                    <FormControl fullWidth margin="normal">
                        <InputLabel>Registered Person</InputLabel>
                        <Select
                            value={formData.donor_id || ''}
                            onChange={(e) => {
                                const person = persons.find((p) => String(p.person_id) === String(e.target.value));
                                setFormData({
                                    ...formData,
                                    donor_id: e.target.value,
                                    donor_name: person ? `${person.first_name || ''} ${person.last_name || ''}`.trim() : formData.donor_name,
                                });
                            }}
                            label="Registered Person"
                        >
                            <MenuItem value="">-- Select Registered Person --</MenuItem>
                            {persons.map((person) => (
                                <MenuItem key={person.person_id} value={person.person_id}>
                                    {person.first_name} {person.last_name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Amount - Common to all types */}
                    <TextField
                        fullWidth
                        label="Amount"
                        type="number"
                        value={formData.amount || ''}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        margin="normal"
                        required
                        inputProps={{ step: '0.01' }}
                    />

                    {/* Donation-specific fields */}
                    {recordType === 'donation' && (
                        <>
                            <FormControl fullWidth margin="normal">
                                <InputLabel>Donation Type</InputLabel>
                                <Select
                                    value={formData.donation_type || ''}
                                    onChange={(e) => setFormData({ ...formData, donation_type: e.target.value })}
                                    label="Donation Type"
                                >
                                    {categories
                                        .filter(cat => cat.type === 'Revenue' && cat.cat_name !== 'Project Donation')
                                        .map(cat => (
                                            <MenuItem key={cat.cat_id} value={cat.cat_name}>
                                                {cat.cat_name}
                                            </MenuItem>
                                        ))}
                                </Select>
                            </FormControl>
                            
                            <FormControl fullWidth margin="normal">
                                <InputLabel>Payment Method</InputLabel>
                                <Select
                                    value={formData.payment_method || 'Cash'}
                                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                                    label="Payment Method"
                                >
                                    <MenuItem value="Cash">Cash</MenuItem>
                                    <MenuItem value="GCash">GCash</MenuItem>
                                    <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                                </Select>
                            </FormControl>

                            <FormControl fullWidth margin="normal">
                                <InputLabel>Payment Status</InputLabel>
                                <Select
                                    value={formData.payment_status || 'Paid'}
                                    onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                                    label="Payment Status"
                                >
                                    <MenuItem value="Paid">Paid</MenuItem>
                                    <MenuItem value="Pending">Pending</MenuItem>
                                    <MenuItem value="Partial">Partial</MenuItem>
                                </Select>
                            </FormControl>
                            
                            {/* O.R. Number and Reference No. are auto-generated by the system and hidden from the form */}
                            
                            <FormControl fullWidth margin="normal">
                                <InputLabel>Service Fee (Optional)</InputLabel>
                                <Select
                                    value={formData.fee_id || ''}
                                    onChange={(e) => setFormData({ ...formData, fee_id: e.target.value })}
                                    label="Service Fee (Optional)"
                                >
                                    <MenuItem value="">None</MenuItem>
                                    {serviceFees.map((fee) => (
                                        <MenuItem key={fee.fee_id} value={fee.fee_id}>
                                            {fee.service_name} - â‚±{parseFloat(fee.amount).toFixed(2)}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl fullWidth margin="normal">
                                <InputLabel>Received By</InputLabel>
                                <Select
                                    value={formData.received_by_user_id || ''}
                                    onChange={(e) => setFormData({ ...formData, received_by_user_id: e.target.value })}
                                    label="Received By"
                                >
                                    <MenuItem value="">- Select User -</MenuItem>
                                    {users.map((u) => (
                                        <MenuItem key={u.user_id} value={u.user_id}>
                                            {u.username || u.first_name + ' ' + u.last_name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <TextField
                                fullWidth
                                label="Donation Date"
                                type="date"
                                value={formData.donation_date || new Date().toISOString().split('T')[0]}
                                onChange={(e) => setFormData({ ...formData, donation_date: e.target.value })}
                                margin="normal"
                                InputLabelProps={{ shrink: true }}
                            />

                            <TextField
                                fullWidth
                                label="Remarks"
                                value={formData.remarks || ''}
                                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                margin="normal"
                                multiline
                                rows={2}
                                placeholder="Optional notes about this donation"
                            />
                           
                        </>
                    )}

                    {/* Mass Intention-specific fields */}
                    {recordType === 'mass_intention' && (
                        <>
                            <TextField
                                fullWidth
                                label="Intention Description"
                                value={formData.intention_description || ''}
                                onChange={(e) => setFormData({ ...formData, intention_description: e.target.value })}
                                margin="normal"
                                multiline
                                rows={2}
                            />
                            <TextField
                                fullWidth
                                label="Mass Date"
                                type="date"
                                value={formData.mass_date || new Date().toISOString().split('T')[0]}
                                onChange={(e) => setFormData({ ...formData, mass_date: e.target.value })}
                                margin="normal"
                                InputLabelProps={{ shrink: true }}
                            />
                            <TextField
                                fullWidth
                                label="Mass Time"
                                type="time"
                                value={formData.mass_time || ''}
                                onChange={(e) => setFormData({ ...formData, mass_time: e.target.value })}
                                margin="normal"
                                InputLabelProps={{ shrink: true }}
                            />
                            <FormControl fullWidth margin="normal">
                                <InputLabel>Intention Type</InputLabel>
                                <Select
                                    value={formData.status || 'Soul'}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    label="Intention Type"
                                >
                                    <MenuItem value="Soul">Soul</MenuItem>
                                    <MenuItem value="Thanksgiving">Thanksgiving</MenuItem>
                                    <MenuItem value="Healing">Healing</MenuItem>
                                    <MenuItem value="Petition">Petition</MenuItem>
                                </Select>
                            </FormControl>
                        </>
                    )}

                    {/* Lenten Offering-specific fields */}
                    {recordType === 'lenten_offering' && (
                        <>
                            <FormControl fullWidth margin="normal">
                                <InputLabel>Payment Method</InputLabel>
                                <Select
                                    value={formData.payment_method || 'Cash'}
                                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                                    label="Payment Method"
                                >
                                    <MenuItem value="Cash">Cash</MenuItem>
                                    <MenuItem value="GCash">GCash</MenuItem>
                                    <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                                </Select>
                            </FormControl>

                            <FormControl fullWidth margin="normal">
                                <InputLabel>Payment Status</InputLabel>
                                <Select
                                    value={formData.payment_status || 'Paid'}
                                    onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                                    label="Payment Status"
                                >
                                    <MenuItem value="Paid">Paid</MenuItem>
                                    <MenuItem value="Pending">Pending</MenuItem>
                                    <MenuItem value="Partial">Partial</MenuItem>
                                </Select>
                            </FormControl>

                            {/* O.R. Number and Reference No. are auto-generated by the system and hidden from the form */}

                            <FormControl fullWidth margin="normal">
                                <InputLabel>Received By</InputLabel>
                                <Select
                                    value={formData.received_by_user_id || ''}
                                    onChange={(e) => setFormData({ ...formData, received_by_user_id: e.target.value })}
                                    label="Received By"
                                >
                                    <MenuItem value="">- Select User -</MenuItem>
                                    {users.map((u) => (
                                        <MenuItem key={u.user_id} value={u.user_id}>
                                            {u.username || u.first_name + ' ' + u.last_name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            
                            <TextField
                                fullWidth
                                label="Date"
                                type="date"
                                value={formData.offering_date || new Date().toISOString().split('T')[0]}
                                onChange={(e) => setFormData({ ...formData, offering_date: e.target.value })}
                                margin="normal"
                                InputLabelProps={{ shrink: true }}
                            />

                            <TextField
                                fullWidth
                                label="Remarks"
                                value={formData.remarks || ''}
                                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                margin="normal"
                                multiline
                                rows={2}
                                placeholder="Optional notes about this offering"
                            />

                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setOpenDialog(false);
                        setEditingDonation(null);
                        setEditingMassIntention(null);
                        setEditingLentenOffering(null);
                        setFormData({
                            donor_id: '',
                            amount: '',
                            donation_date: new Date().toISOString().split('T')[0],
                            donation_type: 'Love Offering',
                            payment_method: 'Cash',
                            payment_status: 'Paid',
                            or_number: '',
                            reference_no: '',
                            remarks: '',
                            fee_id: '',
                            received_by_user_id: '',
                            intention_description: '',
                            mass_date: new Date().toISOString().split('T')[0],
                            mass_time: '',
                            status: 'Soul',
                            offering_date: new Date().toISOString().split('T')[0],
                        });
                    }}>Cancel</Button>
                    <Button onClick={handleAddRecord} variant="contained">
                        {editingDonation || editingMassIntention || editingLentenOffering ? 'Update' : 'Add'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Service Fee Dialog */}
            <Dialog open={openServiceFeeDialog} onClose={handleCloseServiceFeeDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingFee ? 'Edit Service Fee' : 'New Service Fee'}
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
                    <TextField
                        fullWidth
                        label="Service Name"
                        name="service_name"
                        value={serviceFeeFormData.service_name}
                        onChange={handleServiceFeeInputChange}
                        margin="normal"
                        required
                    />
                    <TextField
                        fullWidth
                        label="Description"
                        name="description"
                        value={serviceFeeFormData.description}
                        onChange={handleServiceFeeInputChange}
                        margin="normal"
                        multiline
                        rows={3}
                    />
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Service Type</InputLabel>
                        <Select
                            name="service_type"
                            value={serviceFeeFormData.service_type}
                            onChange={handleServiceFeeInputChange}
                            label="Service Type"
                        >
                            <MenuItem value="General">General</MenuItem>
                            <MenuItem value="Cemetery">Cemetery</MenuItem>
                            <MenuItem value="Document">Document</MenuItem>
                            <MenuItem value="Sacrament">Sacrament</MenuItem>
                            <MenuItem value="Event">Event</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        label="Amount"
                        name="amount"
                        type="number"
                        inputProps={{ step: '0.01', min: '0' }}
                        value={serviceFeeFormData.amount}
                        onChange={handleServiceFeeInputChange}
                        margin="normal"
                        required
                    />
                    <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <input
                            type="checkbox"
                            name="is_active"
                            checked={serviceFeeFormData.is_active === 1}
                            onChange={handleServiceFeeInputChange}
                        />
                        <Typography variant="body2">
                            Active
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseServiceFeeDialog}>Cancel</Button>
                    <Button onClick={handleSaveServiceFee} variant="contained">
                        {editingFee ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Official Receipt Dialog */}
            <Dialog open={openReceiptDialog} onClose={handleCloseReceiptDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingReceipt ? 'Edit Official Receipt' : 'New Official Receipt'}
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
                    
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Person</InputLabel>
                        <Select
                            name="person_id"
                            value={receiptFormData.person_id}
                            onChange={handleReceiptInputChange}
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

                    <TextField
                        fullWidth
                        label="O.R. Number"
                        name="or_number"
                        value={receiptFormData.or_number}
                        onChange={handleReceiptInputChange}
                        margin="normal"
                        placeholder="e.g., OR-2026-001"
                    />

                    <TextField
                        fullWidth
                        label="Total Amount"
                        name="total_amount"
                        type="number"
                        inputProps={{ step: '0.01', min: '0' }}
                        value={receiptFormData.total_amount}
                        onChange={handleReceiptInputChange}
                        margin="normal"
                        required
                    />

                    <FormControl fullWidth margin="normal">
                        <InputLabel>Payment Method</InputLabel>
                        <Select
                            name="payment_method"
                            value={receiptFormData.payment_method}
                            onChange={handleReceiptInputChange}
                            label="Payment Method"
                        >
                            <MenuItem value="Cash">Cash</MenuItem>
                            <MenuItem value="GCash">GCash</MenuItem>
                            <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                            <MenuItem value="Check">Check</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseReceiptDialog}>Cancel</Button>
                    <Button onClick={handleSaveReceipt} variant="contained">
                        {editingReceipt ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Finances;
