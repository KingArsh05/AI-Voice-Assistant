import React, { useState, useEffect } from "react";
import {
  Phone,
  PhoneOutgoing,
  Clock,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  ChevronRight,
  Volume2,
  Globe,
  Coins,
  ArrowUpRight,
  Tag,
  Terminal,
  FileText,
  Copy,
  Check,
  PhoneOff,
  ExternalLink,
  MessageSquare,
  User,
  Bot,
} from "lucide-react";

// Helper to parse Plivo [Customer]/[Ai_Agent] dialogue text into structured turns
const parseTranscriptTurns = (rawText) => {
  if (!rawText || typeof rawText !== "string") return [];
  const pattern =
    /\[(Customer|Ai_Agent)\]\s*([\s\S]*?)(?=\[(?:Customer|Ai_Agent)\]|$)/g;
  const turns = [];
  let match;
  while ((match = pattern.exec(rawText)) !== null) {
    const roleRaw = match[1];
    const text = match[2].trim();
    if (text) {
      turns.push({
        speaker: roleRaw === "Customer" ? "user" : "agent",
        text,
      });
    }
  }
  return turns;
};

export default function CallLogs() {
  const [calls, setCalls] = useState([]);
  const [selectedCall, setSelectedCall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  const fetchCalls = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const backendUrl =
        import.meta.env.VITE_API_URL || "http://localhost:8000";
      const res = await fetch(`${backendUrl}/api/v1/voice/calls`);
      const data = await res.json();
      if (res.ok && data.success) {
        setCalls(data.data || []);
        if (data.data && data.data.length > 0) {
          setSelectedCall((prev) => {
            if (!prev) return data.data[0];
            const prevKey =
              prev.id || prev._id || prev.call_uuid || prev.trigger_id;
            const updated = data.data.find(
              (c) =>
                (c.id && c.id === prevKey) ||
                (c._id && c._id === prevKey) ||
                (c.call_uuid &&
                  prev.call_uuid &&
                  c.call_uuid === prev.call_uuid) ||
                (c.trigger_id &&
                  prev.trigger_id &&
                  c.trigger_id === prev.trigger_id),
            );
            return updated || data.data[0];
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch call logs:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, []);

  const handleCopy = (text, fieldKey) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Call Status Badge — Layered Signal Resolution
  // Priority 1: raw_plivo_hangup_cause (definitive — set by backend from live Plivo webhook)
  // Priority 2: DB status (derived by hangup state machine)
  // Priority 3: termination.source heuristic for legacy records that lack raw Plivo fields
  const renderCallStatusBadge = (call) => {
    const rawStatus = (call?.status || "").toLowerCase().trim();
    const termSource = (call?.termination?.source || call?.hangup_source || "")
      .toLowerCase()
      .trim();
    const rawPlivoCause = (call?.raw_plivo_hangup_cause || "")
      .toUpperCase()
      .trim();

    // --- Priority 1: Raw Plivo HangupCause (only present for calls after the backend fix) ---
    if (rawPlivoCause) {
      // User pressed decline / carrier busy signal
      if (rawPlivoCause === "CALL_REJECTED" || rawPlivoCause === "USER_BUSY") {
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/25">
            <PhoneOff className="w-3 h-3" />
            Call Declined by User
          </span>
        );
      }
      // Rang until Plivo flow timed out — nobody picked up
      if (rawPlivoCause === "NO_ANSWER" || rawPlivoCause === "TIMEOUT") {
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-300 border border-slate-500/25">
            <PhoneOff className="w-3 h-3" />
            Unanswered (Rang Out)
          </span>
        );
      }
      // Normal call end after conversation
      if (rawPlivoCause === "NORMAL_CLEARING") {
        const endedByAgent = termSource === "agent";
        if (endedByAgent) {
          return (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              <Bot className="w-3 h-3 text-indigo-400" />
              Ended by Agent
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        );
      }
      // Carrier/network failure
      if (
        rawPlivoCause.includes("ERROR") ||
        rawPlivoCause.includes("FAILED") ||
        rawPlivoCause === "RECOVERY_ON_TIMER_EXPIRE"
      ) {
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" />
            Call Failed
          </span>
        );
      }
    }

    // --- Priority 2: DB status (set by hangup state machine) ---
    // 1. Completed Call
    if (rawStatus === "completed") {
      if (termSource === "agent") {
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            <Bot className="w-3 h-3 text-indigo-400" />
            Ended by Agent
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" />
          Completed
        </span>
      );
    }

    // 2. Declined / Rejected by User
    if (rawStatus === "rejected") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/25">
          <PhoneOff className="w-3 h-3" />
          Call Declined by User
        </span>
      );
    }

    // 3. Busy Line
    if (rawStatus === "busy") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25">
          <PhoneOff className="w-3 h-3" />
          Line Busy
        </span>
      );
    }

    // 4. No-answer: use termination.source as heuristic for legacy records
    // "customer" source = user declined (Plivo sometimes routes quick hangs here)
    // "agent" source = Plivo flow timed out = rang out without pickup
    if (rawStatus === "no-answer") {
      if (termSource === "customer") {
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/25">
            <PhoneOff className="w-3 h-3" />
            Call Declined by User
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-300 border border-slate-500/25">
          <PhoneOff className="w-3 h-3" />
          Unanswered (Rang Out)
        </span>
      );
    }

    // 5. Telephony / Carrier Failure
    if (rawStatus === "failed") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <XCircle className="w-3 h-3" />
          Call Failed
        </span>
      );
    }

    // 6. Initiated / In-Progress
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
        <AlertCircle className="w-3 h-3 animate-pulse" />
        {rawStatus
          ? rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1)
          : "Initiated"}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Just now";
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
  };

  return (
    <div className="flex-1 p-6 lg:p-8 flex flex-col min-h-0 max-w-7xl mx-auto w-full overflow-hidden">
      {loading ? (
        /* Full Page Coordinated Skeleton Loader (Matches BulkCalls complete page shimmer experience) */
        <div className="flex-1 flex flex-col min-h-0 space-y-6 animate-fade-in">
          {/* Top action header skeleton */}
          <div className="flex items-center justify-between pb-1 shrink-0 animate-shimmer">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-56 h-6 rounded-lg bg-slate-800 animate-pulse" />
                <div className="w-16 h-5 rounded-full bg-slate-800/80 animate-pulse" />
              </div>
              <div className="w-96 h-3.5 rounded bg-slate-800/60 animate-pulse" />
            </div>
            <div className="w-24 h-9 rounded-xl bg-slate-800/80 animate-pulse" />
          </div>

          {/* Full Frame 2-Column Split matching Call List + Detail panels */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1 min-h-0">
            {/* Left panel skeleton: 8 items filling height with shimmer */}
            <div className="lg:col-span-5 flex flex-col space-y-2.5 lg:h-[calc(100vh-180px)] lg:overflow-hidden lg:pr-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 relative overflow-hidden animate-shimmer shrink-0"
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-slate-800 animate-pulse shrink-0" />
                      <div className="space-y-1.5">
                        <div className="w-28 h-3.5 rounded bg-slate-800 animate-pulse" />
                        <div className="w-36 h-2.5 rounded bg-slate-800/60 animate-pulse" />
                      </div>
                    </div>
                    <div className="w-20 h-5 rounded-full bg-slate-800/70 animate-pulse" />
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/60">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-3 rounded bg-slate-800/60 animate-pulse" />
                      <div className="w-14 h-3 rounded bg-slate-800/60 animate-pulse" />
                    </div>
                    <div className="w-16 h-3 rounded bg-slate-800/50 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>

            {/* Right details panel skeleton: cleanly proportioned without cutting */}
            <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-3xl p-5 sm:p-6 shadow-xl lg:h-[calc(100vh-180px)] flex flex-col justify-between overflow-hidden animate-shimmer">
              <div className="space-y-4 flex-1 min-h-0 flex flex-col justify-between">
                {/* Top header & info skeleton */}
                <div className="flex items-start justify-between pb-3.5 border-b border-slate-800/80 shrink-0">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-4 rounded-full bg-slate-800 animate-pulse" />
                      <div className="w-16 h-4 rounded-full bg-slate-800/60 animate-pulse" />
                    </div>
                    <div className="w-48 h-5 rounded bg-slate-800 animate-pulse" />
                    <div className="w-56 h-3 rounded bg-slate-800/60 animate-pulse" />
                  </div>
                  <div className="space-y-1.5 flex flex-col items-end">
                    <div className="w-24 h-5 rounded-full bg-slate-800/80 animate-pulse" />
                    <div className="w-20 h-3 rounded bg-slate-800/60 animate-pulse" />
                  </div>
                </div>

                {/* Audio player card skeleton */}
                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2 shrink-0">
                  <div className="flex justify-between items-center">
                    <div className="w-28 h-3.5 rounded bg-slate-800 animate-pulse" />
                    <div className="w-16 h-3 rounded bg-slate-800/60 animate-pulse" />
                  </div>
                  <div className="w-full h-9 rounded-xl bg-slate-900 border border-slate-800/60" />
                </div>

                {/* Metric boxes grid skeleton */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 shrink-0">
                  {[1, 2, 3, 4, 5, 6].map((idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/70 space-y-1.5"
                    >
                      <div className="w-16 h-2.5 rounded bg-slate-800 animate-pulse" />
                      <div className="w-20 h-3.5 rounded bg-slate-800/80 animate-pulse" />
                      <div className="w-14 h-2 rounded bg-slate-800/50 animate-pulse" />
                    </div>
                  ))}
                </div>

                {/* Transcript conversation preview skeleton */}
                <div className="space-y-2 pt-2.5 border-t border-slate-800/80 shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="w-36 h-3.5 rounded bg-slate-800 animate-pulse" />
                    <div className="w-16 h-2.5 rounded bg-slate-800/60 animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/60 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-2.5 rounded bg-indigo-900/60 animate-pulse" />
                        <div className="w-10 h-2 rounded bg-slate-800/50 animate-pulse" />
                      </div>
                      <div className="w-11/12 h-2.5 rounded bg-slate-800/70 animate-pulse" />
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/60 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-2.5 rounded bg-emerald-900/60 animate-pulse" />
                        <div className="w-10 h-2 rounded bg-slate-800/50 animate-pulse" />
                      </div>
                      <div className="w-4/5 h-2.5 rounded bg-slate-800/70 animate-pulse" />
                    </div>
                  </div>
                </div>

                {/* AI Call Summary card skeleton */}
                <div className="space-y-2 pt-2.5 border-t border-slate-800/80 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-indigo-500/40 animate-pulse" />
                    <div className="w-28 h-3 rounded bg-slate-800 animate-pulse" />
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/60 space-y-1.5">
                    <div className="w-full h-2.5 rounded bg-slate-800/70 animate-pulse" />
                    <div className="w-3/4 h-2.5 rounded bg-slate-800/50 animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Bottom session technical IDs bar skeleton */}
              <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500 shrink-0">
                <div className="w-28 h-2.5 rounded bg-slate-800/60 animate-pulse" />
                <div className="w-36 h-2.5 rounded bg-slate-800/60 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Top action header */}
          <div className="flex items-center justify-between mb-6 shrink-0">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
                Voice Call Records & Telemetry
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                  {calls.length} Total
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Live updates synced with Plivo CX hangup, billing, and audio
                recording webhooks
              </p>
            </div>

            <button
              onClick={() => fetchCalls(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-medium transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-indigo-400" : ""}`}
              />
              <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
            </button>
          </div>

          {calls.length === 0 ? (
            <div className="h-72 rounded-3xl bg-slate-900/40 border border-slate-800/80 p-8 flex flex-col items-center justify-center text-center">
              <div className="p-4 bg-slate-800/50 rounded-2xl text-slate-400 mb-3 border border-slate-700/50">
                <Phone className="w-8 h-8 text-slate-500" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">
                No Calls Found
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Trigger your first call from the "Make Call" tab to see real-time
                telemetry and logs.
              </p>
            </div>
          ) : (
            /* Split view: Call List on Left, Call Detail on Right - Independent Scrolling */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1 min-h-0">
          {/* List panel - scrollable on its own */}
          <div className="lg:col-span-5 space-y-2.5 lg:overflow-y-auto lg:h-[calc(100vh-180px)] lg:pr-2">
            {calls.map((call, idx) => {
              const callKey = call.id || call._id || `call-${idx}`;
              const isSelected =
                selectedCall &&
                ((selectedCall.id && call.id && selectedCall.id === call.id) ||
                  (selectedCall._id &&
                    call._id &&
                    selectedCall._id === call._id) ||
                  (selectedCall.call_uuid &&
                    call.call_uuid &&
                    selectedCall.call_uuid === call.call_uuid));

              return (
                <div
                  key={callKey}
                  onClick={() => setSelectedCall(call)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer text-left relative overflow-hidden ${
                    isSelected
                      ? "bg-slate-900/90 border-indigo-500/50 shadow-lg shadow-indigo-950/40 ring-1 ring-indigo-500/30"
                      : "bg-slate-900/40 border-slate-800/80 hover:bg-slate-900/70 hover:border-slate-700/80"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                        <PhoneOutgoing className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
                          {call.guest_name || "Guest"}
                          {call.to_country && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({call.to_country})
                            </span>
                          )}
                        </h4>
                        <div className="flex items-center gap-2">
                          <p className="text-[11px] text-slate-400 font-mono">
                            {call.to_number}
                          </p>
                          {call.hotel?.name && (
                            <span className="text-[10px] text-indigo-400/90 font-medium truncate max-w-[120px]">
                              • {call.hotel.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {renderCallStatusBadge(call)}
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/60 text-[11px] text-slate-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {call.duration ||
                        call.termination?.duration_seconds ||
                        call.recording?.duration_seconds
                          ? `${call.duration || call.termination?.duration_seconds || call.recording?.duration_seconds}s`
                          : "0s"}
                      </span>
                      {call.bill_rate && (
                        <span className="text-emerald-400/80 font-mono">
                          ${call.bill_rate}/min
                        </span>
                      )}
                      {(call.recording?.url || call.recording_url) && (
                        <span className="flex items-center gap-1 text-[10px] text-indigo-400 font-medium">
                          <Volume2 className="w-3 h-3" />
                          Audio
                        </span>
                      )}
                    </div>
                    <span className="flex items-center gap-1 text-slate-400">
                      {formatDate(call.created_at)}
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Details panel - independent scrollable container */}
          <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl lg:overflow-y-auto lg:h-[calc(100vh-180px)] space-y-6">
            {selectedCall ? (
              <>
                {/* 1. Top Header & Destination info */}
                <div className="flex items-start justify-between pb-5 border-b border-slate-800/80">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {selectedCall.flow_name || "Plivo CX Agent"}
                      </span>
                      {selectedCall.direction && (
                        <span className="text-[10px] uppercase font-semibold text-slate-400">
                          • {selectedCall.direction}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      {selectedCall.guest_name || "Guest Customer"}
                      {selectedCall.hotel?.name && (
                        <span className="text-[11px] font-normal px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                          🏨 {selectedCall.hotel.name}{" "}
                          {"★".repeat(selectedCall.hotel.star_rating || 4)}
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Destination:{" "}
                      <span className="font-mono text-slate-200">
                        {selectedCall.to_number}
                      </span>
                      {selectedCall.to_country && (
                        <span className="text-slate-400 ml-1.5">
                          ({selectedCall.to_country}{" "}
                          {selectedCall.to_iso2
                            ? `[${selectedCall.to_iso2}]`
                            : ""}
                          )
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    {renderCallStatusBadge(selectedCall)}
                    <p className="text-[11px] text-slate-400 mt-1 font-mono">
                      Call Duration:{" "}
                      {selectedCall.duration ||
                      selectedCall.termination?.duration_seconds ||
                      selectedCall.recording?.duration_seconds ||
                      selectedCall.recording_duration
                        ? `${selectedCall.duration || selectedCall.termination?.duration_seconds || selectedCall.recording?.duration_seconds || selectedCall.recording_duration}s`
                        : "0s"}
                    </p>
                  </div>
                </div>

                {/* 2. Audio Player (if recorded) */}
                {selectedCall.recording?.url || selectedCall.recording_url ? (
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-indigo-400" />
                        <span className="font-medium">Call Recording</span>
                        <span className="text-[11px] text-slate-400">
                          (
                          {selectedCall.recording?.duration_seconds ||
                            selectedCall.recording_duration ||
                            selectedCall.duration ||
                            0}
                          s)
                        </span>
                      </div>
                      <a
                        href={
                          selectedCall.recording?.url ||
                          selectedCall.recording_url
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-medium"
                      >
                        Download WAV
                      </a>
                    </div>
                    <audio
                      controls
                      className="w-full h-10 rounded-lg accent-indigo-500"
                      src={
                        selectedCall.recording?.url ||
                        selectedCall.recording_url
                      }
                    >
                      Your browser does not support audio playback.
                    </audio>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-slate-850/40 border border-slate-800/80 flex items-center gap-2.5 text-xs text-slate-400">
                    <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>
                      Audio recording processing or not yet delivered by Plivo
                      webhook.
                    </span>
                  </div>
                )}

                {/* 3. Telemetry & Routing Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/70">
                    <span className="text-[11px] text-slate-400 block mb-1 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-indigo-400" />
                      From (Country)
                    </span>
                    <span className="text-xs text-slate-200 font-medium block">
                      {selectedCall.from_country || "India"}{" "}
                      {selectedCall.from_iso2
                        ? `(${selectedCall.from_iso2})`
                        : ""}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {selectedCall.from_number || "+918031825752"}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/70">
                    <span className="text-[11px] text-slate-400 block mb-1 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-emerald-400" />
                      To (Country)
                    </span>
                    <span className="text-xs text-slate-200 font-medium block">
                      {selectedCall.to_country || "India"}{" "}
                      {selectedCall.to_iso2 ? `(${selectedCall.to_iso2})` : ""}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {selectedCall.to_number}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/70">
                    <span className="text-[11px] text-slate-400 block mb-1 flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      Bill Rate
                    </span>
                    <span className="text-xs text-slate-200 font-mono font-medium block">
                      {selectedCall.bill_rate
                        ? `$${selectedCall.bill_rate} / min`
                        : "Standard"}
                    </span>
                    <span className="text-[10px] text-slate-400 capitalize">
                      Termination:{" "}
                      {(() => {
                        const rawCause = (
                          selectedCall.raw_plivo_hangup_cause || ""
                        ).toUpperCase();
                        const st = (selectedCall.status || "").toLowerCase();
                        const src = (
                          selectedCall.termination?.source ||
                          selectedCall.hangup_source ||
                          ""
                        ).toLowerCase();
                        if (
                          rawCause === "CALL_REJECTED" ||
                          rawCause === "USER_BUSY"
                        )
                          return "Declined by User";
                        if (rawCause === "NO_ANSWER" || rawCause === "TIMEOUT")
                          return "Unanswered (Rang Out)";
                        if (rawCause === "NORMAL_CLEARING")
                          return src === "agent"
                            ? "Ended by Agent"
                            : "Normal Clearing";
                        if (st === "rejected") return "Declined by User";
                        if (st === "busy") return "Line Busy";
                        if (st === "no-answer")
                          return src === "customer"
                            ? "Declined by User"
                            : "Unanswered (Rang Out)";
                        if (st === "failed") return "Call Failed";
                        return src || st || "system";
                      })()}
                    </span>
                  </div>
                </div>

                {/* 4. Injected Context Prompt (Clean Collapsible Display) */}
                {selectedCall.guest_lead && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-indigo-300">
                        <Tag className="w-3.5 h-3.5 text-indigo-400" />
                        Guest Booking Lead Details
                      </span>
                    </h4>
                    <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-200 leading-relaxed">
                      {selectedCall.guest_lead}
                    </div>
                  </div>
                )}

                {/* Prompt & Injected Context */}
                {selectedCall.context && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-indigo-400" />
                        System Injected Context & Rules
                      </span>
                      <button
                        onClick={() =>
                          handleCopy(selectedCall.context, "context")
                        }
                        className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedField === "context" ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>
                          {copiedField === "context" ? "Copied" : "Copy"}
                        </span>
                      </button>
                    </h4>
                    <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 font-mono max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {selectedCall.context}
                    </div>
                  </div>
                )}

                {/* 5. AI Summary */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    AI Call Summary
                  </h4>
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300 leading-relaxed max-h-60 overflow-y-auto">
                    {(() => {
                      const summaryContent =
                        selectedCall.ai?.summary ||
                        selectedCall.summary ||
                        selectedCall.raw_recording_data?.data?.object
                          ?.event_data?.conversation_summary ||
                        selectedCall.raw_recording_data?.conversation_summary;

                      if (summaryContent) {
                        return (
                          <div className="whitespace-pre-wrap font-sans text-xs text-slate-200 leading-relaxed">
                            {summaryContent}
                          </div>
                        );
                      }
                      return (
                        <span className="text-slate-400 italic">
                          No summary generated yet.
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* 6. Transcription & Plivo CX Conversation Direct Link */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                      Conversation Dialogue & Transcript
                    </h4>
                    <div className="flex items-center gap-2">
                      {selectedCall.conversation_url && (
                        <a
                          href={selectedCall.conversation_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20"
                        >
                          <span>Plivo CX View</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {(selectedCall.ai?.transcript_text ||
                        selectedCall.transcript) && (
                        <button
                          onClick={() =>
                            handleCopy(
                              selectedCall.ai?.transcript_text ||
                                selectedCall.transcript,
                              "transcript",
                            )
                          }
                          className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                        >
                          {copiedField === "transcript" ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>
                            {copiedField === "transcript" ? "Copied" : "Copy"}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Turn-by-Turn Dialogue Rendering */}
                  {(() => {
                    const turns =
                      selectedCall.ai?.conversation &&
                      selectedCall.ai.conversation.length > 0
                        ? selectedCall.ai.conversation
                        : parseTranscriptTurns(
                            selectedCall.ai?.transcript_text ||
                              selectedCall.transcript,
                          );

                    if (turns.length > 0) {
                      return (
                        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2.5 max-h-64 overflow-y-auto">
                          {turns.map((turn, i) => {
                            const isAgent = turn.speaker === "agent";
                            return (
                              <div
                                key={i}
                                className={`flex gap-2.5 text-xs ${
                                  isAgent ? "justify-start" : "justify-end"
                                }`}
                              >
                                {isAgent && (
                                  <div className="w-6 h-6 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                                    <Bot className="w-3.5 h-3.5" />
                                  </div>
                                )}
                                <div
                                  className={`p-2.5 rounded-2xl max-w-[80%] leading-relaxed ${
                                    isAgent
                                      ? "bg-slate-900 border border-slate-800 text-slate-200"
                                      : "bg-indigo-600/25 border border-indigo-500/30 text-indigo-100"
                                  }`}
                                >
                                  <div className="text-[10px] uppercase font-semibold text-slate-400 mb-0.5">
                                    {isAgent
                                      ? "StayChat AI"
                                      : selectedCall.guest_name || "Guest"}
                                  </div>
                                  <div>{turn.text}</div>
                                </div>
                                {!isAgent && (
                                  <div className="w-6 h-6 rounded-full bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                                    <User className="w-3.5 h-3.5" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    }

                    return (
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed font-sans">
                        {selectedCall.ai?.transcript_text ||
                        selectedCall.transcript ? (
                          selectedCall.ai?.transcript_text ||
                          selectedCall.transcript
                        ) : (
                          <span className="text-slate-400 italic">
                            Full transcript available in Plivo CX conversation
                            portal (check link above).
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* 7. Plivo Raw Identifiers & UUIDs */}
                <div className="pt-3 border-t border-slate-800/80 space-y-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                    Plivo Identifiers & Telephony UUIDs
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                    {selectedCall.call_uuid && (
                      <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/60">
                        <span className="text-slate-400 text-[10px] block">
                          Call UUID
                        </span>
                        <span className="text-slate-200 break-all">
                          {selectedCall.call_uuid}
                        </span>
                      </div>
                    )}
                    {selectedCall.recording_uuid && (
                      <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/60">
                        <span className="text-slate-400 text-[10px] block">
                          Recording UUID
                        </span>
                        <span className="text-slate-200 break-all">
                          {selectedCall.recording_uuid}
                        </span>
                      </div>
                    )}
                    {(selectedCall.flow_run_id || selectedCall.trigger_id) && (
                      <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/60">
                        <span className="text-slate-400 text-[10px] block">
                          Flow Run ID
                        </span>
                        <span className="text-slate-200 break-all">
                          {selectedCall.flow_run_id || selectedCall.trigger_id}
                        </span>
                      </div>
                    )}
                    {selectedCall.conversation_id && (
                      <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/60">
                        <span className="text-slate-400 text-[10px] block">
                          Conversation ID
                        </span>
                        <span className="text-slate-200">
                          {selectedCall.conversation_id}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                <p className="text-xs">
                  Select a call from the list to view full details
                </p>
              </div>
            )}
          </div>
        </div>
          )}
        </>
      )}
    </div>
  );
}
