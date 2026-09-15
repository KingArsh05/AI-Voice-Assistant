import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  PhoneCall,
  TrendingUp,
  AlertTriangle,
  Clock,
  ArrowRight,
} from "lucide-react";
import { getCallLogs, OUTCOME_LABELS, BLOCKER_LABELS } from "../services/api";

const OUTCOME_COLORS = {
  interested_held_room: "bg-emerald-500",
  callback_requested: "bg-cyan-500",
  declined_budget: "bg-amber-500",
  declined_booked_elsewhere: "bg-rose-500",
  declined_dates_mismatch: "bg-orange-500",
  declined_other: "bg-slate-400",
  not_interested: "bg-slate-400",
  wrong_number: "bg-slate-400",
  call_unanswered_or_dropped: "bg-slate-300 dark:bg-slate-600",
};

function timeAgo(iso) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs}h ago`;
}

function KpiCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/90 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-[#111827]/80">
      <div
        className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}
      >
        <Icon className="h-4.5 w-4.5 text-white" strokeWidth={2.25} />
      </div>
      <p className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
        {value}
      </p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

export default function Dashboard() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCallLogs().then((data) => {
      setCalls(data || []);
      setLoading(false);
    });
  }, []);

  const stats = useMemo(() => {
    if (!calls.length) return null;
    const total = calls.length;
    const held = calls.filter(
      (c) => c.call_outcome === "interested_held_room",
    ).length;
    const escalations = calls.filter(
      (c) => c.human_followup_needed === "Yes" || c.human_followup_needed === true,
    ).length;
    const avgDuration = Math.round(
      calls.reduce((sum, c) => sum + (parseInt(c.duration, 10) || 0), 0) / total,
    );

    const outcomeCounts = calls.reduce((acc, c) => {
      const outcome = c.call_outcome || "call_unanswered_or_dropped";
      acc[outcome] = (acc[outcome] || 0) + 1;
      return acc;
    }, {});

    const blockerCounts = calls
      .filter((c) => c.blocker && c.blocker !== "none")
      .reduce((acc, c) => {
        acc[c.blocker] = (acc[c.blocker] || 0) + 1;
        return acc;
      }, {});
    const blockerTotal =
      Object.values(blockerCounts).reduce((a, b) => a + b, 0) || 1;

    return {
      total,
      conversionRate: Math.round((held / total) * 100),
      escalations,
      avgDuration,
      outcomeCounts,
      blockerCounts,
      blockerTotal,
    };
  }, [calls]);

  const recentCalls = calls.slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Live overview of AI voice outreach for Hotel Sahu, Varanasi.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-slate-200/80 bg-slate-100 dark:border-white/10 dark:bg-white/5"
            />
          ))}
        </div>
      ) : !stats ? (
        <div className="rounded-xl border border-slate-200/80 bg-white/90 p-12 text-center backdrop-blur-xl dark:border-white/10 dark:bg-[#111827]/80">
          <PhoneCall className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-600 mb-3" />
          <h3 className="text-base font-medium text-slate-900 dark:text-white">No calls logged yet</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Outbound calls dispatched through the Dialer and inbound calls answered by the AI will appear here automatically.
          </p>
          <div className="mt-6">
            <Link
              to="/dialer"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-500"
            >
              Go to Dialer <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              icon={PhoneCall}
              label="Total AI Calls Made"
              value={stats.total}
              accent="bg-gradient-to-br from-emerald-400 to-emerald-600"
            />
            <KpiCard
              icon={TrendingUp}
              label="Held Room Conversion"
              value={`${stats.conversionRate}%`}
              accent="bg-gradient-to-br from-cyan-400 to-cyan-600"
            />
            <KpiCard
              icon={AlertTriangle}
              label="Human Escalation Needed"
              value={stats.escalations}
              accent="bg-gradient-to-br from-violet-400 to-violet-600"
            />
            <KpiCard
              icon={Clock}
              label="Avg. Call Duration"
              value={`${stats.avgDuration}s`}
              accent="bg-gradient-to-br from-amber-400 to-amber-600"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Outcome distribution */}
            <div className="rounded-xl border border-slate-200/80 bg-white/90 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-[#111827]/80">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Outcome Distribution
              </h2>
              <div className="mt-4 space-y-3">
                {Object.entries(stats.outcomeCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([outcome, count]) => {
                    const pct = Math.round((count / stats.total) * 100);
                    return (
                      <div key={outcome}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-slate-600 dark:text-slate-300">
                            {OUTCOME_LABELS[outcome] || outcome}
                          </span>
                          <span className="font-medium text-slate-500 dark:text-slate-400">
                            {count} &middot; {pct}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                          <div
                            className={`h-full rounded-full ${OUTCOME_COLORS[outcome] || "bg-slate-400"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Top blockers */}
            <div className="rounded-xl border border-slate-200/80 bg-white/90 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-[#111827]/80">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Top Blockers
              </h2>
              <div className="mt-4 space-y-3">
                {Object.entries(stats.blockerCounts).length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No blockers recorded</p>
                ) : (
                  Object.entries(stats.blockerCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([blocker, count]) => {
                      const pct = Math.round((count / stats.blockerTotal) * 100);
                      return (
                        <div key={blocker}>
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="text-slate-600 dark:text-slate-300">
                              {BLOCKER_LABELS[blocker] || blocker}
                            </span>
                            <span className="font-medium text-slate-500 dark:text-slate-400">
                              {pct}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                            <div
                              className="h-full rounded-full bg-violet-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>

          {/* Recent activity */}
          <div className="rounded-xl border border-slate-200/80 bg-white/90 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-[#111827]/80">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Recent Calls
              </h2>
              <Link
                to="/call-logs"
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {recentCalls.map((call) => (
                <Link
                  key={call.call_uuid}
                  to="/call-logs"
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:opacity-80"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                      {call.customer_name || call.phone_number || "Caller"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {call.timestamp ? timeAgo(call.timestamp) : "Recently"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium text-white ${OUTCOME_COLORS[call.call_outcome] || "bg-slate-400"}`}
                  >
                    {OUTCOME_LABELS[call.call_outcome] || call.call_outcome || "Completed"}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
