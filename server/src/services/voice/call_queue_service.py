import logging
import threading
import time
from datetime import datetime, timezone
from queue import Queue
from typing import Optional, Dict, Any
from bson.objectid import ObjectId

from src.db.connection import mongodb
from src.models.plivo_call_model import BulkCallRequest, OutboundCallRequest
from src.services.voice.single_call_service import SingleCallService

logger = logging.getLogger(__name__)


class CallQueueService:
    """
    Asynchronous bulk calling engine:
    1. Enqueues bulk call batches into memory queue + persists state in MongoDB `voice_batch_jobs`.
    2. Background worker thread consumes tasks with rate-limiting (CPS / Call-Per-Second pacing).
    3. Live progress tracking (queued -> processing -> completed) with zero-cost dry_run support.
    """

    def __init__(self, single_call_service: Optional[SingleCallService] = None):
        self.db = mongodb.voice_calling_app_db
        self.single_call_service = single_call_service or SingleCallService()
        self.queue: Queue = Queue()

        self.call_completed_event = threading.Event()
        self.call_completed_event.set()

        self._worker_thread = threading.Thread(
            target=self._process_queue_worker, daemon=True, name="CallQueueWorker"
        )
        self._worker_thread.start()

        self.current_batch_id: Optional[str] = None

        # Gate for Pause/Resume: True means running, False means paused
        self.is_running_event = threading.Event()
        self.is_running_event.set()  # running by default

        self.is_stopped = False

        logger.info("🚀 Background CallQueueWorker thread initialized and listening.")

    def enqueue_bulk_calls(self, batch_request: BulkCallRequest) -> dict:
        """
        Creates a batch job record in MongoDB, enqueues all contacts,
        and returns HTTP 202 Accepted response payload immediately.
        """
        print(type(batch_request))

        now = datetime.now(timezone.utc)
        total_contacts = len(batch_request.contacts)

        # 1. Create Batch Job Tracker Document in MongoDB
        batch_doc = {
            "hotel_id": batch_request.hotel_id,
            "status": "queued",  # queued | processing | pause | completed
            "total_count": total_contacts,
            "processed_count": 0,
            "rate_limit_second": batch_request.rate_limit_second or 2,
            "dry_run": batch_request.dry_run,
            "contacts_summary": [
                {
                    "to_number": c.to_number,
                    "guest_name": c.guest_name,
                    "guest_lead": c.guest_lead,
                    "status": "pending",
                }
                for c in batch_request.contacts
            ],
            "created_at": now,
            "updated_at": now,
        }
        result = self.db["voice_batch_jobs"].insert_one(batch_doc)
        batch_id = str(result.inserted_id)

        # 2. Push each contact into in-memory queue
        for index, contact in enumerate(batch_request.contacts):
            item = {
                "id": batch_id,
                "hotel_id": batch_request.hotel_id,
                "guest_name": contact.guest_name,
                "to_number": contact.to_number,
                "guest_lead": contact.guest_lead,
                "dry_run": batch_request.dry_run,
                "rate_limit_second": batch_request.rate_limit_second,
            }
            self.queue.put(item)
            print(
                f"📥 [STEP 1: ENQUEUE] Added item {index + 1}/{total_contacts} to queue: {contact.guest_name} ({contact.to_number})"
            )

        print(
            f"✅ [STEP 1: BATCH SAVED] Batch ID: {batch_id} | Queue size: {self.queue.qsize()}"
        )

        logger.info(
            "Enqueued Batch %s with %d calls (rate_limit: %ss).",
            batch_id,
            total_contacts,
            batch_request.rate_limit_second,
        )

        return {
            "success": True,
            "batch_id": batch_id,
            "status": "queued",
            "total_queued": total_contacts,
            "rate_limit_second": batch_request.rate_limit_second,
            "dry_run": batch_request.dry_run,
            "message": f"Successfully queued {total_contacts} calls for batch processing.",
        }

    def _dispatch_single_call(self, item: dict) -> dict:
        call_req = OutboundCallRequest(
            hotel_id=item["hotel_id"],
            guest_name=item["guest_name"],
            to_number=item["to_number"],
            guest_lead=item["guest_lead"],
            dry_run=item["dry_run"],
        )
        return self.single_call_service.make_single_call(call_req)

    def _process_queue_worker(self) -> None:
        """Continuous background worker loop."""

        print("🚀 [WORKER] Background queue consumer thread started!")

        while True:
            # ⏸️ PAUSE GATE: If paused, worker halts here until Resume or Stop is clicked
            self.is_running_event.wait()

            # ⏹️ STOP CHECK
            if self.is_stopped:
                self.is_stopped = False
                continue

            item = self.queue.get()

            print(
                f"\n⚡ [STEP 2: PICKED] Worker picked up call for: {item['guest_name']} ({item['to_number']}) | Remaining in queue: {self.queue.qsize()}"
            )

            batch_mongo_id = item.get("id")
            to_number = item.get("to_number")
            call_status = "completed"

            try:
                # Mark contact as calling/processing in db
                if batch_mongo_id:
                    try:
                        self.db["voice_batch_jobs"].update_one(
                            {"_id": ObjectId(batch_mongo_id), "contacts_summary.to_number": to_number},
                            {"$set": {"status": "processing", "contacts_summary.$.status": "calling", "updated_at": datetime.now(timezone.utc)}}
                        )
                    except Exception as db_err:
                        logger.warning("Could not update contact calling status: %s", db_err)

                self.call_completed_event.clear()

                dispatch_res = self._dispatch_single_call(item)
                is_dry_run = item.get("dry_run", False)

                if is_dry_run:
                    # 🧪 DRY RUN: No Plivo webhook exists, simulate quick completion
                    print(
                        f"🧪 [DRY RUN SIMULATED] Call simulated for {item['guest_name']}"
                    )
                else:
                    # Check if dispatch actually succeeded or was rejected
                    if not dispatch_res or not dispatch_res.get("success"):
                        call_status = "failed"
                        print(f"⚠️ Dispatch failed for {item['guest_name']}, skipping webhook wait.")
                    else:
                        # 🔴 LIVE CALL: Wait for Plivo hangup/recording webhook to trigger event
                        self.call_completed_event.clear()
                        print(
                            f"📞 [CALL INITIATED] Waiting for call status/hangup webhook for {item['guest_name']}..."
                        )
                        # In local development or when webhook cannot reach localhost, use 10s fallback
                        finished = self.call_completed_event.wait(timeout=15)
                        if not finished:
                            print(
                                f"⚠️ [PROCEEDING] Webhook for {item['guest_name']} done/timed out. Advancing queue to next call..."
                            )
                delay = item.get("rate_limit_second") or 2
                print(f"⏳ Sleeping {delay}s rate limit before next call...")
                time.sleep(delay)

            except Exception as e:
                call_status = "failed"
                print(f"❌ [STEP 3: ERROR] Failed to dispatch call: {e}")
                logger.error("Error processing queue item: %s", e)
            finally:
                if batch_mongo_id:
                    try:
                        self.db["voice_batch_jobs"].update_one(
                            {"_id": ObjectId(batch_mongo_id), "contacts_summary.to_number": to_number},
                            {
                                "$set": {
                                    "contacts_summary.$.status": call_status,
                                    "updated_at": datetime.now(timezone.utc)
                                },
                                "$inc": {"processed_count": 1}
                            }
                        )
                        # Check if all completed
                        job = self.db["voice_batch_jobs"].find_one({"_id": ObjectId(batch_mongo_id)})
                        if job and job.get("processed_count", 0) >= job.get("total_count", 0):
                            self.db["voice_batch_jobs"].update_one(
                                {"_id": ObjectId(batch_mongo_id)},
                                {"$set": {"status": "completed", "completed_at": datetime.now(timezone.utc)}}
                            )
                    except Exception as db_err:
                        logger.warning("Could not update batch completion status: %s", db_err)

                self.queue.task_done()
                print(f"🏁 [STEP 5: DONE] Task completed for {item['guest_name']}")

    def pause_batch(self, batch_id: str) -> dict:
        self.is_running_event.clear()  # 🔴 Pause: blocks worker before next call
        self.db["voice_batch_jobs"].update_one(
            {"_id": ObjectId(batch_id)},
            {"$set": {"status": "paused", "updated_at": datetime.now(timezone.utc)}},
        )
        print(
            f"⏸️ [QUEUE PAUSED] Batch {batch_id} will pause after current call finishes."
        )
        return {"success": True, "status": "paused"}

    def resume_batch(self, batch_id: str) -> dict:
        self.is_running_event.set()  # 🟢 Resume: worker continues immediately
        self.db["voice_batch_jobs"].update_one(
            {"_id": ObjectId(batch_id)},
            {
                "$set": {
                    "status": "processing",
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )
        print(f"▶️ [QUEUE RESUMED] Batch {batch_id} resumed.")
        return {"success": True, "status": "processing"}

    def stop_batch(self, batch_id: str) -> dict:
        self.is_stopped = True
        self.is_running_event.set()  # unblock if it was paused so it can drain
        # Clear remaining items in memory queue
        while not self.queue.empty():
            try:
                self.queue.get_nowait()
                self.queue.task_done()
            except Exception:
                break
        self.db["voice_batch_jobs"].update_one(
            {"_id": ObjectId(batch_id)},
            {"$set": {"status": "stopped", "updated_at": datetime.now(timezone.utc)}},
        )
        print(f"⏹️ [QUEUE STOPPED] Batch {batch_id} cleared and permanently stopped.")
        return {"success": True, "status": "stopped"}

    def get_batch_status(self, batch_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves real-time progress for frontend status indicators.
        """
        try:
            job = self.db["voice_batch_jobs"].find_one({"_id": ObjectId(batch_id)})
        except Exception:
            job = self.db["voice_batch_jobs"].find_one({"batch_id": batch_id})

        if not job:
            return None

        job["batch_id"] = str(job["_id"])
        job["_id"] = str(job["_id"])
        for dt_field in ["created_at", "updated_at", "started_at", "completed_at"]:
            if isinstance(job.get(dt_field), datetime):
                job[dt_field] = job[dt_field].isoformat()

        return job
