"""
MongoDB persistence layer for call logs and campaigns.
All methods gracefully handle a missing/unreachable MongoDB connection.
"""

from __future__ import annotations
from datetime import datetime, timezone
from pymongo import DESCENDING
from pymongo.errors import DuplicateKeyError

from ..database import get_db
from ..models.call_log import make_call_log
from ..models.campaign import make_campaign


# ---------------------------------------------------------------------------
# Call Logs
# ---------------------------------------------------------------------------

def save_call_log(data: dict) -> dict | None:
    """Insert or upsert a call log document by call_uuid or match recent initiated call."""
    try:
        db = get_db()
        col = db["call_logs"]
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        call_uuid = data.get("call_uuid")
        phone_number = data.get("phone_number")
        
        # Strip _id to prevent immutable field errors
        data.pop("_id", None)
        
        # If call_uuid is provided, try to find by call_uuid first
        if call_uuid:
            # Also check if there was an initiated document without call_uuid for this phone number
            existing = col.find_one({"call_uuid": call_uuid})
            if not existing and phone_number:
                # Find most recent initiated call for this phone number in the last 30 minutes
                candidate = col.find_one(
                    {
                        "phone_number": phone_number,
                        "call_status": "initiated",
                        "$or": [{"call_uuid": {"$exists": False}}, {"call_uuid": None}],
                    },
                    sort=[("_id", DESCENDING)],
                )
                if candidate:
                    # Inherit customer_name and campaign_id from the initiated record if not present
                    if not data.get("customer_name") and candidate.get("customer_name"):
                        data["customer_name"] = candidate["customer_name"]
                    if not data.get("campaign_id") and candidate.get("campaign_id"):
                        data["campaign_id"] = candidate["campaign_id"]
                    
                    # Update that exact document with the new call_uuid and completed call details!
                    col.update_one(
                        {"_id": candidate["_id"]},
                        {"$set": data},
                    )
                    return data

            col.update_one(
                {"call_uuid": call_uuid},
                {"$set": data},
                upsert=True,
            )
        else:
            # If call_uuid is empty or None, clean it out to avoid duplicate null index collisions
            data.pop("call_uuid", None)
            col.insert_one(data)
        return data
    except Exception as exc:
        print(f"[MongoService] save_call_log error: {exc}")
        return None


def get_call_logs(limit: int = 50, outcome: str | None = None, search: str | None = None) -> list[dict]:
    """Return call logs sorted newest-first, with optional filters."""
    try:
        db = get_db()
        col = db["call_logs"]
        query: dict = {}
        if outcome:
            query["call_outcome"] = outcome
        if search:
            query["$or"] = [
                {"customer_name": {"$regex": search, "$options": "i"}},
                {"phone_number": {"$regex": search, "$options": "i"}},
            ]
        cursor = col.find(query, {"_id": 0, "raw_event_payload": 0}).sort("timestamp", DESCENDING).limit(limit)
        return list(cursor)
    except Exception as exc:
        print(f"[MongoService] get_call_logs error: {exc}")
        return []


def get_call_by_uuid(call_uuid: str) -> dict | None:
    try:
        db = get_db()
        return db["call_logs"].find_one({"call_uuid": call_uuid}, {"_id": 0})
    except Exception as exc:
        print(f"[MongoService] get_call_by_uuid error: {exc}")
        return None


# ---------------------------------------------------------------------------
# Campaigns
# ---------------------------------------------------------------------------

def save_campaign(campaign_data: dict) -> dict | None:
    try:
        db = get_db()
        col = db["campaigns"]
        campaign_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        cid = campaign_data["id"]
        # Strip _id to avoid Mongo immutable field error when updating existing document
        update_fields = {k: v for k, v in campaign_data.items() if k != "_id"}
        col.update_one(
            {"id": cid},
            {"$set": update_fields, "$setOnInsert": {"created_at": campaign_data.get("created_at", datetime.now(timezone.utc).isoformat())}},
            upsert=True,
        )
        return campaign_data
    except Exception as exc:
        print(f"[MongoService] save_campaign error: {exc}")
        return None


def get_campaigns() -> list[dict]:
    try:
        db = get_db()
        return list(db["campaigns"].find({"is_active": True}, {"_id": 0}))
    except Exception as exc:
        print(f"[MongoService] get_campaigns error: {exc}")
        return []


def get_campaign(campaign_id: str) -> dict | None:
    try:
        db = get_db()
        return db["campaigns"].find_one({"id": campaign_id}, {"_id": 0})
    except Exception as exc:
        print(f"[MongoService] get_campaign error: {exc}")
        return None


# ---------------------------------------------------------------------------
# Seeding
# ---------------------------------------------------------------------------

def seed_default_campaigns(default_campaigns: dict) -> None:
    """Auto-seed default campaigns or update existing booking-follow-up to Hotel Sahu."""
    try:
        db = get_db()
        col = db["campaigns"]
        for cid, data in default_campaigns.items():
            doc = make_campaign(
                id=data["id"],
                name=data["name"],
                hotel_name=data["hotel_name"],
                city=data["city"],
                landmark=data["landmark"],
                property_facts=data.get("property_facts", []),
                rate_info=data.get("rate_info", {}),
                availability=data.get("availability", {}),
                instructions=data.get("instructions", ""),
                extraction_schema=data.get("extraction_schema", {}),
                forwarding_number=data.get("forwarding_number", ""),
            )
            # Upsert so default values like Hotel Sahu are synced if not yet customized
            existing = col.find_one({"id": data["id"]})
            if not existing:
                col.insert_one(doc)
            elif existing.get("hotel_name") in ["The Grand Heritage Resort", "Grand Heritage Resort"]:
                col.update_one({"id": data["id"]}, {"$set": doc})
        print(f"[MongoService] Seeded/Verified {len(default_campaigns)} campaign(s).")
    except Exception as exc:
        print(f"[MongoService] seed_default_campaigns error: {exc}")
