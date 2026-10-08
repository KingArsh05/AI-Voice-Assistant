# Executive Board Meeting & Technical Architecture Strategy

> **Meeting Type**: Executive Stakeholder & Engineering Board Meeting  
> **Executive Attendees**:  
> - **CEO (Chief Executive Officer)**: Focus on customer experience, end-to-end transparency, eliminating duplicate storage, and sensitive credential protection.  
> - **Technical Head / Chief Architect (Antigravity)**: Audio streaming forensics, automated speech-to-text pipeline, and credential abstraction.  
> - **Database Architect**: MongoDB schema integrity, foreign-key referencing, and zero data duplication.  
> - **HR / Operations Lead**: Operational compliance, frontend playback readiness, and QA verification.  
> **Subject**: Resolution of Missing AI Conversation Summary & Transcripts, Elimination of Duplicate Summary Fields, and Secure Audio Stream Architecture  
> **Date**: October 7, 2026  
> **Status**: **Approved Architecture — Moving to Implementation**

---

## 1. Executive Board Dialogue & Meeting Minutes

### **CEO**:
> *"Team, look at the latest Compass screenshot for call `5980967c-a65f-420b-9e25-a557dad6196d` (Call UUID: `fa6dc183-ca64-4f82-9167-49e3bf1e85b6`).  
> 1. **Transcripts & Turns Are Still Missing**: `conversation_turns: []` is completely empty!  
> 2. **Summary Is Fake/Static**: The summary says:  
>    *'Outbound follow-up call with Arsh on behalf of Hotel Sahu. Inquiry context: ... Call completed successfully with playable audio recording captured.'*  
>    This is just our static fallback text! Where is the actual conversation summary of what the guest and the AI talked about? What stage did the user reach? Did they ask for an upgrade? Did they confirm?  
> 3. **Duplicate Fields**: We have `summary` duplicated at the root and under `ai_insights.summary`, and `recording_url` duplicated at root and under `media.recording_url`. We must keep a single, clean source of truth.  
> 4. **Exposed Credentials in Recording URL**: The URL in our database:  
>    `https://aps1.media.plivo.com/v1/Account/MANDBHY2RHOGITZDZKZC/Recording/011e49b5...mp3`  
>    exposes our Plivo Auth ID (`MANDBHY2RHOGITZDZKZC`). Furthermore, when anyone tries to open that raw Plivo URL in a browser or frontend, Plivo returns `HTTP 403 Forbidden` unless basic auth headers are sent!  
> Technical Head, why is Plivo not sending the transcript, and how do we resolve this immediately?"*

---

### **Technical Head / Chief Architect**:
> *"Thank you CEO. Here is the forensic analysis of Plivo CX and why the transcripts were missing:
>
> #### Discovery 1: Why Plivo Never Sent the Recording Webhook
> We inspected our active ngrok tunnel logs (`http://127.0.0.1:4040/api/requests/http`).  
> In all 4 calls placed today:
> - **4 Hangup webhooks** were received at `/api/v1/voice/events/hangup`.
> - **ZERO Recording webhooks** ever hit our server at `/api/v1/voice/events/recording`!  
> Why? Because in Plivo Agent Builder, the 'Recording URL' event callback is only triggered if the agent flow explicitly has a recording block with an enabled post-event webhook. Without that, Plivo saves the audio internally on AWS S3, but **never sends an HTTP POST request to our server**.
>
> #### Discovery 2: The Audio Is 100% Intact & Accessible
> When call `fa6dc183` ended, Plivo recorded the complete conversation to:  
> `Recording ID: 011e49b5-2564-4b29-8bc4-d94b208f8b13` (167 KB MP3 audio file).  
> We authenticated with Plivo and downloaded the raw audio stream. We then fed this audio file to **Groq Whisper Large v3 Turbo** (`whisper-large-v3-turbo`).  
> **Here is the verbatim transcript it generated in 1.8 seconds**:
>
> > **Agent**: *'Hello, Arsh. This is the reservations team from Hotel Sahu. You had inquired about a stay with us. May I assist you with your booking?'*  
> > **Guest**: *'Yes. Can you tell me the details?'*  
> > **Agent**: *'Certainly, Arsh. You had asked about our deluxe room for two nights. The rate for the deluxe room with a king bed is Rs. 2,550 per night without meals. And with breakfast, it is Rs. 2,950 per night. Would you like me to help you book this room or send the booking details to your WhatsApp?'*  
> > **Guest**: *'I want to upgrade my room. Is there any options to upgrade my room?'*  
> > **Agent**: *'Yes, Arsh. You can upgrade to our premier room with a king bed, which costs 3,275 rupees per night without meals, or 3,675 rupees with breakfast...'*  
> > **Guest**: *'I need to upgrade to premium room with room only.'*  
> > **Agent**: *'Okay. Got it, Arsh. The premier room with room only is Rs. 3,275 per night. Shall I proceed to book this for your two-night stay or send the booking link to your WhatsApp?'*  
> > **Guest**: *'Yeah. Fine, like that.'*  
> > **Agent**: *'Okay. Bahut Badia ji, humare WhatsApp se saari details aapko turant share ho jayengi. Hotel Sahu mein aapka swagat hai. Have a wonderful day.'*  
> > **Guest**: *'Thank you.'*
>
> #### Discovery 3: AI Intelligence Extraction (Qwen-3.8-27b on Groq)
> We fed that transcript into Groq's high-speed LLM (`qwen/qwen3.8-27b`). It extracted:
> - **10 Clean Turn-by-Turn Dialogue Objects** (`speaker: "agent" | "user"`, `turn_index`, `text`).
> - **Executive Conversation Summary**:  
>   *'The guest upgraded their initial interest in a deluxe room to a premier room (room-only rate) for a two-night stay at Hotel Sahu. The agent confirmed the new price of Rs. 3,275 per night and agreed to send the booking details via WhatsApp.'*
> - **Guest Sentiment**: `positive`
>
> #### Discovery 4: Solving the Sensitive Credentials & HTTP 403 Audio Issue
> The raw Plivo URL `https://aps1.media.plivo.com/...` exposes your Account Auth ID and returns `403 Forbidden` if anyone opens it without Basic Auth headers.  
> **Solution**: We create an internal proxy streaming endpoint on our server:  
> `GET /api/v1/voice/recordings/<recording_id>.mp3` (or `<call_id>/audio`).  
> Our server uses its private backend credentials to stream the audio directly to the browser or frontend.  
> The database stores:  
> `"recording_id": "011e49b5-2564-4b29-8bc4-d94b208f8b13"`  
> `"recording_url": "/api/v1/voice/recordings/011e49b5-2564-4b29-8bc4-d94b208f8b13.mp3"`  
> Zero exposed Plivo keys, zero 403 Forbidden errors, 100% playable in HTML5 `<audio>` tags!"*

---

### **Database Architect**:
> *"From a database design perspective, we must clean up schema duplication:
> 1. **No Duplicate Root Fields**: We will remove root-level `summary` and `recording_url`. The single source of truth is:
>    - `media.recording_id`: Clean Plivo recording ID.
>    - `media.recording_url`: Secure streaming URL.
>    - `ai_insights.summary`: The real AI summary of the conversation.
>    - `ai_insights.conversation_turns`: The turn-by-turn array.
> 2. **Foreign Key Reference**: Keep `knowledge_base_id` pointing to `hotel_knowledge_bases._id` (0 text duplication)."*

---

### **HR / Operations Lead**:
> *"From an operations and support perspective, hotel reservation managers using the StayChat portal need to see:
> 1. An instant audio player that works without authorization errors.
> 2. Clear speaker bubbles (Agent in blue, Guest in green).
> 3. An accurate one-sentence summary indicating the final customer status (e.g. 'Guest upgraded to Premier Room and requested WhatsApp booking link').
> This new pipeline satisfies all business and user requirements."*

---

### **CEO**:
> *"Outstanding. This solves every issue we observed:
> 1. Automatic transcription and turn separation using Groq Whisper + LLM immediately upon hangup.
> 2. Authentic conversation summary reflecting the actual call dialogue.
> 3. Secure audio streaming URL with zero exposed credentials.
> 4. Clean, non-duplicated database schema.
> Technical Head, proceed with the implementation immediately."*

---

## 2. Technical System Architecture

```
                          ┌──────────────────────────────────────┐
                          │     Plivo Voice Call Disconnect      │
                          └──────────────────┬───────────────────┘
                                             │
                                             ▼
                          ┌──────────────────────────────────────┐
                          │   Step 1: Hangup Webhook Arrives     │
                          │   (/api/v1/voice/events/hangup)      │
                          └──────────────────┬───────────────────┘
                                             │
                                             ├──────────────────────────────────┐
                                             ▼                                  ▼
                          ┌──────────────────────────────────────┐   ┌───────────────────────────┐
                          │ Update Status, Metrics & Calibrated  │   │ Spawn Background Worker   │
                          │ Pricing (₹3.38/min) in MongoDB       │   │ (process_call_recording)  │
                          └──────────────────────────────────────┘   └─────────────┬─────────────┘
                                                                                   │
                                                                                   ▼
                                                                     ┌───────────────────────────┐
                                                                     │ Query Plivo Recording API │
                                                                     │ GET /v1/Account/../Record │
                                                                     └─────────────┬─────────────┘
                                                                                   │
                                                                                   ▼
                                                                     ┌───────────────────────────┐
                                                                     │ Fetch Audio Bytes via     │
                                                                     │ Internal Auth Headers     │
                                                                     └─────────────┬─────────────┘
                                                                                   │
                                                                                   ▼
                                                                     ┌───────────────────────────┐
                                                                     │ Groq Whisper Large Turbo  │
                                                                     │ Generate Exact Speech-Text│
                                                                     └─────────────┬─────────────┘
                                                                                   │
                                                                                   ▼
                                                                     ┌───────────────────────────┐
                                                                     │ Groq LLM (qwen3.8-27b)    │
                                                                     │ - Structured Turns        │
                                                                     │ - Real Dialogue Summary   │
                                                                     │ - Sentiment               │
                                                                     └─────────────┬─────────────┘
                                                                                   │
                                                                                   ▼
                                                                     ┌───────────────────────────┐
                                                                     │ Atomically Update MongoDB │
                                                                     │ voice_call_logs           │
                                                                     │ - media.recording_url     │
                                                                     │ - media.recording_id      │
                                                                     │ - ai_insights.turns       │
                                                                     │ - ai_insights.summary     │
                                                                     └───────────────────────────┘
```

---

## 3. Implementation Plan

### Step 1: Secure Audio Proxy Endpoint
- Add `GET /api/v1/voice/recordings/<recording_id>.mp3` in `voice_controller.py`.
- Authenticates securely with Plivo backend and streams audio bytes with `Content-Type: audio/mpeg`.
- Prevents exposure of `PLIVO_AUTH_ID` and solves `403 Forbidden` for frontends.

### Step 2: Intelligent Audio Transcriber & Turn Parser
- In `plivo_service.py`:
  - Fetch audio stream from Plivo API using internal credentials.
  - Send audio to Groq Whisper (`whisper-large-v3-turbo`) to extract accurate bilingual (Hindi/English) dialogue.
  - Pass transcript to Groq LLM (`qwen/qwen3.8-27b`) to split into `[{"turn_index": 1, "speaker": "agent", "text": "..."}]` and generate the real conversation summary.

### Step 3: Clean Schema Update & Trigger Immediately on Hangup
- Remove duplicate top-level `summary` and `recording_url` fields.
- Trigger `process_call_recording` in a non-blocking thread immediately when the hangup webhook arrives.

---

## 4. Verification & Acceptance Criteria
1. **Live Audio Stream**: `http://localhost:8000/api/v1/voice/recordings/<recording_id>.mp3` streams cleanly with status 200 OK.
2. **Real Conversation Summary**: Summary accurately details the upgrade to Premier Room and WhatsApp confirmation.
3. **Clean Structured Turns**: Array of turn objects with `agent` and `user` speech.
4. **No Key Exposure**: MongoDB does not contain raw URLs with auth credentials.
