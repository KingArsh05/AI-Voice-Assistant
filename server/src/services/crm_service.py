import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from src.db.connection import get_db
from src.models.crm_lead_model import CreateCRMLeadRequest, UpdateCRMLeadRequest

logger = logging.getLogger(__name__)


class CRMService:
    def __init__(self):
        self.db = get_db()

    def _format_lead(self, doc: dict) -> dict:
        if not doc:
            return {}
        doc = dict(doc)
        if "_id" in doc:
            doc["id"] = str(doc["_id"])
            doc["_id"] = str(doc["_id"])
        for field in ["created_at", "updated_at", "last_called_at"]:
            if field in doc and isinstance(doc[field], datetime):
                doc[field] = doc[field].isoformat()
        return doc

    def list_leads(
        self,
        hotel_id: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        source: Optional[str] = None,
        limit: int = 100,
        skip: int = 0,
    ) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {"is_deleted": {"$ne": True}}

        if hotel_id:
            query["hotel_id"] = hotel_id
        if status:
            query["status"] = status
        if source:
            query["source"] = source
        if search:
            regex_query = {"$regex": search, "$options": "i"}
            query["$or"] = [
                {"guest_name": regex_query},
                {"phone_number": regex_query},
                {"lead_details": regex_query},
            ]
        if date_from or date_to:
            dt_filter = {}
            if date_from:
                try:
                    dt_filter["$gte"] = datetime.fromisoformat(date_from)
                except Exception:
                    pass
            if date_to:
                try:
                    dt_filter["$lte"] = datetime.fromisoformat(date_to)
                except Exception:
                    pass
            if dt_filter:
                query["created_at"] = dt_filter

        cursor = (
            self.db.crm_leads.find(query).sort("created_at", -1).skip(skip).limit(limit)
        )
        return [self._format_lead(doc) for doc in cursor]

    def get_lead(self, lead_id: str) -> Optional[Dict[str, Any]]:
        doc = self.db.crm_leads.find_one({"lead_id": lead_id, "is_deleted": {"$ne": True}})
        return self._format_lead(doc) if doc else None

    def create_lead(self, data: CreateCRMLeadRequest) -> Dict[str, Any]:
        # Normalize phone
        phone = str(data.phone_number).strip().replace(" ", "").replace("-", "")
        if not phone.startswith("+"):
            phone = "+91" + phone.lstrip("0")

        # Optionally resolve hotel name
        hotel_name = None
        if data.hotel_id:
            hotel_doc = self.db.hotels.find_one({"hotel_id": data.hotel_id})
            if hotel_doc:
                hotel_name = hotel_doc.get("name")

        lead_id = f"crm_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)
        doc = {
            "lead_id": lead_id,
            "guest_name": data.guest_name.strip().title(),
            "phone_number": phone,
            "email": data.email,
            "hotel_id": data.hotel_id,
            "hotel_name": hotel_name,
            "lead_details": data.lead_details or "",
            "check_in_date": data.check_in_date,
            "check_out_date": data.check_out_date,
            "num_guests": data.num_guests,
            "room_preference": data.room_preference,
            "budget": data.budget,
            "source": data.source or "manual",
            "status": data.status or "new",
            "tags": data.tags or [],
            "notes": data.notes,
            "last_called_at": None,
            "call_count": 0,
            "created_at": now,
            "updated_at": now,
            "is_deleted": False,
        }
        self.db.crm_leads.insert_one(doc)
        logger.info("Created CRM lead %s for %s", lead_id, data.guest_name)
        return self._format_lead(doc)

    def update_lead(
        self, lead_id: str, data: UpdateCRMLeadRequest
    ) -> Optional[Dict[str, Any]]:
        updates = {k: v for k, v in data.model_dump().items() if v is not None}
        if not updates:
            return self.get_lead(lead_id)
        updates["updated_at"] = datetime.now(timezone.utc)
        self.db.crm_leads.update_one({"lead_id": lead_id}, {"$set": updates})
        return self.get_lead(lead_id)

    def delete_lead(self, lead_id: str) -> bool:
        res = self.db.crm_leads.update_one(
            {"lead_id": lead_id},
            {"$set": {"is_deleted": True, "updated_at": datetime.now(timezone.utc)}},
        )
        return res.matched_count > 0

    def mark_called(self, lead_id: str) -> None:
        now = datetime.now(timezone.utc)
        self.db.crm_leads.update_one(
            {"lead_id": lead_id},
            {"$set": {"last_called_at": now, "updated_at": now}, "$inc": {"call_count": 1}},
        )

    def count_leads(
        self,
        hotel_id: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Dict[str, int]:
        """Returns per-status counts for the filter context (for badges)."""
        match: Dict[str, Any] = {"is_deleted": {"$ne": True}}
        if hotel_id:
            match["hotel_id"] = hotel_id

        pipeline = [{"$match": match}, {"$group": {"_id": "$status", "count": {"$sum": 1}}}]
        result = list(self.db.crm_leads.aggregate(pipeline))
        counts = {r["_id"]: r["count"] for r in result if r.get("_id")}
        counts["total"] = sum(counts.values())
        return counts
