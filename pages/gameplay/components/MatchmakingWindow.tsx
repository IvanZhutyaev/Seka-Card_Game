import React, { useEffect, useState } from 'react';
import { useGameState } from '../store/gameStore';
import Avatar from './Avatar';
import './MatchmakingWindow.css';

const MatchmakingWindow: React.FC = () => {
    const { 
        gameState, 
        cancelMatchmaking,
        telegramUser,
        connect,
        joinLobby,
        createLobby,
        leaveLobby,
        getAvailableLobbies
    } = useGameState();

    const [showLobbyForm, setShowLobbyForm] = useState(false);
    const [showLobbyList, setShowLobbyList] = useState(false);
    const [lobbyName, setLobbyName] = useState('');
    const [lobbyType, setLobbyType] = useState<'public' | 'private'>('public');

    // Подключаемся к WebSocket при монтировании компонента
    useEffect(() => {
        connect();
    }, [connect]);

    // Загружаем список лобби при показе списка
    useEffect(() => {
        if (showLobbyList) {
            getAvailableLobbies();
        }
    }, [showLobbyList, getAvailableLobbies]);

    // Если нет данных пользователя, показываем загрузку
    if (!telegramUser) {
        return (
            <div className="matchmaking-loading">
                <div className="loader" />
                <p>Загрузка данных пользователя...</p>
            </div>
        );
    }

    const handleCreateLobby = () => {
        if (lobbyName.trim()) {
            createLobby(lobbyName.trim(), lobbyType);
            setShowLobbyForm(false);
        }
    };

    return (
        <div className="matchmaking-window">
            <div className="matchmaking-header">
                <h2>Поиск игры</h2>
                <div className="matchmaking-stats">
                    <span>Игроков: {gameState.matchmaking.playersCount}/{gameState.matchmaking.requiredPlayers}</span>
                    <span>Ставки: {gameState.matchmaking.minBet} - {gameState.matchmaking.maxBet} 💰</span>
                </div>
                {gameState.matchmaking.lobbyName && (
                    <div className="lobby-info">
                        <span>Лобби: {gameState.matchmaking.lobbyName}</span>
                        <span className="lobby-type">
                            {gameState.matchmaking.lobbyType === 'public' ? 'Публичное' : 'Приватное'}
                        </span>
                    </div>
                )}
            </div>

            <div className="matchmaking-content">
                {!gameState.matchmaking.lobbyId && !showLobbyForm && !showLobbyList && (
                    <div className="matchmaking-actions">
                        <button 
                            className="create-lobby-button"
                            onClick={() => setShowLobbyForm(true)}
                        >
                            Создать лобби
                        </button>
                        <button 
                            className="join-lobby-button"
                            onClick={() => setShowLobbyList(true)}
                        >
                            Присоединиться к лобби
                        </button>
                    </div>
                )}

                {showLobbyList && (
                    <div className="lobby-list">
                        <h3>Доступные лобби:</h3>
                        {gameState.matchmaking.availableLobbies?.length ? (
                            <div className="lobbies">
                                {gameState.matchmaking.availableLobbies.map(lobby => (
                                    <div key={lobby.id} className="lobby-item">
                                        <div className="lobby-info">
                                            <span className="lobby-name">{lobby.name}</span>
                                            <span className="lobby-type">
                                                {lobby.type === 'public' ? 'Публичное' : 'Приватное'}
                                            </span>
                                        </div>
                                        <div className="lobby-stats">
                                            <span>Игроков: {lobby.playersCount}/{lobby.requiredPlayers}</span>
                                            <span>Ставки: {lobby.minBet} - {lobby.maxBet} 💰</span>
                                        </div>
                                        <button 
                                            className="join-button"
                                            onClick={() => joinLobby(lobby.id)}
                                        >
                                            Присоединиться
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="no-lobbies">Нет доступных лобби</p>
                        )}
                        <button 
                            className="back-button"
                            onClick={() => setShowLobbyList(false)}
                        >
                            Назад
                        </button>
                    </div>
                )}

                {showLobbyForm && (
                    <div className="lobby-form">
                        <input
                            type="text"
                            placeholder="Название лобби"
                            value={lobbyName}
                            onChange={(e) => setLobbyName(e.target.value)}
                        />
                        <div className="lobby-type-selector">
                            <label>
                                <input
                                    type="radio"
                                    checked={lobbyType === 'public'}
                                    onChange={() => setLobbyType('public')}
                                />
                                Публичное
                            </label>
                            <label>
                                <input
                                    type="radio"
                                    checked={lobbyType === 'private'}
                                    onChange={() => setLobbyType('private')}
                                />
                                Приватное
                            </label>
                        </div>
                        <div className="lobby-form-actions">
                            <button onClick={handleCreateLobby}>Создать</button>
                            <button onClick={() => setShowLobbyForm(false)}>Отмена</button>
                        </div>
                    </div>
                )}

                <div className="waiting-players">
                    <h3>Ожидающие игроки:</h3>
                    <div className="players-list">
                        {gameState.matchmaking.waitingPlayers.map((playerId) => {
                            const player = gameState.players[playerId];
                            return player?.user_info ? (
                                <div key={playerId} className="waiting-player">
                                    <Avatar user={player.user_info} size="medium" />
                                    <span className="player-name">
                                        {player.user_info.first_name}
                                        {playerId === telegramUser.id.toString() && ' (Вы)'}
                                    </span>
                                </div>
                            ) : null;
                        })}
                    </div>
                </div>

                <div className="matchmaking-progress">
                    <div className="progress-bar">
                        <div 
                            className="progress-fill"
                            style={{ 
                                width: `${(gameState.matchmaking.playersCount / gameState.matchmaking.requiredPlayers) * 100}%` 
                            }}
                        />
                    </div>
                    <div className="progress-text">
                        {gameState.matchmaking.playersCount === gameState.matchmaking.requiredPlayers 
                            ? 'Игра начинается...' 
                            : 'Ожидание игроков...'}
                    </div>
                </div>
            </div>

            <div className="matchmaking-footer">
                {gameState.matchmaking.lobbyId ? (
                    <button 
                        className="leave-lobby-button"
                        onClick={leaveLobby}
                    >
                        Покинуть лобби
                    </button>
                ) : (
                    <button 
                        className="cancel-button"
                        onClick={cancelMatchmaking}
                    >
                        Отменить поиск
                    </button>
                )}
            </div>
        </div>
    );
};

export default MatchmakingWindow; 