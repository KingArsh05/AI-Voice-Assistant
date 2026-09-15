const API_BASE = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : "";


export const CALL_OUTCOMES = [
  "interested_held_room",
  "callback_requested",
  "declined_budget",
  "declined_booked_elsewhere",
  "declined_dates_mismatch",
  "declined_other",
  "not_interested",
  "wrong_number",
  "call_unanswered_or_dropped",
];

export const BLOCKERS = [
  "price",
  "dates_not_fixed",
  "travel_not_booked",
  "comparing_options",
  "group_family_deciding",
  "room_type_or_facility_doubt",
  "already_booked_elsewhere",
  "trip_cancelled",
  "no_clear_reason",
  "none",
];

export const OUTCOME_LABELS = {
  interested_held_room: "Interested — Held Room",
  callback_requested: "Callback Requested",
  declined_budget: "Declined — Budget",
  declined_booked_elsewhere: "Declined — Booked Elsewhere",
  declined_dates_mismatch: "Declined — Dates Mismatch",
  declined_other: "Declined — Other",
  not_interested: "Not Interested",
  wrong_number: "Wrong Number",
  call_unanswered_or_dropped: "Unanswered / Dropped",
};

export const BLOCKER_LABELS = {
  price: "Price",
  dates_not_fixed: "Dates Not Fixed",
  travel_not_booked: "Travel Not Booked",
  comparing_options: "Comparing Options",
  group_family_deciding: "Group / Family Deciding",
  room_type_or_facility_doubt: "Room / Facility Doubt",
  already_booked_elsewhere: "Already Booked Elsewhere",
  trip_cancelled: "Trip Cancelled",
  no_clear_reason: "No Clear Reason",
  none: "None",
};

export const ROOM_TYPES = [
  { id: "deluxe_king", label: "Deluxe Room, King Bed" },
  { id: "premier_room", label: "Premier Room" },
  { id: "deluxe_family", label: "Deluxe Family Room" },
];

// ---------------------------------------------------------------------------
// API calls — strictly real data, empty states on error or absence
// ---------------------------------------------------------------------------

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(8000),
    ...options,
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Request failed (${res.status}): ${errBody}`);
  }
  return res.json();
}

export async function checkHealth() {
  try {
    return { ...(await request("/health")), live: true };
  } catch {
    return { status: "offline", plivo_configured: false, live: false };
  }
}

export async function initiateCall({ to_number, customer_name, campaign_id }) {
  const result = await request("/api/v1/voice/call", {
    method: "POST",
    body: JSON.stringify({ to_number, customer_name, campaign_id }),
  });
  return { ...result, live: true };
}

export async function getCampaigns() {
  try {
    return await request("/api/v1/voice/campaigns");
  } catch (e) {
    console.error("Failed to load campaigns:", e);
    return {};
  }
}

export async function getCallLogs(limit = 50) {
  try {
    return await request(`/api/v1/voice/calls?limit=${limit}`);
  } catch (e) {
    console.error("Failed to fetch call logs:", e);
    return [];
  }
}

export async function createCampaign(campaignData) {
  return request("/api/v1/voice/campaigns", {
    method: "POST",
    body: JSON.stringify(campaignData),
  });
}

export async function updateCampaign(campaignId, campaignData) {
  return request(`/api/v1/voice/campaigns/${campaignId}`, {
    method: "PUT",
    body: JSON.stringify(campaignData),
  });
}

export async function saveCallLog(callData) {
  return request("/api/v1/voice/calls", {
    method: "POST",
    body: JSON.stringify(callData),
  });
}