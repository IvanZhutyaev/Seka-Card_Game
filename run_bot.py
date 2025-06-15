from src.telegram_bot import create_bot_app

def main():
    app = create_bot_app()
    app.run_polling()

if __name__ == "__main__":
    main()