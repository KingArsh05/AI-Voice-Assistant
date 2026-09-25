import re
import logging
from typing import Tuple, List, Optional

logger = logging.getLogger(__name__)

# Disallowed words/patterns in guest names (abusive, derogatory, troll terms)
BLOCKED_NAME_PATTERNS = [
    r"\bpagal\b",
    r"\bdarubaj[j]?\b",
    r"\bdaaru\b",
    r"\bchor\b",
    r"\bkutta\b",
    r"\bharami\b",
    r"\bgadha\b",
    r"\bchutiya\b",
    r"\bbakwas\b",
    r"\bfraud\b",
    r"\bscam\b",
    r"\bdrunkard\b",
    r"\bidiot\b",
    r"\bstupid\b",
    r"\bfuck\b",
    r"\bbitch\b",
]

# Patterns in lead notes that indicate non-hospitality abuse, extortion, scams or harassment
BLOCKED_LEAD_PATTERNS = [
    r"\blottery\b",
    r"\binam\b",
    r"\bprize\b",
    r"\blakh rupees\b",
    r"\bmake him pay\b",
    r"\bmake her pay\b",
    r"\bbroken tv\b",
    r"\btv damage\b",
    r"\bsay sorry\b",
    r"\bpolice\b",
    r"\bthreat\b",
    r"\bextortion\b",
    r"\brecovery\b",
    r"\bvasooli\b",
    r"\bgaali\b",
]

# Meta-instructions operators accidentally type for the bot, e.g. "in hindi tell him..."
OPERATOR_META_PATTERNS = [
    r"^(please\s+)?(in\s+hindi\s+)?(tell|ask|say|talk to)\s+.*?:",
    r"^in hindi tell (him|her|guest|them)\s+(to\s+)?",
    r"^tell (him|her|guest|them) (in hindi\s+)?(to\s+)?",
    r"^ask (him|her|guest|them) (in hindi\s+)?(to\s+)?",
    r"^talk to (mr|mrs|ms|guest)\s+.*?\s+(and|to|that)\s+",
    r"^talk to (mr|mrs|ms|guest)\s+.*?,?\s*",
]


def sanitize_guest_name(raw_name: str) -> Tuple[str, List[str]]:
    """
    Sanitizes guest name, stripping derogatory slurs and invalid formatting.
    Returns: (cleaned_name, warnings)
    """
    warnings = []
    if not raw_name or not raw_name.strip():
        return "Guest", ["Empty guest name, defaulted to 'Guest'"]

    name = raw_name.strip()

    # Check for abusive/derogatory terms
    for pattern in BLOCKED_NAME_PATTERNS:
        if re.search(pattern, name, re.IGNORECASE):
            warnings.append(f"Blocked word pattern '{pattern}' detected in guest name: '{name}'")
            name = re.sub(pattern, "", name, flags=re.IGNORECASE).strip()

    # Clean leftover double spaces and punctuation
    name = re.sub(r"\s+", " ", name)
    name = re.sub(r"^[^a-zA-Z\u0900-\u097F]+|[^a-zA-Z\u0900-\u097F]+$", "", name).strip()

    if not name or len(name) < 2:
        warnings.append(f"Guest name '{raw_name}' was invalid or stripped; fallback to 'Guest'")
        return "Guest", warnings

    return name.title(), warnings


def validate_lead_content(raw_lead: str) -> Tuple[bool, Optional[str]]:
    """
    Validates whether lead text is suitable for voice calling.
    Rejects scams (lottery/prize), threats, extortion, or harassment.
    Returns: (is_valid, rejection_reason)
    """
    if not raw_lead:
        return True, None

    lead_lower = raw_lead.lower()
    for pattern in BLOCKED_LEAD_PATTERNS:
        if re.search(pattern, lead_lower):
            return False, f"Prohibited lead content detected matching rule: '{pattern}'"

    return True, None


def clean_lead_for_ai(raw_lead: Optional[str], hotel_name: str = "the hotel") -> str:
    """
    Normalizes operator notes into clean, contextual AI knowledge.
    Strips raw operator meta-instructions (e.g. 'in hindi tell him...') so the
    AI does not parrot instructions verbatim to the caller.
    """
    if not raw_lead or not raw_lead.strip():
        return f"Prospective guest inquiry for booking and stay details at {hotel_name}."

    lead = raw_lead.strip()

    # Strip operator meta instructions
    for pattern in OPERATOR_META_PATTERNS:
        lead = re.sub(pattern, "", lead, flags=re.IGNORECASE).strip()

    # Cap maximum length to avoid prompt bloat
    if len(lead) > 300:
        lead = lead[:297] + "..."

    return lead
