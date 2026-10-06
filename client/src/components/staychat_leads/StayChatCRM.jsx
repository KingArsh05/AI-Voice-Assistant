import { useState, useEffect, useMemo } from "react";
import {
  Users,
  Search,
  Building2,
  PhoneCall,
  ListOrdered,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Flame,
  Calendar,
  BedDouble,
  AlertCircle,
  CheckSquare,
  Square,
  Sparkles,
  CheckCircle2,
  X,
} from "lucide-react";
import { StandaloneSelect } from "../common/FormControl";
import SingleCallModal from "./SingleCallModal";
import QueueCallModal from "./QueueCallModal";

const CLASSIFICATION_OPTIONS = [
  { value: "", label: "All Classifications" },
  { value: "LEAD", label: "Leads" },
  { value: "INQUIRY", label: "Inquiry" },
  { value: "GROUP", label: "Group" },
  { value: "HIGH_PAY", label: "High Pay" },
  { value: "CONFIRM_UPSELL", label: "Confirm Upsell" },
  { value: "CONFIRM_BOOKING", label: "Confirm Booking" },
  { value: "AMENDMENTS", label: "Amendments" },
  { value: "CANCELLATION", label: "Cancellation" },
];

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10 rows" },
  { value: "20", label: "20 rows" },
  { value: "50", label: "50 rows" },
];

export default function StayChatCRM() {
  const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";

  // State
  const [hotels, setHotels] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState("111111");
  const [selectedClassification, setSelectedClassification] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalLeads, setTotalLeads] = useState(0);

  // Data
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Selection & Modals
  const [selectedLeadIds, setSelectedLeadIds] = useState(new Set());
  const [singleCallLead, setSingleCallLead] = useState(null);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Load hotels list on mount
  useEffect(() => {
    let isMounted = true;
    const fetchHotels = async () => {
      try {
        const res = await fetch(`${backendUrl}/api/v1/hotels?source=true`);
        const data = await res.json();
        if (isMounted && data.success) {
          const fetched = data.data || [];
          setHotels(fetched);
          if (fetched.length > 0 && !selectedHotelId) {
            setSelectedHotelId(fetched[0].hotel_id);
          }
        }
      } catch (err) {
        console.error("Error fetching hotels:", err);
      }
    };
    fetchHotels();
    return () => {
      isMounted = false;
    };
  }, [backendUrl]);

  // Fetch StayChat leads whenever hotel, classification, page, or limit changes
  const fetchLeads = async () => {
    if (!selectedHotelId) return;
    setIsLoading(true);
    setError("");

    try {
      const classificationParam = selectedClassification
        ? encodeURIComponent(selectedClassification.trim().toUpperCase())
        : "LEAD";

      const res = await fetch(
        `${backendUrl}/api/v1/crm/staychat-leads?hotelId=${encodeURIComponent(
          selectedHotelId
        )}&page=${page}&limit=${pageSize}&leadType=${classificationParam}`
      );

      const data = await res.json();

      if (data.success) {
        const records = data.classifications || [];
        setLeads(records);
        setTotalLeads(data.total || records.length);
      } else {
        setError(data.error || "Failed to load StayChat CRM leads");
        setLeads([]);
      }
    } catch (err) {
      console.error("Error loading StayChat leads:", err);
      setError("Unable to connect to StayChat CRM API");
      setLeads([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [selectedHotelId, selectedClassification, page, pageSize]);

  // Toast notification timer
  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

  // Selected hotel info
  const currentHotel = useMemo(() => {
    return hotels.find((h) => String(h.hotel_id) === String(selectedHotelId));
  }, [hotels, selectedHotelId]);

  // Hotel options for custom StandaloneSelect
  const hotelOptions = useMemo(() => {
    return hotels.map((h) => ({
      value: String(h.hotel_id),
      label: h.name,
      subLabel: h.property_code || h.hotel_id,
    }));
  }, [hotels]);

  // Filter leads based on search query
  const filteredLeads = useMemo(() => {
    if (!searchQuery.trim()) return leads;
    const q = searchQuery.toLowerCase().trim();
    return leads.filter((item) => {
      const name = item.stayDetails?.guestName || "";
      const phone = item.phone || item.stayDetails?.contactPhone || item.conversationId || "";
      const summary = item.summary || "";
      const room = item.extracted_facts?.roomType || item.stayDetails?.roomType || "";
      return (
        name.toLowerCase().includes(q) ||
        phone.includes(q) ||
        summary.toLowerCase().includes(q) ||
        room.toLowerCase().includes(q)
      );
    });
  }, [leads, searchQuery]);

  // Checkbox multi-select logic
  const toggleSelectLead = (id) => {
    const next = new Set(selectedLeadIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedLeadIds(next);
  };

  const toggleSelectAllPage = () => {
    if (selectedLeadIds.size === filteredLeads.length && filteredLeads.length > 0) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(filteredLeads.map((l) => l._id)));
    }
  };

  // Selected lead objects for queue modal
  const selectedLeadsObjects = useMemo(() => {
    return leads.filter((l) => selectedLeadIds.has(l._id));
  }, [leads, selectedLeadIds]);

  // Summary counts (prioritize lead.heat which reflects true booking purchase intent from Combot API)
  const hotCount = useMemo(() => {
    return leads.filter((l) => (l.heat || l.temperature || "").toUpperCase() === "HOT").length;
  }, [leads]);

  const warmCount = useMemo(() => {
    return leads.filter((l) => (l.heat || l.temperature || "").toUpperCase() === "WARM").length;
  }, [leads]);

  const totalPages = Math.max(1, Math.ceil(totalLeads / pageSize));

  // Helper formatting
  const formatPhoneDisplay = (phone) => {
    if (!phone) return "No Phone";
    return phone.startsWith("+") ? phone : `+${phone}`;
  };

  const renderHeatBadge = (lead) => {
    // Check lead.heat first (booking purchase intent), then lead.temperature
    const heat = (lead.heat || lead.temperature || "WARM").toUpperCase();
    const conf = lead.confidence ? `${Math.round(lead.confidence * 100)}%` : null;

    if (heat === "HOT") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/25 whitespace-nowrap shadow-sm shadow-rose-950/40">
          <Flame className="w-3 h-3 text-rose-400 fill-rose-400 shrink-0" />
          <span>HOT {conf && `• ${conf}`}</span>
        </span>
      );
    }
    if (heat === "COLD") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/25 whitespace-nowrap">
          <span>COLD {conf && `• ${conf}`}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/25 whitespace-nowrap">
        <span>WARM {conf && `• ${conf}`}</span>
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 p-6 space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 p-4 bg-emerald-950/90 border border-emerald-500/30 text-emerald-200 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header & KPI Summary Cards */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Users className="w-6 h-6 text-indigo-400" />
              StayChat CRM Leads & Guests
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Live guest reservations and inquiries with single-click AI dispatch and batch queue workflows.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchLeads}
              disabled={isLoading}
              className="p-2.5 bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl hover:text-white transition shadow-sm cursor-pointer disabled:opacity-50"
              title="Refresh leads"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
            </button>

            {selectedLeadIds.size > 0 && (
              <button
                onClick={() => setIsQueueModalOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-violet-600/25 transition cursor-pointer"
              >
                <ListOrdered className="w-4 h-4" />
                <span>Queue Calls ({selectedLeadIds.size})</span>
              </button>
            )}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-4 bg-gradient-to-br from-indigo-950/30 via-slate-900/60 to-slate-900/90 border border-indigo-500/20 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Total Inbound Leads</span>
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="text-2xl font-bold text-white mt-1.5 font-mono">{totalLeads}</p>
          </div>

          <div className="p-4 bg-gradient-to-br from-rose-950/30 via-slate-900/60 to-slate-900/90 border border-rose-500/20 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Hot High-Conversion</span>
              <Flame className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-2xl font-bold text-rose-400 mt-1.5 font-mono">{hotCount}</p>
          </div>

          <div className="p-4 bg-gradient-to-br from-amber-950/30 via-slate-900/60 to-slate-900/90 border border-amber-500/20 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Warm Leads (This Page)</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-amber-400 mt-1.5 font-mono">{warmCount}</p>
          </div>

          <div className="p-4 bg-gradient-to-br from-violet-950/30 via-slate-900/60 to-slate-900/90 border border-violet-500/20 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Selected for Queue</span>
              <CheckSquare className="w-4 h-4 text-violet-400" />
            </div>
            <p className="text-2xl font-bold text-violet-300 mt-1.5 font-mono">
              {selectedLeadIds.size}
            </p>
          </div>
        </div>
      </div>

      {/* Control Filter Toolbar */}
      <div className="relative z-30 p-3.5 bg-slate-900/80 border border-slate-800/80 rounded-2xl flex flex-wrap items-center justify-between gap-3 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Polished Search Bar with Clear Button */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search guest name, phone, room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9.5 pr-8 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200 p-1 rounded transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Custom Classification Select */}
          <div className="w-[190px]">
            <StandaloneSelect
              value={selectedClassification}
              onChange={(val) => {
                setSelectedClassification(val);
                setPage(1);
              }}
              options={CLASSIFICATION_OPTIONS}
              placeholder="Classification"
              size="md"
            />
          </div>

          {/* Custom Searchable Hotel Select */}
          <div className="w-[280px]">
            <StandaloneSelect
              value={selectedHotelId}
              onChange={(val) => {
                setSelectedHotelId(val);
                setPage(1);
                setSelectedLeadIds(new Set());
              }}
              options={hotelOptions}
              placeholder="Select Hotel"
              searchable={true}
              size="md"
            />
          </div>
        </div>

        {/* Selected Hotel Label Badge */}
        {currentHotel && (
          <div className="text-[11px] text-slate-400 flex items-center gap-2 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800/80 shrink-0">
            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="truncate max-w-[220px]">
              Connected: <strong className="text-white">{currentHotel.name}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Main Table Card (Contained Layout with ZERO shifts) */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl flex flex-col flex-1 min-h-[560px]">
        {/* Scrollable Container with Fixed Dimensions */}
        <div className="overflow-x-auto flex-1 h-[480px] overflow-y-auto">
          <table className="w-full text-left border-collapse table-fixed">
            <colgroup>
              <col className="w-12" />
              <col className="w-52" />
              <col className="w-32" />
              <col className="w-44" />
              <col className="w-48" />
              <col />
              <col className="w-32" />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-slate-950 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 shadow-sm">
              <tr>
                <th className="py-3.5 pl-4 pr-2">
                  <button
                    onClick={toggleSelectAllPage}
                    className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    {selectedLeadIds.size === filteredLeads.length && filteredLeads.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-violet-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500" />
                    )}
                  </button>
                </th>
                <th className="py-3.5 px-3">Guest & Phone</th>
                <th className="py-3.5 px-3">Lead Heat</th>
                <th className="py-3.5 px-3">Dates & Nights</th>
                <th className="py-3.5 px-3">Requirement & Pax</th>
                <th className="py-3.5 px-3">AI Inbound Summary</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-xs">
              {isLoading ? (
                // Skeleton loading rows maintaining exact pixel heights and column widths
                Array.from({ length: 8 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="animate-pulse">
                    <td className="py-3 pl-4 pr-2">
                      <div className="w-4 h-4 bg-slate-800 rounded" />
                    </td>
                    <td className="py-3 px-3">
                      <div className="w-28 h-3.5 bg-slate-800 rounded mb-1.5" />
                      <div className="w-20 h-3 bg-slate-800/60 rounded" />
                    </td>
                    <td className="py-3 px-3">
                      <div className="w-20 h-5 bg-slate-800 rounded-full" />
                    </td>
                    <td className="py-3 px-3">
                      <div className="w-28 h-3.5 bg-slate-800 rounded mb-1" />
                      <div className="w-14 h-3 bg-slate-800/60 rounded" />
                    </td>
                    <td className="py-3 px-3">
                      <div className="w-28 h-3.5 bg-slate-800 rounded mb-1" />
                      <div className="w-20 h-3 bg-slate-800/60 rounded" />
                    </td>
                    <td className="py-3 px-3">
                      <div className="w-4/5 h-3.5 bg-slate-800 rounded mb-1" />
                      <div className="w-3/5 h-3 bg-slate-800/60 rounded" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="w-20 h-7 bg-slate-800 rounded-xl ml-auto" />
                    </td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-rose-400 space-y-3">
                    <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
                    <p className="text-xs">{error}</p>
                    <button
                      onClick={fetchLeads}
                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium cursor-pointer"
                    >
                      Retry
                    </button>
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 space-y-2">
                    <Users className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs font-medium text-slate-300">No StayChat leads found</p>
                    <p className="text-[11px] text-slate-500">
                      Try selecting another classification or hotel.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((item) => {
                  const isSelected = selectedLeadIds.has(item._id);
                  const rawPhone =
                    item.phone || item.stayDetails?.contactPhone || item.conversationId;
                  const cleanNameRaw = (item.stayDetails?.guestName || "")
                    .replace(/^[^\w\s\u0900-\u097F]+|[^\w\s\u0900-\u097F]+$/g, "")
                    .trim();
                  const guestName =
                    cleanNameRaw && cleanNameRaw.length >= 2
                      ? item.stayDetails.guestName
                      : `Guest (${rawPhone ? String(rawPhone).slice(-4) : "Lead"})`;

                  const checkIn = item.extracted_facts?.checkInDate || item.stayDetails?.checkIn;
                  const checkOut = item.extracted_facts?.checkOutDate || item.stayDetails?.checkOut;
                  const nights = item.extracted_facts?.numberOfNights || 1;
                  const guests = item.extracted_facts?.adults || item.stayDetails?.guests || 2;
                  const rooms = item.extracted_facts?.rooms || 1;
                  const roomType =
                    item.extracted_facts?.roomType ||
                    item.stayDetails?.roomType ||
                    "Standard Room";

                  return (
                    <tr
                      key={item._id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isSelected ? "bg-violet-950/20" : ""
                      }`}
                    >
                      {/* Multi-select Checkbox */}
                      <td className="py-3 pl-4 pr-2">
                        <button
                          onClick={() => toggleSelectLead(item._id)}
                          className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-violet-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600 hover:text-slate-400" />
                          )}
                        </button>
                      </td>

                      {/* Guest Info */}
                      <td className="py-3 px-3 overflow-hidden">
                        <div className="font-semibold text-white flex items-center gap-1.5 truncate">
                          <span className="truncate">{guestName}</span>
                          {item.bookingState && (
                            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono shrink-0">
                              {item.bookingState}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-mono text-indigo-300/90 mt-0.5 truncate">
                          {formatPhoneDisplay(rawPhone)}
                        </p>
                      </td>

                      {/* Heat */}
                      <td className="py-3 px-3">{renderHeatBadge(item)}</td>

                      {/* Dates */}
                      <td className="py-3 px-3 text-slate-300 overflow-hidden">
                        {checkIn ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 text-[11px] text-slate-200 truncate">
                              <Calendar className="w-3 h-3 text-indigo-400 shrink-0" />
                              <span className="truncate">{checkIn}</span>
                              {checkOut && <span>➔ {checkOut}</span>}
                            </div>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {nights} {nights === 1 ? "night" : "nights"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Dates not specified</span>
                        )}
                      </td>

                      {/* Room & Pax */}
                      <td className="py-3 px-3 overflow-hidden">
                        <div className="flex items-center gap-1.5 text-slate-200">
                          <BedDouble className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium truncate">{roomType}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {rooms} {rooms === 1 ? "Room" : "Rooms"} • {guests} Guests
                        </p>
                      </td>

                      {/* Summary */}
                      <td className="py-3 px-3 overflow-hidden">
                        <p
                          className="text-[11px] text-slate-300/90 line-clamp-2 leading-relaxed"
                          title={item.summary}
                        >
                          {item.summary || "No prior conversation summary available."}
                        </p>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSingleCallLead(item)}
                          className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 hover:text-emerald-200 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-sm cursor-pointer whitespace-nowrap"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>Call Lead</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Server-side Pagination Bar (Fixed & Stable Footer) */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span>Rows:</span>
            <div className="w-28">
              <StandaloneSelect
                value={String(pageSize)}
                onChange={(val) => {
                  setPageSize(Number(val));
                  setPage(1);
                }}
                options={PAGE_SIZE_OPTIONS}
                size="sm"
                dropUp={true}
              />
            </div>
            <span className="text-[11px] text-slate-500 ml-2">
              Showing page {page} of {totalPages} ({totalLeads} total leads)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2.5 text-xs font-medium text-slate-300 font-mono">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Single Call Modal */}
      {singleCallLead && (
        <SingleCallModal
          lead={singleCallLead}
          hotelId={selectedHotelId}
          hotelName={currentHotel?.name}
          onClose={() => setSingleCallLead(null)}
          onCallSuccess={(res) => {
            setToastMessage(
              `Call dispatched successfully! Trigger ID: ${
                res.data?.trigger_id || res.trigger_id || "Active"
              }`
            );
          }}
        />
      )}

      {/* Queue Call Campaign Modal */}
      {isQueueModalOpen && (
        <QueueCallModal
          selectedLeads={selectedLeadsObjects}
          hotelId={selectedHotelId}
          hotelName={currentHotel?.name}
          onClose={() => {
            setIsQueueModalOpen(false);
            setSelectedLeadIds(new Set());
          }}
          onQueueSuccess={(campaign) => {
            setToastMessage(`Bulk queue started! Campaign: ${campaign.name}`);
          }}
        />
      )}
    </div>
  );
}

