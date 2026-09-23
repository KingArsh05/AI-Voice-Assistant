import logging
from flask import Blueprint, request, jsonify
from pydantic import ValidationError

from src.models.campaign_model import CreateCampaignRequest
from src.services.campaign_service import CampaignService

logger = logging.getLogger(__name__)

campaign_bp = Blueprint("campaign", __name__)
campaign_service = CampaignService()


@campaign_bp.route("", methods=["POST"])
def create_campaign():
    """Create a new campaign with a batch of leads."""
    try:
        body = request.get_json(force=True, silent=True)
        if not body:
            return jsonify({"success": False, "error": "Invalid or missing JSON payload"}), 400

        validated_data = CreateCampaignRequest(**body)
        campaign = campaign_service.create_campaign(validated_data)
        return jsonify({"success": True, "campaign": campaign}), 201

    except ValidationError as e:
        logger.warning("Campaign validation failed: %s", e)
        return jsonify({"success": False, "error": "Validation error", "details": e.errors()}), 422
    except Exception as e:
        logger.exception("Error creating campaign: %s", e)
        return jsonify({"success": False, "error": str(e)}), 500


@campaign_bp.route("", methods=["GET"])
def list_campaigns():
    """List recent campaigns with high-level stats."""
    try:
        limit = int(request.args.get("limit", 50))
        skip = int(request.args.get("skip", 0))
        campaigns = campaign_service.list_campaigns(limit=limit, skip=skip)
        return jsonify({"success": True, "campaigns": campaigns}), 200
    except Exception as e:
        logger.exception("Error listing campaigns: %s", e)
        return jsonify({"success": False, "error": str(e)}), 500


@campaign_bp.route("/<campaign_id>", methods=["GET"])
def get_campaign(campaign_id: str):
    """Get complete campaign details including all lead rows and statuses."""
    try:
        campaign = campaign_service.get_campaign(campaign_id)
        if not campaign:
            return jsonify({"success": False, "error": f"Campaign {campaign_id} not found"}), 404
        return jsonify({"success": True, "campaign": campaign}), 200
    except Exception as e:
        logger.exception("Error getting campaign: %s", e)
        return jsonify({"success": False, "error": str(e)}), 500


@campaign_bp.route("/<campaign_id>/start", methods=["POST"])
def start_campaign(campaign_id: str):
    """Start or resume background processing of queued leads."""
    try:
        result = campaign_service.start_campaign(campaign_id)
        return jsonify({"success": True, **result}), 200
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        logger.exception("Error starting campaign: %s", e)
        return jsonify({"success": False, "error": str(e)}), 500


@campaign_bp.route("/<campaign_id>/pause", methods=["POST"])
def pause_campaign(campaign_id: str):
    """Pause campaign after current active call completes."""
    try:
        result = campaign_service.pause_campaign(campaign_id)
        return jsonify({"success": True, **result}), 200
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        logger.exception("Error pausing campaign: %s", e)
        return jsonify({"success": False, "error": str(e)}), 500


@campaign_bp.route("/<campaign_id>/resume", methods=["POST"])
def resume_campaign(campaign_id: str):
    """Resume a paused campaign."""
    try:
        result = campaign_service.resume_campaign(campaign_id)
        return jsonify({"success": True, **result}), 200
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        logger.exception("Error resuming campaign: %s", e)
        return jsonify({"success": False, "error": str(e)}), 500


@campaign_bp.route("/<campaign_id>/cancel", methods=["POST"])
def cancel_campaign(campaign_id: str):
    """Cancel remaining queued leads in the campaign."""
    try:
        result = campaign_service.cancel_campaign(campaign_id)
        return jsonify({"success": True, **result}), 200
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        logger.exception("Error cancelling campaign: %s", e)
        return jsonify({"success": False, "error": str(e)}), 500
