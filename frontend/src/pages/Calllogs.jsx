import { useEffect, useMemo, useState } from "react";
import {
  Search, AlertTriangle, X, CheckCircle2, PhoneCall,
  MessageCircle, Sheet, Sparkles, Clock, Target, ListChecks, Info
} from "lucide-react";
import { getCallLogs, OUTCOME_LABELS, BLOCKER_LABELS } from "../services/api";

// ---------------------------------------------------------------------------
// Render inline markdown formatting & rate highlights safely
// ---------------------------------------------------------------------------
function renderFormattedInline(text) {
  if (!text) return null;

  // Split on bold (**...**), italics (*...*), or prices/rates (₹... or ...% GST)
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|(?:₹[\d,]+(?:\/[a-zA-Z]+)?)|(?:\d+%\s*GST))/g);
  return parts.map((part, idx) => {
    if (!part) return null;
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={idx} className="font-semibold text-slate-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={idx} className="italic text-slate-700 dark:text-slate-200">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (/^₹[\d,]+/.test(part) || /^\d+%\s*GST/i.test(part)) {
      return (
        <span
          key={idx}
          className="inline-flex items-center rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

// ---------------------------------------------------------------------------
// Parse raw AI call summary into structured sections
// ---------------------------------------------------------------------------
function parseCallSummary(raw) {
  if (!raw || typeof raw !== "string") return null;
  const text = raw.trim();
  if (!text) return null;

  // Header tokens we expect from Plivo AI
  const sectionHeaders = [
    "Main Topic",
    "Key Points",
    "Outcome/Resolution",
    "Outcome",
    "Resolution",
    "Important Details",
    "Next Steps",
    "Action Items",
    "Summary"
  ];

  // Regex pattern matching `**Header:**` or `**Header**`
  const headerRegex = new RegExp(`(\\*\\*(?:${sectionHeaders.join("|")}):?\\*\\*)`, "i");

  if (!headerRegex.test(text)) {
    // If not structured with bold headers, check for bullets
    if (text.includes("•") || text.includes("\n- ") || text.includes("\n* ")) {
      const items = text
        .split(/(?:•|\n- |\n\* )/)
        .map((s) => s.trim())
        .filter(Boolean);
      return { type: "bullets", items };
    }
    return { type: "plain", text };
  }

  // Split text by the bold header tokens
  const splitRegex = new RegExp(`(\\*\\*(?:${sectionHeaders.join("|")}):?\\*\\*)`, "gi");
  const rawChunks = text.split(splitRegex).filter(Boolean);

  const sections = [];
  let pendingHeader = "Overview";

  for (let i = 0; i < rawChunks.length; i++) {
    const chunk = rawChunks[i].trim();
    if (!chunk) continue;

    if (splitRegex.test(chunk)) {
      pendingHeader = chunk.replace(/\*\*/g, "").replace(/:$/, "").trim();
    } else {
      let content = chunk;
      // Strip leading punctuation/whitespace
      if (content.startsWith(":")) content = content.slice(1).trim();

      // Check if this content contains bullets
      if (content.includes("•") || content.includes(" - ") || content.startsWith("- ")) {
        const items = content
          .split(/(?:•|\s-\s|\n-\s|^-\s)/)
          .map((b) => b.trim().replace(/^[-•*]\s*/, ""))
          .filter(Boolean);

        sections.push({
          header: pendingHeader,
          type: "list",
          items,
        });
      } else {
        sections.push({
          header: pendingHeader,
          type: "text",
          content: content.trim(),
        });
      }
      pendingHeader = "";
    }
  }

  return { type: "structured", sections };
}

// ---------------------------------------------------------------------------
// CallSummaryView: Presentable, executive AI Summary Card
// ---------------------------------------------------------------------------
function CallSummaryView({ summary, outcome, duration }) {
  const parsed = parseCallSummary(summary);

  const getHeaderIcon = (header = "") => {
    const h = header.toLowerCase();
    if (h.includes("topic")) return <Target className="h-4 w-4 text-indigo-500" />;
    if (h.includes("key") || h.includes("point")) return <ListChecks className="h-4 w-4 text-emerald-500" />;
    if (h.includes("outcome") || h.includes("resolution")) return <CheckCircle2 className="h-4 w-4 text-teal-500" />;
    if (h.includes("important") || h.includes("detail")) return <Info className="h-4 w-4 text-amber-500" />;
    return <Sparkles className="h-4 w-4 text-violet-500" />;
  };

  const getSectionBadgeColor = (header = "") => {
    const h = header.toLowerCase();
    if (h.includes("topic")) return "border-indigo-500/20 bg-indigo-500/5 text-indigo-700 dark:text-indigo-300";
    if (h.includes("key") || h.includes("point")) return "border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300";
    if (h.includes("outcome") || h.includes("resolution")) return "border-teal-500/20 bg-teal-500/5 text-teal-700 dark:text-teal-300";
    if (h.includes("important") || h.includes("detail")) return "border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-300";
    return "border-violet-500/20 bg-violet-500/5 text-violet-700 dark:text-violet-300";
  };

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-600/10 text-violet-600 dark:bg-violet-400/10 dark:text-violet-400">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            AI Call Summary
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
              OUTCOME_STYLES[outcome] || "bg-slate-100 text-slate-600"
            }`}
          >
            {OUTCOME_LABELS[outcome] || outcome || "Completed"}
          </span>
          {duration && (
            <span className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
              <Clock className="h-3 w-3" />
              {duration}s
            </span>
          )}
        </div>
      </div>

      {/* Summary Content Body */}
      <div className="mt-3.5 space-y-3">
        {!parsed ? (
          <p className="text-xs text-slate-500 italic dark:text-slate-400">
            Call logged via Plivo. Summary will appear once post-call processing completes.
          </p>
        ) : parsed.type === "structured" && parsed.sections.length > 0 ? (
          parsed.sections.map((sec, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 transition-colors dark:border-white/5 dark:bg-white/[0.02]"
            >
              {sec.header && (
                <div className="mb-2 flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider ${getSectionBadgeColor(
                      sec.header
                    )}`}
                  >
                    {getHeaderIcon(sec.header)}
                    {sec.header}
                  </span>
                </div>
              )}

              {sec.type === "list" ? (
                <ul className="space-y-2 pl-0.5">
                  {sec.items.map((item, itemIdx) => (
                    <li
                      key={itemIdx}
                      className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300"
                    >
                      <span className="mt-1 flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full bg-slate-200/80 text-[8px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-400">
                        •
                      </span>
                      <div className="flex-1">{renderFormattedInline(item)}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  {renderFormattedInline(sec.content)}
                </p>
              )}
            </div>
          ))
        ) : parsed.type === "bullets" ? (
          <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 dark:border-white/5 dark:bg-white/[0.02]">
            <ul className="space-y-2">
              {parsed.items.map((item, itemIdx) => (
                <li
                  key={itemIdx}
                  className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300"
                >
                  <span className="mt-1 flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full bg-slate-200/80 text-[8px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-400">
                    •
                  </span>
                  <div className="flex-1">{renderFormattedInline(item)}</div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 text-xs leading-relaxed text-slate-700 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-300">
            {renderFormattedInline(parsed.text)}
          </div>
        )}
      </div>
    </div>
  );
}

const OUTCOME_STYLES = {
  interested_held_room: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  callback_requested: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  declined_budget: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  declined_booked_elsewhere: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  declined_dates_mismatch: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  declined_other: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  not_interested: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  wrong_number: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  call_unanswered_or_dropped: "bg-slate-500/10 text-slate-500 dark:text-slate-400",
};

function formatTimestamp(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Parse Plivo's transcript — handles JSON list, JSON string, or plain text
// ---------------------------------------------------------------------------
function parseTranscript(raw) {
  if (!raw) return null;

  // Already a list of turn objects
  if (Array.isArray(raw)) return raw.filter((t) => t && t.content);

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    // Try JSON parse
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.filter((t) => t && t.content);
        if (parsed && typeof parsed === "object") return [parsed];
      } catch {
        // not JSON — continue
      }
    }

    // Labeled turns: "Agent: ...", "User: ...", "Customer: ..."
    if (/^(Agent|AI|Assistant|User|Customer|Caller|Human)\s*:/im.test(trimmed)) {
      const lines = trimmed.split(/\n/).filter(Boolean);
      return lines.map((line) => {
        const agentMatch = line.match(/^(Agent|AI|Assistant)\s*:\s*(.+)/i);
        const userMatch = line.match(/^(User|Customer|Caller|Human)\s*:\s*(.+)/i);
        if (agentMatch) return { role: "agent", content: agentMatch[2].trim() };
        if (userMatch) return { role: "user", content: userMatch[2].trim() };
        return { role: "unknown", content: line.trim() };
      }).filter((t) => t.content);
    }

    // Unstructured plain string
    return [{ role: "plain", content: trimmed }];
  }
  return null;
}

// ---------------------------------------------------------------------------
// TranscriptView Component
// ---------------------------------------------------------------------------
function TranscriptView({ transcription, recordingUrl }) {
  const [copied, setCopied] = useState(false);
  const turns = parseTranscript(transcription);

  const copyAll = () => {
    const text = (turns || [])
      .map((t) => {
        const label = t.role === "agent" || t.role === "assistant" || t.role === "ai"
          ? "AI Agent"
          : t.role === "user" || t.role === "customer" || t.role === "human"
          ? "Customer"
          : t.role === "plain" ? "" : t.role;
        return label ? `${label}: ${t.content}` : t.content;
      })
      .join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const hasContent = turns && turns.length > 0;
  const isPlain = hasContent && turns[0]?.role === "plain";

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Call Transcript
        </p>
        {hasContent && (
          <button
            onClick={copyAll}
            className="rounded px-2 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10 transition-colors"
          >
            {copied ? "✓ Copied" : "Copy"}
          </button>
        )}
      </div>

      {/* Audio player — shown when recording URL is available */}
      {recordingUrl && (
        <div className="mb-3 rounded-lg border border-violet-200/60 bg-violet-50/60 p-3 dark:border-violet-500/20 dark:bg-violet-900/10">
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-violet-500 dark:text-violet-400">
            Call Recording
          </p>
          <audio
            controls
            src={recordingUrl}
            className="h-8 w-full"
            preload="none"
          >
            Your browser does not support the audio element.
          </audio>
        </div>
      )}

      {!hasContent ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200/80 py-8 text-center dark:border-white/10">
          <svg
            className="h-8 w-8 text-slate-300 dark:text-slate-600"
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path
              strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4z"
            />
          </svg>
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
            {recordingUrl ? "Transcript not available — listen to the recording above" : "No transcript available"}
          </p>
          <p className="text-[10px] text-slate-300 dark:text-slate-600 max-w-[220px]">
            {recordingUrl
              ? "Text transcript is sent by Plivo AI only for AI-agent calls."
              : "Plivo AI sends the transcript after the call recording is fully processed."}
          </p>
        </div>
      ) : isPlain ? (
        /* Unstructured plain text */
        <div className="rounded-lg border border-slate-200/80 bg-slate-50 p-3.5 text-[11.5px] leading-relaxed text-slate-700 whitespace-pre-wrap dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          {turns[0].content}
        </div>
      ) : (
        /* Structured conversation bubbles */
        <div className="flex flex-col gap-3 rounded-lg border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-white/10 dark:bg-white/[0.03]">
          {turns.map((turn, i) => {
            const isAgent =
              turn.role === "agent" ||
              turn.role === "assistant" ||
              turn.role === "ai";
            const isUser =
              turn.role === "user" ||
              turn.role === "customer" ||
              turn.role === "human";

            return (
              <div key={i} className={`flex gap-2.5 ${isAgent ? "flex-row" : "flex-row-reverse"}`}>
                {/* Avatar bubble */}
                <div
                  className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold tracking-wide ${
                    isAgent
                      ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                      : isUser
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400"
                  }`}
                >
                  {isAgent ? "AI" : isUser ? "C" : "?"}
                </div>

                {/* Message bubble */}
                <div
                  className={`max-w-[84%] rounded-xl px-3.5 py-2.5 text-[11.5px] leading-relaxed ${
                    isAgent
                      ? "rounded-tl-sm bg-violet-50 text-slate-800 dark:bg-violet-900/20 dark:text-slate-100"
                      : isUser
                      ? "rounded-tr-sm bg-white text-slate-800 shadow-sm ring-1 ring-slate-200/80 dark:bg-white/[0.07] dark:text-slate-100 dark:ring-white/10"
                      : "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400"
                  }`}
                >
                  <p
                    className={`mb-1 text-[9px] font-semibold uppercase tracking-widest ${
                      isAgent
                        ? "text-violet-500 dark:text-violet-400"
                        : isUser
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-slate-400"
                    }`}
                  >
                    {isAgent ? "AI Agent" : isUser ? "Customer" : turn.role}
                  </p>
                  {turn.content}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DetailDrawer
// ---------------------------------------------------------------------------
function DetailDrawer({ call, onClose }) {
  const [handled, setHandled] = useState(false);

  if (!call) return null;

  const isFollowup = call.human_followup_needed === "Yes" || call.human_followup_needed === true;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-slate-200/80 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0B0F17]">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-5 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#0B0F17]/90">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              {call.customer_name || "Guest Call"}
            </h2>
            <p className="text-xs text-slate-400">
              {call.phone_number || "No number"} &middot; {formatTimestamp(call.timestamp)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 p-5">
          {/* Summary */}
          <CallSummaryView
            summary={call.summary}
            outcome={call.call_outcome}
            duration={call.duration}
          />

          {/* AI Extracted Details */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              AI Extracted Details
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-slate-400">Blocker</p>
                <p className="text-slate-700 dark:text-slate-200">
                  {BLOCKER_LABELS[call.blocker] || call.blocker || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Travel Dates</p>
                <p className="text-slate-700 dark:text-slate-200">{call.travel_dates || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Nights / Guests</p>
                <p className="text-slate-700 dark:text-slate-200">
                  {call.nights || call.guests
                    ? `${call.nights || "—"} nights, ${call.guests || "—"} guests`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Budget Stated</p>
                <p className="text-slate-700 dark:text-slate-200">{call.budget_stated || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Callback Requested</p>
                <p className="text-slate-700 dark:text-slate-200">{call.callback_datetime || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Competitor Named</p>
                <p className="text-slate-700 dark:text-slate-200">{call.competitor_named || "—"}</p>
              </div>
            </div>
            {call.verbatim_reason && (
              <div className="mt-3 rounded-lg border border-slate-200/80 bg-slate-50 p-3 text-sm italic text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                "{call.verbatim_reason}"
              </div>
            )}
          </div>

          {/* ── Transcript (always visible) ── */}
          <TranscriptView transcription={call.transcription} recordingUrl={call.recording_url} />

          {/* Sheets sync badge */}
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <Sheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>
              Synced to Google Sheets CRM &middot; UUID:{" "}
              <code className="text-[11px] font-mono">{call.call_uuid}</code>
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 flex flex-wrap gap-2 border-t border-slate-200/80 bg-white/90 px-5 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#0B0F17]/90">
          <button
            onClick={() => setHandled(true)}
            disabled={handled}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {handled ? "Marked Handled" : "Mark Handled"}
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5">
            <MessageCircle className="h-3.5 w-3.5" /> Schedule WhatsApp Follow-up
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5">
            <PhoneCall className="h-3.5 w-3.5" /> Redial
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CallLogs Page
// ---------------------------------------------------------------------------
export default function CallLogs() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("all");
  const [followupOnly, setFollowupOnly] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    getCallLogs().then((data) => {
      setCalls(data || []);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return calls.filter((c) => {
      const name = (c.customer_name || "").toLowerCase();
      const phone = (c.phone_number || "").toLowerCase();
      const q = search.toLowerCase();
      const matchesSearch = !q || name.includes(q) || phone.includes(q);
      const matchesOutcome = outcomeFilter === "all" || c.call_outcome === outcomeFilter;
      const isFollowup = c.human_followup_needed === "Yes" || c.human_followup_needed === true;
      const matchesFollowup = !followupOnly || isFollowup;
      return matchesSearch && matchesOutcome && matchesFollowup;
    });
  }, [calls, search, outcomeFilter, followupOnly]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Call Logs &amp; Intelligence
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Live records from Plivo CDR and AI post-call extractions.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-emerald-400 dark:border-white/10 dark:bg-[#111827]/80 dark:text-white"
          />
        </div>
        <select
          value={outcomeFilter}
          onChange={(e) => setOutcomeFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none dark:border-white/10 dark:bg-[#111827]/80 dark:text-slate-200"
        >
          <option value="all">All outcomes</option>
          {Object.entries(OUTCOME_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 dark:border-white/10 dark:bg-[#111827]/80 dark:text-slate-200">
          <input
            type="checkbox"
            checked={followupOnly}
            onChange={(e) => setFollowupOnly(e.target.checked)}
            className="accent-emerald-500"
          />
          Needs follow-up
        </label>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-[#111827]/80">
        <table className="w-full min-w-220 text-left text-sm">
          <thead className="border-b border-slate-200/80 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Timestamp</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Duration</th>
              <th className="px-4 py-3 font-medium">Outcome</th>
              <th className="px-4 py-3 font-medium">Blocker</th>
              <th className="px-4 py-3 font-medium">Follow-up</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {loading &&
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={8} className="px-4 py-3">
                    <div className="h-4 w-full animate-pulse rounded bg-slate-100 dark:bg-white/5" />
                  </td>
                </tr>
              ))}
            {!loading &&
              filtered.map((call) => {
                const isFollowup =
                  call.human_followup_needed === "Yes" || call.human_followup_needed === true;
                return (
                  <tr key={call.call_uuid} className="text-slate-700 dark:text-slate-200">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500 dark:text-slate-400">
                      {formatTimestamp(call.timestamp)}
                    </td>
                    <td className="px-4 py-3 font-medium">{call.customer_name || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500 dark:text-slate-400">
                      {call.phone_number || "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {call.duration && Number(call.duration) > 0 ? `${call.duration}s` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          OUTCOME_STYLES[call.call_outcome] || "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {OUTCOME_LABELS[call.call_outcome] || call.call_outcome || "Completed"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {BLOCKER_LABELS[call.blocker] || call.blocker || "None"}
                    </td>
                    <td className="px-4 py-3">
                      {isFollowup ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-500">
                          <AlertTriangle className="h-3.5 w-3.5" /> Required
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelected(call)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            {!loading && !filtered.length && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">
                  No call logs found. Once calls are initiated or received via Plivo, they will appear here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <DetailDrawer call={selected} onClose={() => setSelected(null)} />
    </div>
  );
}