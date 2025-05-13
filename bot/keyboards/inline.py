from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton,WebAppInfo
def main_menu_keyboard(web_app: WebAppInfo):
    play=InlineKeyboardButton(text="Играть",web_app=web_app)
    rules=InlineKeyboardButton(text="Правила",
            callback_data="rules")
    keyboard=InlineKeyboardMarkup(inline_keyboard=[[play], [rules]])

    return keyboard
