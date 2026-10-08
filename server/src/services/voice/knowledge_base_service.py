import json
import logging
from datetime import datetime, timezone
from typing import Optional, Any
from groq import Groq

from src.config import Config
from src.db.connection import mongodb

logger = logging.getLogger(__name__)

groq_client = Groq(api_key=Config.GROQ_API_KEY)
DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b"


class KnowledgeBaseService:
    def __init__(self):
        self.db = mongodb.voice_calling_app_db
        self.source_db = mongodb.staychat_clone_db

    def list_all_available_hotels(self) -> list[dict]:
        return list(
            self.source_db["hotels"].find({}, {"_id": 0, "hotel_id": 1, "name": 1})
        )

    def get_hotel_name_from_hotel_id(self, hotel_id: Optional[str]) -> str:
        if not hotel_id:
            return "Hotel Reservations"

        hotel_doc = self.source_db["hotels"].find_one({"hotel_id": hotel_id})
        if not hotel_doc:
            return "Hotel Reservations"

        return hotel_doc.get("name") or "Hotel Reservations"

    def build_full_hotel_object(self, hotel_id: str) -> dict:
        """
        Aggregates all 8 StayChat collections for a hotel into a unified knowledge object:
          1. hotels
          2. hotel_details
          3. hotel_policies
          4. hotel_rules
          5. room_types
          6. rate_plans
          7. rate_types
          8. hotel_amenities
        """
        hid = hotel_id

        # 1. Base Hotel Doc
        base_hotel = (
            self.source_db["hotels"].find_one({"hotel_id": hid}, {"_id": 0}) or {}
        )

        # 2. Hotel Details (Property, Contact, Location)
        details = (
            self.source_db["hotel_details"].find_one({"hotel_id": hid}, {"_id": 0})
            or {}
        )
        prop = details.get("property", {})
        contact = details.get("contact", {})
        loc = details.get("location", {})

        # 3. Policies & Rules
        policies_doc = (
            self.source_db["hotel_policies"].find_one({"hotel_id": hid}, {"_id": 0})
            or {}
        )
        prop_rules = policies_doc.get("property_rules", {})
        guest_prof = prop_rules.get("guest_profile", {})
        restrictions = prop_rules.get("restrictions", {})
        meal_prices = prop_rules.get("meal_prices", {})

        # 4. Hotel Rules (Dos and Don'ts)
        rules_doc = (
            self.source_db["hotel_rules"].find_one({"hotel_id": hid}, {"_id": 0}) or {}
        )
        raw_rules = rules_doc.get("rules", [])
        dos = [
            r["rule_text"]
            for r in raw_rules
            if r.get("active") and r.get("type") == "do"
        ]
        donts = [
            r["rule_text"]
            for r in raw_rules
            if r.get("active") and r.get("type") == "dont"
        ]

        # 5. Rate Types map (e.g. RT_EP -> European Plan)
        rate_types_cursor = self.source_db["rate_types"].find({}, {"_id": 0})
        rate_type_map = {
            rt["rate_type_id"]: rt.get("display_name", rt.get("short_name", ""))
            for rt in rate_types_cursor
        }

        # 6. Rate Plans by room_type_id
        rate_plans_cursor = self.source_db["rate_plans"].find(
            {"hotel_id": hid, "is_active": True}, {"_id": 0}
        )
        rate_plans_by_room = {}
        for rp in rate_plans_cursor:
            rid = rp.get("room_type_id")
            if not rid:
                continue
            plan_entry = {
                "plan_code": rp.get("name")
                or rate_type_map.get(rp.get("rate_type_id"), ""),
                "price": rp.get("base_price"),
                "currency": rp.get("currency", "INR"),
            }
            rate_plans_by_room.setdefault(rid, []).append(plan_entry)

        # 7. Room Types linked with Rate Plans
        room_types_cursor = self.source_db["room_types"].find(
            {"hotel_id": hid, "is_active": True}, {"_id": 0}
        )
        rooms = []
        for rm in room_types_cursor:
            rid = rm.get("room_type_id")
            rooms.append(
                {
                    "room_type_id": rid,
                    "name": rm.get("name"),
                    "category": rm.get("room_type"),
                    "max_occupancy": rm.get("max_occupancy", 2),
                    "amenities": rm.get("amenities", []),
                    "plans": rate_plans_by_room.get(rid, []),
                }
            )

        # 8. Amenities (Extract only available items)
        amenities_doc = (
            self.source_db["hotel_amenities"].find_one({"hotel_id": hid}, {"_id": 0})
            or {}
        )
        active_amenities = []
        raw_amenities = amenities_doc.get("amenities", {})
        for cat_name, subcats in raw_amenities.items():
            if isinstance(subcats, dict):
                for sub_name, items in subcats.items():
                    if isinstance(items, dict):
                        for item_key, item_val in items.items():
                            if isinstance(item_val, dict) and item_val.get("available"):
                                active_amenities.append(
                                    item_val.get("name") or item_key
                                )

        return {
            "hotel_id": hid,
            "property_code": base_hotel.get("property_code", ""),
            "basic_info": {
                "name": base_hotel.get("name") or prop.get("property_name") or "Hotel",
                "star_rating": prop.get("star_rating", "3 Star"),
                "check_in_time": policies_doc.get("check_in_time")
                or prop.get("check_in_time", "12:00 PM"),
                "check_out_time": policies_doc.get("check_out_time")
                or prop.get("check_out_time", "11:00 AM"),
                "description": prop.get("property_description", "")[:250],
            },
            "contact": {
                "phone": contact.get("primary_contact_number")
                or contact.get("hotel_mobile_number", ""),
                "email": contact.get("primary_hotel_email", ""),
            },
            "location": {
                "address": loc.get("property_address") or base_hotel.get("address", ""),
                "city": loc.get("city", ""),
                "state": loc.get("state", ""),
            },
            "rooms_and_pricing": rooms,
            "policies": {
                "unmarried_couples_allowed": guest_prof.get(
                    "unmarried_couples_allowed", True
                ),
                "smoking_allowed": restrictions.get("smoking_allowed", False),
                "pets_allowed": prop_rules.get("pet_policy", {}).get(
                    "pets_allowed", False
                ),
                "child_free_till": policies_doc.get("child_age_policy", {}).get(
                    "free_till", 8
                ),
                "meal_prices": meal_prices,
            },
            "amenities_summary": active_amenities[:15],
            "ai_operational_guidelines": {
                "dos": dos[:4],
                "donts": donts[:4],
            },
        }

    def render_concise_brief(self, hotel_obj: dict) -> str:
        """
        Renders the aggregated hotel object into a low-latency, token-efficient
        markdown knowledge brief (<120 words) for Plivo Voice Assistant.
        """
        info = hotel_obj.get("basic_info", {})
        name = info.get("name", "Hotel")
        check_in = info.get("check_in_time", "12:00 PM")
        check_out = info.get("check_out_time", "11:00 AM")
        loc = hotel_obj.get("location", {})
        address = loc.get("address", loc.get("city", "Central"))

        room_lines = []
        for r in hotel_obj.get("rooms_and_pricing", []):
            plans_text = ", ".join(
                [
                    f"{p['plan_code']}: ₹{p['price']}"
                    for p in r.get("plans", [])
                    if p.get("price")
                ]
            )
            if plans_text:
                room_lines.append(f"- {r['name']}: {plans_text}")

        rooms_summary = (
            "\n".join(room_lines)
            if room_lines
            else "- Room bookings available upon inquiry."
        )

        pol = hotel_obj.get("policies", {})
        couples = "Yes" if pol.get("unmarried_couples_allowed") else "No"
        amenities = ", ".join(hotel_obj.get("amenities_summary", [])[:8])

        brief = f"""HOTEL: {name} ({address})
CHECK-IN: {check_in} | CHECK-OUT: {check_out}
COUPLE FRIENDLY: {couples}
ROOMS & RATES:
{rooms_summary}
AMENITIES: {amenities or "Wi-Fi, AC, 24/7 Front Desk"}
POLICY: Valid Govt ID required. Advance confirmation needed.
"""
        return brief.strip()

    def compile_brief_with_ai(self, hotel_obj: dict) -> tuple[str, dict]:
        system_prompt = (
            "You are an expert hospitality knowledge compiler for an AI Phone Voice Agent.\n"
            "Convert the provided Hotel JSON into a complete, high-density Markdown Playbook.\n\n"
            "MANDATORY SECTIONS (Include all facts, 0 hallucination):\n"
            "1. **PROPERTY & CONTACT**:\n"
            "   - Name, Landmark/Address, Official Contact Phone & Email.\n"
            "2. **CHECK-IN & TIMINGS**:\n"
            "   - Check-in, Check-out, Early check-in / late check-out policy if any.\n"
            "3. **ROOMS, OCCUPANCY & EXACT RATES**:\n"
            "   - Put EACH room category on ONE single concise line: '- <Room Name> (Max <X>): EP ₹<price>, CP (Breakfast) ₹<price>, MAP (Dinner+Breakfast) ₹<price>'. Never use nested sub-bullets.\n"
            "4. **POLICIES & RESTRICTIONS**:\n"
            "   - Couple policy (Allowed / Not Allowed), ID requirements, Smoking, Pets, Child policy (free age limit), Extra bed charge, and Meal prices (Breakfast/Lunch/Dinner).\n"
            "5. **KEY AMENITIES**:\n"
            "   - Top 6-8 amenities (Wi-Fi, AC, Parking, Lift, 24x7 desk, Security, etc.).\n"
            "6. **CALL RULES (DOs & DONTs)**:\n"
            "   - Include all DOs and DONTs from the guidelines (escalation triggers, no competitor OTA names, no promises on refunds, special occasion acknowledgment).\n\n"
            "CRITICAL FORMAT RULES FOR PHONE AUDIO:\n"
            "- Keep total output under 220 words.\n"
            "- NEVER use Markdown tables (|---|) or pipes under any circumstances.\n"
            "- Output ONLY clean Markdown text. No conversational greeting, no backtick wrapper (```)."
        )

        user_content = f"Hotel JSON Data:\n{json.dumps(hotel_obj, indent=2)}"

        response = groq_client.chat.completions.create(
            model=DEFAULT_GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            temperature=0.1,
            max_tokens=4096,
        )

        choice = response.choices[0]
        raw_msg = choice.message
        brief = (raw_msg.content or "").strip()

        if (
            not brief
            and hasattr(raw_msg, "reasoning_content")
            and raw_msg.reasoning_content
        ):
            brief = str(raw_msg.reasoning_content).strip()

        usage = {
            "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
            "completion_tokens": (
                response.usage.completion_tokens if response.usage else 0
            ),
            "total_tokens": response.usage.total_tokens if response.usage else 0,
        }
        return brief, usage

    def get_hotel_brief(self, hotel_id: str, hotel_obj: dict) -> tuple[str, dict, Any]:
        """
        Retrieves or compiles the hotel knowledge brief with TTL database caching.
        Checks hotel_knowledge_bases collection:
        - If updated_at is within Config.HOTEL_KB_CACHE_TTL_HOURS, reuse cached brief.
        - If expired or not present, compiles via Groq AI, stores in hotel_knowledge_bases.
        Returns: (knowledge_brief, meta, ObjectId_of_knowledge_base)
        """
        now = datetime.now(timezone.utc)
        ttl_seconds = Config.HOTEL_KB_CACHE_TTL_HOURS * 3600
        kb_collection = self.db["hotel_knowledge_bases"]

        cached_kb = kb_collection.find_one({"hotel_id": hotel_id})
        if cached_kb and "updated_at" in cached_kb:
            last_updated = cached_kb["updated_at"]
            if isinstance(last_updated, datetime):
                if last_updated.tzinfo is None:
                    last_updated = last_updated.replace(tzinfo=timezone.utc)
                age_seconds = (now - last_updated).total_seconds()
                if age_seconds < ttl_seconds and cached_kb.get("knowledge_brief"):
                    logger.info(
                        "⚡ Cache HIT for Hotel %s KB (Age: %.1f hrs / TTL: %s hrs)",
                        hotel_id,
                        age_seconds / 3600.0,
                        Config.HOTEL_KB_CACHE_TTL_HOURS,
                    )
                    meta = cached_kb.get("meta", {})
                    meta["cache_hit"] = True
                    return cached_kb["knowledge_brief"], meta, cached_kb["_id"]

        logger.info(
            "🔄 Cache MISS / EXPIRED for Hotel %s KB. Compiling fresh via AI...",
            hotel_id,
        )

        try:
            brief, usage = self.compile_brief_with_ai(hotel_obj)
            if not brief or len(brief.split()) < 25:
                logger.warning(
                    "Groq AI brief was too short (%s words), using local template",
                    len(brief.split()) if brief else 0,
                )
                brief = self.render_concise_brief(hotel_obj)
                usage = {
                    "fallback": True,
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                    "total_tokens": 0,
                }
        except Exception as e:
            logger.warning(
                "AI brief compilation failed: %s, using verified local template", e
            )
            brief = self.render_concise_brief(hotel_obj)
            usage = {
                "fallback": True,
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "total_tokens": 0,
            }

        hotel_name = hotel_obj.get("basic_info", {}).get("name", "Hotel")
        kb_doc = {
            "hotel_id": hotel_id,
            "hotel_name": hotel_name,
            "knowledge_brief": brief,
            "meta": usage,
            "cache_ttl_hours": Config.HOTEL_KB_CACHE_TTL_HOURS,
            "updated_at": now,
        }
        upsert_res = kb_collection.update_one(
            {"hotel_id": hotel_id},
            {
                "$set": kb_doc,
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
        )

        kb_id = None
        if upsert_res.upserted_id:
            kb_id = upsert_res.upserted_id
        else:
            saved_doc = kb_collection.find_one({"hotel_id": hotel_id}, {"_id": 1})
            if saved_doc:
                kb_id = saved_doc["_id"]

        usage["cache_hit"] = False
        return brief, usage, kb_id
