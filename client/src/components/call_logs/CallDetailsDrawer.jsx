import { useState } from "react";
import {
  X,
  Phone,
  Clock,
  Building2,
  Sparkles,
  Bot,
  User,
  Copy,
  Check,
  IndianRupee,
  Tag,
  AlertCircle,
} from "lucide-react";
import AnimatedAudioWaveform from "./AnimatedAudioWaveform";
import { CallStatusBadge, SentimentBadge } from "./CallStatusBadge";

export default function CallDetailsDrawer({ call, onClose, baseUrl }) {
  const [copiedTranscript, setCopiedTranscript] = useState(false);

  if (!call) return null;

  const turns = call.ai_insights?.conversation_turns || [];
  const recId = call.media?.recording_id;
  const audioStreamUrl = recId
    ? `${baseUrl}/api/v1/voice/recordings/${recId}.mp3`
    : null;
  const sentiment = call.ai_insights?.guest_sentiment || "positive";
  const durationSec = call.metrics?.duration_seconds || 0;

  // First user turn as snippet quote like Pic 3
  const firstUserTurn =
    turns.find((t) => t.speaker?.toLowerCase() === "user")?.text ||
    call.ai_insights?.summary;

  const copyTranscriptText = () => {
    const text = turns
      .map((t) => `[${t.speaker.toUpperCase()}]: ${t.text}`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  const formatDuration = (sec) => {
    if (!sec) return "0s";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
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
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-2xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
      {/* Drawer Header (Pic 2 / Pic 3 Header styling) */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70 shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 font-bold text-base shadow-sm">
            {(call.party_details?.guest_name || "G")[0]?.toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">
                {call.party_details?.guest_name || "Guest Call"}
              </h2>
              <CallStatusBadge
                status={call.disposition || call.call_status}
                call={call}
              />
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-400 mt-1">
              <span className="flex items-center gap-1 font-mono text-slate-300">
                <Phone className="w-3 h-3 text-indigo-400" />
                {call.telephony?.to_number || "—"}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-400">
                <Building2 className="w-3 h-3" />
                {call.party_details?.hotel_name || "Hotel"}
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

      {/* Drawer Body Scroll */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Badges / Pill Tags (Pic 3 Style) */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/10 border border-violet-500/25 text-violet-300 flex items-center gap-1.5">
            <Tag className="w-3 h-3 text-violet-400" />
            <span>Booking Inquiry</span>
          </span>

          <SentimentBadge sentiment={sentiment} />

          {call.party_details?.hotel_id && (
            <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-slate-800/80 border border-slate-700 text-slate-300">
              ID: {call.party_details.hotel_id}
            </span>
          )}
        </div>

        {/* Call Meta 4-Column Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 bg-slate-950/60 border border-slate-800/90 rounded-xl">
            <span className="text-[11px] text-slate-400 block mb-1">
              Duration
            </span>
            <span className="text-xs font-bold text-slate-100 flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3 text-violet-400" />
              {formatDuration(durationSec)}
            </span>
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-800/90 rounded-xl">
            <span className="text-[11px] text-slate-400 block mb-1">
              Total Cost
            </span>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 font-mono">
              <IndianRupee className="w-3 h-3" />
              {call.pricing?.total_cost ? `₹${call.pricing.total_cost}` : "—"}
            </span>
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-800/90 rounded-xl">
            <span className="text-[11px] text-slate-400 block mb-1">
              Direction
            </span>
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider font-mono">
              {call.telephony?.direction || "outbound"}
            </span>
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-800/90 rounded-xl">
            <span className="text-[11px] text-slate-400 block mb-1">Time</span>
            <span className="text-[11px] font-medium text-slate-300 block truncate">
              {formatDate(call.created_at)}
            </span>
          </div>
        </div>

        {/* Animated Purple Audio Waveform (Matching Pic 3) */}
        <div className="p-4 bg-slate-950/60 border border-slate-800/90 rounded-2xl flex flex-col gap-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
              Call Recording
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {recId ? `ID: ${recId.slice(0, 8)}...` : "Simulation mode"}
            </span>
          </div>

          <AnimatedAudioWaveform
            key={audioStreamUrl || "no-audio"}
            audioUrl={audioStreamUrl}
            snippetText={firstUserTurn}
            totalDurationSec={durationSec}
          />
        </div>

        {/* Failure / Hangup Cause Banner */}
        {(call.disposition === "failed" || call.call_status === "failed") && (
          <div className="p-4 bg-rose-950/20 border border-rose-500/25 rounded-2xl">
            <div className="flex items-center gap-2 mb-1.5 text-rose-400 font-semibold text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>Call Failed / Unsuccessful</span>
            </div>
            <p className="text-xs text-rose-300/90 leading-relaxed font-sans">
              {call.hangup?.cause === "failed_out_of_credits"
                ? "This call failed because Plivo API account credits have been exhausted."
                : call.hangup?.cause
                  ? `Reason: ${call.hangup.cause.replace(/_/g, " ")}`
                  : "Call failed to connect to the recipient's phone."}
            </p>
          </div>
        )}

        {/* AI Conversation Summary Card */}
        {call.ai_insights?.summary && (
          <div className="p-4 bg-linear-to-br from-violet-950/30 to-indigo-950/20 border border-violet-500/25 rounded-2xl">
            <div className="flex items-center gap-2 mb-2 text-violet-300 font-semibold text-xs">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span>AI Conversation Summary</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {call.ai_insights.summary}
            </p>
          </div>
        )}

        {/* Lead Inquiry Context */}
        {call.party_details?.guest_lead && (
          <div className="p-3.5 bg-slate-950/50 border border-slate-800/80 rounded-xl">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Guest Lead Context
            </span>
            <p className="text-xs text-slate-300 font-mono line-clamp-3">
              {call.party_details.guest_lead}
            </p>
          </div>
        )}

        {/* Full Conversation Transcript */}
        <div className="p-4 bg-slate-950/60 border border-slate-800/90 rounded-2xl flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white flex items-center gap-2">
              <span>Full Conversation Transcript</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-mono">
                {turns.length} turns
              </span>
            </span>

            {turns.length > 0 && (
              <button
                type="button"
                onClick={copyTranscriptText}
                className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-white px-2.5 py-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {copiedTranscript ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            )}
          </div>

          {turns.length > 0 ? (
            <div className="space-y-3 pt-1">
              {turns.map((turn, i) => {
                const isAgent = turn.speaker?.toLowerCase() === "agent";
                return (
                  <div
                    key={turn.turn_index || i}
                    className={`flex gap-3 text-xs ${
                      isAgent ? "items-start" : "items-start flex-row-reverse"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                        isAgent
                          ? "bg-violet-600/20 text-violet-400 border border-violet-500/30"
                          : "bg-slate-800 text-slate-300 border border-slate-700"
                      }`}
                    >
                      {isAgent ? (
                        <Bot className="w-3.5 h-3.5" />
                      ) : (
                        <User className="w-3.5 h-3.5" />
                      )}
                    </div>

                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                        isAgent
                          ? "bg-slate-900 border border-slate-800 text-slate-200"
                          : "bg-violet-600/15 border border-violet-500/25 text-violet-100"
                      }`}
                    >
                      <div className="text-[10px] font-semibold text-slate-400 mb-1 flex items-center gap-2">
                        <span>
                          {isAgent
                            ? "StayChat AI Voice Agent"
                            : call.party_details?.guest_name || "Guest"}
                        </span>
                        <span>• #{turn.turn_index || i + 1}</span>
                      </div>
                      <p>{turn.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-400">
              No turn transcript found for this session.
            </div>
          )}
        </div>

        {/* Technical Call Identifiers Footer */}
        <div className="p-3 bg-slate-950/40 border border-slate-800/60 rounded-xl space-y-1.5 text-[11px] text-slate-400 font-mono">
          <div className="flex justify-between">
            <span>Call UUID:</span>
            <span className="text-slate-300 truncate max-w-65">
              {call.identifiers?.call_uuid || "—"}
            </span>
          </div>
          {call.pricing?.breakdown_explanation && (
            <div className="flex justify-between pt-1 border-t border-slate-800/60">
              <span>Billing Details:</span>
              <span className="text-slate-300 text-right">
                {call.pricing.breakdown_explanation}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
