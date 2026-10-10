import React, { useMemo } from "react";
import {
  Users,
  Building2,
  Phone,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  FileText,
  AlertCircle,
} from "lucide-react";

export function CampaignRecipientList({ contacts, contactStatuses, campaignId }) {
  if (!contacts || contacts.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl bg-slate-950/30">
        No recipients selected for this campaign.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
        <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
          <Users className="w-3.5 h-3.5 text-indigo-400" />
          Target Recipients ({contacts.length})
        </span>
        <span className="text-slate-500 font-mono text-[11px]">
          {campaignId ? "Live dispatch queue" : "Ready for campaign"}
        </span>
      </div>

      <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/40 divide-y divide-slate-800/60 max-h-52 overflow-y-auto">
        {contacts.map((contact, idx) => {
          const status = contactStatuses[contact.to_number] || "idle";
          const failReason = contactStatuses[`reason_${contact.to_number}`];

          const isPending = status === "pending";
          const isCalling = status === "calling";
          const isCompleted = status === "completed";
          const isFailed = status === "failed";

          return (
            <div
              key={`${contact.to_number}-${idx}`}
              className={`p-3 flex items-start justify-between gap-3 text-xs transition-colors ${
                isCalling
                  ? "bg-indigo-950/40 border-l-2 border-indigo-500"
                  : isCompleted
                  ? "bg-emerald-950/15"
                  : isFailed
                  ? "bg-rose-950/15"
                  : "hover:bg-slate-900/40"
              }`}
            >
              {/* Recipient Details */}
              <div className="min-w-0 flex-1 flex items-start gap-2.5">
                <div className="relative mt-0.5 shrink-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                      isCompleted
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : isFailed
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        : isCalling
                        ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 animate-pulse"
                        : "bg-slate-800/80 text-slate-300 border border-slate-700/60"
                    }`}
                  >
                    {contact.guest_name ? contact.guest_name.charAt(0).toUpperCase() : "G"}
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-200 truncate">
                      {contact.guest_name}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                      <Phone className="w-2.5 h-2.5 text-slate-500" />
                      {contact.to_number}
                    </span>
                    {contact.hotel_id && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-400 flex items-center gap-1 border border-slate-700/50">
                        <Building2 className="w-2.5 h-2.5 text-indigo-400" />
                        Hotel {contact.hotel_id}
                      </span>
                    )}
                  </div>

                  {contact.guest_lead && (
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-1 italic">
                      "{contact.guest_lead}"
                    </p>
                  )}

                  {isFailed && failReason && (
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-rose-400/90 font-mono">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span className="truncate">Reason: {failReason}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Badge */}
              <div className="shrink-0 flex items-center gap-1.5 pt-0.5">
                {isCalling && (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-mono text-[10px] flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Calling...
                  </span>
                )}
                {isCompleted && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Connected
                  </span>
                )}
                {isFailed && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400 font-mono text-[10px] flex items-center gap-1 font-semibold">
                    <XCircle className="w-3 h-3 text-rose-400" /> Failed
                  </span>
                )}
                {isPending && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono text-[10px] flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" /> Queued
                  </span>
                )}
                {status === "idle" && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800/60 text-slate-500 font-mono text-[10px]">
                    Ready
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
