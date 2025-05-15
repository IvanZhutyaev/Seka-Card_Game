from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI()

# Разрешаем доступ только к указанным страницам
ALLOWED_PAGES = ["rules.html", "settings.html", "profile.html"]

# Главная страница должна перенаправлять на Game-start.html
@app.get("/")
async def read_root():
    return await get_page("profile.html")

# Обработка всех разрешенных страниц
@app.get("/{page_name}")
async def get_page(page_name: str):
    if page_name not in ALLOWED_PAGES:
        raise HTTPException(status_code=403, detail="Forbidden")

    file_path = os.path.join("pages", page_name)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(file_path)




if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)