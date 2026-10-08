# Backend Architecture & Migration Blueprint

> **Status**: Clean Slate Reboot  
> **Target**: High-performance, low-latency, resilient Voice Calling Assistant powered by Plivo CX Agent Builder & Groq LLM.

---

## 1. What We Currently Have (The Clean Core)

| Component | File | Responsibility |
| :--- | :--- | :--- |
| **Call Model** | `server/src/models/plivo_call_model.py` | Validated Pydantic schema (`OutboundCallRequest`) with `dry_run` support for zero-cost testing. |
| **Core Voice Service** | `server/src/services/plivo_service.py` | Single source of truth: Reads 8 StayChat collections, compiles concise AI briefs via Groq (with zero-cost local fallback), triggers Plivo HTTP endpoint, records call state in MongoDB, handles batch calls, and processes hangup/recording webhooks. |
| **Voice Controller** | `server/src/controllers/voice_controller.py` | API endpoints: `POST /api/v1/voice/call`, `POST /api/v1/voice/events/hangup`, `POST /api/v1/voice/events/recording`, `GET /api/v1/voice/hotels`. |
| **Lead Guardrails** | `server/src/services/lead_guardrails.py` | Profanity, abuse, troll name, and non-hospitality scam detection filters for Indian context. |
| **Configuration** | `server/src/config.py` | Multi-DB URIs (`staychat_clone_db` for read-only source, `voice_calling_app_db` for calls/logs), Plivo credentials, Groq API keys. |

---

## 2. Legacy Features to Rebuild (Roadmap)

These legacy components are being cleared out to remove mess and tech debt. They will be rebuilt modularly:

### Phase 1: Call Logs & Analytics (Immediate Next Step)
- **Goal**: Allow querying and inspecting call history, duration, costs, audio recordings, transcripts, and AI-generated summaries.
- **Backend Requirements**:
  - `GET /api/v1/voice/calls`: Paginated list of call logs with filtering (hotel, status, date range, search).
  - `GET /api/v1/voice/calls/<call_id>`: Detailed view of a single call session including raw transcript turns and recording URL.
  - Analytics summary (total calls, completed vs. rejected, avg duration).

### Phase 2: CRM & Lead Sync (Read-Only Source DB)
- **Goal**: Browse leads directly from `staychat_clone_db` without writing to it.
- **Backend Requirements**:
  - Clean `crm_controller.py` and `crm_service.py` that read guest inquiries/leads.
  - One-click trigger to bridge a lead directly into `plivo_service.make_single_call()`.
  - Guardrail check applied before calling.

### Phase 3: Batch Calling & Queued Campaigns
- **Goal**: Run automated queue or campaign calls to multiple leads with rate limiting, concurrency control, and separate background threads.
- **Backend Requirements**:
  - `POST /api/v1/voice/batch`: Trigger multiple calls concurrently via worker thread pool.
  - Call status monitoring (in-flight, ringing, completed, failed).
  - Stop/pause batch campaign execution.

### Phase 4: Hotel Management & Custom Prompt Tuning
- **Goal**: Override or customize hotel knowledge, prompts, or special instructions per hotel.
- **Backend Requirements**:
  - Clean `hotel_controller.py` allowing hotel manager custom rules stored exclusively in `voice_calling_app_db`.

---

## 3. Database Rules of Engagement

1. **Source DB (`staychat_clone_db`)**: STRICTLY READ-ONLY. Never insert, update, or delete.
2. **App DB (`voice_calling_app_db`)**: READ/WRITE. All call sessions, recordings, transcripts, batch jobs, and local settings are stored here.
