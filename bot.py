import logging
import os
import sys
import psycopg2
from psycopg2.extras import DictCursor
from dotenv import load_dotenv
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import (
    ReplyKeyboardMarkup, 
    KeyboardButton, 
    WebAppInfo
)

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Загрузка переменных окружения
load_dotenv()

# Конфигурация
BOT_TOKEN = os.getenv("BOT_TOKEN")
if not BOT_TOKEN:
    logger.error("❌ BOT_TOKEN не найден в .env файле")
    sys.exit(1)

WEB_APP_URL = os.getenv("WEB_APP_URL")
if not WEB_APP_URL:
    logger.error("❌ WEB_APP_URL не найден в .env файле")
    sys.exit(1)

DB_CONFIG = {
    'dbname': os.getenv('POSTGRES_DB', 'seka'),
    'user': os.getenv('POSTGRES_USER', 'seka_user'),
    'password': os.getenv('POSTGRES_PASSWORD', 'your_password'),
    'host': os.getenv('POSTGRES_HOST', 'localhost'),
    'port': os.getenv('POSTGRES_PORT', '5432')
}

# Инициализация бота
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

def get_db_connection():
    """Устанавливает соединение с базой данных"""
    try:
        return psycopg2.connect(**DB_CONFIG)
    except psycopg2.Error as e:
        logger.error(f"❌ Ошибка подключения к базе данных: {e}")
        return None

async def is_user_registered(user_id: int) -> bool:
    """Проверяет, зарегистрирован ли пользователь в базе данных"""
    conn = None
    try:
        conn = get_db_connection()
        if not conn:
            return False
            
        with conn.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM players WHERE id = %s",
                (user_id,)
            )
            return bool(cur.fetchone())
    except Exception as e:
        logger.error(f"❌ Ошибка при проверке регистрации пользователя: {e}")
        return False
    finally:
        if conn:
            conn.close()

async def register_user(user: types.User) -> bool:
    """Регистрирует нового пользователя в базе данных"""
    conn = None
    try:
        conn = get_db_connection()
        if not conn:
            return False
            
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO players (id, telegram_id, first_name, last_name, username)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
                RETURNING id
                """,
                (user.id, user.id, user.first_name, user.last_name, user.username)
            )
            conn.commit()
            return bool(cur.fetchone())
    except Exception as e:
        logger.error(f"❌ Ошибка при регистрации пользователя: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    """Обработчик команды /start с проверкой регистрации"""
    try:
        user = message.from_user
        
        # Проверяем регистрацию
        if not await is_user_registered(user.id):
            await message.answer(
                "⚠️ Вы не зарегистрированы!\n"
                "Для регистрации введите команду /reg"
            )
            return
        
        # Продолжаем исходный функционал
        web_app_button = KeyboardButton(
            text="🎮 Играть в Сека",
            web_app=WebAppInfo(url=WEB_APP_URL)
        )
        keyboard = ReplyKeyboardMarkup(
            keyboard=[[web_app_button]],
            resize_keyboard=True
        )
        await message.answer(
            "Добро пожаловать в игру Сека!\nНажмите кнопку ниже, чтобы начать:",
            reply_markup=keyboard
        )
    except Exception as e:
        logger.error(f"❌ Ошибка в команде start: {e}")
        await message.answer("❌ Произошла ошибка. Попробуйте позже.")

@dp.message(Command("reg"))
async def cmd_reg(message: types.Message):
    """Обработчик команды регистрации"""
    try:
        user = message.from_user
        
        if await is_user_registered(user.id):
            await message.answer("ℹ️ Вы уже зарегистрированы!")
            return
        
        if await register_user(user):
            await message.answer(
                "✅ Регистрация прошла успешно!\n"
                "Теперь вы можете начать игру с помощью команды /start"
            )
        else:
            await message.answer("❌ Ошибка при регистрации. Попробуйте позже.")
    except Exception as e:
        logger.error(f"❌ Ошибка в команде reg: {e}")
        await message.answer("❌ Произошла ошибка. Попробуйте позже.")

async def main():
    """Запуск бота"""
    try:
        logger.info("🚀 Бот запускается...")
        await dp.start_polling(bot)
    except Exception as e:
        logger.error(f"❌ Ошибка при запуске бота: {e}")
        sys.exit(1)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
