import logging
from flask import Blueprint, jsonify, request
from src.services.hotel_service import HotelService

logger = logging.getLogger(__name__)

hotel_bp = Blueprint("hotel", __name__)
hotel_service = HotelService()


@hotel_bp.route("", methods=["GET"])
def list_hotels():
    """Returns list of hotels for configuration panel or dropdown selectors."""
    active_only = request.args.get("active_only", "false").lower() == "true"
    try:
        hotels = hotel_service.list_hotels(active_only=active_only)
        return jsonify({"success": True, "count": len(hotels), "data": hotels}), 200
    except Exception as e:
        logger.error("Error listing hotels: %s", e, exc_info=True)
        return jsonify({"success": False, "message": str(e)}), 500


@hotel_bp.route("/<hotel_id>", methods=["GET"])
def get_hotel(hotel_id: str):
    """Fetches complete hotel details by hotel_id."""
    try:
        hotel = hotel_service.get_hotel(hotel_id)
        if not hotel:
            return jsonify({"success": False, "message": "Hotel not found"}), 404
        return jsonify({"success": True, "data": hotel}), 200
    except Exception as e:
        logger.error("Error retrieving hotel %s: %s", hotel_id, e, exc_info=True)
        return jsonify({"success": False, "message": str(e)}), 500


@hotel_bp.route("", methods=["POST"])
def create_hotel():
    """Creates a new hotel configuration."""
    try:
        data = request.get_json() or {}
        if not data.get("name"):
            return jsonify({"success": False, "message": "Hotel name is required"}), 400
        if not data.get("contact", {}).get("address"):
            return jsonify({"success": False, "message": "Hotel address is required"}), 400

        created = hotel_service.create_hotel(data)
        return jsonify({"success": True, "message": "Hotel created successfully", "data": created}), 201
    except Exception as e:
        logger.error("Error creating hotel: %s", e, exc_info=True)
        return jsonify({"success": False, "message": str(e)}), 400


@hotel_bp.route("/<hotel_id>", methods=["PUT"])
def update_hotel(hotel_id: str):
    """Updates an existing hotel configuration."""
    try:
        data = request.get_json() or {}
        updated = hotel_service.update_hotel(hotel_id, data)
        if not updated:
            return jsonify({"success": False, "message": "Hotel not found"}), 404
        return jsonify({"success": True, "message": "Hotel updated successfully", "data": updated}), 200
    except Exception as e:
        logger.error("Error updating hotel %s: %s", hotel_id, e, exc_info=True)
        return jsonify({"success": False, "message": str(e)}), 400


@hotel_bp.route("/<hotel_id>", methods=["DELETE"])
def delete_hotel(hotel_id: str):
    """Soft deletes a hotel."""
    try:
        success = hotel_service.delete_hotel(hotel_id)
        if not success:
            return jsonify({"success": False, "message": "Hotel not found"}), 404
        return jsonify({"success": True, "message": "Hotel deleted successfully"}), 200
    except Exception as e:
        logger.error("Error deleting hotel %s: %s", hotel_id, e, exc_info=True)
        return jsonify({"success": False, "message": str(e)}), 500


@hotel_bp.route("/<hotel_id>/preview-prompt", methods=["GET"])
def preview_hotel_prompt(hotel_id: str):
    """Returns compiled natural language context used by AI calls."""
    try:
        context = hotel_service.get_compiled_context(hotel_id)
        if not context:
            return jsonify({"success": False, "message": "Hotel not found"}), 404
        return jsonify({"success": True, "hotel_id": hotel_id, "prompt_context": context}), 200
    except Exception as e:
        logger.error("Error compiling prompt for hotel %s: %s", hotel_id, e, exc_info=True)
        return jsonify({"success": False, "message": str(e)}), 500
