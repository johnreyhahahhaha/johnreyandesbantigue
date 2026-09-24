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
    Chip,
    Typography,
    IconButton,
    Card,
    CardContent,
    Grid,
    Switch,
    FormControlLabel,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, Preview as PreviewIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import axios from 'axios';

import { usePermission } from '../contexts/PermissionContext';

const API_BASE_URL = 'http://165.22.181.147/api';

const DEFAULT_TEMPLATE_SAMPLES = [
    {
        doc_type: 'Baptismal Certificate',
        description: 'Standard baptism certificate layout for parish printing.',
        template_body: `
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
                        <td colspan="3" style="padding: 10px 10px; border-bottom: 1px solid #222;">{{father_name}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 10px; font-weight: 600;">Mother:</td>
                        <td colspan="3" style="padding: 10px 10px; border-bottom: 1px solid #222;">{{mother_name}}</td>
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
                        <div style="border-top: 1px solid #222; padding-top: 8px; font-weight: 700;">REV. FR. EDGAR D. MORON</div>
                        <div style="font-size: 13px;">Parish Priest</div>
                    </div>
                </div>

                <div style="text-align: center; margin-top: 18px; font-size: 14px;">
                    By: <strong>LUCITA E. BRAZAS</strong><br>
                    Parish Registrar
                </div>
            </div>
        `,
    },
];

const DocumentTemplates = ({ embedded = false }) => {
    const navigate = useNavigate();
    const { canCreate, canUpdate, canDelete } = usePermission();
    const [templates, setTemplates] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [previewDialog, setPreviewDialog] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [previewContent, setPreviewContent] = useState('');
    const [showInactive, setShowInactive] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        doc_type: '',
        template_body: '',
        description: '',
        is_active: 1,
    });

    useEffect(() => {
        fetchAllData();
    }, [showInactive, searchTerm]);

    const createDefaultTemplateSamples = async () => {
        try {
            await Promise.all(
                DEFAULT_TEMPLATE_SAMPLES.map((template) =>
                    axios.post(`${API_BASE_URL}/document-templates.php`, {
                        doc_type: template.doc_type,
                        template_body: template.template_body,
                        description: template.description,
                        is_active: 1,
                    })
                )
            );
            return true;
        } catch (err) {
            console.error('Default template creation failed:', err);
            return false;
        }
    };

    const fetchAllData = async () => {
        try {
            const searchParam = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : '';
            const showAllParam = showInactive ? '&show_all=1' : '';
            
            const [templatesRes, usersRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/document-templates.php?${showAllParam}${searchParam}`),
                axios.get(`${API_BASE_URL}/users.php`),
            ]);

            let templatesData = templatesRes.data.success ? templatesRes.data.data || [] : [];
            const usersData = usersRes.data.success ? usersRes.data.data || [] : [];

            if (!templatesData.length) {
                const created = await createDefaultTemplateSamples();
                if (created) {
                    const refreshedRes = await axios.get(`${API_BASE_URL}/document-templates.php?${showAllParam}${searchParam}`);
                    templatesData = refreshedRes.data.success ? refreshedRes.data.data || [] : [];
                }
            }

            setTemplates(templatesData);
            setUsers(usersData);
            setError('');
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.response?.statusText || err.message;
            setError('Error fetching data: ' + errorMsg);
            console.error('Fetch error:', err);
            setTemplates([]);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const getUserName = (userId) => {
        const user = users.find(u => u.user_id == userId);
        return user ? user.user_name : 'Unknown';
    };

    const handleAddTemplate = async () => {
        if (!formData.doc_type || !formData.template_body) {
            setError('Please fill all required fields: Document Type and Template Body');
            return;
        }

        if (formData.doc_type.trim() === '' || formData.template_body.trim() === '') {
            setError('Document Type and Template Body cannot be empty');
            return;
        }

        try {
            const method = editingId ? 'put' : 'post';
            const endpoint = `${API_BASE_URL}/document-templates.php`;
            
            const payload = {
                doc_type: formData.doc_type,
                template_body: formData.template_body,
                description: formData.description,
                is_active: formData.is_active,
            };

            if (editingId) {
                payload.template_id = editingId;
            }

            const response = await axios[method](endpoint, payload);

            if (response.data.success) {
                setOpenDialog(false);
                setEditingId(null);
                resetForm();
                fetchAllData();
                setSuccess(editingId ? 'Template updated successfully!' : 'Template created successfully!');
                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError('Failed to save template: ' + (response.data.message || 'Unknown error'));
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.response?.statusText || err.message;
            setError('Error saving template: ' + errorMsg);
            console.error('Save error:', err);
        }
    };

    const handleDeleteTemplate = async (templateId) => {
        if (window.confirm('Are you sure you want to delete this template?')) {
            try {
                const response = await axios.delete(`${API_BASE_URL}/document-templates.php`, {
                    data: { template_id: templateId }
                });

                if (response.data.success) {
                    fetchAllData();
                    setSuccess('Template deleted successfully!');
                    setTimeout(() => setSuccess(''), 3000);
                } else {
                    setError('Failed to delete template: ' + (response.data.message || 'Unknown error'));
                }
            } catch (err) {
                const errorMsg = err.response?.data?.message || err.response?.statusText || err.message;
                setError('Error deleting template: ' + errorMsg);
                console.error('Delete error:', err);
            }
        }
    };

    const handleEditTemplate = (template) => {
        setEditingId(template.template_id);
        setFormData({
            doc_type: template.doc_type,
            template_body: template.template_body,
            description: template.description || '',
            is_active: template.is_active,
        });
        setOpenDialog(true);
    };

    const handlePreviewTemplate = (template) => {
        setPreviewContent(template.template_body);
        setPreviewDialog(true);
    };

    const handleLoadSampleTemplate = () => {
        const sample = DEFAULT_TEMPLATE_SAMPLES[0];
        setFormData({
            doc_type: sample.doc_type,
            template_body: sample.template_body,
            description: sample.description,
            is_active: 1,
        });
        setError('');
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingId(null);
        resetForm();
    };

    const resetForm = () => {
        setFormData({
            doc_type: '',
            template_body: '',
            description: '',
            is_active: 1,
        });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSwitchChange = (e) => {
        setFormData(prev => ({
            ...prev,
            is_active: e.target.checked ? 1 : 0
        }));
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    const activeCount = templates.filter(t => t.is_active === 1).length;
    const totalCount = templates.length;

    return (
        <Box sx={{ minHeight: embedded ? 'auto' : '100vh', bgcolor: embedded ? 'transparent' : '#edf3f1' }}>
            {/* Header Section */}
            <Box sx={{ display: embedded ? 'none' : 'block', py: { xs: 2.5, md: 3 }, background: 'linear-gradient(110deg, #123b50 0%, #0b6b68 70%, #d1a557 155%)', boxShadow: '0 12px 26px rgba(13, 70, 76, 0.14)' }}>
                <Container maxWidth="lg">
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <IconButton onClick={() => navigate('/dashboard')} aria-label="Back to dashboard" sx={{ backgroundColor: 'rgba(255,255,255,0.14)', color: 'white', '&:hover': { backgroundColor: 'rgba(255,255,255,0.24)' } }}>
                                <ArrowBackIcon />
                            </IconButton>
                            <Box>
                            <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: '0.12em' }}>
                                Parish documents
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 800, color: 'white', mb: 0.5, lineHeight: 1.15 }}>
                                Document templates
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.78)' }}>
                                Keep parish certificates and forms ready to use.
                            </Typography>
                            </Box>
                        </Box>
                        {canCreate('document_templates') && (
                            <Button 
                                variant="contained" 
                                startIcon={<AddIcon />}
                                onClick={() => setOpenDialog(true)}
                                sx={{
                                    backgroundColor: '#d6a85a',
                                    color: '#123b50',
                                    '&:hover': { backgroundColor: '#e3ba70' },
                                    boxShadow: 'none',
                                }}
                            >
                                New Template
                            </Button>
                        )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                        <TextField
                            placeholder="Search templates..."
                            size="small"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            sx={{ minWidth: '200px', bgcolor: 'white', borderRadius: 1 }}
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={showInactive}
                                    onChange={(e) => setShowInactive(e.target.checked)}
                                />
                            }
                            label="Show Inactive"
                        />
                    </Box>
                </Container>
            </Box>

            {/* Content Section */}
            <Container maxWidth="lg" sx={{ py: embedded ? 0 : { xs: 3, md: 4 }, px: embedded ? 0 : undefined }}>
                {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

                {/* Stats Cards */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ borderTop: '3px solid #168fa3' }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700 }}>
                                    Total Templates
                                </Typography>
                                <Typography variant="h5">
                                    {totalCount}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ borderTop: '3px solid #25a878' }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 700 }}>
                                    Active Templates
                                </Typography>
                                <Typography variant="h5" sx={{ color: '#16a34a' }}>
                                    {activeCount}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {/* Templates Table */}
                <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)', overflow: 'hidden' }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Document Type</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Description</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Created By</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Created At</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#475569', textAlign: 'right' }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {templates.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 3, color: '#64748b' }}>
                                        No templates found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                templates.map(template => (
                                    <TableRow key={template.template_id} hover>
                                        <TableCell sx={{ fontWeight: 500 }}>{template.doc_type}</TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ color: '#64748b', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {template.description || 'N/A'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{template.created_by_name || 'System'}</TableCell>
                                        <TableCell>
                                            {template.created_at ? new Date(template.created_at).toLocaleDateString() : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={template.is_active ? 'Active' : 'Inactive'} 
                                                color={template.is_active ? 'success' : 'default'}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton 
                                                size="small" 
                                                onClick={() => handlePreviewTemplate(template)}
                                                title="Preview"
                                            >
                                                <PreviewIcon fontSize="small" />
                                            </IconButton>
                                            {canUpdate('document_templates') && (
                                                <IconButton 
                                                    size="small" 
                                                    onClick={() => handleEditTemplate(template)}
                                                    title="Edit"
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            )}
                                            {canDelete('document_templates') && (
                                                <IconButton 
                                                    size="small" 
                                                    onClick={() => handleDeleteTemplate(template.template_id)}
                                                    title="Delete"
                                                    sx={{ color: '#ef4444' }}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Container>

            {/* Add/Edit Dialog */}
            <Dialog 
                open={openDialog} 
                onClose={handleCloseDialog}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {editingId ? 'Edit Template' : 'Create New Template'}
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label="Document Type"
                            name="doc_type"
                            value={formData.doc_type}
                            onChange={handleInputChange}
                            fullWidth
                            placeholder="e.g., Baptismal Certificate, Marriage Certificate"
                            required
                        />
                        <TextField
                            label="Description"
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            fullWidth
                            placeholder="Brief description of the template"
                            multiline
                            rows={2}
                        />
                        <TextField
                            label="Template Body (HTML/Text)"
                            name="template_body"
                            value={formData.template_body}
                            onChange={handleInputChange}
                            fullWidth
                            placeholder="Template content..."
                            multiline
                            rows={8}
                            required
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={formData.is_active === 1}
                                    onChange={handleSwitchChange}
                                />
                            }
                            label="Active"
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2, display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                    <Button onClick={handleLoadSampleTemplate} variant="outlined" sx={{ color: '#0f766e', borderColor: '#0f766e' }}>
                        Load Sample Baptism Layout
                    </Button>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button onClick={handleCloseDialog} sx={{ color: '#64748b' }}>
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleAddTemplate} 
                            variant="contained"
                            sx={{
                                backgroundColor: '#1e3a8a',
                                '&:hover': { backgroundColor: '#1e40af' }
                            }}
                        >
                            {editingId ? 'Update' : 'Create'}
                        </Button>
                    </Box>
                </DialogActions>
            </Dialog>

            {/* Preview Dialog */}
            <Dialog 
                open={previewDialog} 
                onClose={() => setPreviewDialog(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 600, color: '#1e293b' }}>
                    Template Preview
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Box 
                        sx={{ 
                            p: 2, 
                            bgcolor: '#f8fafc', 
                            borderRadius: '4px',
                            border: '1px solid #e2e8f0',
                            minHeight: '300px',
                            '& *': { maxWidth: '100%' }
                        }}
                        dangerouslySetInnerHTML={{ __html: previewContent }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setPreviewDialog(false)} variant="contained">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default DocumentTemplates;
