import json
from flask import Blueprint, request, jsonify, Response
from pydantic import ValidationError

from src.config import Config
from src.models.call_model import InitiateCallRequest
from src.services.call_service import CallService

voice_bp = Blueprint("voice", __name__)
call_service = CallService()


@voice_bp.route("/call", methods=["POST"])
def initiate_call():
    try:
        validated_data = InitiateCallRequest(**(request.json or {}))
    except ValidationError as err:
        return jsonify({"success": False, "errors": err.errors()}), 422

    base_url = Config.PUBLIC_SERVER_URL or request.host_url.rstrip("/")
    answer_url = f"{base_url}/api/v1/voice/answer"

    try:
        result = call_service.make_call(validated_data, answer_url)

        print("\n\n", json.dumps(result, indent=4), "\n\n")

        return jsonify({"success": True, "data": result}), 201
    except Exception as e:
        import traceback

        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500


@voice_bp.route("/events/hangup", methods=["POST"])
def handle_hangup():
    """Triggered by Plivo when the call ends."""
    data = request.get_json(silent=True) or request.form.to_dict() or {}
    print(f"\n[Plivo Hangup Event]: {json.dumps(data, indent=2)}\n")
    
    try:
        call_service.handle_hangup_event(data)
    except Exception as e:
        print(f"Error handling hangup event: {e}")
        
    return jsonify({"status": "received"}), 200


@voice_bp.route("/events/recording", methods=["POST"])
def handle_recording():
    """Triggered by Plivo when audio recording and transcription are ready."""
    data = request.get_json(silent=True) or request.form.to_dict() or {}
    print(f"\n[Plivo Recording Event]: {json.dumps(data, indent=2)}\n")
    
    try:
        call_service.handle_recording_event(data)
    except Exception as e:
        print(f"Error handling recording event: {e}")
        
    return jsonify({"status": "received"}), 200


@voice_bp.route("/events/error", methods=["POST"])
def handle_error():
    """Triggered by Plivo if the agent flow encounters an error."""
    data = request.get_json(silent=True) or request.form.to_dict() or {}
    print(f"\n[Plivo Error Event]: {json.dumps(data, indent=2)}\n")
    
    call_uuid = data.get("CallUUID") or data.get("request_uuid")
    if call_uuid:
        call_service.db.calls.update_one(
            {"request_uuid": call_uuid},
            {"$set": {"status": "failed", "error": data}}
        )
        
    return jsonify({"status": "received"}), 200
