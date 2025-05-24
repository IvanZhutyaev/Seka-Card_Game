export const Utils = {
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    throttle: (func, limit) => {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    sanitizeHTML: (str) => {
        if (typeof str !== 'string') return '';
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    },

    sanitizeURL: (url) => {
        if (typeof url !== 'string') return null;
        try {
            const parsed = new URL(url);
            return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : null;
        } catch {
            return null;
        }
    },

    validateUser: (user) => {
        return user && 
               typeof user === 'object' && 
               typeof user.first_name === 'string' && 
               typeof user.id === 'number';
    },

    formatCurrency: (amount, currency = '₽') => {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: currency
        }).format(amount);
    },

    formatDate: (date) => {
        return new Intl.DateTimeFormat('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(date));
    },

    generateId: () => {
        return Math.random().toString(36).substr(2, 9);
    },

    deepClone: (obj) => {
        return JSON.parse(JSON.stringify(obj));
    },

    isEmpty: (value) => {
        return value === null || 
               value === undefined || 
               (typeof value === 'string' && value.trim() === '') ||
               (Array.isArray(value) && value.length === 0) ||
               (typeof value === 'object' && Object.keys(value).length === 0);
    }
}; 