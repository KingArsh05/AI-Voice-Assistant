from typing import Any, Dict, List, Optional
from src.db.connection import mongodb
from src.models.knowledge_base import (
    BathroomDetails,
    BedItem,
    BeddingArrangement,
    BehavioralRule,
    ChildAgePolicy,
    ExtraBedPolicy,
    GuestProfilePolicy,
    HotelContact,
    HotelDetails,
    HotelKnowledgeBase,
    HotelLocation,
    HotelPolicies,
    HotelProperty,
    HotelRules,
    HotelTimings,
    InfantPolicy,
    MealPrices,
    PetPolicy,
    PolicyNotice,
    PropertyRestrictions,
    RatePlanDetail,
    RateTypeInfo,
    RoomDimension,
    RoomOccupancy,
    RoomPricing,
    RoomTypeDetail,
)



class KnowledgeBaseService:

    DEFAULT_NEGOTIATION_THRESHOLD: float = 0.9

    @classmethod
    def list_hotels(cls) -> List[Dict[str, Any]]:
        """Fetch all hotels from MONGODB_SOURCE_DB_NAME (staychat_clone_db)."""
        db = mongodb.staychat_clone_db
        cursor = db["hotels"].find({}, {"_id": 0, "hotel_id": 1, "name": 1, "address": 1, "property_code": 1})
        return list(cursor)

    @staticmethod
    def _parse_float(val: Any) -> float | None:

        if val is None or val == "":
            return None
        try:
            return float(val)
        except (ValueError, TypeError):
            return None

    @staticmethod
    def _parse_int(val: Any) -> int | None:
        if val is None or val == "":
            return None
        try:
            return int(val)
        except (ValueError, TypeError):
            return None

    @classmethod
    def _build_room_pricing(
        cls,
        base_price: Optional[float],
        currency: str = "INR",
        threshold_factor: float = DEFAULT_NEGOTIATION_THRESHOLD,
    ) -> Optional[RoomPricing]:
        """Construct structured RoomPricing with dynamic negotiation floor calculation."""
        if base_price is None:
            return None

        # Calculate minimum negotiable floor (base_price * threshold_factor) rounded to 2 decimal places
        min_negotiable = round(base_price * threshold_factor, 2)

        return RoomPricing(
            base_price=base_price,
            currency=currency,
            negotiation_threshold_factor=threshold_factor,
            min_negotiable_price=min_negotiable,
        )

    @classmethod
    def _map_rate_plan(
        cls,
        plan_doc: Dict[str, Any],
        rate_types_map: Dict[str, RateTypeInfo],
        default_currency: str = "INR",
    ) -> RatePlanDetail:
        """Map raw MongoDB rate_plan document and link with its RateTypeInfo."""
        rate_type_id = plan_doc.get("rate_type_id") or ""
        rate_type_info = rate_types_map.get(rate_type_id)

        base_price = cls._parse_float(plan_doc.get("base_price"))
        currency = plan_doc.get("currency") or default_currency
        threshold = cls.DEFAULT_NEGOTIATION_THRESHOLD
        min_negotiable = round(base_price * threshold, 2) if base_price is not None else None

        return RatePlanDetail(
            rate_plan_id=plan_doc.get("rate_plan_id"),
            name=plan_doc.get("name"),
            rate_type=rate_type_info,
            pricing_model=plan_doc.get("pricing_model", "linear"),
            base_price=base_price,
            currency=currency,
            negotiation_threshold_factor=threshold,
            min_negotiable_price=min_negotiable,
            min_nights=cls._parse_int(plan_doc.get("min_nights")) or 1,
            max_nights=cls._parse_int(plan_doc.get("max_nights")) or 30,
            is_active=bool(plan_doc.get("is_active", True)),
        )

    @classmethod
    def _map_room(
        cls,
        doc: Dict[str, Any],
        rate_plans_by_room: Dict[str, List[RatePlanDetail]],
        pricing_fallback_lookup: Dict[str, Dict[str, Any]],
        default_currency: str = "INR",
    ) -> RoomTypeDetail:
        """Map raw MongoDB room_type document into structured RoomTypeDetail with nested rate plans."""
        raw_bed_config = doc.get("bed_config") or []
        bed_items: List[BedItem] = [
            BedItem(
                type=item.get("type"),
                count=cls._parse_int(item.get("count")),
            )
            for item in raw_bed_config
            if isinstance(item, dict)
        ]

        room_type_id = doc.get("room_type_id") or ""
        room_name = (doc.get("name") or "").strip()

        # Get all rate plans connected to this room
        room_rate_plans = rate_plans_by_room.get(room_type_id, [])

        # Determine best base_price & summary pricing
        base_price: Optional[float] = None
        currency = default_currency

        if room_rate_plans:
            # Lowest base price among active rate plans
            active_prices = [rp.base_price for rp in room_rate_plans if rp.is_active and rp.base_price is not None]
            if active_prices:
                base_price = min(active_prices)
                currency = room_rate_plans[0].currency
        else:
            # Fallback to onboarding pricing if no specific rate plan document exists
            price_info = pricing_fallback_lookup.get(room_type_id) or pricing_fallback_lookup.get(room_name.lower())
            if price_info:
                base_price = cls._parse_float(price_info.get("base_price"))
                currency = price_info.get("currency") or default_currency

        pricing = cls._build_room_pricing(
            base_price=base_price,
            currency=currency,
            threshold_factor=cls.DEFAULT_NEGOTIATION_THRESHOLD,
        )

        return RoomTypeDetail(
            room_type_id=room_type_id,
            name=room_name,
            description=doc.get("description"),
            room_type=doc.get("room_type"),
            view=doc.get("room_view"),
            total_rooms=cls._parse_int(doc.get("total_rooms")),
            pricing=pricing,
            rate_plans=room_rate_plans,
            dimension=RoomDimension(
                size=cls._parse_float(doc.get("room_size")),
                unit=doc.get("room_size_unit"),
            ),
            occupancy=RoomOccupancy(
                base_adult=cls._parse_int(doc.get("base_adult_occupancy")),
                base_child=cls._parse_int(doc.get("base_child_occupancy")),
                max_adult=cls._parse_int(doc.get("max_adult_occupancy")),
                max_child=cls._parse_int(doc.get("max_child_occupancy")),
                max_occupancy=cls._parse_int(doc.get("max_occupancy")),
            ),
            bedding=BeddingArrangement(
                bed_config=bed_items,
                accommodates_extra_bed=doc.get("accommodates_extra_bed"),
                max_extra_beds=cls._parse_int(doc.get("max_extra_beds")),
                alternative_arrangement=doc.get("alternative_arrangement"),
                extra_bed_price=cls._parse_float(doc.get("extra_bed_price")),
            ),
            bathroom=BathroomDetails(
                count=cls._parse_int(doc.get("bathroom_count")),
                bathroom_type=doc.get("bathroom_type"),
            ),
            amenities=doc.get("amenities") or [],
            is_active=bool(doc.get("is_active", True)),
        )


    @classmethod
    def _map_policies(cls, doc: Optional[Dict[str, Any]]) -> Optional[HotelPolicies]:
        """Map raw MongoDB hotel_policies document into structured HotelPolicies."""
        if not doc:
            return None

        prop_rules = doc.get("property_rules") or {}
        guest_prof = prop_rules.get("guest_profile") or {}
        restrictions_data = prop_rules.get("restrictions") or {}
        pet_data = prop_rules.get("pet_policy") or {}
        infant_data = prop_rules.get("infant_policy") or {}
        extra_bed_data = prop_rules.get("extra_bed_policy") or {}
        meal_data = prop_rules.get("meal_prices") or {}
        child_age_data = doc.get("child_age_policy") or {}
        post_booking_data = doc.get("post_booking_policy") or {}
        notices_data = doc.get("notices") or []

        cancellation_val = (
            post_booking_data.get("cancellation_policy")
            or prop_rules.get("cancellation_policy")
            or doc.get("cancellation_policy")
        )

        return HotelPolicies(
            check_in_time=doc.get("check_in_time"),
            check_out_time=doc.get("check_out_time"),
            early_check_in_available=doc.get("early_check_in_available"),
            late_check_out_available=doc.get("late_check_out_available"),
            front_desk_24_hr=doc.get("front_desk24_hr"),
            express_check_out=doc.get("express_check_out"),
            cancellation_policy=cancellation_val,
            guest_profile=GuestProfilePolicy(
                unmarried_couples_allowed=guest_prof.get("unmarried_couples_allowed"),
                couple_friendly_tag=guest_prof.get("couple_friendly_tag"),
                below18_allowed=guest_prof.get("below18_allowed"),
                male_groups_allowed=guest_prof.get("male_groups_allowed"),
            ),
            restrictions=PropertyRestrictions(
                smoking_allowed=restrictions_data.get("smoking_allowed"),
                parties_events_allowed=restrictions_data.get("parties_events_allowed"),
                wheelchair_accessible=restrictions_data.get("wheelchair_accessible"),
                outside_visitors_allowed=restrictions_data.get("outside_visitors_allowed"),
            ),
            accepted_ids=prop_rules.get("accepted_i_ds") or [],
            same_city_id_allowed=prop_rules.get("same_city_id_allowed"),
            pet_policy=PetPolicy(
                pets_allowed=pet_data.get("pets_allowed"),
                pets_on_property=pet_data.get("pets_on_property"),
                pet_types=pet_data.get("pet_types") or [],
                extra_charges=pet_data.get("extra_charges"),
                restricted_areas=pet_data.get("restricted_areas") or [],
                leash_required=pet_data.get("leash_required"),
                max_pets=pet_data.get("max_pets"),
            ),
            infant_policy=InfantPolicy(
                infant_free=infant_data.get("infant_free"),
                complimentary_food=infant_data.get("complimentary_food"),
                food_items=infant_data.get("food_items") or [],
                extra_bed=infant_data.get("extra_bed"),
                extra_bed_charge=cls._parse_float(infant_data.get("extra_bed_charge")),
            ),
            extra_bed_policy=ExtraBedPolicy(
                extra_bed_included_in_rate=extra_bed_data.get("extra_bed_included_in_rate"),
                adult_bed=extra_bed_data.get("adult_bed"),
                bed_types=extra_bed_data.get("bed_types") or [],
                mattress_charge=cls._parse_float(extra_bed_data.get("mattress_charge")),
                kids_bed=extra_bed_data.get("kids_bed"),
            ),
            meal_prices=MealPrices(
                breakfast=cls._parse_float(meal_data.get("breakfast")),
                lunch=cls._parse_float(meal_data.get("lunch")),
                dinner=cls._parse_float(meal_data.get("dinner")),
            ),
            child_age_policy=ChildAgePolicy(
                children_allowed=child_age_data.get("children_allowed"),
                free_till=cls._parse_int(child_age_data.get("free_till")),
                paid_till=cls._parse_int(child_age_data.get("paid_till")),
            ),
            name_change_allowed=post_booking_data.get("name_change_allowed"),
            custom_policy_text=prop_rules.get("custom_policy_text"),
            notices=[
                PolicyNotice(
                    id=str(n.get("id")),
                    title=n.get("title"),
                    content=n.get("content"),
                    type=n.get("type"),
                )
                for n in notices_data
                if isinstance(n, dict)
            ],
        )

    @classmethod
    def _map_rules(cls, doc: Optional[Dict[str, Any]]) -> Optional[HotelRules]:
        """Map raw MongoDB hotel_rules document into structured HotelRules."""
        if not doc:
            return None

        raw_rules = doc.get("rules") or []
        rule_items: List[BehavioralRule] = []
        do_rules: List[str] = []
        dont_rules: List[str] = []

        for r in raw_rules:
            if not isinstance(r, dict):
                continue
            is_active = r.get("active", True)
            rule_type = (r.get("type") or "").strip().lower()
            text = (r.get("rule_text") or "").strip()

            rule_items.append(
                BehavioralRule(
                    rule_id=r.get("rule_id") or "",
                    type=rule_type,
                    category=r.get("category") or "general",
                    rule_text=text,
                    priority=cls._parse_int(r.get("priority")) or 1,
                    applies_to_stages=r.get("applies_to_stages") or ["all"],
                    active=is_active,
                )
            )

            if is_active and text:
                if rule_type == "do":
                    do_rules.append(text)
                elif rule_type == "dont":
                    dont_rules.append(text)

        return HotelRules(
            rules=rule_items,
            do_rules=do_rules,
            dont_rules=dont_rules,
        )


    @classmethod
    def get_knowledge_base(
        cls,
        hotel_id: str,
    ) -> HotelKnowledgeBase:

        db = mongodb.staychat_clone_db

        # --------------------------------------------------
        # 1. Get basic hotel information
        # --------------------------------------------------
        hotel = db["hotels"].find_one({"hotel_id": hotel_id})

        if not hotel:
            raise ValueError(f"Hotel '{hotel_id}' not found.")

        # --------------------------------------------------
        # 2. Get hotel details
        # --------------------------------------------------
        hotel_details = db["hotel_details"].find_one({"hotel_id": hotel_id})

        if not hotel_details:
            raise ValueError(f"Hotel details for '{hotel_id}' not found.")

        # --------------------------------------------------
        # 3. Extract nested sections
        # --------------------------------------------------
        property_data = hotel_details.get("property", {})
        contact_data = hotel_details.get("contact", {})
        location_data = hotel_details.get("location", {})
        currency = property_data.get("primary_currency") or "INR"

        # --------------------------------------------------
        # 4. Load Rate Types & Rate Plans
        # --------------------------------------------------
        # Load all rate_types (e.g. EP, CP, MAP) into lookup map
        rate_types_map: Dict[str, RateTypeInfo] = {}
        for rt in db["rate_types"].find():
            rt_id = rt.get("rate_type_id")
            if rt_id:
                rate_types_map[rt_id] = RateTypeInfo(
                    rate_type_id=rt_id,
                    short_name=rt.get("short_name"),
                    display_name=rt.get("display_name"),
                )

        # Query and map rate plans for this hotel, grouped by room_type_id
        rate_plans_by_room: Dict[str, List[RatePlanDetail]] = {}
        plan_docs = list(db["rate_plans"].find({"hotel_id": hotel_id, "is_active": True}))
        for plan_doc in plan_docs:
            rt_id = plan_doc.get("room_type_id")
            if not rt_id:
                continue
            plan_detail = cls._map_rate_plan(plan_doc, rate_types_map, default_currency=currency)
            rate_plans_by_room.setdefault(rt_id, []).append(plan_detail)

        # Onboarding fallback lookup (for hotels configured via onboarding or missing rate plans)
        onboarding_doc = db["hotels_onboarding"].find_one({"hotel_id": hotel_id})
        onboarding_rooms: List[Dict[str, Any]] = []
        pricing_fallback_lookup: Dict[str, Dict[str, Any]] = {}

        if onboarding_doc:
            onboarding_rooms = (
                onboarding_doc.get("sections", {})
                .get("rooms_rates", {})
                .get("rooms", [])
            )
            for ob_room in onboarding_rooms:
                ob_name = (ob_room.get("name") or "").strip().lower()
                ob_price = cls._parse_float(ob_room.get("base_price"))
                if ob_name and ob_price is not None:
                    pricing_fallback_lookup[ob_name] = {
                        "base_price": ob_price,
                        "currency": currency,
                    }

        # --------------------------------------------------
        # 5. Get room types and link rate plans
        # --------------------------------------------------
        room_docs = list(db["room_types"].find({"hotel_id": hotel_id}))

        if room_docs:
            rooms = [
                cls._map_room(
                    r,
                    rate_plans_by_room=rate_plans_by_room,
                    pricing_fallback_lookup=pricing_fallback_lookup,
                    default_currency=currency,
                )
                for r in room_docs
            ]
        elif onboarding_rooms:
            # Fallback for hotels configured only through onboarding
            rooms = []
            for ob_room in onboarding_rooms:
                ob_price = cls._parse_float(ob_room.get("base_price"))
                pricing = cls._build_room_pricing(
                    base_price=ob_price,
                    currency=currency,
                    threshold_factor=cls.DEFAULT_NEGOTIATION_THRESHOLD,
                )
                rooms.append(
                    RoomTypeDetail(
                        name=ob_room.get("name"),
                        description=ob_room.get("description"),
                        total_rooms=cls._parse_int(ob_room.get("no_of_rooms")),
                        pricing=pricing,
                        occupancy=RoomOccupancy(
                            max_occupancy=cls._parse_int(ob_room.get("max_occupancy"))
                        ),
                        is_active=True,
                    )
                )
        else:
            rooms = []


        # --------------------------------------------------
        # 6. Get hotel policies & rules
        # --------------------------------------------------
        policy_doc = db["hotel_policies"].find_one({"hotel_id": hotel_id})
        policies = cls._map_policies(policy_doc)

        rules_doc = db["hotel_rules"].find_one({"hotel_id": hotel_id})
        rules = cls._map_rules(rules_doc)

        # --------------------------------------------------
        # 7. Build knowledge base
        # --------------------------------------------------
        return HotelKnowledgeBase(
            # Basic hotel information
            hotel_id=hotel["hotel_id"],
            property_code=hotel.get("property_code"),
            name=hotel.get("name"),
            address=hotel.get("address"),
            # Hotel details
            hotel_details=HotelDetails(
                # Property information
                property=HotelProperty(
                    property_type=property_data.get("property_type"),
                    hotel_chain=property_data.get("hotel_chain"),
                    star_rating=property_data.get("star_rating"),
                    primary_currency=currency,
                    property_description=property_data.get("property_description"),
                    total_rooms=cls._parse_int(property_data.get("total_rooms")),
                    total_floors=cls._parse_int(property_data.get("total_floors")),
                    accepting_bookings_since=property_data.get(
                        "accepting_bookings_since"
                    ),
                    year_of_construction=cls._parse_int(
                        property_data.get("year_of_construction")
                    ),
                ),
                # Contact information
                contact=HotelContact(
                    primary_contact_name=contact_data.get("primary_contact_name"),
                    primary_contact_number=contact_data.get("primary_contact_number"),
                    alt_contact_name=contact_data.get("alt_contact_name"),
                    alt_contact_number=contact_data.get("alt_contact_number"),
                    emergency_contact_name=contact_data.get("emergency_contact_name"),
                    emergency_contact_number=contact_data.get(
                        "emergency_contact_number"
                    ),
                    primary_hotel_email=contact_data.get("primary_hotel_email"),
                    additional_email_addresses=contact_data.get(
                        "additional_email_addresses"
                    ),
                    official_websites=contact_data.get("official_websites"),
                ),
                # Location information
                location=HotelLocation(
                    property_address=location_data.get("property_address"),
                    city=location_data.get("city"),
                    state=location_data.get("state"),
                    country=location_data.get("country"),
                    pincode=location_data.get("pincode"),
                ),
                # Check-in / Check-out information
                timings=HotelTimings(
                    check_in=property_data.get("check_in_time"),
                    check_out=property_data.get("check_out_time"),
                    timezone=property_data.get("timezone"),
                ),
            ),
            rooms=rooms,
            policies=policies,
            rules=rules,
        )



