import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  PhoneCall,
  PhoneOutgoing,
  Clock,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Volume2,
  Sparkles,
  Building2,
  CheckCircle2,
  ChevronRightIcon,
} from "lucide-react";
import { StandaloneSelect } from "../common/FormControl";
import CallDetailsDrawer from "./CallDetailsDrawer";
import { CallStatusBadge } from "./CallStatusBadge";

export default function CallLogs() {
  const BASE_URL = import.meta.env.VITE_BASE_URL;

  // State
  const [calls, setCalls] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [limit, setLimit] = useState(15);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCall, setSelectedCall] = useState(null);

  const totalPages = Math.ceil(total / limit) || 1;

  // Status Filter Options for Custom Select
  const statusSelectOptions = [
    { value: "all", label: "All Statuses", subLabel: "Full records" },
    { value: "completed", label: "Completed", subLabel: "Answered calls" },
    { value: "busy", label: "Busy", subLabel: "Line engaged" },
    { value: "rejected", label: "Failed / Rejected", subLabel: "Unsuccessful" },
  ];

  // Rows Per Page Options for Custom Select
  const rowsPerPageOptions = [
    { value: "10", label: "10 rows" },
    { value: "15", label: "15 rows" },
    { value: "25", label: "25 rows" },
    { value: "50", label: "50 rows" },
  ];

  // Fetch Calls on filter/pagination changes
  useEffect(() => {
    let ignore = false;

    const skip = (page - 1) * limit;
    let url = `${BASE_URL}/api/v1/voice/calls?limit=${limit}&skip=${skip}`;
    if (statusFilter && statusFilter !== "all") {
      url += `&status=${statusFilter}`;
    }

    axios
      .get(url)
      .then((res) => {
        if (!ignore) {
          if (res.data?.success && res.data?.data) {
            setCalls(res.data.data.calls || []);
            setTotal(res.data.data.total || 0);
          } else {
            setCalls([]);
            setTotal(0);
          }
          setError(null);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error("Failed to fetch call logs:", err);
          setError("Unable to load calls from server.");
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [BASE_URL, page, limit, statusFilter]);

  const fetchCalls = () => {
    setIsLoading(true);
    setError(null);
    const skip = (page - 1) * limit;
    let url = `${BASE_URL}/api/v1/voice/calls?limit=${limit}&skip=${skip}`;
    if (statusFilter && statusFilter !== "all") {
      url += `&status=${statusFilter}`;
    }
    axios
      .get(url)
      .then((res) => {
        if (res.data?.success && res.data?.data) {
          setCalls(res.data.data.calls || []);
          setTotal(res.data.data.total || 0);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Refresh failed:", err);
        setError("Unable to load calls from server.");
        setIsLoading(false);
      });
  };

  // Client-side quick filter
  const filteredCalls = useMemo(() => {
    if (!searchQuery.trim()) return calls;
    const q = searchQuery.toLowerCase();
    return calls.filter((c) => {
      const name = c.party_details?.guest_name?.toLowerCase() || "";
      const phone = c.telephony?.to_number?.toLowerCase() || "";
      const hotel = c.party_details?.hotel_name?.toLowerCase() || "";
      const summary = c.ai_insights?.summary?.toLowerCase() || "";
      return (
        name.includes(q) ||
        phone.includes(q) ||
        hotel.includes(q) ||
        summary.includes(q)
      );
    });
  }, [calls, searchQuery]);

  // KPI calculations
  const stats = useMemo(() => {
    const answeredCount = calls.filter(
      (c) => c.call_status === "answered" || c.disposition === "completed"
    ).length;
    const totalDuration = calls.reduce(
      (acc, c) => acc + (c.metrics?.duration_seconds || 0),
      0
    );
    const avgSec = calls.length ? Math.round(totalDuration / calls.length) : 0;
    const avgM = Math.floor(avgSec / 60);
    const avgS = avgSec % 60;

    return {
      totalToday: total,
      answeredCount,
      avgDuration: `${avgM}:${avgS < 10 ? "0" : ""}${avgS}`,
    };
  }, [calls, total]);

  const formatDuration = (sec) => {
    if (!sec) return "0:00";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return "—";
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full flex flex-col h-full min-h-0 gap-5 overflow-hidden">
      {/* Page Header */}
      <div className="flex flex-col gap-4 shrink-0">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
              <span className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                <PhoneCall className="w-5 h-5" />
              </span>
              AI Call Logs & Analytics
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Inspect live & past outbound AI voice conversations with full transcripts and recording playback.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchCalls}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-xl flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Total Recorded</span>
              <span className="text-base font-bold text-white font-mono">{total}</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-xl flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Answered Rate</span>
              <span className="text-base font-bold text-emerald-400 font-mono">
                {total > 0 ? `${Math.round((stats.answeredCount / (calls.length || 1)) * 100)}%` : "100%"}
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-xl flex items-center gap-3">
            <div className="p-2.5 bg-violet-500/10 text-violet-400 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Avg Duration</span>
              <span className="text-base font-bold text-slate-200 font-mono">{stats.avgDuration}</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-xl flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">AI Resolution</span>
              <span className="text-base font-bold text-amber-300 font-mono">Automated</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar with Premium UI Matching Select Menu */}
      <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-3 backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 shrink-0 relative z-30">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-70">
          {/* Enhanced Search Input */}
          <div className="relative flex-1 max-w-md group">
            <Search className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2 transition-colors pointer-events-none" />
            <input
              type="text"
              placeholder="Search by guest, phone number, hotel, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-8 bg-slate-900/95 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 hover:border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:bg-slate-900 outline-none transition-all duration-200"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5 rounded-md transition-colors cursor-pointer"
                title="Clear search"
              >
                <span className="text-xs">✕</span>
              </button>
            )}
          </div>

          {/* Custom Select Status Dropdown */}
          <div className="w-48 sm:w-56">
            <StandaloneSelect
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
              options={statusSelectOptions}
              size="sm"
              placeholder="Filter by Status..."
            />
          </div>
        </div>

        {/* Counter readout */}
        <div className="text-xs text-slate-400 font-mono">
          Showing <span className="text-white font-bold">{filteredCalls.length}</span> of {total} calls
        </div>
      </div>

      {/* Main Table */}
      <div className="flex-1 bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden flex flex-col shadow-xl min-h-0">
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-slate-800/90 backdrop-blur-md">
              <tr>
                <th className="py-3 px-4">Guest</th>
                <th className="py-3 px-3">Hotel</th>
                <th className="py-3 px-3">Direction</th>
                <th className="py-3 px-3">Duration</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4">AI Summary / Outcome</th>
                <th className="py-3 px-3">Cost</th>
                <th className="py-3 px-3">Time</th>
                <th className="py-3 px-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                      <span>Loading voice records...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-rose-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span>{error}</span>
                      <button
                        type="button"
                        onClick={fetchCalls}
                        className="px-3 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs transition-colors cursor-pointer"
                      >
                        Try Again
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filteredCalls.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    No voice call records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredCalls.map((call) => {
                  const guestName = call.party_details?.guest_name || "Guest";
                  const phoneNumber = call.telephony?.to_number || "—";
                  const hotelName = call.party_details?.hotel_name || "Hotel";
                  const summary = call.ai_insights?.summary || call.party_details?.guest_lead || "No notes logged";
                  const hasRecording = Boolean(call.media?.recording_id);

                  return (
                    <tr
                      key={call._id}
                      onClick={() => setSelectedCall(call)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      {/* Guest */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/20 flex items-center justify-center font-bold text-xs shrink-0">
                            {guestName[0]?.toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-white block group-hover:text-violet-300 transition-colors">
                              {guestName}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono block">
                              {phoneNumber}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Hotel */}
                      <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-35">{hotelName}</span>
                        </span>
                      </td>

                      {/* Direction */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono uppercase text-sky-400">
                          <PhoneOutgoing className="w-3 h-3" />
                          {call.telephony?.direction || "outbound"}
                        </span>
                      </td>

                      {/* Duration */}
                      <td className="py-3 px-3 whitespace-nowrap font-mono text-slate-300">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{formatDuration(call.metrics?.duration_seconds)}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <CallStatusBadge status={call.disposition || call.call_status} />
                      </td>

                      {/* AI Summary */}
                      <td className="py-3 px-4 max-w-xs truncate text-slate-300 text-[11px]">
                        <span title={summary} className="line-clamp-1">
                          {summary}
                        </span>
                      </td>

                      {/* Cost */}
                      <td className="py-3 px-3 whitespace-nowrap font-mono text-emerald-400">
                        {call.pricing?.total_cost ? `₹${call.pricing.total_cost}` : "—"}
                      </td>

                      {/* Time */}
                      <td className="py-3 px-3 whitespace-nowrap text-slate-400 text-[11px]">
                        {formatDate(call.created_at)}
                      </td>

                      {/* Details icon */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 text-slate-400 group-hover:text-violet-400">
                          {hasRecording && (
                            <Volume2 className="w-3.5 h-3.5 text-violet-400" title="Recording available" />
                          )}
                          <ChevronRightIcon className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar with Custom Select */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800/90 flex items-center justify-between gap-4 text-xs shrink-0 relative z-20">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="hidden sm:inline">Rows per page:</span>
            <div className="w-32">
              <StandaloneSelect
                value={String(limit)}
                onChange={(val) => {
                  setLimit(Number(val));
                  setPage(1);
                }}
                options={rowsPerPageOptions}
                size="sm"
                dropUp={true}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-mono text-[11px]">
              Page <span className="text-white font-semibold">{page}</span> of{" "}
              <span className="text-white font-semibold">{totalPages}</span>
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoading}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Slide-over Call Transcript & Recording Details Drawer */}
      {selectedCall && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setSelectedCall(null)}
          />
          <CallDetailsDrawer
            call={selectedCall}
            baseUrl={BASE_URL}
            onClose={() => setSelectedCall(null)}
          />
        </>
      )}
    </div>
  );
}
