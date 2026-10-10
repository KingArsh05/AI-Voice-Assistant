import { CheckCircle2, PhoneMissed, Clock, AlertCircle } from "lucide-react";

export function CallStatusBadge({ status, call }) {
  let norm = (status || "").toLowerCase();

  // If status is still 'pending' or 'initiated', but recording or transcript exists, treat as completed
  const hasRecording = Boolean(call?.media?.recording_id || call?.recording_url);
  const hasTurns = Boolean(call?.ai_insights?.conversation_turns?.length > 0);
  const hasDuration = (call?.metrics?.duration_seconds || 0) > 0;

  if (
    (norm === "pending" || norm === "initiated" || !norm) &&
    (hasRecording || hasTurns || hasDuration)
  ) {
    norm = "completed";
  }

  if (norm === "answered" || norm === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
        <span>Completed</span>
      </span>
    );
  }

  if (norm === "busy" || norm === "rejected" || norm === "failed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/25">
        <PhoneMissed className="w-3 h-3 text-rose-400" />
        <span className="capitalize">{norm}</span>
      </span>
    );
  }

  if (norm === "no_answer" || norm === "unanswered") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/25">
        <AlertCircle className="w-3 h-3 text-amber-400" />
        <span>No Answer</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800/80 text-slate-400 border border-slate-700">
      <Clock className="w-3 h-3 text-slate-400" />
      <span className="capitalize">{norm || "Logged"}</span>
    </span>
  );
}

export function SentimentBadge({ sentiment }) {
  const s = (sentiment || "neutral").toLowerCase();
  if (s === "positive") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
        <span>☺</span> Positive
      </span>
    );
  }
  if (s === "negative") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 border border-rose-500/25 text-rose-400">
        <span>☹</span> Negative
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 border border-slate-700 text-slate-300">
      Neutral
    </span>
  );
}
