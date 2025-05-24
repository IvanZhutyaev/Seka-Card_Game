// Класс для мониторинга производительности
export class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.marks = new Map();
    }
  
    // Начало измерения
    startMeasure(name) {
        this.marks.set(name, performance.now());
    }
  
    // Конец измерения
    endMeasure(name) {
        const startTime = this.marks.get(name);
    
        if (!startTime) {
            console.warn(`No start mark found for measure: ${name}`);
            return;
        }
    
        const duration = performance.now() - startTime;
        this.metrics.set(name, duration);
        this.marks.delete(name);
    
        // Отправка метрики на сервер
        this.sendMetric(name, duration);
    
        return duration;
    }
  
    // Отправка метрики на сервер
    async sendMetric(name, duration) {
        try {
            await fetch('/api/metrics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    duration,
                    timestamp: Date.now()
                })
            });
        } catch (error) {
            console.error('Error sending metric:', error);
        }
    }
  
    // Получение всех метрик
    getMetrics() {
        return Object.fromEntries(this.metrics);
    }
  
    // Очистка метрик
    clearMetrics() {
        this.metrics.clear();
        this.marks.clear();
    }
}

// Создание глобального экземпляра
const monitor = new PerformanceMonitor();

// Декоратор для измерения производительности функций
export function measure(name) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
    
        descriptor.value = function (...args) {
            monitor.startMeasure(name);
            const result = originalMethod.apply(this, args);
      
            if (result instanceof Promise) {
                return result.finally(() => {
                    monitor.endMeasure(name);
                });
            }
      
            monitor.endMeasure(name);
            return result;
        };
    
        return descriptor;
    };
}

// Измерение времени загрузки страницы
export function measurePageLoad() {
    window.addEventListener('load', () => {
        const timing = performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
    
        monitor.sendMetric('pageLoad', loadTime);
    });
}

// Измерение времени отклика
export function measureResponseTime() {
    const originalFetch = window.fetch;
  
    window.fetch = async function (...args) {
        const startTime = performance.now();
        const response = await originalFetch.apply(this, args);
        const duration = performance.now() - startTime;
    
        monitor.sendMetric('fetch', duration);
        return response;
    };
}

// Инициализация мониторинга
export function initPerformanceMonitoring() {
    measurePageLoad();
    measureResponseTime();
} 