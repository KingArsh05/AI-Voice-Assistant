import { useState, useEffect } from "react";
import {
  PhoneCall,
  X,
  User,
  Phone,
  Building2,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default function SingleCallModal({
  lead,
  hotelId,
  hotelName,
  onClose,
  onCallSuccess,
}) {
  const backendUrl = import.meta.env.VITE_API_URL;

  // Format phone number to clean E.164
  const rawPhone = lead?.phone || lead?.stayDetails?.contactPhone || lead?.conversationId || "";
  const cleanedPhone = rawPhone
    ? rawPhone.startsWith("+")
      ? rawPhone
      : `+${rawPhone}`
    : "";

  // Helper to extract a human-readable clean guest name
  const extractCleanName = (nameStr, phone) => {
    if (!nameStr) return `Guest (${phone.slice(-4) || "Lead"})`;
    // Remove emojis, symbols, and excess whitespace
    const cleaned = nameStr.replace(/^[^\w\s\u0900-\u097F]+|[^\w\s\u0900-\u097F]+$/g, "").trim();
    if (!cleaned || cleaned.length < 2) {
      return `Guest (${phone.slice(-4) || "Lead"})`;
    }
    return cleaned;
  };

  const defaultGuestName = extractCleanName(lead?.stayDetails?.guestName, cleanedPhone);

  const defaultLeadNotes =
    lead?.summary ||
    "Prospective guest inquiring about room availability, tariff rates, and reservation confirmation.";

  const [guestName, setGuestName] = useState(defaultGuestName);
  const [phoneNumber, setPhoneNumber] = useState(cleanedPhone);
  const [fromNumber, setFromNumber] = useState("+918031825752");
  const [leadNotes, setLeadNotes] = useState(defaultLeadNotes);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successResult, setSuccessResult] = useState(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleDispatchCall = async (e) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      setError("Valid destination phone number is required.");
      return;
    }

    setLoading(true);
    setError("");

    const payload = {
      guest_name: guestName.trim(),
      from_number: fromNumber.trim(),
      to_number: phoneNumber.trim(),
      persona: "lead_followup",
      guest_lead: leadNotes.trim(),
      hotel_id: hotelId || null,
    };

    try {
      const res = await fetch(`${backendUrl}/api/v1/voice/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();

      if (res.ok && resData.success) {
        setSuccessResult(resData);
        if (onCallSuccess) onCallSuccess(resData);
      } else {
        setError(resData.message || resData.error || "Failed to trigger voice agent.");
      }
    } catch (err) {
      console.error("Error dispatching call:", err);
      setError("Network error while dispatching call to voice server.");
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
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl">
            <PhoneCall className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Dispatch AI Voice Agent
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                Plivo CX
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Trigger outbound reservation follow-up with dynamic hotel knowledge base.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {successResult ? (
          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 space-y-3 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" />
            <h3 className="font-semibold text-white">Call Dispatched Successfully!</h3>
            <p className="text-xs text-emerald-200/80">
              Plivo CX flow has been triggered. Trigger ID:{" "}
              <span className="font-mono font-medium text-white">
                {successResult.data?.trigger_id || successResult.trigger_id || "Active"}
              </span>
            </p>
            <button
              onClick={onClose}
              className="mt-2 w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-xl text-xs transition"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleDispatchCall} className="space-y-4">
            {/* Hotel context indicator */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Building2 className="w-4 h-4 text-indigo-400" />
                <span className="font-medium text-white">{hotelName || "Hotel Sahu"}</span>
              </div>
              <span className="font-mono text-[11px] text-slate-400">ID: {hotelId}</span>
            </div>

            {/* Guest Name & To Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1 block flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-400" /> Guest Name
                </label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                  placeholder="Guest name"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1 block flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-indigo-400" /> Destination Phone
                </label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-indigo-500 transition"
                  placeholder="+91..."
                  required
                />
              </div>
            </div>

            {/* Caller ID */}
            <div>
              <label className="text-[11px] font-medium text-slate-400 mb-1 block">
                Outbound Caller ID (Plivo Number)
              </label>
              <input
                type="text"
                value={fromNumber}
                onChange={(e) => setFromNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 focus:outline-none focus:border-indigo-500 transition"
                required
              />
            </div>

            {/* Lead Context / AI Prompt Brief */}
            <div>
              <label className="text-[11px] font-medium text-slate-400 mb-1 block flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-400" /> Lead Enquiry & Context
              </label>
              <textarea
                rows={4}
                value={leadNotes}
                onChange={(e) => setLeadNotes(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition resize-none leading-relaxed"
                placeholder="Details of inquiry, dates, guest count..."
              />
              <p className="text-[10px] text-slate-500 mt-1">
                This context is injected into Plivo CX as <code className="text-indigo-400">&#123;&#123;guest_lead&#125;&#125;</code> for natural dialogue.
              </p>
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
                disabled={loading}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/25 flex items-center gap-2 transition disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Triggering Call...</span>
                  </>
                ) : (
                  <>
                    <PhoneCall className="w-4 h-4" />
                    <span>Call Lead Now</span>
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
