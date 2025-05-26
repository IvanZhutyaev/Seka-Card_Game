from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
import os
import hmac
import hashlib
import json
from typing import Optional
from config import settings
from sqlalchemy.orm import Session
from db import get_db
from wallet import WalletManager
from models import Player
from urllib.parse import parse_qs, unquote

app = FastAPI()
security = HTTPBearer()

# Добавляем CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Разрешаем доступ только к указанным страницам
ALLOWED_PAGES = {
    "rules": "pages/rules.html",
    "settings": "pages/settings.html",
    "profile": "pages/profile.html",
    "transfer": "pages/transfer.html",
    "main_menu": "pages/main_menu.html",
    "bonus": "pages/bonuses.html",
    "invite": "pages/invite.html",
    "history": "pages/history.html",
    "game": "pages/gameplay/index.html"
}

def verify_telegram_data(init_data: str, bot_token: str) -> bool:
    """Проверка подлинности данных от Telegram WebApp"""
    try:
        # Декодируем URL-encoded данные
        decoded_data = unquote(init_data)
        
        # Разбираем строку init_data
        # Используем parse_qs для корректной обработки параметров
        data_dict = {}
        parsed = parse_qs(decoded_data)
        for key, values in parsed.items():
            # Берем первое значение, так как parse_qs всегда возвращает список
            data_dict[key] = values[0]
        
        if 'hash' not in data_dict:
            print("No hash found in init_data")
            return False
            
        # Извлекаем hash
        hash_value = data_dict.pop('hash')
        
        # Формируем строку для проверки
        data_check_string = '\n'.join(
            f"{k}={v}" for k, v in sorted(data_dict.items())
        )
        
        print(f"Data check string: {data_check_string}")
        
        # Создаем секретный ключ на основе bot_token
        secret_key = hmac.new(
            key=b'WebAppData',
            msg=bot_token.encode(),
            digestmod=hashlib.sha256
        ).digest()
        
        # Вычисляем hash
        calculated_hash = hmac.new(
            key=secret_key,
            msg=data_check_string.encode(),
            digestmod=hashlib.sha256
        ).hexdigest()
        
        print(f"Calculated hash: {calculated_hash}")
        print(f"Received hash: {hash_value}")
        
        # Сравниваем полученный hash с переданным
        return calculated_hash == hash_value
    except Exception as e:
        print(f"Error verifying Telegram data: {e}")
        import traceback
        print(traceback.format_exc())
        return False

async def verify_telegram_request(request: Request) -> bool:
    """Проверка запроса от Telegram"""
    try:
        # Получаем initData из заголовка
        init_data = request.headers.get('X-Telegram-Init-Data')
        if not init_data:
            return False

        # Проверяем подпись
        return verify_telegram_data(init_data, settings.BOT_TOKEN)
    except Exception as e:
        print(f"Error verifying Telegram request: {e}")
        return False

@app.middleware("http")
async def verify_telegram_middleware(request: Request, call_next):
    """Middleware для проверки запросов от Telegram"""
    # Пропускаем проверку для всех статических файлов и ресурсов
    if any([
        request.url.path.startswith("/static/"),
        request.url.path.startswith("/gameplay/"),  # Разрешаем все файлы из gameplay
        request.url.path.endswith((".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".tsx", ".json", ".woff", ".woff2", ".ttf")),
        "static" in request.url.path,
        "public" in request.url.path,
        "assets" in request.url.path
    ]):
        return await call_next(request)

    # Пропускаем проверку для первоначального GET запроса к страницам
    if request.method == "GET" and (request.url.path == "/" or request.url.path in [f"/{page}" for page in ALLOWED_PAGES.keys()]):
        return await call_next(request)

    # Проверяем запрос только для API endpoints и POST запросов
    if request.url.path.startswith("/api/") or request.method == "POST":
        if not await verify_telegram_request(request):
            return JSONResponse(
                status_code=403,
                content={"detail": "Invalid Telegram WebApp data"}
            )

    return await call_next(request)

# Главная страница должна показывать main_menu.html напрямую
@app.get("/")
async def read_root():
    file_path = ALLOWED_PAGES["main_menu"]
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        raise HTTPException(status_code=404, detail="File not found")
    
    print(f"Serving main menu file: {file_path}")
    return FileResponse(file_path)

# Обработка всех разрешенных страниц
@app.get("/{page_name}")
async def get_page(page_name: str):
    if page_name not in ALLOWED_PAGES:
        print(f"Forbidden access to page: {page_name}")
        raise HTTPException(status_code=403, detail="Forbidden")

    file_path = ALLOWED_PAGES[page_name]
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        raise HTTPException(status_code=404, detail="File not found")

    print(f"Serving file: {file_path}")
    return FileResponse(file_path)

# API для проверки initData
@app.post("/api/validate-init-data")
async def validate_init_data(request: Request):
    try:
        data = await request.json()
        init_data = data.get('initData')
        if not init_data:
            return JSONResponse(
                status_code=400,
                content={"valid": False, "error": "No initData provided"}
            )

        is_valid = verify_telegram_data(init_data, settings.BOT_TOKEN)
        return JSONResponse(
            status_code=200,
            content={"valid": is_valid}
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"valid": False, "error": str(e)}
        )

# Монтируем статические файлы
app.mount("/static", StaticFiles(directory="pages/static"), name="static")
app.mount("/gameplay", StaticFiles(directory="pages/gameplay"), name="gameplay")  # Монтируем всю директорию gameplay
app.mount("/gameplay/static", StaticFiles(directory="pages/gameplay/static"), name="gameplay_static")
app.mount("/gameplay/public", StaticFiles(directory="pages/gameplay/public"), name="gameplay_public")
app.mount("/gameplay/components", StaticFiles(directory="pages/gameplay/components"), name="gameplay_components")
app.mount("/gameplay/store", StaticFiles(directory="pages/gameplay/store"), name="gameplay_store")

# Добавляем обработчик ошибок
@app.exception_handler(404)
async def not_found_handler(request: Request, exc: HTTPException):
    print(f"404 Not Found: {request.url.path}")
    return JSONResponse(
        status_code=404,
        content={"detail": f"Path not found: {request.url.path}"}
    )

@app.exception_handler(500)
async def server_error_handler(request: Request, exc: Exception):
    print(f"500 Server Error: {request.url.path}, Error: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

@app.get("/api/wallet/balance")
async def get_wallet_balance(
    telegram_id: int,
    init_data: str,
    db: Session = Depends(get_db)
):
    """Получить баланс кошелька пользователя"""
    # Проверка подлинности данных
    if not verify_telegram_data(init_data, settings.BOT_TOKEN):
        raise HTTPException(status_code=401, detail="Unauthorized")

    wallet = WalletManager(db)
    balance = await wallet.get_balance(telegram_id)
    
    if balance is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"balance": balance}

@app.get("/api/wallet/transactions")
async def get_wallet_transactions(
    telegram_id: int,
    init_data: str,
    limit: Optional[int] = 10,
    db: Session = Depends(get_db)
):
    """Получить историю транзакций пользователя"""
    # Проверка подлинности данных
    if not verify_telegram_data(init_data, settings.BOT_TOKEN):
        raise HTTPException(status_code=401, detail="Unauthorized")

    wallet = WalletManager(db)
    transactions = await wallet.get_transaction_history(telegram_id, limit)
    
    return {"transactions": transactions}

@app.post("/api/wallet/update")
async def update_wallet_balance(
    telegram_id: int,
    amount: int,
    action: str,
    game_id: Optional[str] = None,
    init_data: str = None,
    db: Session = Depends(get_db)
):
    """Обновить баланс кошелька пользователя"""
    # Проверка подлинности данных
    if not verify_telegram_data(init_data, settings.BOT_TOKEN):
        raise HTTPException(status_code=401, detail="Unauthorized")

    wallet = WalletManager(db)
    success, message = await wallet.update_balance(telegram_id, amount, action, game_id)
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {"message": message}

if __name__ == "__main__":
    import uvicorn
    print("Starting FastAPI application...")
    uvicorn.run(app, host="0.0.0.0", port=8000)