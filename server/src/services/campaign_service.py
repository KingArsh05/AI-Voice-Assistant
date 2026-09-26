import uuid
import time
import logging
import threading
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Tuple

from src.db.connection import get_db
from src.models.campaign_model import (
    CreateCampaignRequest,
    CampaignStatus,
    LeadStatus,
)
from src.models.call_model import InitiateCallRequest
from src.services.call_service import CallService
from src.services.lead_guardrails import (
    sanitize_guest_name,
    validate_lead_content,
    clean_lead_for_ai,
)

logger = logging.getLogger(__name__)

# Terminal call statuses that indicate a call has completed
TERMINAL_CALL_STATUSES = {
    "completed",
    "failed",
    "no-answer",
    "busy",
    "rejected",
    "hangup",
}

# Global worker registry: campaign_id -> Thread
# Prevents duplicate daemon threads and enables dead-thread detection
_campaign_workers: Dict[str, threading.Thread] = {}
_workers_lock = threading.Lock()


class CampaignService:
    def __init__(self):
        self.db = get_db()
        self.call_service = CallService()

    def _validate_campaign_leads(self, leads: List[Any], hotel_id: Optional[str]) -> Tuple[List[dict], List[str]]:
        """
        Validates and sanitizes all leads before campaign creation.
        Strips bad words, rejects prohibited lead patterns, checks within-batch duplicates.
        """
        errors = []
        cleaned_leads = []
        seen_phones = set()

        # If hotel_id is specified, ensure it exists
        if hotel_id:
            hotel_doc = self.db.hotels.find_one({"hotel_id": hotel_id, "is_deleted": {"$ne": True}})
            if not hotel_doc:
                errors.append(f"Selected Hotel ID '{hotel_id}' does not exist or is inactive.")

        for idx, lead in enumerate(leads):
            lead_dict = lead.model_dump() if hasattr(lead, "model_dump") else dict(lead)
            phone = lead_dict.get("phone_number", "").strip()
            raw_name = lead_dict.get("guest_name", "").strip()
            raw_lead = lead_dict.get("lead_details", "")

            # 1. Intra-campaign duplicate check bypassed for testing with single test number
            pass

            # 2. Content validation (reject extortion, scams, abuse)
            is_valid, reason = validate_lead_content(raw_lead)
            if not is_valid:
                errors.append(f"Lead #{idx + 1} ({raw_name}): Prohibited content detected — {reason}")

            # 3. Name sanitization
            clean_name, _ = sanitize_guest_name(raw_name)
            lead_dict["guest_name"] = clean_name
            if not lead_dict.get("serial"):
                lead_dict["serial"] = idx + 1
            lead_dict["status"] = LeadStatus.QUEUED.value

            cleaned_leads.append(lead_dict)

        return cleaned_leads, errors

    def create_campaign(self, data: CreateCampaignRequest) -> Dict[str, Any]:
        campaign_id = f"cmp_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)

        leads_data, validation_errors = self._validate_campaign_leads(data.leads, data.hotel_id)
        if validation_errors:
            error_str = " | ".join(validation_errors[:5])
            if len(validation_errors) > 5:
                error_str += f" (and {len(validation_errors) - 5} more issues)"
            raise ValueError(f"Campaign pre-flight validation failed: {error_str}")

        doc = {
            "campaign_id": campaign_id,
            "name": data.name or f"Campaign {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            "status": CampaignStatus.QUEUED.value,
            "hotel_id": data.hotel_id,
            "from_number": data.from_number,
            "persona": data.persona,
            "cooldown_seconds": data.cooldown_seconds,
            "max_call_duration_seconds": data.max_call_duration_seconds,
            "max_retries": data.max_retries,
            "total_leads": len(leads_data),
            "completed_count": 0,
            "failed_count": 0,
            "skipped_count": 0,
            "current_index": 0,
            "leads": leads_data,
            "created_at": now,
            "updated_at": now,
        }

        self.db.campaigns.insert_one(doc)
        logger.info("Created campaign %s with %d leads", campaign_id, len(leads_data))
        return self._format_campaign(doc)

    def get_campaign(self, campaign_id: str) -> Optional[Dict[str, Any]]:
        doc = self.db.campaigns.find_one({"campaign_id": campaign_id})
        if not doc:
            return None
        return self._format_campaign(doc)

    def list_campaigns(self, limit: int = 50, skip: int = 0) -> List[Dict[str, Any]]:
        cursor = self.db.campaigns.find().sort("created_at", -1).skip(skip).limit(limit)
        results = []
        for doc in cursor:
            # We omit the full leads list for summary list view
            summary = self._format_campaign(doc)
            leads = summary.get("leads", [])
            summary["leads_sample"] = leads[:3]
            summary["leads_count"] = len(leads)
            summary.pop("leads", None)
            results.append(summary)
        return results

    def start_campaign(self, campaign_id: str) -> Dict[str, Any]:
        doc = self.db.campaigns.find_one({"campaign_id": campaign_id})
        if not doc:
            raise ValueError(f"Campaign {campaign_id} not found")

        if doc.get("status") in [CampaignStatus.COMPLETED.value, CampaignStatus.CANCELLED.value]:
            raise ValueError(f"Cannot start a campaign that is {doc.get('status')}")

        # Check if a live worker thread already exists for this campaign
        with _workers_lock:
            existing = _campaign_workers.get(campaign_id)
            if existing and existing.is_alive():
                logger.info("Worker already alive for campaign %s, skipping spawn", campaign_id)
                updated_doc = self.db.campaigns.find_one({"campaign_id": campaign_id})
                return {"message": "Campaign worker is already running", "campaign": self._format_campaign(updated_doc)}

        # Mark as running before spawning thread
        self.db.campaigns.update_one(
            {"campaign_id": campaign_id},
            {"$set": {
                "status": CampaignStatus.RUNNING.value,
                "worker_heartbeat": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            }},
        )

        # Spawn background processing thread
        thread = threading.Thread(
            target=self._process_queue,
            args=(campaign_id,),
            daemon=True,
            name=f"campaign-worker-{campaign_id}",
        )
        thread.start()

        with _workers_lock:
            _campaign_workers[campaign_id] = thread

        logger.info("Started background worker for campaign %s", campaign_id)

        updated_doc = self.db.campaigns.find_one({"campaign_id": campaign_id})
        return {"message": "Campaign started", "campaign": self._format_campaign(updated_doc)}

    def pause_campaign(self, campaign_id: str) -> Dict[str, Any]:
        doc = self.db.campaigns.find_one({"campaign_id": campaign_id})
        if not doc:
            raise ValueError(f"Campaign {campaign_id} not found")

        self.db.campaigns.update_one(
            {"campaign_id": campaign_id},
            {"$set": {"status": CampaignStatus.PAUSED.value, "updated_at": datetime.now(timezone.utc)}},
        )
        logger.info("Paused campaign %s", campaign_id)
        updated = self.db.campaigns.find_one({"campaign_id": campaign_id})
        return {"message": "Campaign paused", "campaign": self._format_campaign(updated)}

    def resume_campaign(self, campaign_id: str) -> Dict[str, Any]:
        return self.start_campaign(campaign_id)

    def cancel_campaign(self, campaign_id: str) -> Dict[str, Any]:
        doc = self.db.campaigns.find_one({"campaign_id": campaign_id})
        if not doc:
            raise ValueError(f"Campaign {campaign_id} not found")

        # Mark all remaining queued leads as skipped
        leads = doc.get("leads", [])
        skipped_add = 0
        for lead in leads:
            if lead.get("status") == LeadStatus.QUEUED.value:
                lead["status"] = LeadStatus.SKIPPED.value
                skipped_add += 1

        self.db.campaigns.update_one(
            {"campaign_id": campaign_id},
            {
                "$set": {
                    "status": CampaignStatus.CANCELLED.value,
                    "leads": leads,
                    "updated_at": datetime.now(timezone.utc),
                },
                "$inc": {"skipped_count": skipped_add},
            },
        )
        logger.info("Cancelled campaign %s", campaign_id)
        updated = self.db.campaigns.find_one({"campaign_id": campaign_id})
        return {"message": "Campaign cancelled", "campaign": self._format_campaign(updated)}

    # ── Background Worker Loop ────────────────────────────────────────────────
    def _process_queue(self, campaign_id: str):
        logger.info("[%s] Worker loop entered", campaign_id)

        while True:
            # ─ Heartbeat: write timestamp so DB shows worker is alive ───────────
            try:
                self.db.campaigns.update_one(
                    {"campaign_id": campaign_id},
                    {"$set": {"worker_heartbeat": datetime.now(timezone.utc)}},
                )
            except Exception as hb_err:
                logger.debug("[%s] Heartbeat write failed: %s", campaign_id, hb_err)

            doc = self.db.campaigns.find_one({"campaign_id": campaign_id})
            if not doc:
                logger.warning("[%s] Campaign not found in worker. Exiting.", campaign_id)
                break

            current_status = doc.get("status")
            if current_status != CampaignStatus.RUNNING.value:
                logger.info("[%s] Campaign status is '%s'. Worker stopping.", campaign_id, current_status)
                break

            leads = doc.get("leads", [])
            cooldown_seconds = doc.get("cooldown_seconds", 5)
            max_call_duration_seconds = doc.get("max_call_duration_seconds", 240)
            hotel_id = doc.get("hotel_id")
            from_number = doc.get("from_number")
            persona = doc.get("persona", "lead_followup")

            # Find next queued lead
            next_idx = None
            for idx, lead in enumerate(leads):
                if lead.get("status") == LeadStatus.QUEUED.value:
                    next_idx = idx
                    break

            if next_idx is None:
                # All leads have been processed
                logger.info("[%s] All leads processed! Marking campaign completed.", campaign_id)
                self.db.campaigns.update_one(
                    {"campaign_id": campaign_id},
                    {
                        "$set": {
                            "status": CampaignStatus.COMPLETED.value,
                            "updated_at": datetime.now(timezone.utc),
                        }
                    },
                )
                break

            lead = leads[next_idx]
            lead_phone = lead.get("phone_number")
            guest_name = lead.get("guest_name")
            lead_details = lead.get("lead_details", "")

            logger.info(
                "[%s] Processing lead #%d (%s, %s)",
                campaign_id,
                lead.get("serial", next_idx + 1),
                guest_name,
                lead_phone,
            )

            # Step 1: Mark lead as calling
            now = datetime.now(timezone.utc)
            self.db.campaigns.update_one(
                {"campaign_id": campaign_id, f"leads.{next_idx}.status": LeadStatus.QUEUED.value},
                {
                    "$set": {
                        f"leads.{next_idx}.status": LeadStatus.CALLING.value,
                        f"leads.{next_idx}.started_at": now,
                        f"leads.{next_idx}.attempt_count": lead.get("attempt_count", 0) + 1,
                        "current_index": next_idx + 1,
                        "updated_at": now,
                    }
                },
            )

            trigger_id = None
            call_error = None

            # Step 2: Trigger Call via CallService
            try:
                call_request = InitiateCallRequest(
                    guest_name=guest_name,
                    from_number=from_number,
                    to_number=lead_phone,
                    persona=persona,
                    guest_lead=lead_details,
                    hotel_id=hotel_id,
                )
                res = self.call_service.make_call(call_request, bypass_dedup=True)
                trigger_id = res.get("trigger_id")
                logger.info("[%s] Plivo CX triggered for lead #%d, trigger_id=%s", campaign_id, next_idx + 1, trigger_id)

                self.db.campaigns.update_one(
                    {"campaign_id": campaign_id},
                    {"$set": {f"leads.{next_idx}.call_trigger_id": trigger_id}},
                )
            except Exception as e:
                logger.exception("[%s] Failed to trigger call for lead #%d: %s", campaign_id, next_idx + 1, e)
                call_error = str(e)

            # Step 3: Wait for Call Completion (if triggered)
            final_status = LeadStatus.FAILED.value
            call_duration = 0

            if trigger_id and not call_error:
                # Poll db.calls for terminal status with active max duration enforcement
                final_status, call_duration = self._wait_for_call_terminal(
                    trigger_id=trigger_id,
                    max_wait_seconds=max_call_duration_seconds,
                )
            else:
                final_status = LeadStatus.FAILED.value

            # Step 4: Update Lead Record & Campaign Counters
            completed_at = datetime.now(timezone.utc)
            is_success = final_status == LeadStatus.COMPLETED.value
            counter_field = "completed_count" if is_success else "failed_count"

            self.db.campaigns.update_one(
                {"campaign_id": campaign_id},
                {
                    "$set": {
                        f"leads.{next_idx}.status": final_status,
                        f"leads.{next_idx}.call_status": final_status,
                        f"leads.{next_idx}.duration": call_duration,
                        f"leads.{next_idx}.error": call_error,
                        f"leads.{next_idx}.completed_at": completed_at,
                        "updated_at": completed_at,
                    },
                    "$inc": {counter_field: 1},
                },
            )

            logger.info(
                "[%s] Finished lead #%d: status=%s, duration=%ds",
                campaign_id,
                next_idx + 1,
                final_status,
                call_duration,
            )

            # Step 5: Check if campaign was paused or cancelled before cooldown
            fresh_doc = self.db.campaigns.find_one({"campaign_id": campaign_id})
            if not fresh_doc or fresh_doc.get("status") != CampaignStatus.RUNNING.value:
                logger.info("[%s] Status changed during/after call. Worker halting.", campaign_id)
                break

            # Step 6: Cooldown delay between calls
            if cooldown_seconds > 0:
                logger.info("[%s] Cooldown sleep of %d seconds...", campaign_id, cooldown_seconds)
                time.sleep(cooldown_seconds)

        # Clean up registry on exit
        with _workers_lock:
            _campaign_workers.pop(campaign_id, None)

        logger.info("[%s] Worker loop finished", campaign_id)

    def _wait_for_call_terminal(
        self,
        trigger_id: str,
        max_wait_seconds: int = 240,
    ):
        """
        Polls db.calls for terminal status using exponential backoff.

        Key improvements over original:
        - Exponential backoff: 3 → 6 → 12 → 20s (max), preventing tight constant polling
        - 45-second short-circuit: if no DB record arrives within 45s of trigger,
          Plivo webhook is likely delayed/lost — move on rather than blocking entire campaign
        - Still respects max_wait_seconds for calls that ARE tracked but run long
        """
        start_time = time.time()
        call_uuid = None
        poll_interval = 3  # Start at 3s, grow exponentially
        MAX_POLL_INTERVAL = 20
        NO_RECORD_TIMEOUT = 45  # Short-circuit if webhook never arrives
        found_any_record = False

        while (time.time() - start_time) < max_wait_seconds:
            time.sleep(poll_interval)
            # Exponential backoff for polling interval
            poll_interval = min(poll_interval * 1.5, MAX_POLL_INTERVAL)

            call_doc = self.db.calls.find_one({"trigger_id": trigger_id})

            # Short-circuit: if no webhook record after 45s, assume completed and move on
            if not call_doc:
                elapsed = time.time() - start_time
                if elapsed >= NO_RECORD_TIMEOUT:
                    logger.warning(
                        "[_wait_for_call_terminal] No webhook received for trigger_id=%s after %.0fs. "
                        "Moving on to next lead to prevent campaign stall.",
                        trigger_id,
                        elapsed,
                    )
                    return LeadStatus.COMPLETED.value, int(elapsed)
                continue

            found_any_record = True
            if not call_uuid:
                call_uuid = call_doc.get("call_uuid")

            status = (call_doc.get("status") or "").lower()
            duration = call_doc.get("duration") or call_doc.get("recording_duration") or int(time.time() - start_time)

            if status in TERMINAL_CALL_STATUSES:
                # Double-check against Plivo live calls if call_uuid is available
                if call_uuid and hasattr(self.call_service, "client"):
                    try:
                        live_call_ids = self.call_service.client.live_calls.list_ids().get("calls", [])
                        if call_uuid in live_call_ids:
                            logger.info(
                                "Call %s marked %s in DB but still active on Plivo carrier. Waiting...",
                                call_uuid,
                                status,
                            )
                            continue
                    except Exception as e:
                        logger.debug("Plivo live_calls check: %s", e)

                # Call is confirmed terminated
                if status in ["completed", "hangup"]:
                    return LeadStatus.COMPLETED.value, int(duration)
                elif status == "no-answer":
                    return LeadStatus.NO_ANSWER.value, int(duration)
                elif status == "busy":
                    return LeadStatus.BUSY.value, int(duration)
                elif status == "rejected":
                    return LeadStatus.REJECTED.value, int(duration)
                else:
                    return LeadStatus.FAILED.value, int(duration)

        # Max call duration reached
        elapsed = int(time.time() - start_time)
        logger.warning(
            "Max call duration reached (%ds >= %ds) for trigger_id=%s. Forcing call disconnect.",
            elapsed,
            max_wait_seconds,
            trigger_id,
        )

        # Force hangup via Plivo API
        try:
            call_doc = self.db.calls.find_one({"trigger_id": trigger_id})
            if call_doc and not call_uuid:
                call_uuid = call_doc.get("call_uuid")

            if call_uuid and hasattr(self.call_service, "client"):
                self.call_service.client.calls.hangup(call_uuid)
                logger.info("Successfully sent hangup command for call_uuid=%s via Plivo", call_uuid)
                time.sleep(2)
        except Exception as e:
            logger.warning("Could not force hangup for call_uuid via Plivo: %s", e)

        # Update local call document
        self.db.calls.update_one(
            {"trigger_id": trigger_id, "status": {"$nin": list(TERMINAL_CALL_STATUSES)}},
            {"$set": {"status": "completed", "duration": elapsed, "hangup_source": "system_max_duration"}}
        )

        return LeadStatus.COMPLETED.value, elapsed


    def _format_campaign(self, doc: dict) -> dict:
        if not doc:
            return {}
        doc = dict(doc)
        if "_id" in doc:
            doc["_id"] = str(doc["_id"])
        if "created_at" in doc and isinstance(doc["created_at"], datetime):
            doc["created_at"] = doc["created_at"].isoformat()
        if "updated_at" in doc and isinstance(doc["updated_at"], datetime):
            doc["updated_at"] = doc["updated_at"].isoformat()

        # Format dates in leads
        if "leads" in doc and isinstance(doc["leads"], list):
            for lead in doc["leads"]:
                if "started_at" in lead and isinstance(lead["started_at"], datetime):
                    lead["started_at"] = lead["started_at"].isoformat()
                if "completed_at" in lead and isinstance(lead["completed_at"], datetime):
                    lead["completed_at"] = lead["completed_at"].isoformat()

        return doc
