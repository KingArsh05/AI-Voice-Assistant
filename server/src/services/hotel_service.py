import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from src.db.connection import get_db
from src.models.hotel_model import HotelModel, slugify

logger = logging.getLogger(__name__)


class HotelService:
    def __init__(self):
        self.db = get_db()

    def list_hotels(self, active_only: bool = False) -> List[dict]:
        """Returns all configured hotels with summary info for selectors & sidebars."""
        query = {"is_deleted": {"$ne": True}}
        if active_only:
            query["is_active"] = True

        cursor = self.db.hotels.find(query).sort("created_at", -1)
        hotels = []
        for doc in cursor:
            # Map Mongo ID to string
            doc["_id"] = str(doc["_id"])
            hotels.append(doc)
        return hotels

    def get_hotel(self, hotel_id: str) -> Optional[dict]:
        """Fetches full hotel configuration by hotel_id."""
        doc = self.db.hotels.find_one({"hotel_id": hotel_id, "is_deleted": {"$ne": True}})
        if doc:
            doc["_id"] = str(doc["_id"])
        return doc

    def create_hotel(self, data: dict) -> dict:
        """Creates a new hotel configuration with unique hotel_id and slug."""
        hotel_id = str(uuid.uuid4())
        name = data.get("name", "Unnamed Property")
        slug = slugify(name)

        # Check for slug collision and suffix if needed
        existing = self.db.hotels.count_documents({"slug": slug, "is_deleted": {"$ne": True}})
        if existing > 0:
            slug = f"{slug}-{uuid.uuid4().hex[:6]}"

        now = datetime.now(timezone.utc)
        data["hotel_id"] = hotel_id
        data["slug"] = slug
        data["is_active"] = data.get("is_active", True)
        data["is_deleted"] = False
        data["created_at"] = now
        data["updated_at"] = now

        hotel_obj = HotelModel(**data)
        doc = hotel_obj.to_mongo()
        doc["is_deleted"] = False

        self.db.hotels.insert_one(doc)
        doc["_id"] = str(doc["_id"])
        logger.info("Created hotel %s (%s)", name, hotel_id)
        return doc

    def update_hotel(self, hotel_id: str, data: dict) -> Optional[dict]:
        """Updates an existing hotel configuration."""
        existing = self.db.hotels.find_one({"hotel_id": hotel_id, "is_deleted": {"$ne": True}})
        if not existing:
            return None

        data["updated_at"] = datetime.now(timezone.utc)
        # Preserve original creation timestamp and immutable keys
        data["hotel_id"] = hotel_id
        if existing.get("created_at"):
            data["created_at"] = existing["created_at"]
        data.pop("_id", None)
        if "slug" not in data or not data["slug"]:
            data["slug"] = existing.get("slug") or slugify(data.get("name", "hotel"))

        # Re-validate using Pydantic model
        hotel_obj = HotelModel(**data)
        update_doc = hotel_obj.to_mongo()
        update_doc.pop("_id", None)
        update_doc["is_deleted"] = False

        self.db.hotels.update_one({"hotel_id": hotel_id}, {"$set": update_doc})
        updated = self.get_hotel(hotel_id)
        logger.info("Updated hotel %s (%s)", updated.get("name"), hotel_id)
        return updated

    def delete_hotel(self, hotel_id: str) -> bool:
        """Soft deletes hotel to preserve historical call records integrity."""
        result = self.db.hotels.update_one(
            {"hotel_id": hotel_id},
            {"$set": {"is_deleted": True, "is_active": False, "deleted_at": datetime.now(timezone.utc)}}
        )
        return result.modified_count > 0

    def get_compiled_context(self, hotel_id: str) -> Optional[str]:
        """Returns the compiled AI prompt context for a specific hotel."""
        doc = self.get_hotel(hotel_id)
        if not doc:
            return None
        # Remove Mongo _id before instantiating Pydantic model
        doc_clean = {k: v for k, v in doc.items() if k not in ("_id", "is_deleted", "deleted_at")}
        hotel_obj = HotelModel(**doc_clean)
        return hotel_obj.compile_ai_context()
