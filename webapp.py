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

def verify_telegram_webapp_data(init_data: str) -> bool:
    """Проверка подписи данных от Telegram WebApp"""
    try:
        # Разбираем initData
        data_check_string = []
        for key, value in sorted(init_data.items()):
            if key != 'hash':
                data_check_string.append(f"{key}={value}")
        data_check_string = '\n'.join(data_check_string)

        # Создаем секретный ключ
        secret_key = hmac.new(
            "WebAppData".encode(),
            settings.BOT_TOKEN.encode(),
            hashlib.sha256
        ).digest()

        # Вычисляем хеш
        data_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()

        # Сравниваем хеши
        return data_hash == init_data.get('hash', '')
    except Exception as e:
        print(f"Error verifying Telegram WebApp data: {e}")
        return False

async def verify_telegram_request(request: Request) -> bool:
    """Проверка запроса от Telegram"""
    try:
        # Получаем initData из заголовка
        init_data = request.headers.get('X-Telegram-Init-Data')
        if not init_data:
            return False

        # Проверяем подпись
        return verify_telegram_webapp_data(json.loads(init_data))
    except Exception as e:
        print(f"Error verifying Telegram request: {e}")
        return False

@app.middleware("http")
async def verify_telegram_middleware(request: Request, call_next):
    """Middleware для проверки запросов от Telegram"""
    # Пропускаем проверку для всех статических файлов и ресурсов
    if any([
        request.url.path.startswith("/static/"),
        request.url.path.endswith((".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".tsx")),
        "/gameplay/static/" in request.url.path,
        "/gameplay/public/" in request.url.path
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

        is_valid = verify_telegram_webapp_data(init_data)
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
app.mount("/gameplay/static", StaticFiles(directory="pages/gameplay/static"), name="gameplay_static")
app.mount("/gameplay/public", StaticFiles(directory="pages/gameplay/public"), name="gameplay_public")

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

if __name__ == "__main__":
    import uvicorn
    print("Starting FastAPI application...")
    uvicorn.run(app, host="0.0.0.0", port=8000)