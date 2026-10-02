import os
import sys
from dotenv import load_dotenv

load_dotenv()


class Config:
    ENV = os.getenv("FLASK_ENV", "development")
    DEBUG = os.getenv("FLASK_DEBUG", "True").lower() in ("true", "1", "yes")
    PORT = int(os.getenv("PORT", 8000))

    MONGO_URI = os.getenv("MONGO_URI")
    MONGO_DB_NAME = os.getenv("MONGO_DB_NAME")

    PLIVO_AUTH_ID = os.getenv("PLIVO_AUTH_ID")
    PLIVO_AUTH_TOKEN = os.getenv("PLIVO_AUTH_TOKEN")
    PLIVO_PHONE_NUMBER = os.getenv("PLIVO_PHONE_NUMBER")

    PLIVO_OUTBOUND_API_URL = os.getenv("PLIVO_OUTBOUND_API_URL")

    WS_URL = os.getenv("WS_URL")
    SERVER_URL = os.getenv("SERVER_URL")

    COMBOT_BASE_URL = os.getenv(
        "COMBOT_BASE_URL",
        "https://combot-crm-v2dot1-316221817495.asia-south1.run.app"
    )
    COMBOT_SECRET_KEY = os.getenv(
        "COMBOT_SECRET_KEY",
        "django-insecure-staychat_super_secret_key"
    )

    @classmethod
    def validate(cls):
        """Fail fast if critical environment variables are missing."""

        required = [
            "PLIVO_AUTH_ID",
            "PLIVO_AUTH_TOKEN",
            "PLIVO_PHONE_NUMBER",
            "PLIVO_OUTBOUND_API_URL",
            "MONGO_URI",
            "MONGO_DB_NAME",
            "ENV",
        ]
        missing = [key for key in required if not getattr(cls, key)]
        if missing:
            sys.exit(
                f"❌ Configuration Error: Missing required env vars: {', '.join(missing)}"
            )


Config.validate()
