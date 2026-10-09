import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  X,
  PhoneForwarded,
  Building2,
  Clock,
  Play,
  Pause,
  Square,
  Users,
  AlertTriangle,
  RefreshCw,
  Phone,
  CheckCircle2,
  XCircle,
  Loader2,
  Check,
  FileText,
} from "lucide-react";
import { StandaloneSelect, StandaloneStepper } from "../common/FormControl";

export default function CRMBulkCallModal({
  isOpen,
  onClose,
  selectedLeads = [],
  hotels = [],
  onSuccess,
}) {
  const BASE_URL = import.meta.env.VITE_BASE_URL;

  // Selected hotel for knowledge base
  const [selectedHotelId, setSelectedHotelId] = useState("");
  const [rateLimitSecond, setRateLimitSecond] = useState(2.0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Queue and Batch execution state
  const [batchId, setBatchId] = useState(null);
  const [queueStatus, setQueueStatus] = useState("idle"); // 'idle' | 'running' | 'paused' | 'stopped' | 'completed'
  const [contactStatuses, setContactStatuses] = useState({});

  // Processed count state for direct progression
  const [processedCount, setProcessedCount] = useState(0);

  // References for pause / stop control in loop
  const stopRequestedRef = useRef(false);
  const pauseRequestedRef = useRef(false);

  // Reset all state when closing
  const handleClose = () => {
    setBatchId(null);
    setQueueStatus("idle");
    setContactStatuses({});
    setProcessedCount(0);
    setIsSubmitting(false);
    onClose();
  };

  // Sync default hotel selection when modal opens or leads change
  useEffect(() => {
    if (!isOpen) return;

    const leadHotels = [
      ...new Set(
        selectedLeads
          .map((l) => l.hotel_id)
          .filter((h) => h && h !== "—" && h !== "None"),
      ),
    ];

    if (leadHotels.length === 1 && leadHotels[0]) {
      setSelectedHotelId(String(leadHotels[0]));
    } else if (hotels.length > 0) {
      setSelectedHotelId(String(hotels[0].hotel_id));
    } else {
      setSelectedHotelId("111111");
    }
  }, [isOpen, selectedLeads, hotels]);

  // Transform leads into contacts payload format
  const formattedContacts = selectedLeads.map((lead) => {
    const rawNumber = String(lead.phone_number || "").trim();
    const formattedNumber = rawNumber.startsWith("+")
      ? rawNumber
      : rawNumber.length === 10
        ? `+91${rawNumber}`
        : rawNumber.startsWith("91") && rawNumber.length === 12
          ? `+${rawNumber}`
          : rawNumber
            ? `+91${rawNumber}`
            : "";

    return {
      guest_name: lead.guest_name || "Guest",
      guest_lead: lead.summary || "CRM lead inquiry follow-up",
      to_number: formattedNumber,
      original_lead: lead,
    };
  });

  const validContacts = formattedContacts.filter((c) => Boolean(c.to_number));
  const invalidCount = formattedContacts.length - validContacts.length;

  // Calculate real progress
  const totalCount = validContacts.length;
  const progressPercent =
    totalCount > 0
      ? Math.min(100, Math.round((processedCount / totalCount) * 100))
      : 0;

  // 1. Initiate Bulk Outbound Calls sequentially (Direct Plivo response sync, NO polling)
  const handleInitiate = async () => {
    if (validContacts.length === 0 || isSubmitting) {
      toast.error("No valid contacts with phone numbers found.");
      return;
    }

    setIsSubmitting(true);
    const generatedBatchId = `batch_${window.crypto?.randomUUID ? window.crypto.randomUUID().slice(0, 8) : String(performance.now()).replace(".", "")}`;
    setBatchId(generatedBatchId);
    setQueueStatus("running");
    setProcessedCount(0);

    const initialStatuses = {};
    validContacts.forEach((c) => {
      initialStatuses[c.to_number] = "pending";
    });
    setContactStatuses(initialStatuses);

    toast.info(`🚀 Starting sequential calls for ${validContacts.length} leads...`);

    let doneCount = 0;
    const targetHotelId =
      selectedHotelId ||
      (hotels[0]?.hotel_id ? String(hotels[0].hotel_id) : "111111");

    stopRequestedRef.current = false;
    pauseRequestedRef.current = false;

    for (let i = 0; i < validContacts.length; i++) {
      if (stopRequestedRef.current) {
        toast.warn("Bulk calls stopped by user");
        setQueueStatus("stopped");
        break;
      }

      // If paused, wait until resumed or stopped
      while (pauseRequestedRef.current && !stopRequestedRef.current) {
        await new Promise((r) => setTimeout(r, 400));
      }

      if (stopRequestedRef.current) {
        setQueueStatus("stopped");
        break;
      }

      const contact = validContacts[i];

      // Mark current contact as "calling"
      setContactStatuses((prev) => ({
        ...prev,
        [contact.to_number]: "calling",
      }));

      try {
        const payload = {
          to_number: contact.to_number,
          guest_name: contact.guest_name,
          hotel_id: targetHotelId,
          guest_lead: contact.guest_lead,
          dry_run: false,
        };

        const res = await axios.post(`${BASE_URL}/api/v1/voice/call`, payload, {
          headers: { "Content-Type": "application/json" },
        });

        if (res.data && res.data.success) {
          const triggerId = res.data?.data?.trigger_id;

          let finalStatus = "completed";
          let failReason = null;

          if (triggerId) {
            // Poll for up to 3.5 seconds (intervals of 800ms) to receive Plivo's hangup webhook
            for (let attempt = 0; attempt < 4; attempt++) {
              await new Promise((r) => setTimeout(r, 800));
              try {
                const callCheck = await axios.get(
                  `${BASE_URL}/api/v1/voice/calls/${triggerId}`,
                );
                const callData = callCheck.data?.data;
                const serverStatus = (callData?.call_status || callData?.disposition || "").toLowerCase();
                const hangupCause = (callData?.hangup?.cause || "").toLowerCase();

                if (
                  serverStatus === "failed" ||
                  serverStatus === "rejected" ||
                  serverStatus === "busy" ||
                  serverStatus === "no_answer" ||
                  hangupCause.includes("credit") ||
                  hangupCause.includes("failed")
                ) {
                  finalStatus = "failed";
                  failReason = callData?.hangup?.cause || callData?.call_status || "failed_out_of_credits";
                  break;
                } else if (serverStatus === "answered" || serverStatus === "completed") {
                  finalStatus = "completed";
                  break;
                }
              } catch (errCheck) {
                console.warn("Could not check call status:", errCheck);
              }
            }
          }

          const cleanKey = String(contact.to_number || "").trim().replace(/\s+/g, "");

          if (finalStatus === "failed") {
            setContactStatuses((prev) => ({
              ...prev,
              [contact.to_number]: "failed",
              [cleanKey]: "failed",
              [`reason_${contact.to_number}`]: failReason,
              [`reason_${cleanKey}`]: failReason,
            }));
            toast.error(
              `✕ ${contact.guest_name}: ${failReason || "Call failed / Out of credits"}`,
            );
          } else {
            setContactStatuses((prev) => ({
              ...prev,
              [contact.to_number]: "completed",
              [cleanKey]: "completed",
            }));
            toast.success(
              `✓ Connected: ${contact.guest_name} (${contact.to_number})`,
              { autoClose: 2500 },
            );
          }
        } else {
          const cleanKey = String(contact.to_number || "").trim().replace(/\s+/g, "");
          setContactStatuses((prev) => ({
            ...prev,
            [contact.to_number]: "failed",
            [cleanKey]: "failed",
            [`reason_${cleanKey}`]: res.data?.message || "Call rejected",
          }));
          toast.error(
            `✕ ${contact.guest_name}: ${res.data?.message || "Call rejected"}`,
          );
        }
      } catch (err) {
        console.error(`Call failed for ${contact.to_number}:`, err);
        const errMsg =
          err.response?.data?.message ||
          err.response?.data?.errors?.[0]?.msg ||
          err.message ||
          "Call error";
        const cleanKey = String(contact.to_number || "").trim().replace(/\s+/g, "");
        setContactStatuses((prev) => ({
          ...prev,
          [contact.to_number]: "failed",
          [cleanKey]: "failed",
          [`reason_${contact.to_number}`]: errMsg,
          [`reason_${cleanKey}`]: errMsg,
        }));
        toast.error(`✕ ${contact.guest_name}: ${errMsg}`);
      }

      doneCount += 1;
      setProcessedCount(doneCount);

      // Delay between calls (if not last item and not stopped)
      if (i < validContacts.length - 1 && !stopRequestedRef.current) {
        const delayMs = Math.max(500, Number(rateLimitSecond) * 1000);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    if (!stopRequestedRef.current) {
      setQueueStatus("completed");
      toast.success(`🏁 Bulk calling completed! (${doneCount}/${validContacts.length})`);
    }

    setIsSubmitting(false);

    if (onSuccess) {
      onSuccess({ batchId: generatedBatchId, count: validContacts.length });
    }
  };

  // 2. Pause / Stop Controls
  const handlePause = () => {
    pauseRequestedRef.current = true;
    setQueueStatus("paused");
    toast.info("Batch paused");
  };

  const handleResume = () => {
    pauseRequestedRef.current = false;
    setQueueStatus("running");
    toast.success("Batch resumed");
  };

  const handleStop = () => {
    stopRequestedRef.current = true;
    setQueueStatus("stopped");
    setIsSubmitting(false);
    toast.warn("Batch stopped");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
        onClick={() => {
          if (queueStatus !== "running") handleClose();
        }}
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <PhoneForwarded className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Initiate CRM Bulk Calls
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-mono font-semibold">
                  {selectedLeads.length} Selected
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Dispatch outbound AI voice agent calls to selected CRM leads
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto min-h-0 flex-1">
          {/* Invalid numbers alert if any */}
          {invalidCount > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                {invalidCount} of {selectedLeads.length} selected lead(s) have
                missing or invalid phone numbers and will be skipped.
              </span>
            </div>
          )}

          {/* Configuration Form Card (editable when idle) */}
          <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Queue Parameters
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              {/* Hotel Knowledge Base (Left) */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                  Target Hotel Knowledge Base
                </label>
                <StandaloneSelect
                  value={selectedHotelId}
                  onChange={(val) => setSelectedHotelId(val)}
                  disabled={queueStatus === "running"}
                  searchable={true}
                  size="sm"
                  placeholder="Select Hotel..."
                  options={
                    hotels.length > 0
                      ? hotels.map((hotel) => ({
                          value: String(hotel.hotel_id),
                          label:
                            hotel.name ||
                            hotel.hotel_name ||
                            `Hotel (${hotel.hotel_id})`,
                          subLabel: `ID: ${hotel.hotel_id}`,
                          icon: (
                            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                          ),
                        }))
                      : [
                          {
                            value: "111111",
                            label: "Default Hotel (111111)",
                            subLabel: "ID: 111111",
                            icon: (
                              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                            ),
                          },
                        ]
                  }
                />
              </div>

              {/* Delay Stepper (Right) */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  Delay Between Calls
                </label>
                <StandaloneStepper
                  value={rateLimitSecond}
                  onChange={(val) => setRateLimitSecond(val)}
                  min={1.0}
                  max={5.0}
                  step={0.5}
                  suffix="s"
                  disabled={queueStatus === "running"}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Real-time Progress Bar when Batch is Active */}
          {batchId && (
            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">Batch Progress</span>
                  <span className="text-slate-400 font-mono">
                    ({processedCount} of {totalCount} calls dispatched)
                  </span>
                </div>
                <div className="font-mono font-bold text-indigo-400">
                  {progressPercent}%
                </div>
              </div>

              {/* Visual Progress Bar */}
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-indigo-500 via-violet-500 to-emerald-400 transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Selected Leads Queue with Real-time Status and Ticks */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
              <span className="flex items-center gap-1.5 uppercase tracking-wider">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                Target Queue ({validContacts.length} valid recipients)
              </span>
              <span className="text-slate-500 font-mono text-[11px]">
                {batchId ? "Live dispatch status" : "Ready to dispatch"}
              </span>
            </div>

            <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/40 divide-y divide-slate-800/60 max-h-56 overflow-y-auto">
              {validContacts.map((contact, idx) => {
                const cleanPhone = String(contact.to_number || "").trim().replace(/\s+/g, "");
                const status =
                  contactStatuses[cleanPhone] ||
                  contactStatuses[cleanPhone.replace(/^\+/, "")] ||
                  contactStatuses[`idx_${idx}`] ||
                  (batchId ? "pending" : null);
                const isCompleted = status === "completed";
                const isCalling = status === "calling";
                const isFailed = status === "failed";

                return (
                  <div
                    key={idx}
                    className={`p-3 flex items-center justify-between gap-3 text-xs transition-colors ${
                      isCompleted
                        ? "bg-emerald-950/15"
                        : isCalling
                          ? "bg-indigo-950/30"
                          : isFailed
                            ? "bg-rose-950/20"
                            : "hover:bg-slate-800/30"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Avatar with Status Tick Indicator */}
                      <div className="relative">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                            isCompleted
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : isCalling
                                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                                : isFailed
                                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                  : "bg-indigo-500/10 border border-indigo-500/20 text-indigo-300"
                          }`}
                        >
                          {contact.guest_name[0]?.toUpperCase() || "G"}
                        </div>

                        {/* Status Icon Badge */}
                        {isCompleted && (
                          <div
                            className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-xs"
                            title="Call completed"
                          >
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                        {isCalling && (
                          <div
                            className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-xs animate-spin"
                            title="Calling now..."
                          >
                            <Loader2 className="w-2.5 h-2.5" />
                          </div>
                        )}
                        {isFailed && (
                          <div
                            className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs"
                            title="Call failed"
                          >
                            <X className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-white text-xs">
                            {contact.guest_name}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-500" />
                            {contact.to_number}
                          </span>
                        </div>

                        {/* CRM Lead Inquiry / Summary Context */}
                        {contact.guest_lead && (
                          <div className="mt-1 flex items-start gap-1.5 text-[11px] text-slate-300/90 bg-slate-900/90 border border-slate-800/80 px-2.5 py-1.5 rounded-lg">
                            <FileText className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2 leading-relaxed text-slate-300">
                              {contact.guest_lead}
                            </span>
                          </div>
                        )}

                        {/* Status Message / Failure Cause */}
                        {isFailed && contactStatuses[`reason_${cleanPhone}`] && (
                          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/25 px-2.5 py-1 rounded-md font-mono w-fit">
                            <XCircle className="w-3 h-3 shrink-0" />
                            <span className="font-medium">
                              Reason: {contactStatuses[`reason_${cleanPhone}`]}
                            </span>
                          </div>
                        )}
                        {isCompleted && (
                          <div className="mt-1 text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>Call successfully dispatched</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status Pill on the Right */}
                    <div className="flex items-center gap-3 shrink-0">
                      {/* Status Badge */}
                      {status && (
                        <div>
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-xs">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Done</span>
                            </span>
                          ) : isCalling ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 animate-pulse shadow-xs">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Calling...</span>
                            </span>
                          ) : isFailed ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/15 border border-rose-500/30 text-rose-400 shadow-xs">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Failed</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700/60">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Pending</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Queue Status Bar if Initiated */}
          {batchId && (
            <div className="p-4 bg-indigo-950/30 border border-indigo-500/30 rounded-xl flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-indigo-300">
                    Batch Active
                  </span>
                  <span className="font-mono text-xs text-slate-400">
                    ID: {batchId}
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  Status:{" "}
                  <span
                    className={`font-semibold uppercase tracking-wider ${
                      queueStatus === "running"
                        ? "text-emerald-400"
                        : queueStatus === "completed"
                          ? "text-emerald-400"
                          : queueStatus === "paused"
                            ? "text-amber-400"
                            : "text-rose-400"
                    }`}
                  >
                    {queueStatus}
                  </span>
                </div>
              </div>

              {/* Control buttons */}
              <div className="flex items-center gap-2">
                {queueStatus === "running" ? (
                  <button
                    type="button"
                    onClick={handlePause}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    Pause
                  </button>
                ) : queueStatus === "paused" ? (
                  <button
                    type="button"
                    onClick={handleResume}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Resume
                  </button>
                ) : null}

                <button
                  type="button"
                  disabled={queueStatus === "stopped" || queueStatus === "completed"}
                  onClick={handleStop}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  Stop
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-800/80 bg-slate-950/70 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400 font-mono">
            {batchId ? (
              <span>
                Dispatched:{" "}
                <span className="text-white font-semibold">
                  {processedCount} / {validContacts.length}
                </span>
              </span>
            ) : (
              <span>
                Ready to call:{" "}
                <span className="text-white font-semibold">
                  {validContacts.length}
                </span>{" "}
                leads
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
            >
              {batchId ? "Close Window" : "Cancel"}
            </button>

            {!batchId && (
              <button
                type="button"
                onClick={handleInitiate}
                disabled={validContacts.length === 0 || isSubmitting}
                className="px-4 py-2 rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Initiating Batch...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Initiate Bulk Calls</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
