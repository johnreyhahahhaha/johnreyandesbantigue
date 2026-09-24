import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
    Box,
    Container,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
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
    Chip,
    Typography,
    IconButton,
    Card,
    CardContent,
    Grid,
    Divider,
    FormHelperText,
    Tabs,
    Tab,
    Checkbox,
    ListItemText,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, QrCodeScanner as QrCodeScannerIcon, ArrowBack as ArrowBackIcon, Download as DownloadIcon } from '@mui/icons-material';
import axios from 'axios';

import { usePermission } from '../contexts/PermissionContext';
import { useAuth } from '../contexts/AuthContext';
import DocumentTemplates from './DocumentTemplates';

const API_BASE_URL = 'http://165.22.181.147/api';

const DocumentRequests = () => {
    const { id: notificationRequestId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { canRead, canCreate, canUpdate, canDelete } = usePermission();
    const isPersonView = user?.user_role === 'Person' && user?.person_id;
    const [requests, setRequests] = useState([]);
    const [sacramentApplications, setSacramentApplications] = useState([]);
    const [requirementSubmissions, setRequirementSubmissions] = useState([]);
    const [requirementChecklists, setRequirementChecklists] = useState([]);
    const [requirementDialog, setRequirementDialog] = useState({ open: false, application: null });
    const [selectedRequirementIds, setSelectedRequirementIds] = useState([]);
    const [persons, setPersons] = useState([]);
    const [sacramentRecords, setSacramentRecords] = useState([]);
    const [fees, setFees] = useState([]);
    const [users, setUsers] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [baptismRecords, setBaptismRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState(searchParams.get('view') === 'applications' ? 'applications' : 'requests');
    const [applicationSearch, setApplicationSearch] = useState('');
    const [applicationCategoryFilter, setApplicationCategoryFilter] = useState('All');
    const [applicationStatusFilter, setApplicationStatusFilter] = useState('All');
    const [requestSearch, setRequestSearch] = useState('');
    const [requestStatusFilter, setRequestStatusFilter] = useState('All');
    const [openDialog, setOpenDialog] = useState(false);
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState(null);
    const defaultVerificationChecklist = {
        recordExists: false,
        validIdUploaded: false,
        authorizationLetterUploaded: false,
        purposeVerified: false,
        paymentVerified: false,
    };

    const [formData, setFormData] = useState({
        person_id: '',
        requester_name: '',
        document_type: 'Baptismal Certificate',
        template_id: '',
        purpose: '',
        sacramental_date: '',
        contact_number: '',
        pickup_date: '',
        verification_notes: '',
        status: 'Pending',
        payment_status: 'Unpaid',
        amount_paid: '0',
        payment_method: 'Cash',
        payment_date: '',
        received_by_user_id: '',
        fee_id: '',
        or_number: '',
        date_released: '',
        record_type: '',
        record_id: '',
    });
    const [verificationChecklist, setVerificationChecklist] = useState(defaultVerificationChecklist);
    const [documentFiles, setDocumentFiles] = useState({
        validId: null,
        authorizationLetter: null,
    });
    const [existingDocumentFiles, setExistingDocumentFiles] = useState({
        validId: [],
        authorizationLetter: [],
    });
    const [notificationDialog, setNotificationDialog] = useState({
        open: false,
        requestId: null,
        newStatus: null,
        notificationType: 'InApp', // 'InApp', 'Email', 'SMS', 'All'
        customMessage: '',
        sending: false,
    });

    useEffect(() => {
        fetchAllData();
    }, [isPersonView, user?.person_id]);

    useEffect(() => {
        if (!isPersonView || !user?.person_id) return;

        const currentPerson = persons.find((person) => Number(person.person_id) === Number(user.person_id));
        const currentPersonName = currentPerson ? `${currentPerson.first_name} ${currentPerson.last_name}` : '';

        setFormData((prev) => ({
            ...prev,
            person_id: String(user.person_id),
            requester_name: prev.requester_name && prev.requester_name.trim() ? prev.requester_name : currentPersonName,
            contact_number: prev.contact_number && prev.contact_number.trim() ? prev.contact_number : (currentPerson?.contact_no || ''),
        }));
    }, [isPersonView, user?.person_id, persons]);

    const fetchAllData = async () => {
        try {
            const [personsRes, requestsRes, applicationsRes, submissionsRes, checklistsRes, feesRes, usersRes, templatesRes, sacramentsRes, baptismRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/persons.php`),
                axios.get(`${API_BASE_URL}/document-requests.php${isPersonView ? `?person_id=${user.person_id}` : ''}`),
                axios.get(`${API_BASE_URL}/sacrament-applications.php${isPersonView ? `?person_id=${user.person_id}` : ''}`),
                axios.get(`${API_BASE_URL}/requirement-submissions.php${isPersonView ? `?person_id=${user.person_id}` : ''}`),
                axios.get(`${API_BASE_URL}/requirement-checklists.php`),
                axios.get(`${API_BASE_URL}/service-fees.php`),
                axios.get(`${API_BASE_URL}/users.php`),
                axios.get(`${API_BASE_URL}/document-templates.php`),
                axios.get(`${API_BASE_URL}/sacraments.php?type=all`),
                axios.get(`${API_BASE_URL}/baptismal-records.php`),
            ]);
            
            const personsData = personsRes.data.success ? personsRes.data.data || [] : [];
            const requestsData = requestsRes.data.success ? requestsRes.data.data || [] : [];
            const applicationsData = applicationsRes.data.success ? applicationsRes.data.data || [] : [];
            const submissionsData = submissionsRes.data.success ? submissionsRes.data.data || [] : [];
            const checklistsData = checklistsRes.data.success ? checklistsRes.data.data || [] : [];
            const feesData = feesRes.data.success ? feesRes.data.data || [] : [];
            const usersData = usersRes.data.success ? usersRes.data.data || [] : [];
            const templatesData = templatesRes.data.success ? templatesRes.data.data || [] : [];
            const sacramentData = sacramentsRes.data.success ? sacramentsRes.data.data || [] : [];
            const baptismData = baptismRes.data.success ? baptismRes.data.data || [] : [];

            setPersons(personsData);
            setRequests(requestsData);
            setSacramentApplications(applicationsData);
            setRequirementSubmissions(submissionsData);
            setRequirementChecklists(checklistsData);
            setFees(feesData);
            setUsers(usersData);
            setTemplates(templatesData);
            setSacramentRecords(sacramentData);
            setBaptismRecords(baptismData);
            setError('');
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.response?.statusText || err.message;
            setError('Error fetching data: ' + errorMsg);
            console.error('Fetch error:', err);
            setPersons([]);
            setRequests([]);
            setSacramentApplications([]);
            setRequirementSubmissions([]);
            setRequirementChecklists([]);
            setFees([]);
            setUsers([]);
            setTemplates([]);
            setSacramentRecords([]);
            setBaptismRecords([]);
        } finally {
            setLoading(false);
        }
    };

    const getPersonName = (personId) => {
        const person = persons.find(p => p.person_id == personId);
        return person ? `${person.first_name} ${person.last_name}` : 'Unknown';
    };

    const getSacramentTypeForDocument = (documentType) => ({
        'Baptismal Certificate': 'Baptismal',
        'Confirmation Certificate': 'Confirmation',
        'Marriage Certificate': 'Marriage',
        'Death Certificate': 'Burial',
    }[documentType] || null);

    const getMatchingSacramentRecords = (personId, documentType) => {
        const sacramentType = getSacramentTypeForDocument(documentType);
        if (!personId || !sacramentType) return [];

        return sacramentRecords
            .filter((record) => {
                const matchesPerson = sacramentType === 'Marriage'
                    ? Number(record.person_id) === Number(personId) || Number(record.related_person_id) === Number(personId)
                    : Number(record.person_id) === Number(personId);
                return record.sacrament_type === sacramentType && matchesPerson;
            })
            .sort((first, second) => String(second.record_date || '').localeCompare(String(first.record_date || '')));
    };

    const applyPersonRecordDefaults = (personId, documentType, nextData = formData, replacePersonDetails = false) => {
        const person = persons.find((item) => Number(item.person_id) === Number(personId));
        const matchingRecords = getMatchingSacramentRecords(personId, documentType);
        return {
            ...nextData,
            person_id: personId,
            requester_name: replacePersonDetails ? (person ? `${person.first_name} ${person.last_name}` : '') : (nextData.requester_name || (person ? `${person.first_name} ${person.last_name}` : '')),
            contact_number: replacePersonDetails ? (person?.contact_no || '') : (nextData.contact_number || person?.contact_no || ''),
            sacramental_date: matchingRecords[0]?.record_date || '',
                record_type: matchingRecords[0]?.record_type || '',
                record_id: matchingRecords[0]?.record_id || '',
        };
    };

    const uploadSupportingDocuments = async (requestId, requestPersonId = user?.person_id || 0) => {
        const files = [];
        if (documentFiles.validId) files.push({ file: documentFiles.validId, key: 'valid_id' });
        if (documentFiles.authorizationLetter) files.push({ file: documentFiles.authorizationLetter, key: 'authorization_letter' });

        await Promise.all(files.map(async ({ file, key }) => {
            const formPayload = new FormData();
            formPayload.append('file', file);
            formPayload.append('record_type', 'document_request');
            formPayload.append('record_id', String(requestId));
            formPayload.append('person_id', String(requestPersonId));
            formPayload.append('file_name', `${key}_${file.name}`);

            await axios.post(`${API_BASE_URL}/file-attachments.php`, formPayload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        }));
    };

    const getChecklistSummary = (checklist) => {
        const labels = [];
        if (checklist.recordExists) labels.push('Record matched');
        if (checklist.validIdUploaded) labels.push('Valid ID uploaded');
        if (checklist.authorizationLetterUploaded) labels.push('Authorization letter uploaded');
        if (checklist.purposeVerified) labels.push('Purpose verified');
        if (checklist.paymentVerified) labels.push('Payment verified');
        return labels.length ? labels.join(' â€¢ ') : 'Checklist not completed';
    };

    const getAttachmentUrl = (filePath) => {
        if (!filePath) return '#';

        const normalizedPath = String(filePath).trim().replace(/\\/g, '/');

        if (/^https?:\/\//i.test(normalizedPath)) {
            return normalizedPath;
        }

        const publicRoot = API_BASE_URL.replace(/\/api$/i, '');
        const safePath = normalizedPath.replace(/^\/+/, '').replace(/^public\//i, '');

        if (!safePath) return '#';

        if (safePath.startsWith('uploads/')) {
            return `${publicRoot}/${safePath}`;
        }

        return `${publicRoot}/${safePath.startsWith('public/') ? safePath.replace(/^public\//i, '') : safePath}`;
    };

    const openAttachment = (file) => {
        if (!file) {
            navigate('/file-attachments');
            return;
        }

        const personId = file.person_id || formData.person_id || user?.person_id;
        const fileId = file.file_id || '';
        const params = new URLSearchParams();

        if (personId) params.set('person_id', String(personId));
        if (fileId) params.set('file_id', String(fileId));

        navigate(`/file-attachments${params.toString() ? `?${params.toString()}` : ''}`);
    };

    const fetchRequestAttachments = async (requestId, requestPersonId = null) => {
        if (!requestId && !requestPersonId) {
            setExistingDocumentFiles({ validId: [], authorizationLetter: [] });
            return;
        }

        try {
            const response = await axios.get(`${API_BASE_URL}/file-attachments.php`);
            if (response.data.success) {
                const files = (response.data.data || []).filter((file) => {
                    const recordType = String(file.record_type || '').toLowerCase();
                    const matchesRequest = requestId && String(file.record_id) === String(requestId) && recordType === 'document_request';
                    const matchesPerson = requestPersonId && Number(file.person_id) === Number(requestPersonId) && (recordType === 'person' || recordType === 'document_request' || !recordType);
                    return matchesRequest || matchesPerson;
                });

                const getAttachmentBucket = (file) => {
                    const name = String(file.file_name || '').toLowerCase();
                    const path = String(file.file_path || '').toLowerCase();
                    if (name.includes('authorization') || name.includes('letter') || path.includes('authorization')) {
                        return 'authorizationLetter';
                    }
                    if (name.includes('valid') || name.includes('id') || name.includes('passport') || name.includes('driver') || name.includes('government')) {
                        return 'validId';
                    }
                    return 'validId';
                };

                const buckets = { validId: [], authorizationLetter: [] };
                files.forEach((file, index) => {
                    const bucket = getAttachmentBucket(file);
                    if (buckets[bucket].length === 0 || bucket === 'authorizationLetter' || index > 0) {
                        buckets[bucket].push(file);
                    }
                });

                if (buckets.validId.length === 0 && buckets.authorizationLetter.length === 0 && files.length > 0) {
                    files.forEach((file, index) => {
                        if (index === 0) buckets.validId.push(file);
                        else buckets.authorizationLetter.push(file);
                    });
                }

                setExistingDocumentFiles({
                    validId: buckets.validId,
                    authorizationLetter: buckets.authorizationLetter,
                });
            } else {
                setExistingDocumentFiles({ validId: [], authorizationLetter: [] });
            }
        } catch (err) {
            console.error('Error fetching request attachments:', err);
            setExistingDocumentFiles({ validId: [], authorizationLetter: [] });
        }
    };

    const isChecklistComplete = (checklist) => Object.values(checklist).every(Boolean);
    const hasExistingSupportingDocs = Boolean(
        verificationChecklist.validIdUploaded ||
        verificationChecklist.authorizationLetterUploaded ||
        existingDocumentFiles.validId.length > 0 ||
        existingDocumentFiles.authorizationLetter.length > 0
    );

    const isRequestProcessingOnly = Boolean(editingId) && !isPersonView;

    const handleAddRequest = async () => {
        if (!formData.person_id || !formData.document_type) {
            setError('Please fill all required fields: Person and Document Type');
            return;
        }
        if (!formData.requester_name || formData.requester_name.trim() === '') {
            setError('Requester name is required');
            return;
        }

        if (formData.status === 'Approved' && !isChecklistComplete(verificationChecklist)) {
            setError('The request cannot be approved until all verification checks are completed.');
            return;
        }

        const checklistSummary = getChecklistSummary(verificationChecklist);
        const existingRequest = editingId ? requests.find((request) => String(request.request_id) === String(editingId)) : null;
        const lockedPersonId = existingRequest?.person_id ?? formData.person_id;
        const lockedRequesterName = existingRequest?.requester_name ?? formData.requester_name;
        const lockedDocumentType = existingRequest?.document_type ?? formData.document_type;

        try {
            const endpoint = editingId 
                ? `${API_BASE_URL}/document-requests.php?id=${editingId}` 
                : `${API_BASE_URL}/document-requests.php`;
            const method = editingId ? 'put' : 'post';

            const requestPayload = {
                person_id: lockedPersonId,
                requester_name: lockedRequesterName,
                document_type: lockedDocumentType,
                purpose: formData.purpose,
                sacramental_date: formData.sacramental_date || null,
                contact_number: formData.contact_number || null,
                            record_type: formData.record_type || null,
                            record_id: formData.record_id || null,
            };

            if (!isPersonView) {
                Object.assign(requestPayload, {
                    template_id: formData.template_id || null,
                    pickup_date: formData.pickup_date || null,
                    verification_notes: formData.verification_notes || checklistSummary,
                    status: formData.status,
                    payment_status: formData.payment_status,
                    amount_paid: parseFloat(formData.amount_paid || 0),
                    payment_method: formData.payment_method,
                    payment_date: formData.payment_date || null,
                    received_by_user_id: formData.received_by_user_id || null,
                    fee_id: formData.fee_id || null,
                    or_number: formData.or_number,
                    date_released: formData.date_released || null,
                });
            }

            const response = await axios[method](endpoint, requestPayload);

            if (response.data.success) {
                const requestId = response.data.request_id || editingId;
                if (requestId && isPersonView && (documentFiles.validId || documentFiles.authorizationLetter)) {
                    await uploadSupportingDocuments(requestId, formData.person_id || user?.person_id || 0);
                }

                setOpenDialog(false);
                setEditingId(null);
                setDocumentFiles({ validId: null, authorizationLetter: null });
                setVerificationChecklist(defaultVerificationChecklist);
                setFormData({
                    person_id: '',
                    requester_name: '',
                    document_type: 'Baptismal Certificate',
                    template_id: '',
                    purpose: '',
                    sacramental_date: '',
                    contact_number: '',
                    pickup_date: '',
                    verification_notes: '',
                    status: 'Pending',
                    payment_status: 'Unpaid',
                    amount_paid: '0',
                    payment_method: 'Cash',
                    payment_date: '',
                    received_by_user_id: '',
                    fee_id: '',
                    or_number: '',
                    date_released: '',
                });
                fetchAllData();
                setError('');
            } else {
                setError('Failed to save request: ' + (response.data.message || 'Unknown error'));
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.response?.statusText || err.message;
            setError('Error saving request: ' + errorMsg);
            console.error('Save error:', err);
        }
    };

    const handleUpdateStatus = async (requestId, newStatus) => {
        const currentRequest = requests.find((request) => request.request_id === requestId);
        if ((newStatus === 'Approved' || newStatus === 'Ready for Pickup' || newStatus === 'Released') && !isChecklistComplete({
            recordExists: Boolean(currentRequest?.verification_notes || currentRequest?.reference_number),
            validIdUploaded: Boolean(currentRequest?.verification_notes && currentRequest.verification_notes.includes('Valid ID uploaded')),
            authorizationLetterUploaded: Boolean(currentRequest?.verification_notes && currentRequest.verification_notes.includes('Authorization letter uploaded')),
            purposeVerified: Boolean(currentRequest?.verification_notes && currentRequest.verification_notes.includes('Purpose verified')),
            paymentVerified: Boolean(currentRequest?.verification_notes && currentRequest.verification_notes.includes('Payment verified')),
        })) {
            setError('This request cannot be approved until all verification checks are completed.');
            return;
        }

        // Show notification dialog for Approved or Ready for Pickup
        if (newStatus === 'Approved' || newStatus === 'Ready for Pickup') {
            setNotificationDialog({
                open: true,
                requestId,
                newStatus,
                notificationType: 'InApp',
                customMessage: '',
                sending: false,
            });
        } else {
            // For other statuses, update directly
            await performStatusUpdate(requestId, newStatus);
        }
    };

    const performStatusUpdate = async (requestId, newStatus, notificationType = null, customMessage = '') => {
        try {
            const statusPayload = {
                status: newStatus,
            };
            if (newStatus === 'Ready for Pickup') {
                statusPayload.pickup_date = new Date().toISOString().slice(0, 10);
            }
            const response = await axios.put(`${API_BASE_URL}/document-requests.php?id=${requestId}`, statusPayload);

            if (response.data.success) {
                // Send notification if requested
                if (notificationType && notificationType !== 'InApp') {
                    const currentRequest = requests.find((request) => request.request_id === requestId);
                    if (currentRequest && currentRequest.person_id) {
                        const person = persons.find(p => p.person_id === currentRequest.person_id);
                        if (person) {
                            await sendNotification(
                                currentRequest.person_id,
                                notificationType,
                                customMessage || getDefaultNotificationMessage(newStatus, currentRequest.document_type),
                                person
                            );
                        }
                    }
                }
                fetchAllData();
                setError('');
                setNotificationDialog({ open: false, requestId: null, newStatus: null, notificationType: 'InApp', customMessage: '', sending: false });
            } else {
                setError('Failed to update request: ' + (response.data.message || 'Unknown error'));
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.response?.statusText || err.message;
            setError('Error updating request: ' + errorMsg);
            console.error('Update error:', err);
        }
    };

    const getDefaultNotificationMessage = (status, documentType) => {
        if (status === 'Approved') {
            return `Your ${documentType} request has been approved! âœ… It will be prepared soon. You will receive a notification when it's ready for pickup.`;
        } else if (status === 'Ready for Pickup') {
            return `Your ${documentType} request is ready for pickup! ðŸŽ‰ Please visit the parish office at your earliest convenience with your reference number.`;
        }
        return `Your document request status has been updated to ${status}.`;
    };

    const sendNotification = async (personId, notificationType, message, person) => {
        try {
            const payload = {
                notif_type: notificationType,
                message_body: message,
                person_id: personId,
                category: 'Document Requests',
                subject: notificationType === 'Email' ? 'Document Request Update' : undefined,
            };

            // Get person's contact info
            if (notificationType === 'Email') {
                payload.recipient = person.email || '';
            } else if (notificationType === 'SMS') {
                payload.recipient = person.contact_no || '';
            }

            const response = await axios.post(`${API_BASE_URL}/send-notification.php`, payload);
            if (!response.data.success) {
                console.warn(`Failed to send ${notificationType} notification:`, response.data.message);
            }
        } catch (err) {
            console.error(`Error sending ${notificationType} notification:`, err);
        }
    };

    const handleDeleteRequest = async (requestId) => {
        if (window.confirm('Delete this request?')) {
            try {
                const application = sacramentApplications.find((item) => item.application_id === requestId);
                const response = await axios.delete(`${API_BASE_URL}/${application ? 'sacrament-applications' : 'document-requests'}.php?id=${requestId}`);
                if (response.data.success) {
                    fetchAllData();
                    setError('');
                } else {
                    setError('Failed to delete request: ' + (response.data.message || 'Unknown error'));
                }
            } catch (err) {
                const errorMsg = err.response?.data?.message || err.response?.statusText || err.message;
                setError('Error deleting request: ' + errorMsg);
                console.error('Delete error:', err);
            }
        }
    };

    const handleUpdateApplicationStatus = async (applicationId, status) => {
        if (!['Pending', 'Processing'].includes(status)) return;
        try {
            const response = await axios.put(`${API_BASE_URL}/sacrament-applications.php?id=${applicationId}`, {
                status,
                reviewed_by_user_id: user?.user_id || null,
            });
            if (response.data.success) {
                fetchAllData();
                setError('');
            } else {
                setError('Failed to update application: ' + (response.data.message || 'Unknown error'));
            }
        } catch (err) {
            setError('Error updating application: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleReviewRequirement = async (submission, status) => {
        try {
            const response = await axios.put(`${API_BASE_URL}/requirement-submissions.php`, {
                check_id: submission.check_id,
                person_id: submission.person_id,
                status,
                notes: submission.notes || '',
            });
            if (!response.data?.success) throw new Error(response.data?.message || 'Unable to update requirement');
            await fetchAllData();
            setError('');
        } catch (err) {
            setError('Error updating requirement: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleRecordApplicationRequirements = async () => {
        const application = requirementDialog.application;
        if (!application || selectedRequirementIds.length === 0) {
            setError('Select at least one requirement that was submitted.');
            return;
        }
        try {
            await Promise.all(selectedRequirementIds.map((checkId) => axios.post(`${API_BASE_URL}/requirement-submissions.php`, {
                person_id: application.person_id,
                check_id: checkId,
                status: 'Submitted',
                notes: 'Submitted at parish office.',
            })));
            setRequirementDialog({ open: false, application: null });
            setSelectedRequirementIds([]);
            await fetchAllData();
            setError('');
        } catch (err) {
            setError('Error recording submitted requirements: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleEditRequest = (request) => {
        setEditingId(request.request_id);
        fetchRequestAttachments(request.request_id, request.person_id);
        let parsedChecklist = { ...defaultVerificationChecklist };
        try {
            if (request.verification_notes && request.verification_notes.includes('Record matched')) {
                parsedChecklist.recordExists = true;
            }
            if (request.verification_notes && request.verification_notes.includes('Valid ID uploaded')) {
                parsedChecklist.validIdUploaded = true;
            }
            if (request.verification_notes && request.verification_notes.includes('Authorization letter uploaded')) {
                parsedChecklist.authorizationLetterUploaded = true;
            }
            if (request.verification_notes && request.verification_notes.includes('Purpose verified')) {
                parsedChecklist.purposeVerified = true;
            }
            if (request.verification_notes && request.verification_notes.includes('Payment verified')) {
                parsedChecklist.paymentVerified = true;
            }
        } catch (err) {
            // Ignore malformed notes and keep defaults
        }

        setVerificationChecklist(parsedChecklist);
        setFormData({
            person_id: request.person_id,
            requester_name: request.requester_name || '',
            document_type: request.document_type,
            template_id: request.template_id || '',
            purpose: request.purpose,
            sacramental_date: request.sacramental_date || '',
            contact_number: request.contact_number || '',
            pickup_date: request.pickup_date || '',
            verification_notes: request.verification_notes || '',
            status: request.status,
            payment_status: request.payment_status,
            amount_paid: request.amount_paid || '0',
            payment_method: request.payment_method || 'Cash',
            payment_date: request.payment_date ? request.payment_date.split(' ')[0] : '',
            received_by_user_id: request.received_by_user_id || '',
            fee_id: request.fee_id || '',
            or_number: request.or_number || '',
            date_released: request.date_released ? request.date_released.split(' ')[0] : '',
        });
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingId(null);
        setVerificationChecklist(defaultVerificationChecklist);
        setDocumentFiles({ validId: null, authorizationLetter: null });
        setExistingDocumentFiles({ validId: [], authorizationLetter: [] });

        const defaultPersonId = isPersonView && user?.person_id ? String(user.person_id) : '';
        const defaultPersonName = isPersonView && user?.person_id
            ? (() => {
                const currentPerson = persons.find((person) => Number(person.person_id) === Number(user.person_id));
                return currentPerson ? `${currentPerson.first_name} ${currentPerson.last_name}` : '';
            })()
            : '';

        setFormData({
            person_id: defaultPersonId,
            requester_name: defaultPersonName,
            document_type: 'Baptismal Certificate',
            template_id: '',
            purpose: '',
            sacramental_date: '',
            contact_number: isPersonView && user?.person_id ? (() => {
                const currentPerson = persons.find((person) => Number(person.person_id) === Number(user.person_id));
                return currentPerson?.contact_no || '';
            })() : '',
            pickup_date: '',
            verification_notes: '',
            status: 'Pending',
            payment_status: 'Unpaid',
            amount_paid: '0',
            payment_method: 'Cash',
            payment_date: '',
            received_by_user_id: '',
            fee_id: '',
            or_number: '',
            date_released: '',
        });
    };

    const getStatusColor = (status) => {
        const colors = {
            'Pending': 'default',
            'Processing': 'warning',
            'Approved': 'success',
            'Ready for Pickup': 'info',
            'Released': 'success',
        };
        return colors[status] || 'default';
    };

    const buildClaimQrUrl = (referenceNumber) => {
        if (!referenceNumber) return '';
        return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(referenceNumber)}`;
    };

    const defaultCertificateTemplate = `
        <div style="font-family: Georgia, serif; width: 760px; margin: 0 auto; padding: 32px 28px; border: 4px double #2c2a27; background: #fffdf8; color: #1a1a1a;">
            <div style="text-align: center; border-bottom: 2px solid #cda45c; padding-bottom: 16px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: center; align-items: center; gap: 16px;">
                    <div style="width: 70px; height: 70px; border: 3px solid #b88d43; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #8a5d1e;">âœ</div>
                    <div>
                        <div style="font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; color: #6b4b1d; margin-bottom: 4px;">Diocese of Legazpi</div>
                        <div style="font-size: 28px; font-weight: 700; letter-spacing: 1px;">Saint Joseph The Worker Parish</div>
                        <div style="font-size: 14px; color: #4d4d4d;">Banquerohan, Legazpi City, Albay, Philippines</div>
                    </div>
                </div>
            </div>

            <h2 style="text-align: center; font-size: 32px; margin: 12px 0 6px; font-weight: 700;">Baptismal Certificate</h2>
            <div style="text-align: center; font-size: 18px; margin-bottom: 22px; font-style: italic;">of</div>
            <h3 style="text-align: center; font-size: 30px; margin: 0 0 18px; font-weight: 700; color: #1d1d1d;">{{full_name}}</h3>

            <table style="width: 100%; border-collapse: collapse; font-size: 17px; margin-top: 10px;">
                <tr>
                    <td style="padding: 8px 10px; width: 40%; font-weight: 600;">Canonical Book of Baptism No.</td>
                    <td style="padding: 8px 10px; width: 20%; border-bottom: 1px solid #222; text-align: center;">{{book_no}}</td>
                    <td style="padding: 8px 10px; width: 10%; font-weight: 600; text-align: center;">Page</td>
                    <td style="padding: 8px 10px; width: 20%; border-bottom: 1px solid #222; text-align: center;">{{page_no}}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 10px; font-weight: 600;">Name of Child:</td>
                    <td colspan="3" style="padding: 10px 10px; border-bottom: 1px solid #222;">{{full_name}}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 10px; font-weight: 600;">Date of Birth:</td>
                    <td colspan="3" style="padding: 10px 10px; border-bottom: 1px solid #222;">{{birth_date}}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 10px; font-weight: 600;">Place of Birth:</td>
                    <td colspan="3" style="padding: 10px 10px; border-bottom: 1px solid #222;">{{birth_place}}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 10px; font-weight: 600;">Father:</td>
                    <td colspan="3" style="padding: 10px 10px; border-bottom: 1px solid #222; font-size: 18px; font-weight: 500; letter-spacing: 0.01em; color: #1f1f1f;">{{father_name}}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 10px; font-weight: 600;">Mother:</td>
                    <td colspan="3" style="padding: 10px 10px; border-bottom: 1px solid #222; font-size: 18px; font-weight: 500; letter-spacing: 0.01em; color: #1f1f1f;">{{mother_name}}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 10px; font-weight: 600;">Date of Baptism:</td>
                    <td colspan="3" style="padding: 10px 10px; border-bottom: 1px solid #222;">{{baptism_date}}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 10px; font-weight: 600;">Place of Baptism:</td>
                    <td colspan="3" style="padding: 10px 10px; border-bottom: 1px solid #222;">{{baptism_place}}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 10px; font-weight: 600;">Sponsor of Baptism:</td>
                    <td colspan="3" style="padding: 10px 10px; border-bottom: 1px solid #222;">{{sponsors}}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 10px; font-weight: 600;">Minister of Baptism:</td>
                    <td colspan="3" style="padding: 10px 10px; border-bottom: 1px solid #222;">{{minister_name}}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 10px; font-weight: 600;">Parish Priest:</td>
                    <td colspan="3" style="padding: 10px 10px; border-bottom: 1px solid #222;">{{parish_priest}}</td>
                </tr>
            </table>

            <div style="margin-top: 22px; padding-top: 10px; font-size: 16px; line-height: 1.7; text-align: justify;">
                THIS IS TO CERTIFY that the above data are true and correct and agree with the Book of Baptism to which I refer in testimony hereof. I sign the present certificate and hereby affix the seal of the parish, {{certificate_date}} at Banquerohan, Legazpi City, Albay, Philippines.
            </div>

            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 26px;">
                <div style="width: 40%; text-align: center;">
                    <div style="font-size: 13px; margin-bottom: 8px;">Parish Seal</div>
                </div>
                <div style="width: 45%; text-align: center;">
                    <div style="border-top: 1px solid #222; padding-top: 8px; font-weight: 700;">REV. FR. EDGAR MORON</div>
                    <div style="font-size: 13px;">Parish Priest</div>
                </div>
            </div>

            <div style="text-align: center; margin-top: 18px; font-size: 14px;">
                By: <strong>LUCITA E. BRAZAS</strong><br>
                Parish Registrar
            </div>
        </div>
    `;

    const formatCertificateDate = (dateValue) => {
        if (!dateValue) return 'N/A';

        const date = new Date(dateValue);
        if (Number.isNaN(date.getTime())) {
            return String(dateValue);
        }

        const day = date.getDate();
        const month = date.toLocaleDateString('en-US', { month: 'long' });
        const year = date.getFullYear();

        const ordinal = (n) => {
            const remainder10 = n % 10;
            const remainder100 = n % 100;

            if (remainder10 === 1 && remainder100 !== 11) return 'st';
            if (remainder10 === 2 && remainder100 !== 12) return 'nd';
            if (remainder10 === 3 && remainder100 !== 13) return 'rd';
            return 'th';
        };

        return `this ${day}${ordinal(day)} day of ${month} ${year}`;
    };

    const fillTemplateTokens = (templateBody, values = {}) => {
        const safeValues = {
            full_name: values.full_name || 'N/A',
            book_no: values.book_no || 'N/A',
            page_no: values.page_no || 'N/A',
            birth_date: values.birth_date || 'N/A',
            birth_place: values.birth_place || 'N/A',
            father_name: values.father_name || 'N/A',
            mother_name: values.mother_name || 'N/A',
            baptism_date: values.baptism_date || 'N/A',
            baptism_place: values.baptism_place || 'Saint Joseph The Worker Parish',
            sponsors: values.sponsors || 'N/A',
            minister_name: values.minister_name || 'N/A',
            parish_priest: values.parish_priest || 'REV. FR. EDGAR D. MORON',
            certificate_date: values.certificate_date || 'N/A',
            ...values,
        };

        return Object.entries(safeValues).reduce((output, [key, value]) => {
            const token = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
            return output.replace(token, value == null ? 'N/A' : String(value));
        }, templateBody || defaultCertificateTemplate);
    };

    const prepareCertificateHtml = (request) => {
        const person = persons.find((entry) => Number(entry.person_id) === Number(request?.person_id));
        const baptismRecord = baptismRecords.find((entry) => Number(entry.person_id) === Number(request?.person_id));
        const templateSource = templates.find((entry) => String(entry.template_id) === String(request?.template_id));
        const templateBody = (templateSource && templateSource.template_body) || defaultCertificateTemplate;

        const formatNameCase = (name) => {
            if (!name) return 'N/A';
            return String(name)
                .trim()
                .replace(/\s+/g, ' ')
                .split(' ')
                .filter(Boolean)
                .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
                .join(' ');
        };

        const personName = formatNameCase(
            person
                ? `${person.first_name || ''} ${person.middle_name || ''} ${person.last_name || ''}`.replace(/\s+/g, ' ').trim()
                : request?.requester_name || 'N/A'
        );

        const fatherId = baptismRecord?.father_id || null;
        const motherId = baptismRecord?.mother_id || null;
        const fatherPerson = persons.find((entry) => Number(entry.person_id) === Number(fatherId));
        const motherPerson = persons.find((entry) => Number(entry.person_id) === Number(motherId));
        const fatherName = formatNameCase(
            fatherPerson
                ? `${fatherPerson.first_name || ''} ${fatherPerson.last_name || ''}`.trim()
                : (baptismRecord?.father_name || (baptismRecord?.father_first ? `${baptismRecord.father_first} ${baptismRecord.father_last || ''}`.trim() : 'N/A'))
        );
        const motherName = formatNameCase(
            motherPerson
                ? `${motherPerson.first_name || ''} ${motherPerson.last_name || ''}`.trim()
                : (baptismRecord?.mother_name || (baptismRecord?.mother_first ? `${baptismRecord.mother_first} ${baptismRecord.mother_last || ''}`.trim() : 'N/A'))
        );

        const priestId = baptismRecord?.priest_id || null;
        const priestPerson = persons.find((entry) => Number(entry.person_id) === Number(priestId));
        const ministerName = priestPerson ? `${priestPerson.first_name || ''} ${priestPerson.last_name || ''}`.trim() : (baptismRecord?.priest_first ? `${baptismRecord.priest_first} ${baptismRecord.priest_last || ''}`.trim() : 'N/A');

        const replacementValues = {
            full_name: personName,
            book_no: baptismRecord?.book_no || 'N/A',
            page_no: baptismRecord?.page_no || 'N/A',
            birth_date: person?.birth_date || 'N/A',
            birth_place: formatNameCase(person?.birth_place || 'N/A'),
            father_name: fatherName,
            mother_name: motherName,
            baptism_date: baptismRecord?.baptism_date || request?.sacramental_date || 'N/A',
            baptism_place: 'Saint Joseph The Worker Parish',
            sponsors: formatNameCase(baptismRecord?.godparents || 'N/A'),
            minister_name: 'REV. FR. EDGAR D. MORON',
            parish_priest: 'REV. FR. EDGAR D. MORON',
            certificate_date: formatCertificateDate(person?.birth_date),
        };

        return fillTemplateTokens(templateBody, replacementValues);
    };

    const openPrintCertificate = (request) => {
        const html = prepareCertificateHtml(request);
        const printWindow = window.open('', '_blank', 'width=1200,height=1000');

        if (!printWindow) {
            setError('Your browser blocked the print window. Please allow pop-ups and try again.');
            return;
        }

        let printStarted = false;
        const startPrint = () => {
            if (printStarted || printWindow.closed) return;
            printStarted = true;
            printWindow.focus();
            printWindow.print();
        };

        printWindow.onload = startPrint;
        printWindow.onafterprint = () => {
            if (!printWindow.closed) printWindow.close();
        };
        printWindow.document.open();
        printWindow.document.write(`
            <html>
                <head>
                    <title>Certificate</title>
                    <style>
                        body { margin: 0; padding: 24px; background: #f3f4f6; }
                        @media print {
                            body { background: #fff; }
                            @page { size: A4 portrait; margin: 18mm; }
                        }
                    </style>
                </head>
                <body>${html}</body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(startPrint, 500);
    };

    if (loading) {
        return <CircularProgress />;
    }

    const regularRequests = requests;
    const highlightedApplicationId = searchParams.get('application_id');
    const filteredRegularRequests = regularRequests.filter((request) => {
        const search = requestSearch.trim().toLowerCase();
        const matchesSearch = !search || [
            request.tracking_number,
            request.requester_name,
            request.document_type,
            request.purpose,
        ].some((value) => String(value || '').toLowerCase().includes(search));
        const matchesStatus = requestStatusFilter === 'All' || request.status === requestStatusFilter;
        const matchesNotification = !notificationRequestId || String(request.request_id) === notificationRequestId;
        return matchesSearch && matchesStatus && matchesNotification;
    });
    const filteredSacramentApplications = sacramentApplications.filter((application) => {
        const search = applicationSearch.trim().toLowerCase();
        const trackingNumber = `sa-${String(application.application_id).padStart(5, '0')}`;
        const matchesSearch = !search || [application.applicant_name, application.purpose, application.category, trackingNumber]
            .some((value) => String(value || '').toLowerCase().includes(search));
        const matchesCategory = applicationCategoryFilter === 'All' || application.category === applicationCategoryFilter;
        const matchesStatus = applicationStatusFilter === 'All' || application.status === applicationStatusFilter;
        const matchesNotification = !highlightedApplicationId || String(application.application_id) === highlightedApplicationId;
        return matchesSearch && matchesCategory && matchesStatus && matchesNotification;
    });
    const pendingCount = regularRequests.filter(r => r.status === 'Pending').length;
    const paidCount = regularRequests.filter(r => r.payment_status === 'Paid').length;
    const processedCount = regularRequests.filter(r => r.status === 'Released').length;

    const highlightedRequest = requests.find((request) => String(request.request_id) === notificationRequestId);
    const visiblePersonApplications = highlightedApplicationId
        ? sacramentApplications.filter((application) => String(application.application_id) === highlightedApplicationId)
        : sacramentApplications;

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#edf3f1' }}>
            {/* Header Section */}
            <Box sx={{ py: { xs: 2.5, md: 3 }, background: 'linear-gradient(110deg, #123b50 0%, #0b6b68 70%, #d1a557 155%)', boxShadow: '0 12px 26px rgba(13, 70, 76, 0.14)' }}>
                <Container maxWidth="lg">
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <IconButton
                                onClick={() => navigate('/dashboard')}
                                sx={{ backgroundColor: 'rgba(255,255,255,0.14)', color: 'white', '&:hover': { backgroundColor: 'rgba(255,255,255,0.24)' } }}
                                aria-label="Back to dashboard"
                            >
                                <ArrowBackIcon />
                            </IconButton>
                            <Box>
                            <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: '0.12em' }}>
                                Parish services
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 800, color: 'white', mb: 0.5, lineHeight: 1.15 }}>
                                {isPersonView ? 'My Document Requests' : 'Document Requests'}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.78)' }}>
                                {isPersonView
                                    ? 'Your personal request history and document forms.'
                                    : 'Track parish document requests from submission to release.'}
                            </Typography>
                            </Box>
                        </Box>
                        {isPersonView ? (
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => setOpenDialog(true)}
                                sx={{ bgcolor: '#d6a85a', color: '#123b50', '&:hover': { bgcolor: '#e3ba70' }, boxShadow: 'none', borderRadius: 2, px: 2.5, py: 1, fontWeight: 700 }}
                            >
                                New Document Request
                            </Button>
                        ) : (
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Button
                                    variant="contained"
                                    onClick={() => document.getElementById('sacrament-applications-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                                    sx={{ bgcolor: '#0b6b68', color: 'white', '&:hover': { bgcolor: '#095754' }, boxShadow: 'none' }}
                                >
                                    Sacrament Applications
                                </Button>
                                <Button
                                    variant="contained"
                                    startIcon={<QrCodeScannerIcon />}
                                    onClick={() => navigate('/document-requests/scanner')}
                                    sx={{ bgcolor: '#d6a85a', color: '#123b50', '&:hover': { bgcolor: '#e3ba70' }, boxShadow: 'none' }}
                                >
                                    Scan Claim QR
                                </Button>
                            </Box>
                        )}
                    </Box>
                </Container>
            </Box>

            {/* Content Section */}
            <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                {/* Summary Cards */}
                {notificationRequestId && (
                    <Alert severity="info" sx={{ mb: 3 }}>
                        {highlightedRequest ? (
                            <>Showing requested document <strong>#{notificationRequestId}</strong> for <strong>{highlightedRequest.document_type}</strong>.</>
                        ) : (
                            <>Notification link opened for request <strong>#{notificationRequestId}</strong>, but the request was not found in the current list.</>
                        )}
                    </Alert>
                )}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={4}>
                        <Card sx={{ borderTop: '3px solid #168fa3' }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700 }}>
                                    Total Requests
                                </Typography>
                                <Typography variant="h5" sx={{ color: '#06b6d4', fontWeight: 700 }}>
                                    {regularRequests.length}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <Card sx={{ borderTop: '3px solid #d49347' }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700 }}>
                                    Pending
                                </Typography>
                                <Typography variant="h5" sx={{ color: '#f59e0b', fontWeight: 700 }}>
                                    {pendingCount}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <Card sx={{ borderTop: '3px solid #25a878' }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700 }}>
                                    Payments Received
                                </Typography>
                                <Typography variant="h5" sx={{ color: '#059669', fontWeight: 700 }}>
                                    {paidCount}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {!isPersonView && canRead('document_templates') && (
                    <Tabs
                        value={activeView}
                        onChange={(_, value) => setActiveView(value)}
                        sx={{ mb: 3, borderBottom: '1px solid #cfe0dc' }}
                        aria-label="Document requests views"
                    >
                        <Tab value="requests" label="Requests" />
                        <Tab value="templates" label="Templates" />
                    </Tabs>
                )}

                {activeView === 'templates' ? (
                    <DocumentTemplates embedded />
                ) : isPersonView && activeView === 'applications' ? (
                    <Box id="sacrament-applications-section">
                        {visiblePersonApplications.length > 0 ? visiblePersonApplications.map((application) => {
                            const applicationRequirements = requirementSubmissions.filter((submission) =>
                                Number(submission.person_id) === Number(application.person_id) &&
                                String(submission.category).toLowerCase() === String(application.category).toLowerCase()
                            );
                            return (
                                <Card key={application.application_id} sx={{ mb: 2, border: '1px solid #dbeafe', boxShadow: 1 }}>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 1.5 }}>
                                            <Box>
                                                <Typography variant="h6" sx={{ fontWeight: 800, color: '#123b50' }}>
                                                    {application.category} Application
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: '#64748b' }}>
                                                    Submitted {application.application_date ? new Date(application.application_date).toLocaleDateString() : '-'}
                                                </Typography>
                                            </Box>
                                            <Chip label={application.status || 'Pending'} color={getStatusColor(application.status)} variant="outlined" />
                                        </Box>
                                        <Typography variant="body2" sx={{ color: '#475569', mb: 2 }}>
                                            Purpose: {application.purpose || 'Not specified'}
                                        </Typography>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#123b50', mb: 1 }}>
                                            Requirements
                                        </Typography>
                                        <Box sx={{ display: 'grid', gap: 1 }}>
                                            {applicationRequirements.length > 0 ? applicationRequirements.map((submission) => (
                                                <Box key={submission.submission_id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, py: 1, borderTop: '1px solid #e5eeeb' }}>
                                                    <Box>
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{submission.requirement_name}</Typography>
                                                        {submission.notes && <Typography variant="caption" sx={{ display: 'block', color: '#64748b' }}>{submission.notes}</Typography>}
                                                    </Box>
                                                    <Chip label={submission.status} size="small" color={submission.status === 'Approved' ? 'success' : submission.status === 'Rejected' ? 'error' : 'warning'} />
                                                </Box>
                                            )) : (
                                                <Typography variant="body2" sx={{ color: '#64748b' }}>Wala pang requirement na na-record ng parish.</Typography>
                                            )}
                                        </Box>
                                    </CardContent>
                                </Card>
                            );
                        }) : (
                            <Alert severity="info">Hindi makita ang application na ito sa iyong account.</Alert>
                        )}
                    </Box>
                ) : isPersonView ? (
                    <Grid container spacing={2}>
                        {regularRequests.length > 0 ? (
                            regularRequests.map((request) => (
                                <Grid item xs={12} md={6} key={request.request_id}>
                                    <Card
                                        sx={{
                                            border: String(request.request_id) === notificationRequestId ? '1px solid #0284c7' : '1px solid #e2e8f0',
                                            backgroundColor: String(request.request_id) === notificationRequestId ? '#eff6ff' : '#ffffff',
                                            boxShadow: 1,
                                        }}
                                    >
                                        <CardContent>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                                                    {request.tracking_number || 'No tracking'}
                                                </Typography>
                                                <Chip
                                                    label={request.status || 'Pending'}
                                                    color={getStatusColor(request.status)}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </Box>
                                            <Typography sx={{ fontWeight: 700, mb: 1 }}>
                                                {request.document_type || 'Document Request'}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: '#475569', mb: 1 }}>
                                                Requested by {request.requester_name || getPersonName(request.person_id)} â€¢ {request.request_date ? new Date(request.request_date).toLocaleDateString() : 'No date'}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>
                                                Purpose: {request.purpose || 'Not specified'}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>
                                                Payment: {request.payment_status === 'Paid' ? 'Paid' : 'Unpaid'} â€¢ â‚±{parseFloat(request.amount_paid || 0).toFixed(2)}
                                            </Typography>
                                            {(request.status === 'Approved' || request.status === 'Ready for Pickup' || request.status === 'Released') && request.reference_number && (
                                                <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, background: '#f8fafc', border: '1px solid #dbeafe' }}>
                                                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#1d4ed8' }}>
                                                        Claim Stub Reference
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a', my: 0.5 }}>
                                                        {request.reference_number}
                                                    </Typography>
                                                    {request.pickup_date && (
                                                        <Typography variant="caption" sx={{ color: '#475569' }}>
                                                            Pickup Date: {new Date(request.pickup_date).toLocaleDateString()}
                                                        </Typography>
                                                    )}
                                                    <Box component="img" src={buildClaimQrUrl(request.reference_number)} alt="QR code" sx={{ width: 82, height: 82, mt: 1, borderRadius: 1 }} />
                                                </Box>
                                            )}
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', mt: 2 }}>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() => handleEditRequest(request)}
                                                >
                                                    View / Edit
                                                </Button>
                                                {(request.status === 'Approved' || request.status === 'Ready for Pickup' || request.status === 'Released') && request.reference_number && (
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        color="secondary"
                                                        onClick={() => navigate(`/document-requests/claim/${request.request_id}`)}
                                                    >
                                                        View Claim Stub
                                                    </Button>
                                                )}
                                                {!isPersonView && canUpdate('document_requests') && (
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        color={request.payment_status === 'Paid' ? 'success' : 'primary'}
                                                        onClick={() => handleUpdateStatus(request.request_id, request.status === 'Released' ? 'Ready for Pickup' : 'Released')}
                                                    >
                                                        {request.status === 'Released' ? 'Mark Pickup' : 'Update Status'}
                                                    </Button>
                                                )}
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))
                        ) : (
                            <Grid item xs={12}>
                                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
                                        No document requests yet
                                    </Typography>
                                    <Typography sx={{ color: '#64748b' }}>
                                        You can create a new request for your personal documents here.
                                    </Typography>
                                </Paper>
                            </Grid>
                        )}
                    </Grid>
                ) : (
                    <>
                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
                        <TextField
                            size="small"
                            label="Search document requests"
                            placeholder="Name, tracking #, document, purpose"
                            value={requestSearch}
                            onChange={(event) => setRequestSearch(event.target.value)}
                            sx={{ flex: '1 1 300px' }}
                        />
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>Status</InputLabel>
                            <Select value={requestStatusFilter} label="Status" onChange={(event) => setRequestStatusFilter(event.target.value)}>
                                <MenuItem value="All">All Statuses</MenuItem>
                                {['Pending', 'Processing', 'Approved', 'Ready for Pickup', 'Released'].map((status) => (
                                    <MenuItem key={status} value={status}>{status}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        {(requestSearch || requestStatusFilter !== 'All') && (
                            <Button size="small" onClick={() => { setRequestSearch(''); setRequestStatusFilter('All'); }}>
                                Clear filters
                            </Button>
                        )}
                    </Box>
                    <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#64748b' }}>
                        Showing {filteredRegularRequests.length} of {regularRequests.length} document requests
                    </Typography>
                    <TableContainer component={Paper} sx={{ backgroundColor: '#fff', borderRadius: 3, overflow: 'auto', border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)' }}>
                        <Table sx={{ minWidth: 750 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Tracking #</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Requester</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Document Type</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Purpose</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Request Date</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Payment</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Amount</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredRegularRequests.length > 0 ? (
                                    filteredRegularRequests.map((request) => (
                                        <TableRow 
                                            key={request.request_id}
                                            sx={{
                                                '&:nth-of-type(odd)': { backgroundColor: '#f8fafc' },
                                                '&:hover': { backgroundColor: '#f1f5f9' },
                                                bgcolor: String(request.request_id) === notificationRequestId ? '#e0f2fe' : undefined,
                                                border: String(request.request_id) === notificationRequestId ? '1px solid #0284c7' : undefined,
                                            }}
                                        >
                                            <TableCell sx={{ fontWeight: 600, fontSize: '0.9em' }}>{request.tracking_number || '-'}</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>{request.requester_name || getPersonName(request.person_id)}</TableCell>
                                            <TableCell><Chip label={request.document_type} size="small" /></TableCell>
                                            <TableCell>{request.purpose || '-'}</TableCell>
                                            <TableCell>{request.request_date ? new Date(request.request_date).toLocaleDateString() : '-'}</TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label={request.status || '-'} 
                                                    color={getStatusColor(request.status)}
                                                    variant="outlined"
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {request.payment_status === 'Paid' ? (
                                                    <Chip label="Paid" color="success" size="small" />
                                                ) : (
                                                    <Chip label="Unpaid" color="error" size="small" />
                                                )}
                                            </TableCell>
                                            <TableCell>â‚±{parseFloat(request.amount_paid || 0).toFixed(2)}</TableCell>
                                            <TableCell>
                                                {canUpdate('document_requests') && (
                                                    <IconButton 
                                                        size="small"
                                                        onClick={() => handleEditRequest(request)}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                )}
                                                <IconButton
                                                    size="small"
                                                    onClick={() => openPrintCertificate(request)}
                                                    title="Print certificate"
                                                >
                                                    <DownloadIcon fontSize="small" />
                                                </IconButton>
                                                {canDelete('document_requests') && (
                                                    <IconButton 
                                                        size="small" 
                                                        color="error"
                                                        onClick={() => handleDeleteRequest(request.request_id)}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={9} sx={{ textAlign: 'center', py: 3, color: '#64748b' }}>
                                            No requests match your search or filter.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    {sacramentApplications.length > 0 && (
                        <Box id="sacrament-applications-section" sx={{ mt: 3, scrollMarginTop: 16 }}>
                            <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 800, color: '#123b50' }}>
                                Sacrament Applications & Requirements
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 2, color: '#64748b' }}>
                                Application details and submitted requirements are reviewed together by applicant.
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
                                <TextField
                                    size="small"
                                    label="Search applicant"
                                    placeholder="Name, tracking #, purpose"
                                    value={applicationSearch}
                                    onChange={(event) => setApplicationSearch(event.target.value)}
                                    sx={{ flex: '1 1 260px' }}
                                />
                                <FormControl size="small" sx={{ minWidth: 160 }}>
                                    <InputLabel>Application</InputLabel>
                                    <Select value={applicationCategoryFilter} label="Application" onChange={(event) => setApplicationCategoryFilter(event.target.value)}>
                                        <MenuItem value="All">All Applications</MenuItem>
                                        <MenuItem value="Baptism">Baptism</MenuItem>
                                        <MenuItem value="Marriage">Marriage</MenuItem>
                                        <MenuItem value="Confirmation">Confirmation</MenuItem>
                                    </Select>
                                </FormControl>
                                <FormControl size="small" sx={{ minWidth: 150 }}>
                                    <InputLabel>Status</InputLabel>
                                    <Select value={applicationStatusFilter} label="Status" onChange={(event) => setApplicationStatusFilter(event.target.value)}>
                                        <MenuItem value="All">All Statuses</MenuItem>
                                        {['Pending', 'Processing', 'Incomplete', 'Approved', 'Rejected', 'Completed'].map((status) => (
                                            <MenuItem key={status} value={status}>{status}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                {(applicationSearch || applicationCategoryFilter !== 'All' || applicationStatusFilter !== 'All') && (
                                    <Button size="small" onClick={() => {
                                        setApplicationSearch('');
                                        setApplicationCategoryFilter('All');
                                        setApplicationStatusFilter('All');
                                    }}>
                                        Clear filters
                                    </Button>
                                )}
                            </Box>
                            <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#64748b' }}>
                                Showing {filteredSacramentApplications.length} of {sacramentApplications.length} applications
                            </Typography>
                            <TableContainer component={Paper} sx={{ backgroundColor: '#fff', borderRadius: 3, overflow: 'auto', border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)' }}>
                                <Table sx={{ minWidth: 700 }}>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Tracking #</TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Applicant</TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Application</TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Purpose</TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Application Date</TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Status</TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filteredSacramentApplications.map((application) => {
                                            const applicationRequirements = requirementSubmissions.filter((submission) =>
                                                Number(submission.person_id) === Number(application.person_id) &&
                                                String(submission.category).toLowerCase() === String(application.category).toLowerCase()
                                            );
                                            const categoryChecklists = requirementChecklists.filter((checklist) =>
                                                String(checklist.category).toLowerCase() === String(application.category).toLowerCase()
                                            );
                                            const requiredRequirementNames = new Set(categoryChecklists.map((checklist) => checklist.requirement_name));
                                            applicationRequirements.forEach((submission) => requiredRequirementNames.add(submission.requirement_name));
                                            const approvedRequirements = applicationRequirements.filter((submission) => submission.status === 'Approved').length;
                                            const totalRequirements = requiredRequirementNames.size;
                                            const missingRequirements = [...requiredRequirementNames].filter((name) =>
                                                !applicationRequirements.some((submission) => submission.requirement_name === name)
                                            );
                                            const pendingRequirements = applicationRequirements
                                                .filter((submission) => submission.status === 'Submitted' || submission.status === 'Pending')
                                                .map((submission) => submission.requirement_name);
                                            const rejectedRequirements = applicationRequirements
                                                .filter((submission) => submission.status === 'Rejected')
                                                .map((submission) => submission.requirement_name);
                                            return (
                                            <React.Fragment key={application.application_id}>
                                            <TableRow sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f8fafc' }, '&:hover': { backgroundColor: '#f1f5f9' } }}>
                                                <TableCell sx={{ fontWeight: 600, fontSize: '0.9em' }}>SA-{String(application.application_id).padStart(5, '0')}</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>{application.applicant_name || getPersonName(application.person_id)}</TableCell>
                                                <TableCell><Chip label={`${application.category} Application`} size="small" color="info" variant="outlined" /></TableCell>
                                                <TableCell>{application.purpose || '-'}</TableCell>
                                                <TableCell>{application.application_date ? new Date(application.application_date).toLocaleDateString() : '-'}</TableCell>
                                                <TableCell><Chip label={application.status || '-'} color={getStatusColor(application.status)} variant="outlined" size="small" /></TableCell>
                                                <TableCell>
                                                    {canUpdate('document_requests') && (
                                                        ['Pending', 'Processing'].includes(application.status) ? (
                                                            <Button
                                                                size="small"
                                                                variant="outlined"
                                                                onClick={() => handleUpdateApplicationStatus(
                                                                    application.application_id,
                                                                    application.status === 'Pending' ? 'Processing' : 'Pending'
                                                                )}
                                                            >
                                                                {application.status === 'Pending' ? 'Start processing' : 'Return to pending'}
                                                            </Button>
                                                        ) : (
                                                            <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>
                                                                Status is automatic
                                                            </Typography>
                                                        )
                                                    )}
                                                    {canDelete('document_requests') && (
                                                        <IconButton size="small" color="error" onClick={() => handleDeleteRequest(application.application_id)} title="Delete application">
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                                <TableRow>
                                                    <TableCell colSpan={7} sx={{ py: 1.5, px: 2.5, bgcolor: '#f8fbfa', borderBottom: '1px solid #dce9e5' }}>
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, gap: 1, flexWrap: 'wrap' }}>
                                                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#123b50' }}>
                                                                Submitted Requirements
                                                            </Typography>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                                {totalRequirements > 0 && (
                                                                    <Chip
                                                                        label={`${approvedRequirements}/${totalRequirements} approved`}
                                                                        size="small"
                                                                        color={approvedRequirements === totalRequirements ? 'success' : 'warning'}
                                                                    />
                                                                )}
                                                                {canCreate('requirement_checklists') && (
                                                                    <Button
                                                                        size="small"
                                                                        variant="outlined"
                                                                        onClick={() => {
                                                                            setRequirementDialog({ open: true, application });
                                                                            setSelectedRequirementIds([]);
                                                                        }}
                                                                    >
                                                                        Record Submitted Requirements
                                                                    </Button>
                                                                )}
                                                            </Box>
                                                        </Box>
                                                        {(missingRequirements.length > 0 || pendingRequirements.length > 0 || rejectedRequirements.length > 0) && (
                                                            <Typography variant="body2" sx={{ mb: 1, color: '#9a3412', fontWeight: 600 }}>
                                                                Notes:{' '}
                                                                {missingRequirements.length > 0 && `Kulang pa: ${missingRequirements.join(', ')}. `}
                                                                {pendingRequirements.length > 0 && `Naghihintay ng approval: ${pendingRequirements.join(', ')}. `}
                                                                {rejectedRequirements.length > 0 && `Kailangang ulitin: ${rejectedRequirements.join(', ')}.`}
                                                            </Typography>
                                                        )}
                                                        {applicationRequirements.length > 0 ? applicationRequirements.map((submission) => (
                                                            <Box key={submission.submission_id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, py: 0.75, borderTop: '1px solid #e5eeeb', flexWrap: 'wrap' }}>
                                                                <Box>
                                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{submission.requirement_name}</Typography>
                                                                    <Typography variant="caption" sx={{ color: '#64748b' }}>{submission.category}</Typography>
                                                                </Box>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                    <Chip label={submission.status} size="small" color={submission.status === 'Approved' ? 'success' : submission.status === 'Rejected' ? 'error' : 'warning'} />
                                                                    {canUpdate('requirement_checklists') && submission.status === 'Submitted' && (
                                                                        <>
                                                                            <Button size="small" variant="contained" color="success" onClick={() => handleReviewRequirement(submission, 'Approved')}>Approve</Button>
                                                                            <Button size="small" variant="outlined" color="error" onClick={() => handleReviewRequirement(submission, 'Rejected')}>Reject</Button>
                                                                        </>
                                                                    )}
                                                                </Box>
                                                            </Box>
                                                        )) : (
                                                            <Typography variant="body2" sx={{ color: '#64748b' }}>No requirements submitted yet.</Typography>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                                </React.Fragment>
                                                );
                                            })}
                                        {filteredSacramentApplications.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={7} sx={{ textAlign: 'center', py: 3, color: '#64748b' }}>
                                                    No applications match your search or filters.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    )}
                    </>
                )}
            </Container>

            <Dialog
                open={requirementDialog.open}
                onClose={() => setRequirementDialog({ open: false, application: null })}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Record Submitted Requirements</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>
                        Select only the documents submitted by {requirementDialog.application?.applicant_name || 'the applicant'} for {requirementDialog.application?.category}.
                    </Typography>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Submitted requirements</InputLabel>
                        <Select
                            multiple
                            value={selectedRequirementIds}
                            label="Submitted requirements"
                            renderValue={(selected) => selected.map((checkId) => {
                                const checklist = requirementChecklists.find((item) => Number(item.check_id) === Number(checkId));
                                return checklist?.requirement_name || checkId;
                            }).join(', ')}
                            onChange={(event) => setSelectedRequirementIds(event.target.value)}
                        >
                            {requirementChecklists
                                .filter((checklist) => String(checklist.category).toLowerCase() === String(requirementDialog.application?.category).toLowerCase())
                                .map((checklist) => {
                                    const existingSubmission = requirementSubmissions.find((submission) =>
                                        Number(submission.person_id) === Number(requirementDialog.application?.person_id) &&
                                        Number(submission.check_id) === Number(checklist.check_id) &&
                                        String(submission.category).toLowerCase() === String(requirementDialog.application?.category).toLowerCase()
                                    );
                                    const alreadySubmitted = existingSubmission && existingSubmission.status !== 'Rejected';
                                    return (
                                    <MenuItem key={checklist.check_id} value={checklist.check_id} disabled={alreadySubmitted}>
                                        <Checkbox checked={alreadySubmitted || selectedRequirementIds.includes(checklist.check_id)} disabled={alreadySubmitted} size="small" />
                                        <ListItemText primary={checklist.requirement_name} />
                                    </MenuItem>
                                    );
                                })}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRequirementDialog({ open: false, application: null })}>Cancel</Button>
                    <Button onClick={handleRecordApplicationRequirements} variant="contained">Save Submission</Button>
                </DialogActions>
            </Dialog>

            {/* Create/Edit Request Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle sx={{ fontWeight: 700, color: '#1e293b' }}>
                    {editingId ? 'Edit Document Request' : 'Create New Document Request'}
                </DialogTitle>
                <DialogContent sx={{ pt: 3, bgcolor: '#f8fafc' }}>
                    <Box sx={{ p: 2.5, borderRadius: 3, border: '1px solid rgba(17, 75, 80, 0.08)', bgcolor: '#ffffff', boxShadow: '0 12px 24px rgba(15, 23, 42, 0.04)' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#123b50', mb: 2 }}>
                            Request Information
                        </Typography>

                        <TextField
                            fullWidth
                            label="Requester Name *"
                            value={formData.requester_name || ''}
                            onChange={(e) => setFormData({ ...formData, requester_name: e.target.value })}
                            margin="normal"
                            required
                            placeholder="Enter the name of the person requesting the document"
                            disabled={isPersonView || isRequestProcessingOnly}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: '#fff' } }}
                        />

                        {isPersonView ? (
                            <TextField
                                fullWidth
                                label="Person"
                                value={getPersonName(user.person_id)}
                                margin="normal"
                                disabled
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: '#fff' } }}
                            />
                        ) : (
                            <FormControl fullWidth margin="normal" required sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: '#fff' } }}>
                                <InputLabel>Person *</InputLabel>
                                <Select
                                    value={formData.person_id}
                                    onChange={(e) => {
                                        if (editingId) return;
                                        const nextPersonId = e.target.value;
                                        setFormData(applyPersonRecordDefaults(nextPersonId, formData.document_type, formData, true));
                                        setVerificationChecklist((prev) => ({
                                            ...prev,
                                            recordExists: getMatchingSacramentRecords(nextPersonId, formData.document_type).length > 0,
                                        }));
                                    }}
                                    label="Person *"
                                    disabled={isRequestProcessingOnly}
                                >
                                    <MenuItem value="">Select a person</MenuItem>
                                    {persons.map((person) => (
                                        <MenuItem key={person.person_id} value={person.person_id}>
                                            {`${person.first_name} ${person.last_name}`}
                                        </MenuItem>
                                    ))}
                                </Select>
                                <FormHelperText>{editingId ? 'This request belongs to the original requestor and cannot be reassigned here.' : 'Select the person the document is for'}</FormHelperText>
                            </FormControl>
                        )}

                        <FormControl fullWidth margin="normal" required sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: '#fff' } }}>
                            <InputLabel>Document Type *</InputLabel>
                            <Select
                                value={formData.document_type}
                                onChange={(e) => {
                                    if (editingId) return;
                                    const nextDocumentType = e.target.value;
                                    setFormData(applyPersonRecordDefaults(formData.person_id, nextDocumentType, { ...formData, document_type: nextDocumentType }));
                                    setVerificationChecklist((prev) => ({
                                        ...prev,
                                        recordExists: getMatchingSacramentRecords(formData.person_id, nextDocumentType).length > 0,
                                    }));
                                }}
                                label="Document Type *"
                                disabled={isRequestProcessingOnly}
                            >
                                <MenuItem value="Baptismal Certificate">Baptismal Certificate</MenuItem>
                                <MenuItem value="Confirmation Certificate">Confirmation Certificate</MenuItem>
                                <MenuItem value="Good Moral">Good Moral</MenuItem>
                                <MenuItem value="Other">Other</MenuItem>
                            </Select>
                            <FormHelperText>{editingId ? 'This document type is locked because it reflects the original request.' : 'Choose the type of document requested'}</FormHelperText>
                        </FormControl>

                    {getMatchingSacramentRecords(formData.person_id, formData.document_type).length > 0 && (
                        <Alert severity="info" sx={{ mt: 1 }}>
                            {isRequestProcessingOnly
                                ? `Existing ${formData.document_type.replace(' Certificate', '').toLowerCase()} record found. This request was submitted with its original details and is locked for parish processing.`
                                : `Existing ${formData.document_type.replace(' Certificate', '').toLowerCase()} record found. The date was filled automatically and can still be edited.`}
                        </Alert>
                    )}

                    {getMatchingSacramentRecords(formData.person_id, formData.document_type).length > 0 && (
                        <FormControl fullWidth margin="normal">
                            <InputLabel>Exact Record</InputLabel>
                            <Select
                                value={formData.record_id || ''}
                                label="Exact Record"
                                onChange={(e) => {
                                    if (isRequestProcessingOnly) return;
                                    const record = getMatchingSacramentRecords(formData.person_id, formData.document_type)
                                        .find((item) => String(item.record_id) === String(e.target.value));
                                    setFormData({
                                        ...formData,
                                        record_type: record?.record_type || '',
                                        record_id: e.target.value,
                                        sacramental_date: record?.record_date || '',
                                    });
                                }}
                                disabled={isRequestProcessingOnly}
                            >
                                {getMatchingSacramentRecords(formData.person_id, formData.document_type).map((record) => (
                                    <MenuItem key={`${record.record_type}-${record.record_id}`} value={record.record_id}>
                                        {record.record_type} #{record.record_id} - {record.record_date}
                                    </MenuItem>
                                ))}
                            </Select>
                            <FormHelperText>Choose the exact parish record for this certificate.</FormHelperText>
                        </FormControl>
                    )}

                        {!isPersonView && <FormControl fullWidth margin="normal" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: '#fff' } }}>
                            <InputLabel>Document Template</InputLabel>
                            <Select
                                value={formData.template_id || ''}
                                onChange={(e) => setFormData({ ...formData, template_id: e.target.value })}
                                label="Document Template"
                                disabled={isRequestProcessingOnly}
                            >
                                <MenuItem value="">No Template Selected</MenuItem>
                                {templates.map((template) => (
                                    <MenuItem key={template.template_id} value={template.template_id}>
                                        {template.doc_type} - {template.description}
                                    </MenuItem>
                                ))}
                            </Select>
                            <FormHelperText>Optional: Select a document template if available</FormHelperText>
                        </FormControl>}

                        <TextField
                            fullWidth
                            label="Purpose"
                            value={formData.purpose}
                            onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                            margin="normal"
                            placeholder="e.g., Educational requirements, Legal proceedings"
                            multiline
                            rows={2}
                            disabled={isRequestProcessingOnly}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: '#fff' } }}
                        />

                        <TextField
                            fullWidth
                            label="Sacramental Date"
                            type="date"
                            value={formData.sacramental_date || ''}
                            onChange={(e) => setFormData({ ...formData, sacramental_date: e.target.value })}
                            margin="normal"
                            InputLabelProps={{ shrink: true }}
                            disabled={isRequestProcessingOnly}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: '#fff' } }}
                        />

                        <TextField
                            fullWidth
                            label="Contact Number"
                            value={formData.contact_number || ''}
                            onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                            margin="normal"
                            placeholder="e.g., 0917-123-4567"
                            disabled={isRequestProcessingOnly}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: '#fff' } }}
                        />

                        {!isPersonView && <Box sx={{ mt: 2, p: 2, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: '#f8fafc' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#123b50' }}>Verification Checklist</Typography>
                            <Box sx={{ display: 'grid', gap: 1 }}>
                                {Object.entries({
                                    recordExists: 'Record exists in parish files/database',
                                    validIdUploaded: 'Valid ID uploaded',
                                    authorizationLetterUploaded: 'Authorization letter uploaded',
                                    purposeVerified: 'Purpose and request details verified',
                                    paymentVerified: 'Payment and due amount verified',
                                }).map(([key, label]) => (
                                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#334155', fontWeight: 500 }}>
                                        <input
                                            type="checkbox"
                                            checked={Boolean(verificationChecklist[key])}
                                            onChange={(e) => setVerificationChecklist((prev) => ({ ...prev, [key]: e.target.checked }))}
                                        />
                                        <span>{label}</span>
                                    </label>
                                ))}
                            </Box>
                        </Box>}

                        {!isPersonView && <TextField
                            fullWidth
                            label="Verification Notes"
                            value={formData.verification_notes || getChecklistSummary(verificationChecklist)}
                            onChange={(e) => setFormData({ ...formData, verification_notes: e.target.value })}
                            margin="normal"
                            placeholder="Parish office notes, verification status, or approval remarks"
                            multiline
                            rows={2}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: '#fff' } }}
                        />}

                        <Box sx={{ mt: 2, p: 2, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: '#f8fafc' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#123b50' }}>Supporting Documents</Typography>

                        {isPersonView ? (
                            <Box sx={{ display: 'grid', gap: 1.25 }}>
                                {existingDocumentFiles.validId.length > 0 && (
                                    <Box sx={{ p: 1.25, borderRadius: 1.5, bgcolor: '#eef7ff', border: '1px solid #bfdbfe' }}>
                                        <Typography variant="body2" sx={{ color: '#1d4ed8', fontWeight: 700 }}>Current Valid ID</Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.75 }}>
                                            {existingDocumentFiles.validId.map((file) => (
                                                <Button
                                                    key={file.file_id}
                                                    component="button"
                                                    type="button"
                                                    onClick={() => openAttachment(file)}
                                                    variant="outlined"
                                                    size="small"
                                                    startIcon={<DownloadIcon />}
                                                    sx={{ borderRadius: 2, textTransform: 'none' }}
                                                >
                                                    {file.file_name}
                                                </Button>
                                            ))}
                                        </Box>
                                    </Box>
                                )}
                                {existingDocumentFiles.authorizationLetter.length > 0 && (
                                    <Box sx={{ p: 1.25, borderRadius: 1.5, bgcolor: '#eef7ff', border: '1px solid #bfdbfe' }}>
                                        <Typography variant="body2" sx={{ color: '#1d4ed8', fontWeight: 700 }}>Current Authorization Letter</Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.75 }}>
                                            {existingDocumentFiles.authorizationLetter.map((file) => (
                                                <Button
                                                    key={file.file_id}
                                                    component="button"
                                                    type="button"
                                                    onClick={() => openAttachment(file)}
                                                    variant="outlined"
                                                    size="small"
                                                    startIcon={<DownloadIcon />}
                                                    sx={{ borderRadius: 2, textTransform: 'none' }}
                                                >
                                                    {file.file_name}
                                                </Button>
                                            ))}
                                        </Box>
                                    </Box>
                                )}
                                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <Typography variant="body2" sx={{ color: '#475569' }}>Upload Valid ID</Typography>
                                    <input type="file" accept="image/*,.pdf" onChange={(e) => setDocumentFiles((prev) => ({ ...prev, validId: e.target.files?.[0] || null }))} />
                                </label>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <Typography variant="body2" sx={{ color: '#475569' }}>Upload Authorization Letter</Typography>
                                    <input type="file" accept="image/*,.pdf" onChange={(e) => setDocumentFiles((prev) => ({ ...prev, authorizationLetter: e.target.files?.[0] || null }))} />
                                </label>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'grid', gap: 1.25 }}>
                                {existingDocumentFiles.validId.length === 0 && existingDocumentFiles.authorizationLetter.length === 0 ? (
                                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                                        No supporting files submitted by the person yet.
                                    </Typography>
                                ) : (
                                    <>
                                        {existingDocumentFiles.validId.length > 0 && (
                                            <Box sx={{ p: 1.25, borderRadius: 1.5, bgcolor: '#eef7ff', border: '1px solid #bfdbfe' }}>
                                                <Typography variant="body2" sx={{ color: '#1d4ed8', fontWeight: 700 }}>Valid ID</Typography>
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.75 }}>
                                                    {existingDocumentFiles.validId.map((file) => (
                                                        <Button
                                                            key={file.file_id}
                                                            component="button"
                                                            type="button"
                                                            onClick={() => openAttachment(file)}
                                                            variant="outlined"
                                                            size="small"
                                                            startIcon={<DownloadIcon />}
                                                            sx={{ borderRadius: 2, textTransform: 'none' }}
                                                        >
                                                            {file.file_name}
                                                        </Button>
                                                    ))}
                                                </Box>
                                            </Box>
                                        )}
                                        {existingDocumentFiles.authorizationLetter.length > 0 && (
                                            <Box sx={{ p: 1.25, borderRadius: 1.5, bgcolor: '#eef7ff', border: '1px solid #bfdbfe' }}>
                                                <Typography variant="body2" sx={{ color: '#1d4ed8', fontWeight: 700 }}>Authorization Letter</Typography>
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.75 }}>
                                                    {existingDocumentFiles.authorizationLetter.map((file) => (
                                                        <Button
                                                            key={file.file_id}
                                                            component="button"
                                                            type="button"
                                                            onClick={() => openAttachment(file)}
                                                            variant="outlined"
                                                            size="small"
                                                            startIcon={<DownloadIcon />}
                                                            sx={{ borderRadius: 2, textTransform: 'none' }}
                                                        >
                                                            {file.file_name}
                                                        </Button>
                                                    ))}
                                                </Box>
                                            </Box>
                                        )}
                                    </>
                                )}
                            </Box>
                        )}
                    </Box>
                    </Box>

                    {!isPersonView && <>
                    {/* Status Section */}
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1e293b', mb: 2 }}>
                        Status & Processing
                    </Typography>

                    <FormControl fullWidth margin="normal">
                        <InputLabel>Request Status</InputLabel>
                        <Select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            label="Request Status"
                        >
                            <MenuItem value="Pending">Pending</MenuItem>
                            <MenuItem value="Processing">Processing</MenuItem>
                            <MenuItem value="Approved">Approved</MenuItem>
                            <MenuItem value="Ready for Pickup">Ready for Pickup</MenuItem>
                            <MenuItem value="Released">Released</MenuItem>
                        </Select>
                        <FormHelperText>Current processing status of the request</FormHelperText>
                    </FormControl>

                    <TextField
                        fullWidth
                        label="Pickup Date"
                        type="date"
                        value={formData.pickup_date || ''}
                        onChange={(e) => setFormData({ ...formData, pickup_date: e.target.value })}
                        margin="normal"
                        InputLabelProps={{ shrink: true }}
                        helperText="Scheduled date when the document can be claimed"
                    />

                    <TextField
                        fullWidth
                        label="Date Released"
                        type="date"
                        value={formData.date_released || ''}
                        onChange={(e) => setFormData({ ...formData, date_released: e.target.value })}
                        margin="normal"
                        InputLabelProps={{ shrink: true }}
                        helperText="Actual date the document was handed to the requester"
                    />
                    </>}

                    {!isPersonView && <>
                    {/* Payment Section */}
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1e293b', mb: 2 }}>
                        Payment Information
                    </Typography>

                    <FormControl fullWidth margin="normal">
                        <InputLabel>Payment Status</InputLabel>
                        <Select
                            value={formData.payment_status}
                            onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                            label="Payment Status"
                        >
                            <MenuItem value="Unpaid">Unpaid</MenuItem>
                            <MenuItem value="Paid">Paid</MenuItem>
                        </Select>
                        <FormHelperText>Payment status of this request</FormHelperText>
                    </FormControl>

                    <FormControl fullWidth margin="normal">
                        <InputLabel>Service Fee</InputLabel>
                        <Select
                            value={formData.fee_id || ''}
                            onChange={(e) => setFormData({ ...formData, fee_id: e.target.value })}
                            label="Service Fee"
                        >
                            <MenuItem value="">No Fee Selected</MenuItem>
                            {fees.map((fee) => (
                                <MenuItem key={fee.fee_id} value={fee.fee_id}>
                                    {`${fee.service_name} - â‚±${parseFloat(fee.amount).toFixed(2)}`}
                                </MenuItem>
                            ))}
                        </Select>
                        <FormHelperText>Select applicable service fee if any</FormHelperText>
                    </FormControl>

                    <TextField
                        fullWidth
                        label="Amount Paid"
                        type="number"
                        value={formData.amount_paid}
                        onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })}
                        margin="normal"
                        inputProps={{ step: '0.01', min: '0' }}
                        placeholder="0.00"
                    />

                    <TextField
                        fullWidth
                        label="Official Receipt (OR) Number"
                        value={formData.or_number || ''}
                        onChange={(e) => setFormData({ ...formData, or_number: e.target.value })}
                        margin="normal"
                        placeholder="e.g., OR-2026-001234"
                    />

                    <FormControl fullWidth margin="normal">
                        <InputLabel>Payment Method</InputLabel>
                        <Select
                            value={formData.payment_method || 'Cash'}
                            onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                            label="Payment Method"
                        >
                            <MenuItem value="Cash">Cash</MenuItem>
                            <MenuItem value="GCash">GCash</MenuItem>
                            <MenuItem value="Check">Check</MenuItem>
                            <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                        </Select>
                        <FormHelperText>How the payment was received</FormHelperText>
                    </FormControl>

                    <TextField
                        fullWidth
                        label="Payment Date"
                        type="date"
                        value={formData.payment_date || ''}
                        onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                        margin="normal"
                        InputLabelProps={{ shrink: true }}
                        helperText="Actual date the person paid at the parish office"
                    />

                    <FormControl fullWidth margin="normal">
                        <InputLabel>Received By (Staff)</InputLabel>
                        <Select
                            value={formData.received_by_user_id || ''}
                            onChange={(e) => setFormData({ ...formData, received_by_user_id: e.target.value })}
                            label="Received By (Staff)"
                        >
                            <MenuItem value="">Select staff member</MenuItem>
                            {users.map((user) => (
                                <MenuItem key={user.user_id} value={user.user_id}>
                                    {user.full_name || user.username}
                                </MenuItem>
                            ))}
                        </Select>
                        <FormHelperText>Which staff member processed this payment</FormHelperText>
                    </FormControl>
                    </>}
                </DialogContent>
                <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid rgba(17, 75, 80, 0.08)' }}>
                    <Button onClick={handleCloseDialog} sx={{ borderRadius: 2, px: 2.5 }}>Cancel</Button>
                    <Button 
                        onClick={handleAddRequest} 
                        variant="contained"
                        sx={{ backgroundColor: '#123b50', '&:hover': { backgroundColor: '#0e2d40' }, borderRadius: 2, px: 3, fontWeight: 700 }}
                    >
                        {editingId ? 'Update Request' : 'Create Request'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Notification Dialog for Approved/Ready for Pickup */}
            <Dialog open={notificationDialog.open} onClose={() => setNotificationDialog({ ...notificationDialog, open: false })} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 'bold', backgroundColor: '#f3f4f6' }}>
                    ðŸ“¬ Send Notification to Parishioner
                </DialogTitle>
                <DialogContent sx={{ py: 3 }}>
                    <Typography variant="body2" sx={{ mb: 2, color: '#666' }}>
                        A system notification has been automatically sent. Would you like to also send an email or SMS?
                    </Typography>
                    
                    <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Notification Type</InputLabel>
                        <Select
                            value={notificationDialog.notificationType}
                            onChange={(e) => setNotificationDialog({ ...notificationDialog, notificationType: e.target.value })}
                            label="Notification Type"
                        >
                            <MenuItem value="InApp">ðŸ”” In-System Only (already sent)</MenuItem>
                            <MenuItem value="Email">ðŸ“§ Email</MenuItem>
                            <MenuItem value="SMS">ðŸ“± SMS</MenuItem>
                            <MenuItem value="All">ðŸ“§ Email + ðŸ“± SMS</MenuItem>
                        </Select>
                    </FormControl>

                    <TextField
                        fullWidth
                        label="Custom Message (optional)"
                        multiline
                        rows={3}
                        value={notificationDialog.customMessage}
                        onChange={(e) => setNotificationDialog({ ...notificationDialog, customMessage: e.target.value })}
                        placeholder="Leave empty to use default message"
                        variant="outlined"
                        helperText="If empty, a default message will be used"
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setNotificationDialog({ ...notificationDialog, open: false })}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={async () => {
                            setNotificationDialog({ ...notificationDialog, sending: true });
                            if (notificationDialog.notificationType === 'All') {
                                await performStatusUpdate(notificationDialog.requestId, notificationDialog.newStatus, 'Email', notificationDialog.customMessage);
                                await performStatusUpdate(notificationDialog.requestId, notificationDialog.newStatus, 'SMS', notificationDialog.customMessage);
                            } else {
                                await performStatusUpdate(notificationDialog.requestId, notificationDialog.newStatus, notificationDialog.notificationType, notificationDialog.customMessage);
                            }
                        }}
                        variant="contained"
                        disabled={notificationDialog.sending}
                        sx={{ backgroundColor: '#10b981', '&:hover': { backgroundColor: '#059669' } }}
                    >
                        {notificationDialog.sending ? 'Sending...' : 'Send & Update Status'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default DocumentRequests;
