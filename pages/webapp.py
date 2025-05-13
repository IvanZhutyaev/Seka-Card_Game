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