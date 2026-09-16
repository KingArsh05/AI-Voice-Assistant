import logging
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from ..config import Config

logger = logging.getLogger(__name__)


class Database:
    client: MongoClient = None
    db = None

    @classmethod
    def connect(cls):
        """Initializes thread-safe MongoDB connection pool."""
        if cls.client is None:
            try:
                cls.client = MongoClient(
                    Config.MONGO_URI, maxPoolSize=50, serverSelectionTimeoutMS=5000
                )

                cls.client.admin.command("ping")
                cls.db = cls.client[Config.MONGO_DB_NAME]
                logger.info("✅ MongoDB connected: %s", Config.MONGO_DB_NAME)
                print(f"✅ MongoDB connected: {Config.MONGO_DB_NAME}")

            except ConnectionFailure as e:
                logger.error("❌ Failed to connect to MongoDB: %s", e)
                raise e

    @classmethod
    def close(cls):
        """Closes connection pool on shutdown."""
        if cls.client:
            cls.client.close()
            cls.client = None
            cls.db = None
            logger.info("✅ MongoDB connection closed.")

def get_db():
    """Returns or creates the database connection."""
    if Database.db is None:
        Database.connect()
    return Database.db
