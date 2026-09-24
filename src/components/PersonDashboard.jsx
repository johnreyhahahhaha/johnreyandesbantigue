import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { Box, Typography, Paper, Button, Grid, CircularProgress, Chip, Stack, Divider, Dialog, DialogTitle, DialogContent, DialogActions, LinearProgress, Tooltip, TextField, IconButton } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import ChurchIcon from '@mui/icons-material/Church';
import FavoriteIcon from '@mui/icons-material/Favorite';
import EventNoteIcon from '@mui/icons-material/EventNote';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import HistoryIcon from '@mui/icons-material/History';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import PersonIcon from '@mui/icons-material/Person';
import DownloadIcon from '@mui/icons-material/Download';
import SettingsIcon from '@mui/icons-material/Settings';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAuth } from '../contexts/AuthContext';
import { livestreamAPI, livestreamAccessAPI, documentAPI, chatAPI, financeAPI, notificationAPI, communityAPI, eventAttendanceAPI } from '../api/apiClient';
import NotificationBell from './NotificationBell';
import MonthCalendar from './MonthCalendar';
import LivestreamChat from './LivestreamChat';

const API_BASE = `http://165.22.181.147/api`;
const EMPTY_STATE_IMAGE = `${window.location.protocol}//${window.location.hostname}/josephus/st.joseph/public/icon-192x192.png`;
const REQUIREMENT_CATALOG = {
    Baptism: [
        'Birth Certificate / PSA Certificate',
        'Parents\' Marriage Certificate',
        'List of Godparents',
        'Godparents\' Valid IDs',
        'Baptismal Seminar',
        'Parish Clearance',
    ],
    Marriage: [
        'Baptismal Certificate',
        'Confirmation Certificate',
        'Birth Certificate / PSA Certificate',
        'CENOMAR',
        'Marriage License',
        'Marriage Preparation Seminar',
        'Marriage Banns',
        'Valid IDs',
        'List of Witnesses',
    ],
    Confirmation: [
        'Baptismal Certificate',
        'Confirmation Seminar',
        'Sponsor / Godparent Information',
        'Sponsor / Godparent Valid ID',
        'Valid ID',
        'Parish Clearance',
    ],
};

const DetailCard = ({ title, subtitle, children, compact = false }) => (
    <Paper
        elevation={1}
        sx={{
            p: { xs: 2.25, md: 3 },
            width: '100%',
            borderRadius: 2.5,
            border: '1px solid rgba(17, 75, 80, 0.08)',
            bgcolor: '#ffffff',
            background: 'linear-gradient(180deg, #ffffff 0%, #f7fbfb 100%)',
            boxShadow: '0 14px 28px rgba(18, 59, 80, 0.06)',
            transition: 'transform 0.18s ease, box-shadow 0.18s ease',
            '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: '0 18px 30px rgba(18, 59, 80, 0.08)',
            },
        }}
    >
        <Typography
            variant="h6"
            sx={{
                fontWeight: 800,
                color: '#123b50',
                mb: subtitle ? 0.5 : 1,
                whiteSpace: compact ? 'nowrap' : 'normal',
                overflow: compact ? 'hidden' : 'visible',
                textOverflow: compact ? 'ellipsis' : 'clip',
            }}
        >
            {title}
        </Typography>
        {subtitle && (
            <Typography
                variant="body2"
                sx={{
                    color: '#5e7480',
                    mb: 2,
                    whiteSpace: compact ? 'nowrap' : 'normal',
                    overflow: compact ? 'hidden' : 'visible',
                    textOverflow: compact ? 'ellipsis' : 'clip',
                }}
            >
                {subtitle}
            </Typography>
        )}
        <Box sx={{ display: 'grid', gap: 1.5 }}>{children}</Box>
    </Paper>
);

const ActivityItem = ({ icon, title, subtitle, date, onClick }) => (
    <Paper elevation={0} role="button" tabIndex={0} aria-label={title} onClick={onClick} sx={{ p: 2, borderRadius: 3, border: '1px solid rgba(18, 59, 80, 0.08)', bgcolor: '#f8fbfb', background: 'linear-gradient(180deg, #f8fbfb 0%, #eef8f7 100%)', cursor: onClick ? 'pointer' : 'default', transition: 'all 0.18s ease', '&:hover': onClick ? { transform: 'translateY(-2px)', boxShadow: '0 8px 16px rgba(18, 59, 80, 0.08)' } : {} }}>
        <Stack direction="row" alignItems="flex-start" spacing={2}>
            <Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: '#dff7f4', display: 'grid', placeItems: 'center', color: '#0b6b68' }}>
                {icon}
            </Box>
            <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#123b50' }}>{title}</Typography>
                <Typography variant="body2" sx={{ color: '#4d6871', mt: 0.5 }}>{subtitle}</Typography>
            </Box>
            <Stack direction="column" alignItems="flex-end" spacing={0.5}>
                <Typography variant="caption" sx={{ color: '#6b838a', whiteSpace: 'nowrap' }}>{date}</Typography>
                {onClick && <ExpandMoreIcon sx={{ fontSize: 20, color: '#6b838a' }} />}
            </Stack>
        </Stack>
    </Paper>
);

const PersonDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [person, setPerson] = useState(null);
    const [baptisms, setBaptisms] = useState([]);
    const [confirmations, setConfirmations] = useState([]);
    const [communions, setCommunions] = useState([]);
    const [burials, setBurials] = useState([]);
    const [marriageRecord, setMarriageRecord] = useState(null);
    const [personNames, setPersonNames] = useState({});
    const [documentRequests, setDocumentRequests] = useState([]);
    const [requestSummary, setRequestSummary] = useState({ total: 0, readyCount: 0, pendingCount: 0 });
    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [liveEvents, setLiveEvents] = useState([]);
    const [liveLoading, setLiveLoading] = useState(true);
    const [systemMessages, setSystemMessages] = useState([]);
    const [sysMsgLoading, setSysMsgLoading] = useState(true);
    
    // New feature states
    const [donations, setDonations] = useState([]);
    const [donationsLoading, setDonationsLoading] = useState(false);
    const [ministries, setMinistries] = useState([]);
    const [volunteers, setVolunteers] = useState([]);
    const [ministriesLoading, setMinistriesLoading] = useState(false);
    const [massIntentions, setMassIntentions] = useState([]);
    const [massIntentionsLoading, setMassIntentionsLoading] = useState(false);
    const [notificationHistory, setNotificationHistory] = useState([]);
    const [notificationsLoading, setNotificationsLoading] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [expandedModal, setExpandedModal] = useState(false);
    const [requirementsModalOpen, setRequirementsModalOpen] = useState(false);
    const [requirementConfirmationOpen, setRequirementConfirmationOpen] = useState(false);
    const [selectedRequirement, setSelectedRequirement] = useState(null);
    const [applicationPurpose, setApplicationPurpose] = useState('');
    const [applicationSubmitting, setApplicationSubmitting] = useState(false);
    const [eventRsvpStatus, setEventRsvpStatus] = useState({});
    const [profileCompleteness, setProfileCompleteness] = useState(0);
    const [requirements, setRequirements] = useState([]);
    const [sacramentApplications, setSacramentApplications] = useState([]);

    useEffect(() => {
        const load = async () => {
            if (!user?.person_id) {
                setLoading(false);
                return;
            }

            try {
                const pid = user.person_id;
                const endpoints = [
                    fetch(`${API_BASE}/persons.php?person_id=${pid}`),
                    fetch(`${API_BASE}/sacraments.php?person_id=${pid}&type=baptismal`),
                    fetch(`${API_BASE}/sacraments.php?person_id=${pid}&type=confirmation`),
                    fetch(`${API_BASE}/sacraments.php?person_id=${pid}&type=communion`),
                    fetch(`${API_BASE}/sacraments.php?person_id=${pid}&type=burial`),
                    fetch(`${API_BASE}/marriage-records.php?person_id=${pid}`),
                    fetch(`${API_BASE}/schedules.php`),
                    fetch(`${API_BASE}/announcements.php`),
                ];

                const responses = await Promise.all(endpoints);

                const parseResponse = async (res) => {
                    const text = await res.text();
                    if (!res.ok) {
                        const errorMessage = text ? text : res.statusText;
                        throw new Error(`Request failed (${res.url}): ${res.status} ${errorMessage}`);
                    }
                    if (!text) {
                        return null;
                    }
                    try {
                        return JSON.parse(text);
                    } catch (parseError) {
                        throw new Error(`Invalid JSON from ${res.url}: ${parseError.message}`);
                    }
                };

                const [pData, baptismData, confirmationData, communionData, burialData, marriageData, schedulesData, announcementsData] = await Promise.all(
                    responses.map(parseResponse)
                );

                const personInfo = pData.success && Array.isArray(pData.data) && pData.data.length > 0 ? pData.data[0] : null;
                setPerson(personInfo || {
                    first_name: user.full_name || '',
                    last_name: '',
                    email: user.email || '',
                });

                const baptismRecords = baptismData.success ? baptismData.data || [] : [];
                const confirmationRecords = confirmationData.success ? confirmationData.data || [] : [];
                const communionRecords = communionData.success ? communionData.data || [] : [];
                const burialRecords = burialData.success ? burialData.data || [] : [];
                const marriage = marriageData.success && Array.isArray(marriageData.data) && marriageData.data.length > 0 ? marriageData.data[0] : null;
                const schedules = schedulesData && schedulesData.success ? schedulesData.data || [] : [];
                const announcementData = announcementsData && announcementsData.success ? announcementsData.data || [] : [];

                const upcoming = schedules
                    .filter((schedule) => {
                        const start = schedule.start_datetime ? new Date(schedule.start_datetime) : null;
                        const relatedToPerson = !schedule.related_record_id || [
                            ...baptismRecords.map((record) => `${schedule.related_record_type}:${schedule.related_record_id}` === `Baptismal:${record.baptism_id}`),
                            ...confirmationRecords.map((record) => `${schedule.related_record_type}:${schedule.related_record_id}` === `Confirmation:${record.confirmation_id}`),
                            ...(marriage ? [`${schedule.related_record_type}:${schedule.related_record_id}` === `Marriage:${marriage.marriage_id}`] : []),
                            ...communionRecords.map((record) => `${schedule.related_record_type}:${schedule.related_record_id}` === `Communion:${record.communion_id}`),
                            ...burialRecords.map((record) => `${schedule.related_record_type}:${schedule.related_record_id}` === `Burial:${record.burial_id}`),
                        ].some(Boolean);
                        return start && start >= new Date() && relatedToPerson;
                    })
                    .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

                setUpcomingEvents(upcoming);
                setAnnouncements(
                    announcementData
                        .filter((item) => item.status === 'Active')
                        .sort((a, b) => new Date(b.created_at || b.updated_at || 0) - new Date(a.created_at || a.updated_at || 0))
                );

                setBaptisms(baptismRecords);

                setConfirmations(confirmationRecords);
                setCommunions(communionRecords);
                setBurials(burialRecords);
                setMarriageRecord(marriage);

                // Resolve related person names for parents, priests, and spouse
                const idsToLoad = new Set();
                baptismRecords.forEach((record) => {
                    if (record.father_id) idsToLoad.add(record.father_id);
                    if (record.mother_id) idsToLoad.add(record.mother_id);
                });
                if (marriage?.priest_id) idsToLoad.add(marriage.priest_id);
                if (marriage?.groom_id) idsToLoad.add(marriage.groom_id);
                if (marriage?.bride_id) idsToLoad.add(marriage.bride_id);

                if (idsToLoad.size > 0) {
                    const resolvedNames = {};
                    await Promise.all(Array.from(idsToLoad).map(async (relatedId) => {
                        try {
                            const res = await fetch(`${API_BASE}/persons.php?person_id=${relatedId}`);
                            if (!res.ok) return;
                            const data = await res.json();
                            if (data.success && Array.isArray(data.data) && data.data.length > 0) {
                                const personItem = data.data[0];
                                resolvedNames[relatedId] = `${personItem.first_name || ''} ${personItem.last_name || ''}`.trim();
                            }
                        } catch (err) {
                            console.error(`Failed to resolve name for person_id=${relatedId}`, err);
                        }
                    }));
                    setPersonNames(resolvedNames);
                }

                // Fetch user document requests and compute summary
                try {
                    const docsRes = await documentAPI.getAllRequests({ person_id: pid });
                    const requests = docsRes.data && docsRes.data.success ? docsRes.data.data || [] : [];
                    setDocumentRequests(requests);
                    const readyCount = requests.filter((req) => req.status === 'Ready for Pickup').length;
                    const pendingCount = requests.filter((req) => ['Pending', 'Processing'].includes(req.status)).length;
                    setRequestSummary({ total: requests.length, readyCount, pendingCount });
                } catch (err) {
                    console.error('Failed to fetch document requests', err);
                    setDocumentRequests([]);
                    setRequestSummary({ total: 0, readyCount: 0, pendingCount: 0 });
                }

                try {
                    const applicationsRes = await fetch(`${API_BASE}/sacrament-applications.php?person_id=${pid}`);
                    const applicationsData = applicationsRes.ok ? await applicationsRes.json() : { success: false, data: [] };
                    setSacramentApplications(applicationsData.success ? applicationsData.data || [] : []);
                } catch (err) {
                    console.error('Failed to fetch sacrament applications', err);
                    setSacramentApplications([]);
                }

                // Fetch live livestream events (non-blocking)
                (async () => {
                    try {
                        setLiveLoading(true);
                        const [livestreamRes, accessRes] = await Promise.all([
                            livestreamAPI.getAll(),
                            livestreamAccessAPI.getAll(),
                        ]);
                        const all = livestreamRes.data && livestreamRes.data.success ? livestreamRes.data.data || [] : [];
                        const accessRows = accessRes.data && accessRes.data.success ? accessRes.data.data || [] : [];
                        const accessByLivestream = new Map(accessRows.map((row) => [String(row.livestream_id), row]));
                        const live = all.filter((event) => {
                            if (event.status !== 'Live') return false;
                            const access = accessByLivestream.get(String(event.livestream_id));
                            return !access || access.access_type === 'Public' || Number(access.allow_guest_viewers) === 1;
                        });
                        setLiveEvents(live);
                    } catch (err) {
                        console.error('Failed to fetch live events', err);
                        setLiveEvents([]);
                    } finally {
                        setLiveLoading(false);
                    }
                })();
                // Fetch system messages (Admin -> All)
                (async () => {
                    try {
                        setSysMsgLoading(true);
                        const res = await chatAPI.getMessages({ room: 'All' });
                        if (res.data && res.data.success) {
                            setSystemMessages(res.data.data || []);
                        } else {
                            setSystemMessages([]);
                        }
                    } catch (err) {
                        console.error('Failed to fetch system messages', err);
                        setSystemMessages([]);
                    } finally {
                        setSysMsgLoading(false);
                    }
                })();
            } catch (err) {
                console.error('Failed to load person dashboard data', err);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [user]);

    useEffect(() => {
        const fetchPersonalParticipation = async () => {
            if (!user?.person_id) return;
            try {
                const [requirementRes, submissionRes] = await Promise.all([
                    fetch(`${API_BASE}/requirement-checklists.php`),
                    fetch(`${API_BASE}/requirement-submissions.php?person_id=${user.person_id}`),
                ]);
                const parse = async (response) => response.ok ? response.json() : { success: false, data: [] };
                const [checklist, submissions] = await Promise.all([
                    parse(requirementRes), parse(submissionRes),
                ]);
                const submissionsByCheck = new Map((submissions.data || []).map((item) => [String(item.check_id), item]));
                setRequirements((checklist.data || []).map((item) => ({
                    ...item,
                    submission: submissionsByCheck.get(String(item.check_id)) || null,
                })));
            } catch (err) {
                console.error('Failed to fetch personal participation records', err);
                setRequirements([]);
            }
        };
        fetchPersonalParticipation();
    }, [user, baptisms, confirmations, marriageRecord]);

    // Fetch donations data
    useEffect(() => {
        const fetchDonations = async () => {
            if (!user?.person_id) return;
            try {
                setDonationsLoading(true);
                const res = await financeAPI.getDonations();
                const allDonations = res.data?.success ? res.data.data || [] : [];
                
                // Filter donations for the current user
                // Check both person_id match and also by first/last name if available
                const userDonations = allDonations.filter((d) => {
                    // Match by person_id if available
                    if (d.person_id && Number(d.person_id) === Number(user.person_id)) {
                        return true;
                    }
                    // Also match by name if person names match
                    if (person && d.first_name && d.last_name) {
                        const donorName = `${d.first_name} ${d.last_name}`.toLowerCase().trim();
                        const personName = `${person.first_name} ${person.last_name}`.toLowerCase().trim();
                        if (donorName === personName) {
                            return true;
                        }
                    }
                    return false;
                });
                
                setDonations(userDonations.sort((a, b) => new Date(b.date_received || 0) - new Date(a.date_received || 0)));
            } catch (err) {
                console.error('Failed to fetch donations', err);
                setDonations([]);
            } finally {
                setDonationsLoading(false);
            }
        };
        fetchDonations();
    }, [user, person]);

    // Fetch ministries and volunteer info
    useEffect(() => {
        const fetchMinistryData = async () => {
            if (!user?.person_id) return;
            try {
                setMinistriesLoading(true);
                const miniRes = await communityAPI.getMinistries();
                const allMinistries = miniRes.data?.success ? miniRes.data.data || [] : [];
                setMinistries(allMinistries);

                const volRes = await communityAPI.getVolunteers();
                const allVols = volRes.data?.success ? volRes.data.data || [] : [];
                const userVols = allVols.filter((v) => Number(v.person_id) === Number(user.person_id));
                setVolunteers(userVols);
            } catch (err) {
                console.error('Failed to fetch ministry data', err);
            } finally {
                setMinistriesLoading(false);
            }
        };
        fetchMinistryData();
    }, [user]);

    // Fetch mass intentions
    useEffect(() => {
        const fetchMassIntentions = async () => {
            if (!user?.person_id) return;
            try {
                setMassIntentionsLoading(true);
                const res = await financeAPI.getMassIntentions();
                const allIntentions = res.data?.success ? res.data.data || [] : [];
                // Filter for current user
                const userIntentions = allIntentions.filter((m) => Number(m.person_id) === Number(user.person_id));
                setMassIntentions(userIntentions.sort((a, b) => new Date(b.mass_date || 0) - new Date(a.mass_date || 0)));
            } catch (err) {
                console.error('Failed to fetch mass intentions', err);
                setMassIntentions([]);
            } finally {
                setMassIntentionsLoading(false);
            }
        };
        fetchMassIntentions();
    }, [user]);

    // Fetch notification history
    useEffect(() => {
        const fetchNotifications = async () => {
            if (!user?.person_id) return;
            try {
                setNotificationsLoading(true);
                const res = await notificationAPI.fetchNotifications(user.person_id, { limit: 20 });
                setNotificationHistory(res.data?.data || []);
            } catch (err) {
                console.error('Failed to fetch notification history', err);
                setNotificationHistory([]);
            } finally {
                setNotificationsLoading(false);
            }
        };
        fetchNotifications();
    }, [user]);

    // Fetch user's RSVP/attendance data
    useEffect(() => {
        const fetchRsvpData = async () => {
            if (!user?.person_id) return;
            try {
                const res = await eventAttendanceAPI.getAttendance({ person_id: user.person_id });
                if (res.data?.success) {
                    const rsvpMap = {};
                    res.data.data?.forEach((attendance) => {
                        const statusKey = attendance.status === 'attending' ? 'yes' : 'no';
                        rsvpMap[attendance.schedule_id] = statusKey;
                    });
                    setEventRsvpStatus(rsvpMap);
                }
            } catch (err) {
                console.error('Failed to fetch RSVP data', err);
            }
        };
        fetchRsvpData();
    }, [user]);

    // Calculate profile completeness
    useEffect(() => {
        if (!person) return;
        let completeness = 0;
        
        // Check for first_name
        if (person.first_name && String(person.first_name).trim() !== '') {
            completeness += 16.67;
        }
        
        // Check for last_name
        if (person.last_name && String(person.last_name).trim() !== '') {
            completeness += 16.67;
        }
        
        // Check for email
        if (person.email && String(person.email).trim() !== '') {
            completeness += 16.67;
        }
        
        // Check for phone_number (try variations: contact_no, phone_number, phone, phone_no, contact_number, telephone, mobile)
        const phoneValue = person.contact_no || person.phone_number || person.phone || person.phone_no || person.mobile || person.contact_number || person.telephone || person.cellular;
        if (phoneValue && String(phoneValue).trim() !== '') {
            completeness += 16.67;
        }
        
        // Check for birth_date (try variations: birth_date, birthdate, dob, birth_place)
        const birthValue = person.birth_date || person.birthdate || person.dob;
        if (birthValue && String(birthValue).trim() !== '') {
            completeness += 16.67;
        }
        
        // Check for address
        if (person.address && String(person.address).trim() !== '') {
            completeness += 16.67;
        }
        
        setProfileCompleteness(Math.min(100, Math.round(completeness)));
    }, [person]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const requestRequirementSubmission = (category) => {
        const activeApplication = sacramentApplications.find((application) =>
            application.category === category && ['Pending', 'Processing', 'Approved', 'Completed'].includes(application.status)
        );

        if (activeApplication?.status === 'Approved' || activeApplication?.status === 'Completed') return;

        setSelectedRequirement({ category });
        setApplicationPurpose('');
        setRequirementConfirmationOpen(true);
    };

    const confirmRequirementSubmission = async () => {
        if (!selectedRequirement) return;
        if (!applicationPurpose.trim()) return;
        setApplicationSubmitting(true);
        const activeApplication = sacramentApplications.find((application) =>
            application.category === selectedRequirement.category && ['Pending', 'Processing', 'Approved'].includes(application.status)
        );
        if (activeApplication) {
            setApplicationSubmitting(false);
            setRequirementConfirmationOpen(false);
            setSelectedRequirement(null);
            return;
        }
        try {
            const response = await fetch(`${API_BASE}/sacrament-applications.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    person_id: user.person_id,
                    applicant_name: `${person?.first_name || ''} ${person?.last_name || ''}`.trim() || user.username,
                    category: selectedRequirement.category,
                    purpose: applicationPurpose.trim(),
                }),
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.message || 'Unable to create application');
            setRequirementConfirmationOpen(false);
            setSelectedRequirement(null);
            setApplicationPurpose('');
            const refreshed = await fetch(`${API_BASE}/sacrament-applications.php?person_id=${user.person_id}`);
            const refreshedData = refreshed.ok ? await refreshed.json() : { success: false, data: [] };
            setSacramentApplications(refreshedData.success ? refreshedData.data || [] : []);
        } catch (err) {
            console.error('Failed to create sacrament application', err);
        } finally {
            setApplicationSubmitting(false);
        }
    };

    const handleExportRecords = () => {
        // Create CSV content
        let csvContent = 'Church Records Export\n\n';
        csvContent += `Exported: ${new Date().toLocaleDateString()}\n`;
        csvContent += `Person: ${person?.first_name} ${person?.last_name}\n\n`;
        
        // Add baptisms
        csvContent += 'BAPTISMAL RECORDS\n';
        csvContent += 'Date,Place,Father,Mother,Godparents\n';
        baptisms.forEach((b) => {
            csvContent += `"${b.baptism_date || ''}","${b.baptism_place || ''}","${personNames[b.father_id] || ''}","${personNames[b.mother_id] || ''}","${b.godparents || ''}"\n`;
        });
        csvContent += '\n';

        // Add confirmations
        csvContent += 'CONFIRMATION RECORDS\n';
        csvContent += 'Date,Bishop,Sponsors\n';
        confirmations.forEach((c) => {
            csvContent += `"${c.confirmation_date || ''}","${c.confirming_bishop || ''}","${c.sponsor_names || ''}"\n`;
        });
        csvContent += '\n';

        // Add communion
        csvContent += 'COMMUNION RECORDS\n';
        csvContent += 'Date,Remarks\n';
        communions.forEach((c) => {
            csvContent += `"${c.communion_date || ''}","${c.remarks || ''}"\n`;
        });

        // Download as CSV
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent));
        element.setAttribute('download', `Church_Records_${new Date().getTime()}.csv`);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const handleRsvpEvent = async (scheduleId, status) => {
        if (!user?.person_id) {
            alert('Please log in to RSVP');
            return;
        }

        try {
            const response = await eventAttendanceAPI.recordAttendance({
                person_id: user.person_id,
                schedule_id: scheduleId,
                status: status === 'yes' ? 'attending' : 'not_attending',
                notes: ''
            });

            if (response.data?.success) {
                setEventRsvpStatus({ ...eventRsvpStatus, [scheduleId]: status });
                alert(`âœ“ RSVP "${status === 'yes' ? 'Will Attend' : 'Can\'t Attend'}" saved! Parish will see your response.`);
            } else {
                alert('Failed to save RSVP. Please try again.');
            }
        } catch (err) {
            console.error('Failed to save RSVP', err);
            alert('Error saving RSVP: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleExpandRecord = (record) => {
        setSelectedRecord(record);
        setExpandedModal(true);
    };

    const sacramentApplicationStatus = useMemo(() => {
        const statusMap = {};

        (sacramentApplications || []).forEach((application) => {
            statusMap[application.category] = application.status;
        });

        return statusMap;
    }, [sacramentApplications]);

    const requirementGroups = Object.entries(REQUIREMENT_CATALOG).map(([category, standardRequirements]) => {
        const customRequirements = requirements
            .filter((item) => item.category === category)
            .map((item) => item.requirement_name)
            .filter(Boolean);
        const names = [...new Set([...standardRequirements, ...customRequirements])];

        return {
            category,
            items: names.map((name) => ({
                name,
                checklist: requirements.find((item) => item.category === category && item.requirement_name === name),
            })),
            applicationStatus: sacramentApplicationStatus[category] || null,
        };
    });

    const isMarried = Boolean(marriageRecord);
    const spouseName = marriageRecord
        ? user?.person_id === Number(marriageRecord.groom_id)
            ? (marriageRecord.bride_first || marriageRecord.bride_last
                ? `${marriageRecord.bride_first || ''} ${marriageRecord.bride_last || ''}`.trim()
                : personNames[marriageRecord.bride_id] || `#${marriageRecord.bride_id}`)
            : (marriageRecord.groom_first || marriageRecord.groom_last
                ? `${marriageRecord.groom_first || ''} ${marriageRecord.groom_last || ''}`.trim()
                : personNames[marriageRecord.groom_id] || `#${marriageRecord.groom_id}`)
        : null;
    const marriageDate = marriageRecord?.marriage_date || null;
    const marriagePriest = marriageRecord
        ? (marriageRecord.priest_first || marriageRecord.priest_last
            ? `${marriageRecord.priest_first || ''} ${marriageRecord.priest_last || ''}`.trim()
            : personNames[marriageRecord.priest_id] || null)
        : null;
    const latestCommunion = communions.length > 0 ? communions[0].communion_date : null;
    const latestBaptism = baptisms.reduce((latest, record) => {
        if (!record?.baptism_date) return latest;
        if (!latest) return record;
        return new Date(record.baptism_date) > new Date(latest.baptism_date) ? record : latest;
    }, null);

    const latestConfirmation = confirmations.reduce((latest, record) => {
        if (!record?.confirmation_date) return latest;
        if (!latest) return record;
        return new Date(record.confirmation_date) > new Date(latest.confirmation_date) ? record : latest;
    }, null);

    const baptismParents = latestBaptism
        ? {
            father: latestBaptism.father_id
                ? personNames[latestBaptism.father_id] || `#${latestBaptism.father_id}`
                : 'N/A',
            mother: latestBaptism.mother_id
                ? personNames[latestBaptism.mother_id] || `#${latestBaptism.mother_id}`
                : 'N/A',
            godparents: latestBaptism.godparents || latestBaptism.godparents_names || 'N/A',
            place: latestBaptism.baptism_place || latestBaptism.baptism_date || 'N/A',
        }
        : null;

    const confirmationSponsors = latestConfirmation
        ? latestConfirmation.sponsor_names || latestConfirmation.sponsors || 'N/A'
        : null;

    const recentActivities = useMemo(() => {
        const items = [];

        if (marriageRecord && marriageDate) {
            items.push({
                title: 'Marriage Record',
                subtitle: spouseName ? `Spouse: ${spouseName}` : 'Marriage details available',
                date: marriageDate,
                icon: <FavoriteIcon fontSize="small" />,
                fullRecord: marriageRecord,
            });
        }

        baptisms.slice(-2).reverse().forEach((record) => {
            items.push({
                title: 'Baptismal Record',
                subtitle: record.baptism_place || 'Baptism details available',
                date: record.baptism_date,
                icon: <ChurchIcon fontSize="small" />,
                fullRecord: record,
            });
        });

        confirmations.slice(-2).reverse().forEach((record) => {
            items.push({
                title: 'Confirmation Record',
                subtitle: record.confirming_bishop || 'Confirmation details available',
                date: record.confirmation_date,
                icon: <PeopleIcon fontSize="small" />,
                fullRecord: record,
            });
        });

        communions.slice(-2).reverse().forEach((record) => {
            items.push({
                title: 'Communion Record',
                subtitle: record.remarks || 'Communion details available',
                date: record.communion_date,
                icon: <EventNoteIcon fontSize="small" />,
                fullRecord: record,
            });
        });

        burials.slice(-2).reverse().forEach((record) => {
            items.push({
                title: 'Burial Record',
                subtitle: record.burial_place || 'Burial details available',
                date: record.burial_date || record.death_date,
                icon: <HistoryIcon fontSize="small" />,
                fullRecord: record,
            });
        });

        return items
            .filter((item) => item.date)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 4);
    }, [baptisms, confirmations, communions, burials, marriageRecord, spouseName, marriageDate]);

    // Helpers reused from WatchLivestream: determine embed URL or video playback
    const getEmbedUrl = (url) => {
        if (!url) return null;
        const ytMatch = url.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i);
        if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
        const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
        if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
        const facebookMatch = url.match(/(?:facebook\.com|fb\.watch)/i);
        if (facebookMatch) return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&width=560`;
        return null;
    };

    const renderPlayerFor = (event) => {
        const url = event?.streaming_url;
        const isBlobUrl = /^blob:/i.test(url);
        const embed = getEmbedUrl(url);
        const isWatchPage = url && url.startsWith(`${window.location.origin}/watch/`);

        if (isWatchPage) {
            return (
                <iframe
                    title={`livestream-${event.livestream_id}`}
                    src={url}
                    width="100%"
                    height={360}
                    frameBorder="0"
                    allow="autoplay; encrypted-media; fullscreen"
                    allowFullScreen
                />
            );
        }

        if (embed && !isBlobUrl) {
            return (
                <iframe title={`livestream-${event.livestream_id}`} src={embed} width="100%" height={360} frameBorder="0" allowFullScreen />
            );
        }

        if (url && (isBlobUrl || /\.(mp4|webm|ogg)$/i.test(url))) {
            return (
                <video controls width="100%" height={360}>
                    <source src={url} />
                    Your browser does not support the video tag.
                </video>
            );
        }

        return (
            <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                <Typography variant="body2" sx={{ color: '#475569' }}>
                    Cannot preview this streaming source. Open the watch page to view.
                </Typography>
            </Box>
        );
    };

    if (user?.user_role && user.user_role !== 'Person') {
        return <Navigate to="/dashboard" replace />;
    }

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress /></Box>;

    return (
        <Box sx={{ minHeight: '100vh', p: { xs: 1.5, sm: 2.5, md: 4 }, background: 'linear-gradient(145deg, #edf5f3 0%, #f7faf9 48%, #e8f2f0 100%)' }}>
            <Paper
                id="person-dashboard-hero"
                role="region"
                aria-labelledby="person-dashboard-title"
                elevation={0}
                sx={{
                    p: { xs: 2.5, md: 4 },
                    borderRadius: 5,
                    mb: 3,
                    background: 'linear-gradient(120deg, #0d4f5d 0%, #0b6b68 46%, #6aa779 100%)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    boxShadow: '0 18px 40px rgba(10, 60, 64, 0.25)',
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        inset: 0,
                        background: 'radial-gradient(circle at top right, rgba(255,255,255,0.17), transparent 32%)',
                        pointerEvents: 'none',
                    },
                    '&::after': {
                        content: '""',
                        position: 'absolute',
                        width: 280,
                        height: 280,
                        borderRadius: '50%',
                        right: -90,
                        top: -120,
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: 'transparent',
                    },
                }}
            >
                <Grid container spacing={3} alignItems="center" sx={{ position: 'relative', zIndex: 1 }}>
                    <Grid size={12}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ width: '100%' }}>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="h4" id="person-dashboard-title" sx={{ fontWeight: 900, letterSpacing: '-0.04em', color: 'white', lineHeight: 1.1 }}>
                                    Welcome back{person?.first_name ? `, ${person.first_name}` : user?.username}
                                </Typography>
                                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.82)', mt: 1.5, maxWidth: 720, lineHeight: 1.55 }}>
                                    Dito makikita ang pinakabagong church records mo at mga key summaries na kailangan mo nang mabilis.
                                </Typography>
                            </Box>

                            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ pt: 0.25 }}>
                                <NotificationBell
                                    categories={['Chat']}
                                    title="Messages"
                                    emptyMessage="No messages yet"
                                    icon={ChatBubbleOutlineIcon}
                                    manageAppBadge={false}
                                />
                                <NotificationBell excludeCategories={['Chat']} />
                            </Stack>
                        </Stack>

                        <Box
                            sx={{
                                mt: 2.75,
                                display: 'grid',
                                gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
                                gap: 1.25,
                                alignItems: 'stretch',
                                width: '100%',
                                maxWidth: 900,
                            }}
                        >
                            <Button variant="contained" onClick={() => navigate('/profile')} aria-label="Update profile" sx={{ minHeight: 58, borderRadius: 3, fontSize: { xs: 13, md: 15 }, fontWeight: 800, letterSpacing: '0.01em', textTransform: 'none', bgcolor: '#f7fbfb', color: '#123b50', boxShadow: '0 12px 26px rgba(10, 35, 44, 0.18)', '&:hover': { bgcolor: '#eef5f5', boxShadow: '0 16px 30px rgba(10, 35, 44, 0.22)' } }}>
                                My Profile
                            </Button>
                            <Button variant="contained" onClick={() => navigate('/document-requests')} aria-label="Request document" sx={{ minHeight: 58, borderRadius: 3, fontSize: { xs: 13, md: 15 }, fontWeight: 800, letterSpacing: '0.01em', textTransform: 'none', bgcolor: '#0b7f86', color: 'white', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 12px 26px rgba(10, 72, 77, 0.22)', '&:hover': { bgcolor: '#0a6e75', boxShadow: '0 16px 30px rgba(10, 72, 77, 0.28)' } }}>
                                Request Document
                            </Button>
                            <Button variant="outlined" onClick={() => navigate('/my-records')} aria-label="View all records" sx={{ minHeight: 58, borderRadius: 3, fontSize: { xs: 13, md: 15 }, fontWeight: 800, letterSpacing: '0.01em', textTransform: 'none', borderColor: 'rgba(255,255,255,0.8)', color: 'white', bgcolor: 'rgba(255,255,255,0.06)', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.95)' } }}>
                                View All Records
                            </Button>
                            <Button variant="outlined" onClick={() => setRequirementsModalOpen(true)} aria-label="View sacrament requirements" sx={{ minHeight: 58, borderRadius: 3, fontSize: { xs: 13, md: 15 }, fontWeight: 800, letterSpacing: '0.01em', textTransform: 'none', borderColor: 'rgba(255,255,255,0.8)', color: 'white', bgcolor: 'rgba(255,255,255,0.06)', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.95)' } }}>
                                Requirements
                            </Button>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            {/* Profile Completeness Indicator */}
            {profileCompleteness < 100 && (
                <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 3, border: '1px solid rgba(148, 163, 184, 0.2)', bgcolor: '#f0f9ff' }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0c4a6e' }}>Profile Completeness</Typography>
                            <Typography variant="body2" sx={{ color: '#0f172a', mt: 0.5, mb: 1 }}>
                                Complete your profile to unlock all features ({profileCompleteness}%)
                            </Typography>
                            <LinearProgress variant="determinate" value={profileCompleteness} sx={{ height: 8, borderRadius: 4, bgcolor: '#bfdbfe', '& .MuiLinearProgress-bar': { bgcolor: '#0284c7' } }} />
                        </Box>
                    </Stack>
                </Paper>
            )}

            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}>
                    <DetailCard title="Upcoming Events" subtitle="Mga paparating na parish activities.">
                        {upcomingEvents.length > 0 ? (
                            upcomingEvents.map((schedule) => (
                                <Box key={schedule.schedule_id} sx={{ p: 2, mb: 1, borderRadius: 2.5, background: 'linear-gradient(180deg, #f9fbfb 0%, #eef7f6 100%)', border: '1px solid rgba(148, 163, 184, 0.18)', boxShadow: '0 10px 18px rgba(15, 58, 69, 0.04)' }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="start" sx={{ mb: 1.25 }}>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#123b50' }}>{schedule.event_title || 'Untitled event'}</Typography>
                                            <Typography variant="body2" sx={{ color: '#475569', mt: 0.5 }}>
                                                {schedule.event_type || 'Event'} â€¢ {schedule.start_datetime ? new Date(schedule.start_datetime).toLocaleString() : 'No date'}
                                            </Typography>
                                        </Box>
                                        <Chip label={schedule.status || 'Scheduled'} size="small" sx={{ bgcolor: '#ddf8eb', color: '#166534', fontWeight: 700 }} />
                                    </Stack>
                                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                        <Button size="small" variant={eventRsvpStatus[schedule.schedule_id] === 'yes' ? 'contained' : 'outlined'} onClick={() => handleRsvpEvent(schedule.schedule_id, 'yes')} sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}>
                                            Will Attend
                                        </Button>
                                        <Button size="small" variant={eventRsvpStatus[schedule.schedule_id] === 'no' ? 'contained' : 'outlined'} color="error" onClick={() => handleRsvpEvent(schedule.schedule_id, 'no')} sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}>
                                            Canâ€™t Attend
                                        </Button>
                                    </Stack>
                                </Box>
                            ))
                        ) : (
                            <Typography variant="body2" sx={{ color: '#64748b' }}>
                                Walang naka-schedule na paparating na event sa ngayon.
                            </Typography>
                        )}
                    </DetailCard>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}>
                    <DetailCard title="Announcements" subtitle="Pinakabagong parish updates at paalala.">
                        {announcements.length > 0 ? (
                            announcements.map((item) => (
                                <Box key={item.announcement_id} sx={{ p: 2, mb: 1, borderRadius: 2.5, background: 'linear-gradient(180deg, #f9fbfb 0%, #eef7f6 100%)', border: '1px solid rgba(148, 163, 184, 0.18)', boxShadow: '0 10px 18px rgba(15, 58, 69, 0.04)' }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#123b50' }}>{item.title}</Typography>
                                    <Typography variant="body2" sx={{ color: '#475569', mt: 0.5 }}>
                                        {item.content?.slice(0, 120)}{item.content?.length > 120 ? '...' : ''}
                                    </Typography>
                                    <Chip label={item.category || 'General'} size="small" sx={{ mt: 1.2, bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 700 }} />
                                </Box>
                            ))
                        ) : (
                            <Typography variant="body2" sx={{ color: '#64748b' }}>
                                Walang bagong announcement sa ngayon.
                            </Typography>
                        )}
                    </DetailCard>
                </Grid>
            </Grid>

            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={12}>
                    <Paper elevation={0} sx={{ p: 0, borderRadius: 4, border: '1px solid rgba(148, 163, 184, 0.18)', background: 'linear-gradient(180deg, #ffffff 0%, #f3faf9 100%)', boxShadow: '0 18px 36px rgba(15, 58, 69, 0.04)', overflow: 'hidden' }}>
                        <Box sx={{ p: 3, borderBottom: '1px solid rgba(148, 163, 184, 0.12)' }}>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: '#123b50' }}>Activity Calendar</Typography>
                            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>Makikita mo rito ang lahat ng parish schedule at community activities para sa buwan.</Typography>
                        </Box>
                        <MonthCalendar />
                    </Paper>
                </Grid>
            </Grid>

            <Grid container spacing={2}>
                <Grid size={12}>
                    <Stack spacing={2}>
                        <DetailCard title="Live Now" subtitle="Currently streaming events"> 
                            {liveLoading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress size={20} /></Box>
                            ) : liveEvents.length > 0 ? (
                                <Box>
                                    {renderPlayerFor(liveEvents[0])}
                                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                        <Button component={Link} to={`/watch/${liveEvents[0].livestream_id}`} variant="contained">Watch</Button>
                                        <Button variant="outlined" href={liveEvents[0].streaming_url} target="_blank" rel="noreferrer">Open source</Button>
                                    </Stack>
                                    <LivestreamChat livestreamId={liveEvents[0].livestream_id} />
                                </Box>
                            ) : (
                                <Typography variant="body2" sx={{ color: '#475569' }}>Walang kasalukuyang live stream ngayon.</Typography>
                            )}
                        </DetailCard>
                        {/* System Messages removed per request (temporarily) */}
                        <DetailCard title="Document Requests" subtitle="Track the progress of every document request in one place.">
                            {documentRequests.length > 0 ? (
                                <Box>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
                                        <Chip label={`${requestSummary.total} total requests`} size="small" sx={{ bgcolor: '#e6f4f1', color: '#0b6b68', fontWeight: 800 }} />
                                        <Chip label={`${requestSummary.readyCount} ready for pickup`} size="small" icon={requestSummary.readyCount > 0 ? <CheckCircleIcon /> : undefined} sx={{ bgcolor: requestSummary.readyCount > 0 ? '#fff4cf' : '#f1f5f9', color: requestSummary.readyCount > 0 ? '#8a5a00' : '#64748b', fontWeight: 800 }} />
                                    </Stack>
                                    {requestSummary.readyCount > 0 && (
                                        <Box sx={{ p: 1.5, borderRadius: 2.5, bgcolor: '#fff8df', border: '1px solid #f5dfa0', mb: 1.5 }}>
                                            <Typography variant="body2" sx={{ color: '#795000', fontWeight: 700 }}>
                                                May dokumentong ready for pickup. Dalhin ang tracking number sa parish office.
                                            </Typography>
                                        </Box>
                                    )}
                                    <Stack spacing={1}>
                                        {documentRequests.slice(0, 3).map((request) => (
                                            <Box key={request.request_id} sx={{ p: 1.75, bgcolor: '#f8fbfb', borderRadius: 2.5, border: '1px solid rgba(17, 75, 80, 0.1)' }}>
                                                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" spacing={1}>
                                                    <Box sx={{ minWidth: 0 }}>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#123b50' }}>{request.document_type}</Typography>
                                                        <Typography variant="caption" sx={{ color: '#58727a' }}>{request.tracking_number}</Typography>
                                                    </Box>
                                                    <Chip
                                                        label={request.status}
                                                        size="small"
                                                        sx={{ bgcolor: request.status === 'Ready for Pickup' ? '#fff0bd' : request.status === 'Pending' ? '#fef3c7' : '#e7eef0', color: request.status === 'Ready for Pickup' ? '#8a5a00' : '#234b56', fontWeight: 700 }}
                                                    />
                                                </Stack>
                                            </Box>
                                        ))}
                                    </Stack>
                                    {documentRequests.length > 3 && (
                                        <Typography variant="caption" sx={{ display: 'block', color: '#64748b', mt: 1.25 }}>
                                            Showing the 3 most recent requests.
                                        </Typography>
                                    )}
                                    <Button component={Link} to="/document-requests" variant="outlined" fullWidth sx={{ mt: 2, borderRadius: 2.5, textTransform: 'none', fontWeight: 800 }}>
                                        View all document requests
                                    </Button>
                                </Box>
                            ) : (
                                <Typography variant="body2" sx={{ color: '#475569' }}>
                                    Wala ka pang dokumentong request. Pwede kang mag-request ng baptismal, marriage, at iba pang dokumento.
                                </Typography>
                            )}
                        </DetailCard>
                        <Paper elevation={1} sx={{ p: 3, borderRadius: 3, border: '1px solid rgba(148, 163, 184, 0.18)', bgcolor: '#ffffff' }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Recent Activity</Typography>
                            {recentActivities.length > 0 ? (
                                <Stack spacing={2}>
                                    {recentActivities.map((item, index) => (
                                        <ActivityItem 
                                            key={`${item.title}-${index}`} 
                                            icon={item.icon} 
                                            title={item.title} 
                                            subtitle={item.subtitle} 
                                            date={new Date(item.date).toLocaleDateString()}
                                            onClick={() => handleExpandRecord(item.fullRecord)}
                                        />
                                    ))}
                                </Stack>
                            ) : (
                                <Typography variant="body2" sx={{ color: '#475569' }}>Wala pang bagong impormasyon sa records. Makikita mo agad ang mga bagong record dito kapag na-update ang data.</Typography>
                            )}
                        </Paper>
                    </Stack>
                </Grid>
            </Grid>


            {/* Donations/Finances Widget */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}>
                    <DetailCard title="Donations & Contributions" subtitle="Track your parish donations and contributions.">
                        {donationsLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress size={20} /></Box>
                        ) : donations.length > 0 ? (
                            <Box>
                                <Typography variant="body2" sx={{ color: '#475569', mb: 2, fontWeight: 700 }}>
                                    Total: â‚±{donations.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0).toFixed(2)}
                                </Typography>
                                <Stack spacing={1}>
                                    {donations.slice(0, 3).map((donation) => (
                                        <Box key={donation.donation_id} sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid rgba(148, 163, 184, 0.18)' }}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="start">
                                                <Box>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{donation.donation_type}</Typography>
                                                    <Typography variant="body2" sx={{ color: '#475569', mt: 0.5 }}>â‚±{parseFloat(donation.amount).toFixed(2)}</Typography>
                                                </Box>
                                                <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                                                    {donation.date_received ? new Date(donation.date_received).toLocaleDateString() : 'N/A'}
                                                </Typography>
                                            </Stack>
                                        </Box>
                                    ))}
                                </Stack>
                                <Button component={Link} to="/finances" variant="outlined" sx={{ mt: 2 }} fullWidth>View all donations</Button>
                            </Box>
                        ) : (
                            <Typography variant="body2" sx={{ color: '#475569' }}>
                                Wala pang donation record. Salamat sa iyong interest sa pag-support sa parish!
                            </Typography>
                        )}
                    </DetailCard>
                </Grid>

                {/* Mass Intentions Widget */}
                <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}>
                    <DetailCard title="Mass Intentions" subtitle="Your booked mass intentions and prayers.">
                        {massIntentionsLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress size={20} /></Box>
                        ) : massIntentions.length > 0 ? (
                            <Box>
                                <Stack spacing={1}>
                                    {massIntentions.slice(0, 3).map((intention) => (
                                        <Box key={intention.intention_id} sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid rgba(148, 163, 184, 0.18)' }}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{intention.type}</Typography>
                                            <Typography variant="body2" sx={{ color: '#475569', mt: 0.5 }}>
                                                {intention.intention_names}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 0.5 }}>
                                                {intention.mass_date ? new Date(intention.mass_date).toLocaleDateString() : 'Pending'}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Stack>
                                <Button component={Link} to="/mass-intentions" variant="outlined" sx={{ mt: 2 }} fullWidth>View all intentions</Button>
                            </Box>
                        ) : (
                            <Typography variant="body2" sx={{ color: '#475569' }}>
                                Walang mass intention na na-book. Pwede kang mag-book ng intention para sa kalusugan, kapakanan, o alaala ng mga mahal mo sa buhay.
                            </Typography>
                        )}
                    </DetailCard>
                </Grid>
            </Grid>

            {/* Ministries & Volunteer Opportunities */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={12}>
                    <DetailCard title="Ministry & Volunteer Involvement" subtitle="Active service and volunteer activities in the parish.">
                        {ministriesLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress size={20} /></Box>
                        ) : (
                            <Box>
                                {volunteers.length > 0 ? (
                                    <Box>
                                        <Typography variant="body2" sx={{ color: '#475569', mb: 2 }}>
                                            You are currently active in {volunteers.length} ministry/ies.
                                        </Typography>
                                        <Grid container spacing={2}>
                                            {volunteers.slice(0, 4).map((vol) => (
                                                <Grid size={{ xs: 12, sm: 6, md: 3 }} key={vol.volunteer_id || vol.ministry_id || vol.id}>
                                                    <Paper
                                                        elevation={0}
                                                        sx={{
                                                            p: 2,
                                                            textAlign: 'center',
                                                            bgcolor: '#f8fafc',
                                                            border: '1px solid rgba(148, 163, 184, 0.18)',
                                                            borderRadius: 2,
                                                            height: '100%',
                                                        }}
                                                    >
                                                        <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: '#f3e8ff', display: 'grid', placeItems: 'center', mx: 'auto', mb: 1.5 }}>
                                                            <VolunteerActivismIcon sx={{ color: '#7c3aed', fontSize: 22 }} />
                                                        </Box>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                                            {vol.ministry_name || vol.name || 'Ministry'}
                                                        </Typography>
                                                        <Chip label="Active" size="small" sx={{ mt: 1.25, bgcolor: '#d1fae5', color: '#166534', fontWeight: 700 }} />
                                                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 1 }}>
                                                            Joined: {vol.date_joined ? new Date(vol.date_joined).toLocaleDateString() : 'N/A'}
                                                        </Typography>
                                                    </Paper>
                                                </Grid>
                                            ))}
                                        </Grid>
                                        <Button component={Link} to="/ministries" variant="outlined" sx={{ mt: 2 }} fullWidth>
                                            Explore ministries
                                        </Button>
                                    </Box>
                                ) : (
                                    <Box sx={{ textAlign: 'center', py: 3 }}>
                                        <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: '#f1f5f9', display: 'grid', placeItems: 'center', mx: 'auto', mb: 2 }}>
                                            <VolunteerActivismIcon sx={{ fontSize: 34, color: '#94a3b8' }} />
                                        </Box>
                                        <Typography variant="body2" sx={{ color: '#475569', mb: 2 }}>
                                            You have not joined any ministry yet.
                                        </Typography>
                                        <Button component={Link} to="/ministries" variant="contained" size="medium">
                                            Join a Ministry
                                        </Button>
                                    </Box>
                                )}
                            </Box>
                        )}
                    </DetailCard>
                </Grid>
            </Grid>

          
            <Dialog open={requirementsModalOpen} onClose={() => setRequirementsModalOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ fontWeight: 800, color: '#123b50' }}>Sacrament Requirements</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
                        Ang parish ang mag-aapruba muna ng application bago ka makapag-submit ng mga kailangan na dokumento para sa sacrament.
                    </Typography>
                    <Grid container spacing={3}>
                        {requirementGroups.map((group) => {
                            const appStatus = group.applicationStatus;
                            const application = sacramentApplications.find((item) => item.category === group.category);
                            const applicationCompleted = appStatus === 'Approved' || appStatus === 'Completed';
                            const applicationLocked = Boolean(appStatus && !applicationCompleted);

                            return (
                                <Grid size={{ xs: 12, md: 4 }} key={group.category}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                                        <Typography variant="subtitle1" sx={{ color: '#0b6b68', fontWeight: 800 }}>
                                            {group.category}
                                        </Typography>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            disabled={applicationLocked || applicationCompleted}
                                            onClick={() => requestRequirementSubmission(group.category)}
                                            sx={{ minWidth: 130 }}
                                        >
                                            {applicationCompleted
                                                ? 'Approved'
                                                : appStatus
                                                    ? 'Awaiting approval'
                                                    : `Apply for ${group.category}`}
                                        </Button>
                                    </Stack>
                                    {appStatus && (
                                        <Box sx={{ mb: 1 }}>
                                            <Typography variant="caption" sx={{ display: 'block', color: '#475569' }}>
                                                Application status: {appStatus}
                                            </Typography>
                                            {application?.notes && (
                                                <Typography variant="caption" sx={{ display: 'block', color: '#b45309', mt: 0.25 }}>
                                                    Parish note: {application.notes}
                                                </Typography>
                                            )}
                                        </Box>
                                    )}
                                    <Stack spacing={0.75}>
                                        {group.items.map(({ name, checklist }) => (
                                            <Stack key={`${group.category}-${name}`} direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                                                <Box sx={{ minWidth: 0 }}>
                                                    <Typography variant="body2" sx={{ color: '#334e5b' }}>{name}</Typography>
                                                    {checklist?.submission?.notes && (
                                                        <Typography variant="caption" sx={{ display: 'block', color: checklist.submission.status === 'Rejected' ? '#b91c1c' : '#64748b' }}>
                                                            {checklist.submission.notes}
                                                        </Typography>
                                                    )}
                                                </Box>
                                                <Chip
                                                    label={checklist?.submission?.status || 'Pending'}
                                                    size="small"
                                                    color={checklist?.submission?.status === 'Approved' ? 'success' : checklist?.submission?.status === 'Rejected' ? 'error' : checklist?.submission?.status === 'Submitted' ? 'info' : 'warning'}
                                                />
                                            </Stack>
                                        ))}
                                    </Stack>
                                </Grid>
                            );
                        })}
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRequirementsModalOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={requirementConfirmationOpen}
                onClose={() => setRequirementConfirmationOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 800, color: '#123b50' }}>Start Sacrament Application</DialogTitle>
                <DialogContent>
                    {selectedRequirement?.status && selectedRequirement.status !== 'Approved' ? (
                        <>
                            <Typography variant="body2" sx={{ color: '#475569' }}>
                                Your application for:
                            </Typography>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0b6b68', mt: 1.5 }}>
                                {selectedRequirement.category}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 2, color: '#0f172a' }}>
                                Your request is currently <strong>{selectedRequirement.status}</strong> and is waiting for parish approval before you can submit the required documents.
                            </Typography>
                        </>
                    ) : (
                        <>
                            <Typography variant="body2" sx={{ color: '#475569' }}>
                                You are starting one application for:
                            </Typography>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0b6b68', mt: 1.5 }}>
                                {selectedRequirement?.category}
                            </Typography>
                            <TextField
                                fullWidth
                                multiline
                                rows={2}
                                label="Purpose or additional details"
                                value={applicationPurpose}
                                onChange={(event) => setApplicationPurpose(event.target.value)}
                                sx={{ mt: 2 }}
                            />
                        </>
                    )}
                    <Typography variant="caption" sx={{ display: 'block', color: '#64748b', mt: 1.5 }}>
                        Susuriin muna ng parish ang application. Kapag na-approve, saka ka bibigyan ng personal checklist para sa mga dokumento.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRequirementConfirmationOpen(false)}>Cancel</Button>
                    {selectedRequirement?.status && selectedRequirement.status !== 'Approved' ? (
                        <Button onClick={() => setRequirementConfirmationOpen(false)} variant="contained" color="primary">
                            Close
                        </Button>
                    ) : (
                        <Button onClick={confirmRequirementSubmission} variant="contained" color="primary" disabled={applicationSubmitting || !applicationPurpose.trim()}>
                            {applicationSubmitting ? 'Sending...' : 'Confirm Application'}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* Expanded Record Details Modal */}
            <Dialog open={expandedModal} onClose={() => setExpandedModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>Record Details</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    {selectedRecord && (
                        <Stack spacing={2}>
                            {Object.entries(selectedRecord).map(([key, value]) => (
                                <Box key={key}>
                                    <Typography variant="caption" sx={{ color: '#64748b', textTransform: 'uppercase' }}>
                                        {key.replace(/_/g, ' ')}
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                        {value && typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                    </Typography>
                                </Box>
                            ))}
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setExpandedModal(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
                <Button color="error" variant="outlined" onClick={handleLogout} aria-label="Logout from account">Logout</Button>
            </Box>
        </Box>
    );
};

export default PersonDashboard;
