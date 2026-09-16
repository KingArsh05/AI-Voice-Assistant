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

    try:
        result = call_service.make_call(validated_data)
        print("\n[CX Flow Initiated]:", json.dumps(result, indent=4), "\n")
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


@voice_bp.route("/calls", methods=["GET"])
def get_calls():
    """Retrieve call records from MongoDB sorted by most recent."""
    try:
        # Retroactively parse raw webhook logs if any records have missing fields
        call_service.backfill_existing_calls()

        raw_calls = list(call_service.db.calls.find().sort("created_at", -1).limit(50))
        calls = []
        for c in raw_calls:
            call_dict = dict(c)
            if "_id" in call_dict:
                call_dict["id"] = str(call_dict["_id"])
                call_dict["_id"] = str(call_dict["_id"])
            if "created_at" in call_dict and hasattr(call_dict["created_at"], "isoformat"):
                call_dict["created_at"] = call_dict["created_at"].isoformat()
            calls.append(call_dict)
        return jsonify({"success": True, "data": calls}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
