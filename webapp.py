from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI()

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
# Главная страница должна перенаправлять на Game-start.html
@app.get("/")
async def read_root():
    return await get_page("main_menu")

# Обработка всех разрешенных страниц
@app.get("/{page_name}")
async def get_page(page_name: str):
    if page_name not in ALLOWED_PAGES:
        raise HTTPException(status_code=403, detail="Forbidden")

    file_path = ALLOWED_PAGES[page_name]
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(file_path)

app.mount("/static", StaticFiles(directory="pages/static"), name="static")




if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)