import logging
import requests
from flask import Blueprint, request, jsonify
from pydantic import ValidationError

from src.models.crm_lead_model import CreateCRMLeadRequest, UpdateCRMLeadRequest
from src.services.crm_service import CRMService
from src.services.call_service import CallService
from src.models.call_model import InitiateCallRequest
from src.config import Config

logger = logging.getLogger(__name__)

crm_bp = Blueprint("crm", __name__)
crm_service = CRMService()
call_service = CallService()


@crm_bp.route("/leads", methods=["GET"])
def list_leads():
    """List CRM leads with optional filters."""
    try:
        hotel_id = request.args.get("hotel_id")
        status = request.args.get("status")
        search = request.args.get("search")
        date_from = request.args.get("date_from")
        date_to = request.args.get("date_to")
        source = request.args.get("source")
        limit = int(request.args.get("limit", 100))
        skip = int(request.args.get("skip", 0))

        leads = crm_service.list_leads(
            hotel_id=hotel_id,
            status=status,
            search=search,
            date_from=date_from,
            date_to=date_to,
            source=source,
            limit=limit,
            skip=skip,
        )
        counts = crm_service.count_leads(hotel_id=hotel_id)
        return jsonify({"success": True, "leads": leads, "counts": counts}), 200
    except Exception as e:
        logger.exception("Error listing CRM leads: %s", e)
        return jsonify({"success": False, "error": str(e)}), 500


@crm_bp.route("/leads/<lead_id>", methods=["GET"])
def get_lead(lead_id: str):
    try:
        lead = crm_service.get_lead(lead_id)
        if not lead:
            return jsonify({"success": False, "error": "Lead not found"}), 404
        return jsonify({"success": True, "lead": lead}), 200
    except Exception as e:
        logger.exception("Error getting CRM lead: %s", e)
        return jsonify({"success": False, "error": str(e)}), 500


@crm_bp.route("/leads", methods=["POST"])
def create_lead():
    try:
        body = request.get_json(force=True, silent=True) or {}
        data = CreateCRMLeadRequest(**body)
        lead = crm_service.create_lead(data)
        return jsonify({"success": True, "lead": lead}), 201
    except ValidationError as e:
        return jsonify({"success": False, "error": "Validation error", "details": e.errors()}), 422
    except Exception as e:
        logger.exception("Error creating CRM lead: %s", e)
        return jsonify({"success": False, "error": str(e)}), 500


@crm_bp.route("/leads/<lead_id>", methods=["PUT"])
def update_lead(lead_id: str):
    try:
        body = request.get_json(force=True, silent=True) or {}
        data = UpdateCRMLeadRequest(**body)
        lead = crm_service.update_lead(lead_id, data)
        if not lead:
            return jsonify({"success": False, "error": "Lead not found"}), 404
        return jsonify({"success": True, "lead": lead}), 200
    except ValidationError as e:
        return jsonify({"success": False, "error": "Validation error", "details": e.errors()}), 422
    except Exception as e:
        logger.exception("Error updating CRM lead: %s", e)
        return jsonify({"success": False, "error": str(e)}), 500


@crm_bp.route("/leads/<lead_id>", methods=["DELETE"])
def delete_lead(lead_id: str):
    try:
        ok = crm_service.delete_lead(lead_id)
        if not ok:
            return jsonify({"success": False, "error": "Lead not found"}), 404
        return jsonify({"success": True, "message": "Lead deleted"}), 200
    except Exception as e:
        logger.exception("Error deleting CRM lead: %s", e)
        return jsonify({"success": False, "error": str(e)}), 500


@crm_bp.route("/leads/<lead_id>/call", methods=["POST"])
def call_lead(lead_id: str):
    """
    Trigger an outbound call directly from a CRM lead.
    Accepts optional overrides: from_number, guest_lead (notes override).
    Automatically marks lead as called and increments call_count.
    """
    try:
        body = request.get_json(force=True, silent=True) or {}
        lead = crm_service.get_lead(lead_id)
        if not lead:
            return jsonify({"success": False, "error": "Lead not found"}), 404

        from_number = body.get("from_number") or Config.PLIVO_PHONE_NUMBER
        guest_name = body.get("guest_name") or lead.get("guest_name") or "Guest"
        guest_lead = (
            body.get("guest_lead")
            or body.get("lead_details")
            or lead.get("lead_details")
            or "Prospective guest lead follow-up."
        )
        hotel_id = body.get("hotel_id") or lead.get("hotel_id")

        call_req = InitiateCallRequest(
            guest_name=guest_name,
            from_number=from_number,
            to_number=lead["phone_number"],
            persona="lead_followup",
            guest_lead=guest_lead,
            hotel_id=hotel_id,
        )
        result = call_service.make_call(call_req)
        crm_service.mark_called(lead_id)
        # Also update status to follow_up if still new
        if lead.get("status") == "new":
            from src.models.crm_lead_model import UpdateCRMLeadRequest
            crm_service.update_lead(lead_id, UpdateCRMLeadRequest(status="follow_up"))

        return jsonify({"success": True, "trigger_id": result.get("trigger_id"), "data": result}), 201
    except ValueError as ve:
        return jsonify({"success": False, "error": str(ve)}), 400
    except Exception as e:
        logger.exception("Error calling CRM lead: %s", e)
        return jsonify({"success": False, "error": str(e)}), 500


@crm_bp.route("/staychat-leads", methods=["GET"])
def get_staychat_leads():
    """Proxy route to fetch leads from Combot CRM backend."""
    try:
        hotel_id = request.args.get("hotelId", "111111")
        page = request.args.get("page", "1")
        limit = request.args.get("limit", "1000")
        lead_type = request.args.get("leadType", "LEAD")

        url = f"{Config.COMBOT_BASE_URL}/api/backend/classifications"
        params = {
            "hotelId": hotel_id,
            "page": page,
            "limit": limit,
            "Secretkey": Config.COMBOT_SECRET_KEY,
            "leadType": lead_type,
        }

        resp = requests.get(url, params=params, timeout=30)
        return jsonify(resp.json()), resp.status_code
    except requests.exceptions.RequestException as e:
        logger.exception("Error fetching Combot StayChat leads: %s", e)
        return jsonify({"success": False, "error": str(e)}), 502
    except Exception as e:
        logger.exception("Unexpected error fetching StayChat leads: %s", e)
        return jsonify({"success": False, "error": str(e)}), 500

