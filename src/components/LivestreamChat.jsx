import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Paper, Stack, TextField, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { livestreamChatAPI } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';

const LivestreamChat = ({ livestreamId, isLive = true }) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const messagesRef = useRef(null);

    const loadMessages = useCallback(async (showLoading = false) => {
        if (!livestreamId) return;
        if (showLoading) setLoading(true);
        try {
            const response = await livestreamChatAPI.getMessages({ livestream_id: livestreamId });
            if (response.data.success) setMessages(response.data.data || []);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Hindi ma-load ang live comments.');
        } finally {
            if (showLoading) setLoading(false);
        }
    }, [livestreamId]);

    useEffect(() => {
        loadMessages(true);
        if (!isLive) return undefined;
        const intervalId = window.setInterval(() => loadMessages(), 3000);
        return () => window.clearInterval(intervalId);
    }, [isLive, livestreamId, loadMessages]);

    useEffect(() => {
        if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }, [messages]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        const trimmedMessage = message.trim();
        if (!trimmedMessage || sending || !livestreamId) return;

        setSending(true);
        try {
            const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'Parish viewer';
            await livestreamChatAPI.postMessage({
                livestream_id: livestreamId,
                message: trimmedMessage,
                sender_user_id: user?.user_id || null,
                sender_name: displayName,
                sender_email: user?.email || null,
            });
            setMessage('');
            await loadMessages();
        } catch (err) {
            setError(err.response?.data?.message || 'Hindi naipadala ang comment.');
        } finally {
            setSending(false);
        }
    };

    return (
        <Box sx={{ mt: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Live comments</Typography>
            {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
            <Paper
                ref={messagesRef}
                variant="outlined"
                sx={{ p: 1.5, height: 220, overflowY: 'auto', bgcolor: '#f8fbfb' }}
            >
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress size={22} /></Box>
                ) : messages.length ? (
                    messages.map((item) => (
                        <Box key={item.chat_id} sx={{ mb: 1.25 }}>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: '#123b50' }}>
                                {item.sender_name || item.username || 'Parish viewer'}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#334e5b', wordBreak: 'break-word' }}>{item.message}</Typography>
                        </Box>
                    ))
                ) : (
                    <Typography variant="body2" sx={{ color: '#64748b', textAlign: 'center', py: 3 }}>
                        Wala pang comments. Maging unang mag-comment.
                    </Typography>
                )}
            </Paper>
            {isLive ? (
                <Stack component="form" onSubmit={handleSubmit} direction="row" spacing={1} sx={{ mt: 1 }}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Magsulat ng comment..."
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        inputProps={{ maxLength: 500 }}
                    />
                    <Button type="submit" variant="contained" disabled={sending || !message.trim()} endIcon={<SendIcon />} sx={{ minWidth: 110 }}>
                        Send
                    </Button>
                </Stack>
            ) : (
                <Typography variant="body2" sx={{ color: '#64748b', mt: 1 }}>Sarado na ang comments dahil tapos na ang live.</Typography>
            )}
        </Box>
    );
};

export default LivestreamChat;
