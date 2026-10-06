from flask import Flask, jsonify
from flask_cors import CORS

from src.config import Config
from src.db.connection import mongodb

from src.controllers.voice_controller import voice_bp
from src.controllers.hotel_controller import hotel_bp
from src.controllers.campaign_controller import campaign_bp
from src.controllers.crm_controller import crm_bp
from src.controllers.knowledge_base_controller import knowledge_base_bp


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app)

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
    app.register_blueprint(hotel_bp, url_prefix="/api/v1/hotels")
    app.register_blueprint(campaign_bp, url_prefix="/api/v1/campaigns")
    app.register_blueprint(crm_bp, url_prefix="/api/v1/crm")
    app.register_blueprint(knowledge_base_bp, url_prefix="/api/v1/hotels")

    return app

