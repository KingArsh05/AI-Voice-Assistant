from flask import Blueprint, jsonify

from src.services.knowledge_base_service import (
    KnowledgeBaseService,
)

knowledge_base_bp = Blueprint(
    "knowledge_base",
    __name__,
)


@knowledge_base_bp.get("")
def list_hotels():
    """Returns list of hotels from MONGODB_SOURCE_DB_NAME (staychat_clone_db)."""
    try:
        hotels = KnowledgeBaseService.list_hotels()
        return jsonify({"success": True, "count": len(hotels), "data": hotels}), 200
    except Exception as error:
        print(f"Error fetching hotels from source DB: {error}")
        return jsonify({"success": False, "message": "Failed to fetch hotels."}), 500


@knowledge_base_bp.get("/<hotel_id>/knowledge-base")
def get_knowledge_base(hotel_id: str):

    try:
        knowledge_base = KnowledgeBaseService.get_knowledge_base(hotel_id)

        return jsonify(knowledge_base.model_dump(mode="json")), 200

    except ValueError as error:
        return (
            jsonify(
                {
                    "success": False,
                    "message": str(error),
                }
            ),
            404,
        )

    except Exception as error:
        print(f"Knowledge base error: {error}")

        return (
            jsonify(
                {
                    "success": False,
                    "message": "Failed to generate knowledge base.",
                }
            ),
            500,
        )
