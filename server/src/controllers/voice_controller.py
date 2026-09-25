import json
import logging
from flask import Blueprint, request, jsonify
from pydantic import ValidationError

from src.config import Config
from src.models.call_model import InitiateCallRequest
from src.services.call_service import CallService

logger = logging.getLogger(__name__)

voice_bp = Blueprint("voice", __name__)
call_service = CallService()


@voice_bp.route("/call", methods=["POST"])
def initiate_call():
    try:
        validated_data = InitiateCallRequest(**(request.json or {}))
    except ValidationError as err:
        return jsonify({"success": False, "errors": err.errors()}), 422

    print("\n" + "="*50)
    print("📞 [CONTROLLER] /api/v1/voice/call triggered")
    print("Input Payload:", validated_data.model_dump_json(indent=2))
    print("="*50)

    try:
        result = call_service.make_call(validated_data)

        print("\n" + "="*50)
        print("✅ [CONTROLLER] make_call completed successfully")
        print("Trigger ID:", result.get("trigger_id"))
        print("Response:", json.dumps(result, indent=2, default=str))
        print("="*50 + "\n")

        return jsonify({"success": True, "data": result}), 201
    except ValueError as ve:
        logger.warning("Initiate call validation error: %s", ve)
        return jsonify({"success": False, "message": str(ve)}), 400
    except Exception as e:
        logger.exception("Error initiating call: %s", e)
        return jsonify({"success": False, "message": str(e)}), 500


@voice_bp.route("/events/hangup", methods=["POST"])
def handle_hangup():
    """Triggered by Plivo when the call ends."""
    data = request.get_json(silent=True) or request.form.to_dict() or {}
    try:
        call_service.handle_hangup_event(data)
    except Exception as e:
        logger.exception("Error handling hangup event: %s", e)
    return jsonify({"status": "received"}), 200


@voice_bp.route("/events/recording", methods=["POST"])
def handle_recording():
    """Triggered by Plivo when audio recording and transcription are ready."""
    data = request.get_json(silent=True) or request.form.to_dict() or {}
    try:
        call_service.handle_recording_event(data)
    except Exception as e:
        logger.exception("Error handling recording event: %s", e)
    return jsonify({"status": "received"}), 200


@voice_bp.route("/events/transcript", methods=["POST"])
def handle_transcript():
    """Triggered by Plivo CX AgentFlow HTTP Request node with conversation transcript and summary."""
    data = request.get_json(silent=True) or request.form.to_dict() or {}
    try:
        call_service.handle_transcript_event(data)
    except Exception as e:
        logger.exception("Error handling transcript event: %s", e)
    return jsonify({"status": "received"}), 200


@voice_bp.route("/events/error", methods=["POST"])
def handle_error():
    """Triggered by Plivo if the agent flow encounters an error."""
    data = request.get_json(silent=True) or request.form.to_dict() or {}
    logger.warning("Plivo error event received: %s", data)
    return jsonify({"status": "received"}), 200


@voice_bp.route("/calls", methods=["GET"])
def get_calls():
    """Retrieve call records from MongoDB sorted by most recent."""
    try:
        raw_calls = list(call_service.db.calls.find().sort("created_at", -1).limit(50))

        calls = []
        for c in raw_calls:
            call_dict = dict(c)
            if "_id" in call_dict:
                call_dict["id"] = str(call_dict["_id"])
                call_dict["_id"] = str(call_dict["_id"])
            if "created_at" in call_dict and hasattr(call_dict["created_at"], "isoformat"):
                call_dict["created_at"] = call_dict["created_at"].isoformat()

            # Normalize duration from recording or termination if top-level duration is 0
            if not call_dict.get("duration") or call_dict.get("duration") == 0:
                rec_sec = call_dict.get("recording", {}).get("duration_seconds") if isinstance(call_dict.get("recording"), dict) else 0
                term_sec = call_dict.get("termination", {}).get("duration_seconds") if isinstance(call_dict.get("termination"), dict) else 0
                flat_rec_sec = call_dict.get("recording_duration", 0)
                effective_duration = rec_sec or term_sec or flat_rec_sec or 0
                if effective_duration:
                    call_dict["duration"] = effective_duration

            # Backfill summary from raw_recording_data if not yet extracted
            if not call_dict.get("summary") and not (call_dict.get("ai") and call_dict["ai"].get("summary")):
                rec_obj = call_dict.get("raw_recording_data", {})
                if isinstance(rec_obj, dict):
                    ev_data = rec_obj.get("data", {}).get("object", {}).get("event_data", {}) if isinstance(rec_obj.get("data"), dict) else {}
                    found_summary = ev_data.get("conversation_summary") or ev_data.get("summary")
                    if found_summary:
                        call_dict["summary"] = found_summary
            # Normalize guest_name for UI
            call_dict["guest_name"] = call_dict.get("guest_name") or call_dict.get("username") or "Guest"
            call_dict.pop("username", None)

            calls.append(call_dict)

        return jsonify({"success": True, "data": calls})

    except Exception as e:
        logger.exception("Error retrieving calls: %s", e)
        return jsonify({"success": False, "message": str(e)}), 500
