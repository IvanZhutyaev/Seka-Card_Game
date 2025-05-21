import React, { useState, useEffect } from 'https://esm.sh/react@18.2.0';

const PlayerCard = ({ player, isCurrent }) => {
    const avatarStyle = player.photo_url 
        ? { backgroundImage: `url('${player.photo_url}')` }
        : { 
            backgroundColor: getRandomColor(),
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        };

    return (
        <div className={`player-card ${isCurrent ? 'current-player' : ''}`}>
            <div className="player-avatar" style={avatarStyle}>
                {!player.photo_url && (player.first_name?.[0] || '?')}
            </div>
            <div className="player-action" style={{ backgroundColor: getActionColor(player.action) }}>
                {player.action || 'Ожидание'}
            </div>
            <div className="player-name">{player.first_name}</div>
            <div className="player-balance">$ {player.balance?.toFixed(2) || '0.00'}</div>
        </div>
    );
};

const App = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [gameState, setGameState] = useState({
        bankAmount: 0,
        currentTurn: "Ожидание начала игры...",
        players: Array(6).fill().map((_, i) => ({
            id: i + 1,
            first_name: `Игрок ${i + 1}`,
            balance: 0,
            action: "Ожидание",
            is_current: false
        }))
    });
    const [currentPlayer, setCurrentPlayer] = useState(null);
    const [showActions, setShowActions] = useState(false);
    const [error, setError] = useState(null);
    
    const controllerRef = React.useRef(null);
    const socketRef = React.useRef(null);

    useEffect(() => {
        const uiManager = {
            setController: (controller) => {
                controllerRef.current = controller;
            },
            setExitHandler: (handler) => {
                // Можно реализовать при необходимости
            },
            setCurrentPlayer: (player) => {
                setCurrentPlayer(player);
            },
            initUI: () => {
                // Инициализация UI
            },
            updateGameState: (state) => {
                setGameState(state);
                const isCurrent = state.players.some(p => p.is_current && p.id === currentPlayer?.id);
                setShowActions(isCurrent);
            },
            updatePlayer: (playerData) => {
                setGameState(prev => ({
                    ...prev,
                    players: prev.players.map(p => 
                        p.id === playerData.id ? { ...p, ...playerData } : p
                    )
                }));
            },
            showError: (message) => {
                setError(message);
                setTimeout(() => setError(null), 3000);
            }
        };

        socketRef.current = new SocketHandler();
        const controller = new GameController(uiManager, socketRef.current);
        controller.init();
    }, []);

    const handleBet = () => {
        const amount = prompt("Введите сумму ставки:", "10");
        if (amount && !isNaN(amount)) {
            controllerRef.current?.placeBet(parseInt(amount));
        }
    };

    const handleFold = () => {
        if (confirm("Вы уверены, что хотите сбросить карты?")) {
            controllerRef.current?.fold();
        }
    };

    return (
        <div className="main-area">
            <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)}></button>
            
            <div className="center-block">
                <div className="player-turn-info">
                    {gameState.currentTurn}
                </div>
            </div>
            
            <div className="top-right-buttons">
                <button className="sound-button"></button>
                <button className="exit-button"></button>
            </div>
            
            {menuOpen && (
                <div className="dropdown-menu" onClick={() => setMenuOpen(false)}>
                    <a href="rules.html">📜Правила игры</a>
                    <a href="history.html">📊История транзакций</a>
                    <a href="invite.html">👥Пригласить друга</a>
                </div>
            )}
            
            <div className="game-title">Сека</div>
            
            <div className="players-container">
                <div className="players-left">
                    {gameState.players.slice(0, 3).map((player) => (
                        <PlayerCard 
                            key={player.id} 
                            player={player} 
                            isCurrent={player.is_current} 
                        />
                    ))}
                </div>
                <div className="players-right">
                    {gameState.players.slice(3, 6).map((player) => (
                        <PlayerCard 
                            key={player.id} 
                            player={player} 
                            isCurrent={player.is_current} 
                        />
                    ))}
                </div>
            </div>
            
            <div className="bank-title">Банк</div>
            <div className="bank-amount">$ {gameState.bankAmount.toFixed(2)}</div>
            
            <div className="bottom-panel"></div>

            {showActions && (
                <>
                    <button 
                        className="action-button" 
                        style={{ left: 'calc(50% - 120px)', backgroundColor: '#4CAF50' }}
                        onClick={handleBet}
                    >
                        Ставка
                    </button>
                    <button 
                        className="action-button" 
                        style={{ left: 'calc(50% + 20px)', backgroundColor: '#F44336' }}
                        onClick={handleFold}
                    >
                        Пас
                    </button>
                </>
            )}

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}
        </div>
    );
};

function getRandomColor() {
    const colors = ['#FF5733', '#33FF57', '#3357FF', '#F333FF', '#33FFF3'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function getActionColor(action) {
    const colors = {
        'Ставка': 'rgba(76, 175, 80, 0.3)',
        'Пас': 'rgba(244, 67, 54, 0.3)',
        'default': 'rgba(0, 0, 0, 0.3)'
    };
    return colors[action] || colors.default;
}

export { App };