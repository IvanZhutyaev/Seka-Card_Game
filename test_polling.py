import logging
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

logging.basicConfig(level=logging.DEBUG)

BOT_TOKEN = "7685339838:AAF2Z1uint4fuZEFmz14QGjp1hMDYORYrx4"

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    logging.info(f"Получена команда /start от {update.effective_user.id}")
    await update.message.reply_text("Бот работает! 🎉")

def main():
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.run_polling()

if __name__ == "__main__":
    main()