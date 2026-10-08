import json
import logging
from flask import Blueprint, request, jsonify
from pydantic import ValidationError
from bson.json_util import dumps

from src.models.plivo_call_model import OutboundCallRequest, BulkCallRequest
from src.services.plivo_service import PlivoVoiceService

logger = logging.getLogger(__name__)

voice_bp = Blueprint("voice", __name__)
plivo_service = PlivoVoiceService()


@voice_bp.route("/call", methods=["POST"])
def initiate_call():
    """
    POST /api/v1/voice/call
    Supports 'dry_run': true for ₹0 Postman testing!
    """
    try:
        validated_data = OutboundCallRequest(**(request.json or {}))
    except ValidationError as err:
        return jsonify({"success": False, "errors": err.errors()}), 422

    try:
        result = plivo_service.make_single_call(validated_data)
        return jsonify({"success": True, "data": result}), 201
    except ValueError as ve:
        return jsonify({"success": False, "message": str(ve)}), 400
    except Exception as e:
        logger.exception("Error initiating call: %s", e)
        return jsonify({"success": False, "message": str(e)}), 500


@voice_bp.route("/batch", methods=["POST"])
def initiate_bulk_calls():
    """
    POST /api/v1/voice/batch
    Asynchronously queues a bulk list of outbound calls.
    Returns HTTP 202 Accepted immediately with batch_id.
    """
    data = request.get_json() or {}

    try:
        validated_data = BulkCallRequest(**data)
    except ValidationError as err:
        return jsonify({"success": False, "errors": err.errors()}), 422

    try:
        result = plivo_service.enqueue_bulk_calls(validated_data)
        return jsonify({"success": True, "data": result}), 202
    except Exception as e:
        logger.exception("Error enqueueing bulk calls: %s", e)
        return jsonify({"success": False, "message": str(e)}), 500


@voice_bp.route("/batch/<batch_id>", methods=["GET"])
def get_batch_status(batch_id: str):
    """
    GET /api/v1/voice/batch/<batch_id>
    Fetches real-time status and progress of a queued bulk call batch.
    """
    try:
        job = plivo_service.get_batch_status(batch_id)
        if not job:
            return jsonify({"success": False, "message": "Batch job not found"}), 404
        return jsonify({"success": True, "data": job}), 200
    except Exception as e:
        logger.exception("Error fetching batch status: %s", e)
        return jsonify({"success": False, "message": str(e)}), 500

@voice_bp.route("/batch/<batch_id>/pause", methods=["POST"])
def pause_batch(batch_id: str):
    result = plivo_service.queue_service.pause_batch(batch_id)
    return jsonify(result), 200

@voice_bp.route("/batch/<batch_id>/resume", methods=["POST"])
def resume_batch(batch_id: str):
    result = plivo_service.queue_service.resume_batch(batch_id)
    return jsonify(result), 200

@voice_bp.route("/batch/<batch_id>/stop", methods=["POST"])
def stop_batch(batch_id: str):
    result = plivo_service.queue_service.stop_batch(batch_id)
    return jsonify(result), 200


@voice_bp.route("/events/hangup", methods=["POST"])
def handle_hangup():
    """Webhook triggered by Plivo when the call ends."""
    data = request.get_json(silent=True) or request.form.to_dict() or {}
    try:
        plivo_service.handle_hangup_event(data)
    except Exception as e:
        logger.exception("Error handling hangup event: %s", e)
    return jsonify({"status": "received"}), 200


@voice_bp.route("/events/recording", methods=["POST"])
def handle_recording():
    """Webhook triggered by Plivo when audio recording and transcription are ready."""
    data = request.get_json(silent=True) or request.form.to_dict() or {}
    try:
        plivo_service.handle_recording_event(data)
    except Exception as e:
        logger.exception("Error handling recording event: %s", e)
    return jsonify({"status": "received"}), 200


@voice_bp.route("/hotels", methods=["GET"])
def list_hotels():
    """GET /api/v1/voice/hotels - For your frontend select menu."""
    try:
        hotels = plivo_service.list_all_available_hotels()
        return jsonify({"success": True, "data": hotels}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@voice_bp.route("/calls", methods=["GET"])
def list_calls():
    """GET /api/v1/voice/calls?limit=50&skip=0&status=completed"""
    try:
        limit = int(request.args.get("limit", 50))
        skip = int(request.args.get("skip", 0))
        status = request.args.get("status")
        hotel_id = request.args.get("hotel_id")

        result = plivo_service.get_calls(
            limit=limit, skip=skip, status=status, hotel_id=hotel_id
        )
        return jsonify({"success": True, "data": result}), 200
    except Exception as e:
        logger.exception("Error fetching calls: %s", e)
        return jsonify({"success": False, "message": str(e)}), 500


@voice_bp.route("/calls/<call_id>", methods=["GET"])
def get_call_details(call_id: str):
    """GET /api/v1/voice/calls/<call_id>"""
    try:
        call = plivo_service.get_call_by_id(call_id)
        if not call:
            return jsonify({"success": False, "message": "Call not found"}), 404
        return jsonify({"success": True, "data": call}), 200
    except Exception as e:
        logger.exception("Error fetching call details: %s", e)
        return jsonify({"success": False, "message": str(e)}), 500


@voice_bp.route("/recordings/<recording_id>.mp3", methods=["GET"])
def stream_recording(recording_id: str):
    """
    GET /api/v1/voice/recordings/<recording_id>.mp3
    Streams audio securely using server-side Plivo authentication.
    Does NOT expose Plivo Auth ID or token to clients.
    """
    try:
        audio_bytes = plivo_service.fetch_recording_audio(recording_id)
        if not audio_bytes:
            return jsonify({"error": "Recording not found"}), 404

        from flask import Response

        return Response(
            audio_bytes,
            mimetype="audio/mpeg",
            headers={
                "Content-Disposition": f"inline; filename={recording_id}.mp3",
                "Cache-Control": "public, max-age=86400",
            },
        )
    except Exception as e:
        logger.exception("Error streaming recording: %s", e)
        return jsonify({"error": "Failed to stream audio"}), 500

@voice_bp.route("/crm",methods=["GET"])
def get_crm_data():
    try:
        limit = int(request.args.get("limit", 50))
        skip = int(request.args.get("skip", 0))
        primary_intent = request.args.get("primary_intent")
        hotel_id = request.args.get("hotel_id")

        result = plivo_service.get_crm_data(
            limit=limit, skip=skip, primary_intent=primary_intent, hotel_id=hotel_id
        )
        return jsonify({"success": True, "data": result}), 200
    except Exception as e:
        logger.exception("Error fetching crm data: %s", e)
        return jsonify({"success": False, "message": str(e)}), 500
    