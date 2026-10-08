import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  Users,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Building2,
  PhoneForwarded,
  Sparkles,
  ChevronRightIcon,
} from "lucide-react";
import { StandaloneSelect } from "../common/FormControl";
import CRMIntentBadge from "./CRMIntentBadge";
import CRMLeadDrawer from "./CRMLeadDrawer";
import CRMCallModal from "./CRMCallModal";

export default function CRMData() {
  const BASE_URL = import.meta.env.VITE_BASE_URL;

  // State
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Hotels State for filter dropdown
  const [hotels, setHotels] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState("all");

  // Intent filter & pagination
  const [primaryIntent, setPrimaryIntent] = useState("all");
  const [limit, setLimit] = useState(15);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLead, setSelectedLead] = useState(null);
  const [callingLead, setCallingLead] = useState(null);

  const totalPages = Math.ceil(total / limit) || 1;

  // Intent options in user requested order:
  // inquery, lead, highpay, group, upsell, confirm upsell, confirm bookings, amendments, amendments req, cancellation req, cancellation, others
  const intentOptions = [
    { value: "all", label: "All Intents" },
    { value: "INQUIRY", label: "Inquiry" },
    { value: "LEAD", label: "Lead" },
    { value: "HIGH_PAY", label: "High Pay" },
    { value: "GROUP", label: "Group" },
    { value: "UPSELL", label: "Upsell" },
    { value: "CONFIRMED_UPSELL", label: "Confirm Upsell" },
    { value: "CONFIRMED_BOOKING", label: "Confirm Bookings" },
    { value: "AMENDMENT", label: "Amendments" },
    { value: "AMENDMENT_REQUEST", label: "Amendments Req" },
    { value: "CANCELLATION_REQUEST", label: "Cancellation Req" },
    { value: "CANCELLATION", label: "Cancellation" },
    { value: "OTHER", label: "Others" },
  ];

  // Rows per page options
  const rowsPerPageOptions = [
    { value: "10", label: "10 rows" },
    { value: "15", label: "15 rows" },
    { value: "25", label: "25 rows" },
    { value: "50", label: "50 rows" },
  ];

  // 1. Fetch available hotels once for dynamic select options
  useEffect(() => {
    let ignore = false;
    axios
      .get(`${BASE_URL}/api/v1/voice/hotels`)
      .then((res) => {
        if (!ignore && res.data?.data) {
          setHotels(res.data.data);
        }
      })
      .catch((err) => console.error("Failed to load hotels for filter:", err));

    return () => {
      ignore = true;
    };
  }, [BASE_URL]);

  // Hotel filter options
  const hotelSelectOptions = useMemo(() => {
    const list = [{ value: "all", label: "All Hotels" }];
    hotels.forEach((h) => {
      list.push({
        value: String(h.hotel_id),
        label: h.name || h.hotel_name || `Hotel (${h.hotel_id})`,
        subLabel: `ID: ${h.hotel_id}`,
      });
    });
    return list;
  }, [hotels]);

  // 2. Fetch CRM Leads
  useEffect(() => {
    let ignore = false;

    const skip = (page - 1) * limit;
    const params = {
      limit,
      skip,
      ...(selectedHotelId !== "all" && { hotel_id: selectedHotelId }),
      ...(primaryIntent !== "all" && { primary_intent: primaryIntent }),
    };

    axios
      .get(`${BASE_URL}/api/v1/voice/crm`, { params })
      .then((res) => {
        if (!ignore) {
          if (res.data?.success && res.data?.data) {
            setLeads(res.data.data.crm_data || []);
            setTotal(res.data.data.total || 0);
          } else {
            setLeads([]);
            setTotal(0);
          }
          setError(null);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error("Failed to fetch CRM data:", err);
          setError("Unable to load CRM leads from server.");
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [BASE_URL, page, limit, selectedHotelId, primaryIntent]);

  const handleRefresh = () => {
    setIsLoading(true);
    setError(null);
    const skip = (page - 1) * limit;
    const params = {
      limit,
      skip,
      ...(selectedHotelId !== "all" && { hotel_id: selectedHotelId }),
      ...(primaryIntent !== "all" && { primary_intent: primaryIntent }),
    };

    axios
      .get(`${BASE_URL}/api/v1/voice/crm`, { params })
      .then((res) => {
        if (res.data?.success && res.data?.data) {
          setLeads(res.data.data.crm_data || []);
          setTotal(res.data.data.total || 0);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Refresh failed:", err);
        setError("Unable to load CRM leads from server.");
        setIsLoading(false);
      });
  };

  // Client-side quick filter
  const filteredLeads = useMemo(() => {
    if (!searchQuery.trim()) return leads;
    const q = searchQuery.toLowerCase();
    return leads.filter((l) => {
      const name = (l.guest_name || "").toLowerCase();
      const phone = (l.phone_number || "").toLowerCase();
      const summary = (l.summary || "").toLowerCase();
      const intent = (l.primary_intent || "").toLowerCase();
      return (
        name.includes(q) ||
        phone.includes(q) ||
        summary.includes(q) ||
        intent.includes(q)
      );
    });
  }, [leads, searchQuery]);

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

  const handleQuickCall = (e, lead) => {
    e.stopPropagation();
    setCallingLead(lead);
  };

  return (
    <div className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full flex flex-col h-full min-h-0 gap-5 overflow-hidden">
      {/* Page Header & Stats */}
      <div className="flex flex-col gap-4 shrink-0">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
              <span className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                <Users className="w-5 h-5" />
              </span>
              CRM Inquiries & Leads
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Qualified guest leads extracted automatically from conversations for outbound calling and conversion.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Quick KPI Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-xl flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Total CRM Leads</span>
              <span className="text-base font-bold text-white font-mono">{total}</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-xl flex items-center gap-3">
            <div className="p-2.5 bg-violet-500/10 text-violet-400 rounded-xl">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Connected Hotels</span>
              <span className="text-base font-bold text-violet-300 font-mono">
                {hotels.length || "1"} Properties
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-xl flex items-center gap-3 col-span-2 sm:col-span-1">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Ready to Call</span>
              <span className="text-base font-bold text-emerald-400 font-mono">100% Verified</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar with Custom Select Menus */}
      <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-3 backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 shrink-0 relative z-30">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-70">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md group">
            <Search className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2 transition-colors pointer-events-none" />
            <input
              type="text"
              placeholder="Search by guest, phone number, intent, or summary..."
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

          {/* Hotel Filter Select */}
          <div className="w-48 sm:w-56">
            <StandaloneSelect
              value={selectedHotelId}
              onChange={(val) => {
                setSelectedHotelId(val);
                setPage(1);
              }}
              options={hotelSelectOptions}
              searchable={true}
              size="sm"
              placeholder="Filter Hotel..."
            />
          </div>

          {/* Intent Filter Select */}
          <div className="w-40 sm:w-48">
            <StandaloneSelect
              value={primaryIntent}
              onChange={(val) => {
                setPrimaryIntent(val);
                setPage(1);
              }}
              options={intentOptions}
              size="sm"
              placeholder="Filter Intent..."
            />
          </div>
        </div>

        {/* Counter */}
        <div className="text-xs text-slate-400 font-mono">
          Showing <span className="text-white font-bold">{filteredLeads.length}</span> of {total} leads
        </div>
      </div>

      {/* CRM Leads Table */}
      <div className="flex-1 bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden flex flex-col shadow-xl min-h-0">
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <table className="w-full min-w-215 table-fixed text-xs border-collapse">
            <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-slate-800/90 backdrop-blur-md">
              <tr>
                {/* Fixed column ratios: wider Lead Context / Summary (38%) */}
                <th className="w-[18%] py-3 px-4 text-center font-semibold">Guest Contact</th>
                <th className="w-[10%] py-3 px-3 text-center font-semibold">Hotel ID</th>
                <th className="w-[13%] py-3 px-3 text-center font-semibold">Primary Intent</th>
                <th className="w-[37%] py-3 px-4 text-center font-semibold">Lead Context / Summary</th>
                <th className="w-[12%] py-3 px-3 text-center font-semibold">Last Updated</th>
                <th className="w-[10%] py-3 px-4 text-center font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                      <span>Loading CRM leads...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-rose-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span>{error}</span>
                      <button
                        type="button"
                        onClick={handleRefresh}
                        className="px-3 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs transition-colors cursor-pointer"
                      >
                        Try Again
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    No CRM records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const guestName = lead.guest_name || "Guest";
                  const phoneNumber = lead.phone_number || "—";
                  const summary = lead.summary || "No inquiry notes logged.";

                  return (
                    <tr
                      key={lead._id}
                      onClick={() => setSelectedLead(lead)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      {/* Guest Contact - Left Aligned */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-xs shrink-0">
                            {guestName[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0 truncate">
                            <span className="font-semibold text-white block group-hover:text-indigo-300 transition-colors truncate">
                              {guestName}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono block truncate">
                              {phoneNumber}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Hotel - Centered */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center justify-center gap-1.5 text-slate-300 font-mono">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{lead.hotel_id || "—"}</span>
                        </span>
                      </td>

                      {/* Primary Intent - Centered */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex justify-center">
                          <CRMIntentBadge intent={lead.primary_intent} />
                        </div>
                      </td>

                      {/* Lead Summary - Left-aligned text with wider reading width */}
                      <td className="py-3 px-4 text-left text-slate-300 text-[11px]">
                        <span title={summary} className="line-clamp-2 mx-auto block max-w-xl leading-relaxed">
                          {summary}
                        </span>
                      </td>

                      {/* Last Updated - Centered */}
                      <td className="py-3 px-3 text-center whitespace-nowrap text-slate-400 text-[11px]">
                        {formatDate(lead.last_updated)}
                      </td>

                      {/* Action - Centered */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => handleQuickCall(e, lead)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-300 font-medium text-[11px] flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-xs"
                            title="Direct Outbound Call"
                          >
                            <PhoneForwarded className="w-3 h-3 text-indigo-400" />
                            <span>Call</span>
                          </button>
                          <ChevronRightIcon className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar with Custom DropUp Select */}
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

      {/* Slide-over Inspection Drawer */}
      {selectedLead && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setSelectedLead(null)}
          />
          <CRMLeadDrawer
            lead={selectedLead}
            onClose={() => setSelectedLead(null)}
            onCallClick={(lead) => {
              setSelectedLead(null);
              setCallingLead(lead);
            }}
          />
        </>
      )}

      {/* Confirmation Call Popup Modal */}
      {callingLead && (
        <CRMCallModal
          lead={callingLead}
          isOpen={Boolean(callingLead)}
          onClose={() => setCallingLead(null)}
          onSuccess={() => {
            // refresh data if needed or keep open
          }}
        />
      )}
    </div>
  );
}
