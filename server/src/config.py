import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()


def get_required_env(name: str) -> str:
    """Retrieve an environment variable or raise RuntimeError if missing/empty."""
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Required environment variable '{name}' is not set.")
    return value


def get_env_bool(name: str, default: bool = False) -> bool:
    """Parse boolean environment variables safely."""
    val = os.getenv(name)
    if val is None:
        return default
    return val.strip().lower() in ("true", "1", "t", "yes", "y")


def get_env_int(name: str, default: int) -> int:
    """Parse integer environment variables safely."""
    val = os.getenv(name)
    if val is None:
        return default
    try:
        return int(val)
    except ValueError:
        return default


class Config:
    """Application configuration loaded from environment variables."""

    # Server & Environment
    ENV: str = os.getenv("FLASK_ENV", "development")
    DEBUG: bool = get_env_bool("FLASK_DEBUG", default=True)
    PORT: int = get_env_int("PORT", default=8000)


    # MongoDB Configuration (Required)
    MONGO_URI: str = get_required_env("MONGO_URI")
    MONGODB_DB_NAME: str = get_required_env("MONGODB_DB_NAME")
    MONGODB_SOURCE_DB_NAME: str = get_required_env("MONGODB_SOURCE_DB_NAME")

    # Plivo Telephony Configuration (Required for voice services)
    PLIVO_AUTH_ID: str = get_required_env("PLIVO_AUTH_ID")
    PLIVO_AUTH_TOKEN: str = get_required_env("PLIVO_AUTH_TOKEN")
    PLIVO_PHONE_NUMBER: str = get_required_env("PLIVO_PHONE_NUMBER")
    PLIVO_OUTBOUND_API_URL: str = get_required_env("PLIVO_OUTBOUND_API_URL")

    # Service & WebSocket Endpoints (Optional with fallback to None)
    SERVER_URL: Optional[str] = os.getenv("SERVER_URL")
    WS_URL: Optional[str] = os.getenv("WS_URL")

    # Combot CRM Integration
    COMBOT_BASE_URL: str = os.getenv(
        "COMBOT_BASE_URL",
        "https://combot-crm-v2dot1-316221817495.asia-south1.run.app",
    )
    COMBOT_SECRET_KEY: str = os.getenv(
        "COMBOT_SECRET_KEY",
        "django-insecure-staychat_super_secret_key",
    )

