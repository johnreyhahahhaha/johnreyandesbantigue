import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Container,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, CameraAlt as CameraAltIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = 'http://165.22.181.147/api';

const DocumentRequestScanner = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const scannerRef = useRef(null);
  const scanHandledRef = useRef(false);
  const [scanning, setScanning] = useState(false);
  const [reference, setReference] = useState('');
  const [request, setRequest] = useState(null);
  const [payment, setPayment] = useState({ amount: '', method: 'Cash', orNumber: '', date: new Date().toISOString().slice(0, 10) });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => () => stopScanner(), []);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (stopError) {
        console.warn('Unable to stop QR scanner cleanly:', stopError);
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const findRequest = async (value) => {
    const cleanReference = value.trim();
    if (!cleanReference) return;
    await stopScanner();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const lookupFields = [
        { reference_number: cleanReference },
        { tracking_number: cleanReference },
      ];

      let foundRequest = null;
      for (const params of lookupFields) {
        const response = await axios.get(`${API_BASE_URL}/document-requests.php`, { params });
        const requestMatch = response.data?.data?.[0];
        if (requestMatch) {
          foundRequest = requestMatch;
          break;
        }
      }

      if (!foundRequest) {
        throw new Error('No document request found for this QR, reference number, or tracking number.');
      }

      setRequest(foundRequest);
      if (foundRequest.status !== 'Ready for Pickup') {
        setMessage(`This request is currently marked as ${foundRequest.status}. It must be marked Ready for Pickup before it can be released.`);
      }
    } catch (err) {
      setRequest(null);
      setError(err.response?.data?.message || err.message || 'Unable to find document request.');
    } finally {
      setLoading(false);
    }
  };

  const startScanner = async () => {
    setError('');
    setMessage('');
    try {
      if (!scannerRef.current) scannerRef.current = new Html5Qrcode('document-request-qr-reader');
      scanHandledRef.current = false;
      setScanning(true);
      await scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          if (scanHandledRef.current) return;
          scanHandledRef.current = true;
          setReference(decodedText);
          await findRequest(decodedText);
        },
        () => {}
      );
    } catch (err) {
      setScanning(false);
      setError(err.name === 'NotAllowedError' || String(err).toLowerCase().includes('permission')
        ? 'Camera permission was denied. Allow camera access, then try again.'
        : 'Unable to start the camera. Check that a camera is connected or use the reference number below.');
    }
  };

  const releaseRequest = async () => {
    if (!request) return;
    if (request.status !== 'Ready for Pickup') {
      setError(`This document is currently ${request.status || 'Pending'} and cannot be released yet. It must be marked Ready for Pickup first.`);
      return;
    }
    const amountPaid = Number(payment.amount);
    if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
      setError('Enter the amount paid before releasing this document.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await axios.put(`${API_BASE_URL}/document-requests.php?id=${request.request_id}`, {
        status: 'Released',
        date_released: new Date().toISOString().slice(0, 10),
        payment_status: 'Paid',
        amount_paid: amountPaid,
        payment_method: payment.method,
        payment_date: payment.date,
        or_number: payment.orNumber,
        received_by_user_id: user?.user_id,
        user_id: user?.user_id,
      });
      if (!response.data?.success) throw new Error(response.data?.message || 'Unable to release request.');
      setRequest({ ...request, status: 'Released', payment_status: 'Paid', amount_paid: amountPaid, or_number: payment.orNumber });
      setMessage('Document marked as released successfully.');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to release document request.');
    } finally {
      setLoading(false);
    }
  };

  if (user?.user_role === 'Person') {
    return <Container sx={{ py: 6 }}><Alert severity="error">This scanner is available to parish staff only.</Alert></Container>;
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Scan Claim QR</Typography>
          <Typography variant="body2" color="text.secondary">Scan the parish claim stub before releasing the document.</Typography>
        </Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/document-requests')}>Back</Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}

      <Card sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: 2, bgcolor: '#0f172a', minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box id="document-request-qr-reader" sx={{ width: '100%', display: scanning ? 'block' : 'none' }} />
          {!scanning && <Stack alignItems="center" spacing={1} sx={{ color: '#fff', p: 4, textAlign: 'center' }}><CameraAltIcon sx={{ fontSize: 48 }} /><Typography>Camera scanner ready</Typography></Stack>}
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
          {!scanning ? <Button variant="contained" startIcon={<CameraAltIcon />} onClick={startScanner}>Start Camera</Button> : <Button variant="outlined" onClick={stopScanner}>Stop Camera</Button>}
          <TextField size="small" fullWidth label="Reference number" value={reference} onChange={(e) => setReference(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && findRequest(reference)} placeholder="e.g. GOODMO-20260826-0033" />
          <Button variant="outlined" onClick={() => findRequest(reference)} disabled={!reference.trim() || loading}>Find</Button>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>If camera access is unavailable, enter the reference number printed below the QR code.</Typography>
      </Card>

      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress /></Box>}
      {request && !loading && (
        <Card sx={{ mt: 3, p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Request Details</Typography>
            <Chip label={request.status} color={request.status === 'Released' ? 'success' : 'info'} />
          </Stack>
          <Typography><strong>Reference:</strong> {request.reference_number}</Typography>
          <Typography><strong>Requester:</strong> {request.requester_name}</Typography>
          <Typography><strong>Document:</strong> {request.document_type}</Typography>
          <Typography><strong>Payment:</strong> {request.payment_status || 'Unpaid'}{request.amount_paid ? ` - PHP ${Number(request.amount_paid).toFixed(2)}` : ''}</Typography>
          {request.status === 'Ready for Pickup' && (
            <Stack spacing={1.5} sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Record Payment Before Release</Typography>
              <TextField
                fullWidth
                required
                size="small"
                label="Amount Paid"
                type="number"
                value={payment.amount}
                onChange={(event) => setPayment({ ...payment, amount: event.target.value })}
                inputProps={{ min: 0.01, step: '0.01' }}
              />
              <TextField
                fullWidth
                select
                size="small"
                label="Payment Method"
                value={payment.method}
                onChange={(event) => setPayment({ ...payment, method: event.target.value })}
                SelectProps={{ native: true }}
              >
                <option value="Cash">Cash</option>
                <option value="GCash">GCash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Check">Check</option>
              </TextField>
              <TextField
                fullWidth
                size="small"
                label="Official Receipt (OR) Number"
                value={payment.orNumber}
                onChange={(event) => setPayment({ ...payment, orNumber: event.target.value })}
              />
              <TextField
                fullWidth
                size="small"
                label="Payment Date"
                type="date"
                value={payment.date}
                onChange={(event) => setPayment({ ...payment, date: event.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
          )}
          <Button fullWidth sx={{ mt: 2 }} variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={releaseRequest} disabled={request.status !== 'Ready for Pickup'}>
            {request.status === 'Released' ? 'Already Released' : request.status === 'Ready for Pickup' ? 'Confirm Release' : 'Not Ready for Release'}
          </Button>
        </Card>
      )}
    </Container>
  );
};

export default DocumentRequestScanner;