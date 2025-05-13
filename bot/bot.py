import asyncio
from handlers import start
from config import dp, bot
async def main():
    dp.include_router(start.router)
    await dp.start_polling(bot)
if __name__ == "__main__":
    asyncio.run(main())

