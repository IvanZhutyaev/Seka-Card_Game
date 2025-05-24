export const CONFIG = {
    MAX_IMAGE_SIZE: 5 * 1024 * 1024,
    ALLOWED_PAGES: ['rules', 'bonus', 'history', 'invite'],
    STORAGE_KEYS: {
        USER_DATA: 'userData',
        SESSION_DATA: 'sessionData'
    },
    DEBOUNCE_DELAY: 100,
    API: {
        BASE_URL: 'https://api.example.com',
        TIMEOUT: 5000,
        RETRY_ATTEMPTS: 3
    },
    SECURITY: {
        XSS_PROTECTION: true,
        CSRF_PROTECTION: true,
        CONTENT_SECURITY_POLICY: true
    },
    PERFORMANCE: {
        IMAGE_CACHE_SIZE: 50,
        DEBOUNCE_DELAY: 100,
        THROTTLE_DELAY: 200
    }
}; 