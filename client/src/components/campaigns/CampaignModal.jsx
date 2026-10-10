import { useState, useMemo } from "react";
import {
  X,
  Megaphone,
  Sparkles,
  Play,
  Pause,
  Square,
  Clock,
  RotateCcw,
} from "lucide-react";
import { StandaloneStepper } from "../common/FormControl";
import {
  CAMPAIGN_QUEUE_STATUS,
  CAMPAIGN_PRESETS,
} from "./campaignTypes";
import { useCampaignQueue } from "./useCampaignQueue";
import { CampaignRecipientList } from "./CampaignRecipientList";

export default function CampaignModal({
  isOpen,
  onClose,
  selectedLeads = [],
  hotels = [],
  onSuccess,
}) {
  const BASE_URL = import.meta.env.VITE_BASE_URL;

  // Selected Campaign Strategy Preset
  const [selectedPresetId, setSelectedPresetId] = useState("special_event");

  // Campaign Form State
  const [campaignName, setCampaignName] = useState("Festive & Special Event Campaign");
  const [campaignSubject, setCampaignSubject] = useState(
    CAMPAIGN_PRESETS[0].defaultSubject
  );
  const [campaignMessage, setCampaignMessage] = useState(
    CAMPAIGN_PRESETS[0].defaultMessage
  );
  const [rateLimitSeconds, setRateLimitSeconds] = useState(2.0);

  // Fallback Hotel ID for leads without hotel_id
  const defaultHotelId = useMemo(() => {
    const leadHotels = [
      ...new Set(
        selectedLeads
          .map((l) => l.hotel_id)
          .filter((h) => h && h !== "—" && h !== "None")
      ),
    ];
    if (leadHotels.length === 1 && leadHotels[0]) return String(leadHotels[0]);
    if (hotels.length > 0) return String(hotels[0].hotel_id);
    return "111111";
  }, [selectedLeads, hotels]);

  const [targetHotelId, setTargetHotelId] = useState(() => defaultHotelId);

  // Hook-driven queue execution logic
  const {
    queueStatus,
    campaignId,
    processedCount,
    contactStatuses,
    startQueue,
    pauseQueue,
    resumeQueue,
    stopQueue,
    resetQueue,
  } = useCampaignQueue({
    baseUrl: BASE_URL,
    onComplete: onSuccess,
  });

  // Prepare normalized contacts list
  const validContacts = useMemo(() => {
    return selectedLeads
      .map((lead) => {
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
          guest_lead: lead.summary || "",
          hotel_id: lead.hotel_id && lead.hotel_id !== "—" ? lead.hotel_id : targetHotelId,
          to_number: formattedNumber,
          original_lead: lead,
        };
      })
      .filter((c) => Boolean(c.to_number));
  }, [selectedLeads, targetHotelId]);

  const totalCount = validContacts.length;
  const progressPercent =
    totalCount > 0 ? Math.min(100, Math.round((processedCount / totalCount) * 100)) : 0;

  const isRunning = queueStatus === CAMPAIGN_QUEUE_STATUS.RUNNING;
  const isPaused = queueStatus === CAMPAIGN_QUEUE_STATUS.PAUSED;
  const isStopped = queueStatus === CAMPAIGN_QUEUE_STATUS.STOPPED;
  const isCompleted = queueStatus === CAMPAIGN_QUEUE_STATUS.COMPLETED;
  const isIdle = queueStatus === CAMPAIGN_QUEUE_STATUS.IDLE;

  // Handle Preset Switching
  const handleSelectPreset = (preset) => {
    if (!isIdle) return;
    setSelectedPresetId(preset.id);
    if (preset.id !== "custom") {
      setCampaignName(preset.label);
      setCampaignSubject(preset.defaultSubject);
      setCampaignMessage(preset.defaultMessage);
    }
  };

  const handleStartCampaign = () => {
    // Construct batch campaign payload destined for backend
    const campaignBatchPayload = {
      campaign_name: campaignName,
      campaign_subject: campaignSubject,
      campaign_message: campaignMessage,
      target_hotel_id: targetHotelId,
      rate_limit_seconds: rateLimitSeconds,
      total_recipients: validContacts.length,
      recipients: validContacts.map((contact) => ({
        to_number: contact.to_number,
        guest_name: contact.guest_name,
        hotel_id: contact.hotel_id,
        guest_lead: contact.guest_lead,
        composed_prompt: `[Campaign: ${campaignName || "Hotel Promotion"}] ${
          campaignSubject ? `Subject: ${campaignSubject}. ` : ""
        }${campaignMessage}. ${
          contact.guest_lead ? `Previous guest context: ${contact.guest_lead}` : ""
        }`,
      })),
    };

    console.log("================== [CAMPAIGN BATCH PAYLOAD] ==================");
    console.log(campaignBatchPayload);
    console.log("==============================================================");
  };

  const handleCloseModal = () => {
    if (isRunning) {
      if (
        !window.confirm(
          "Campaign is currently running. Closing this modal will stop further calls. Are you sure?"
        )
      ) {
        return;
      }
      stopQueue();
    }
    resetQueue();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
        onClick={handleCloseModal}
      />

      {/* Main Dialog Card */}
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-600/20 text-violet-400 rounded-xl border border-violet-500/30">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Launch Voice Campaign
                <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-xs font-mono font-semibold">
                  {selectedLeads.length} Selected
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Broadcast unified event & promotion updates with personalized AI context
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCloseModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto min-h-0 flex-1">
          {/* Preset Pills */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              Campaign Objective & Theme
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CAMPAIGN_PRESETS.map((p) => {
                const isActive = selectedPresetId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={!isIdle}
                    onClick={() => handleSelectPreset(p)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isActive
                        ? "bg-violet-600/20 border-violet-500 text-white shadow-xs"
                        : "bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                    } ${!isIdle ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <div className="text-xs font-medium truncate">{p.label}</div>
                    <span className="inline-block mt-1 text-[10px] px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-400 font-mono">
                      {p.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Campaign Content Formulation */}
          <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-3.5">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Campaign Name
              </label>
              <input
                type="text"
                disabled={!isIdle}
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g. Autumn Staycation Special"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-violet-500 transition-colors disabled:opacity-60"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Campaign Subject / Announcement Hook
              </label>
              <input
                type="text"
                disabled={!isIdle}
                value={campaignSubject}
                onChange={(e) => setCampaignSubject(e.target.value)}
                placeholder="Brief topic introduced to the guest"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-violet-500 transition-colors disabled:opacity-60"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Unified Message & Value Proposition (Provided to AI Voice Agent)
              </label>
              <textarea
                rows={3}
                disabled={!isIdle}
                value={campaignMessage}
                onChange={(e) => setCampaignMessage(e.target.value)}
                placeholder="Describe the new event, upgraded amenities, or special rates the AI will discuss with the guest..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-violet-500 transition-colors resize-none disabled:opacity-60"
              />
            </div>

            {/* Pacing Controls */}
            <div className="pt-1 flex items-center justify-between border-t border-slate-800/60 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Pacing Delay between Calls
              </span>
              <div className="w-32">
                <StandaloneStepper
                  value={rateLimitSeconds}
                  onChange={setRateLimitSeconds}
                  min={1}
                  max={10}
                  step={0.5}
                  unit="s"
                  disabled={!isIdle}
                />
              </div>
            </div>
          </div>

          {/* Batch Progress Bar (Active when queue is engaged) */}
          {!isIdle && (
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white tracking-wide">
                    Campaign Progress
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    ({processedCount} of {totalCount} dispatched)
                  </span>
                </div>
                <div className="font-mono font-bold text-indigo-400">
                  {progressPercent}%
                </div>
              </div>

              {/* Visual Progress Bar in site Indigo style */}
              <div className="w-full h-2 bg-slate-900 border border-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Queue Recipients Breakdown with Realtime Status Badges */}
          <CampaignRecipientList
            contacts={validContacts}
            contactStatuses={contactStatuses}
            campaignId={campaignId}
          />

          {/* Queue State Controller Bar */}
          {!isIdle && (
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Status:</span>
                <span
                  className={`font-mono font-bold uppercase tracking-wider text-[11px] ${
                    isRunning
                      ? "text-indigo-400 animate-pulse"
                      : isPaused
                      ? "text-amber-400"
                      : isCompleted
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }`}
                >
                  {queueStatus}
                </span>
                {campaignId && (
                  <span className="text-slate-600 font-mono text-[11px]">
                    ID: {campaignId}
                  </span>
                )}
              </div>

              {/* Pause / Resume / Stop action buttons */}
              <div className="flex items-center gap-2">
                {isRunning && (
                  <button
                    type="button"
                    onClick={pauseQueue}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Pause className="w-3 h-3" /> Pause
                  </button>
                )}

                {isPaused && (
                  <button
                    type="button"
                    onClick={resumeQueue}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Play className="w-3 h-3" /> Resume
                  </button>
                )}

                {(isRunning || isPaused) && (
                  <button
                    type="button"
                    onClick={stopQueue}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Square className="w-3 h-3" /> Stop
                  </button>
                )}

                {(isStopped || isCompleted) && (
                  <button
                    type="button"
                    onClick={resetQueue}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 font-mono">
            Dispatched: {processedCount} / {totalCount}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
            >
              {isCompleted ? "Close" : "Cancel"}
            </button>

            {isIdle && (
              <button
                type="button"
                disabled={validContacts.length === 0 || !campaignMessage.trim()}
                onClick={handleStartCampaign}
                className="px-4.5 py-2 rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-violet-600/30 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Megaphone className="w-4 h-4" />
                <span>Launch Campaign ({validContacts.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
