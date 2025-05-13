from config import bot

async def notify_player(user_id: int, text: str):
    try:
        await bot.send_message(
            chat_id=user_id,
            text=text,
            disable_web_page_preview=True
        )
    except Exception as e:
        print(f"Ошибка уведомления: {e}")