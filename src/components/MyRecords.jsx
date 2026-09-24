import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Button, CircularProgress, Tabs, Tab, Stack, Chip } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChurchIcon from '@mui/icons-material/Church';
import PeopleIcon from '@mui/icons-material/People';
import EventNoteIcon from '@mui/icons-material/EventNote';
import FavoriteIcon from '@mui/icons-material/Favorite';
import HistoryIcon from '@mui/icons-material/History';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const API_BASE = `http://165.22.181.147/api`;

const RecordCard = ({ icon, title, date, details, children }) => (
    <Paper elevation={0} role="article" tabIndex={0} aria-label={title} sx={{ p: 3, borderRadius: 3, border: '1px solid rgba(17, 75, 80, 0.1)', bgcolor: '#ffffff', boxShadow: '0 8px 18px rgba(18, 59, 80, 0.05)' }}>
        <Stack direction="row" spacing={2} alignItems="flex-start">
            <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: '#dff7f4', display: 'grid', placeItems: 'center', color: '#0b6b68', flexShrink: 0 }}>
                {icon}
            </Box>
            <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#123b50' }}>{title}</Typography>
                {date && (
                    <Typography variant="body2" sx={{ color: '#4d6871', mt: 0.5 }}>
                        <strong>Date:</strong> {new Date(date).toLocaleDateString()}
                    </Typography>
                )}
                <Box sx={{ mt: 2, display: 'grid', gap: 1 }}>
                    {Object.entries(details).map(([key, value]) => (
                        value && (
                            <Typography key={key} variant="body2" sx={{ color: '#4d6871' }}>
                                <strong>{key}:</strong> {value}
                            </Typography>
                        )
                    ))}
                </Box>
                {children}
            </Box>
        </Stack>
    </Paper>
);

const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index} style={{ width: '100%' }}>
        {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
);

const CeremonyVideo = ({ record }) => {
    const url = record?.ceremony_recording_url || record?.ceremony_streaming_url;
    if (!url) return null;

    const youtube = url.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i);
    const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
    const embedUrl = youtube ? `https://www.youtube.com/embed/${youtube[1]}` : vimeo ? `https://player.vimeo.com/video/${vimeo[1]}` : null;
    const isDirectVideo = /\.(mp4|webm|ogg)(?:\?|$)/i.test(url);

    return (
        <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                {record.ceremony_recording_url ? 'Event Replay' : 'Event Livestream'}
            </Typography>
            {embedUrl ? (
                <Box component="iframe" title="Wedding ceremony video" src={embedUrl} sx={{ width: '100%', aspectRatio: '16 / 9', border: 0, borderRadius: 2 }} allowFullScreen />
            ) : isDirectVideo ? (
                <Box component="video" controls sx={{ width: '100%', borderRadius: 2 }} src={url} />
            ) : (
                <Button component="a" href={url} target="_blank" rel="noreferrer" variant="outlined" startIcon={<PlayCircleOutlineIcon />}>
                    Watch ceremony video
                </Button>
            )}
        </Box>
    );
};

const MyRecords = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [tabValue, setTabValue] = useState(0);
    const [baptisms, setBaptisms] = useState([]);
    const [confirmations, setConfirmations] = useState([]);
    const [communions, setCommunions] = useState([]);
    const [burials, setBurials] = useState([]);
    const [marriage, setMarriage] = useState(null);
    const [personNames, setPersonNames] = useState({});

    const fetchPersonName = async (personId) => {
        if (!personId || personNames[personId]) return;
        try {
            const res = await fetch(`${API_BASE}/persons.php?person_id=${personId}`);
            if (res.ok) {
                const data = await res.json();
                if (data.success && Array.isArray(data.data) && data.data.length > 0) {
                    const person = data.data[0];
                    return `${person.first_name || ''} ${person.last_name || ''}`.trim();
                }
            }
        } catch (err) {
            console.error(`Failed to fetch person ${personId}:`, err);
        }
        return null;
    };

    useEffect(() => {
        const load = async () => {
            if (!user?.person_id) {
                setLoading(false);
                return;
            }

            try {
                const pid = user.person_id;
                const endpoints = [
                    fetch(`${API_BASE}/sacraments.php?person_id=${pid}&type=baptismal`),
                    fetch(`${API_BASE}/sacraments.php?person_id=${pid}&type=confirmation`),
                    fetch(`${API_BASE}/sacraments.php?person_id=${pid}&type=communion`),
                    fetch(`${API_BASE}/sacraments.php?person_id=${pid}&type=burial`),
                    fetch(`${API_BASE}/marriage-records.php?person_id=${pid}`),
                ];

                const responses = await Promise.all(endpoints);

                const parseResponse = async (res) => {
                    const text = await res.text();
                    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
                    if (!text) return null;
                    return JSON.parse(text);
                };

                const [baptismData, confirmationData, communionData, burialData, marriageData] = await Promise.all(
                    responses.map(parseResponse)
                );

                const baptismRecords = baptismData?.success ? baptismData.data || [] : [];
                const confirmationRecords = confirmationData?.success ? confirmationData.data || [] : [];
                const communionRecords = communionData?.success ? communionData.data || [] : [];
                const burialRecords = burialData?.success ? burialData.data || [] : [];
                const marriageRecord = marriageData?.success && Array.isArray(marriageData.data) && marriageData.data.length > 0 ? marriageData.data[0] : null;

                setBaptisms(baptismRecords);
                setConfirmations(confirmationRecords);
                setCommunions(communionRecords);
                setBurials(burialRecords);
                setMarriage(marriageRecord);

                // Collect all person IDs that need name resolution
                const personIds = new Set();
                baptismRecords.forEach(r => {
                    if (r.priest_id) personIds.add(r.priest_id);
                    if (r.father_id) personIds.add(r.father_id);
                    if (r.mother_id) personIds.add(r.mother_id);
                });
                confirmationRecords.forEach(r => {
                    if (r.priest_id) personIds.add(r.priest_id);
                });
                communionRecords.forEach(r => {
                    if (r.priest_id) personIds.add(r.priest_id);
                });
                burialRecords.forEach(r => {
                    if (r.priest_id) personIds.add(r.priest_id);
                });
                if (marriageRecord) {
                    if (marriageRecord.priest_id) personIds.add(marriageRecord.priest_id);
                    if (marriageRecord.groom_id) personIds.add(marriageRecord.groom_id);
                    if (marriageRecord.bride_id) personIds.add(marriageRecord.bride_id);
                }

                // Fetch names for all IDs
                const names = {};
                for (const id of personIds) {
                    const name = await fetchPersonName(id);
                    if (name) names[id] = name;
                }
                setPersonNames(names);
            } catch (err) {
                console.error('Failed to load records', err);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [user]);

    const getPersonName = (personId) => personNames[personId] || `#${personId}`;

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress /></Box>;

    const totalRecords = baptisms.length + confirmations.length + communions.length + burials.length + (marriage ? 1 : 0);

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, backgroundColor: '#edf3f1', minHeight: '100vh' }}>
            <Paper
                id="my-records-hero"
                role="region"
                aria-labelledby="my-records-title"
                elevation={0}
                sx={{
                    p: { xs: 3, md: 4 },
                    borderRadius: 4,
                    mb: 3,
                    background: 'linear-gradient(110deg, #123b50 0%, #0b6b68 68%, #d1a557 160%)',
                    border: '1px solid rgba(18, 59, 80, 0.12)',
                    boxShadow: '0 14px 28px rgba(13, 70, 76, 0.18)',
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden',
                    '&::after': {
                        content: '""',
                        position: 'absolute',
                        width: 240,
                        height: 240,
                        border: '1px solid rgba(255,255,255,0.14)',
                        borderRadius: '50%',
                        right: -80,
                        top: -110,
                    },
                }}
            >
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2, position: 'relative', zIndex: 1 }}>
                    <Button
                        startIcon={<ArrowBackIcon />}
                        onClick={() => navigate('/person-dashboard')}
                        sx={{
                            color: 'white',
                            borderRadius: 2,
                            bgcolor: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.14)' },
                        }}
                        aria-label="Back to dashboard"
                    >
                        Back to Dashboard
                    </Button>
                </Stack>
                <Typography variant="h4" id="my-records-title" sx={{ fontWeight: 800, letterSpacing: '-0.03em', mb: 1, color: 'white', position: 'relative', zIndex: 1 }}>
                    My Church Records
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', mb: 2, maxWidth: 720, position: 'relative', zIndex: 1 }}>
                    Complete list of all your sacramental records from St. Joseph Parish.
                </Typography>
                <Chip
                    label={`Total Records: ${totalRecords}`}
                    sx={{
                        fontWeight: 700,
                        bgcolor: 'rgba(255,255,255,0.18)',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.18)',
                        px: 0.5,
                        position: 'relative',
                        zIndex: 1,
                    }}
                />
            </Paper>

            <Paper elevation={1} sx={{ borderRadius: 3, border: '1px solid rgba(17, 75, 80, 0.1)', bgcolor: '#ffffff', boxShadow: '0 8px 18px rgba(18, 59, 80, 0.05)' }}>
                <Tabs
                    value={tabValue}
                    onChange={(e, newValue) => setTabValue(newValue)}
                    aria-label="Record categories"
                    sx={{
                        borderBottom: '1px solid rgba(17, 75, 80, 0.08)',
                        '& .MuiTab-root': {
                            textTransform: 'none',
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            color: '#5e7480',
                        },
                        '& .MuiTab-root.Mui-selected': {
                            color: '#123b50',
                        },
                        '& .MuiTabs-indicator': {
                            backgroundColor: '#0b6b68',
                        },
                    }}
                >
                    <Tab label={`Baptism (${baptisms.length})`} />
                    <Tab label={`Confirmation (${confirmations.length})`} />
                    <Tab label={`Communion (${communions.length})`} />
                    <Tab label={`Burial (${burials.length})`} />
                    <Tab label={`Marriage${marriage ? ' (1)' : ' (0)'}`} />
                </Tabs>

                <Box sx={{ p: { xs: 2, md: 3 } }}>
                    <TabPanel value={tabValue} index={0}>
                        {baptisms.length > 0 ? (
                            <Stack spacing={2}>
                                {baptisms.map((record, index) => (
                                    <RecordCard
                                        key={index}
                                        icon={<ChurchIcon />}
                                        title={`Baptism Record ${index + 1}`}
                                        date={record.baptism_date}
                                        details={{
                                            'Baptism Place': record.baptism_place,
                                            'Priest': record.priest_id ? getPersonName(record.priest_id) : 'N/A',
                                            'Father': record.father_id ? getPersonName(record.father_id) : 'N/A',
                                            'Mother': record.mother_id ? getPersonName(record.mother_id) : 'N/A',
                                            'Godparents': record.godparents_names,
                                        }}
                                    >
                                        <CeremonyVideo record={record} />
                                    </RecordCard>
                                ))}
                            </Stack>
                        ) : (
                            <Typography variant="body2" sx={{ color: '#475569', textAlign: 'center', py: 4 }}>
                                No baptism records found.
                            </Typography>
                        )}
                    </TabPanel>

                    <TabPanel value={tabValue} index={1}>
                        {confirmations.length > 0 ? (
                            <Stack spacing={2}>
                                {confirmations.map((record, index) => (
                                    <RecordCard
                                        key={index}
                                        icon={<PeopleIcon />}
                                        title={`Confirmation Record ${index + 1}`}
                                        date={record.confirmation_date}
                                        details={{
                                            'Confirming Bishop': record.confirming_bishop,
                                            'Sponsors': record.sponsor_names,
                                            'Registry Book No.': record.registry_book_no,
                                            'Location': record.confirmation_place,
                                        }}
                                    >
                                        <CeremonyVideo record={record} />
                                    </RecordCard>
                                ))}
                            </Stack>
                        ) : (
                            <Typography variant="body2" sx={{ color: '#475569', textAlign: 'center', py: 4 }}>
                                No confirmation records found.
                            </Typography>
                        )}
                    </TabPanel>

                    <TabPanel value={tabValue} index={2}>
                        {communions.length > 0 ? (
                            <Stack spacing={2}>
                                {communions.map((record, index) => (
                                    <RecordCard
                                        key={index}
                                        icon={<EventNoteIcon />}
                                        title={`Communion Record ${index + 1}`}
                                        date={record.communion_date}
                                        details={{
                                            'Priest': record.priest_id ? getPersonName(record.priest_id) : 'N/A',
                                            'Remarks': record.remarks,
                                            'Location': record.communion_place,
                                        }}
                                    >
                                        <CeremonyVideo record={record} />
                                    </RecordCard>
                                ))}
                            </Stack>
                        ) : (
                            <Typography variant="body2" sx={{ color: '#475569', textAlign: 'center', py: 4 }}>
                                No communion records found.
                            </Typography>
                        )}
                    </TabPanel>

                    <TabPanel value={tabValue} index={3}>
                        {burials.length > 0 ? (
                            <Stack spacing={2}>
                                {burials.map((record, index) => (
                                    <RecordCard
                                        key={index}
                                        icon={<HistoryIcon />}
                                        title={`Burial Record ${index + 1}`}
                                        date={record.burial_date}
                                        details={{
                                            'Death Date': record.death_date ? new Date(record.death_date).toLocaleDateString() : 'N/A',
                                            'Burial Place': record.burial_place,
                                            'Priest': record.priest_id ? getPersonName(record.priest_id) : 'N/A',
                                            'Cause of Death': record.cause_of_death,
                                        }}
                                    >
                                        <CeremonyVideo record={record} />
                                    </RecordCard>
                                ))}
                            </Stack>
                        ) : (
                            <Typography variant="body2" sx={{ color: '#475569', textAlign: 'center', py: 4 }}>
                                No burial records found.
                            </Typography>
                        )}
                    </TabPanel>

                    <TabPanel value={tabValue} index={4}>
                        {marriage ? (
                            <RecordCard
                                icon={<FavoriteIcon />}
                                title="Marriage Record"
                                date={marriage.marriage_date}
                                details={{
                                    'Groom': marriage.groom_id ? getPersonName(marriage.groom_id) : `${marriage.groom_first || ''} ${marriage.groom_last || ''}`.trim(),
                                    'Bride': marriage.bride_id ? getPersonName(marriage.bride_id) : `${marriage.bride_first || ''} ${marriage.bride_last || ''}`.trim(),
                                    'Priest': marriage.priest_id ? getPersonName(marriage.priest_id) : 'N/A',
                                    'License No.': marriage.license_no,
                                    'Civil Info': marriage.civil_marriage_info,
                                    'Location': marriage.marriage_place,
                                }}
                            >
                                <CeremonyVideo record={marriage} />
                            </RecordCard>
                        ) : (
                            <Typography variant="body2" sx={{ color: '#475569', textAlign: 'center', py: 4 }}>
                                No marriage records found.
                            </Typography>
                        )}
                    </TabPanel>
                </Box>
            </Paper>
        </Box>
    );
};

export default MyRecords;
