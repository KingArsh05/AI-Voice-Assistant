import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  Phone,
  Building2,
  Sparkles,
  PhoneForwarded,
  Copy,
  Check,
} from "lucide-react";
import CRMIntentBadge from "./CRMIntentBadge";

export default function CRMLeadDrawer({ lead, onClose, onCallClick }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  if (!lead) return null;

  const guestName = lead.guest_name || "Guest";
  const phoneNumber = lead.phone_number || "—";
  const summary = lead.summary || "No lead details recorded for this guest.";

  const handleCopyPhone = () => {
    if (lead.phone_number) {
      navigator.clipboard.writeText(lead.phone_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCallGuest = () => {
    if (onCallClick) {
      onCallClick(lead);
      return;
    }
    // Fallback: Navigate directly to single call prefilling the lead
    navigate("/make-single-call", {
      state: {
        to_number: lead.phone_number,
        guest_name: guestName,
        hotel_id: lead.hotel_id,
        guest_lead: summary,
      },
    });
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return "—";
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70 shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-base shadow-sm">
            {guestName[0]?.toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">{guestName}</h2>
              <CRMIntentBadge intent={lead.primary_intent} />
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-400 mt-1">
              <span className="flex items-center gap-1 font-mono text-slate-300">
                <Phone className="w-3 h-3 text-indigo-400" />
                {phoneNumber}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-400">
                <Building2 className="w-3 h-3" />
                Hotel ID: {lead.hotel_id || "—"}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Quick Action Button Bar */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleCallGuest}
            className="flex-1 h-10 rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 active:scale-95 transition-all cursor-pointer"
          >
            <PhoneForwarded className="w-4 h-4" />
            <span>Launch Outbound Call</span>
          </button>

          <button
            type="button"
            onClick={handleCopyPhone}
            className="h-10 px-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy #</span>
              </>
            )}
          </button>
        </div>

        {/* Lead Inquiry & Summary Card */}
        <div className="p-4 bg-linear-to-br from-indigo-950/30 to-violet-950/20 border border-indigo-500/25 rounded-2xl">
          <div className="flex items-center gap-2 mb-2 text-indigo-300 font-semibold text-xs">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>CRM Lead Summary & Context</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
            {summary}
          </p>
        </div>

        {/* Lead Metadata Info List */}
        <div className="p-4 bg-slate-950/60 border border-slate-800/90 rounded-2xl space-y-3">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider text-[11px]">
            Lead Details
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-[11px] text-slate-400 block mb-0.5">Primary Intent</span>
              <span className="font-semibold text-slate-200 capitalize">
                {lead.primary_intent || "General"}
              </span>
            </div>

            <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-[11px] text-slate-400 block mb-0.5">Hotel ID</span>
              <span className="font-mono text-slate-200 font-semibold">
                {lead.hotel_id || "—"}
              </span>
            </div>

            <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl col-span-2">
              <span className="text-[11px] text-slate-400 block mb-0.5">Last Updated</span>
              <span className="text-slate-300 font-mono text-[11px]">
                {formatDate(lead.last_updated)}
              </span>
            </div>
          </div>
        </div>

        {/* Document Identifier */}
        <div className="p-3 bg-slate-950/40 border border-slate-800/60 rounded-xl flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>CRM Document ID:</span>
          <span className="text-slate-300">{lead._id}</span>
        </div>
      </div>
    </div>
  );
}
