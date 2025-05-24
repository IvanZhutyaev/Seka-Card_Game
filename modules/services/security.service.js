import { CONFIG } from '../config.js';
import { Utils } from '../utils.js';

export class SecurityService {
    constructor() {
        console.log('SecurityService initialized');
        this.xssObserver = null;
        this.csrfToken = null;
    }

    init() {
        this.setupXSSProtection();
        this.setupCSRFProtection();
        this.setupContentSecurityPolicy();
        return true;
    }

    setupXSSProtection() {
        if (!CONFIG.SECURITY.XSS_PROTECTION) return;

        this.xssObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) {
                            this.sanitizeNode(node);
                        }
                    });
                }
            });
        });

        this.xssObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    sanitizeNode(node) {
        const elements = node.getElementsByTagName('*');
        for (const element of elements) {
            // Удаляем опасные атрибуты
            ['onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout'].forEach(attr => {
                if (element.hasAttribute(attr)) {
                    element.removeAttribute(attr);
                }
            });

            // Санитизируем содержимое
            if (element.textContent) {
                element.textContent = Utils.sanitizeHTML(element.textContent);
            }

            // Проверяем src и href атрибуты
            ['src', 'href'].forEach(attr => {
                if (element.hasAttribute(attr)) {
                    const value = element.getAttribute(attr);
                    const safeValue = Utils.sanitizeURL(value);
                    if (safeValue) {
                        element.setAttribute(attr, safeValue);
                    } else {
                        element.removeAttribute(attr);
                    }
                }
            });
        }
    }

    setupCSRFProtection() {
        if (!CONFIG.SECURITY.CSRF_PROTECTION) return;

        this.csrfToken = this.generateCSRFToken();
        document.cookie = `csrf_token=${this.csrfToken}; path=/; SameSite=Strict`;
    }

    generateCSRFToken() {
        return Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    validateCSRFToken(token) {
        return token === this.csrfToken;
    }

    setupContentSecurityPolicy() {
        if (!CONFIG.SECURITY.CONTENT_SECURITY_POLICY) return;

        const meta = document.createElement('meta');
        meta.httpEquiv = 'Content-Security-Policy';
        meta.content = 'default-src \'self\'; ' +
                      'img-src \'self\' data: https:; ' +
                      'style-src \'self\' \'unsafe-inline\'; ' +
                      'script-src \'self\' \'unsafe-inline\'; ' +
                      'connect-src \'self\' https:; ' +
                      'font-src \'self\' data:;';
        document.head.appendChild(meta);
    }

    // Методы для работы с данными
    sanitizeData(data) {
        if (typeof data !== 'object' || data === null) {
            return data;
        }

        if (Array.isArray(data)) {
            return data.map(item => this.sanitizeData(item));
        }

        const sanitized = {};
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string') {
                sanitized[key] = Utils.sanitizeHTML(value);
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = this.sanitizeData(value);
            } else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }

    // Методы для работы с URL
    sanitizeUrl(url) {
        return Utils.sanitizeURL(url);
    }

    // Методы для работы с файлами
    validateFile(file, options = {}) {
        const {
            maxSize = CONFIG.MAX_IMAGE_SIZE,
            allowedTypes = ['image/jpeg', 'image/png', 'image/gif'],
            maxWidth = 1920,
            maxHeight = 1080
        } = options;

        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('No file provided'));
                return;
            }

            if (!allowedTypes.includes(file.type)) {
                reject(new Error('Invalid file type'));
                return;
            }

            if (file.size > maxSize) {
                reject(new Error('File too large'));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    if (img.width > maxWidth || img.height > maxHeight) {
                        reject(new Error('Image dimensions too large'));
                        return;
                    }
                    resolve({
                        file,
                        width: img.width,
                        height: img.height,
                        type: file.type,
                        size: file.size
                    });
                };
                img.onerror = () => reject(new Error('Invalid image'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('Error reading file'));
            reader.readAsDataURL(file);
        });
    }

    // Методы для работы с сессией
    validateSession() {
        const sessionData = localStorage.getItem('sessionData');
        if (!sessionData) return false;

        try {
            const { token, expires } = JSON.parse(sessionData);
            if (!token || !expires) return false;

            return new Date(expires) > new Date();
        } catch {
            return false;
        }
    }

    // Методы для работы с правами доступа
    checkPermission(permission) {
        const userData = localStorage.getItem('userData');
        if (!userData) return false;

        try {
            const { permissions = [] } = JSON.parse(userData);
            return permissions.includes(permission);
        } catch {
            return false;
        }
    }

    // Очистка
    cleanup() {
        if (this.xssObserver) {
            this.xssObserver.disconnect();
        }
        this.csrfToken = null;
    }
} 