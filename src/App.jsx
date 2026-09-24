import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import LoginPage from './components/LoginPage';
import DashboardPage from './components/DashboardPage';
import PersonDashboard from './components/PersonDashboard';
import MyRecords from './components/MyRecords';
import ProfilePage from './components/ProfilePage';
import ComingSoon from './components/ComingSoon';
import ProtectedRoute from './components/ProtectedRoute';
import PeopleRecords from './components/PeopleRecords';
import Sacraments from './components/Sacraments';
import Finances from './components/Finances';
import Assets from './components/Assets';
import Schedules from './components/Schedules';
import Community from './components/Community';
import Livestreams from './components/Livestreams';
import WatchLivestream from './components/WatchLivestream';
import DocumentRequests from './components/DocumentRequests';
import DocumentRequestClaim from './components/DocumentRequestClaim';
import DocumentRequestScanner from './components/DocumentRequestScanner';
import AuditLogs from './components/AuditLogs';
import UserManagement from './components/UserManagement';
import CemeteryRecords from './components/CemeteryRecords';
import FileAttachments from './components/FileAttachments';
import NotificationLogs from './components/NotificationLogs';
import SendNotification from './components/SendNotification';
import ParishConfig from './components/ParishConfig';
import RequirementChecklists from './components/RequirementChecklists';
import SacramentalAnnotations from './components/SacramentalAnnotations';
import Chat from './components/Chat';
import Announcements from './components/Announcements';
import Households from './components/Households';
import SeminarTypes from './components/SeminarTypes';
import SeminarAttendance from './components/SeminarAttendance';
import AccountingCategories from './components/AccountingCategories';
import Godparents from './components/Godparents';
import Ministries from './components/Ministries';
import BrandingSettings from './components/BrandingSettings';
import Program from './components/Program';
import { AuthProvider } from './contexts/AuthContext';
import { PermissionProvider } from './contexts/PermissionContext';
import { BrandingProvider } from './contexts/BrandingContext';

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
          border: '1px solid rgba(17, 75, 80, 0.1)',
          borderRadius: 12,
          boxShadow: '0 5px 16px rgba(26, 67, 74, 0.06)',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        contained: {
          borderRadius: 8,
          fontWeight: 700,
          boxShadow: '0 5px 12px rgba(30, 58, 138, 0.14)',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          },
        },
        outlined: {
          borderColor: '#e2e8f0',
          borderRadius: 8,
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
          backgroundColor: '#edf5f2',
          fontWeight: 600,
          color: '#123b50',
          borderColor: '#dce9e5',
          textTransform: 'uppercase',
          fontSize: '0.72rem',
          letterSpacing: '0.06em',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:nth-of-type(odd)': {
            backgroundColor: '#fbfdfc',
          },
          '&:hover': {
            backgroundColor: '#f0f7f4',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 6,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: '#ffffff',
            '&:hover fieldset': {
              borderColor: '#7aa9a0',
            },
            '&.Mui-focused': {
              boxShadow: '0 0 0 3px rgba(11, 107, 104, 0.1)',
            },
          },
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid rgba(17, 75, 80, 0.1)',
          boxShadow: '0 7px 20px rgba(26, 67, 74, 0.06)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          color: '#123b50',
          fontWeight: 800,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: '#0b6b68',
          height: 3,
          borderRadius: 3,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          color: '#718784',
          fontWeight: 700,
          '&.Mui-selected': { color: '#0b6b68' },
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
        <BrandingProvider>
          <PermissionProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/watch/:id" element={<WatchLivestream />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/person-dashboard"
              element={
                <ProtectedRoute>
                  <PersonDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-records"
              element={
                <ProtectedRoute>
                  <MyRecords />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/login" replace />} />
            {/* Protected routes */}
            <Route path="/people-records" element={<ProtectedRoute><PeopleRecords /></ProtectedRoute>} />
            <Route path="/sacraments" element={<ProtectedRoute><Sacraments /></ProtectedRoute>} />
            <Route path="/finances" element={<ProtectedRoute><Finances /></ProtectedRoute>} />
            <Route path="/mass-intentions" element={<ProtectedRoute><Finances /></ProtectedRoute>} />
            <Route path="/assets" element={<ProtectedRoute><Assets /></ProtectedRoute>} />
            <Route path="/schedules" element={<ProtectedRoute><Schedules /></ProtectedRoute>} />
            <Route path="/livestreams" element={<ProtectedRoute><Livestreams /></ProtectedRoute>} />
            <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
            <Route path="/document-requests" element={<ProtectedRoute><DocumentRequests /></ProtectedRoute>} />
            <Route path="/document-requests/:id" element={<ProtectedRoute><DocumentRequests /></ProtectedRoute>} />
            <Route path="/document-requests/claim/:id" element={<ProtectedRoute><DocumentRequestClaim /></ProtectedRoute>} />
            <Route path="/document-requests/scanner" element={<ProtectedRoute><DocumentRequestScanner /></ProtectedRoute>} />
            <Route path="/audit-logs" element={<ProtectedRoute><AuditLogs /></ProtectedRoute>} />
            <Route path="/user-management" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
            <Route path="/cemetery-records" element={<ProtectedRoute><CemeteryRecords /></ProtectedRoute>} />
            <Route path="/file-attachments" element={<ProtectedRoute><FileAttachments /></ProtectedRoute>} />
            <Route path="/notification-logs" element={<ProtectedRoute><NotificationLogs /></ProtectedRoute>} />
            <Route path="/send-notification" element={<ProtectedRoute><SendNotification /></ProtectedRoute>} />
            <Route path="/parish-config" element={<ProtectedRoute><ParishConfig /></ProtectedRoute>} />
            <Route path="/requirement-checklists" element={<ProtectedRoute><RequirementChecklists /></ProtectedRoute>} />
            <Route path="/sacramental-annotations" element={<ProtectedRoute><SacramentalAnnotations /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/announcements" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
            <Route path="/households" element={<ProtectedRoute><Households /></ProtectedRoute>} />
            <Route path="/seminar-types" element={<ProtectedRoute><SeminarTypes /></ProtectedRoute>} />
            <Route path="/seminar-attendance" element={<ProtectedRoute><SeminarAttendance /></ProtectedRoute>} />
            <Route path="/accounting-categories" element={<ProtectedRoute><AccountingCategories /></ProtectedRoute>} />
            <Route path="/godparents" element={<ProtectedRoute><Godparents /></ProtectedRoute>} />
            <Route path="/ministries" element={<ProtectedRoute><Ministries /></ProtectedRoute>} />
            <Route path="/branding-settings" element={<ProtectedRoute adminOnly><BrandingSettings /></ProtectedRoute>} />
            <Route path="/document-templates" element={<Navigate to="/document-requests" replace />} />
            <Route path="/programs" element={<ProtectedRoute><Program /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><ComingSoon title="Settings" /></ProtectedRoute>} />
          </Routes>
        </PermissionProvider>
        </BrandingProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;