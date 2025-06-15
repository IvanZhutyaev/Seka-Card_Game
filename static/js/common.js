// Утилиты для работы с состоянием игры
const GameState = {
    save: function(state) {
        localStorage.setItem('gameState', JSON.stringify(state));
    },

    load: function() {
        const state = localStorage.getItem('gameState');
        return state ? JSON.parse(state) : null;
    },

    update: function(newState) {
        const currentState = this.load() || {};
        const updatedState = { ...currentState, ...newState };
        this.save(updatedState);
    },

    clear: function() {
        localStorage.removeItem('gameState');
    }
};

// Общие утилиты для форматирования
const Utils = {
    formatMoney: function(amount) {
        return new Intl.NumberFormat('ru-RU').format(amount);
    },

    formatDate: function(date) {
        return new Intl.DateTimeFormat('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(date));
    }
};

// Экспортируем утилиты для использования в других файлах
window.GameState = GameState;
window.Utils = Utils; 