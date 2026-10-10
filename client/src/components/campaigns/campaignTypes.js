/**
 * Campaign Queue Execution States
 * Minimalist, predictable state machine:
 * 'idle' -> 'running' <-> 'paused' -> 'stopped' | 'completed'
 */
export const CAMPAIGN_QUEUE_STATUS = {
  IDLE: "idle",
  RUNNING: "running",
  PAUSED: "paused",
  STOPPED: "stopped",
  COMPLETED: "completed",
};

/**
 * Standard Campaign Types & Templates
 * Empowers hotels to quickly select common event/promotion strategies
 */
export const CAMPAIGN_PRESETS = [
  {
    id: "special_event",
    label: "Special Event / Festival",
    badge: "Event",
    defaultSubject: "Exclusive Invitation: Weekend Festival & Live Music Night",
    defaultMessage:
      "We are hosting a special weekend celebration featuring live music and chef-curated dining specials. As our valued guest, we are reserving complimentary entry and priority table access for your party.",
  },
  {
    id: "room_upgrade",
    label: "New Room Feature / Upgrade",
    badge: "Upgrade",
    defaultSubject: "Experience our newly renovated Suites & Spa features",
    defaultMessage:
      "We've newly upgraded our premium rooms with state-of-the-art smart climate control, plush king bedding, and complimentary spa access. We'd love to welcome you back with a personalized 20% privilege rate.",
  },
  {
    id: "seasonal_offer",
    label: "Seasonal Staycation Offer",
    badge: "Offer",
    defaultSubject: "Special seasonal stay offer for upcoming holidays",
    defaultMessage:
      "Plan your next relaxing getaway with us. Enjoy extended complimentary late check-out, gourmet breakfast buffet, and special package rates curated specifically for you.",
  },
  {
    id: "custom",
    label: "Custom Hotel Campaign",
    badge: "Custom",
    defaultSubject: "",
    defaultMessage: "",
  },
];

/**
 * Utility to safely generate a deterministic/clean batch & campaign ID
 */
export const generateCampaignId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `cmp_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `cmp_${Date.now().toString(36)}`;
};
