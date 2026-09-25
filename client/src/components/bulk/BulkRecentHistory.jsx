import React from "react";
import { History, ChevronRight, Inbox } from "lucide-react";
import BulkRecentHistorySkeleton from "./BulkRecentHistorySkeleton";

export default function BulkRecentHistory({
  campaignsList = [],
  isLoading = false,
  onSelectCampaign,
}) {
  if (isLoading) {
    return <BulkRecentHistorySkeleton />;
  }

  if (!campaignsList || campaignsList.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 backdrop-blur-xl shadow-xl shrink-0">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/60">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-400" />
            Recent Batches History
          </h3>
          <span className="text-xs text-slate-500">0 recorded</span>
        </div>
        <div className="py-4 flex items-center justify-center gap-2 text-slate-500 text-xs">
          <Inbox className="w-4 h-4" />
          <span>No previous bulk campaigns yet. Newly launched batches will appear here.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 backdrop-blur-xl shadow-xl shrink-0">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/60">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-400" />
          Recent Batches History
        </h3>
        <span className="text-xs text-slate-500">{campaignsList.length} recorded</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {campaignsList.slice(0, 6).map((c) => {
          const isDone = c.status === "completed";
          const isRunning = c.status === "running";
          return (
            <div
              key={c.campaign_id}
              onClick={() => onSelectCampaign(c.campaign_id)}
              className="p-3 rounded-2xl bg-slate-950/60 hover:bg-slate-800/70 border border-slate-800/80 cursor-pointer flex items-center justify-between transition-all group hover:border-slate-700 shadow-sm"
            >
              <div className="min-w-0 pr-2">
                <p className="text-xs font-semibold text-white truncate group-hover:text-indigo-400 transition-colors">
                  {c.name}
                </p>
                <div className="flex items-center gap-2.5 mt-1 text-xs text-slate-400">
                  <span>{c.completed_count}/{c.total_leads} calls</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      isDone
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : isRunning
                        ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 animate-pulse"
                        : "bg-slate-800 text-slate-400 border-slate-700/60"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white shrink-0" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
