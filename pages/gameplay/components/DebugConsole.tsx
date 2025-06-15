import React, { useState, useEffect, useRef } from 'react';
import './DebugConsole.css';

interface LogMessage {
    message: string;
    type: 'info' | 'error' | 'success' | 'warning' | 'data';
    timestamp: string;
    important?: boolean;
}

interface DebugConsoleProps {
    gameState: any;
    webSocket: WebSocket | null;
}

const DebugConsole: React.FC<DebugConsoleProps> = ({ gameState, webSocket }) => {
    const [isVisible, setIsVisible] = useState<boolean>(() => 
        localStorage.getItem('debugLogsVisible') === 'true'
    );
    const [logs, setLogs] = useState<LogMessage[]>([]);
    const logsEndRef = useRef<HTMLDivElement>(null);

    const addLog = (message: string, type: LogMessage['type'] = 'info', important: boolean = false) => {
        const timestamp = new Date().toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3
        });

        setLogs(prev => [...prev, { message, type, timestamp, important }]);
    };

    const clearLogs = () => {
        setLogs([]);
        addLog('Logs cleared', 'info');
    };

    useEffect(() => {
        // Сохраняем состояние видимости
        localStorage.setItem('debugLogsVisible', String(isVisible));
    }, [isVisible]);

    useEffect(() => {
        // Автоматическая прокрутка при новых логах
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    useEffect(() => {
        // Логируем изменения состояния игры
        if (gameState) {
            addLog('Game state updated:', 'info', true);
            addLog(JSON.stringify(gameState, null, 2), 'data');
        }
    }, [gameState]);

    useEffect(() => {
        // Логируем состояние WebSocket
        if (webSocket) {
            addLog('WebSocket connected', 'success', true);
            
            const handleMessage = (event: MessageEvent) => {
                addLog('Received WebSocket message:', 'info', true);
                try {
                    const data = JSON.parse(event.data);
                    addLog(JSON.stringify(data, null, 2), 'data');
                } catch (e) {
                    addLog(event.data, 'data');
                }
            };

            const handleClose = () => {
                addLog('WebSocket disconnected', 'warning', true);
            };

            const handleError = (error: Event) => {
                addLog(`WebSocket error: ${error}`, 'error', true);
            };

            webSocket.addEventListener('message', handleMessage);
            webSocket.addEventListener('close', handleClose);
            webSocket.addEventListener('error', handleError);

            return () => {
                webSocket.removeEventListener('message', handleMessage);
                webSocket.removeEventListener('close', handleClose);
                webSocket.removeEventListener('error', handleError);
            };
        }
    }, [webSocket]);

    return (
        <>
            <button 
                className={`debug-toggle-button ${isVisible ? 'active' : ''}`}
                onClick={() => setIsVisible(!isVisible)}
            >
                {isVisible ? '🚫' : '🐛'}
            </button>

            {isVisible && (
                <div className="debug-console">
                    <div className="debug-header">
                        <span className="debug-title">🔍 Debug</span>
                        <button className="clear-button" onClick={clearLogs}>
                            🗑️
                        </button>
                    </div>
                    <div className="debug-content">
                        {logs.map((log, index) => (
                            <div 
                                key={index} 
                                className={`log-entry ${log.type} ${log.important ? 'important' : ''}`}
                            >
                                <span className="timestamp">[{log.timestamp}]</span>
                                <span className="message">{log.message}</span>
                            </div>
                        ))}
                        <div ref={logsEndRef} />
                    </div>
                </div>
            )}
        </>
    );
};

export default DebugConsole; 