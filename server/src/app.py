from flask import Flask, jsonify
from flask_cors import CORS
from src.config import Config
from src.db.connection import Database

from src.controllers.voice_controller import voice_bp
from src.controllers.hotel_controller import hotel_bp

def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app)

    Database.connect()

    @app.route("/health", methods=["GET"])
    def health_check():
        return jsonify({"status": "healthy", "environment": Config.ENV}), 200

    app.register_blueprint(voice_bp, url_prefix="/api/v1/voice")
    app.register_blueprint(hotel_bp, url_prefix="/api/v1/hotels")

    return app