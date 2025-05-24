// Кэш для хранения данных
const cache = new Map();

// Время жизни кэша (5 минут)
const CACHE_TTL = 5 * 60 * 1000;

// Класс для работы с кэшем
export class Cache {
    // Получение данных из кэша
    static get(key) {
        const item = cache.get(key);
    
        if (!item) {
            return null;
        }
    
        // Проверка срока действия
        if (Date.now() - item.timestamp > CACHE_TTL) {
            cache.delete(key);
            return null;
        }
    
        return item.data;
    }
  
    // Сохранение данных в кэш
    static set(key, data) {
        cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
  
    // Удаление данных из кэша
    static delete(key) {
        cache.delete(key);
    }
  
    // Очистка всего кэша
    static clear() {
        cache.clear();
    }
  
    // Получение размера кэша
    static size() {
        return cache.size;
    }
}

// Кэширование результатов функций
export function memoize(fn) {
    return function (...args) {
        const key = JSON.stringify(args);
        const cached = Cache.get(key);
    
        if (cached !== null) {
            return cached;
        }
    
        const result = fn.apply(this, args);
        Cache.set(key, result);
        return result;
    };
}

// Кэширование запросов к API
export async function cachedFetch(url, options = {}) {
    const key = `${url}-${JSON.stringify(options)}`;
    const cached = Cache.get(key);
  
    if (cached !== null) {
        return cached;
    }
  
    const response = await fetch(url, options);
    const data = await response.json();
  
    Cache.set(key, data);
    return data;
} 