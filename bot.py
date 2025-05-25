import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes
import os
from typing import Dict

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Конфигурация
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "your_bot_token_here")
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://your-domain.com/pages/gameplay/index.html")

# Хранилище данных игроков
player_data: Dict[int, dict] = {}

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработка команды /start"""
    user = update.effective_user
    user_id = user.id
    
    # Инициализация данных игрока
    if user_id not in player_data:
        player_data[user_id] = {
            "balance": 1000,  # Начальный баланс
            "games_played": 0,
            "games_won": 0,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "photo_url": user.photo_url if hasattr(user, 'photo_url') else None
        }
    
    # Создаем клавиатуру с WebApp
    keyboard = [
        [InlineKeyboardButton("🎮 Играть", web_app=WebAppInfo(url=WEBAPP_URL))],
        [InlineKeyboardButton("💰 Баланс", callback_data="balance")],
        [InlineKeyboardButton("📊 Статистика", callback_data="stats")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        f"Добро пожаловать в СЕКА, {user.first_name}!\n"
        "Выберите действие:",
        reply_markup=reply_markup
    )

async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработка нажатий на кнопки"""
    query = update.callback_query
    user_id = update.effective_user.id
    
    if query.data == "balance":
        balance = player_data[user_id]["balance"]
        await query.answer(f"Ваш баланс: {balance}₽")
        
    elif query.data == "stats":
        stats = player_data[user_id]
        await query.answer(
            f"Статистика:\n"
            f"Игр сыграно: {stats['games_played']}\n"
            f"Побед: {stats['games_won']}\n"
            f"Процент побед: {stats['games_won']/stats['games_played']*100 if stats['games_played'] > 0 else 0:.1f}%"
        )

def main():
    """Запуск бота"""
    application = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
    
    # Добавляем обработчики
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CallbackQueryHandler(button_handler))
    
    # Запускаем бота
    application.run_polling()

if __name__ == "__main__":
    main()
