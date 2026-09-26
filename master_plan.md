# 🧠 StayChat Voice Assistant — Master Architecture & Fix Plan
> Senior Engineering Lead Review & Production Status

---

## 📊 Executive Status Dashboard

| Module / Milestone | Status | Key Files Affected | Details |
|---|---|---|---|
| **1. Server .gitignore & Environment Protection** | DONE | server/.gitignore, .gitignore | Excluded .env, .venv/, __pycache__, compiled bytecode, logs. |
| **2. AI Interruption & Conversational Discipline** | DONE | server/src/services/call_service.py | Injected listening patience rule, filler tolerance (haan, hmm), 1.5s greeting pause, max 2-3 sentences. |
| **3. Hindi-First Language Policy** | DONE | server/src/services/call_service.py | Strict rule: start in Hindi/Hinglish, max 1 switch to English only if guest speaks English 2+ turns, no back-and-forth toggle. |
| **4. Safety & Abuse Disconnect** | DONE | server/src/services/call_service.py, server/src/services/lead_guardrails.py | Immediate polite hang-up on robbery, extortion, threats, or abuse. Pre-call validation updated. |
| **5. Campaign Worker Deadlock Fix** | DONE | server/src/services/campaign_service.py | Global worker registry, heartbeat timestamps in DB, exponential backoff polling, 45s webhook fallback. Fixes pause after 5+ leads. |
| **6. CRM Backend Architecture** | DONE | server/src/controllers/crm_controller.py, server/src/services/crm_service.py, server/src/models/crm_lead_model.py | Full CRUD for crm_leads collection: list with filters, lead stats aggregation, single-call dispatch endpoint. |
| **7. CRM Frontend Portal** | DONE | client/src/components/CRM.jsx, client/src/components/crm/ConfirmCallModal.jsx, client/src/components/crm/AddLeadModal.jsx | Dark UI lead pipeline table, status badges, single-click call confirmation modal, multi-lead select to Campaign flow. |
| **8. Plivo CX AI Dashboard VAD Tuning** | PENDING (Dashboard) | Plivo CX Console | Needs manual knob adjustments in Plivo CX Flow editor (see instructions below). |
| **9. Tanay Database Sync Integration** | READY FOR CREDS | server/.env | Once connection URI or collection mapping is confirmed, direct ingestion or webhook sync will activate. |

---

## 🔍 Detailed Component Audits & Completed Improvements

### 1. AI Interruption & Barge-in Handling (Resolved in Prompt + Dashboard Guidance)
- **Prompt Guardrail**: Injected LISTENING PATIENCE and FILLER TOLERANCE rules into call_service.py. When guests say 'haan', 'hmm', 'theek hai', the AI now stays silent until the user completes their statement.
- **Greeting Delay**: Added 1.5s initial pause on answer before the AI speaks, preventing collisions with the guest's initial greeting.
- **Plivo CX Console Action Required**:
  1. Open Plivo CX Flow Editor.
  2. Locate the AI Voice Agent node -> Voice Activity Detection (VAD) / Barge-in settings.
  3. Increase Endpointing / Silence Timeout to 1000ms - 1200ms (default is often 400-500ms which causes hasty interruptions).
  4. Increase Interruption Confidence / Sensitivity Threshold to High so subtle breathing or background noise does not trigger a turn.

### 2. Campaign Stalling & Pause Issue (Resolved in Worker Threading)
- **Worker Registry**: Added thread-safe _campaign_workers registry in campaign_service.py.
- **Heartbeat Tracking**: Campaign document in MongoDB now updates worker_heartbeat on every loop pass.
- **Polling Backoff & Timeout**: Replaced rigid 3s sleep with exponential backoff (3s -> 6s -> 12s, max 20s).
- **Webhook Failsafe**: Added 45-second fallback: if Plivo webhook drops or delays, the worker marks lead state and moves to the next lead rather than hanging indefinitely.

### 3. CRM Architecture & Tanay Database Connection
- **Data Model**: Designed crm_lead_model.py with hotel linkage, status (new, follow_up, in_progress, booked, cold, lost), call count, and timestamps.
- **Database Integration**: Wired into MongoDB via crm_service.py. Tanay's database credentials can either map directly to the same MongoDB instance or configure a sync cron.
- **UI Experience**:
  - Filter by status chip, search by query, hotel selection.
  - One-click Call button pops up ConfirmCallModal.jsx with editable notes.
  - Multi-select checkbox sends selected leads directly into BulkCalls.jsx to launch a batch campaign without re-uploading an Excel file.

---

## 🚀 Next Steps to Verify
1. **Push Git Commits**:
   run: git push origin main
2. **Review CRM Tab**:
   Navigate to /crm in the browser to view the guest table and test adding a lead or dispatching a single-call.
3. **Configure Plivo CX Flow VAD**:
   Update the endpointing delay in Plivo Console to 1000ms+ for complete interruption-free calling.
