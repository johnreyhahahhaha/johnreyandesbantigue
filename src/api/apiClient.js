import axios from 'axios';

const API_BASE_URL = 'http://localhost/josephus/st.joseph/public/api';

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
                config.data = config.data ? { ...config.data, user_id: user.user_id } : { user_id: user.user_id };
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
export const financeAPI = {
    getDonations: () =>
        apiClient.get('/donations.php'),
    
    getMassIntentions: () =>
        apiClient.get('/finances.php', { params: { type: 'mass_intentions' } }),
    
    getLedger: () =>
        apiClient.get('/finances.php', { params: { type: 'ledger' } }),
    
    createDonation: (data) =>
        apiClient.post('/donations.php', data),
    
    createMassIntention: (data) =>
        apiClient.post('/finances.php', { ...data, type: 'mass_intentions' }),
    
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
        apiClient.put('/schedules.php', { ...data, schedule_id: scheduleId }),
};

// Document Request APIs
export const documentAPI = {
    getAllRequests: () =>
        apiClient.get('/document-requests.php'),
    
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
};

// Admin APIs
export const adminAPI = {
    getAllData: () =>
        apiClient.get('/admin-data.php'),
    
    getDiagnostics: () =>
        apiClient.get('/admin-diagnostics.php'),
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
