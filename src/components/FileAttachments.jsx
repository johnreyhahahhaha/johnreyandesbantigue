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
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Download as DownloadIcon } from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = 'http://localhost/josephus/st.joseph/public/api';

const FileAttachments = () => {
    const [files, setFiles] = useState([]);
    const [persons, setPersons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [formData, setFormData] = useState({
        record_type: 'Person',
        record_id: '',
        file_name: '',
        person_id: '',
        marriage_id: '',
        baptism_id: '',
        asset_id: '',
    });

    useEffect(() => {
        fetchFiles();
        fetchPersons();
    }, []);

    const fetchFiles = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/file-attachments.php`);
            if (response.data.success) {
                setFiles(response.data.data);
                setError('');
            }
        } catch (err) {
            setError('Error fetching file attachments');
            console.error(err);
        } finally {
            setLoading(false);
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

    const handleOpenDialog = () => {
        setSelectedFile(null);
        setFormData({
            record_type: 'Person',
            record_id: '',
            file_name: '',
            person_id: '',
            marriage_id: '',
            baptism_id: '',
            asset_id: '',
        });
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedFile(null);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setFormData({ ...formData, file_name: file.name });
        }
    };

    const handleAddFile = async () => {
        if (!selectedFile) {
            setError('Please select a file to upload');
            return;
        }

        try {
            const data = new FormData();
            data.append('file', selectedFile);
            data.append('record_type', formData.record_type);
            data.append('record_id', formData.record_id);
            data.append('person_id', formData.person_id);
            data.append('marriage_id', formData.marriage_id);
            data.append('baptism_id', formData.baptism_id);
            data.append('asset_id', formData.asset_id);
            data.append('file_name', formData.file_name);

            const response = await axios.post(`${API_BASE_URL}/file-attachments.php`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                setSuccess('File uploaded successfully');
                fetchFiles();
                handleCloseDialog();
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error uploading file');
        }
    };

    const handleDeleteFile = async (fileId) => {
        if (window.confirm('Are you sure you want to delete this file?')) {
            try {
                const response = await axios.delete(`${API_BASE_URL}/file-attachments.php?id=${fileId}`);
                if (response.data.success) {
                    setSuccess('File deleted successfully');
                    fetchFiles();
                    setTimeout(() => setSuccess(''), 3000);
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Error deleting file');
            }
        }
    };

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress />
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">File Attachments</Typography>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={handleOpenDialog}
                >
                    Upload File
                </Button>
            </Box>

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={4}>
                            <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 1 }}>
                                <Typography color="textSecondary" gutterBottom>
                                    Total Files
                                </Typography>
                                <Typography variant="h5">{files.length}</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <Box sx={{ p: 2, bgcolor: '#f3e5f5', borderRadius: 1 }}>
                                <Typography color="textSecondary" gutterBottom>
                                    Person Records
                                </Typography>
                                <Typography variant="h5">
                                    {files.filter(f => f.record_type === 'Person').length}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <Box sx={{ p: 2, bgcolor: '#e8f5e9', borderRadius: 1 }}>
                                <Typography color="textSecondary" gutterBottom>
                                    Other Records
                                </Typography>
                                <Typography variant="h5">
                                    {files.filter(f => f.record_type !== 'Person').length}
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell><strong>File ID</strong></TableCell>
                            <TableCell><strong>File Name</strong></TableCell>
                            <TableCell><strong>File Path</strong></TableCell>
                            <TableCell><strong>Record Type</strong></TableCell>
                            <TableCell><strong>Person</strong></TableCell>
                            <TableCell><strong>Upload Date</strong></TableCell>
                            <TableCell align="center"><strong>Actions</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {files.length > 0 ? (
                            files.map((file) => (
                                <TableRow key={file.file_id} hover>
                                    <TableCell>{file.file_id}</TableCell>
                                    <TableCell>{file.file_name}</TableCell>
                                    <TableCell>
                                        <a 
                                            href={`http://localhost/josephus/st.joseph/public/${file.file_path}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                color: '#1976d2',
                                                textDecoration: 'none',
                                                cursor: 'pointer',
                                                fontSize: '0.875rem'
                                            }}
                                            onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                            onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                        >
                                            {file.file_path}
                                        </a>
                                    </TableCell>
                                    <TableCell>{file.record_type}</TableCell>
                                    <TableCell>{file.first_name} {file.last_name || 'N/A'}</TableCell>
                                    <TableCell>{new Date(file.upload_date).toLocaleDateString()}</TableCell>
                                    <TableCell align="center">
                                        <IconButton
                                            color="primary"
                                            size="small"
                                            href={`http://localhost/josephus/st.joseph/public/${file.file_path}`}
                                            target="_blank"
                                            title="Download file"
                                        >
                                            <DownloadIcon />
                                        </IconButton>
                                        <IconButton
                                            color="error"
                                            size="small"
                                            onClick={() => handleDeleteFile(file.file_id)}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                    No file attachments found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Upload File</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Record Type</InputLabel>
                        <Select
                            value={formData.record_type}
                            onChange={(e) => setFormData({ 
                                ...formData, 
                                record_type: e.target.value,
                                record_id: '',
                                person_id: '',
                                marriage_id: '',
                                baptism_id: '',
                                asset_id: ''
                            })}
                            label="Record Type"
                        >
                            <MenuItem value="Person">Person</MenuItem>
                            <MenuItem value="Baptismal">Baptismal</MenuItem>
                            <MenuItem value="Marriage">Marriage</MenuItem>
                            <MenuItem value="Asset">Asset</MenuItem>
                            <MenuItem value="Requirement">Requirement</MenuItem>
                        </Select>
                    </FormControl>

                    {formData.record_type === 'Person' && (
                        <TextField
                            fullWidth
                            margin="normal"
                            label="Person ID *"
                            type="number"
                            value={formData.person_id}
                            onChange={(e) => setFormData({ ...formData, person_id: e.target.value, record_id: e.target.value })}
                        />
                    )}

                    {formData.record_type === 'Baptismal' && (
                        <TextField
                            fullWidth
                            margin="normal"
                            label="Baptism ID *"
                            type="number"
                            value={formData.baptism_id}
                            onChange={(e) => setFormData({ ...formData, baptism_id: e.target.value, record_id: e.target.value })}
                        />
                    )}

                    {formData.record_type === 'Marriage' && (
                        <TextField
                            fullWidth
                            margin="normal"
                            label="Marriage ID *"
                            type="number"
                            value={formData.marriage_id}
                            onChange={(e) => setFormData({ ...formData, marriage_id: e.target.value, record_id: e.target.value })}
                        />
                    )}

                    {formData.record_type === 'Asset' && (
                        <TextField
                            fullWidth
                            margin="normal"
                            label="Asset ID *"
                            type="number"
                            value={formData.asset_id}
                            onChange={(e) => setFormData({ ...formData, asset_id: e.target.value, record_id: e.target.value })}
                        />
                    )}

                    {formData.record_type === 'Requirement' && (
                        <TextField
                            fullWidth
                            margin="normal"
                            label="Requirement ID *"
                            type="number"
                            value={formData.record_id}
                            onChange={(e) => setFormData({ ...formData, record_id: e.target.value })}
                        />
                    )}

                    <TextField
                        fullWidth
                        margin="normal"
                        label="File Name"
                        value={formData.file_name}
                        onChange={(e) => setFormData({ ...formData, file_name: e.target.value })}
                        disabled
                    />
                    <Box sx={{ mt: 2, mb: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                            Select File to Upload *
                        </Typography>
                        <input
                            accept="*/*"
                            type="file"
                            onChange={handleFileSelect}
                            style={{ width: '100%' }}
                        />
                        {selectedFile && (
                            <Typography variant="caption" sx={{ color: '#10b981', mt: 1, display: 'block' }}>
                                ✓ {selectedFile.name} selected ({(selectedFile.size / 1024).toFixed(2)} KB)
                            </Typography>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleAddFile} variant="contained" color="primary">
                        Upload
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default FileAttachments;
