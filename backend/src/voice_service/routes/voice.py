from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, Response
from ..services.plivo_agent_service import PlivoAgentService, CAMPAIGNS
from ..config import Config
from ..services.sheets_service import SheetsService
from ..services import mongo_service
from ..models.call_log import make_call_log

voice_bp = Blueprint("voice", __name__)
plivo_agent_service = PlivoAgentService()
sheets_service = SheetsService()

# Seed default campaigns into MongoDB on first boot (non-blocking)
try:
    mongo_service.seed_default_campaigns(CAMPAIGNS)
except Exception as _e:
    print(f"[voice] Could not seed campaigns: {_e}")


# ---------------------------------------------------------------------------
# Outbound call
# ---------------------------------------------------------------------------

@voice_bp.post("/api/v1/voice/call")
def outbound_call():
    data = request.get_json(silent=True)

    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    to_number = data.get("to_number")
    customer_name = data.get("customer_name") or data.get("name") or ""
    campaign_id = data.get("campaign_id")

    if not to_number:
        return jsonify({"error": "to_number is required"}), 400

    if not campaign_id:
        return jsonify({"error": "campaign_id is required"}), 400

    # Prefer MongoDB campaigns, fall back to in-memory CAMPAIGNS dict
    campaign = mongo_service.get_campaign(campaign_id) or CAMPAIGNS.get(campaign_id)
    if not campaign:
        return jsonify({"error": "Campaign not found"}), 404

    try:
        result = plivo_agent_service.make_call(
            to_number=to_number,
            campaign_id=campaign_id,
            customer_name=customer_name,
        )

        # Persist initiation record to MongoDB
        log = make_call_log(
            call_uuid=result.get("call_uuid") or result.get("request_uuid"),
            customer_name=customer_name,
            phone_number=to_number,
            direction="outbound",
            call_status="initiated",
            campaign_id=campaign_id,
        )
        mongo_service.save_call_log(log)

        return jsonify(result), 200

    except Exception as exc:
        return (
            jsonify({"error": "Failed to initiate call", "details": str(exc)}),
            500,
        )


# ---------------------------------------------------------------------------
# Plivo AI recording / completion webhook
# ---------------------------------------------------------------------------

@voice_bp.post("/api/v1/voice/events/recording")
def recording_event():
    payload = request.get_json(silent=True) or {}

    event = payload.get("data", {}).get("object", {})
    event_data = event.get("event_data", {})

    # Log the raw event_data keys so we can see exactly what Plivo sends
    print(f"[recording_event] event_data keys: {list(event_data.keys())}")
    print(f"[recording_event] transcription type: {type(event_data.get('transcription')).__name__}")
    print(f"[recording_event] transcription raw: {str(event_data.get('transcription', ''))[:500]}")

    # Plivo CX sends transcription as a list of {role, content} dicts OR a plain string
    transcription_raw = event_data.get("transcription") or event_data.get("transcript") or ""
    summary = event_data.get("conversation_summary") or event_data.get("summary") or ""
    variables = event_data.get("variables", {}) or {}

    call_outcome = variables.get("call_outcome")
    blocker = variables.get("blocker")
    travel_dates = variables.get("travel_dates")
    nights = variables.get("nights")
    guests = variables.get("guests")
    budget_stated = variables.get("budget_stated")
    callback_datetime = variables.get("callback_datetime")
    competitor_named = variables.get("competitor_named")
    verbatim_reason = variables.get("verbatim_reason")
    human_followup_needed = variables.get("human_followup_needed")

    call_uuid = event.get("call_uuid")
    duration = event_data.get("recording_duration")
    campaign_id = (
        variables.get("campaign_id")
        or payload.get("data", {}).get("object", {}).get("campaign_id")
    )

    customer_name = (
        variables.get("customer_name")
        or event.get("customer_name")
        or payload.get("data", {}).get("object", {}).get("customer_name")
        or event.get("caller_name")
        or ""
    )
    phone_number = (
        event.get("to")
        or event.get("from")
        or event.get("customer_number")
        or payload.get("data", {}).get("object", {}).get("to")
        or ""
    )

    print("\n" + "=" * 60)
    print("📞 CALL COMPLETED")
    print("=" * 60)
    print(f"Call UUID     : {call_uuid}")
    print(f"Customer Name : {customer_name or 'N/A'}")
    print(f"Phone Number  : {phone_number or 'N/A'}")
    print(f"Duration      : {duration} seconds")
    print("\n📊 CAMPAIGN RESULTS")
    print("-" * 60)
    print(f"Call Outcome           : {call_outcome}")
    print(f"Blocker                : {blocker}")
    print(f"Travel Dates           : {travel_dates}")
    print(f"Nights                 : {nights}")
    print(f"Guests                 : {guests}")
    print(f"Budget Stated          : {budget_stated}")
    print(f"Callback Date/Time     : {callback_datetime}")
    print(f"Competitor Named       : {competitor_named}")
    print(f"Verbatim Reason        : {verbatim_reason}")
    print(f"Human Follow-up Needed : {human_followup_needed}")
    print("\n📋 SUMMARY")
    print("-" * 60)
    print(summary)

    timestamp = datetime.now(timezone.utc).isoformat()

    # ---- Save to MongoDB (primary store) ----
    log = make_call_log(
        call_uuid=call_uuid,
        customer_name=customer_name,
        phone_number=phone_number,
        direction="outbound",
        duration=duration,
        call_status="completed",
        campaign_id=campaign_id,
        call_outcome=call_outcome,
        blocker=blocker,
        travel_dates=travel_dates,
        nights=nights,
        guests=guests,
        budget_stated=budget_stated,
        callback_datetime=callback_datetime,
        competitor_named=competitor_named,
        verbatim_reason=verbatim_reason,
        human_followup_needed=human_followup_needed,
        summary=summary,
        transcription=transcription_raw,
        raw_event_payload=payload,
        timestamp=timestamp,
    )
    saved = mongo_service.save_call_log(log)
    if saved:
        print("✅ Call data saved to MongoDB")
    else:
        print("⚠️  MongoDB save failed, will try Google Sheets only")

    # ---- Save to Google Sheets (secondary / backup store) ----
    print("\n📊 SAVING TO GOOGLE SHEETS...")
    print("-" * 60)
    try:
        sheets_service.append_call(
            {
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "call_uuid": call_uuid,
                "customer_name": customer_name,
                "phone_number": phone_number,
                "duration": f"{duration}s" if duration else "",
                "call_outcome": call_outcome or "",
                "blocker": blocker or "",
                "travel_dates": travel_dates or "",
                "nights": nights or "",
                "guests": guests or "",
                "budget_stated": budget_stated or "",
                "callback_datetime": callback_datetime or "",
                "competitor_named": competitor_named or "",
                "verbatim_reason": verbatim_reason or "",
                "human_followup_needed": human_followup_needed if human_followup_needed is not None else "",
                "summary": summary or "",
                "transcription": transcription_raw,
            }
        )
        print("✅ Call data saved to Google Sheets")
    except Exception as exc:
        print(f"❌ Google Sheets error: {exc}")

    print("=" * 60 + "\n")

    return jsonify({"message": "Recording event received"}), 200


# ---------------------------------------------------------------------------
# Call Logs — GET and POST
# ---------------------------------------------------------------------------

@voice_bp.get("/api/v1/voice/calls")
def list_calls():
    limit = min(request.args.get("limit", 50, type=int), 50)
    outcome = request.args.get("outcome") or None
    search = request.args.get("search") or None

    # Primary: MongoDB
    mongo_logs = mongo_service.get_call_logs(limit=limit, outcome=outcome, search=search)

    if mongo_logs:
        # Enrich with recording URLs and CDR duration from Plivo (best-effort, non-blocking)
        try:
            recordings = plivo_agent_service.get_recordings_map(limit=50)
            
            # Fetch CDR map if any call has duration 0 or "0" or None
            needs_duration = any(not log.get("duration") or str(log.get("duration")) == "0" for log in mongo_logs)
            cdr_map = {}
            if needs_duration:
                try:
                    cdr_calls = plivo_agent_service.get_calls(limit=50)
                    for c in cdr_calls:
                        c_uuid = c.get("call_uuid")
                        if c_uuid:
                            cdr_map[c_uuid] = c
                except Exception:
                    pass

            for log in mongo_logs:
                uuid = log.get("call_uuid")
                if not uuid:
                    continue

                updates = {}
                # 1. Recording URL
                if not log.get("recording_url"):
                    rec_url = recordings.get(uuid)
                    if rec_url:
                        log["recording_url"] = rec_url
                        updates["recording_url"] = rec_url

                # 2. Duration if missing or 0
                curr_dur = str(log.get("duration") or "0")
                if curr_dur == "0" and uuid in cdr_map:
                    cdr_item = cdr_map[uuid]
                    real_dur = cdr_item.get("duration")
                    if real_dur and str(real_dur) != "0":
                        log["duration"] = real_dur
                        updates["duration"] = real_dur
                    if cdr_item.get("call_status") and log.get("call_status") == "initiated":
                        log["call_status"] = cdr_item.get("call_status")
                        updates["call_status"] = cdr_item.get("call_status")

                if updates:
                    updates["call_uuid"] = uuid
                    mongo_service.save_call_log(updates)
        except Exception as e:
            print(f"[list_calls] Enrichment error: {e}")
        return jsonify(mongo_logs), 200

    # Fallback: Plivo CDR (capped at 20 — SDK hard limit) + Google Sheets enrichment
    cdr_limit = min(limit, 20)
    cdr_calls = plivo_agent_service.get_calls(limit=cdr_limit)
    sheets_data = sheets_service.read_all_calls()

    merged = []
    for c in cdr_calls:
        uuid = c.get("call_uuid")
        sheet_info = sheets_data.get(uuid, {})
        merged.append({
            "call_uuid": uuid,
            "timestamp": sheet_info.get("timestamp") or c.get("timestamp"),
            "customer_name": sheet_info.get("customer_name") or "",
            "phone_number": c.get("to_number") or c.get("from_number") or sheet_info.get("phone_number") or "",
            "direction": c.get("direction") or "outbound",
            "duration": c.get("duration") or sheet_info.get("duration") or "0",
            "call_status": c.get("call_status") or "completed",
            "call_outcome": sheet_info.get("call_outcome") or "completed",
            "blocker": sheet_info.get("blocker") or "none",
            "travel_dates": sheet_info.get("travel_dates") or "",
            "nights": sheet_info.get("nights") or "",
            "guests": sheet_info.get("guests") or "",
            "budget_stated": sheet_info.get("budget_stated"),
            "callback_datetime": sheet_info.get("callback_datetime"),
            "competitor_named": sheet_info.get("competitor_named"),
            "verbatim_reason": sheet_info.get("verbatim_reason") or "",
            "human_followup_needed": sheet_info.get("human_followup_needed") or "No",
            "summary": sheet_info.get("summary") or "",
            "transcription": sheet_info.get("transcription") or "",
        })

    return jsonify(merged), 200


@voice_bp.post("/api/v1/voice/calls")
def create_call_log():
    """Manually insert a call log record (useful for testing or external integrations)."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    log = make_call_log(**{k: v for k, v in data.items() if k in make_call_log.__code__.co_varnames})
    # Allow raw dict passthrough for fields not in make_call_log signature
    log.update({k: v for k, v in data.items() if k not in log})
    saved = mongo_service.save_call_log(log)
    if saved:
        return jsonify(saved), 201
    return jsonify({"error": "Failed to save call log"}), 500


# ---------------------------------------------------------------------------
# Campaigns — GET and POST
# ---------------------------------------------------------------------------

@voice_bp.get("/api/v1/voice/campaigns")
def list_campaigns():
    # Primary: MongoDB
    mongo_campaigns = mongo_service.get_campaigns()
    if mongo_campaigns:
        # Convert list to dict keyed by id for frontend compatibility
        return jsonify({c["id"]: c for c in mongo_campaigns}), 200
    # Fallback: in-memory
    return jsonify(CAMPAIGNS), 200


@voice_bp.get("/api/v1/voice/campaigns/<campaign_id>")
def get_campaign(campaign_id):
    campaign = mongo_service.get_campaign(campaign_id) or CAMPAIGNS.get(campaign_id)
    if not campaign:
        return jsonify({"error": "Campaign not found"}), 404
    return jsonify(campaign), 200


@voice_bp.post("/api/v1/voice/campaigns")
def create_campaign():
    data = request.get_json(silent=True)
    if not data or not data.get("id") or not data.get("name"):
        return jsonify({"error": "id and name are required"}), 400

    data.setdefault("hotel_name", data.get("name"))
    data.setdefault("city", "")
    data.setdefault("landmark", "")
    data.setdefault("is_active", True)

    saved = mongo_service.save_campaign(data)
    if saved:
        return jsonify(saved), 201
    return jsonify({"error": "Failed to save campaign"}), 500


@voice_bp.put("/api/v1/voice/campaigns/<campaign_id>")
def update_campaign(campaign_id):
    """Update campaign configuration, instructions, and forwarding number in MongoDB."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    existing = mongo_service.get_campaign(campaign_id) or CAMPAIGNS.get(campaign_id) or {}
    updated = {**existing, **data, "id": campaign_id}
    saved = mongo_service.save_campaign(updated)
    if saved:
        return jsonify(saved), 200
    return jsonify({"error": "Failed to update campaign"}), 500


# ---------------------------------------------------------------------------
# Plivo XML webhook handlers (inbound call flow)
# ---------------------------------------------------------------------------

@voice_bp.route("/api/v1/voice/answer", methods=["GET", "POST"])
def answer_call():
    xml_response = f"""
    <Response>
        <GetInput
            inputType="speech"
            action="{Config.PUBLIC_BASE_URL}/api/v1/voice/input"
            method="POST"
            speechEndTimeout="2"
        >
            <Speak>Namaste, welcome to Hotel Sahu Varanasi. How may I assist you today?</Speak>
        </GetInput>
    </Response>
    """
    return Response(xml_response, mimetype="application/xml")


@voice_bp.route("/api/v1/voice/input", methods=["POST"])
def voice_input():
    speech = request.form.get("Speech", "").strip().lower()
    print("Caller said:", speech)

    end_phrases = ["bye", "goodbye", "end call", "hang up", "stop"]
    if any(phrase in speech for phrase in end_phrases):
        return Response(
            """
            <Response>
                <Speak>Thank you for calling Hotel Sahu Varanasi. Have a wonderful day!</Speak>
                <Hangup/>
            </Response>
            """,
            mimetype="application/xml",
        )

    # Human staff forwarding keywords
    forward_phrases = ["human", "staff", "manager", "agent", "talk to someone", "person", "reception", "desk", "angry", "complaint", "speak to someone"]
    if any(phrase in speech for phrase in forward_phrases):
        # Fetch staff forwarding number from campaign
        campaign = mongo_service.get_campaign("booking-follow-up") or CAMPAIGNS.get("booking-follow-up", {})
        staff_number = campaign.get("forwarding_number") or "+9198544953527"
        print(f"[voice_input] Forwarding call to human staff at {staff_number}")
        return Response(
            f"""
            <Response>
                <Speak>Connecting you directly to our front desk staff at Hotel Sahu. Please stay on the line.</Speak>
                <Dial>
                    <Number>{staff_number}</Number>
                </Dial>
            </Response>
            """,
            mimetype="application/xml",
        )

    return Response(
        f"""
        <Response>
            <GetInput
                inputType="speech"
                action="{Config.PUBLIC_BASE_URL}/api/v1/voice/input"
                method="POST"
                speechEndTimeout="2"
            >
                <Speak>I understand. How else can Hotel Sahu assist you?</Speak>
            </GetInput>
        </Response>
        """,
        mimetype="application/xml",
    )
