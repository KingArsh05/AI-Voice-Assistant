import plivo
import requests
from ..config import Config

CAMPAIGNS = {
    "booking-follow-up": {
        "id": "booking-follow-up",
        "name": "Booking Abandonment Follow-Up",
        "hotel_name": "Hotel Sahu",
        "city": "Varanasi",
        "landmark": "Sahu Market, D36/265, Dashashwamedh Ghat Rd, Godowlia, Varanasi, Uttar Pradesh 221001",
        "property_facts": [
            "Heritage hospitality right near the sacred Dashashwamedh Ghat",
            "Walking distance to Kashi Vishwanath Temple and the Ganga Aarti",
            "Comfortable air-conditioned rooms, complimentary high-speed Wi-Fi",
            "24-hour front desk, room service, travel desk for boat rides & city tours",
            "In-house dining serving authentic pure-vegetarian delicacies",
            "Check-in: 12:00 PM | Check-out: 11:00 AM",
        ],
        "rate_info": {
            "Deluxe King Room": "INR 2,800/night + taxes (includes breakfast)",
            "Super Deluxe Room": "INR 3,800/night + taxes (includes breakfast & Wi-Fi)",
            "Family Suite": "INR 5,500/night + taxes (accommodates up to 4 guests)",
            "Extra adult": "INR 800/night | Child under 6: complimentary",
            "Taxes": "12% GST applicable on room rates below ₹7,500",
            "Cancellation": "Free cancellation up to 24 hours before check-in",
        },
        "availability": {
            "status": "Available for upcoming dates",
            "available_rooms": ["Deluxe King Room", "Super Deluxe Room", "Family Suite"],
            "sold_out": [],
            "notes": "Deluxe King has limited availability for upcoming weekend",
        },
        "instructions": (
            "Goal: Warmly follow up with guests who started a reservation on our website "
            "but didn't complete it. Understand their hesitation, answer property and location questions "
            "about Hotel Sahu in Varanasi, and offer to hold their preferred room for 24 hours at the current rate."
        ),
        "forwarding_number": "+9198544953527",
        "extraction_schema": {
            "call_outcome": "Enum: interested_held_room, interested_will_book_online, not_interested, price_too_high, dates_changed, competitor_chosen, voicemail, wrong_number, callback_requested",
            "blocker": "Enum: price, dates, location, amenities, competitor, need_approval, none",
            "travel_dates": "Extracted dates, e.g., '18 Feb - 21 Feb'",
            "nights": "Integer",
            "guests": "Integer",
            "budget_stated": "String or null",
            "callback_datetime": "ISO 8601 string or null",
            "competitor_named": "String or null",
            "verbatim_reason": "Direct quote from guest on why they did not complete booking",
            "human_followup_needed": "Boolean",
            "summary": "1-2 sentence executive summary of the call",
        },
    }
}


def prepare_campaign_for_call(campaign_id: str) -> dict:
    from . import mongo_service

    # Prioritize dynamic campaign from MongoDB, fallback to CAMPAIGNS default
    campaign = mongo_service.get_campaign(campaign_id) or CAMPAIGNS.get(campaign_id)
    if not campaign:
        raise ValueError(f"Unknown campaign: {campaign_id}")

    # Build property facts string
    facts = campaign.get("property_facts", [])
    if isinstance(facts, list):
        facts_str = "\n".join(f"- {f}" for f in facts)
    else:
        facts_str = str(facts)

    # Build rates string
    rates = campaign.get("rate_info", {})
    if isinstance(rates, dict):
        rates_str = "\n".join(f"- {k}: {v}" for k, v in rates.items())
    else:
        rates_str = str(rates)

    # Build availability string
    avail = campaign.get("availability", {})
    if isinstance(avail, dict):
        avail_str = (
            f"Status: {avail.get('status', 'Available')}. "
            f"Available: {', '.join(avail.get('available_rooms', []))}. "
            f"Sold out: {', '.join(avail.get('sold_out', []))}. "
            f"Note: {avail.get('notes', '')}"
        )
    else:
        avail_str = str(avail)

    instructions = campaign.get("instructions", "")
    forwarding_number = campaign.get("forwarding_number", "")

    # Inject call escalation/forwarding directive into instructions
    if forwarding_number:
        escalation_rule = (
            f"\n\nCRITICAL ESCALATION RULE: If the guest is upset, angry, frustrated, demands to speak "
            f"with a human manager, or asks to talk to hotel staff directly, politely apologize and state: "
            f"'Allow me to connect you immediately to our hotel staff at Hotel Sahu.' "
            f"Transfer the call immediately to {forwarding_number}."
        )
        instructions += escalation_rule

    return {
        "id": campaign["id"],
        "name": campaign.get("name", "Campaign"),
        "hotel_name": campaign.get("hotel_name", "Hotel Sahu"),
        "city": campaign.get("city", "Varanasi"),
        "landmark": campaign.get("landmark", "Near Dashashwamedh Ghat"),
        "property_facts": facts_str,
        "rate_info": rates_str,
        "availability": avail_str,
        "instructions": instructions,
        "forwarding_number": forwarding_number,
        "extraction_schema": campaign.get("extraction_schema", {}),
    }


class PlivoAgentService:
    def __init__(self):
        self.client = plivo.RestClient(Config.PLIVO_AUTH_ID, Config.PLIVO_AUTH_TOKEN)

    def make_call(self, to_number: str, campaign_id: str, customer_name: str = ""):
        campaign = prepare_campaign_for_call(campaign_id)

        payload = {
            "to_number": to_number,
            "campaign_id": campaign["id"],
            "campaign_name": campaign["name"],
            "hotel_name": campaign["hotel_name"],
            "city": campaign["city"],
            "landmark": campaign["landmark"],
            "property_facts": campaign["property_facts"],
            "rate_info": campaign["rate_info"],
            "availability": campaign["availability"],
            "campaign_instructions": campaign["instructions"],
        }
        if campaign.get("forwarding_number"):
            payload["forwarding_number"] = campaign["forwarding_number"]
            payload["call_transfer_number"] = campaign["forwarding_number"]

        if customer_name:
            payload["customer_name"] = customer_name

        response = requests.post(
            Config.PLIVO_AGENT_FLOW_URL,
            auth=(
                Config.PLIVO_AUTH_ID,
                Config.PLIVO_AUTH_TOKEN,
            ),
            json=payload,
            timeout=10,
        )

        response.raise_for_status()
        return response.json()

    def get_calls(self, limit: int = 20) -> list:
        # Plivo SDK enforces 0 < limit <= 20
        safe_limit = max(1, min(int(limit), 20))
        try:
            records = self.client.calls.list(limit=safe_limit, offset=0)
            calls_data = []
            call_items = getattr(records, "objects", records)
            if isinstance(call_items, dict) and "objects" in call_items:
                call_items = call_items["objects"]

            for c in call_items:
                if isinstance(c, dict):
                    calls_data.append({
                        "call_uuid": c.get("call_uuid"),
                        "direction": c.get("call_direction") or c.get("direction"),
                        "from_number": c.get("from_number"),
                        "to_number": c.get("to_number"),
                        "duration": str(c.get("call_duration") or c.get("duration", "0")),
                        "call_status": c.get("call_state") or c.get("call_status"),
                        "timestamp": c.get("initiation_time") or c.get("created"),
                    })
                else:
                    calls_data.append({
                        "call_uuid": getattr(c, "call_uuid", None),
                        "direction": getattr(c, "call_direction", None) or getattr(c, "direction", None),
                        "from_number": getattr(c, "from_number", None),
                        "to_number": getattr(c, "to_number", None),
                        "duration": str(getattr(c, "call_duration", None) or getattr(c, "duration", "0")),
                        "call_status": getattr(c, "call_state", None) or getattr(c, "call_status", None),
                        "timestamp": getattr(c, "initiation_time", None) or getattr(c, "created", None),
                    })
            return calls_data
        except Exception as e:
            print(f"Error fetching Plivo CDR calls: {e}")
            return []

    def get_recordings_map(self, limit: int = 20) -> dict:
        """Returns {call_uuid: recording_url} for the most recent calls."""
        try:
            resp = requests.get(
                f"https://api.plivo.com/v1/Account/{Config.PLIVO_AUTH_ID}/Recording/",
                auth=(Config.PLIVO_AUTH_ID, Config.PLIVO_AUTH_TOKEN),
                params={"limit": limit},
                timeout=8,
            )
            resp.raise_for_status()
            objects = resp.json().get("objects", [])
            result: dict = {}
            for obj in objects:
                uuid = obj.get("call_uuid")
                url = obj.get("recording_url")
                fmt = obj.get("recording_format", "mp3")
                if uuid and url and fmt == "mp3":
                    result[uuid] = url
            return result
        except Exception as e:
            print(f"Error fetching Plivo recordings: {e}")
            return {}

    def get_campaigns(self) -> dict:
        return CAMPAIGNS
