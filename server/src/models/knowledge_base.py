from typing import List
from pydantic import BaseModel, Field


# ==============================================================================
# Hotel Information & Details Models
# ==============================================================================


class HotelProperty(BaseModel):
    property_type: str | None = None
    hotel_chain: str | None = None
    star_rating: str | None = None
    primary_currency: str | None = None
    property_description: str | None = None
    total_rooms: int | None = None
    total_floors: int | None = None
    accepting_bookings_since: str | None = None
    year_of_construction: int | None = None


class HotelContact(BaseModel):
    primary_contact_name: str | None = None
    primary_contact_number: str | None = None
    alt_contact_name: str | None = None
    alt_contact_number: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_number: str | None = None
    primary_hotel_email: str | None = None
    additional_email_addresses: str | None = None
    official_websites: str | None = None


class HotelLocation(BaseModel):
    property_address: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None
    pincode: str | None = None


class HotelTimings(BaseModel):
    check_in: str | None = None
    check_out: str | None = None
    timezone: str | None = None


class HotelDetails(BaseModel):
    property: HotelProperty | None = None
    contact: HotelContact | None = None
    location: HotelLocation | None = None
    timings: HotelTimings | None = None


# ==============================================================================
# Room Type & Inventory Details Models (Scalable & Sub-structured)
# ==============================================================================


class RoomDimension(BaseModel):
    """Room size measurements."""

    size: float | None = None
    unit: str | None = None


class RoomOccupancy(BaseModel):
    """Guest capacity specifications for adults and children."""

    base_adult: int | None = None
    base_child: int | None = None
    max_adult: int | None = None
    max_child: int | None = None
    max_occupancy: int | None = None


class BedItem(BaseModel):
    """Individual bed specification within a room configuration."""

    type: str | None = None
    count: int | None = None


class BeddingArrangement(BaseModel):
    """Bed configurations and extra bed capabilities."""

    bed_config: List[BedItem] = Field(default_factory=list)
    accommodates_extra_bed: bool | None = None
    max_extra_beds: int | None = None
    alternative_arrangement: bool | None = None
    extra_bed_price: float | None = None


class BathroomDetails(BaseModel):
    """Bathroom specifications and amenities."""

    count: int | None = None
    bathroom_type: str | None = None


class RateTypeInfo(BaseModel):
    """Metadata regarding a rate type plan (e.g. EP, CP, MAP)."""

    rate_type_id: str | None = None
    short_name: str | None = None
    display_name: str | None = None


class RatePlanDetail(BaseModel):
    """Specific rate plan option available for a room category."""

    rate_plan_id: str | None = None
    name: str | None = None
    rate_type: RateTypeInfo | None = None
    pricing_model: str | None = "linear"
    base_price: float | None = None
    currency: str = "INR"
    negotiation_threshold_factor: float = 0.9
    min_negotiable_price: float | None = None
    min_nights: int | None = 1
    max_nights: int | None = 30
    is_active: bool = True


class RoomPricing(BaseModel):
    """Aggregated room pricing summary and automated negotiation floor."""

    base_price: float | None = None
    currency: str = "INR"
    negotiation_threshold_factor: float = 0.9
    min_negotiable_price: float | None = None


class RoomTypeDetail(BaseModel):
    """Comprehensive details for a specific room category including all rate plans."""

    room_type_id: str | None = None
    name: str | None = None
    description: str | None = None
    room_type: str | None = None
    view: str | None = None
    total_rooms: int | None = None
    pricing: RoomPricing | None = None
    rate_plans: List[RatePlanDetail] = Field(default_factory=list)
    dimension: RoomDimension | None = None
    occupancy: RoomOccupancy | None = None
    bedding: BeddingArrangement | None = None
    bathroom: BathroomDetails | None = None
    amenities: List[str] = Field(default_factory=list)
    is_active: bool = True




# ==============================================================================
# Hotel Policies & Property Rules Models (Scalable & Sub-structured)
# ==============================================================================


class GuestProfilePolicy(BaseModel):
    """Guest profile criteria & couple friendliness."""

    unmarried_couples_allowed: bool | None = None
    couple_friendly_tag: bool | None = None
    below18_allowed: bool | None = None
    male_groups_allowed: bool | None = None


class PropertyRestrictions(BaseModel):
    """General on-premise restrictions."""

    smoking_allowed: bool | None = None
    parties_events_allowed: bool | None = None
    wheelchair_accessible: bool | None = None
    outside_visitors_allowed: bool | None = None


class PetPolicy(BaseModel):
    """Pet guidelines, charges, and restrictions."""

    pets_allowed: bool | None = None
    pets_on_property: bool | None = None
    pet_types: List[str] = Field(default_factory=list)
    extra_charges: bool | None = None
    restricted_areas: List[str] = Field(default_factory=list)
    leash_required: bool | None = None
    max_pets: str | None = None


class InfantPolicy(BaseModel):
    """Infant amenities and stay policy."""

    infant_free: bool | None = None
    complimentary_food: bool | None = None
    food_items: List[str] = Field(default_factory=list)
    extra_bed: bool | None = None
    extra_bed_charge: float | None = None


class ExtraBedPolicy(BaseModel):
    """General property extra bed regulations."""

    extra_bed_included_in_rate: bool | None = None
    adult_bed: str | None = None
    bed_types: List[str] = Field(default_factory=list)
    mattress_charge: float | None = None
    kids_bed: str | None = None


class MealPrices(BaseModel):
    """Hotel on-site meal pricing."""

    breakfast: float | None = None
    lunch: float | None = None
    dinner: float | None = None


class ChildAgePolicy(BaseModel):
    """Child age brackets and charges."""

    children_allowed: bool | None = None
    free_till: int | None = None
    paid_till: int | None = None


class PolicyNotice(BaseModel):
    """Ad-hoc announcements or temporary maintenance notices."""

    id: str | None = None
    title: str | None = None
    content: str | None = None
    type: str | None = None


class HotelPolicies(BaseModel):
    """Comprehensive hotel operational and property policies."""

    check_in_time: str | None = None
    check_out_time: str | None = None
    early_check_in_available: bool | None = None
    late_check_out_available: bool | None = None
    front_desk_24_hr: bool | None = None
    express_check_out: bool | None = None

    # Sub-policies
    cancellation_policy: str | None = None
    guest_profile: GuestProfilePolicy | None = None
    restrictions: PropertyRestrictions | None = None
    accepted_ids: List[str] = Field(default_factory=list)
    same_city_id_allowed: bool | None = None
    pet_policy: PetPolicy | None = None
    infant_policy: InfantPolicy | None = None
    extra_bed_policy: ExtraBedPolicy | None = None
    meal_prices: MealPrices | None = None
    child_age_policy: ChildAgePolicy | None = None
    name_change_allowed: bool | None = None
    custom_policy_text: str | None = None
    notices: List[PolicyNotice] = Field(default_factory=list)


# ==============================================================================
# Behavioral AI Rules Models (hotel_rules)
# ==============================================================================


class BehavioralRule(BaseModel):
    """Granular operational or conversational rule for AI agents."""

    rule_id: str
    type: str  # e.g., 'do' or 'dont'
    category: str  # e.g., 'competitor', 'pricing', 'escalation', 'legal', 'upsell'
    rule_text: str
    priority: int = 1
    applies_to_stages: List[str] = Field(default_factory=lambda: ["all"])
    active: bool = True


class HotelRules(BaseModel):
    """Categorized rules governing AI behavior during interactions."""

    rules: List[BehavioralRule] = Field(default_factory=list)
    do_rules: List[str] = Field(default_factory=list)
    dont_rules: List[str] = Field(default_factory=list)


# ==============================================================================
# Root Hotel Knowledge Base Model
# ==============================================================================


# Keywords marking room-description sentences worth speaking about on a call
ROOM_NOTE_KEYWORDS = ("lift", "stairs", "floor", "elevator", "balcony", "non ac", "non-ac")


class HotelKnowledgeBase(BaseModel):
    """Full knowledge base object combining property info, details, rooms, policies, and rules."""

    hotel_id: str
    property_code: str | None = None
    name: str | None = None
    address: str | None = None

    hotel_details: HotelDetails | None = None
    rooms: List[RoomTypeDetail] = Field(default_factory=list)
    policies: HotelPolicies | None = None
    rules: HotelRules | None = None

    # ------------------------------------------------------------------
    # AI context compilation (voice-agent prompt block)
    #
    # Design: each section has its own small builder returning a string or
    # None. `compile_ai_context` just orders and joins non-empty sections, so
    # adding/removing a section is a one-line change and every builder is
    # null-safe (missing data never raises, it is simply omitted).
    # ------------------------------------------------------------------

    @classmethod
    def _room_note(cls, description: str | None, max_len: int = 200) -> str:
        """Extract only operationally relevant sentences from a room description."""
        text = cls._clean(description)
        if not text:
            return ""
        sentences = [s.strip() for s in text.replace("•", ".").split(".") if s.strip()]
        picked = [s for s in sentences if any(k in s.lower() for k in ROOM_NOTE_KEYWORDS)]
        return cls._clean(". ".join(picked), max_len=max_len)

    @staticmethod
    def _clean(text: str | None, max_len: int | None = None) -> str:
        """Collapse whitespace/newlines into one line and optionally truncate."""
        if not text:
            return ""
        cleaned = " ".join(str(text).split())
        if max_len and len(cleaned) > max_len:
            cleaned = cleaned[: max_len - 1].rstrip() + "…"
        return cleaned

    @staticmethod
    def _money(value: float | None) -> str:
        return f"₹{value:,.0f}" if value is not None else "N/A"

    @staticmethod
    def _yes_no(value: bool | None) -> str | None:
        if value is None:
            return None
        return "Yes" if value else "No"

    def _resolve_address(self) -> str:
        """Prefer the detailed in-property address; fall back to the root address."""
        loc = self.hotel_details.location if self.hotel_details else None
        detailed = self._clean(loc.property_address) if loc else ""
        base = detailed or self._clean(self.address)
        if loc:
            # Append city/state/pincode only if the address does not already include them
            extras = [
                x for x in (loc.city, loc.state, loc.pincode) if x and x.lower() not in base.lower()
            ]
            if extras:
                base = ", ".join(filter(None, [base, *extras]))
        return base

    def _section_header(self) -> str:
        lines = [f"HOTEL: {self.name or 'Hotel'}"]
        address = self._resolve_address()
        if address:
            lines.append(f"Address: {address}")
        return "\n".join(lines)

    def _section_property(self) -> str | None:
        hd = self.hotel_details
        if not hd:
            return None
        lines: List[str] = []
        if hd.property:
            p = hd.property
            info = [
                f"Rating: {p.star_rating}" if p.star_rating else None,
                f"Type: {p.property_type}" if p.property_type else None,
                f"Total Rooms: {p.total_rooms}" if p.total_rooms else None,
                f"Floors: {p.total_floors}" if p.total_floors else None,
            ]
            info = [i for i in info if i]
            if info:
                lines.append("Property Details: " + ", ".join(info))
            if p.property_description:
                lines.append(f"Description: {self._clean(p.property_description)}")
        if hd.timings and (hd.timings.check_in or hd.timings.check_out):
            lines.append(
                f"Timings: Check-in: {hd.timings.check_in or 'N/A'} | Check-out: {hd.timings.check_out or 'N/A'}"
            )
        return "\n".join(lines) or None

    def _section_contact(self) -> str | None:
        c = self.hotel_details.contact if self.hotel_details else None
        if not c:
            return None
        phones = [x for x in (c.primary_contact_number, c.alt_contact_number) if x]
        lines = ["HOTEL CONTACT:"]
        if phones:
            lines.append(f"• Phone: {' / '.join(phones)}")
        if c.primary_hotel_email:
            lines.append(f"• Email: {c.primary_hotel_email}")
        if c.official_websites:
            lines.append(f"• Website: {c.official_websites}")
        return "\n".join(lines) if len(lines) > 1 else None

    def _section_rooms(self) -> str | None:
        active_rooms = [r for r in self.rooms if r.is_active]
        if not active_rooms:
            return None
        lines = ["ROOM TYPES & PRICING (per night):"]
        for r in active_rooms:
            price = ""
            if r.pricing and r.pricing.base_price:
                floor = (
                    f" (Min negotiable: {self._money(r.pricing.min_negotiable_price)})"
                    if r.pricing.min_negotiable_price
                    else ""
                )
                price = f" - Base: {self._money(r.pricing.base_price)}{floor}"

            plans = [
                f"{rp.name or (rp.rate_type.display_name if rp.rate_type else 'Plan')}: "
                f"{self._money(rp.base_price) if rp.base_price else 'Standard'}"
                for rp in r.rate_plans
                if rp.is_active
            ]
            plan_suffix = f" [Plans: {', '.join(plans)}]" if plans else ""
            lines.append(f"• {r.name or 'Room'}{price}{plan_suffix}")

            specs: List[str] = []
            if r.occupancy and r.occupancy.max_occupancy:
                occ = r.occupancy
                specs.append(
                    f"Max {occ.max_occupancy} guests (base {occ.base_adult or 0} adults + {occ.base_child or 0} children)"
                )
            if r.dimension and r.dimension.size:
                unit = (r.dimension.unit or "").replace("_", " ").title()
                specs.append(f"{r.dimension.size:g} {unit}".strip())
            if r.view:
                specs.append(r.view.replace("_", " ").title())
            if r.bedding and r.bedding.bed_config:
                beds = ", ".join(f"{b.count or 1}x {b.type}" for b in r.bedding.bed_config if b.type)
                if beds:
                    specs.append(beds)
                if r.bedding.accommodates_extra_bed:
                    specs.append(f"Extra bed possible (max {r.bedding.max_extra_beds or 1})")
            if specs:
                lines.append(f"   Specs: {' | '.join(specs)}")
            if r.amenities:
                lines.append(f"   Amenities: {', '.join(r.amenities)}")
            note = self._room_note(r.description)
            if note:
                lines.append(f"   Note: {note}")
        return "\n".join(lines)

    def _section_policies(self) -> str | None:
        pol = self.policies
        if not pol:
            return None
        lines = ["KEY POLICIES:"]

        if pol.check_in_time or pol.check_out_time:
            lines.append(f"• Check-in: {pol.check_in_time or 'N/A'}, Check-out: {pol.check_out_time or 'N/A'}")
        flex = [
            f"Early check-in: {self._yes_no(pol.early_check_in_available)}"
            if pol.early_check_in_available is not None
            else None,
            f"Late check-out: {self._yes_no(pol.late_check_out_available)}"
            if pol.late_check_out_available is not None
            else None,
            f"24hr front desk: {self._yes_no(pol.front_desk_24_hr)}"
            if pol.front_desk_24_hr is not None
            else None,
        ]
        flex = [f for f in flex if f]
        if flex:
            lines.append("• " + " | ".join(flex))

        if pol.cancellation_policy:
            lines.append(f"• Cancellation: {self._clean(pol.cancellation_policy)}")
        if pol.name_change_allowed is not None:
            lines.append(f"• Name change on booking: {self._yes_no(pol.name_change_allowed)}")

        # ID & guest eligibility (frequently asked on calls)
        if pol.accepted_ids:
            id_note = ""
            if pol.same_city_id_allowed is False:
                id_note = " (same-city/local IDs NOT accepted)"
            elif pol.same_city_id_allowed:
                id_note = " (same-city IDs accepted)"
            lines.append(f"• Accepted IDs: {', '.join(pol.accepted_ids)}{id_note}")
        if pol.guest_profile:
            g = pol.guest_profile
            guest = [
                f"Unmarried couples: {self._yes_no(g.unmarried_couples_allowed)}"
                if g.unmarried_couples_allowed is not None
                else None,
                f"Guests below 18: {self._yes_no(g.below18_allowed)}" if g.below18_allowed is not None else None,
                f"Male-only groups: {self._yes_no(g.male_groups_allowed)}"
                if g.male_groups_allowed is not None
                else None,
            ]
            guest = [x for x in guest if x]
            if guest:
                lines.append("• Guest eligibility → " + " | ".join(guest))
        if pol.restrictions:
            r = pol.restrictions
            rules = [
                f"Smoking: {self._yes_no(r.smoking_allowed)}" if r.smoking_allowed is not None else None,
                f"Parties/events: {self._yes_no(r.parties_events_allowed)}"
                if r.parties_events_allowed is not None
                else None,
                f"Outside visitors: {self._yes_no(r.outside_visitors_allowed)}"
                if r.outside_visitors_allowed is not None
                else None,
                f"Wheelchair accessible: {self._yes_no(r.wheelchair_accessible)}"
                if r.wheelchair_accessible is not None
                else None,
            ]
            rules = [x for x in rules if x]
            if rules:
                lines.append("• On-premise → " + " | ".join(rules))

        # Pets, children, extra bed, meals
        if pol.pet_policy and pol.pet_policy.pets_allowed is not None:
            pet = f"• Pets: {'Allowed' if pol.pet_policy.pets_allowed else 'Not Allowed'}"
            if pol.pet_policy.pets_allowed and pol.pet_policy.max_pets:
                pet += f" (max {pol.pet_policy.max_pets})"
            if pol.pet_policy.extra_charges:
                pet += ", extra charges apply"
            lines.append(pet)
        if pol.child_age_policy and pol.child_age_policy.children_allowed:
            ch = pol.child_age_policy
            if ch.free_till is not None and ch.paid_till is not None:
                lines.append(
                    f"• Children: stay free up to {ch.free_till} yrs; charged {ch.free_till + 1}-{ch.paid_till} yrs"
                )
            else:
                lines.append("• Children: Allowed")
        if pol.infant_policy and pol.infant_policy.infant_free:
            lines.append("• Infants: stay free")
        if pol.extra_bed_policy:
            eb = pol.extra_bed_policy
            if eb.adult_bed and eb.adult_bed.strip().lower() == "yes":
                types = f" ({', '.join(eb.bed_types)})" if eb.bed_types else ""
                charge = f" at {self._money(eb.mattress_charge)}" if eb.mattress_charge else ""
                lines.append(f"• Extra bed for adults: Available{types}{charge}")
        if pol.meal_prices:
            m = pol.meal_prices
            meals = [
                f"{label} {self._money(price)}"
                for label, price in (("Breakfast", m.breakfast), ("Lunch", m.lunch), ("Dinner", m.dinner))
                if price
            ]
            if meals:
                lines.append("• On-site meals (per person): " + ", ".join(meals))

        if pol.custom_policy_text:
            lines.append(f"• Other: {self._clean(pol.custom_policy_text, max_len=300)}")
        for n in pol.notices:
            if n.title or n.content:
                lines.append(f"• NOTICE: {self._clean(n.title)} - {self._clean(n.content, max_len=200)}")

        return "\n".join(lines) if len(lines) > 1 else None

    def _section_rules(self, limit: int = 10) -> str | None:
        rules = self.rules
        if not rules or not (rules.do_rules or rules.dont_rules):
            return None
        lines = ["BEHAVIORAL DIRECTIVES:"]
        lines += [f"• DO: {self._clean(d)}" for d in rules.do_rules[:limit]]
        lines += [f"• DON'T: {self._clean(d)}" for d in rules.dont_rules[:limit]]
        return "\n".join(lines)

    def compile_ai_context(self) -> str:
        """
        Compiles the knowledge base into a dense, voice-friendly prompt block
        for the AI Voice Agent. Sections with no data are omitted automatically.
        """
        builders = (
            self._section_header,
            self._section_property,
            self._section_contact,
            self._section_rooms,
            self._section_policies,
            self._section_rules,
        )
        return "\n\n".join(section for build in builders if (section := build()))


