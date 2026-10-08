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
    MONGODB_CRM_URL:str = get_required_env("MONGODB_CRM_URL")

    MONGODB_DB_NAME: str = get_required_env("MONGODB_DB_NAME")
    MONGODB_SOURCE_DB_NAME: str = get_required_env("MONGODB_SOURCE_DB_NAME")
    MONGODB_CRM_DB_NAME: str = get_required_env("MONGODB_CRM_DB_NAME")

    # Plivo Telephony Configuration (Required for voice services)
    PLIVO_AUTH_ID: str = get_required_env("PLIVO_AUTH_ID")
    PLIVO_AUTH_TOKEN: str = get_required_env("PLIVO_AUTH_TOKEN")
    PLIVO_PHONE_NUMBER: str = get_required_env("PLIVO_PHONE_NUMBER")
    PLIVO_OUTBOUND_API_URL: str = get_required_env("PLIVO_OUTBOUND_API_URL")

    # Service & WebSocket Endpoints (Optional with fallback to None)
    SERVER_URL: str = get_required_env("SERVER_URL")
    WS_URL: str = get_required_env("WS_URL")

    # Combot CRM Integration
    GROQ_API_KEY: str = get_required_env("GROQ_API_KEY")

    # Knowledge Base Cache TTL in hours (defaults to 3 hours)
    HOTEL_KB_CACHE_TTL_HOURS: int = get_env_int("HOTEL_KB_CACHE_TTL_HOURS", default=3)
