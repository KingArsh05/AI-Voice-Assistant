import React from "react";

export default function BulkPageSkeleton() {
  return (
    <div className="flex-1 flex flex-col h-full min-h-0 gap-6 animate-fade-in">
      {/* 2 Column Split layout matching exact production proportions */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 overflow-hidden">
        {/* Left Column (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6 min-h-0 overflow-hidden">
          {/* Upload Zone Card Skeleton */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-7 backdrop-blur-xl shadow-xl shrink-0 space-y-4 animate-shimmer">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-800/80 animate-pulse" />
                <div className="space-y-1.5">
                  <div className="w-44 h-4 rounded bg-slate-800 animate-pulse" />
                  <div className="w-64 h-3 rounded bg-slate-800/60 animate-pulse" />
                </div>
              </div>
              <div className="w-24 h-7 rounded-xl bg-slate-800/70 animate-pulse" />
            </div>

            <div className="border-2 border-dashed border-slate-800/80 rounded-2xl p-5 sm:p-6 flex items-center gap-4 bg-slate-950/40">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 shrink-0 animate-pulse" />
              <div className="space-y-2 flex-1">
                <div className="w-56 h-4 rounded bg-slate-800 animate-pulse" />
                <div className="flex items-center gap-2">
                  <div className="w-20 h-5 rounded-lg bg-slate-850/80 bg-slate-800/50 animate-pulse" />
                  <div className="w-24 h-5 rounded-lg bg-slate-850/80 bg-slate-800/50 animate-pulse" />
                  <div className="w-20 h-5 rounded-lg bg-slate-850/80 bg-slate-800/50 animate-pulse" />
                </div>
              </div>
            </div>
          </div>

          {/* Placeholder / Leads preview box Skeleton */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-8 flex flex-col items-center justify-center text-center flex-1 min-h-0 backdrop-blur-xl shadow-xl animate-shimmer">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/80 mb-4 animate-pulse" />
            <div className="w-48 h-4 rounded-md bg-slate-800 animate-pulse mb-2" />
            <div className="w-72 h-3 rounded-md bg-slate-800/60 animate-pulse mb-1.5" />
            <div className="w-60 h-3 rounded-md bg-slate-800/40 animate-pulse" />
          </div>
        </div>

        {/* Right Column (5 cols) Campaign Config Card Skeleton */}
        <div className="lg:col-span-5 flex flex-col min-h-0 overflow-hidden">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-7 backdrop-blur-xl shadow-xl flex flex-col h-full overflow-hidden space-y-4 animate-shimmer">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-800/80 animate-pulse" />
                <div className="space-y-1.5">
                  <div className="w-40 h-4 rounded bg-slate-800 animate-pulse" />
                  <div className="w-52 h-3 rounded bg-slate-800/60 animate-pulse" />
                </div>
              </div>
              <div className="w-16 h-5 rounded-full bg-slate-800/70 animate-pulse" />
            </div>

            {/* Inputs Skeleton */}
            <div className="flex-1 space-y-4 pr-1">
              <div className="space-y-1.5">
                <div className="w-28 h-3.5 rounded bg-slate-800 animate-pulse" />
                <div className="w-full h-10 rounded-xl bg-slate-950/70 border border-slate-800/60" />
                <div className="w-48 h-2.5 rounded bg-slate-800/50 animate-pulse" />
              </div>

              <div className="space-y-1.5">
                <div className="w-36 h-3.5 rounded bg-slate-800 animate-pulse" />
                <div className="w-full h-10 rounded-xl bg-slate-950/70 border border-slate-800/60" />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <div className="w-32 h-3.5 rounded bg-slate-800 animate-pulse" />
                  <div className="w-16 h-3 rounded bg-slate-800/50 animate-pulse" />
                </div>
                <div className="flex gap-2">
                  <div className="w-24 h-10 rounded-xl bg-slate-950/70 border border-slate-800/60" />
                  <div className="flex-1 h-10 rounded-xl bg-slate-950/70 border border-slate-800/60" />
                </div>
                <div className="w-52 h-2.5 rounded bg-slate-800/50 animate-pulse" />
              </div>

              <div className="w-full h-12 rounded-2xl bg-slate-950/60 border border-slate-800/60" />
            </div>

            {/* Launch button skeleton */}
            <div className="pt-3 border-t border-slate-800/80 shrink-0">
              <div className="w-full h-12 rounded-2xl bg-indigo-950/40 border border-indigo-900/40 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Batches History Skeleton */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 backdrop-blur-xl shadow-xl shrink-0 animate-shimmer">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/60">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-slate-800 animate-pulse" />
            <div className="w-36 h-3.5 rounded bg-slate-800 animate-pulse" />
          </div>
          <div className="w-16 h-3 rounded bg-slate-800/70 animate-pulse" />
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
    </div>
  );
}
