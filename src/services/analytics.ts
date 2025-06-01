// Сервис сбора метрик и аналитики

export interface AnalyticsEvent {
  type: string;
  payload?: Record<string, any>;
  timestamp: number;
}

const analyticsQueue: AnalyticsEvent[] = [];

// Пример: отправка метрики на сервер или в сторонний сервис
function sendAnalytics(event: AnalyticsEvent) {
  // Здесь можно реализовать отправку на сервер или сторонний сервис
  // Например, fetch('/api/analytics', { method: 'POST', body: JSON.stringify(event) })
  // Пока просто логируем
  // eslint-disable-next-line no-console
  console.log('[Analytics]', event);
}

export function logAnalyticsEvent(type: string, payload?: Record<string, any>) {
  const event: AnalyticsEvent = {
    type,
    payload,
    timestamp: Date.now(),
  };
  analyticsQueue.push(event);
  sendAnalytics(event);
}

// Метрики для сбора
export function logGameSearchTime(durationMs: number) {
  logAnalyticsEvent('game_search_time', { durationMs });
}

export function logDisconnect() {
  logAnalyticsEvent('disconnect');
}

export function logMoveStat(playerId: string, moveType: string) {
  logAnalyticsEvent('move_stat', { playerId, moveType });
}

export function logClientError(error: string, details?: any) {
  logAnalyticsEvent('client_error', { error, details });
} 