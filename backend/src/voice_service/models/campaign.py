from datetime import datetime, timezone

def make_campaign(
    id,
    name,
    hotel_name,
    city,
    landmark,
    property_facts=None,
    rate_info=None,
    availability=None,
    instructions=None,
    extraction_schema=None,
    forwarding_number="",
    is_active=True,
):
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": id,
        "name": name,
        "hotel_name": hotel_name,
        "city": city,
        "landmark": landmark,
        "property_facts": property_facts or [],
        "rate_info": rate_info or {},
        "availability": availability or {},
        "instructions": instructions or "",
        "extraction_schema": extraction_schema or {},
        "forwarding_number": forwarding_number or "",
        "is_active": is_active,
        "created_at": now,
        "updated_at": now,
    }
