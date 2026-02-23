import React from 'react';
import {
    Container,
    Paper,
    Typography,
    Box,
    Button,
} from '@mui/material';
import { Construction as ConstructionIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const ComingSoon = ({ title }) => {
    const navigate = useNavigate();

    return (
        <Container maxWidth="md" sx={{ py: 8 }}>
            <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
                <ConstructionIcon sx={{ fontSize: 80, color: '#667eea', mb: 2 }} />
                <Typography variant="h4" sx={{ mb: 2, fontWeight: 'bold' }}>
                    {title || 'Coming Soon'}
                </Typography>
                <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
                    This feature is currently under development. Please check back later!
                </Typography>
                <Button
                    variant="contained"
                    onClick={() => navigate('/dashboard')}
                    sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    }}
                >
                    Back to Dashboard
                </Button>
            </Paper>
        </Container>
    );
};

export default ComingSoon;
