// seka_demo.js
// Управление этапами макета: загрузка, ожидание, ход игрока, окно ставок

const stages = ['loading', 'queue', 'turn', 'betting'];
let currentStage = 0;

// Для ставок
const chipValues = [25, 50, 100, 500, 1000, 5000];
let selectedChip = 0;
let betAmount = chipValues[0];

function renderStage(stage) {
    const root = document.getElementById('seka-root');
    root.innerHTML = '';
    if (stage === 'loading') {
        root.appendChild(renderLoading());
    } else if (stage === 'queue') {
        root.appendChild(renderQueue());
    } else if (stage === 'turn') {
        root.appendChild(renderTurn());
    } else if (stage === 'betting') {
        root.appendChild(renderBetting());
        addBettingListeners();
    }
}

function renderLoading() {
    const container = document.createElement('div');
    container.className = 'seka-table-container';
    container.innerHTML = `
        <div class="seka-header">
            <button class="menu-btn">☰</button>
            <span class="queue-label">Очередь игрока user1234</span>
            <div>
                <button class="sound-btn">🔊</button>
                <button class="settings-btn">⚙️</button>
            </div>
        </div>
        <div class="seka-table">
            <div class="seka-table-logo">СЕКА</div>
            <div class="seka-bank">Банк: $0.00</div>
            <div class="seka-players">
                ${renderPlayer({name: 'Kendall R.', balance: 1500, avatar: '', pos: 0, active: true})}
                ${[1,2,3].map(i => renderPlayer({name: '', balance: 0, avatar: '', pos: i, placeholder: true})).join('')}
            </div>
        </div>
    `;
    return container;
}

function renderQueue() {
    const players = [
        {name: 'Kendall R.', balance: 1500, avatar: '', pos: 0, bet: 150, waiting: true},
        {name: 'Kendall R.', balance: 1500, avatar: '', pos: 1, bet: 150, waiting: true},
        {name: 'Kendall R.', balance: 1500, avatar: '', pos: 2, bet: 150, waiting: true},
        {name: 'Kendall R.', balance: 1500, avatar: '', pos: 3, bet: 150, waiting: true},
        {name: 'Kendall R.', balance: 1500, avatar: '', pos: 4, bet: 150, waiting: true},
        {name: 'Kendall R.', balance: 1500, avatar: '', pos: 5, bet: 150, waiting: true},
    ];
    const container = document.createElement('div');
    container.className = 'seka-table-container';
    container.innerHTML = `
        <div class="seka-header">
            <button class="menu-btn">☰</button>
            <span class="queue-label">Очередь игрока user1234</span>
            <div>
                <button class="sound-btn">🔊</button>
                <button class="settings-btn">⚙️</button>
            </div>
        </div>
        <div class="seka-table">
            <div class="seka-table-logo">СЕКА</div>
            <div class="seka-bank">Банк: $1,760</div>
            <div class="seka-players">
                ${players.map(p => renderPlayer({...p, cardsBack: true})).join('')}
            </div>
        </div>
        <div class="seka-bottom-message">Ожидайте очереди</div>
    `;
    return container;
}

function renderTurn() {
    const players = [
        {name: 'Kendall R.', balance: 1500, avatar: '', pos: 0, bet: 150, waiting: true},
        {name: 'Kendall R.', balance: 1500, avatar: '', pos: 1, bet: 150, waiting: true},
        {name: 'Kendall R.', balance: 1500, avatar: '', pos: 2, bet: 150, waiting: true},
        {name: 'Paul K.', balance: 1500, avatar: '', pos: 3, bet: 150, fold: true, active: true},
        {name: 'Kendall R.', balance: 1500, avatar: '', pos: 4, bet: 150, waiting: true},
        {name: 'Kendall R.', balance: 1500, avatar: '', pos: 5, bet: 150, waiting: true},
    ];
    const container = document.createElement('div');
    container.className = 'seka-table-container';
    container.innerHTML = `
        <div class="seka-header">
            <button class="menu-btn">☰</button>
            <span class="queue-label">Очередь игрока user1234</span>
            <div>
                <button class="sound-btn">🔊</button>
                <button class="settings-btn">⚙️</button>
            </div>
        </div>
        <div class="seka-table">
            <div class="seka-table-logo">СЕКА</div>
            <div class="seka-bank">Банк: $1,760</div>
            <div class="seka-players" id="seka-players-turn">
                ${players.map(p => renderPlayer({...p, cardsBack: p.fold ? false : true, openCards: p.active})).join('')}
            </div>
        </div>
        <div class="seka-controls-panel">
            <div class="action-btns">
                <button class="action-btn">Уровнять</button>
                <button class="action-btn" style="background:#4CAF50;color:#fff;">Поднять</button>
                <button class="action-btn fold">Пас</button>
            </div>
            <div class="bet-info">
                Ваша ставка <b>150$</b> &nbsp; Баланс <b>900.00 ₽</b>
                <span class="player-avatar"></span>
            </div>
        </div>
    `;
    setTimeout(() => {
        animateDealCards();
        setTimeout(() => animateWinnerAndChips(3), 1200); // Подсветка победителя и фишки после раздачи
    }, 100);
    return container;
}

function animateDealCards() {
    // Для каждого игрока по очереди делаем плавное появление карт
    const playerEls = document.querySelectorAll('.seka-player .player-cards');
    playerEls.forEach((el, idx) => {
        if (!el) return;
        const cards = el.querySelectorAll('.card, .card.open');
        cards.forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(-20px)';
        });
        setTimeout(() => {
            cards.forEach((card, cidx) => {
                setTimeout(() => {
                    card.style.transition = 'opacity 0.3s, transform 0.3s';
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, cidx * 120);
            });
        }, idx * 180);
    });
}

function renderBetting() {
    const container = renderTurn();
    // Модальное окно ставок поверх
    const modalBg = document.createElement('div');
    modalBg.className = 'seka-bet-modal-bg';
    modalBg.innerHTML = `
        <div class="seka-bet-modal">
            <div style="color:#fff;font-size:1.2rem;margin-bottom:12px;">Делайте ваши ставки</div>
            <div class="bet-chips-row">
                ${chipValues.map((v, i) => `<div class="bet-chip${selectedChip===i?' selected':''}" data-chip="${i}">${v}$</div>`).join('')}
            </div>
            <div class="bet-amount" id="bet-amount">${betAmount}$</div>
            <div class="bet-modal-btns">
                <button class="bet-modal-btn cancel" id="bet-cancel">Отмена</button>
                <button class="bet-modal-btn" id="bet-max">Максимум</button>
            </div>
        </div>
    `;
    container.appendChild(modalBg);
    return container;
}

function addBettingListeners() {
    // Выбор фишки
    document.querySelectorAll('.bet-chip').forEach(el => {
        el.onclick = e => {
            selectedChip = +el.getAttribute('data-chip');
            betAmount = chipValues[selectedChip];
            renderStage('betting');
        };
    });
    // Кнопка "Максимум"
    document.getElementById('bet-max').onclick = () => {
        selectedChip = chipValues.length - 1;
        betAmount = chipValues[selectedChip];
        animateChipToBank();
    };
    // Кнопка "Отмена"
    document.getElementById('bet-cancel').onclick = () => {
        currentStage = 2; // Возврат к ходу
        renderStage('turn');
    };
}

function animateChipToBank() {
    // Получаем координаты выбранной фишки и банка
    const chip = document.querySelector('.bet-chip.selected');
    const bank = document.querySelector('.seka-bank');
    if (!chip || !bank) {
        renderStage('turn');
        return;
    }
    const chipRect = chip.getBoundingClientRect();
    const bankRect = bank.getBoundingClientRect();
    // Создаем анимированную фишку
    const animChip = document.createElement('div');
    animChip.className = 'bet-chip selected';
    animChip.style.position = 'fixed';
    animChip.style.left = chipRect.left + 'px';
    animChip.style.top = chipRect.top + 'px';
    animChip.style.zIndex = 9999;
    animChip.innerText = chip.innerText;
    document.body.appendChild(animChip);
    // Анимация движения
    setTimeout(() => {
        animChip.style.transition = 'all 0.7s cubic-bezier(.4,2,.6,1)';
        animChip.style.left = (bankRect.left + bankRect.width/2 - chipRect.width/2) + 'px';
        animChip.style.top = (bankRect.top + bankRect.height/2 - chipRect.height/2) + 'px';
        animChip.style.opacity = '0.7';
        animChip.style.transform = 'scale(0.7)';
    }, 10);
    // После анимации — удаляем фишку и возвращаемся к этапу хода
    setTimeout(() => {
        animChip.remove();
        currentStage = 2; // Возврат к ходу
        renderStage('turn');
    }, 800);
}

// Вспомогательная функция для рендера игрока
function renderPlayer({name, balance, avatar, pos, bet, waiting, fold, active, placeholder, cardsBack, openCards}) {
    // Позиции по кругу (6 игроков)
    const positions = [
        {top: '5%', left: '50%', transform: 'translate(-50%,0)'},
        {top: '20%', left: '90%'},
        {top: '70%', left: '90%'},
        {top: '90%', left: '50%', transform: 'translate(-50%,0)'},
        {top: '70%', left: '10%'},
        {top: '20%', left: '10%'},
    ];
    const style = positions[pos] ?
        `top:${positions[pos].top};left:${positions[pos].left};${positions[pos].transform?`transform:${positions[pos].transform};`:''}` : '';
    if (placeholder) {
        return `<div class="seka-player" style="${style}">
            <div class="avatar" style="background:#e0e0e0 url('https://cdn-icons-png.flaticon.com/512/149/149071.png') center/cover no-repeat;"></div>
        </div>`;
    }
    let status = '';
    if (fold) status = '<span style="background:#f44336;color:#fff;padding:2px 8px;border-radius:8px;">Пас</span>';
    else if (waiting) status = '<span style="background:#4CAF50;color:#fff;padding:2px 8px;border-radius:8px;">Ожидает</span>';
    let betLabel = bet ? `<div style="background:#222b3a;color:#FFD700;font-size:0.8rem;padding:2px 8px;border-radius:8px;margin-bottom:2px;">Оплатил: $${bet}</div>` : '';
    let cards = '';
    if (cardsBack) {
        cards = `<div class="player-cards">
            <div class="card"></div><div class="card"></div><div class="card"></div>
        </div>`;
    } else if (openCards) {
        cards = `<div class="player-cards">
            <div class="card open"></div><div class="card open"></div><div class="card open"></div>
        </div>`;
    }
    return `<div class="seka-player${active ? ' active' : ''}" style="${style}">
        <div class="avatar"></div>
        <div class="player-name">${name}</div>
        <div class="player-balance">$${balance}</div>
        ${betLabel}
        <div class="player-status">${status}</div>
        ${cards}
    </div>`;
}

function nextStage() {
    currentStage = (currentStage + 1) % stages.length;
    renderStage(stages[currentStage]);
}

// Добавим функцию для анимации победителя и появления фишек в банк
function animateWinnerAndChips(winnerPos = 3) {
    // Подсветка победителя
    const players = document.querySelectorAll('.seka-player');
    players.forEach((el, idx) => {
        el.classList.remove('winner');
        if (idx === winnerPos) {
            el.classList.add('winner');
            el.style.boxShadow = '0 0 24px 8px #FFD700, 0 0 0 4px #fff inset';
            el.style.transition = 'box-shadow 0.5s';
        } else {
            el.style.boxShadow = '';
        }
    });
    // Плавное появление фишек в банке
    const bank = document.querySelector('.seka-bank');
    if (bank) {
        const chips = document.createElement('div');
        chips.style.display = 'flex';
        chips.style.justifyContent = 'center';
        chips.style.gap = '6px';
        chips.style.marginTop = '8px';
        chips.innerHTML = `
            <div class="chip" style="opacity:0;"></div>
            <div class="chip" style="opacity:0;"></div>
            <div class="chip" style="opacity:0;"></div>
        `;
        bank.appendChild(chips);
        setTimeout(() => {
            chips.childNodes.forEach((chip, i) => {
                setTimeout(() => {
                    chip.style.transition = 'opacity 0.4s';
                    chip.style.opacity = '1';
                }, i * 120);
            });
        }, 200);
    }
}

window.onload = () => {
    renderStage(stages[currentStage]);
    // Для теста: клик по экрану — следующий этап
    document.getElementById('seka-root').onclick = nextStage;
};

// --- Компоненты для переноса в React/TSX ---

/**
 * Player — компонент игрока
 * @param {Object} props - name, balance, avatar, pos, bet, waiting, fold, active, placeholder, cardsBack, openCards
 * Используйте аналогичную структуру для React-компонента
 */
function Player({name, balance, avatar, pos, bet, waiting, fold, active, placeholder, cardsBack, openCards}) {
    // ... (см. renderPlayer, используйте JSX вместо строк)
}

/**
 * Table — компонент стола с игроками
 * @param {Array} players - массив игроков
 * @param {string} bank - сумма в банке
 * @param {string} logo - логотип/название игры
 * Используйте для основного контейнера React
 */
function Table({players, bank, logo}) {
    // ... (см. renderTurn/renderQueue, используйте JSX)
}

/**
 * Controls — панель управления (кнопки, ставка, баланс, аватар)
 * Используйте для нижней панели React-компонента
 */
function Controls({bet, balance, avatar, onCall, onRaise, onFold}) {
    // ... (см. .seka-controls-panel, используйте JSX)
}

/**
 * BetModal — модальное окно ставок
 * Используйте для React-модального окна
 */
function BetModal({chipValues, selectedChip, betAmount, onSelect, onMax, onCancel}) {
    // ... (см. renderBetting, используйте JSX)
}

// --- Конец компонентов для React ---

// Остальной код макета (рендер, анимации, переключение этапов) оставляю для теста и примера.
// Для интеграции в React используйте компоненты выше и соответствующие хуки/состояния.

// ... (остальной код без изменений) ... 