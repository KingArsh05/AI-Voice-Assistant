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

        self.voice_calling_app_db = self.client[Config.MONGODB_DB_NAME]
        self.staychat_clone_db = self.client[Config.MONGODB_SOURCE_DB_NAME]

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

    def close(self) -> None:
        self.client.close()


mongodb = MongoDB()
