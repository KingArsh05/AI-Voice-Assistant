from flask import Flask, jsonify
from flask_cors import CORS

from src.config import Config
from src.db.connection import mongodb

from src.controllers.voice_controller import voice_bp


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(
        app,
        resources={r"/*": {"origins": "*"}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    )

    if not mongodb.connect():
        raise RuntimeError("MongoDB connection failed")

    @app.route("/health", methods=["GET"])
    def health_check():
        return (
            jsonify(
                {
                    "status": "healthy",
                    "environment": Config.ENV,
                }
            ),
            200,
        )

    app.register_blueprint(voice_bp, url_prefix="/api/v1/voice")

    return app
