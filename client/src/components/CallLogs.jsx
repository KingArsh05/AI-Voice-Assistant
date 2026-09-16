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
  Share2,
  Terminal,
  FileText,
  Copy,
  Check,
  PhoneOff,
  ExternalLink,
} from "lucide-react";

export default function CallLogs() {
  const [calls, setCalls] = useState([]);
  const [selectedCall, setSelectedCall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  const fetchCalls = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const res = await fetch(`${backendUrl}/api/v1/voice/calls`);
      const data = await res.json();
      if (res.ok && data.success) {
        setCalls(data.data || []);
        if (data.data && data.data.length > 0) {
          setSelectedCall((prev) => {
            if (!prev) return data.data[0];
            const prevKey = prev.id || prev._id || prev.call_uuid || prev.trigger_id;
            const updated = data.data.find(
              (c) =>
                (c.id && c.id === prevKey) ||
                (c._id && c._id === prevKey) ||
                (c.call_uuid && prev.call_uuid && c.call_uuid === prev.call_uuid) ||
                (c.trigger_id && prev.trigger_id && c.trigger_id === prev.trigger_id)
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
    const interval = setInterval(() => {
      fetchCalls();
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = (text, fieldKey) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Senior Developer Status Handler:
  // Evaluates both status and hangup_cause/hangup_source to give crystal-clear state
  const renderCallStatusBadge = (call) => {
    const isCustomerHangedUp =
      call?.hangup_source === "customer" || call?.hangup_cause === "customer";
    const isAgentHangedUp =
      call?.hangup_source === "agent" || call?.hangup_cause === "agent";

    if (call?.status === "completed" || call?.call_status === "completed") {
      if (isCustomerHangedUp) {
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25">
            <PhoneOff className="w-3 h-3" />
            Hanged Up by User
          </span>
        );
      }
      if (isAgentHangedUp) {
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
            <CheckCircle2 className="w-3 h-3" />
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

    if (call?.status === "failed") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <XCircle className="w-3 h-3" />
          Failed
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
        <AlertCircle className="w-3 h-3 animate-pulse" />
        {call?.status || "Initiated"}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Just now";
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
      {/* Top action header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            Voice Call Records & Telemetry
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              {calls.length} Total
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Live updates synced with Plivo CX hangup, billing, and audio recording webhooks
          </p>
        </div>

        <button
          onClick={() => fetchCalls(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-medium transition-all shadow-sm cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-indigo-400" : ""}`} />
          <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
          <p className="text-xs">Loading call history...</p>
        </div>
      ) : calls.length === 0 ? (
        <div className="h-72 rounded-3xl bg-slate-900/40 border border-slate-800/80 p-8 flex flex-col items-center justify-center text-center">
          <div className="p-4 bg-slate-800/50 rounded-2xl text-slate-400 mb-3 border border-slate-700/50">
            <Phone className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">No Calls Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1">
            Trigger your first call from the "Make Call" tab to see real-time telemetry and logs.
          </p>
        </div>
      ) : (
        /* Split view: Call List on Left, Call Detail on Right */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* List panel */}
          <div className="lg:col-span-5 space-y-2.5">
            {calls.map((call, idx) => {
              const callKey = call.id || call._id || `call-${idx}`;
              const isSelected = selectedCall && (
                (selectedCall.id && call.id && selectedCall.id === call.id) ||
                (selectedCall._id && call._id && selectedCall._id === call._id) ||
                (selectedCall.call_uuid && call.call_uuid && selectedCall.call_uuid === call.call_uuid)
              );

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
                          {call.username || "Guest"}
                          {call.to_country && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({call.to_country})
                            </span>
                          )}
                        </h4>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {call.to_number}
                        </p>
                      </div>
                    </div>
                    {renderCallStatusBadge(call)}
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/60 text-[11px] text-slate-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {call.duration ? `${call.duration}s` : "0s"}
                      </span>
                      {call.bill_rate && (
                        <span className="text-emerald-400/80 font-mono">
                          ${call.bill_rate}/min
                        </span>
                      )}
                      {call.recording_url && (
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

          {/* Details panel */}
          <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl sticky top-24 space-y-6">
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
                      {selectedCall.username || "Guest Customer"}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Destination:{" "}
                      <span className="font-mono text-slate-200">{selectedCall.to_number}</span>
                      {selectedCall.to_country && (
                        <span className="text-slate-400 ml-1.5">
                          ({selectedCall.to_country} {selectedCall.to_iso2 ? `[${selectedCall.to_iso2}]` : ""})
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    {renderCallStatusBadge(selectedCall)}
                    <p className="text-[11px] text-slate-400 mt-1 font-mono">
                      Call Duration: {selectedCall.duration ? `${selectedCall.duration}s` : "0s"}
                    </p>
                  </div>
                </div>

                {/* 2. Audio Player with Recording Duration */}
                {selectedCall.recording_url ? (
                  <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
                        <Volume2 className="w-4 h-4 text-indigo-400" />
                        <span>Call Audio Recording</span>
                        {selectedCall.recording_duration ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-200 font-mono">
                            {selectedCall.recording_duration}s recorded
                          </span>
                        ) : null}
                      </div>
                      <a
                        href={selectedCall.recording_url}
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
                      src={selectedCall.recording_url}
                    >
                      Your browser does not support audio playback.
                    </audio>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-slate-850/40 border border-slate-800/80 flex items-center gap-2.5 text-xs text-slate-400">
                    <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>Audio recording processing or not yet delivered by Plivo webhook.</span>
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
                      {selectedCall.from_country || "India"} {selectedCall.from_iso2 ? `(${selectedCall.from_iso2})` : ""}
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
                      {selectedCall.to_country || "India"} {selectedCall.to_iso2 ? `(${selectedCall.to_iso2})` : ""}
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
                      {selectedCall.bill_rate ? `$${selectedCall.bill_rate} / min` : "Standard"}
                    </span>
                    <span className="text-[10px] text-slate-400 capitalize">
                      Termination: {selectedCall.hangup_source || selectedCall.hangup_cause || "customer"}
                    </span>
                  </div>
                </div>

                {/* 4. Injected Context Prompt (Clean Collapsible Display) */}
                {selectedCall.context && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-indigo-400" />
                        Prompt & Injected Context
                      </span>
                      <button
                        onClick={() => handleCopy(selectedCall.context, "context")}
                        className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedField === "context" ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedField === "context" ? "Copied" : "Copy"}</span>
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
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
                    {selectedCall.summary ? (
                      selectedCall.summary
                    ) : (
                      <span className="text-slate-400 italic">No summary generated yet.</span>
                    )}
                  </div>
                </div>

                {/* 6. Transcription & Plivo CX Conversation Direct Link */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      Call Transcription
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
                      {selectedCall.transcript && (
                        <button
                          onClick={() => handleCopy(selectedCall.transcript, "transcript")}
                          className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                        >
                          {copiedField === "transcript" ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedField === "transcript" ? "Copied" : "Copy"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed font-sans">
                    {selectedCall.transcript ? (
                      selectedCall.transcript
                    ) : (
                      <span className="text-slate-400 italic">
                        Full transcript available in Plivo CX conversation portal (check link above).
                      </span>
                    )}
                  </div>
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
                        <span className="text-slate-400 text-[10px] block">Call UUID</span>
                        <span className="text-slate-200 break-all">{selectedCall.call_uuid}</span>
                      </div>
                    )}
                    {selectedCall.recording_uuid && (
                      <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/60">
                        <span className="text-slate-400 text-[10px] block">Recording UUID</span>
                        <span className="text-slate-200 break-all">{selectedCall.recording_uuid}</span>
                      </div>
                    )}
                    {(selectedCall.flow_run_id || selectedCall.trigger_id) && (
                      <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/60">
                        <span className="text-slate-400 text-[10px] block">Flow Run ID</span>
                        <span className="text-slate-200 break-all">
                          {selectedCall.flow_run_id || selectedCall.trigger_id}
                        </span>
                      </div>
                    )}
                    {selectedCall.conversation_id && (
                      <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/60">
                        <span className="text-slate-400 text-[10px] block">Conversation ID</span>
                        <span className="text-slate-200">{selectedCall.conversation_id}</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                <p className="text-xs">Select a call from the list to view full details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
