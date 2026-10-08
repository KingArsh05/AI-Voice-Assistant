import time

from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError

from src.config import Config


class MongoDB:
    def __init__(self):
        self.client = MongoClient(
            Config.MONGO_URI,
            serverSelectionTimeoutMS=5000,
        )
        self.crm_client = MongoClient(
            Config.MONGODB_CRM_URL,
            serverSelectionTimeoutMS=5000,
        )

        self.voice_calling_app_db = self.client[Config.MONGODB_DB_NAME]
        self.staychat_clone_db = self.client[Config.MONGODB_SOURCE_DB_NAME]
        self.crm_db = self.crm_client[Config.MONGODB_CRM_DB_NAME]

    def connect(self) -> bool:
        start_time = time.perf_counter()

        try:
            self.client.admin.command("ping")
            elapsed_ms = (time.perf_counter() - start_time) * 1000

            print("\n" + "=" * 55)
            print("  DATABASE CONNECTION")
            print("=" * 55)
            print("  Status     : ✅ Connected")
            print("  Database   :", Config.MONGODB_DB_NAME)
            print("  Source DB  :", Config.MONGODB_SOURCE_DB_NAME)
            print(f"  Response   : {elapsed_ms:.2f} ms")
            print("=" * 55 + "\n")

            self.ensure_indexes()
            return True

        except ServerSelectionTimeoutError as error:
            elapsed_ms = (time.perf_counter() - start_time) * 1000

            print("\n" + "=" * 55)
            print("  DATABASE CONNECTION")
            print("=" * 55)
            print("  Status     : ❌ Failed")
            print(f"  Response   : {elapsed_ms:.2f} ms")
            print(f"  Error      : {error}")
            print("=" * 55 + "\n")

            return False

    def ensure_indexes(self) -> None:
        """Create required indexes for hotel_knowledge_bases and voice_call_logs per system plan."""
        try:
            # Collection 1: hotel_knowledge_bases
            self.voice_calling_app_db["hotel_knowledge_bases"].create_index(
                [("hotel_id", 1)], unique=True, background=True
            )
            self.voice_calling_app_db["hotel_knowledge_bases"].create_index(
                [("hotel_id", 1), ("updated_at", -1)], background=True
            )

            # Collection 2: voice_call_logs
            self.voice_calling_app_db["voice_call_logs"].create_index(
                [("identifiers.trigger_id", 1)], background=True
            )
            self.voice_calling_app_db["voice_call_logs"].create_index(
                [("identifiers.call_uuid", 1)], background=True
            )
            self.voice_calling_app_db["voice_call_logs"].create_index(
                [("party_details.hotel_id", 1), ("created_at", -1)], background=True
            )
            self.voice_calling_app_db["voice_call_logs"].create_index(
                [("trigger_id", 1)], background=True
            )
        except Exception as e:
            print(f"Warning: Failed to ensure database indexes: {e}")

    def close(self) -> None:
        self.client.close()


mongodb = MongoDB()
