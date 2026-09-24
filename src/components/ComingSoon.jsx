import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const ComingSoon = ({ title = 'Coming Soon' }) => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        p: 4,
      }}
    >
      <Typography variant="h3" sx={{ mb: 2, fontWeight: 700 }}>
        {title}
      </Typography>
      <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary', maxWidth: 560 }}>
        This feature is not yet available, but were working on it. Please check back soon or choose another section from the menu.
      </Typography>
      <Button variant="contained" color="primary" onClick={() => navigate(-1)}>
        Go Back
      </Button>
    </Box>
  );
};

export default ComingSoon;
