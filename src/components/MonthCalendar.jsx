import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Card,
    Box,
    Typography,
    Chip,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    List,
    ListItem,
    ListItemText,
    IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import axios from 'axios';
import { formatSafeIsoDate } from '../utils/formatters';

const API_BASE_URL = 'http://165.22.181.147/api';

const weekdayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const typeColors = {
    Mass: { bg: '#eef2ff', color: '#3730a3' },
    Seminar: { bg: '#d1fae5', color: '#166534' },
    Meeting: { bg: '#fef3c7', color: '#92400e' },
    'Priest Unavailable': { bg: '#fee2e2', color: '#b91c1c' },
};

const MonthCalendar = ({ year: propYear, month: propMonth }) => {
    const navigate = useNavigate();
    const today = new Date();
    const [year, setYear] = useState(propYear || today.getFullYear());
    const [month, setMonth] = useState(typeof propMonth === 'number' ? propMonth : today.getMonth());
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedDate, setSelectedDate] = useState(null);
    const [open, setOpen] = useState(false);

    useEffect(() => { fetchEvents(); }, [year, month]);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const [schedulesRes, communityRes, unavailabilityRes, personsRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/schedules.php`).catch(() => ({ data: { success: false, data: [] } })),
                axios.get(`${API_BASE_URL}/community.php?type=activities`).catch(() => ({ data: { success: false, data: [] } })),
                axios.get(`${API_BASE_URL}/priest-unavailability.php`).catch(() => ({ data: { success: false, data: [] } })),
                axios.get(`${API_BASE_URL}/persons.php`).catch(() => ({ data: { success: false, data: [] } })),
            ]);

            const scheduleData = schedulesRes.data && schedulesRes.data.success ? schedulesRes.data.data || [] : [];
            const communityData = communityRes.data && communityRes.data.success ? communityRes.data.data || [] : [];
            const unavailabilityData = unavailabilityRes.data && unavailabilityRes.data.success ? unavailabilityRes.data.data || [] : [];
            const personsData = personsRes.data && personsRes.data.success ? personsRes.data.data || [] : [];

            const normalizedCommunity = communityData.map((activity) => ({
                ...activity,
                event_title: activity.activity_name || 'Community Activity',
                event_type: activity.activity_type || 'Community',
                start_date: activity.start_date,
                end_date: activity.end_date,
                source: 'community',
            }));
            const normalizedUnavailability = unavailabilityData.map((item) => {
                const priest = personsData.find((person) => person.person_id == item.priest_id);
                const priestName = priest ? `${priest.first_name} ${priest.last_name}` : 'Priest';
                return {
                    ...item,
                    event_title: `${priestName} unavailable`,
                    event_type: 'Priest Unavailable',
                    start_datetime: `${item.unavailable_date}T00:00:00`,
                    location: item.reason,
                    status: 'Unavailable',
                    source: 'priest-unavailability',
                };
            });

            setEvents([...scheduleData, ...normalizedCommunity, ...normalizedUnavailability]);
            setError('');
        } catch {
            setError('Error fetching calendar events');
            setEvents([]);
        } finally {
            setLoading(false);
        }
    };

    const monthMeta = useMemo(() => {
        const firstOfMonth = new Date(year, month, 1);
        const startDay = new Date(firstOfMonth);
        startDay.setDate(1 - firstOfMonth.getDay()); // start from sunday
        const weeks = [];
        let current = new Date(startDay);
        for (let w = 0; w < 6; w++) {
            const week = [];
            for (let d = 0; d < 7; d++) {
                week.push(new Date(current));
                current.setDate(current.getDate() + 1);
            }
            weeks.push(week);
        }
        return { weeks };
    }, [year, month]);

    const eventsByDate = useMemo(() => {
        const map = {};
        events.forEach((event) => {
            const dateString = event.start_datetime || event.start_date;
            const key = formatSafeIsoDate(dateString);
            if (!key) return;
            map[key] = map[key] || [];
            map[key].push(event);
        });
        return map;
    }, [events]);

    const monthName = new Date(year, month, 1).toLocaleString(undefined, { month: 'long' });

    const getCalendarEventLabel = (event) => {
        const labels = {
            Wedding: 'Wedding',
            Baptism: 'Baptism',
            Confirmation: 'Confirmation',
            Communion: 'Communion',
            Funeral: 'Funeral',
            Burial: 'Burial',
            'Priest Unavailable': 'Priest unavailable',
        };
        return labels[event.event_type] || event.event_type || 'Event';
    };

    const openDay = (day) => {
        const key = formatSafeIsoDate(day);
        if (!key) return;
        setSelectedDate({ date: day, events: eventsByDate[key] || [] });
        setOpen(true);
    };

    return (
        <Card sx={{ p: 0, borderRadius: 3, border: '1px solid rgba(17, 75, 80, 0.1)', bgcolor: '#ffffff', width: '100%', maxHeight: 520, overflow: 'hidden', boxShadow: 'none' }}>
            <Box sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#123b50' }}>{monthName} {year}</Typography>
                        <Typography variant="caption" sx={{ color: '#7b8d8b' }}>Schedule calendar</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip label="Prev" size="small" onClick={() => {
                            const dt = new Date(year, month-1, 1);
                            setYear(dt.getFullYear()); setMonth(dt.getMonth());
                        }} sx={{ bgcolor: '#f1f6f4', color: '#315b61', fontWeight: 700 }} />
                        <Chip label="Next" size="small" onClick={() => {
                            const dt = new Date(year, month+1, 1);
                            setYear(dt.getFullYear()); setMonth(dt.getMonth());
                        }} sx={{ bgcolor: '#f1f6f4', color: '#315b61', fontWeight: 700 }} />
                    </Box>
                </Box>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
                ) : error ? (
                    <Typography variant="body2" sx={{ color: '#ef4444' }}>{error}</Typography>
                ) : (
                    <Box>
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 1 }}>
                            {weekdayNames.map((wd) => (
                                <Box key={wd} sx={{ p: 0.75, textAlign: 'center', bgcolor: '#e4f1ed', color: '#28636a', borderRadius: 1, fontWeight: 800, fontSize: '0.8rem' }}>{wd.slice(0,3)}</Box>
                            ))}
                        </Box>

                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
                            {monthMeta.weeks.slice(0,5).map((week) => (
                                week.map((day) => {
                                    const isCurrentMonth = day.getMonth() === month;
                                    const key = formatSafeIsoDate(day);
                                    const events = key ? eventsByDate[key] || [] : [];
                                    return (
                                        <Box
                                            key={key}
                                            onClick={() => openDay(day)}
                                            sx={{
                                                minHeight: 65,
                                                minWidth: 0,
                                                p: 1,
                                                borderRadius: 1.5,
                                                background: isCurrentMonth ? '#ffffff' : '#f7faf9',
                                                border: '1px solid rgba(17, 75, 80, 0.08)',
                                                cursor: 'pointer',
                                                overflow: 'hidden',
                                            }}
                                        >
                                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: isCurrentMonth ? '#1e293b' : '#94a3b8', fontSize: '0.9rem' }}>{day.getDate()}</Typography>
                                            <Box sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                {events.slice(0,3).map((e) => {
                                                    const style = typeColors[e.event_type] || { bg: '#d1fae5', color: '#166534' };
                                                    return (
                                                        <Chip
                                                            key={e.schedule_id || e.id || `community-${e.community_id}`}
                                                            label={getCalendarEventLabel(e)}
                                                            size="small"
                                                            sx={{
                                                                bgcolor: style.bg,
                                                                color: style.color,
                                                                fontWeight: 700,
                                                                width: '100%',
                                                                minWidth: 0,
                                                                height: 22,
                                                                overflow: 'hidden',
                                                                fontSize: '0.7rem',
                                                                '& .MuiChip-label': {
                                                                    display: 'block',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                    px: 0.75,
                                                                },
                                                            }}
                                                        />
                                                    );
                                                })}
                                            </Box>
                                        </Box>
                                    );
                                })
                            ))}
                        </Box>
                    </Box>
                )}
            </Box>

            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Events on {selectedDate ? selectedDate.date.toLocaleDateString() : ''}</span>
                    <IconButton onClick={() => setOpen(false)} size="small"><CloseIcon /></IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    {selectedDate && selectedDate.events.length === 0 && (
                        <Typography variant="body2">Walang naka-schedule na activities sa araw na ito.</Typography>
                    )}
                    {selectedDate && selectedDate.events.length > 0 && (
                        <List>
                            {selectedDate.events.map((e) => (
                                <ListItem key={e.schedule_id || e.id || `community-${e.community_id}`} sx={{ alignItems: 'flex-start' }}>
                                    <ListItemText
                                        primary={<Typography sx={{ fontWeight: 800 }}>{e.event_title}</Typography>}
                                        secondary={
                                            <>
                                                <Typography variant="body2">
                                                    {e.event_type} â€¢ {new Date(e.start_datetime || e.start_date).toLocaleString()}
                                                </Typography>
                                                {e.location && <Typography variant="body2">{e.source === 'priest-unavailability' ? `Reason: ${e.location}` : e.location}</Typography>}
                                                <Chip label={e.status || e.activity_type} size="small" sx={{ mt: 1, bgcolor: '#d1fae5', color: '#166534' }} />
                                            </>
                                        }
                                    />
                                </ListItem>
                            ))}
                        </List>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setOpen(false);
                        const dateKey = formatSafeIsoDate(selectedDate?.date);
                        navigate(dateKey ? `/schedules?date=${dateKey}` : '/schedules');
                    }} variant="contained">View All Schedules</Button>
                    <Button onClick={() => setOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Card>
    );
};

export default MonthCalendar;
