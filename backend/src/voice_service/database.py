"""
MongoDB connection singleton for the ai-voice-calling database.
Uses lazy initialization so the app starts even if MongoDB is temporarily unreachable.
Call get_db() to obtain a reference to the database.
"""

from __future__ import annotations
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.database import Database
from pymongo.errors import ConnectionFailure
from .config import Config

_client: MongoClient | None = None
_db: Database | None = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(Config.MONGODB_URI, serverSelectionTimeoutMS=5000)
    return _client


def get_db() -> Database:
    global _db
    if _db is None:
        _db = get_client()[Config.MONGODB_DB_NAME]
        _ensure_indexes(_db)
    return _db


def _ensure_indexes(db: Database) -> None:
    try:
        cl = db["call_logs"]
        cl.create_index([("call_uuid", ASCENDING)], unique=True, sparse=True)
        cl.create_index([("timestamp", DESCENDING)])
        cl.create_index([("campaign_id", ASCENDING)])
        cl.create_index([("call_outcome", ASCENDING)])
        camp = db["campaigns"]
        camp.create_index([("id", ASCENDING)], unique=True)
        camp.create_index([("is_active", ASCENDING)])
    except Exception as exc:
        print(f"[MongoDB] Warning - could not create indexes: {exc}")


def is_connected() -> bool:
    try:
        get_client().admin.command("ping")
        return True
    except (ConnectionFailure, Exception):
        return False
