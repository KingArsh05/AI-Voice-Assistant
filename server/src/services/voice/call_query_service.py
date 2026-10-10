import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from src.db.connection import mongodb
from bson.json_util import dumps

logger = logging.getLogger(__name__)


class CallQueryService:
    def __init__(self):
        self.db = mongodb.voice_calling_app_db
        self.crm_db = mongodb.crm_db

    def get_calls(
        self,
        limit: int = 50,
        skip: int = 0,
        status: Optional[str] = None,
        hotel_id: Optional[str] = None,
    ) -> dict:
        """
        Retrieves paginated call records sorted by newest first.
        Converts MongoDB ObjectId and datetime to JSON-serializable types.
        """
        query: Dict[str, Any] = {}
        if status:
            query["$or"] = [
                {"call_status": status},
                {"status": status},
                {"disposition": status},
            ]
        if hotel_id:
            query["$or"] = [
                {"party_details.hotel_id": hotel_id},
                {"hotel_id": hotel_id},
            ]

        total_count = self.db["voice_call_logs"].count_documents(query)
        cursor = (
            self.db["voice_call_logs"]
            .find(query)
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )
        calls = []
        for doc in cursor:
            doc["_id"] = str(doc["_id"])
            if doc.get("knowledge_base_id"):
                doc["knowledge_base_id"] = str(doc["knowledge_base_id"])
            if isinstance(doc.get("created_at"), datetime):
                dt = doc["created_at"]
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                doc["created_at"] = dt.isoformat()
            if isinstance(doc.get("updated_at"), datetime):
                dt = doc["updated_at"]
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                doc["updated_at"] = dt.isoformat()
            calls.append(doc)

        return {
            "total": total_count,
            "limit": limit,
            "skip": skip,
            "calls": calls,
        }

    def get_call_by_id(self, call_identifier: str) -> Optional[dict]:
        """
        Finds a call record by MongoDB _id, trigger_id, call_uuid, or conversation_id.
        """
        from bson import ObjectId

        query_conditions: list = [
            {"identifiers.trigger_id": call_identifier},
            {"identifiers.call_uuid": call_identifier},
            {"identifiers.conversation_id": call_identifier},
            {"trigger_id": call_identifier},
            {"call_uuid": call_identifier},
        ]
        if ObjectId.is_valid(call_identifier):
            query_conditions.append({"_id": ObjectId(call_identifier)})

        call = self.db["voice_call_logs"].find_one({"$or": query_conditions})
        if not call:
            return None

        call["_id"] = str(call["_id"])
        if call.get("knowledge_base_id"):
            call["knowledge_base_id"] = str(call["knowledge_base_id"])
        if isinstance(call.get("created_at"), datetime):
            dt = call["created_at"]
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            call["created_at"] = dt.isoformat()
        if isinstance(call.get("updated_at"), datetime):
            dt = call["updated_at"]
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            call["updated_at"] = dt.isoformat()

        return call

    def get_crm_data(
        self,
        limit: int = 50,
        skip: int = 0,
        primary_intent: Optional[str] = None,
        hotel_id: Optional[str] = None,
    ) -> dict:
        """
        Retrieves paginated CRM records sorted by newest first.
        Only filters by fields that were actually provided.
        """
        query: Dict[str, Any] = {}
        if hotel_id:
            query["hotelID"] = hotel_id
        if primary_intent:
            query["primary_intent"] = primary_intent

        projection = {
            "_id": 1,  # default is 1, set 0 if you don't want it
            "hotelID": 1,
            "phone_number": 1,
            "primary_intent": 1,
            "summary": 1,
            "last_updated": 1,
        }

        total_count = self.crm_db["chat_summary"].count_documents(query)
        cursor = (
            self.crm_db["chat_summary"].find(query, projection).skip(skip).limit(limit)
        )

        crm_data = []
        for doc in cursor:
            doc["_id"] = str(doc["_id"])
            doc["hotel_id"] = doc.pop("hotelID", None)
            doc.setdefault("guest_name", "Guest")

            for key, val in doc.items():
                if isinstance(val, datetime):
                    doc[key] = val.isoformat()
            crm_data.append(doc)

        return {
            "total": total_count,
            "limit": limit,
            "skip": skip,
            "crm_data": crm_data,
        }
