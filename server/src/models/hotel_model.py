import re
from datetime import datetime, timezone
from typing import List, Optional, Union
from pydantic import BaseModel, Field, field_validator


def slugify(text: str) -> str:
    """Helper to create URL/lookup friendly slugs."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    return re.sub(r"[\s_-]+", "-", text).strip("-")


class RoomType(BaseModel):
    name: str = Field(..., description="e.g. Deluxe Ocean View Suite")
    description: Optional[str] = Field(default="", description="Key room features, bed type, view")
    max_occupancy: int = Field(default=2, ge=1)
    price_per_night_inr: float = Field(..., ge=0)
    amenities: List[str] = Field(default_factory=list, description="e.g. ['King Bed', 'Balcony', 'Jacuzzi']")
    total_units: Optional[int] = Field(default=None, ge=0)


class DiningOutlet(BaseModel):
    name: str = Field(..., description="e.g. Spice Route Restaurant")
    cuisine: Optional[str] = Field(default="", description="e.g. Pan-Asian & Indian Fine Dining")
    hours: Optional[str] = Field(default="", description="e.g. 7:00 AM - 11:00 PM")
    description: Optional[str] = Field(default="")


class HotelAmenities(BaseModel):
    dining: List[DiningOutlet] = Field(default_factory=list)
    has_bar: bool = False
    bar_details: Optional[str] = None
    has_room_service: bool = True
    room_service_hours: Optional[str] = "24/7"
    has_spa: bool = False
    spa_details: Optional[str] = None
    has_gym: bool = False
    gym_hours: Optional[str] = None
    has_pool: bool = False
    pool_type: Optional[str] = None
    has_wifi: bool = True
    wifi_policy: Optional[str] = "Complimentary high-speed WiFi throughout property"
    parking: Optional[str] = "Complimentary valet parking for in-house guests"
    airport_shuttle: Optional[str] = "Available on request (chargeable)"


class HotelPolicies(BaseModel):
    check_in_time: str = Field(default="14:00")
    check_out_time: str = Field(default="12:00")
    early_checkin_policy: Optional[str] = "Subject to availability upon request"
    late_checkout_policy: Optional[str] = "Complimentary until 2 PM subject to availability; half day charge up to 6 PM"
    cancellation_policy: Optional[str] = "Free cancellation up to 48 hours prior to arrival"
    pet_policy: Optional[str] = "Pets not permitted (service animals welcome)"
    child_policy: Optional[str] = "Children under 6 stay free sharing existing bedding"
    smoking_policy: Optional[str] = "100% smoke-free property. Designated outdoor smoking area provided."
    payment_methods: List[str] = Field(
        default_factory=lambda: ["Credit Cards (Visa/Mastercard/Amex)", "UPI", "Net Banking", "Cash"]
    )


class Upsell(BaseModel):
    name: str = Field(..., description="e.g. Sunset Candlelight Dinner on Beach")
    description: Optional[str] = Field(default="")
    price_inr: float = Field(..., ge=0)
    applicable_rooms: List[str] = Field(default_factory=list)


class NearbyAttraction(BaseModel):
    name: str = Field(..., description="e.g. Gateway of India")
    distance_km: Optional[float] = None
    description: Optional[str] = None


class HotelContact(BaseModel):
    address: str = Field(..., description="Full physical property address")
    city: str = Field(..., description="e.g. Mumbai")
    state: Optional[str] = None
    country: str = Field(default="India")
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    google_maps_url: Optional[str] = None


class HotelModel(BaseModel):
    """
    Comprehensive Hotel Knowledge Base Model.
    Designed to hold complete operational, pricing, and guest-experience data.
    """
    hotel_id: Optional[str] = None
    slug: Optional[str] = None
    is_active: bool = True

    # Identity
    name: str = Field(..., min_length=2, max_length=150)
    tagline: Optional[str] = None
    star_rating: int = Field(default=4, ge=1, le=5)
    property_type: str = Field(default="hotel", description="hotel, resort, boutique, homestay, luxury")

    # Location & Contact
    contact: HotelContact

    # Accommodations
    room_types: List[RoomType] = Field(default_factory=list)

    # Facilities & Dining
    amenities: HotelAmenities = Field(default_factory=HotelAmenities)

    # Rules & Policies
    policies: HotelPolicies = Field(default_factory=HotelPolicies)

    # Commercial Upsells
    upsells: List[Upsell] = Field(default_factory=list)

    # Local Knowledge
    nearby_attractions: List[NearbyAttraction] = Field(default_factory=list)

    # Dynamic Operational Knowledge (Daily / Operator modified)
    inventory_notes: Optional[str] = Field(
        default="",
        description="Free text updated by hotel operations daily e.g., 'Fully booked this weekend. 2 suites left for Friday.'"
    )
    ai_instructions: Optional[str] = Field(
        default="",
        description="Specific voice AI behavioral instructions for this hotel e.g., 'Always promote the signature rooftop lounge.'"
    )

    created_at: Optional[Union[datetime, str]] = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[Union[datetime, str]] = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("created_at", "updated_at", mode="before")
    @classmethod
    def parse_datetime(cls, v):
        if isinstance(v, str):
            try:
                # Try standard ISO parsing
                return datetime.fromisoformat(v.replace("Z", "+00:00"))
            except Exception:
                try:
                    from email.utils import parsedate_to_datetime
                    return parsedate_to_datetime(v)
                except Exception:
                    return datetime.now(timezone.utc)
        return v or datetime.now(timezone.utc)

    def to_mongo(self) -> dict:
        return self.model_dump()

    def compile_ai_context(self) -> str:
        """
        Compiles the full hotel document (queried from ai_voice_assistant.hotels by hotel_id)
        into a structured natural-language block. This is the `hotel_knowledge_brief` key
        injected into the Plivo CX AI agent's system context.

        Sections (in order):
          1. Identity & Address
          2. Timings & Policies  (check-in/out, cancellation, payments)
          3. Accommodations & Room Rates
          4. Dining & Restaurants
          5. Facilities & Services
          6. Nearby Attractions & Landmarks
          7. Upsell Experiences  (suggest proactively)
          8. Live Inventory Notice  (operator-updated daily)
          9. Hotel-Specific Agent Directives  (operator AI overrides)
        """
        stars = "★" * self.star_rating
        lines = [
            f"=== [hotel_knowledge_brief] {self.name.upper()} ({stars}) ===",
            f"Property  : {self.name}",
            f"Type      : {self.property_type.title()} | {self.star_rating}-Star",
        ]
        if self.tagline:
            lines.append(f"Tagline   : \"{self.tagline}\"")

        # ── Hotel-Specific AI Directives (Priority 1: Placed on top so instructions are never missed)
        if self.ai_instructions and self.ai_instructions.strip():
            lines.append("\n[CRITICAL OPERATIONAL & LANGUAGE DIRECTIVES — FOLLOW EXACTLY]")
            lines.append(self.ai_instructions.strip())

        # ── Address & Contact ─────────────────────────────────────────────────────
        addr_parts = [self.contact.address, self.contact.city]
        if self.contact.state:
            addr_parts.append(self.contact.state)
        if self.contact.country:
            addr_parts.append(self.contact.country)
        lines.append(f"Address   : {', '.join(addr_parts)}")
        if self.contact.phone:
            lines.append(f"Phone     : {self.contact.phone}")
        if self.contact.email:
            lines.append(f"Email     : {self.contact.email}")
        if self.contact.website:
            lines.append(f"Website   : {self.contact.website}")

        # ── Timings & Policies ────────────────────────────────────────────────────
        lines.append("\n[TIMINGS & POLICIES]")
        lines.append(
            f"- Check-in          : {self.policies.check_in_time} | "
            f"Check-out: {self.policies.check_out_time}"
        )
        if self.policies.early_checkin_policy:
            lines.append(f"- Early Check-in    : {self.policies.early_checkin_policy}")
        if self.policies.late_checkout_policy:
            lines.append(f"- Late Check-out    : {self.policies.late_checkout_policy}")
        if self.policies.cancellation_policy:
            lines.append(f"- Cancellation      : {self.policies.cancellation_policy}")
        if self.policies.pet_policy:
            lines.append(f"- Pet Policy        : {self.policies.pet_policy}")
        if self.policies.child_policy:
            lines.append(f"- Child Policy      : {self.policies.child_policy}")
        if self.policies.smoking_policy:
            lines.append(f"- Smoking           : {self.policies.smoking_policy}")
        if self.policies.payment_methods:
            lines.append(f"- Payment Accepted  : {', '.join(self.policies.payment_methods)}")

        # ── Accommodations & Room Rates ───────────────────────────────────────────
        if self.room_types:
            lines.append("\n[ACCOMMODATIONS & ROOM RATES]")
            for room in self.room_types:
                amenities_str = (
                    f" (Includes: {', '.join(room.amenities)})" if room.amenities else ""
                )
                desc_str = f" — {room.description}" if room.description else ""
                capacity_str = f"Max {room.max_occupancy} guests"
                units_str = (
                    f", {room.total_units} units available" if room.total_units else ""
                )
                lines.append(
                    f"• {room.name}: ₹{room.price_per_night_inr:,.0f}/night + taxes"
                    f" ({capacity_str}{units_str}){desc_str}{amenities_str}"
                )

        # ── Dining & Food ─────────────────────────────────────────────────────────
        if self.amenities.dining:
            lines.append("\n[DINING & RESTAURANTS]")
            for d in self.amenities.dining:
                cuisine_info = f" ({d.cuisine})" if d.cuisine else ""
                hours_info = f" [Hours: {d.hours}]" if d.hours else ""
                desc_info = f" — {d.description}" if d.description else ""
                lines.append(f"• {d.name}{cuisine_info}{hours_info}{desc_info}")
        if self.amenities.has_bar and self.amenities.bar_details:
            lines.append(f"• Bar / Lounge: {self.amenities.bar_details}")
        if self.amenities.has_room_service:
            lines.append(
                f"• In-Room Dining: Available "
                f"({self.amenities.room_service_hours or '24/7'})"
            )

        # ── Facilities & Services ─────────────────────────────────────────────────
        lines.append("\n[FACILITIES & SERVICES]")
        if self.amenities.has_spa and self.amenities.spa_details:
            lines.append(f"• Spa & Wellness  : {self.amenities.spa_details}")
        elif self.amenities.has_spa:
            lines.append("• Spa & Wellness  : Available")
        if self.amenities.has_gym:
            lines.append(
                f"• Fitness Center  : Open ({self.amenities.gym_hours or 'Daily'})"
            )
        if self.amenities.has_pool:
            lines.append(
                f"• Swimming Pool   : {self.amenities.pool_type or 'Available for guests'}"
            )
        if self.amenities.has_wifi:
            lines.append(f"• Internet / WiFi : {self.amenities.wifi_policy}")
        if self.amenities.parking:
            lines.append(f"• Parking         : {self.amenities.parking}")
        if self.amenities.airport_shuttle:
            lines.append(f"• Airport Transfer: {self.amenities.airport_shuttle}")

        # ── Nearby Attractions ────────────────────────────────────────────────────
        if self.nearby_attractions:
            lines.append("\n[NEARBY ATTRACTIONS & LANDMARKS]")
            for a in self.nearby_attractions:
                dist = (
                    f" ({a.distance_km:.1f} km away)" if a.distance_km is not None else ""
                )
                desc = f" — {a.description}" if a.description else ""
                lines.append(f"• {a.name}{dist}{desc}")

        # ── Upsell Experiences ────────────────────────────────────────────────────
        if self.upsells:
            lines.append("\n[UPSELL EXPERIENCES & SPECIAL OFFERS — SUGGEST THESE PROACTIVELY]")
            for u in self.upsells:
                desc = f" — {u.description}" if u.description else ""
                room_scope = (
                    f" (Available for: {', '.join(u.applicable_rooms)})"
                    if u.applicable_rooms else ""
                )
                lines.append(f"• {u.name}: ₹{u.price_inr:,.0f}{desc}{room_scope}")

        # ── Live Inventory Notice (operator-updated daily) ────────────────────────
        if self.inventory_notes and self.inventory_notes.strip():
            lines.append("\n[LIVE INVENTORY & OPERATIONAL NOTICE — CHECK BEFORE QUOTING]")
            lines.append(self.inventory_notes.strip())

        lines.append("=== [end hotel_knowledge_brief] ===")
        return "\n".join(lines)



class HotelListItem(BaseModel):
    hotel_id: str
    name: str
    slug: str
    city: str
    star_rating: int
    property_type: str
    is_active: bool
    room_count: int
    updated_at: datetime
