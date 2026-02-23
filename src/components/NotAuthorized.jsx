import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const NotAuthorized = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        textAlign: 'center',
      }}
    >
      <Typography variant="h4" color="error" gutterBottom>
        Access Denied
      </Typography>
      <Typography variant="body1" gutterBottom>
        You do not have permission to view this page.
      </Typography>
      <Button
        variant="contained"
        color="primary"
        onClick={() => navigate('/dashboard')}
      >
        Go to Dashboard
      </Button>
    </Box>
  );
};

export default NotAuthorized;