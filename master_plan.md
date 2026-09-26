# 🧠 StayChat Voice Assistant — Master Fix Plan
> Senior Developer Analysis & Remediation Roadmap

---

## 🔍 Root Cause Analysis (What's Actually Broken)

### Issue 1 — AI Interruption (Most Critical)

**Root Cause:** The Plivo CX AI agent uses **barge-in / Voice Activity Detection (VAD)** that triggers the moment it detects *any* human voice energy. When the guest says "Haan..." or "Hmm..." the VAD sees audio energy and immediately cuts the AI mid-sentence to "respond". This is **not** a code bug — it's a **Plivo CX AI configuration problem** + missing prompt instructions.

**Fix (2 parts):**
1. In Plivo CX Flow settings: raise endpointing timeout to 1000–1200ms, raise barge-in threshold
2. In the AI system prompt (our code): add filler-word continuation instruction so "hmm/haan/theek hai" don't trigger a response

---

### Issue 2 — Campaign Pausing/Stopping Mid-Run (5+ leads)

**Root Cause (Found in code):**
1. `_process_queue` is a **daemon thread** — if Flask worker recycles or memory pressure hits, thread dies silently
2. `_wait_for_call_terminal` polls every 3s for up to 210s per lead. For 5+ leads this creates a massive sequential blocking chain — if any Plivo webhook is delayed, the worker blocks on that lead for the full max duration before moving on
3. When the thread exits due to timeout, DB status stays `running` — so Pause→Resume respawns the worker (that's why it works)

**Fix:**
- Add per-campaign worker registry (dict: `campaign_id -> thread`) to detect dead threads
- Add **heartbeat** field to campaign doc (worker updates it every loop iteration)
- On `start_campaign`, check if a live thread already exists before spawning a new one
- Reduce poll interval AND add short-circuit: if no webhook arrives in 45s after a call trigger, log warning and move to next lead
- Add exponential backoff polling (3s → 6s → 12s, max 20s)

---

### Issue 3 — Language: Start Hindi, Convert Once Max

**Root Cause:** Not implemented. `_build_dynamic_context` mentions "Default language is Hindi/Hinglish" in greeting only. No language switch discipline enforced.

**Fix:** Add explicit rule block to AI prompt:
```
RULE — LANGUAGE DISCIPLINE: Begin EVERY call in Hindi/Hinglish.
If and ONLY IF the guest responds in pure English for 2+ consecutive turns, switch to English.
Maximum ONE language switch per call. Do not switch back to Hindi after switching to English.
```

---

### Issue 4 — Dangerous Content: Immediate Disconnect

**Root Cause:** Server-side `validate_lead_content()` blocks abuse in lead notes (pre-call). But during live call, AI has no instruction to hang up when guest says something dangerous.

**Fix:** Add safety disconnect rule to AI prompt (our code, injected via Plivo CX params):
```
RULE — SAFETY DISCONNECT: If at ANY point the guest uses abusive/threatening language, mentions robbery, extortion, or asks for illegal activity — immediately say 'Dhanyavaad, main call end kar rahi hoon. Namaskar.' and hang up. Do NOT engage, argue, or try to de-escalate.
```

---

### Issue 5 — CRM Tab: Tanay's Data + Select & Call

**Root Cause:** Missing feature entirely.

**Plan:**
- Backend: New `crm_controller.py` with `GET /api/v1/crm/leads` (reads from MongoDB `leads` collection OR proxies Tanay's API)
- Frontend: New `CRM.jsx` page — full CRM table with hotel/status/date filters
- Single-call flow: Click "📞 Call" on a lead row → opens Confirm modal → user sees all lead details → edits if needed → confirms → triggers call
- Bulk flow: Multi-select leads → "Create Campaign" button

---

### Issue 6 — Single Lead Confirm-Before-Call Flow

**Root Cause:** Current MakeCall is a blank form. No CRM-to-call prefill path exists.

**Fix:** Create a reusable `<ConfirmCallModal>` component:
- Pre-populated from CRM lead data
- Editable lead notes field
- "Confirm & Call" button triggers the existing MakeCall API

---

### Issue 7 — Voice Provider (ElevenLabs / VAPI / Other)

**Analysis:**
- **Plivo CX AI** = current stack (handles STT + LLM + TTS in one closed loop)
- **ElevenLabs** = TTS-only. Can't replace Plivo CX AI standalone without building a custom media bridge
- **VAPI** = purpose-built conversational voice AI. Supports ElevenLabs voices natively. Solves barge-in/interruption natively. Best alternative.
- **Retell AI** = similar to VAPI, also good for Hindi support

**Recommendation:** Stay on Plivo CX for now (fastest fixes). For next sprint, evaluate VAPI — it solves interruption, supports ElevenLabs TTS, and has better Hindi support. I can build a PoC.

---

## 📋 Priority Queue

| # | Issue | Files | Effort | Impact |
|---|-------|-------|--------|--------|
| 1 | Campaign worker reliability (heartbeat + smarter polling) | `campaign_service.py` | M | Critical |
| 2 | AI prompt: Hindi-first + safety disconnect + filler tolerance | `call_service.py` | S | Critical |
| 3 | Expanded lead guardrails (robbery, chori, dhoka) | `lead_guardrails.py` | XS | High |
| 4 | CRM page backend + API | New `crm_controller.py` + `crm_service.py` | M | High |
| 5 | CRM page frontend + confirm modal | New `CRM.jsx` + `ConfirmCallModal.jsx` | L | High |
| 6 | Plivo CX VAD/barge-in config (manual dashboard step) | Plivo dashboard | XS | Critical |
| 7 | Voice provider PoC (VAPI eval) | Architecture doc | Research | Medium |

---

## ❓ Open Questions Before Full Implementation

1. **Tanay's CRM API** — What is the endpoint URL/format? Or should we create a `leads` MongoDB collection and build an import UI for manual data entry?
2. **Plivo CX barge-in settings** — Do you have access to the Plivo CX Flow editor? I'll write exact steps for which knobs to turn.
3. **ElevenLabs/VAPI** — Want a full architecture PoC for switching providers? This would fix interruption at the platform level.
