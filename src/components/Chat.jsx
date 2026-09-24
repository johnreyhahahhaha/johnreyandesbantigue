import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Container,
    Typography,
    TextField,
    Button,
    Paper,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Badge,
    MenuItem,
    CircularProgress,
    IconButton,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL, attachmentAPI, chatAPI } from '../api/apiClient';

const Chat = () => {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [targetUserId, setTargetUserId] = useState(null);
    const [filterRole, setFilterRole] = useState('');
    const [users, setUsers] = useState([]);

    const isOnline = (u) => {
        if (!u?.last_login) return false;
        const diff = Date.now() - new Date(u.last_login).getTime();
        return diff < 5 * 60 * 1000;
    };

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [attachmentFile, setAttachmentFile] = useState(null);
    const [attachmentPreview, setAttachmentPreview] = useState(null);
    const [uploadingAttachment, setUploadingAttachment] = useState(false);
    const [attachmentError, setAttachmentError] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);

    const loadUsers = async () => {
        try {
            const resp = await chatAPI.getUserList();
            if (resp.data.success) {
                const list = resp.data.core?.users || [];
                const enhanced = list.map((u) => ({ ...u, online: isOnline(u) }));
                setUsers(enhanced);
            }
        } catch (e) {
            console.error('Failed to load users for chat selector', e);
        }
    };

    const fetchMessages = async () => {
        if (!user?.user_id) return;
        
        // KAHIT WALANG TARGET USER ID: Subukan pa ring humatak kung may default dashboard context
        if (!targetUserId) {
            setMessages([]);
            setLoading(false);
            return;
        }

        try {
            const params = {
                user_id: Number(user.user_id),
                recipient_id: Number(targetUserId),
            };
            const response = await chatAPI.getMessages(params);
            if (response.data.success) {
                setMessages(response.data.data || []);
            }
        } catch (err) {
            console.error('Error fetching chat messages', err);
        } finally {
            setLoading(false);
        }
    };

    // EFFECT 1: Pag-load ng system users list
    useEffect(() => {
        loadUsers();
        const uInterval = setInterval(loadUsers, 60_000);
        return () => clearInterval(uInterval);
    }, []);

    // EFFECT 2: Awtomatikong basahin ang "?user=ID" galing sa browser link (gaya ng dashboard/notification click)
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const userParam = queryParams.get('user');
        if (userParam) {
            const parsedId = Number(userParam);
            if (parsedId !== user?.user_id) {
                setTargetUserId(parsedId);
            }
        }
    }, [location.search, user?.user_id]);

    // EFFECT 3: Real-time update ng mensahe kapag may ka-chat na
    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 3000);
        return () => clearInterval(interval);
    }, [targetUserId, user?.user_id]);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const getFileUrl = (filePath) => {
        if (!filePath) return '';
        if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
            return filePath;
        }
        const publicBase = new URL('../', API_BASE_URL).href;
        return new URL(filePath, publicBase).href;
    };

    const parseChatMessage = (msg) => {
        if (!msg?.message) {
            return { text: '', attachment: null };
        }

        try {
            const parsed = JSON.parse(msg.message);
            if (parsed && (parsed.text !== undefined || parsed.attachment !== undefined)) {
                return {
                    text: parsed.text || '',
                    attachment: parsed.attachment || null,
                };
            }
        } catch (error) {
            // Not JSON, use raw string
        }

        return { text: msg.message, attachment: null };
    };

    const handleAttachmentSelected = (event) => {
        const file = event.target.files?.[0] || null;
        setAttachmentError('');
        if (!file) {
            setAttachmentFile(null);
            setAttachmentPreview(null);
            return;
        }

        if (file.size > 50 * 1024 * 1024) {
            setAttachmentError('File size must be 50MB or less.');
            setAttachmentFile(null);
            setAttachmentPreview(null);
            return;
        }

        setAttachmentFile(file);
        if (file.type.startsWith('image/')) {
            setAttachmentPreview(URL.createObjectURL(file));
        } else {
            setAttachmentPreview(null);
        }
    };

    const uploadAttachment = async () => {
        if (!attachmentFile) return null;
        const formData = new FormData();
        formData.append('file', attachmentFile);
        formData.append('file_name', attachmentFile.name);
        formData.append('record_type', 'Chat');
        if (user?.person_id) {
            formData.append('person_id', user.person_id);
        }

        try {
            setUploadingAttachment(true);
            const resp = await attachmentAPI.upload(formData);
            if (resp.data && resp.data.success) {
                const filePath = resp.data.file_path || '';
                return {
                    url: getFileUrl(filePath),
                    name: attachmentFile.name,
                    type: attachmentFile.type,
                    file_path: filePath,
                };
            }
            setAttachmentError(resp.data?.message || 'Attachment upload failed');
            return null;
        } catch (err) {
            console.error('Attachment upload failed', err);
            setAttachmentError(err.response?.data?.message || err.message || 'Attachment upload failed');
            return null;
        } finally {
            setUploadingAttachment(false);
        }
    };

    const handleSend = async () => {
        const trimmed = newMessage.trim();
        if (!trimmed && !attachmentFile) return;
        if (!targetUserId) return;

        let messagePayload;
        if (attachmentFile) {
            const uploaded = await uploadAttachment();
            if (!uploaded) {
                return;
            }
            messagePayload = {
                sender_id: user?.user_id,
                recipient_id: targetUserId,
                message: JSON.stringify({ text: trimmed, attachment: uploaded }),
            };
        } else {
            messagePayload = {
                sender_id: user?.user_id,
                recipient_id: targetUserId,
                message: trimmed,
            };
        }
        try {
            const res = await chatAPI.sendMessage(messagePayload);
            if (res.data.success) {
                setNewMessage('');
                setAttachmentFile(null);
                setAttachmentPreview(null);
                setAttachmentError('');
                fetchMessages();
            }
        } catch (err) {
            console.error('Error sending chat message', err);
        }
    };

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#edf3f1' }}>
            <Box sx={{ py: { xs: 2.5, md: 3 }, background: 'linear-gradient(110deg, #123b50 0%, #0b6b68 70%, #d1a557 155%)', boxShadow: '0 12px 26px rgba(13, 70, 76, 0.14)' }}>
                <Container maxWidth="md">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <IconButton
                            onClick={() => navigate('/dashboard')}
                            aria-label="Back to dashboard"
                            sx={{ backgroundColor: 'rgba(255,255,255,0.14)', color: 'white', '&:hover': { backgroundColor: 'rgba(255,255,255,0.24)' } }}
                        >
                            <ArrowBackIcon />
                        </IconButton>
                        <Box>
                            <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: '0.12em' }}>
                                Parish communication
                            </Typography>
                            <Typography variant="h4" component="h1" sx={{ fontWeight: 800, color: 'white', lineHeight: 1.15 }}>
                                Direct Message
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.78)', mt: 0.5 }}>
                                {targetUserId ? (() => {
                                    const u = users.find(x => x.user_id === targetUserId);
                                    return u ? `Conversation with ${u.first_name} ${u.last_name} (${u.user_role})` : '';
                                })() : 'Choose a person to message'}
                            </Typography>
                        </Box>
                    </Box>
                </Container>
            </Box>

            <Container maxWidth="md" sx={{ py: { xs: 3, md: 4 } }}>
                <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, border: '1px solid rgba(17, 75, 80, 0.1)', boxShadow: '0 8px 24px rgba(26, 67, 74, 0.06)' }}>
                    <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography sx={{ fontWeight: 700, color: '#123b50' }}>Role filter:</Typography>
                        <TextField
                            select
                            size="small"
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value)}
                            SelectProps={{ native: true }}
                            sx={{ minWidth: 180 }}
                        >
                            <option value="">(all)</option>
                            <option value="Admin">Admin</option>
                            <option value="Priest">Priest</option>
                            <option value="Secretary">Secretary</option>
                            <option value="Treasurer">Treasurer</option>
                        </TextField>
                    </Box>

                    <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography sx={{ fontWeight: 700, color: '#123b50' }}>To:</Typography>
                        <TextField
                            select
                            size="small"
                            value={targetUserId || ''}
                            onChange={(e) => setTargetUserId(Number(e.target.value) || null)}
                            sx={{ minWidth: 240, flex: 1 }}
                        >
                            <MenuItem value="">
                                <em>None</em>
                            </MenuItem>
                            {users
                                .filter((u) => u.user_id !== user?.user_id)
                                .filter((u) => !filterRole || u.user_role === filterRole)
                                .map((u) => (
                                    <MenuItem key={u.user_id} value={u.user_id}>
                                        <Badge
                                            color={u.online ? 'success' : 'default'}
                                            variant="dot"
                                            overlap="circular"
                                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                        >
                                            <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                                                {u.first_name?.[0] || ''}{u.last_name?.[0] || ''}
                                            </Avatar>
                                        </Badge>
                                        <Box sx={{ ml: 1 }}>
                                            {u.first_name} {u.last_name} ({u.user_role})
                                        </Box>
                                    </MenuItem>
                                ))}
                        </TextField>
                    </Box>

                    <Paper sx={{ height: 400, overflowY: 'auto', p: 2, mb: 2, borderRadius: 3, backgroundColor: '#f8fafc', border: '1px solid rgba(17, 75, 80, 0.08)' }}>
                        {loading && messages.length === 0 ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
                                <CircularProgress />
                            </Box>
                        ) : messages.length === 0 ? (
                            <Typography color="textSecondary" align="center" sx={{ mt: 4 }}>
                                No messages yet.
                            </Typography>
                        ) : (
                            <List>
                                {messages.map((msg) => {
                                    const isMe = msg.sender_id === user?.user_id;
                                    return (
                                        <ListItem key={msg.msg_id} alignItems="flex-start">
                                            <ListItemAvatar>
                                                <Badge
                                                    color={isOnline({ last_login: msg.sender_last_login }) ? 'success' : 'default'}
                                                    variant="dot"
                                                    overlap="circular"
                                                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                                >
                                                    <Avatar sx={{ width: 32, height: 32 }}>
                                                        {msg.first_name ? msg.first_name[0] : '?'}
                                                    </Avatar>
                                                </Badge>
                                            </ListItemAvatar>
                                            <ListItemText
                                                primary={
                                                    <>
                                                        <strong>{[msg.first_name, msg.last_name].filter(Boolean).join(' ') || 'Unknown'}</strong>{' '}
                                                        <Typography component="span" variant="caption" color="textSecondary">
                                                            {msg.sent_at ? new Date(msg.sent_at).toLocaleTimeString() : ''}
                                                        </Typography>
                                                    </>
                                                }
                                                secondary={
                                                    (() => {
                                                        const parsed = parseChatMessage(msg);
                                                        return (
                                                            <Box sx={{ display: 'grid', gap: 1 }}>
                                                                {parsed.text ? (
                                                                    <Typography component="span" variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                                                        {parsed.text}
                                                                    </Typography>
                                                                ) : null}
                                                                {parsed.attachment ? (
                                                                    <Box sx={{ mt: 1 }}>
                                                                        {parsed.attachment.type?.startsWith('image/') ? (
                                                                            <Box component="img"
                                                                                src={parsed.attachment.url}
                                                                                alt={parsed.attachment.name || 'Image attachment'}
                                                                                sx={{ maxWidth: 320, borderRadius: 2, border: '1px solid #cbd5e1' }}
                                                                            />
                                                                        ) : (
                                                                            <Button
                                                                                component="a"
                                                                                href={parsed.attachment.url}
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                                variant="outlined"
                                                                                size="small"
                                                                            >
                                                                                Download {parsed.attachment.name || 'attachment'}
                                                                            </Button>
                                                                        )}
                                                                    </Box>
                                                                ) : null}
                                                            </Box>
                                                        );
                                                    })()
                                                }
                                            />
                                        </ListItem>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </List>
                        )}
                    </Paper>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1 }}>
                        <input
                            accept="*/*"
                            style={{ display: 'none' }}
                            id="chat-file-input"
                            type="file"
                            onChange={handleAttachmentSelected}
                        />
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                            <label htmlFor="chat-file-input">
                                <Button component="span" variant="outlined" size="small" sx={{ borderRadius: 2, fontWeight: 700 }}>
                                    Attach file
                                </Button>
                            </label>
                            {attachmentFile ? (
                                <Typography variant="body2" sx={{ color: '#475569' }}>
                                    {attachmentFile.name} {attachmentFile.type ? `(${attachmentFile.type})` : ''}
                                </Typography>
                            ) : (
                                <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                                    Attach a file or image with your message.
                                </Typography>
                            )}
                            {uploadingAttachment && (
                                <Typography variant="body2" sx={{ color: '#0f172a' }}>
                                    Uploading attachment...
                                </Typography>
                            )}
                        </Box>
                        {attachmentPreview && (
                            <Box component="img" src={attachmentPreview} alt="Attachment preview" sx={{ maxWidth: '100%', borderRadius: 2, border: '1px solid #cbd5e1' }} />
                        )}
                        {attachmentError && (
                            <Typography variant="body2" sx={{ color: '#dc2626' }}>{attachmentError}</Typography>
                        )}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField
                            fullWidth
                            placeholder="Type a message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            sx={{ backgroundColor: '#fff', borderRadius: 2 }}
                        />
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleSend}
                            endIcon={<SendIcon />}
                            disabled={(!newMessage.trim() && !attachmentFile) || !targetUserId || uploadingAttachment}
                            sx={{ borderRadius: 2, px: 2.5, fontWeight: 700 }}
                        >
                            Send
                        </Button>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
};

export default Chat;