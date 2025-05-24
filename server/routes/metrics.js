const express = require('express');
const router = express.Router();
const { promisify } = require('util');
const redis = require('redis');

// Создаем клиент Redis
const client = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// Промисфицируем методы Redis
const setAsync = promisify(client.set).bind(client);
const getAsync = promisify(client.get).bind(client);
const zaddAsync = promisify(client.zadd).bind(client);
const zrangeAsync = promisify(client.zrange).bind(client);

// Middleware для проверки авторизации
const authMiddleware = (req, res, next) => {
  const token = req.headers['x-api-key'];
  if (!token || token !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Сохранение метрик
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { metrics, timestamp } = req.body;
    
    // Сохраняем метрики в Redis
    for (const metric of metrics) {
      const key = `metrics:${metric.name}`;
      for (const value of metric.values) {
        await zaddAsync(key, value.timestamp, JSON.stringify(value));
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Получение метрик
router.get('/:name', authMiddleware, async (req, res) => {
  try {
    const { name } = req.params;
    const { start, end } = req.query;
    
    const key = `metrics:${name}`;
    const data = await zrangeAsync(key, start || 0, end || -1);
    
    res.json({
      name,
      values: data.map(item => JSON.parse(item))
    });
  } catch (error) {
    console.error('Error getting metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Получение агрегированных метрик
router.get('/:name/aggregate', authMiddleware, async (req, res) => {
  try {
    const { name } = req.params;
    const { period = '1h' } = req.query;
    
    const key = `metrics:${name}`;
    const data = await zrangeAsync(key, 0, -1);
    const values = data.map(item => JSON.parse(item));
    
    // Агрегация по периодам
    const aggregated = aggregateMetrics(values, period);
    
    res.json({
      name,
      period,
      values: aggregated
    });
  } catch (error) {
    console.error('Error aggregating metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Функция агрегации метрик
function aggregateMetrics(values, period) {
  const now = Date.now();
  let interval;
  
  switch (period) {
    case '1h':
      interval = 60 * 60 * 1000; // 1 час
      break;
    case '1d':
      interval = 24 * 60 * 60 * 1000; // 1 день
      break;
    case '1w':
      interval = 7 * 24 * 60 * 60 * 1000; // 1 неделя
      break;
    default:
      interval = 60 * 60 * 1000; // По умолчанию 1 час
  }
  
  const buckets = new Map();
  
  values.forEach(item => {
    const bucket = Math.floor(item.timestamp / interval) * interval;
    if (!buckets.has(bucket)) {
      buckets.set(bucket, {
        timestamp: bucket,
        count: 0,
        sum: 0,
        min: Infinity,
        max: -Infinity
      });
    }
    
    const bucketData = buckets.get(bucket);
    bucketData.count++;
    bucketData.sum += item.value;
    bucketData.min = Math.min(bucketData.min, item.value);
    bucketData.max = Math.max(bucketData.max, item.value);
  });
  
  return Array.from(buckets.values()).map(bucket => ({
    timestamp: bucket.timestamp,
    avg: bucket.sum / bucket.count,
    min: bucket.min,
    max: bucket.max,
    count: bucket.count
  }));
}

// Экспорт метрик
router.get('/export', authMiddleware, async (req, res) => {
  try {
    const { start, end } = req.query;
    const metrics = {};
    
    // Получаем все ключи метрик
    const keys = await promisify(client.keys).bind(client)('metrics:*');
    
    // Собираем данные для каждой метрики
    for (const key of keys) {
      const metricName = key.replace('metrics:', '');
      const data = await zrangeAsync(key, start || 0, end || -1);
      
      metrics[metricName] = data.map(item => JSON.parse(item));
    }
    
    // Формируем JSON для экспорта
    const exportData = {
      timestamp: Date.now(),
      period: {
        start: start ? parseInt(start) : null,
        end: end ? parseInt(end) : null
      },
      metrics
    };
    
    // Отправляем файл
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=metrics-${Date.now()}.json`);
    res.json(exportData);
  } catch (error) {
    console.error('Error exporting metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 