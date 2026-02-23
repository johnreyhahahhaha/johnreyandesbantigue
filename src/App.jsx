import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import LoginPage from './components/LoginPage';
import DashboardPage from './components/DashboardPage';
import ComingSoon from './components/ComingSoon';
import ProtectedRoute from './components/ProtectedRoute';
import PeopleRecords from './components/PeopleRecords';
import Sacraments from './components/Sacraments';
import Finances from './components/Finances';
import Assets from './components/Assets';
import Schedules from './components/Schedules';
import Community from './components/Community';
import DocumentRequests from './components/DocumentRequests';
import AuditLogs from './components/AuditLogs';
import UserManagement from './components/UserManagement';
import CemeteryRecords from './components/CemeteryRecords';
import FileAttachments from './components/FileAttachments';
import NotificationLogs from './components/NotificationLogs';
import SendNotification from './components/SendNotification';
import ParishConfig from './components/ParishConfig';
import RequirementChecklists from './components/RequirementChecklists';
import SacramentalAnnotations from './components/SacramentalAnnotations';
import { AuthProvider } from './contexts/AuthContext';
import { PermissionProvider } from './contexts/PermissionContext';

// Material UI Theme - Professional Enterprise Design
const theme = createTheme({
  palette: {
    primary: {
      main: '#1e3a8a',
      light: '#3b82f6',
      dark: '#1e40af',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#0f766e',
      light: '#14b8a6',
      dark: '#0d5e55',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
    },
    divider: '#e2e8f0',
    error: {
      main: '#dc2626',
      light: '#ef4444',
    },
    warning: {
      main: '#d97706',
      light: '#f59e0b',
    },
    info: {
      main: '#0284c7',
      light: '#0ea5e9',
    },
    success: {
      main: '#059669',
      light: '#10b981',
    },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Helvetica Neue", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h5: {
      fontSize: '1rem',
      fontWeight: 600,
    },
    h6: {
      fontSize: '0.875rem',
      fontWeight: 600,
    },
    body1: {
      fontSize: '0.95rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    ...Array(24).fill('0 20px 25px -5px rgba(0, 0, 0, 0.1)'),
  ],
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#1e293b',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          borderBottom: '1px solid #e2e8f0',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          },
        },
        outlined: {
          borderColor: '#e2e8f0',
          '&:hover': {
            borderColor: '#cbd5e1',
            backgroundColor: '#f8fafc',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: '#e2e8f0',
          fontSize: '0.875rem',
        },
        head: {
          backgroundColor: '#f1f5f9',
          fontWeight: 600,
          color: '#1e293b',
          borderColor: '#e2e8f0',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:nth-of-type(odd)': {
            backgroundColor: '#f8fafc',
          },
          '&:hover': {
            backgroundColor: '#f1f5f9',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '&:hover fieldset': {
              borderColor: '#cbd5e1',
            },
          },
        },
      },
    },
  },
});

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <PermissionProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/login" replace />} />
            {/* Protected routes */}
            <Route path="/people-records" element={<ProtectedRoute><PeopleRecords /></ProtectedRoute>} />
            <Route path="/sacraments" element={<ProtectedRoute><Sacraments /></ProtectedRoute>} />
            <Route path="/finances" element={<ProtectedRoute><Finances /></ProtectedRoute>} />
            <Route path="/assets" element={<ProtectedRoute><Assets /></ProtectedRoute>} />
            <Route path="/schedules" element={<ProtectedRoute><Schedules /></ProtectedRoute>} />
            <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
            <Route path="/document-requests" element={<ProtectedRoute><DocumentRequests /></ProtectedRoute>} />
            <Route path="/audit-logs" element={<ProtectedRoute><AuditLogs /></ProtectedRoute>} />
            <Route path="/user-management" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
            <Route path="/cemetery-records" element={<ProtectedRoute><CemeteryRecords /></ProtectedRoute>} />
            <Route path="/file-attachments" element={<ProtectedRoute><FileAttachments /></ProtectedRoute>} />
            <Route path="/notification-logs" element={<ProtectedRoute><NotificationLogs /></ProtectedRoute>} />
            <Route path="/send-notification" element={<ProtectedRoute><SendNotification /></ProtectedRoute>} />
            <Route path="/parish-config" element={<ProtectedRoute><ParishConfig /></ProtectedRoute>} />
            <Route path="/requirement-checklists" element={<ProtectedRoute><RequirementChecklists /></ProtectedRoute>} />
            <Route path="/sacramental-annotations" element={<ProtectedRoute><SacramentalAnnotations /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><ComingSoon title="Settings" /></ProtectedRoute>} />
          </Routes>
        </PermissionProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;