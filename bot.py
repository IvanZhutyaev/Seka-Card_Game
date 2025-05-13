import logging
import os
from dotenv import load_dotenv
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton, WebAppInfo
load_dotenv()
# Настройка логирования
logging.basicConfig(level=logging.INFO)

# Замените на ваш токен от @BotFather
BOT_TOKEN = os.getenv("BOT_TOKEN")
# URL вашего веб-приложения (например, через ngrok)
WEB_APP_URL = os.getenv("WEB_APP_URL")

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    # Создаем кнопку с Web App
    web_app_button = KeyboardButton(
        text="Открыть Mini App",
        web_app=WebAppInfo(url=WEB_APP_URL)
    )
    keyboard = ReplyKeyboardMarkup(
        keyboard=[[web_app_button]],
        resize_keyboard=True
    )
    await message.answer(
        "Нажмите кнопку ниже, чтобы открыть Mini App!",
        reply_markup=keyboard
    )
async def main():
    await dp.start_polling(bot)
if __name__ == "__main__":
    import asyncio

    asyncio.run(main())