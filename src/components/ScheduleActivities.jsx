import React, { useState, useEffect } from 'react';
import { Card, Typography, Box, Chip, CircularProgress } from '@mui/material';
import axios from 'axios';

const API_BASE_URL = 'http://165.22.181.147/api';

const ScheduleActivities = () => {
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchSchedules();
    }, []);

    const fetchSchedules = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/schedules.php`);
            const data = res.data && res.data.success ? res.data.data || [] : [];
            // sort by start_datetime ascending
            data.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
            setSchedules(data);
            setError('');
        } catch (err) {
            setError('Error fetching schedules');
            setSchedules([]);
        } finally {
            setLoading(false);
        }
    };

    const formatDateTime = (dt) => {
        if (!dt) return '';
        try {
            return new Date(dt).toLocaleString();
        } catch {
            return dt;
        }
    };

    return (
        <Card sx={{ p: 3, borderRadius: 3, border: '1px solid rgba(148, 163, 184, 0.18)', bgcolor: '#ffffff', height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>
                Schedule of Activities
            </Typography>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={24} />
                </Box>
            ) : error ? (
                <Typography variant="body2" sx={{ color: '#ef4444' }}>{error}</Typography>
            ) : schedules.length === 0 ? (
                <Typography variant="body2" sx={{ color: '#64748b' }}>Walang naka-schedule na aktibidad.</Typography>
            ) : (
                <Box>
                    {schedules.slice(0, 8).map((s) => (
                        <Box key={s.schedule_id} sx={{ mb: 2, p: 2, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid rgba(148, 163, 184, 0.08)' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                                {s.event_title || 'Untitled'}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#475569', mb: 1 }}>
                                {s.event_type || 'Event'} â€¢ {formatDateTime(s.start_datetime)}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <Chip label={s.status || 'Scheduled'} size="small" sx={{ bgcolor: '#d1fae5', color: '#166534' }} />
                                {s.location && <Chip label={s.location} size="small" sx={{ bgcolor: '#eef2ff', color: '#3730a3' }} />}
                            </Box>
                        </Box>
                    ))}
                    {schedules.length > 8 && (
                        <Typography variant="caption" sx={{ color: '#64748b' }}>Ipakita pa ang iba sa Schedules page.</Typography>
                    )}
                </Box>
            )}
        </Card>
    );
};

export default ScheduleActivities;
