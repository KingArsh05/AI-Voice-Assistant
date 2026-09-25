import React, { useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  XCircle,
  Download,
  RefreshCw,
  PhoneCall,
  CheckCircle2,
  AlertCircle,
  Clock,
  ListOrdered,
  Search,
  Activity,
  Layers,
  Sparkles,
} from "lucide-react";
import * as XLSX from "xlsx";

export default function BulkLiveDashboard({
  campaign,
  actionLoading,
  onCampaignAction,
  onResetCampaign,
  onPollCampaign,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterState, setFilterState] = useState("all");

  const completedCount = campaign?.completed_count || 0;
  const failedCount = campaign?.failed_count || 0;
  const totalCount = campaign?.total_leads || 0;
  const progressPercent =
    totalCount > 0
      ? Math.round(((completedCount + failedCount) / totalCount) * 100)
      : 0;

  const exportResultsCSV = () => {
    if (!campaign || !campaign.leads) return;
    const exportData = campaign.leads.map((l) => ({
      Serial: l.serial,
      "Guest Name": l.guest_name,
      Phone: l.phone_number,
      "Lead Details": l.lead_details,
      Status: l.status,
      "Duration (s)": l.duration || 0,
      "Trigger ID": l.call_trigger_id || "",
      Completed: l.completed_at || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Call Results");
    XLSX.writeFile(workbook, `${campaign.name || "campaign"}_results.xlsx`);
  };

  const filteredLeads = (campaign.leads || []).filter((lead) => {
    if (filterState === "completed" && lead.status !== "completed") return false;
    if (filterState === "calling" && lead.status !== "calling") return false;
    if (
      filterState === "failed" &&
      !["failed", "no-answer", "busy", "rejected"].includes(lead.status)
    )
      return false;
    if (filterState === "queued" && lead.status !== "queued") return false;

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      lead.guest_name.toLowerCase().includes(term) ||
      lead.phone_number.toLowerCase().includes(term) ||
      lead.lead_details.toLowerCase().includes(term)
    );
  });

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 space-y-6">
      {/* ─── Top Telemetry Card ─── */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-7 backdrop-blur-xl shadow-2xl space-y-5 shrink-0">
        {/* Row 1: Campaign Identity, Status Badge, and Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {campaign.name}
              </h2>
              <span
                className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider border shadow-sm ${
                  campaign.status === "running"
                    ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 animate-pulse"
                    : campaign.status === "completed"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : campaign.status === "paused"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-slate-800 text-slate-400 border-slate-700"
                }`}
              >
                {campaign.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <span>Caller ID: <code className="font-mono text-slate-200">{campaign.from_number}</code></span>
              <span>•</span>
              <span>Rest Gap: {campaign.cooldown_seconds}s</span>
              <span>•</span>
              <span>Max Duration: {campaign.max_call_duration_seconds}s</span>
            </p>
          </div>

          {/* Action Button Controls */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {campaign.status === "queued" && (
              <button
                disabled={actionLoading}
                onClick={() => onCampaignAction("start")}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" /> Start Queue
              </button>
            )}

            {campaign.status === "running" && (
              <button
                disabled={actionLoading}
                onClick={() => onCampaignAction("pause")}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-amber-600/20 transition-all cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5" /> Pause Queue
              </button>
            )}

            {campaign.status === "paused" && (
              <button
                disabled={actionLoading}
                onClick={() => onCampaignAction("resume")}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" /> Resume Queue
              </button>
            )}

            {["queued", "running", "paused"].includes(campaign.status) && (
              <button
                disabled={actionLoading}
                onClick={() => onCampaignAction("cancel")}
                className="px-3.5 py-2.5 bg-rose-600/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" /> Stop Queue
              </button>
            )}

            <button
              onClick={exportResultsCSV}
              className="px-3.5 py-2.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="Export results to Excel spreadsheet"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>

            <button
              onClick={() => onResetCampaign?.()}
              className="px-3.5 py-2.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" /> New Batch
            </button>
          </div>
        </div>

        {/* Row 2: Four Balanced Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 shadow-inner">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Leads
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-white mt-1 font-mono">
              {totalCount}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 shadow-inner">
            <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
              Completed Calls
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-400 mt-1 font-mono">
              {completedCount}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 shadow-inner">
            <p className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">
              Failed / Unanswered
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-rose-400 mt-1 font-mono">
              {failedCount}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 shadow-inner">
            <p className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
              Queue Progress
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-indigo-400 mt-1 font-mono">
              {progressPercent}%
            </p>
          </div>
        </div>

        {/* Row 3: Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800/80 p-0.5 shadow-inner">
            <div
              className="bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500 h-full rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400 font-medium px-1">
            <span>{completedCount + failedCount} of {totalCount} calls executed</span>
            <span>{Math.max(0, totalCount - (completedCount + failedCount))} remaining in queue</span>
          </div>
        </div>
      </div>

      {/* ─── Bottom Live Sequence Table Card ─── */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-7 backdrop-blur-xl shadow-2xl flex-1 min-h-0 flex flex-col overflow-hidden space-y-4">
        {/* Table Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <ListOrdered className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wide">
                Live Execution Queue
              </h3>
              <p className="text-[11px] text-slate-400">Sequential, call-by-call progression</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter segmented buttons */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setFilterState("all")}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterState === "all" ? "bg-slate-800 text-white font-medium shadow-sm" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                All ({campaign.leads?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setFilterState("completed")}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterState === "completed"
                    ? "bg-emerald-500/20 text-emerald-300 font-medium shadow-sm"
                    : "text-slate-400 hover:text-emerald-400"
                }`}
              >
                Completed ({completedCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterState("failed")}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterState === "failed"
                    ? "bg-rose-500/20 text-rose-300 font-medium shadow-sm"
                    : "text-slate-400 hover:text-rose-400"
                }`}
              >
                Failed ({failedCount})
              </button>
            </div>

            <button
              onClick={() => onPollCampaign(campaign.campaign_id)}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 font-medium px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Sync
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search leads in sequence by name, phone or notes..."
              className="w-full bg-slate-950/70 border border-slate-800/80 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Scrollable Table View */}
        <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl border border-slate-800/80 bg-slate-950/40">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/90 backdrop-blur text-slate-400 sticky top-0 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800 z-10">
              <tr>
                <th className="py-3 px-4 w-12">#</th>
                <th className="py-3 px-4">Guest Name</th>
                <th className="py-3 px-4">Phone Number</th>
                <th className="py-3 px-4">Lead Interest / Context</th>
                <th className="py-3 px-4">Call Status</th>
                <th className="py-3 px-4 text-right">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-500">
                    No leads found matching current filter
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead, idx) => {
                  const isCalling = lead.status === "calling";
                  const isDone = lead.status === "completed";
                  const isFailed = ["failed", "no-answer", "busy", "rejected"].includes(
                    lead.status
                  );

                  return (
                    <tr
                      key={lead.serial || idx}
                      className={
                        isCalling
                          ? "bg-indigo-600/15 border-l-4 border-indigo-500 transition-colors"
                          : "hover:bg-slate-800/40 transition-colors"
                      }
                    >
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-xs">
                        {lead.serial || idx + 1}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {lead.guest_name}
                          {isCalling && (
                            <span className="flex h-2 w-2 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300 text-xs whitespace-nowrap">
                        {lead.phone_number}
                      </td>
                      <td className="py-3.5 px-4 max-w-sm text-slate-400 text-xs">
                        <div className="truncate" title={lead.lead_details}>
                          {lead.lead_details}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isCalling ? (
                          <span className="inline-flex items-center gap-1.5 text-indigo-300 font-semibold bg-indigo-500/20 border border-indigo-500/40 px-3 py-1 rounded-full text-[11px] animate-pulse">
                            <PhoneCall className="w-3.5 h-3.5 text-indigo-400" /> Active Call
                          </span>
                        ) : isDone ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                          </span>
                        ) : isFailed ? (
                          <span className="inline-flex items-center gap-1.5 text-rose-400 font-semibold bg-rose-500/10 border border-rose-500/30 px-3 py-1 rounded-full text-[11px]">
                            <AlertCircle className="w-3.5 h-3.5" /> {lead.status}
                          </span>
                        ) : lead.status === "skipped" ? (
                          <span className="inline-flex items-center gap-1.5 text-slate-400 font-medium bg-slate-800/80 px-3 py-1 rounded-full text-[11px]">
                            Skipped
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-slate-400 font-medium bg-slate-950 border border-slate-800 px-3 py-1 rounded-full text-[11px]">
                            <Clock className="w-3.5 h-3.5 text-slate-500" /> Queued
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300 text-right text-xs whitespace-nowrap">
                        {lead.duration ? `${lead.duration}s` : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
