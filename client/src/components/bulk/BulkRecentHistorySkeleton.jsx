import React from "react";
import { History, Layers } from "lucide-react";

export default function BulkRecentHistorySkeleton() {
  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 backdrop-blur-xl shadow-xl shrink-0 animate-shimmer">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-md bg-slate-800 animate-pulse" />
          <div className="w-36 h-3.5 rounded-md bg-slate-800 animate-pulse" />
        </div>
        <div className="w-16 h-3 rounded-md bg-slate-800/70 animate-pulse" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between shadow-sm"
          >
            <div className="min-w-0 pr-2 flex-1 space-y-2">
              <div className="w-3/4 h-3.5 rounded bg-slate-800/90 animate-pulse" />
              <div className="flex items-center gap-2">
                <div className="w-16 h-3 rounded bg-slate-800/60 animate-pulse" />
                <div className="w-14 h-4 rounded-full bg-slate-800/70 animate-pulse" />
              </div>
            </div>
            <div className="w-4 h-4 rounded-full bg-slate-800/50 shrink-0 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
