import os
from dotenv import load_dotenv

load_dotenv()


class Config:

    PLIVO_AUTH_ID = os.getenv("PLIVO_AUTH_ID")
    PLIVO_AUTH_TOKEN = os.getenv("PLIVO_AUTH_TOKEN")
    PLIVO_PHONE_NUMBER = os.getenv("PLIVO_PHONE_NUMBER")

    PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL")
    PLIVO_AGENT_FLOW_URL = os.getenv("PLIVO_AGENT_FLOW_URL")

    GOOGLE_SHEET_ID = os.getenv("GOOGLE_SHEET_ID")
    GOOGLE_SERVICE_ACCOUNT_FILE = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE")

    MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "ai-voice-calling")
