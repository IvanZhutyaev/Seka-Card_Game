from http.server import HTTPServer, SimpleHTTPRequestHandler

class SingleFileHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            self.path = '/Game-start.html'
        elif self.path != '/Game-start.html':
            self.send_error(403, "Forbidden")
            return
        super().do_GET()

HTTPServer(("", 8000), SingleFileHandler).serve_forever()

# НУЖНО СДЕЛАТЬ ЧЕРЕЗ FASTAPI(САЙТ ЖЕ ДИНАМИЧЕСКИЙ)
# from fastapi import FastAPI
# from fastapi.staticfiles import StaticFiles

# app = FastAPI()
# app.mount("/", StaticFiles(directory="static", html=True), name="static")
