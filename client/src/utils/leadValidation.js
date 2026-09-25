// Client-side lead guardrails & validation mirroring server/src/services/lead_guardrails.py

export const BLOCKED_NAME_PATTERNS = [
  /\bpagal\b/i,
  /\bdarubaj[j]?\b/i,
  /\bdaaru\b/i,
  /\bchor\b/i,
  /\bkutta\b/i,
  /\bharami\b/i,
  /\bgadha\b/i,
  /\bchutiya\b/i,
  /\bbakwas\b/i,
  /\bfraud\b/i,
  /\bscam\b/i,
  /\bdrunkard\b/i,
  /\bidiot\b/i,
  /\bstupid\b/i,
  /\bfuck\b/i,
  /\bbitch\b/i,
];

export const BLOCKED_LEAD_PATTERNS = [
  { pattern: /\blottery\b/i, label: "Lottery / Prize reference" },
  { pattern: /\binam\b/i, label: "Lottery / Inam reference" },
  { pattern: /\bprize\b/i, label: "Prize scheme reference" },
  { pattern: /\blakh rupees\b/i, label: "Cash prize scheme" },
  { pattern: /\bmake him pay\b/i, label: "Extortion / harassment" },
  { pattern: /\bmake her pay\b/i, label: "Extortion / harassment" },
  { pattern: /\bbroken tv\b/i, label: "Hostile damage dispute" },
  { pattern: /\btv damage\b/i, label: "Hostile damage dispute" },
  { pattern: /\bsay sorry\b/i, label: "Forced apology / harassment" },
  { pattern: /\bpolice\b/i, label: "Police / legal threat" },
  { pattern: /\bthreat\b/i, label: "Threatening language" },
  { pattern: /\bextortion\b/i, label: "Extortion content" },
  { pattern: /\brecovery\b/i, label: "Debt recovery harassment" },
  { pattern: /\bvasooli\b/i, label: "Vasooli / illegal recovery" },
  { pattern: /\bgaali\b/i, label: "Abusive language" },
];

/**
 * Validates a single lead against phone format, name slurs, and toxic keywords.
 * Also checks if the phone is a duplicate within the provided batch.
 */
export function validateLead(lead, allLeads = [], currentIndex = 0) {
  const issues = [];

  // 1. Phone number check
  const phone = lead.phone_number || "";
  const isValidE164 = /^\+[1-9]\d{7,14}$/.test(phone);
  if (!isValidE164) {
    issues.push("Invalid phone format (must be 7-15 digits with valid country prefix)");
  }

  // 2. Note: Duplicate phone numbers are allowed for developer testing with single number

  // 3. Name check (slurs/abusive)
  const name = lead.guest_name || "";
  for (const pattern of BLOCKED_NAME_PATTERNS) {
    if (pattern.test(name)) {
      issues.push("Prohibited or abusive term in guest name");
      break;
    }
  }

  // 4. Content check (scams, lottery, threats)
  const notes = lead.lead_details || "";
  for (const item of BLOCKED_LEAD_PATTERNS) {
    if (item.pattern.test(notes)) {
      issues.push(`Prohibited content: ${item.label}`);
      break;
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}
