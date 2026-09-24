import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    IconButton,
    Badge,
    Popover,
    Box,
    Typography,
    List,
    ListItem,
    ListItemText,
    Divider,
    Button,
    CircularProgress,
    Chip,
} from '@mui/material';
import {
    Notifications as NotificationsIcon,
    Close as CloseIcon,
    Delete as DeleteIcon,
    DoneAll as DoneAllIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { notificationAPI } from '../api/apiClient';
import { setAppBadge, clearAppBadge } from '../utils/appBadge';

const NotificationBell = ({ categories = null, excludeCategories = [], title = 'Notifications', emptyMessage = 'No notifications yet', icon: Icon = NotificationsIcon, manageAppBadge = true, onIconClick = null }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const eventSourceRef = useRef(null);

    const handleNavigateNotification = (actionUrl) => {
        if (!actionUrl) return;
        const url = actionUrl.startsWith('/') ? actionUrl : `/${actionUrl}`;
        navigate(url);
        handleClose();
    };

    useEffect(() => {
        const updateBadge = async () => {
            if (unreadCount > 0) {
                await setAppBadge(unreadCount)
            } else {
                await clearAppBadge()
            }
        }

        if (manageAppBadge) {
            updateBadge()
        }
    }, [unreadCount, manageAppBadge])

    // Fetch notifications on component mount and subscribe to realtime updates
    useEffect(() => {
        if (!user?.person_id) return;

        fetchNotifications();
        const source = notificationAPI.subscribe(
            user.person_id,
            (payload) => {
                if (payload?.success) {
                    const filteredNotifications = normalizeNotifications(payload.data || []);
                    setNotifications(filteredNotifications);
                    setUnreadCount(filteredNotifications.filter((notification) => notification.is_read === 0).length);
                }
            },
            (error) => {
                if (error instanceof Error) {
                    console.error('Notification stream error:', error);
                } else {
                }
            }
        );

        eventSourceRef.current = source;
        return () => {
            notificationAPI.unsubscribe(eventSourceRef.current);
        };
    }, [user?.person_id]);

    const toTitleCase = (value) => {
        if (!value) return '';
        const lowercaseWords = new Set(['sa', 'ng', 'at', 'and', 'of', 'the', 'a', 'an']);
        return String(value)
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .map((part) => {
                if (part === '&') return '&';
                const lower = part.toLowerCase();
                return lowercaseWords.has(lower) ? lower : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
            })
            .join(' ');
    };

    const cleanNotificationText = (text) => {
        if (!text) return '';
        let cleanText = String(text).replace(/\s*\[[^\]]+\]\s*/g, ' ');
        cleanText = cleanText.replace(/\s+/g, ' ').trim();

        const separatorIndex = cleanText.indexOf(' - ');
        if (separatorIndex !== -1) {
            const prefix = cleanText.slice(0, separatorIndex + 3);
            const suffix = cleanText.slice(separatorIndex + 3);
            const match = suffix.match(/^(.*?)(\s+sa\s+.*)$/i);
            if (match) {
                cleanText = `${prefix}${toTitleCase(match[1])}${match[2]}`;
            } else {
                cleanText = `${prefix}${toTitleCase(suffix)}`;
            }
        }

        return cleanText;
    };

    const normalizeNotifications = (items) => {
        return items
            .filter((notif) => {
                const notificationCategory = String(notif.category || '').toLowerCase();
                const included = !categories || categories.some((category) => notificationCategory === String(category).toLowerCase());
                const excluded = excludeCategories.some((category) => notificationCategory === String(category).toLowerCase());
                return included && !excluded;
            })
            .map((notif) => ({
                ...notif,
                message_body: cleanNotificationText(notif.message_body),
                is_read: Number(notif.is_read),
            }));
    };

    const fetchNotifications = async () => {
        if (!user?.person_id) return;

        try {
            setRefreshing(true);
            const response = await notificationAPI.fetchNotifications(user.person_id, { limit: 0 });

            if (response.data.success) {
                const filteredNotifications = normalizeNotifications(response.data.data || []);
                setNotifications(filteredNotifications);
                setUnreadCount(filteredNotifications.filter((notification) => notification.is_read === 0).length);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setRefreshing(false);
        }
    };

    const handleBellClick = (event) => {
        setAnchorEl(event.currentTarget);
        setLoading(true);
        fetchNotifications().finally(() => setLoading(false));
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleMarkAsRead = async (notifId) => {
        try {
            const response = await notificationAPI.markAsRead(notifId);

            if (response.data.success) {
                setNotifications(notifications.map(n =>
                    n.notif_id === notifId ? { ...n, is_read: 1 } : n
                ));
                setUnreadCount(Math.max(0, unreadCount - 1));
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            const unreadNotifications = notifications.filter((n) => n.is_read === 0);
            if (unreadNotifications.length === 0) {
                return;
            }

            // Immediately update UI
            setNotifications((prevNotifications) =>
                prevNotifications.map((notif) => ({ ...notif, is_read: 1 }))
            );
            setUnreadCount(0);

            // Call API in background
            const results = await Promise.allSettled(
                unreadNotifications.map((notif) => notificationAPI.markAsRead(notif.notif_id))
            );

            const allSucceeded = results.every((result) => {
                return result.status === 'fulfilled' && result.value?.data?.success;
            });

            if (allSucceeded) {
                // Success - badge already cleared
            } else {
                // If any failed, refetch to sync state
                await fetchNotifications();
            }
        } catch (error) {
            console.error('Error marking all as read:', error);
            // Refetch on error to sync state
            await fetchNotifications();
        }
    };

    const handleDelete = async (notifId) => {
        try {
            const response = await notificationAPI.deleteNotification(notifId);

            if (response.data.success) {
                const deletedNotification = notifications.find((n) => n.notif_id === notifId);
                setNotifications(notifications.filter((n) => n.notif_id !== notifId));
                if (Number(deletedNotification?.is_read) === 0) {
                    setUnreadCount(Math.max(0, unreadCount - 1));
                }
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const handleClearAll = async () => {
        try {
            for (const notif of notifications) {
                await notificationAPI.deleteNotification(notif.notif_id);
            }
            setNotifications([]);
            setUnreadCount(0);
        } catch (error) {
            console.error('Error clearing notifications:', error);
        }
    };

    const open = Boolean(anchorEl);

    const getNotificationColor = (category) => {
        const colors = {
            'System': 'default',
            'Alert': 'error',
            'Info': 'info',
            'Success': 'success',
            'Warning': 'warning',
            'General': 'default',
        };
        return colors[category] || 'default';
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <>
            <IconButton
                color="inherit"
                onClick={onIconClick || handleBellClick}
                sx={{
                    mr: 1,
                    position: 'relative',
                    width: { xs: 34, sm: 40 },
                    height: { xs: 34, sm: 40 },
                    borderRadius: 2,
                    color: 'inherit',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.12)',
                    },
                    '& .MuiSvgIcon-root': {
                        fontSize: { xs: 18, sm: 22 },
                    },
                }}
            >
                <Badge
                    badgeContent={unreadCount > 0 ? unreadCount : null}
                    color="error"
                    showZero={false}
                    invisible={unreadCount === 0}
                    max={99}
                    sx={{
                        '& .MuiBadge-badge': {
                            minWidth: 18,
                            height: 18,
                            padding: '0 5px',
                            borderRadius: 10,
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            color: '#ffffff',
                            border: '2px solid rgba(255, 255, 255, 0.95)',
                            boxShadow: 'none',
                            top: 3,
                            right: 4,
                        },
                    }}
                >
                    <Icon sx={{ color: 'currentColor' }} />
                </Badge>
            </IconButton>

            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
                PaperProps={{
                    sx: {
                        width: 380,
                        maxHeight: 500,
                        mt: 1,
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                    },
                }}
            >
                {/* Header */}
                <Box
                    sx={{
                        p: 2,
                        background: 'linear-gradient(135deg, #1e3a8a 0%, #0f766e 100%)',
                        color: 'white',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            {title}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.9 }}>
                            {unreadCount} unread
                        </Typography>
                    </Box>
                    <IconButton
                        size="small"
                        onClick={handleClose}
                        sx={{ color: 'white' }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>

                {/* Content */}
                <Box sx={{ height: 350, overflowY: 'auto' }}>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            <CircularProgress />
                        </Box>
                    ) : notifications.length === 0 ? (
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                            <Icon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
                            <Typography color="textSecondary">
                                {emptyMessage}
                            </Typography>
                        </Box>
                    ) : (
                        <List sx={{ py: 0 }}>
                            {notifications.map((notif, index) => (
                                <React.Fragment key={notif.notif_id}>
                                    <ListItem
                                        button
                                        onClick={() => notif.action_url && handleNavigateNotification(notif.action_url)}
                                        sx={{
                                            bgcolor: notif.is_read ? 'white' : '#eff6ff',
                                            borderLeft: notif.is_read ? 'none' : '4px solid #3b82f6',
                                            py: 1.5,
                                            '&:hover': {
                                                bgcolor: '#f8fafc',
                                            },
                                            cursor: notif.action_url ? 'pointer' : 'default',
                                        }}
                                    >
                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 0.5 }}>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            fontWeight: notif.is_read ? 400 : 700,
                                                            color: '#1e293b',
                                                            flex: 1,
                                                        }}
                                                    >
                                                        {cleanNotificationText(notif.message_body)}
                                                    </Typography>
                                                    {notif.category && (
                                                        <Chip
                                                            label={notif.category}
                                                            size="small"
                                                            color={getNotificationColor(notif.category)}
                                                            variant="outlined"
                                                        />
                                                    )}
                                                </Box>
                                            }
                                            secondary={
                                                <Typography variant="caption" sx={{ color: '#64748b' }}>
                                                    {formatTime(notif.sent_at)}
                                                </Typography>
                                            }
                                        />
                                        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 0.5, ml: 1 }}>
                                            {!notif.is_read && (
                                                <IconButton
                                                    size="small"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        handleMarkAsRead(notif.notif_id);
                                                    }}
                                                    sx={{ color: '#3b82f6' }}
                                                    title="Mark as read"
                                                >
                                                    <DoneAllIcon fontSize="small" />
                                                </IconButton>
                                            )}
                                            <IconButton
                                                size="small"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    handleDelete(notif.notif_id);
                                                }}
                                                sx={{ color: '#64748b', '&:hover': { color: '#ef4444' } }}
                                                title="Delete"
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    </ListItem>
                                    {index < notifications.length - 1 && <Divider />}
                                </React.Fragment>
                            ))}
                        </List>
                    )}
                </Box>

                {/* Footer */}
                {notifications.length > 0 && (
                    <>
                        <Divider />
                        <Box sx={{ p: 1.5, display: 'flex', gap: 1 }}>
                            <Button
                                size="small"
                                variant="text"
                                fullWidth
                                onClick={handleMarkAllAsRead}
                                disabled={unreadCount === 0}
                            >
                                Mark all as read
                            </Button>
                            <Button
                                size="small"
                                variant="text"
                                fullWidth
                                color="error"
                                onClick={handleClearAll}
                            >
                                Clear all
                            </Button>
                        </Box>
                    </>
                )}
            </Popover>
        </>
    );
};

export default NotificationBell;
