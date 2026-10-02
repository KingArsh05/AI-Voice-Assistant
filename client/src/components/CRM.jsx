import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  Filter,
  PhoneCall,
  Plus,
  RefreshCw,
  Building2,
  Calendar,
  CheckSquare,
  Square,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Flame,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Award,
  UploadCloud,
  Layers,
  ThermometerSun,
  IndianRupee,
  BedDouble,
  Phone,
  MessageSquare,
  Bot,
  Tag,
  Bookmark,
} from "lucide-react";
import ConfirmCallModal from "./crm/ConfirmCallModal";
import AddLeadModal from "./crm/AddLeadModal";
import { StandaloneSelect } from "./common/FormControl";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Hotels extracted from image and StayChat database
const STAYCHAT_HOTELS = [
  {
    hotel_id: "111111",
    name: "Hotel Sahu",
    property_code: "HOTELSAHU",
    address: "Near Kashi Vishwanath Temple, Varanasi, UP 221001",
    city: "Varanasi",
  },
  {
    hotel_id: "376891",
    name: "Hotel Paradise",
    property_code: "HOTELROME",
    address: "Near Jaipur near Rajathan",
    city: "Jaipur",
  },
  {
    hotel_id: "988273",
    name: "Sanidhyam by Sahu Hotels",
    property_code: "SANIDHYAM",
    address: "Near Kashi Vishwanath Temple, Varanasi, UP 221001",
    city: "Varanasi",
  },
  {
    hotel_id: "968225",
    name: "Hotel Maharaja",
    property_code: "HOTELMAHARAJA",
    address: "Nainital",
    city: "Nainital",
  },
  {
    hotel_id: "191919",
    name: "Hoteldummy",
    property_code: "hoteldummy",
    address: "City, State, Country",
    city: "Dummy City",
  },
  {
    hotel_id: "310978",
    name: "Hotel North Star",
    property_code: "HOTELNORTHSTAR",
    address: "",
    city: "North Star",
  },
];

// Distinct classification / lead_type options strictly matching backend variations
// CONFIRMED_UPSELL, CONFIRMED_BOOKING, AMENDMENT, CANCELLATION, GROUP_LEAD, HIGH_PAY, UPSELLING, LEAD, INQUIRY
const LEAD_CLASSIFICATION_OPTIONS = [
  { value: "", label: "All Classifications" },
  { value: "CONFIRMED_UPSELL", label: "Confirmed Upsell" },
  { value: "CONFIRMED_BOOKING", label: "Confirmed Booking" },
  { value: "AMENDMENT", label: "Amendment" },
  { value: "CANCELLATION", label: "Cancellation" },
  { value: "GROUP_LEAD", label: "Group" },
  { value: "HIGH_PAY", label: "High Pay" },
  { value: "UPSELLING", label: "Upselling" },
  { value: "LEAD", label: "Lead" },
  { value: "INQUIRY", label: "Inquiry" },
];

const LEAD_TYPE_BADGE_CONFIG = {
  CONFIRMED_UPSELL: {
    label: "Confirmed Upsell",
    color: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  },
  CONFIRMED_BOOKING: {
    label: "Confirmed Booking",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  },
  AMENDMENT: {
    label: "Amendment",
    color: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  },
  CANCELLATION: {
    label: "Cancellation",
    color: "bg-rose-500/10 text-rose-400 border-rose-500/30",
  },
  GROUP_LEAD: {
    label: "Group",
    color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
  },
  HIGH_PAY: {
    label: "High Pay",
    color: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  },
  UPSELLING: {
    label: "Upselling",
    color: "bg-rose-500/10 text-rose-400 border-rose-500/30",
  },
  LEAD: {
    label: "Lead",
    color: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  },
  INQUIRY: {
    label: "Inquiry",
    color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  },
};

/**
 * Normalizes document lead type strictly matching backend _lead_type(doc):
 *   types = [str(t).upper() for t in (doc.get("lead_types") or [])]
 *   if "CONFIRMED_UPSELL" in types: return "CONFIRMED_UPSELL"
 *   if "CONFIRMED_BOOKING" in types: return "CONFIRMED_BOOKING"
 *   if "AMENDMENT" in types: return "AMENDMENT"
 *   if "CANCELLATION" in types: return "CANCELLATION"
 *   if "GROUP_LEAD" in types: return "GROUP_LEAD"
 *   if "HIGH_PAY" in types: return "HIGH_PAY"
 *   if "UPSELLING" in types: return "UPSELLING"
 *   if "LEAD" in types: return "LEAD"
 *   return "INQUIRY"
 */
const getLeadClassificationType = (doc) => {
  if (!doc) return "INQUIRY";
  const rawList = Array.isArray(doc.lead_types)
    ? doc.lead_types
    : Array.isArray(doc.leadTypes)
      ? doc.leadTypes
      : typeof doc.lead_type === "string"
        ? [doc.lead_type]
        : Array.isArray(doc.attribute_tags)
          ? doc.attribute_tags
          : [];

  const types = rawList.map((t) => String(t).toUpperCase().trim());

  if (types.includes("CONFIRMED_UPSELL")) return "CONFIRMED_UPSELL";
  if (types.includes("CONFIRMED_BOOKING")) return "CONFIRMED_BOOKING";
  if (types.includes("AMENDMENT")) return "AMENDMENT";
  if (types.includes("CANCELLATION")) return "CANCELLATION";
  if (
    types.includes("GROUP_LEAD") ||
    types.includes("GROUP_BOOKING") ||
    types.includes("GROUP")
  )
    return "GROUP_LEAD";
  if (types.includes("HIGH_PAY") || types.includes("HIGHPAY"))
    return "HIGH_PAY";
  if (types.includes("UPSELLING") || types.includes("UPSELL"))
    return "UPSELLING";
  if (types.includes("LEAD") || types.includes("LEAD_ONLY")) return "LEAD";
  return "INQUIRY";
};

const STATUS_CONFIG = {
  new: {
    label: "New Lead",
    bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  follow_up: {
    label: "Follow Up",
    bg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  in_progress: {
    label: "In Progress",
    bg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  },
  booked: {
    label: "Booked",
    bg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  cold: {
    label: "Cold",
    bg: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  },
  lost: {
    label: "Lost",
    bg: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  },
};

const HEAT_CONFIG = {
  HOT: {
    label: "Hot",
    bg: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    dot: "bg-rose-400",
  },
  WARM: {
    label: "Warm",
    bg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    dot: "bg-amber-400",
  },
  COLD: {
    label: "Cold",
    bg: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    dot: "bg-sky-400",
  },
};

export default function CRM() {
  const navigate = useNavigate();

  // Tab: 'staychat' | 'local'
  const [activeTab, setActiveTab] = useState("staychat");

  // Local CRM leads state
  const [leads, setLeads] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [stats, setStats] = useState({ total: 0, by_status: {} });

  // StayChat Leads state
  const [stayChatLeads, setStayChatLeads] = useState([]);
  const [stayChatTotal, setStayChatTotal] = useState(0);
  const [stayChatHeatFilter, setStayChatHeatFilter] = useState("");
  const [selectedLeadType, setSelectedLeadType] = useState("");
  const [selectedStayChatHotelId, setSelectedStayChatHotelId] =
    useState("111111");

  // Common UI state
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedHotel, setSelectedHotel] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedLeads, setSelectedLeads] = useState(new Set());

  // Modals
  const [callModalLead, setCallModalLead] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [notification, setNotification] = useState(null);

  const showNotification = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchHotels = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/hotels?active_only=true`);
      const data = await res.json();
      if (data.success) setHotels(data.data || []);
    } catch (err) {
      console.error("Failed to load hotels:", err);
    }
  };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (selectedHotel) params.append("hotel_id", selectedHotel);
      if (selectedStatus) params.append("status", selectedStatus);

      const res = await fetch(
        `${BACKEND_URL}/api/v1/crm/leads?${params.toString()}`,
      );
      const data = await res.json();
      if (data.success) {
        setLeads(data.data || []);
        if (data.counts) setStats(data.counts);
      }
    } catch (err) {
      console.error("Failed to fetch CRM leads:", err);
      showNotification("Could not connect to CRM API", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchStayChatLeads = async (customHotelId, customLeadType) => {
    setLoading(true);
    const hid =
      customHotelId !== undefined
        ? customHotelId
        : selectedStayChatHotelId || "111111";
    const lType =
      customLeadType !== undefined ? customLeadType : selectedLeadType;
    try {
      // Default to "LEAD" if no specific leadType selected, otherwise pass selected capital leadType
      const leadTypeParam =
        lType && lType.trim()
          ? encodeURIComponent(lType.trim().toUpperCase())
          : "LEAD";
      const res = await fetch(
        `${BACKEND_URL}/api/v1/crm/staychat-leads?hotelId=${encodeURIComponent(hid)}&page=1&limit=1000&leadType=${leadTypeParam}`,
      );
      const data = await res.json();

      // Required: console.log all data first
      console.log("StayChat Leads Raw Response:", data);

      if (data.success) {
        const classifications = data.classifications || [];
        console.log(
          `Loaded ${classifications.length} StayChat classifications:`,
          classifications,
        );
        setStayChatLeads(classifications);
        setStayChatTotal(data.total || classifications.length);
      } else {
        showNotification(
          data.error || "Failed to fetch StayChat leads",
          "error",
        );
      }
    } catch (err) {
      console.error("Failed to fetch StayChat leads:", err);
      showNotification("Could not reach backend StayChat leads route", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotels();
    fetchStayChatLeads("111111", "");
  }, []);

  useEffect(() => {
    if (activeTab === "local") {
      fetchLeads();
    }
  }, [activeTab, selectedHotel, selectedStatus]);

  // When user selects a hotel from the custom select menu, automatically fetch leads
  const handleHotelSelect = (hotelId) => {
    setSelectedStayChatHotelId(hotelId);
    fetchStayChatLeads(hotelId, selectedLeadType);
  };

  // When user selects a classification, trigger fetch with the capital leadType in URL params
  const handleLeadTypeSelect = (leadType) => {
    setSelectedLeadType(leadType);
    fetchStayChatLeads(selectedStayChatHotelId, leadType);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (activeTab === "local") {
      fetchLeads();
    }
  };

  const toggleSelectLead = (id) => {
    const next = new Set(selectedLeads);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedLeads(next);
  };

  const currentLeadList = activeTab === "staychat" ? stayChatLeads : leads;
  const currentLeadIds =
    activeTab === "staychat"
      ? stayChatLeads.map((l) => l._id)
      : leads.map((l) => l.lead_id);

  const toggleSelectAll = () => {
    if (
      selectedLeads.size === currentLeadIds.length &&
      currentLeadIds.length > 0
    ) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(currentLeadIds));
    }
  };

  const handleSeedSampleLeads = async () => {
    setActionLoading(true);
    try {
      const sampleGuests = [
        {
          guest_name: "Rahul Sharma",
          phone_number: "+918544953527",
          lead_details:
            "Interested in Deluxe Room for 2 nights check-in tomorrow",
          status: "new",
        },
        {
          guest_name: "Priya Verma",
          phone_number: "+918544953527",
          lead_details: "Inquired about suite pricing and airport cab pickup",
          status: "follow_up",
        },
        {
          guest_name: "Aman Gupta",
          phone_number: "+918544953527",
          lead_details: "Looking to book banquet hall for family dinner",
          status: "new",
        },
        {
          guest_name: "Vikram Malhotra",
          phone_number: "+918544953527",
          lead_details: "Requested early check-in at 10 AM for executive suite",
          status: "in_progress",
        },
        {
          guest_name: "Neha Kapoor",
          phone_number: "+918544953527",
          lead_details:
            "Asking for couple weekend package with breakfast included",
          status: "new",
        },
        {
          guest_name: "Siddharth Rao",
          phone_number: "+918544953527",
          lead_details: "Corporate stay for 3 days requiring high-speed wifi",
          status: "follow_up",
        },
        {
          guest_name: "Ananya Patel",
          phone_number: "+918544953527",
          lead_details:
            "Inquiry for pool facing villa with extra bed for child",
          status: "booked",
        },
      ];

      for (const lead of sampleGuests) {
        await fetch(`${BACKEND_URL}/api/v1/crm/leads`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...lead, source: "sample_import" }),
        });
      }
      showNotification("Successfully imported 7 test leads!");
      fetchLeads();
    } catch (err) {
      showNotification("Failed to import sample leads", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (leadId) => {
    if (!confirm("Are you sure you want to remove this lead?")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/crm/leads/${leadId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showNotification("Lead removed from CRM");
        fetchLeads();
      }
    } catch (err) {
      showNotification("Failed to delete lead", "error");
    }
  };

  const handleLaunchCampaign = () => {
    const selectedList = leads.filter((l) => selectedLeads.has(l.lead_id));
    navigate("/campaigns", { state: { preselectedLeads: selectedList } });
  };

  // Convert StayChat lead format to call-modal compatible format
  const handleCallStayChatLead = async (stayLead) => {
    const rawPhone =
      stayLead.phone ||
      stayLead.stayDetails?.contactPhone ||
      stayLead.conversationId ||
      "";
    const formattedPhone = rawPhone.startsWith("+")
      ? rawPhone
      : rawPhone
        ? `+${rawPhone}`
        : "";
    const guestName =
      stayLead.stayDetails?.guestName ||
      `Guest (${formattedPhone.slice(-4) || stayLead._id?.slice(-4)})`;
    const leadDetails = stayLead.summary || "StayChat Inbound Guest Lead";
    console.log({
      guest_name: guestName,
      phone_number: formattedPhone,
      lead_details: leadDetails,
      hotel_id: selectedStayChatHotelId,
      source: "staychat",
      status: "new",
    });

    return;

    setActionLoading(true);
    try {
      const createRes = await fetch(`${BACKEND_URL}/api/v1/crm/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guest_name: guestName,
          phone_number: formattedPhone,
          lead_details: leadDetails,
          hotel_id: selectedStayChatHotelId,
          source: "staychat",
          status: "new",
        }),
      });
      const createData = await createRes.json();
      if (createData.success && createData.lead) {
        setCallModalLead(createData.lead);
      } else {
        setCallModalLead({
          lead_id: stayLead._id,
          guest_name: guestName,
          phone_number: formattedPhone,
          hotel_id: selectedStayChatHotelId,
          lead_details: leadDetails,
        });
      }
    } catch (err) {
      setCallModalLead({
        lead_id: stayLead._id,
        guest_name: guestName,
        phone_number: formattedPhone,
        hotel_id: selectedStayChatHotelId,
        lead_details: leadDetails,
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered StayChat leads
  const filteredStayChatLeads = stayChatLeads.filter((item) => {
    // Lead classification / type filter
    if (selectedLeadType) {
      const canonicalType = getLeadClassificationType(item);
      const rawTypes = [
        ...(Array.isArray(item.lead_types) ? item.lead_types : []),
        ...(Array.isArray(item.leadTypes) ? item.leadTypes : []),
        ...(item.lead_type ? [item.lead_type] : []),
        ...(Array.isArray(item.attribute_tags) ? item.attribute_tags : []),
      ].map((t) => String(t).toUpperCase().trim());

      const target = selectedLeadType.toUpperCase().trim();
      const matchesType = canonicalType === target || rawTypes.includes(target);

      if (!matchesType) return false;
    }

    if (stayChatHeatFilter) {
      const heat = (item.heat || item.temperature || "").toUpperCase();
      if (heat !== stayChatHeatFilter) return false;
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      const guestName = (item.stayDetails?.guestName || "").toLowerCase();
      const phone = (item.phone || "").toLowerCase();
      const summary = (item.summary || "").toLowerCase();
      const roomType = (
        item.stayDetails?.roomType ||
        item.extracted_facts?.roomType ||
        ""
      ).toLowerCase();
      const leadType = (
        item.lead_type ||
        (Array.isArray(item.lead_types) ? item.lead_types.join(" ") : "")
      ).toLowerCase();

      return (
        guestName.includes(s) ||
        phone.includes(s) ||
        summary.includes(s) ||
        roomType.includes(s) ||
        leadType.includes(s)
      );
    }
    return true;
  });

  // Calculate StayChat stats
  const hotCount = stayChatLeads.filter(
    (l) => (l.heat || l.temperature || "").toUpperCase() === "HOT",
  ).length;
  const warmCount = stayChatLeads.filter(
    (l) => (l.heat || l.temperature || "").toUpperCase() === "WARM",
  ).length;
  const coldCount = stayChatLeads.filter(
    (l) => (l.heat || l.temperature || "").toUpperCase() === "COLD",
  ).length;

  const currentActiveHotel = STAYCHAT_HOTELS.find(
    (h) => h.hotel_id === selectedStayChatHotelId,
  ) || {
    hotel_id: selectedStayChatHotelId,
    name: `Hotel ${selectedStayChatHotelId}`,
    city: "Custom",
  };

  return (
    <div className="flex-1 flex flex-col p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Banner / Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
            notification.type === "error"
              ? "bg-rose-500/10 border-rose-500/20 text-rose-300"
              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
          }`}
        >
          <span>{notification.msg}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-xs underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 bg-indigo-600/15 border border-indigo-500/30 rounded-xl text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              CRM Leads & Guests
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {activeTab === "staychat"
                ? `${stayChatTotal || stayChatLeads.length} StayChat`
                : `${stats.total || leads.length} Local`}
            </span>
          </div>
          <p className="text-sm text-slate-400">
            Guest database connected with instant single-call confirmation and
            batch campaign triggers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === "local" && selectedLeads.size > 0 && (
            <button
              onClick={handleLaunchCampaign}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Create Campaign ({selectedLeads.size})
            </button>
          )}

          {activeTab === "local" && (
            <button
              onClick={() => setAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-semibold rounded-xl transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-indigo-400" />
              Add Lead
            </button>
          )}

          <button
            onClick={() =>
              activeTab === "staychat"
                ? fetchStayChatLeads(selectedStayChatHotelId)
                : fetchLeads()
            }
            disabled={loading}
            className="p-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
            title="Refresh"
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Leads Source Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-900/80 border border-slate-800 rounded-2xl w-fit">
        <button
          onClick={() => {
            setActiveTab("staychat");
            setSelectedLeads(new Set());
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "staychat"
              ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>StayChat Live Leads</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeTab === "staychat"
                ? "bg-white/20 text-white"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            {stayChatTotal || stayChatLeads.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab("local");
            setSelectedLeads(new Set());
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "local"
              ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span>Local CRM Database</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeTab === "local"
                ? "bg-white/20 text-white"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            {stats.total || leads.length}
          </span>
        </button>
      </div>

      {/* TAB 1: STAYCHAT LEADS */}
      {activeTab === "staychat" && (
        <>
          {/* Quick Heat Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                key: "",
                label: "All StayChat Leads",
                count: stayChatTotal || stayChatLeads.length,
                icon: Users,
                accent: "text-indigo-400",
              },
              {
                key: "HOT",
                label: "Hot Leads",
                count: hotCount,
                icon: Flame,
                accent: "text-rose-400",
              },
              {
                key: "WARM",
                label: "Warm Leads",
                count: warmCount,
                icon: ThermometerSun,
                accent: "text-amber-400",
              },
              {
                key: "COLD",
                label: "Cold Leads",
                count: coldCount,
                icon: Clock,
                accent: "text-sky-400",
              },
            ].map((item) => {
              const isActive = stayChatHeatFilter === item.key;
              const IconComponent = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => setStayChatHeatFilter(item.key)}
                  className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
                    isActive
                      ? "bg-gradient-to-b from-indigo-600/20 to-indigo-600/5 border-indigo-500/50 shadow-lg shadow-indigo-600/10"
                      : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/90"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-slate-400 font-medium">
                      {item.label}
                    </span>
                    <IconComponent
                      className={`w-3.5 h-3.5 ${item.accent} opacity-70 group-hover:opacity-100 transition-opacity`}
                    />
                  </div>
                  <div
                    className={`text-xl font-bold tracking-tight ${isActive ? "text-white" : "text-slate-200"}`}
                  >
                    {item.count}
                  </div>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 shadow-sm" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Search, Custom Hotel Select & Classification Filter */}
          <div className="relative z-30 p-3.5 bg-slate-900/70 border border-slate-800/80 rounded-2xl flex flex-col lg:flex-row gap-3 items-center justify-between backdrop-blur-md">
            <div className="flex-1 w-full relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search guest, phone, room, classification, or requirements..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full lg:w-auto">
              {/* Classification / Lead Type Select Menu */}
              <div className="w-full sm:w-56">
                <StandaloneSelect
                  value={selectedLeadType}
                  onChange={handleLeadTypeSelect}
                  placeholder="Classification"
                  options={LEAD_CLASSIFICATION_OPTIONS.map((opt) => ({
                    value: opt.value,
                    label: opt.label,
                    icon: <Tag className="w-3.5 h-3.5 text-cyan-400" />,
                  }))}
                />
              </div>

              {/* Custom Hotel ID & Hotel Name Select Menu */}
              <div className="w-full sm:w-72">
                <StandaloneSelect
                  value={selectedStayChatHotelId}
                  onChange={handleHotelSelect}
                  placeholder="Select Hotel"
                  searchable={true}
                  options={STAYCHAT_HOTELS.map((h) => ({
                    value: h.hotel_id,
                    label: `${h.name} (${h.hotel_id})`,
                    subLabel: h.city || h.address,
                    icon: <Building2 className="w-3.5 h-3.5 text-indigo-400" />,
                  }))}
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStayChatHeatFilter("");
                  setSelectedLeadType("");
                  fetchStayChatLeads(selectedStayChatHotelId, "");
                }}
                className="text-xs font-semibold text-slate-400 hover:text-white px-3.5 py-2.5 border border-slate-800 rounded-xl bg-slate-950/50 hover:bg-slate-800/60 transition-colors shrink-0 cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Current Hotel & Active Filters Indicator Card */}
          <div className="px-4 py-2.5 bg-indigo-950/30 border border-indigo-500/20 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="text-slate-400">Showing leads for:</span>
              <span className="font-semibold text-white">
                {currentActiveHotel.name}
              </span>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                ID: {currentActiveHotel.hotel_id}
              </span>
              {currentActiveHotel.property_code && (
                <span className="font-mono text-[10px] text-slate-500 uppercase hidden sm:inline">
                  Code: {currentActiveHotel.property_code}
                </span>
              )}
              {selectedLeadType && (
                <span className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  <Tag className="w-3 h-3 text-cyan-400" />
                  Type: {selectedLeadType}
                  <button
                    onClick={() => {
                      setSelectedLeadType("");
                      fetchStayChatLeads(selectedStayChatHotelId, "");
                    }}
                    className="ml-1 text-slate-400 hover:text-white cursor-pointer font-bold"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
            <div className="text-slate-400 text-[11px]">
              Showing{" "}
              <span className="text-white font-semibold">
                {filteredStayChatLeads.length}
              </span>{" "}
              lead{filteredStayChatLeads.length === 1 ? "" : "s"}
            </div>
          </div>

          {/* StayChat Leads Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-slate-300 table-fixed border-collapse">
                <colgroup>
                  <col className="w-[20%]" />
                  <col className="w-[12%]" />
                  <col className="w-[14%]" />
                  <col className="w-[16%]" />
                  <col className="w-[26%]" />
                  <col className="w-[12%]" />
                </colgroup>
                <thead className="bg-slate-950/80 text-[11px] font-semibold text-slate-400 border-b border-slate-800/90 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 text-left font-semibold">
                      Guest & Phone
                    </th>
                    <th className="py-3.5 px-3 text-center font-semibold">
                      Lead Heat
                    </th>
                    <th className="py-3.5 px-3 text-center font-semibold">
                      Stay Dates
                    </th>
                    <th className="py-3.5 px-4 text-left font-semibold">
                      Room & Quote
                    </th>
                    <th className="py-3.5 px-4 text-left font-semibold">
                      AI Conversation Summary
                    </th>
                    <th className="py-3.5 px-4 text-center font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-14 px-4 text-center text-slate-500"
                      >
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2.5 text-indigo-400" />
                        <span className="text-sm font-medium">
                          Fetching leads from StayChat Combot API...
                        </span>
                      </td>
                    </tr>
                  ) : filteredStayChatLeads.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-16 px-4 text-center text-slate-500"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
                          <Flame className="w-7 h-7" />
                        </div>
                        <div className="text-base font-semibold text-slate-200 mb-1">
                          No StayChat leads match current filters
                        </div>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5">
                          {selectedLeadType || stayChatHeatFilter || search
                            ? "Try clearing your filters or selecting a different classification."
                            : `No leads found for ${currentActiveHotel.name}. Select another hotel property.`}
                        </p>
                        <div className="flex items-center justify-center gap-2">
                          {(selectedLeadType ||
                            stayChatHeatFilter ||
                            search) && (
                            <button
                              onClick={() => {
                                setSelectedLeadType("");
                                setStayChatHeatFilter("");
                                setSearch("");
                              }}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all cursor-pointer border border-slate-700"
                            >
                              Reset All Filters
                            </button>
                          )}
                          <button
                            onClick={() => handleHotelSelect("111111")}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/20"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Switch to Hotel Sahu (111111)
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredStayChatLeads.map((item) => {
                      const heatKey = (
                        item.heat ||
                        item.temperature ||
                        "WARM"
                      ).toUpperCase();
                      const heatStyle =
                        HEAT_CONFIG[heatKey] || HEAT_CONFIG.WARM;
                      const guestName =
                        item.stayDetails?.guestName || "Prospective Guest";
                      const rawPhone =
                        item.phone ||
                        item.stayDetails?.contactPhone ||
                        item.conversationId;
                      const phone = rawPhone
                        ? rawPhone.startsWith("+")
                          ? rawPhone
                          : `+${rawPhone}`
                        : "No Phone";
                      const checkIn =
                        item.stayDetails?.checkIn ||
                        item.extracted_facts?.checkInDate;
                      const checkOut =
                        item.stayDetails?.checkOut ||
                        item.extracted_facts?.checkOutDate;
                      const nights = item.extracted_facts?.numberOfNights;
                      const roomType =
                        item.stayDetails?.roomType ||
                        item.extracted_facts?.roomType;
                      const amount =
                        item.stayDetails?.pricing?.total ||
                        item.extracted_facts?.bookingAmount;
                      const guests =
                        item.stayDetails?.guests ||
                        item.extracted_facts?.adults;

                      return (
                        <tr
                          key={item._id}
                          className="hover:bg-slate-800/40 transition-colors"
                        >
                          {/* Column 1: Guest & Phone */}
                          <td className="py-3.5 px-4 align-top">
                            <div
                              className="font-semibold text-white truncate capitalize text-[13px]"
                              title={guestName}
                            >
                              {guestName}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md">
                                <Phone className="w-3 h-3 text-indigo-400 shrink-0" />
                                {phone}
                              </span>
                            </div>
                            {/* Classification / Lead Type Badge */}
                            {(() => {
                              const canonicalType =
                                getLeadClassificationType(item);
                              const rawType =
                                item.lead_type ||
                                (Array.isArray(item.lead_types) &&
                                  item.lead_types[0]) ||
                                (Array.isArray(item.attribute_tags) &&
                                  item.attribute_tags[0]) ||
                                canonicalType;
                              if (!rawType && !canonicalType) return null;
                              const typeKey =
                                canonicalType || String(rawType).toUpperCase();
                              const cfg = LEAD_TYPE_BADGE_CONFIG[typeKey] || {
                                label: String(typeKey).replace(/_/g, " "),
                                color:
                                  "bg-slate-800 text-slate-300 border-slate-700/60",
                              };
                              return (
                                <div className="mt-1.5 flex items-center gap-1">
                                  <span
                                    className={`inline-flex items-center gap-1 text-[9px] uppercase font-mono font-semibold px-2 py-0.5 rounded border ${cfg.color}`}
                                  >
                                    <Tag className="w-2.5 h-2.5 opacity-70" />
                                    {cfg.label}
                                  </span>
                                </div>
                              );
                            })()}
                            {item.bookingState && (
                              <div className="mt-1">
                                <span className="inline-block text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                                  State: {item.bookingState}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Column 2: Lead Heat (Centered) */}
                          <td className="py-3.5 px-3 text-center align-top">
                            <div className="flex flex-col items-center justify-center">
                              <span
                                className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-semibold border ${heatStyle.bg}`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${heatStyle.dot}`}
                                />
                                {heatKey}
                              </span>
                              {item.confidence && (
                                <span className="text-[10px] text-slate-500 mt-1 font-mono">
                                  {Math.round(item.confidence * 100)}% match
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Column 3: Stay Dates (Centered) */}
                          <td className="py-3.5 px-3 text-center align-top">
                            {checkIn ? (
                              <div className="flex flex-col items-center">
                                <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-200 bg-slate-950/60 border border-slate-800 px-2 py-0.5 rounded-md">
                                  <Calendar className="w-3 h-3 text-indigo-400 shrink-0" />
                                  <span>{checkIn}</span>
                                </div>
                                {checkOut && (
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    to {checkOut}
                                  </div>
                                )}
                                {nights && (
                                  <span className="text-[10px] text-indigo-400/90 font-mono mt-0.5 font-medium">
                                    {nights} night{nights > 1 ? "s" : ""}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-500 italic text-xs">
                                —
                              </span>
                            )}
                          </td>

                          {/* Column 4: Room & Quote */}
                          <td className="py-3.5 px-4 align-top">
                            {roomType && (
                              <div
                                className="capitalize font-medium text-slate-200 text-xs truncate flex items-center gap-1.5 mb-1"
                                title={roomType}
                              >
                                <BedDouble className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{roomType}</span>
                              </div>
                            )}
                            {amount ? (
                              <div className="font-semibold text-emerald-400 text-xs flex items-center gap-0.5">
                                <IndianRupee className="w-3 h-3" />
                                <span>{Number(amount).toLocaleString()}</span>
                              </div>
                            ) : null}
                            {guests ? (
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {guests} Guest{guests > 1 ? "s" : ""}
                              </div>
                            ) : null}
                            {!roomType && !amount && !guests && (
                              <span className="text-slate-500 italic text-xs">
                                —
                              </span>
                            )}
                          </td>

                          {/* Column 5: AI Conversation Summary */}
                          <td className="py-3.5 px-4 align-top">
                            <p
                              className="text-xs text-slate-300 leading-relaxed line-clamp-3 text-justify"
                              title={item.summary}
                            >
                              {item.summary || "—"}
                            </p>
                            {item.updatedAt && (
                              <div className="text-[10px] text-slate-500 mt-1.5">
                                Updated:{" "}
                                {new Date(item.updatedAt).toLocaleDateString()}
                              </div>
                            )}
                          </td>

                          {/* Column 6: Action (Centered) */}
                          <td className="py-3.5 px-4 text-center align-middle whitespace-nowrap">
                            <button
                              onClick={() => handleCallStayChatLead(item)}
                              disabled={actionLoading}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-950/40 transition-all cursor-pointer w-full"
                            >
                              <PhoneCall className="w-3.5 h-3.5 shrink-0" />
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
          </div>
        </>
      )}

      {/* TAB 2: LOCAL CRM LEADS */}
      {activeTab === "local" && (
        <>
          {/* Status Filter Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              {
                key: "",
                label: "All Leads",
                count: stats.total || leads.length,
                icon: Users,
                accent: "text-indigo-400",
              },
              {
                key: "new",
                label: "New Leads",
                count: stats.by_status?.new || 0,
                icon: Flame,
                accent: "text-emerald-400",
              },
              {
                key: "follow_up",
                label: "Follow Up",
                count: stats.by_status?.follow_up || 0,
                icon: Clock,
                accent: "text-amber-400",
              },
              {
                key: "in_progress",
                label: "In Progress",
                count: stats.by_status?.in_progress || 0,
                icon: Sparkles,
                accent: "text-indigo-400",
              },
              {
                key: "booked",
                label: "Booked",
                count: stats.by_status?.booked || 0,
                icon: Award,
                accent: "text-blue-400",
              },
              {
                key: "cold",
                label: "Cold / Lost",
                count:
                  (stats.by_status?.cold || 0) + (stats.by_status?.lost || 0),
                icon: AlertCircle,
                accent: "text-slate-400",
              },
            ].map((item) => {
              const isActive = selectedStatus === item.key;
              const IconComponent = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => setSelectedStatus(item.key)}
                  className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
                    isActive
                      ? "bg-gradient-to-b from-indigo-600/20 to-indigo-600/5 border-indigo-500/50 shadow-lg shadow-indigo-600/10"
                      : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/90"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-slate-400 font-medium">
                      {item.label}
                    </span>
                    <IconComponent
                      className={`w-3.5 h-3.5 ${item.accent} opacity-70 group-hover:opacity-100 transition-opacity`}
                    />
                  </div>
                  <div
                    className={`text-xl font-bold tracking-tight ${isActive ? "text-white" : "text-slate-200"}`}
                  >
                    {item.count}
                  </div>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 shadow-sm" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Filter & Search Bar */}
          <div className="relative z-30 p-3.5 bg-slate-900/70 border border-slate-800/80 rounded-2xl flex flex-col md:flex-row gap-3 items-center justify-between backdrop-blur-md">
            <form
              onSubmit={handleSearchSubmit}
              className="flex-1 w-full relative"
            >
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by guest name, phone, or notes..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </form>

            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <div className="w-full md:w-56">
                <StandaloneSelect
                  value={selectedHotel}
                  onChange={(val) => setSelectedHotel(val)}
                  placeholder="All Hotels"
                  searchable={hotels.length > 4}
                  options={[
                    { value: "", label: "All Hotels" },
                    ...hotels.map((h) => ({
                      value: h.hotel_id,
                      label: h.name || h.hotel_name || "Hotel Property",
                      subLabel: h.contact?.city || h.city || "Hotel",
                    })),
                  ]}
                />
              </div>

              <button
                onClick={() => {
                  setSearch("");
                  setSelectedHotel("");
                  setSelectedStatus("");
                }}
                className="text-xs font-semibold text-slate-400 hover:text-white px-3.5 py-2.5 border border-slate-800 rounded-xl bg-slate-950/50 hover:bg-slate-800/60 transition-colors shrink-0 cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Leads Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-slate-300 table-fixed border-collapse">
                <colgroup>
                  <col className="w-[5%]" />
                  <col className="w-[22%]" />
                  <col className="w-[15%]" />
                  <col className="w-[12%]" />
                  <col className="w-[28%]" />
                  <col className="w-[8%]" />
                  <col className="w-[10%]" />
                </colgroup>
                <thead className="bg-slate-950/80 text-[11px] font-semibold text-slate-400 border-b border-slate-800/90 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-3 text-center">
                      <button
                        onClick={toggleSelectAll}
                        className="text-slate-400 hover:text-white cursor-pointer inline-flex items-center justify-center"
                      >
                        {selectedLeads.size > 0 &&
                        selectedLeads.size === leads.length ? (
                          <CheckSquare className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="py-3.5 px-4 text-left font-semibold">
                      Guest & Phone
                    </th>
                    <th className="py-3.5 px-4 text-left font-semibold">
                      Hotel Property
                    </th>
                    <th className="py-3.5 px-3 text-center font-semibold">
                      Status
                    </th>
                    <th className="py-3.5 px-4 text-left font-semibold">
                      Lead Details & Notes
                    </th>
                    <th className="py-3.5 px-3 text-center font-semibold">
                      Calls
                    </th>
                    <th className="py-3.5 px-4 text-center font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-14 px-4 text-center text-slate-500"
                      >
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                        Loading CRM leads...
                      </td>
                    </tr>
                  ) : leads.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-16 px-4 text-center text-slate-500"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
                          <Users className="w-7 h-7" />
                        </div>
                        <div className="text-base font-semibold text-slate-200 mb-1">
                          No leads found in this view
                        </div>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
                          Add a prospective guest manually or load sample guest
                          leads to start testing voice calls.
                        </p>
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={handleSeedSampleLeads}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all cursor-pointer shadow-md"
                          >
                            {actionLoading ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                            )}
                            Load 7 Sample Test Leads
                          </button>
                          <button
                            onClick={() => setAddModalOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                            Add New Lead
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    leads.map((lead) => {
                      const isChecked = selectedLeads.has(lead.lead_id);
                      const st =
                        STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;
                      return (
                        <tr
                          key={lead.lead_id}
                          className={`hover:bg-slate-800/40 transition-colors ${isChecked ? "bg-indigo-600/5" : ""}`}
                        >
                          <td className="py-3.5 px-3 text-center align-top">
                            <button
                              onClick={() => toggleSelectLead(lead.lead_id)}
                              className="text-slate-400 hover:text-white cursor-pointer inline-flex items-center justify-center mt-0.5"
                            >
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-indigo-400" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                          <td className="py-3.5 px-4 align-top">
                            <div
                              className="font-semibold text-white truncate capitalize text-[13px]"
                              title={lead.guest_name}
                            >
                              {lead.guest_name}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md">
                                <Phone className="w-3 h-3 text-indigo-400 shrink-0" />
                                {lead.phone_number}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 align-top text-xs text-slate-300">
                            {lead.hotel_name ? (
                              <div className="flex items-center gap-1.5 font-medium text-slate-200">
                                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">
                                  {lead.hotel_name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-500 italic">
                                Unassigned
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 text-center align-top">
                            <span
                              className={`inline-block text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${st.bg}`}
                            >
                              {st.label}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 align-top text-xs text-slate-300 leading-relaxed">
                            <p
                              className="line-clamp-2"
                              title={lead.lead_details}
                            >
                              {lead.lead_details || "—"}
                            </p>
                          </td>
                          <td className="py-3.5 px-3 text-center align-top">
                            <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded font-mono font-semibold text-xs text-slate-200 bg-slate-800 px-1.5 border border-slate-700">
                              {lead.call_count || 0}
                            </span>
                            {lead.last_called_at && (
                              <div className="text-[10px] text-slate-500 mt-1">
                                {new Date(
                                  lead.last_called_at,
                                ).toLocaleDateString()}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center align-middle whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setCallModalLead(lead)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
                              >
                                <PhoneCall className="w-3 h-3" />
                                <span>Call</span>
                              </button>
                              <button
                                onClick={() => handleDelete(lead.lead_id)}
                                className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="Delete lead"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      {callModalLead && (
        <ConfirmCallModal
          lead={callModalLead}
          hotels={hotels}
          onClose={() => setCallModalLead(null)}
          onCallTriggered={(res) => {
            setCallModalLead(null);
            showNotification(`Call triggered to ${callModalLead.guest_name}!`);
            if (activeTab === "local") fetchLeads();
          }}
        />
      )}

      {addModalOpen && (
        <AddLeadModal
          hotels={hotels}
          onClose={() => setAddModalOpen(false)}
          onLeadCreated={() => {
            setAddModalOpen(false);
            showNotification("New lead successfully added to CRM");
            fetchLeads();
          }}
        />
      )}
    </div>
  );
}
