import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
    Pagination,
    Typography,
    IconButton,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://165.22.181.147/api';

const AuditLogs = () => {
    const navigate = useNavigate();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [deleteDate, setDeleteDate] = useState('');
    const logsPerPage = 20;

    useEffect(() => {
        fetchLogs(page);
    }, [page]);

    const fetchLogs = async (pageNum) => {
        setLoading(true);
        try {
            const offset = (pageNum - 1) * logsPerPage;
            const response = await axios.get(
                `${API_BASE_URL}/audit-logs.php?limit=${logsPerPage}&offset=${offset}`
            );
            const data = response.data;

            if (data.success) {
                setLogs(data.data);
                setTotalPages(Math.ceil(data.total / logsPerPage));
            } else {
                setError('Failed to fetch logs');
            }
        } catch (err) {
            setError('Error fetching logs: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteLogs = async () => {
        try {
            const response = await axios.delete(`${API_BASE_URL}/audit-logs.php`, {
                data: {
                    before_date: deleteDate,
                },
            });

            const data = response.data;

            if (data.success) {
                setOpenDeleteDialog(false);
                setDeleteDate('');
                setPage(1);
                fetchLogs(1);
            } else {
                setError('Failed to delete logs');
            }
        } catch (err) {
            setError('Error deleting logs: ' + (err.response?.data?.message || err.message));
        }
    };

    if (loading) {
        return <CircularProgress />;
    }

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#edf3f1' }}>
            {/* Header Section */}
            <Box sx={{ py: { xs: 2.5, md: 3 }, background: 'linear-gradient(110deg, #123b50 0%, #0b6b68 70%, #d1a557 155%)', boxShadow: '0 12px 26px rgba(13, 70, 76, 0.14)' }}>
                <Container maxWidth="lg">
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <IconButton onClick={() => navigate('/dashboard')} aria-label="Back to dashboard" sx={{ backgroundColor: 'rgba(255,255,255,0.14)', color: 'white', '&:hover': { backgroundColor: 'rgba(255,255,255,0.24)' } }}><ArrowBackIcon /></IconButton>
                            <Box>
                            <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: '0.12em' }}>
                                System oversight
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 800, color: 'white', mb: 0.5, lineHeight: 1.15 }}>
                                Audit Logs
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.78)' }}>
                                Track system activity and user actions
                            </Typography>
                            </Box>
                        </Box>
                            <Button 
                            variant="outlined" 
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => setOpenDeleteDialog(true)}
                                sx={{ borderColor: 'rgba(255,255,255,0.55)', color: 'white', '&:hover': { borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.1)' } }}
                            >
                            Delete Old Logs
                        </Button>
                    </Box>
                </Container>
            </Box>

            {/* Content Section */}
            <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                <TableContainer component={Paper} sx={{ backgroundColor: '#fff', borderRadius: 3, border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)', overflow: 'auto' }}>
                    <Table sx={{ minWidth: 750 }}>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: '#f1f6f5' }}>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>ID</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>User</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Action</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Table Affected</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Description</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Timestamp</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {logs && logs.length > 0 ? (
                                logs.map((log) => (
                                    <TableRow 
                                        key={log.log_id}
                                        sx={{
                                            '&:nth-of-type(odd)': { backgroundColor: '#f8fafc' },
                                            '&:hover': { backgroundColor: '#f1f5f9' },
                                            transition: 'background-color 0.2s ease'
                                        }}
                                    >
                                        <TableCell>{log.log_id || '-'}</TableCell>
                                        <TableCell>{log.username || '-'}</TableCell>
                                        <TableCell>{log.action_type || '-'}</TableCell>
                                        <TableCell>{log.table_affected || '-'}</TableCell>
                                        <TableCell>{log.description || '-'}</TableCell>
                                        <TableCell>{log.log_timestamp ? new Date(log.log_timestamp).toLocaleString() : '-'}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 3, color: '#64748b' }}>
                                        No logs found
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Pagination 
                        count={totalPages} 
                        page={page} 
                        onChange={(e, value) => setPage(value)} 
                    />
                </Box>
            </Container>

            {/* Delete Logs Dialog */}
            <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Delete Audit Logs</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        This action will delete all audit logs created before the specified date. This cannot be undone.
                    </Alert>
                    <TextField
                        fullWidth
                        label="Delete logs before date"
                        type="date"
                        value={deleteDate}
                        onChange={(e) => setDeleteDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        required
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
                    <Button 
                        onClick={handleDeleteLogs} 
                        variant="contained" 
                        color="error"
                        disabled={!deleteDate}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AuditLogs;
