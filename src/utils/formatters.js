// Date formatting utility
export const formatDate = (date) => {
    if (!date) return '';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(date).toLocaleDateString('en-US', options);
};

// Time formatting utility
export const formatTime = (time) => {
    if (!time) return '';
    const options = { hour: '2-digit', minute: '2-digit', hour12: true };
    return new Date(`2000-01-01 ${time}`).toLocaleTimeString('en-US', options);
};

// DateTime formatting utility
export const formatDateTime = (datetime) => {
    if (!datetime) return '';
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    };
    return new Date(datetime).toLocaleString('en-US', options);
};

// Currency formatting utility
export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
    }).format(amount);
};

// Phone number formatting utility
export const formatPhoneNumber = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
};

// Email validation utility
export const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Full name formatting utility
export const formatFullName = (firstName, middleName, lastName, suffix) => {
    let name = `${firstName || ''} ${middleName || ''} ${lastName || ''}`.trim();
    if (suffix) {
        name += ` ${suffix}`;
    }
    return name;
};

// Role color utility
export const getRoleColor = (role) => {
    const colors = {
        Admin: '#ff6b6b',
        Priest: '#4ecdc4',
        Secretary: '#45b7d1',
        Treasurer: '#f7b731',
    };
    return colors[role] || '#95a5a6';
};

// Status formatting utility
export const getStatusColor = (status) => {
    const colors = {
        active: '#4caf50',
        inactive: '#f44336',
        pending: '#ff9800',
        completed: '#2196f3',
    };
    return colors[status?.toLowerCase()] || '#95a5a6';
};
