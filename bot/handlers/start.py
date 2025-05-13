from aiogram import *
from aiogram.types import *
from keyboards.inline import main_menu_keyboard
from aiogram.filters import Command

router = Router()


@router.message(Command("start"))
async def cmd_start(message: types.Message):
    web_app = WebAppInfo(url="https://ваш-frontend.vercel.app")

    await message.answer(
        "🎮 Добро пожаловать в игру <b>Сека</b>!\n\n"
        "Нажмите кнопку ниже, чтобы начать игру:",
        reply_markup=main_menu_keyboard(web_app),
        parse_mode="HTML"
    )

