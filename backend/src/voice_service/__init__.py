from flask import Flask
from .config import Config

from .routes.voice import voice_bp

def create_app():
    app = Flask(__name__)

    # 1. --- Load Configurations ---
    app.config.from_object(Config)

    # 2. --- Blueprints ---
    app.register_blueprint(voice_bp)

    # 3. --- CORS Support ---
    @app.before_request
    def handle_options():
        from flask import request, Response
        if request.method == "OPTIONS":
            res = Response(status=200)
            res.headers["Access-Control-Allow-Origin"] = "*"
            res.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            res.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
            return res

    @app.after_request
    def add_cors_headers(response):
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        return response

    """ To verify my configrations loaded successfully. """

    @app.route("/health")
    def health():
        return {"status": "ok", "plivo_configured": bool(app.config["PLIVO_AUTH_ID"])}

    return app

def main():
    app = create_app()
    app.run(host="127.0.0.1", port=5000, debug=True)
