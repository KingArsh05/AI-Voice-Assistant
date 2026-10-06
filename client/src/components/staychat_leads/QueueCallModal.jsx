import { useState } from "react";
import {
  ListOrdered,
  X,
  Play,
  Loader2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Building2,
  CheckCircle2,
} from "lucide-react";

export default function QueueCallModal({
  selectedLeads,
  hotelId,
  hotelName,
  onClose,
  onQueueSuccess,
}) {
  const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const [campaignName, setCampaignName] = useState(
    `StayChat Queue • ${hotelName || "Hotel"} • ${new Date().toLocaleDateString()}`
  );
  const [fromNumber, setFromNumber] = useState("+918031825752");
  const [cooldownSeconds, setCooldownSeconds] = useState(15);
  const [maxDuration, setMaxDuration] = useState(210);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [campaignResult, setCampaignResult] = useState(null);

  const extractCleanName = (nameStr, phone, fallbackIndex) => {
    if (!nameStr) return `Guest (${phone.slice(-4) || fallbackIndex})`;
    const cleaned = nameStr.replace(/^[^\w\s\u0900-\u097F]+|[^\w\s\u0900-\u097F]+$/g, "").trim();
    if (!cleaned || cleaned.length < 2) {
      return `Guest (${phone.slice(-4) || fallbackIndex})`;
    }
    return cleaned;
  };

  const validLeads = selectedLeads
    .map((l, idx) => {
      const rawPhone = l.phone || l.stayDetails?.contactPhone || l.conversationId || "";
      const cleaned = rawPhone ? (rawPhone.startsWith("+") ? rawPhone : `+${rawPhone}`) : "";
      const name = extractCleanName(l.stayDetails?.guestName, cleaned, idx + 1);
      const details = l.summary || "StayChat prospective booking lead follow-up.";
      return {
        serial: idx + 1,
        guest_name: name,
        phone_number: cleaned,
        lead_details: details,
      };
    })
    .filter((l) => l.phone_number.length >= 8);

  const handleCreateQueue = async (e) => {
    e.preventDefault();
    if (validLeads.length === 0) {
      setError("None of the selected leads have valid phone numbers.");
      return;
    }

    setLoading(true);
    setError("");

    const payload = {
      name: campaignName.trim(),
      hotel_id: hotelId || null,
      from_number: fromNumber.trim(),
      persona: "lead_followup",
      cooldown_seconds: Number(cooldownSeconds) || 10,
      max_call_duration_seconds: Number(maxDuration) || 210,
      max_retries: 0,
      leads: validLeads,
    };

    try {
      const res = await fetch(`${backendUrl}/api/v1/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success && data.campaign) {
        setCampaignResult(data.campaign);
        if (onQueueSuccess) onQueueSuccess(data.campaign);
      } else {
        setError(data.message || data.error || "Failed to create queue campaign.");
      }
    } catch (err) {
      console.error("Queue campaign error:", err);
      setError("Network error starting bulk campaign.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-slate-200 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-2xl">
            <ListOrdered className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Queue Batch Voice Calls
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/25">
                {validLeads.length} Leads
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Run sequential outbound AI follow-up with configurable delay.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {campaignResult ? (
          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 space-y-3 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" />
            <h3 className="font-semibold text-white">Campaign Dispatched to Queue!</h3>
            <p className="text-xs text-emerald-200/80">
              Campaign ID:{" "}
              <span className="font-mono text-white font-medium">
                {campaignResult.campaign_id}
              </span>
            </p>
            <p className="text-xs text-slate-400">
              {validLeads.length} leads are queued and will be processed in background with a{" "}
              {cooldownSeconds}s cooldown between calls.
            </p>
            <button
              onClick={onClose}
              className="mt-3 w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-xl text-xs transition"
            >
              Close & View CRM
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreateQueue} className="space-y-4">
            {/* Target hotel summary */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Building2 className="w-4 h-4 text-violet-400" />
                <span className="font-medium text-white">{hotelName || "Hotel Sahu"}</span>
              </div>
              <span className="font-mono text-[11px] text-slate-400">ID: {hotelId}</span>
            </div>

            {/* Campaign Name */}
            <div>
              <label className="text-[11px] font-medium text-slate-400 mb-1 block">
                Queue Campaign Name
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-violet-500 transition"
                required
              />
            </div>

            {/* Caller Number */}
            <div>
              <label className="text-[11px] font-medium text-slate-400 mb-1 block">
                Caller ID (Plivo Outbound Number)
              </label>
              <input
                type="text"
                value={fromNumber}
                onChange={(e) => setFromNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 focus:outline-none focus:border-violet-500 transition"
                required
              />
            </div>

            {/* Cooldown and Max Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1 block flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-violet-400" /> Cooldown Between Calls
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={5}
                    max={300}
                    value={cooldownSeconds}
                    onChange={(e) => setCooldownSeconds(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-violet-500 transition"
                    required
                  />
                  <span className="absolute right-3 top-2 text-[11px] text-slate-500">sec</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1 block flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-violet-400" /> Max Call Duration
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={60}
                    max={600}
                    value={maxDuration}
                    onChange={(e) => setMaxDuration(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-violet-500 transition"
                    required
                  />
                  <span className="absolute right-3 top-2 text-[11px] text-slate-500">sec</span>
                </div>
              </div>
            </div>

            {/* Selected Leads Preview */}
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Queue Preview</span>
                <span>{validLeads.length} valid recipients</span>
              </div>
              <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                {validLeads.slice(0, 5).map((l, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900 border border-slate-800/80 text-[11px]"
                  >
                    <span className="font-medium text-slate-200">{l.guest_name}</span>
                    <span className="font-mono text-slate-400 text-[10px]">
                      {l.phone_number}
                    </span>
                  </div>
                ))}
                {validLeads.length > 5 && (
                  <p className="text-[10px] text-slate-500 text-center pt-1">
                    + {validLeads.length - 5} more leads
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || validLeads.length === 0}
                className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-600/25 flex items-center gap-2 transition disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Launching Queue...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Launch Queue ({validLeads.length})</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
