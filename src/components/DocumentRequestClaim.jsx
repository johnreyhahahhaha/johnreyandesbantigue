import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
  Chip,
} from '@mui/material';

const API_BASE_URL = 'http://localhost/josephus/st.joseph/public/api';

const buildClaimQrUrl = (referenceNumber) => {
  if (!referenceNumber) return '';
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(referenceNumber)}`;
};

const DocumentRequestClaim = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/document-requests.php`);
        const foundRequest = response.data?.data?.find((item) => String(item.request_id) === String(id));

        if (!foundRequest) {
          throw new Error('Document request not found.');
        }

        setRequest(foundRequest);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Unable to load claim stub.');
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !request) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Alert severity="error">{error || 'Unable to load claim stub.'}</Alert>
        <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate('/document-requests')}>
          Back to Requests
        </Button>
      </Container>
    );
  }

  const qrUrl = buildClaimQrUrl(request.reference_number || request.tracking_number || request.request_id);

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          border: '1px solid #dbeafe',
          borderRadius: 4,
          background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a' }}>
              Parish Document Claim Stub
            </Typography>
            <Typography variant="body2" sx={{ color: '#475569', mt: 0.5 }}>
              Present this stub at the parish office for retrieval.
            </Typography>
          </Box>
          <Chip
            label={request.status || 'Pending'}
            color={request.status === 'Ready for Pickup' || request.status === 'Released' ? 'success' : 'warning'}
            sx={{ fontWeight: 700 }}
          />
        </Stack>

        <Card sx={{ p: 2, borderRadius: 3, border: '1px solid #e2e8f0', mb: 3 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center">
            <Box sx={{ width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', borderRadius: 2, border: '1px solid #e2e8f0' }}>
              {qrUrl ? (
                <Box component="img" src={qrUrl} alt="Document claim QR code" sx={{ width: 180, height: 180 }} />
              ) : (
                <Typography variant="body2" color="text.secondary">No QR available</Typography>
              )}
            </Box>

            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ color: '#475569', letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 700 }}>
                Reference Number
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: '#0f172a' }}>
                {request.reference_number || 'DOC-REQUEST-PENDING'}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Stack spacing={1}>
                <Typography variant="body2"><strong>Tracking No:</strong> {request.tracking_number || 'N/A'}</Typography>
                <Typography variant="body2"><strong>Requester:</strong> {request.requester_name || 'N/A'}</Typography>
                <Typography variant="body2"><strong>Document:</strong> {request.document_type || 'N/A'}</Typography>
                <Typography variant="body2"><strong>Purpose:</strong> {request.purpose || 'Not specified'}</Typography>
                <Typography variant="body2"><strong>Pickup Date:</strong> {request.pickup_date ? new Date(request.pickup_date).toLocaleDateString() : 'To be scheduled'}</Typography>
                <Typography variant="body2"><strong>Amount Due:</strong> â‚±{parseFloat(request.amount_paid || 0).toFixed(2)}</Typography>
                <Typography variant="body2"><strong>Payment Status:</strong> {request.payment_status || 'Unpaid'}</Typography>
              </Stack>
            </Box>
          </Stack>
        </Card>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="body2" sx={{ color: '#475569' }}>
            Please present this QR code and reference number at the parish office counter.
          </Typography>

          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => navigate('/document-requests')}>
              Back to Requests
            </Button>
            <Button variant="contained" onClick={() => window.print()}>
              Print Stub
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
};

export default DocumentRequestClaim;
