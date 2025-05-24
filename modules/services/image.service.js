import { CONFIG } from '../config.js';
import { Utils } from '../utils.js';

export class ImageService {
    constructor() {
        this.cache = new Map();
        this.loadingPromises = new Map();
    }

    async preload(imagePath) {
        if (!imagePath) {
            throw new Error('Invalid image path');
        }

        if (this.cache.has(imagePath)) {
            return this.cache.get(imagePath);
        }

        if (this.loadingPromises.has(imagePath)) {
            return this.loadingPromises.get(imagePath);
        }

        const loadPromise = this._loadImage(imagePath);
        this.loadingPromises.set(imagePath, loadPromise);

        try {
            const result = await loadPromise;
            this.cache.set(imagePath, result);
            return result;
        } finally {
            this.loadingPromises.delete(imagePath);
        }
    }

    async _loadImage(imagePath) {
        try {
            const response = await fetch(imagePath);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const contentLength = response.headers.get('content-length');
            if (contentLength && parseInt(contentLength) > CONFIG.MAX_IMAGE_SIZE) {
                throw new Error('Image too large');
            }

            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);

            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    resolve({
                        url: objectUrl,
                        width: img.width,
                        height: img.height,
                        type: blob.type
                    });
                };
                img.onerror = () => {
                    URL.revokeObjectURL(objectUrl);
                    reject(new Error('Failed to load image'));
                };
                img.src = objectUrl;
            });
        } catch (error) {
            console.error('Error loading image:', error);
            throw error;
        }
    }

    async loadAvatar(user) {
        if (!user || !user.photo_url) {
            return null;
        }

        const safeUrl = Utils.sanitizeURL(user.photo_url);
        if (!safeUrl) {
            return null;
        }

        try {
            const imageData = await this.preload(safeUrl);
            return imageData.url;
        } catch {
            return null;
        }
    }

    clearCache() {
        // Освобождаем URL объекты
        for (const [_, imageData] of this.cache) {
            if (imageData.url) {
                URL.revokeObjectURL(imageData.url);
            }
        }
        this.cache.clear();
    }

    // Методы для работы с превью
    async createThumbnail(imageUrl, width = 100, height = 100) {
        try {
            const imageData = await this.preload(imageUrl);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = width;
            canvas.height = height;
            
            const img = new Image();
            img.src = imageData.url;
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });
            
            ctx.drawImage(img, 0, 0, width, height);
            return canvas.toDataURL('image/jpeg', 0.7);
        } catch (error) {
            console.error('Error creating thumbnail:', error);
            return null;
        }
    }

    // Методы для валидации изображений
    validateImage(file) {
        return new Promise((resolve, reject) => {
            if (!file || !file.type.startsWith('image/')) {
                reject(new Error('Invalid file type'));
                return;
            }

            if (file.size > CONFIG.MAX_IMAGE_SIZE) {
                reject(new Error('File too large'));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    resolve({
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
} 