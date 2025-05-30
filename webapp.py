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
import logging

app = FastAPI()
security = HTTPBearer()

# Настройка логирования
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Добавляем CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Монтируем статические файлы
app.mount("/static", StaticFiles(directory="pages/static"), name="static")
app.mount("/build", StaticFiles(directory="build"), name="react_build")
app.mount("/build/static", StaticFiles(directory="build/static"), name="react_static")

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
    "game": "build/index.html"  # React приложение
}

def verify_telegram_data(init_data: str, bot_token: str) -> tuple[bool, str]:
    """Проверка подлинности данных от Telegram WebApp согласно официальной документации"""
    try:
        logger.info("Starting Telegram WebApp data verification")
        logger.debug(f"Received init_data: {init_data}")
        logger.debug(f"Bot token (first 5 chars): {bot_token[:5]}...")

        # Проверяем наличие данных
        if not init_data:
            logger.error("Init data is empty")
            return False, "Init data is empty"

        # Разбираем строку init_data на параметры
        try:
            # Пробуем разобрать как JSON
            try:
                json_data = json.loads(init_data)
                if isinstance(json_data, dict):
                    params = json_data
                    logger.debug("Successfully parsed init_data as JSON")
                else:
                    raise ValueError("JSON data is not a dictionary")
            except json.JSONDecodeError:
                # Если не JSON, разбираем как query string
                params = {}
                logger.debug("Parsing init_data as query string")
                for param in init_data.split('&'):
                    if '=' not in param:
                        continue
                    key, value = param.split('=', 1)
                    params[key] = unquote(value)

            logger.debug(f"Parsed parameters: {params}")
        except Exception as e:
            logger.error(f"Failed to parse parameters: {str(e)}")
            return False, f"Failed to parse parameters: {str(e)}"

        # Получаем hash
        received_hash = params.pop('hash', None)
        logger.debug(f"Received hash: {received_hash}")
        
        if not received_hash:
            logger.error("No hash found in init_data")
            return False, "No hash found in init_data"

        # Сортируем оставшиеся параметры
        data_check_arr = []
        logger.debug("Sorting parameters...")
        for key in sorted(params.keys()):
            data_check_arr.append(f"{key}={params[key]}")
            logger.debug(f"Added sorted parameter: {key}={params[key]}")
        
        # Создаем check_string
        data_check_string = '\n'.join(data_check_arr)
        logger.debug(f"Created check_string: {data_check_string}")

        # Создаем секретный ключ
        logger.debug("Creating secret key...")
        secret_key = hmac.new(
            "WebAppData".encode(),
            bot_token.encode(),
            hashlib.sha256
        ).digest()
        logger.debug("Secret key created successfully")

        # Вычисляем хеш
        logger.debug("Calculating hash...")
        calculated_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()
        logger.debug(f"Calculated hash: {calculated_hash}")

        if calculated_hash != received_hash:
            logger.error(f"Hash mismatch: received {received_hash}, calculated {calculated_hash}")
            logger.error(f"Data used for hash calculation: {data_check_string}")
            return False, f"Hash mismatch: received {received_hash}, calculated {calculated_hash}"

        logger.info("Verification successful")
        return True, "Verification successful"
    except Exception as e:
        logger.exception(f"Verification error: {str(e)}")
        return False, f"Verification error: {str(e)}"

async def verify_telegram_request(request: Request) -> bool:
    """Проверка запроса от Telegram"""
    try:
        # Проверяем все возможные варианты заголовка
        init_data = (
            request.headers.get('Telegram-Web-App-Init-Data') or 
            request.headers.get('X-Telegram-Init-Data') or
            request.headers.get('X-Telegram-Web-App-Init-Data')
        )
        
        logger.debug(f"Headers in verify_telegram_request: {dict(request.headers)}")
        logger.debug(f"Init data found: {init_data}")
        
        if not init_data:
            logger.error("No init data found in any of the expected headers")
            return False

        # Проверяем подпись
        is_valid, message = verify_telegram_data(init_data, settings.BOT_TOKEN)
        logger.debug(f"Verification result: valid={is_valid}, message={message}")
        return is_valid
    except Exception as e:
        logger.exception(f"Error verifying Telegram request: {e}")
        return False

@app.middleware("http")
async def verify_telegram_middleware(request: Request, call_next):
    """Middleware для проверки запросов от Telegram"""
    # Пропускаем проверку для всех статических файлов и ресурсов
    if any([
        request.url.path.startswith("/static/"),
        request.url.path.startswith("/build/"),
        request.url.path.startswith("/gameplay/"),
        request.url.path.endswith((".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".tsx", ".json", ".woff", ".woff2", ".ttf")),
        "static" in request.url.path,
        "public" in request.url.path,
        "assets" in request.url.path,
        "build" in request.url.path
    ]):
        return await call_next(request)

    # Пропускаем проверку для первоначального GET запроса к страницам
    if request.method == "GET" and (request.url.path == "/" or request.url.path in [f"/{page}" for page in ALLOWED_PAGES.keys()]):
        return await call_next(request)

    # Особая обработка для WebSocket подключений
    if request.url.path.startswith("/ws/"):
        # Получаем initData из query параметров для WebSocket
        try:
            init_data = request.query_params.get('initData')
            if init_data and await verify_telegram_request(Request(scope={"type": "http", "headers": [(b"Telegram-Web-App-Init-Data", init_data.encode())]})):
                return await call_next(request)
            else:
                return JSONResponse(
                    status_code=403,
                    content={"detail": "Invalid WebSocket connection data"}
                )
        except Exception as e:
            logger.error(f"WebSocket verification error: {e}")
            return JSONResponse(
                status_code=403,
                content={"detail": "WebSocket verification failed"}
            )

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

# Добавляем обработку всех путей для React приложения
@app.get("/game/{full_path:path}")
async def serve_game_app(full_path: str):
    """Обработчик для всех путей внутри /game"""
    return FileResponse("build/index.html")

# API для проверки initData
@app.post("/api/validate-init-data")
async def validate_init_data(request: Request):
    """Валидация данных инициализации Telegram WebApp"""
    try:
        # Пробуем получить данные разными способами
        try:
            data = await request.json()
        except json.JSONDecodeError:
            # Если не JSON, пробуем получить form data
            form = await request.form()
            data = dict(form)
            if not data:
                # Если и form data нет, проверяем headers
                init_data = request.headers.get('Telegram-Web-App-Init-Data')
                if init_data:
                    data = {"initData": init_data}
                else:
                    return JSONResponse(
                        status_code=400,
                        content={
                            "valid": False,
                            "error": "No data provided",
                            "detail": "Request must contain initData either in body, form, or header"
                        }
                    )

        init_data = data.get('initData')
        logger.debug(f"Validating init_data: {init_data}")
        logger.debug(f"Request headers: {dict(request.headers)}")
        
        if not init_data:
            return JSONResponse(
                status_code=400,
                content={
                    "valid": False, 
                    "error": "No initData provided",
                    "received_data": data
                }
            )

        is_valid, verify_message = verify_telegram_data(init_data, settings.BOT_TOKEN)
        return JSONResponse(
            status_code=200,
            content={
                "valid": is_valid, 
                "message": verify_message,
                "init_data": init_data
            }
        )
    except Exception as e:
        logger.exception("Error in validate_init_data")
        return JSONResponse(
            status_code=500,
            content={
                "valid": False, 
                "error": str(e),
                "traceback": str(e.__traceback__)
            }
        )

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
    request: Request,
    db: Session = Depends(get_db)
):
    """Получить баланс кошелька пользователя"""
    try:
        logger.info(f"Getting wallet balance for telegram_id: {telegram_id}")
        logger.debug(f"All headers: {dict(request.headers)}")
        
        # Проверяем все возможные варианты заголовка
        init_data = (
            request.headers.get('Telegram-Web-App-Init-Data') or 
            request.headers.get('X-Telegram-Init-Data') or
            request.headers.get('X-Telegram-Web-App-Init-Data')
        )
        
        if not init_data:
            logger.error("Missing Telegram WebApp data in headers")
            raise HTTPException(
                status_code=401, 
                detail={
                    "error": "Missing Telegram WebApp data",
                    "headers": dict(request.headers)
                }
            )

        # Проверяем подлинность данных
        logger.info("Verifying Telegram WebApp data...")
        is_valid, verify_message = verify_telegram_data(init_data, settings.BOT_TOKEN)
        
        if not is_valid:
            logger.error(f"Invalid Telegram WebApp data: {verify_message}")
            raise HTTPException(
                status_code=401, 
                detail={
                    "error": "Invalid Telegram WebApp data",
                    "details": verify_message,
                    "init_data": init_data
                }
            )

        # Получаем баланс
        logger.info("Getting balance from WalletManager...")
        wallet = WalletManager(db)
        balance = wallet.get_balance(telegram_id)
        
        if balance is None:
            logger.error(f"User not found: {telegram_id}")
            raise HTTPException(
                status_code=404, 
                detail={
                    "error": "User not found",
                    "telegram_id": telegram_id
                }
            )
        
        logger.info(f"Successfully retrieved balance: {balance}")
        return {"balance": balance}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unexpected error in get_wallet_balance")
        raise HTTPException(
            status_code=500, 
            detail={
                "error": "Internal server error",
                "message": str(e)
            }
        )

@app.get("/api/wallet/transactions")
async def get_wallet_transactions(
    telegram_id: int,
    init_data: str,
    limit: Optional[int] = 10,
    db: Session = Depends(get_db)
):
    """Получить историю транзакций пользователя"""
    # Проверка подлинности данных
    if not verify_telegram_data(init_data, settings.BOT_TOKEN)[0]:
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
    if not verify_telegram_data(init_data, settings.BOT_TOKEN)[0]:
        raise HTTPException(status_code=401, detail="Unauthorized")

    wallet = WalletManager(db)
    success, message = await wallet.update_balance(telegram_id, amount, action, game_id)
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {"message": message}

if __name__ == "__main__":
    import uvicorn
    print("Starting FastAPI application...")
    uvicorn.run(app, host="0.0.0.0", port=3000)