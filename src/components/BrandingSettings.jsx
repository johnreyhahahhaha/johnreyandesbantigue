import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Box,
    TextField as MuiTextField,
    CircularProgress,
    Alert,
    Avatar,
    Typography,
    Paper,
    Divider,
} from '@mui/material';
import {
    Upload as UploadIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import { useBranding } from '../contexts/BrandingContext';
import { useAuth } from '../contexts/AuthContext';

const BrandingSettings = ({ open, onClose }) => {
    const { branding, updateBranding, loading } = useBranding();
    const { user } = useAuth();
    // use hostname without Vite port to reach Apache
    const serverPrefix = `${window.location.protocol}//${window.location.hostname}/josephus/st.joseph/public`;
    const [formData, setFormData] = useState({
        parish_name: '',
        parish_address: '',
        parish_logo_file: null,
    });
    const [logoPreview, setLogoPreview] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // Initialize form with current branding
    useEffect(() => {
        if (branding && open) {
            setFormData({
                parish_name: branding.parish_name || '',
                parish_address: branding.parish_address || '',
                parish_logo_file: null,
            });
            setLogoPreview(
                branding.parish_logo ? `${serverPrefix}/uploads/${branding.parish_logo}` : ''
            );
            setSuccessMessage('');
            setErrorMessage('');
        }
    }, [branding, open]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
                setErrorMessage('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed');
                return;
            }

            // Validate file size (5MB)
            if (file.size > 5000000) {
                setErrorMessage('File size exceeds 5MB limit');
                return;
            }

            setFormData(prev => ({
                ...prev,
                parish_logo_file: file
            }));

            // Create preview
            const reader = new FileReader();
            reader.onload = (event) => {
                setLogoPreview(event.target.result);
            };
            reader.readAsDataURL(file);
            setErrorMessage('');
        }
    };

    const handleSubmit = async () => {
        try {
            setErrorMessage('');
            setSuccessMessage('');
            setSubmitting(true);

            const submitData = {
                parish_name: formData.parish_name,
                parish_address: formData.parish_address,
                user_id: user?.user_id,
                parish_logo_file: formData.parish_logo_file,
            };

            const result = await updateBranding(submitData);

            if (result.success) {
                setSuccessMessage(result.message || 'Branding updated successfully!');
                setTimeout(() => {
                    setSuccessMessage('');
                    onClose();
                }, 2000);
            } else {
                setErrorMessage(result.message || 'Failed to update branding');
            }
        } catch (error) {
            setErrorMessage(error.message || 'An error occurred while updating branding');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 2,
                }
            }}
        >
            <DialogTitle sx={{ fontWeight: 700, color: '#1e293b', pb: 1 }}>
                Parish Branding Settings
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ pt: 3 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {successMessage && (
                            <Alert severity="success">{successMessage}</Alert>
                        )}

                        {errorMessage && (
                            <Alert severity="error">{errorMessage}</Alert>
                        )}

                        {/* Parish Name Field */}
                        <TextField
                            fullWidth
                            label="Parish Name"
                            name="parish_name"
                            value={formData.parish_name}
                            onChange={handleInputChange}
                            disabled={submitting}
                            variant="outlined"
                            size="small"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    '&.Mui-focused fieldset': {
                                        borderColor: '#1e40af',
                                    }
                                }
                            }}
                        />

                        {/* Parish Address Field */}
                        <TextField
                            fullWidth
                            label="Parish Address"
                            name="parish_address"
                            value={formData.parish_address}
                            onChange={handleInputChange}
                            disabled={submitting}
                            variant="outlined"
                            size="small"
                            multiline
                            rows={3}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    '&.Mui-focused fieldset': {
                                        borderColor: '#1e40af',
                                    }
                                }
                            }}
                        />

                        {/* Logo Section */}
                        <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: '#1e293b' }}>
                                Parish Logo
                            </Typography>

                            {/* Logo Preview */}
                            <Paper 
                                sx={{ 
                                    p: 2, 
                                    mb: 2, 
                                    display: 'flex', 
                                    justifyContent: 'center', 
                                    border: '1px solid #e2e8f0',
                                    borderRadius: 1,
                                    bgcolor: '#f8fafc'
                                }}
                            >
                                {logoPreview ? (
                                    <Box
                                        component="img"
                                        src={logoPreview}
                                        alt="Parish Logo"
                                        sx={{
                                            maxWidth: '100%',
                                            maxHeight: '150px',
                                            objectFit: 'contain'
                                        }}
                                    />
                                ) : (
                                    <Avatar 
                                        sx={{ 
                                            width: 100, 
                                            height: 100, 
                                            bgcolor: '#e2e8f0',
                                            color: '#64748b'
                                        }}
                                    >
                                        <UploadIcon sx={{ fontSize: 40 }} />
                                    </Avatar>
                                )}
                            </Paper>

                            {/* File Upload Input */}
                            <Button
                                variant="outlined"
                                component="label"
                                fullWidth
                                startIcon={<UploadIcon />}
                                disabled={submitting}
                                sx={{
                                    borderColor: '#cbd5e1',
                                    color: '#1e293b',
                                    '&:hover': {
                                        borderColor: '#1e40af',
                                        bgcolor: '#eff6ff'
                                    }
                                }}
                            >
                                {formData.parish_logo_file ? 'Change Logo' : 'Upload Logo'}
                                <input
                                    accept="image/*"
                                    type="file"
                                    hidden
                                    onChange={handleFileChange}
                                />
                            </Button>

                            <Typography variant="caption" sx={{ color: '#64748b', mt: 1, display: 'block' }}>
                                Supported formats: JPEG, PNG, GIF, WebP (Max 5MB)
                            </Typography>
                        </Box>
                    </Box>
                )}
            </DialogContent>

            <Divider />
            <DialogActions sx={{ p: 2 }}>
                <Button 
                    onClick={onClose}
                    disabled={submitting}
                    sx={{ color: '#64748b' }}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={submitting || !formData.parish_name}
                    sx={{
                        bgcolor: '#1e40af',
                        '&:hover': {
                            bgcolor: '#1e3a8a'
                        }
                    }}
                >
                    {submitting ? <CircularProgress size={24} /> : 'Save Changes'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default BrandingSettings;
