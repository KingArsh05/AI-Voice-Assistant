import { useState, useRef, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { CAMPAIGN_QUEUE_STATUS, generateCampaignId } from "./campaignTypes";

/**
 * useCampaignQueue Hook
 * Senior-level orchestrator for sequential batch calls with robust
 * Initiate, Pause, Resume, and Stop controls.
 *
 * Keeps component render state clean and strictly minimal.
 */
export function useCampaignQueue({ baseUrl, onComplete }) {
  const [queueStatus, setQueueStatus] = useState(CAMPAIGN_QUEUE_STATUS.IDLE);
  const [campaignId, setCampaignId] = useState(null);
  const [processedCount, setProcessedCount] = useState(0);
  const [contactStatuses, setContactStatuses] = useState({});

  // Control flags via refs for instant latency-free pause/stop checking inside async loop
  const stopRequestedRef = useRef(false);
  const pauseRequestedRef = useRef(false);

  /**
   * Helper to check Plivo outcome
   */
  const pollCallStatus = async (triggerId) => {
    if (!triggerId) return { status: "failed", reason: "no_trigger_id" };
    for (let attempt = 0; attempt < 5; attempt++) {
      await new Promise((r) => setTimeout(r, 800));
      try {
        const res = await axios.get(`${baseUrl}/api/v1/voice/calls/${triggerId}`);
        const callData = res.data?.data;
        const serverStatus = (
          callData?.call_status ||
          callData?.disposition ||
          ""
        ).toLowerCase();
        const hangupCause = (callData?.hangup?.cause || "").toLowerCase();

        if (
          serverStatus === "answered" ||
          serverStatus === "completed" ||
          serverStatus === "in-progress"
        ) {
          return { status: "completed", reason: null };
        } else if (
          serverStatus === "failed" ||
          serverStatus === "rejected" ||
          serverStatus === "busy" ||
          serverStatus === "no_answer" ||
          hangupCause.includes("credit") ||
          hangupCause.includes("failed")
        ) {
          return {
            status: "failed",
            reason: callData?.hangup?.cause || callData?.call_status || "failed_out_of_credits",
          };
        }
      } catch (err) {
        console.warn("Call status check warning:", err);
      }
    }
    return { status: "failed", reason: "failed_out_of_credits / unverified" };
  };

  /**
   * Start sequential queue execution
   */
  const startQueue = useCallback(
    async ({
      contacts,
      campaignName,
      campaignSubject,
      campaignMessage,
      targetHotelId,
      rateLimitSeconds = 2.0,
    }) => {
      if (!contacts || contacts.length === 0) {
        toast.error("No valid contacts found to run campaign.");
        return;
      }

      const activeCampaignId = generateCampaignId();
      setCampaignId(activeCampaignId);
      setQueueStatus(CAMPAIGN_QUEUE_STATUS.RUNNING);
      setProcessedCount(0);

      // Initialize pending statuses
      const initialMap = {};
      contacts.forEach((c) => {
        initialMap[c.to_number] = "pending";
      });
      setContactStatuses(initialMap);

      stopRequestedRef.current = false;
      pauseRequestedRef.current = false;

      toast.info(`🚀 Starting campaign "${campaignName || "Hotel Campaign"}" for ${contacts.length} recipients...`);

      for (let i = 0; i < contacts.length; i++) {
        // Stop check
        if (stopRequestedRef.current) {
          setQueueStatus(CAMPAIGN_QUEUE_STATUS.STOPPED);
          toast.warn("Campaign execution stopped by user.");
          break;
        }

        // Pause loop check
        while (pauseRequestedRef.current && !stopRequestedRef.current) {
          await new Promise((r) => setTimeout(r, 400));
        }

        if (stopRequestedRef.current) {
          setQueueStatus(CAMPAIGN_QUEUE_STATUS.STOPPED);
          break;
        }

        const contact = contacts[i];

        // Mark as calling
        setContactStatuses((prev) => ({
          ...prev,
          [contact.to_number]: "calling",
        }));

        try {
          // Construct rich campaign prompt summary
          const composedPrompt = `[Campaign: ${campaignName || "Hotel Promotion"}] ${
            campaignSubject ? `Subject: ${campaignSubject}. ` : ""
          }${campaignMessage}. ${
            contact.guest_lead ? `Previous guest context: ${contact.guest_lead}` : ""
          }`;

          const payload = {
            to_number: contact.to_number,
            guest_name: contact.guest_name,
            hotel_id: String(contact.hotel_id || targetHotelId),
            guest_lead: composedPrompt,
            campaign_id: activeCampaignId,
            campaign_name: campaignName,
            dry_run: false,
          };

          const res = await axios.post(`${baseUrl}/api/v1/voice/call`, payload, {
            headers: { "Content-Type": "application/json" },
          });

          if (res.data?.success) {
            const outcome = await pollCallStatus(res.data?.data?.trigger_id);
            if (outcome.status === "completed") {
              setContactStatuses((prev) => ({
                ...prev,
                [contact.to_number]: "completed",
              }));
              toast.success(`✓ Contacted: ${contact.guest_name} (${contact.to_number})`, {
                autoClose: 2000,
              });
            } else {
              setContactStatuses((prev) => ({
                ...prev,
                [contact.to_number]: "failed",
                [`reason_${contact.to_number}`]: outcome.reason,
              }));
              toast.error(`✕ ${contact.guest_name}: ${outcome.reason || "Call failed"}`);
            }
          } else {
            setContactStatuses((prev) => ({
              ...prev,
              [contact.to_number]: "failed",
              [`reason_${contact.to_number}`]: res.data?.message || "API reject",
            }));
          }
        } catch (err) {
          const errMsg = err.response?.data?.message || err.message || "Network error";
          setContactStatuses((prev) => ({
            ...prev,
            [contact.to_number]: "failed",
            [`reason_${contact.to_number}`]: errMsg,
          }));
        }

        setProcessedCount(i + 1);

        // Rate limit pacing between calls (if not the last contact)
        if (i < contacts.length - 1 && !stopRequestedRef.current) {
          const delayMs = Math.max(500, Math.round(Number(rateLimitSeconds) * 1000));
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }

      if (!stopRequestedRef.current) {
        setQueueStatus(CAMPAIGN_QUEUE_STATUS.COMPLETED);
        toast.success(`🎉 Campaign completed! (${contacts.length}/${contacts.length})`);
        if (onComplete) onComplete({ campaignId: activeCampaignId });
      }
    },
    [baseUrl, onComplete]
  );

  const pauseQueue = useCallback(() => {
    pauseRequestedRef.current = true;
    setQueueStatus(CAMPAIGN_QUEUE_STATUS.PAUSED);
    toast.info("⏸️ Campaign paused");
  }, []);

  const resumeQueue = useCallback(() => {
    pauseRequestedRef.current = false;
    setQueueStatus(CAMPAIGN_QUEUE_STATUS.RUNNING);
    toast.info("▶️ Resuming campaign...");
  }, []);

  const stopQueue = useCallback(() => {
    stopRequestedRef.current = true;
    pauseRequestedRef.current = false;
    setQueueStatus(CAMPAIGN_QUEUE_STATUS.STOPPED);
    toast.warn("⏹️ Campaign stopped");
  }, []);

  const resetQueue = useCallback(() => {
    stopRequestedRef.current = false;
    pauseRequestedRef.current = false;
    setQueueStatus(CAMPAIGN_QUEUE_STATUS.IDLE);
    setCampaignId(null);
    setProcessedCount(0);
    setContactStatuses({});
  }, []);

  return {
    queueStatus,
    campaignId,
    processedCount,
    contactStatuses,
    startQueue,
    pauseQueue,
    resumeQueue,
    stopQueue,
    resetQueue,
  };
}
