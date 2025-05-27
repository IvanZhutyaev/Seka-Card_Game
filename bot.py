import logging
from dotenv import load_dotenv
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes
import os
from db import get_db
from wallet import WalletManager
from models import Player
from sqlalchemy.orm import Session

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

load_dotenv()

# Конфигурация
TELEGRAM_BOT_TOKEN = os.getenv("BOT_TOKEN")
WEBAPP_URL = os.getenv("WEB_APP_URL", "").strip()  # Удаляем пробелы

if not TELEGRAM_BOT_TOKEN:
    logger.critical("BOT_TOKEN не найден в переменных окружения!")
    exit(1)


async def get_or_create_player(db: Session, user: dict) -> Player:
    """Получить или создать игрока"""
    player = db.query(Player).filter(Player.telegram_id == user.id).first()
    if not player:
        player = Player(
            telegram_id=user.id,
            first_name=user.first_name,
            last_name=user.last_name,
            username=user.username,
            photo_url=user.photo_url if hasattr(user, 'photo_url') else None,
            balance=1000
        )
        db.add(player)
        db.commit()
        db.refresh(player)
    return player


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработка команды /start"""
    try:
        user = update.effective_user
        db = next(get_db())

        try:
            player = await get_or_create_player(db, user)
            wallet = WalletManager(db)
            balance = wallet.get_balance(user.id)

            keyboard = [
                [InlineKeyboardButton("🎮 Играть", web_app=WebAppInfo(url=WEBAPP_URL))],
                [InlineKeyboardButton("💰 Баланс", callback_data="balance")],
                [InlineKeyboardButton("📊 Статистика", callback_data="stats")],
                [InlineKeyboardButton("📜 История транзакций", callback_data="history")]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)

            await update.message.reply_text(
                f"Добро пожаловать в СЕКА, {user.first_name}!\n"
                f"Ваш текущий баланс: {balance}₽\n\n"
                "Выберите действие:",
                reply_markup=reply_markup
            )
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Ошибка в команде start: {str(e)}", exc_info=True)
        await update.message.reply_text("Произошла ошибка при обработке команды. Пожалуйста, попробуйте позже.")


async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработка нажатий на кнопки"""
    try:
        query = update.callback_query
        await query.answer()

        user_id = update.effective_user.id
        db = next(get_db())

        try:
            wallet = WalletManager(db)

            if query.data == "balance":
                balance = wallet.get_balance(user_id)
                await query.edit_message_text(f"Ваш баланс: {balance}₽")

            elif query.data == "stats":
                player = db.query(Player).filter(Player.telegram_id == user_id).first()
                if player:
                    win_rate = player.wins / player.games_played * 100 if player.games_played > 0 else 0
                    await query.edit_message_text(
                        f"Статистика:\n"
                        f"Игр сыграно: {player.games_played}\n"
                        f"Побед: {player.wins}\n"
                        f"Процент побед: {win_rate:.1f}%"
                    )

            elif query.data == "history":
                transactions = wallet.get_transaction_history(user_id, limit=5)
                if transactions:
                    history_text = "Последние транзакции:\n"
                    for t in transactions:
                        action_text = {
                            'bet': 'Ставка',
                            'win': 'Выигрыш',
                            'loss': 'Проигрыш',
                            'fold': 'Фолд',
                            'svara': 'Свара',
                            'join': 'Вход в игру',
                            'bluff': 'Блеф'
                        }.get(t['action'], t['action'])

                        history_text += f"{action_text}: {t['amount']}₽ ({t['created_at'].strftime('%d.%m %H:%M')}\n"
                    await query.edit_message_text(history_text)
                else:
                    await query.edit_message_text("История транзакций пуста")
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Ошибка в обработке кнопок: {str(e)}", exc_info=True)
        await query.answer("Произошла ошибка. Пожалуйста, попробуйте позже.")


async def error_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик ошибок"""
    logger.error("Exception while handling an update:", exc_info=context.error)


def main():
    """Запуск бота"""
    try:
        app = Application.builder().token(TELEGRAM_BOT_TOKEN).build()

        app.add_handler(CommandHandler("start", start))
        app.add_handler(CallbackQueryHandler(button_handler))
        app.add_error_handler(error_handler)

        logger.info("Бот запускается...")
        app.run_polling(drop_pending_updates=True)

    except Exception as e:
        logger.critical(f"Ошибка запуска бота: {str(e)}", exc_info=True)
        exit(1)


if __name__ == "__main__":
    main()