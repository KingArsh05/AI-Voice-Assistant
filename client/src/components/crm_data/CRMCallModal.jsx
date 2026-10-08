import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  X,
  PhoneForwarded,
  User,
  Phone,
  Building2,
  FileText,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import CRMIntentBadge from "./CRMIntentBadge";

export default function CRMCallModal({ lead, isOpen, onClose, onSuccess }) {
  const [isCalling, setIsCalling] = useState(false);
  const [callSuccessData, setCallSuccessData] = useState(null);
  const BASE_URL = import.meta.env.VITE_BASE_URL;

  if (!isOpen || !lead) return null;

  const guestName = lead.guest_name || "Guest";
  const rawNumber = String(lead.phone_number || "").trim();
  // Ensure formatted number with country code
  const formattedNumber = rawNumber.startsWith("+")
    ? rawNumber
    : rawNumber.length === 10
    ? `+91${rawNumber}`
    : rawNumber.startsWith("91") && rawNumber.length === 12
    ? `+${rawNumber}`
    : rawNumber ? `+91${rawNumber}` : "";

  const hotelId = lead.hotel_id || "111111";
  const leadSummary = lead.summary || "No specific conversation context recorded.";

  const handleConfirmCall = async () => {
    if (!formattedNumber) {
      toast.error("Invalid or missing phone number for this guest");
      return;
    }

    setIsCalling(true);
    setCallSuccessData(null);

    const payload = {
      to_number: formattedNumber,
      guest_name: guestName,
      hotel_id: hotelId,
      guest_lead: leadSummary,
      dry_run: false,
    };

    try {
      const response = await axios.post(`${BASE_URL}/api/v1/voice/call`, payload, {
        headers: { "Content-Type": "application/json" },
      });

      if (response.data && response.data.success) {
        const data = response.data.data;
        setCallSuccessData(data);
        toast.success(`🚀 Call initiated to ${guestName}!`, { icon: "📞" });
        if (onSuccess) onSuccess(data);
      } else {
        throw new Error(response.data?.message || "Failed to initiate call");
      }
    } catch (err) {
      console.error("CRM Single Call Error:", err);
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.msg ||
        err.message ||
        "Failed to place call to guest";
      toast.error(`❌ ${errMsg}`);
    } finally {
      setIsCalling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Gradient Accent */}
        <div className="h-1.5 w-full bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500" />

        {/* Modal Header */}
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shadow-inner">
              <PhoneForwarded className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Initiate Outbound Call
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Confirm guest details before dispatching the AI Voice Agent
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isCalling}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4 text-xs">
          {callSuccessData ? (
            /* Success State */
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col items-center text-center gap-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-emerald-400">Call Dispatched!</h4>
              <p className="text-xs text-slate-300">
                The Plivo CX Voice Assistant is currently dialing{" "}
                <span className="font-mono font-semibold text-white">{formattedNumber}</span>.
              </p>
              {callSuccessData.call_uuid && (
                <div className="mt-2 text-[11px] font-mono text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
                  Call UUID: {callSuccessData.call_uuid}
                </div>
              )}
            </div>
          ) : (
            /* Normal Confirmation Info */
            <>
              {/* Guest & Phone Card */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                    <User className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Guest Name</span>
                  </div>
                  <div className="text-white font-semibold text-sm truncate">{guestName}</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Dial Number</span>
                  </div>
                  <div className="text-white font-mono font-semibold text-sm truncate">
                    {formattedNumber || "Missing Number"}
                  </div>
                </div>
              </div>

              {/* Hotel & Intent */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                      <Building2 className="w-3.5 h-3.5 text-sky-400" />
                      <span>Property ID</span>
                    </div>
                    <div className="text-white font-mono font-semibold text-xs">{hotelId}</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80 flex flex-col justify-between">
                  <div className="text-slate-400 text-[11px] mb-1">Intent Category</div>
                  <div>
                    <CRMIntentBadge intent={lead.primary_intent} />
                  </div>
                </div>
              </div>

              {/* Lead Context Summary Box */}
              <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Lead Context Passed to AI Prompt</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/60 text-slate-300 text-[11px] leading-relaxed max-h-28 overflow-y-auto font-sans">
                  {leadSummary}
                </div>
              </div>

              {/* Advisory note */}
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px]">
                <AlertTriangle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  The voice agent will introduce itself, acknowledge this prior inquiry, and guide the guest directly through the conversion flow.
                </span>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-end gap-3">
          {callSuccessData ? (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              Done
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isCalling}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCall}
                disabled={isCalling || !formattedNumber}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isCalling ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Dialing...</span>
                  </>
                ) : (
                  <>
                    <PhoneForwarded className="w-3.5 h-3.5" />
                    <span>Confirm & Place Call</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
