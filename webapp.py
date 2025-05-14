from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI()

# Разрешаем доступ только к Game-start.html
@app.get("/")
async def read_root():
    return await read_game_file()

@app.get("/Game-start.html")
async def read_game_file():
    if not os.path.exists("pages/Game-start.html"):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse("pages/Game-start.html")

# Запрещаем все остальные пути
@app.get("/{path:path}")
async def deny_all(path: str):
    raise HTTPException(status_code=403, detail="Forbidden")

# Для статических файлов (если нужно)
app.mount("/pages", StaticFiles(directory="pages"), name="pages")