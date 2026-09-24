import axios from 'axios';

export const API_BASE_URL = 'http://localhost/josephus/st.joseph/public/api';

// Create axios instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add request interceptor to include user_id in all requests (except login)
apiClient.interceptors.request.use(
    (config) => {
        // Don't modify login requests - they don't need user_id yet
        if (config.url && config.url.includes('/login.php')) {
            return config;
        }

        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.user_id) {
            // Add user_id to request data for POST and PUT requests
            if (config.method === 'post' || config.method === 'put') {
                if (config.data instanceof FormData) {
                    config.data.append('user_id', user.user_id);
                    // Let axios set the proper multipart/form-data boundary header automatically.
                    if (config.headers) {
                        delete config.headers['Content-Type'];
                        delete config.headers['content-type'];
                    }
                } else {
                    config.data = config.data ? { ...config.data, user_id: user.user_id } : { user_id: user.user_id };
                }
            }
            // Add user_id to params for GET and DELETE requests
            if (config.method === 'get' || config.method === 'delete') {
                config.params = config.params ? { ...config.params, user_id: user.user_id } : { user_id: user.user_id };
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Authentication APIs
export const authAPI = {
    login: (username, password) => 
        apiClient.post('/login.php', { username, password }),
    
    logout: () => {
        localStorage.removeItem('user');
        return Promise.resolve();
    },
};

// User APIs
export const userAPI = {
    getProfile: (userId) => 
        apiClient.get('/profile.php', { params: { user_id: userId } }),
    
    getAllUsers: () => 
        apiClient.get('/users.php'),
};

// Person APIs
export const personAPI = {
    getAllPersons: () =>
        apiClient.get('/persons.php'),
    
    getPersonById: (personId) =>
        apiClient.get('/persons.php', { params: { person_id: personId } }),
    
    createPerson: (data) =>
        apiClient.post('/persons.php', data),
    
    updatePerson: (personId, data) =>
        apiClient.put('/persons.php', { ...data, person_id: personId }),
    
    deletePerson: (personId) =>
        apiClient.delete('/persons.php', { params: { person_id: personId } }),
};

// Sacrament APIs
export const sacramentAPI = {
    getBaptisms: () =>
        apiClient.get('/sacraments.php', { params: { type: 'baptism' } }),
    
    getMarriages: () =>
        apiClient.get('/sacraments.php', { params: { type: 'marriage' } }),
    
    getConfirmations: () =>
        apiClient.get('/sacraments.php', { params: { type: 'confirmation' } }),
    
    createBaptism: (data) =>
        apiClient.post('/sacraments.php', { ...data, type: 'baptism' }),
    
    createMarriage: (data) =>
        apiClient.post('/sacraments.php', { ...data, type: 'marriage' }),
    
    createConfirmation: (data) =>
        apiClient.post('/sacraments.php', { ...data, type: 'confirmation' }),
};

// Finance APIs
// Keep all finance-related donation flows on the shared finances endpoint so
// person contributions and parish finance records are stored and retrieved from
// the same source of truth.
export const financeAPI = {
    getDonations: () =>
        apiClient.get('/finances.php', { params: { type: 'donations' } }),
    
    getMassIntentions: () =>
        apiClient.get('/finances.php', { params: { type: 'mass_intentions' } }),
    
    getLedger: () =>
        apiClient.get('/finances.php', { params: { type: 'ledger' } }),
    
    createDonation: (data) =>
        apiClient.post('/finances.php', { ...data, type: 'donation' }),
    
    createMassIntention: (data) =>
        apiClient.post('/finances.php', { ...data, type: 'mass_intention' }),
    
    addLedgerEntry: (data) =>
        apiClient.post('/finances.php', { ...data, type: 'ledger' }),
};

// Schedule APIs
export const scheduleAPI = {
    getAllSchedules: () =>
        apiClient.get('/schedules.php'),
    
    createSchedule: (data) =>
        apiClient.post('/schedules.php', data),
    
    updateSchedule: (scheduleId, data) =>
        apiClient.put(`/schedules.php?id=${scheduleId}`, data),
    
    deleteSchedule: (scheduleId) =>
        apiClient.delete(`/schedules.php?id=${scheduleId}`),
};

// Livestream APIs
export const livestreamAPI = {
    getAll: () => apiClient.get('/livestreams.php'),
    getById: (id) => apiClient.get('/livestreams.php', { params: { id } }),
    create: (data) => apiClient.post('/livestreams.php', data),
    update: (id, data) => apiClient.put(`/livestreams.php?id=${id}`, data),
    delete: (id) => apiClient.delete(`/livestreams.php`, { params: { id } }),
};

export const livestreamAccessAPI = {
    getAll: () => apiClient.get('/livestream_access_control.php'),
    getById: (id) => apiClient.get('/livestream_access_control.php', { params: { id } }),
    create: (data) => apiClient.post('/livestream_access_control.php', data),
    update: (id, data) => apiClient.put(`/livestream_access_control.php?id=${id}`, data),
    delete: (id) => apiClient.delete('/livestream_access_control.php', { params: { id } }),
};

export const livestreamChatAPI = {
    getMessages: (params) => apiClient.get('/livestream_chat.php', { params }),
    postMessage: (data) => apiClient.post('/livestream_chat.php', data),
    updateMessage: (id, data) => apiClient.put(`/livestream_chat.php?id=${id}`, data),
    deleteMessage: (id) => apiClient.delete('/livestream_chat.php', { params: { id } }),
};

export const livestreamViewersAPI = {
    getAll: (params) => apiClient.get('/livestream_viewers.php', { params }),
    addViewer: (data) => apiClient.post('/livestream_viewers.php', data),
    updateViewer: (id, data) => apiClient.put(`/livestream_viewers.php?id=${id}`, data),
    deleteViewer: (id) => apiClient.delete('/livestream_viewers.php', { params: { id } }),
};

export const livestreamRecordingsAPI = {
    getAll: (params) => apiClient.get('/livestream_recordings.php', { params }),
    create: (data) => apiClient.post('/livestream_recordings.php', data),
    update: (id, data) => apiClient.put(`/livestream_recordings.php?id=${id}`, data),
    delete: (id) => apiClient.delete('/livestream_recordings.php', { params: { id } }),
};

export const livestreamNotificationsAPI = {
    getAll: (params) => apiClient.get('/livestream_notifications.php', { params }),
    create: (data) => apiClient.post('/livestream_notifications.php', data),
    update: (id, data) => apiClient.put(`/livestream_notifications.php?id=${id}`, data),
    delete: (id) => apiClient.delete('/livestream_notifications.php', { params: { id } }),
};

export const livestreamStatisticsAPI = {
    getAll: (params) => apiClient.get('/livestream_statistics.php', { params }),
    create: (data) => apiClient.post('/livestream_statistics.php', data),
    update: (id, data) => apiClient.put(`/livestream_statistics.php?id=${id}`, data),
    delete: (id) => apiClient.delete('/livestream_statistics.php', { params: { id } }),
};

// Document Request APIs
export const documentAPI = {
    getAllRequests: (params = {}) =>
        apiClient.get('/document-requests.php', { params }),
    
    createRequest: (data) =>
        apiClient.post('/document-requests.php', data),
    
    updateRequestStatus: (requestId, status) =>
        apiClient.put('/document-requests.php', { request_id: requestId, status }),
};

// Community APIs
export const communityAPI = {
    getVolunteers: () =>
        apiClient.get('/community.php', { params: { type: 'volunteers' } }),
    
    getMinistries: () =>
        apiClient.get('/community.php', { params: { type: 'ministries' } }),
    
    addVolunteer: (data) =>
        apiClient.post('/community.php', { ...data, type: 'volunteer' }),
};

// Audit Log APIs
export const auditAPI = {
    getLogs: () =>
        apiClient.get('/audit-logs.php'),
    
    getLogsByUser: (userId) =>
        apiClient.get('/audit-logs.php', { params: { user_id: userId } }),
};

// Asset APIs
export const assetAPI = {
    getAllAssets: () =>
        apiClient.get('/assets.php'),
    
    createAsset: (data) =>
        apiClient.post('/assets.php', data),
    
    updateAsset: (assetId, data) =>
        apiClient.put('/assets.php', { ...data, asset_id: assetId }),

    deleteAsset: (assetId) =>
        apiClient.delete('/assets.php', { params: { id: assetId } }),

    // maintenance endpoints
    getMaintenance: () =>
        apiClient.get('/assets.php', { params: { type: 'maintenance' } }),
    addMaintenance: (data) =>
        apiClient.post('/assets.php?type=maintenance', data),
    updateMaintenance: (data) =>
        apiClient.put('/assets.php?type=maintenance', data),
    deleteMaintenance: (maintId) =>
        apiClient.delete('/assets.php', { params: { type: 'maintenance', id: maintId } }),
};

// Admin APIs
export const adminAPI = {
    getAllData: () =>
        apiClient.get('/admin-data.php'),
    
    getDiagnostics: () =>
        apiClient.get('/admin-diagnostics.php'),
};

// Chat APIs
export const chatAPI = {
    // params: { room, user_id, recipient_id }
    getMessages: (params) => apiClient.get('/chat.php', { params }),
    // data: { sender_id, recipient_id?, room?, message }
    sendMessage: (data) => apiClient.post('/chat.php', data),
    // helper to load system user list for direct message selectors
    getUserList: () => apiClient.get('/admin-data.php'),
};

export const attachmentAPI = {
    upload: (formData) => apiClient.post('/file-attachments.php', formData),
};

// Notification APIs
export const notificationAPI = {
    // personId: optional; if omitted, will try to read from localStorage.user.person_id
    fetchNotifications: (personId, options = {}) => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const pid = personId || user.person_id || null;
        const params = { person_id: pid };
        params.limit = options.limit !== undefined ? options.limit : 50;
        if (options.filter) params.filter = options.filter; // 'unread' | 'read' | 'all'
        return apiClient.get('/user-notifications.php', { params });
    },

    getUnreadCount: (personId) => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const pid = personId || user.person_id || null;
        return apiClient.get('/user-notifications.php', { params: { person_id: pid, limit: 0 } })
            .then(res => res.data?.unread_count ?? 0);
    },

    createNotification: (data) => {
        // data: { person_id?, target_role?, message_body, category?, action_url?, action_type? }
        return apiClient.post('/user-notifications.php', data);
    },

    markAsRead: (notifId) => {
        return apiClient.put(`/user-notifications.php?id=${notifId}&action=mark_read`, {});
    },

    markAsUnread: (notifId) => {
        return apiClient.put(`/user-notifications.php?id=${notifId}&action=mark_unread`, {});
    },

    deleteNotification: (notifId) => {
        return apiClient.delete(`/user-notifications.php`, { params: { id: notifId } });
    },

    subscribe: (personId, onMessage, onError) => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const pid = personId || user.person_id || null;
        if (!pid || typeof EventSource === 'undefined') {
            onError?.(new Error('EventSource not supported or person_id missing'));
            return null;
        }
        const streamUrl = `${API_BASE_URL}/user-notifications-stream.php?person_id=${pid}`;
        const source = new EventSource(streamUrl);

        source.addEventListener('open', () => {
        });

        source.addEventListener('notification', (event) => {
            try {
                const payload = JSON.parse(event.data);
                onMessage?.(payload);
            } catch (err) {
                console.error('Failed to parse notification stream event data', err);
            }
        });

        source.onerror = (event) => {
            if (source.readyState === EventSource.CLOSED) {
                onError?.(new Error('Notification stream closed'));
            } else {
            }
        };

        return source;
    },

    unsubscribe: (source) => {
        if (source && typeof source.close === 'function') {
            source.close();
        }
    }
};

// Event Attendance / RSVP APIs
export const eventAttendanceAPI = {
    getAttendance: (params = {}) =>
        apiClient.get('/event-attendance.php', { params }),
    
    recordAttendance: (data) =>
        apiClient.post('/event-attendance.php', data),
    
    updateAttendance: (attendanceId, status, notes = '') =>
        apiClient.put('/event-attendance.php', { attendance_id: attendanceId, status, notes }),
    
    deleteAttendance: (attendanceId) =>
        apiClient.delete('/event-attendance.php', { params: { attendance_id: attendanceId } }),
};

// Error handler
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default apiClient;
