import React, { useState, useEffect } from "react";
import { useForm, useFieldArray, FormProvider } from "react-hook-form";
import {
  Building2,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Bed,
  Utensils,
  ShieldAlert,
  TrendingUp,
  MapPin,
  Eye,
  ConciergeBell,
  Clock,
} from "lucide-react";
import {
  InputField,
  TextareaField,
  SelectField,
  NumberStepperField,
} from "./common/FormControl";

const TABS = [
  { id: "identity", label: "Property Identity", icon: Building2 },
  { id: "rooms", label: "Rooms & Pricing", icon: Bed },
  { id: "amenities", label: "Dining & Facilities", icon: Utensils },
  { id: "upsells", label: "Upsells", icon: TrendingUp },
  { id: "policies", label: "Policies", icon: ShieldAlert },
  { id: "ai_kb", label: "AI Knowledge", icon: Sparkles },
];

const PROPERTY_TYPES = [
  { value: "luxury", label: "✦ Luxury Hotel" },
  { value: "hotel", label: "🏨 Standard Hotel" },
  { value: "resort", label: "🌴 Beach / Hill Resort" },
  { value: "boutique", label: "🏛 Boutique Heritage" },
  { value: "business", label: "💼 Business / Airport Hotel" },
];

const DEFAULT_HOTEL_VALUES = {
  name: "Hotel Sahu",
  tagline: "An iconic luxury hotel blending traditional Indian hospitality with world-class amenities.",
  star_rating: 5,
  property_type: "luxury",
  is_active: true,
  contact: {
    address: "8255+C5Q, D36/207A2, Bangali Tola, Varanasi, Uttar Pradesh 221001, India",
    city: "Varanasi",
    state: "Uttar Pradesh",
    country: "India",
    phone: "05422455411",
    email: "hotelsahuvaranasi@gmail.com",
    website: "https://HOTELSAHU.COM",
  },
  policies: {
    check_in_time: "13:00",
    check_out_time: "11:00",
    early_checkin_policy: "May be available subject to hotel availability.",
    late_checkout_policy: "May attract additional charges.",
    cancellation_policy: "Free cancellation available up to 48 hours before check-in. After that, one night's charge applies.",
    pet_policy: "Not allowed",
    child_policy: "Children allowed. Free stay for children up to 7 years. Paid child age range up to 12 years. Extra bed type: Mattress.",
    smoking_policy: "Allowed in designated areas. Couples friendly: Yes, Male groups: Yes, Guests below 18: Yes. Same city ID: Not accepted. ID proofs: Passport, Aadhaar, Driving License, Government ID.",
  },
  amenities: {
    dining: [],
    has_bar: false,
    bar_details: "",
    has_room_service: true,
    room_service_hours: "24/7 (In-room dining). Meal pricing: Breakfast ₹250, Lunch ₹250, Dinner ₹250",
    has_spa: false,
    spa_details: "",
    has_gym: false,
    gym_hours: "",
    has_pool: true,
    pool_type: "Outdoor swimming pool (07:00 - 22:00)",
    has_wifi: true,
    wifi_policy: "Complimentary Wi-Fi available",
    parking: "Available inside hotel premises after 10 PM. Before that, guests can use nearby parking at their own cost.",
    airport_shuttle: "Available through taxi/cab service",
  },
  room_types: [
    {
      name: "Deluxe Room King Bed",
      description: "1x King Bed, 120 Sq Ft, Apartment-Style (13 units available). Rate Plans: EP: ₹2428.58, CP: ₹2809.52",
      max_occupancy: 4,
      price_per_night_inr: 2428.58,
      amenities_text: "Air Conditioning, Hot & Cold Water, TV, Toiletries, Towels, Wi-Fi",
    },
    {
      name: "Premier Room King Bed",
      description: "1x King Bed, 150 Sq Ft (23 units available). Rate Plans: EP: ₹2738.10, CP: ₹3119.05, MAP: ₹3690.48",
      max_occupancy: 4,
      price_per_night_inr: 2738.1,
      amenities_text: "Hot & Cold Water, TV, Toiletries, Towels, Air Conditioning, Free Wi-Fi, 24-hour Room Service, 24-hour In-room Dining, Laundry Service, Charging Points, Couch, Closet, Seating Area, Work Desk, Blackout Curtains, Dining Table, Kettle, Geyser/Water Heater, Western Toilet Seat",
    },
    {
      name: "Deluxe Room Four Bed",
      description: "2 King-size Beds, 200 Sq Ft (3 units available). Rate Plans: EP: ₹4333.33, CP: ₹5000, MAP: ₹6190.48",
      max_occupancy: 6,
      price_per_night_inr: 4333.33,
      amenities_text: "Bathtub, Hot & Cold Water, Toiletries, Towels, TV",
    },
    {
      name: "Deluxe Family Room",
      description: "1x King Bed, 1x Queen Bed, 150 Sq Ft (4 units available). Rate Plans: EP: ₹3690.48, CP: ₹4642.86, MAP: ₹5238.10",
      max_occupancy: 5,
      price_per_night_inr: 3690.48,
      amenities_text: "Hot & Cold Water, Toiletries, Towels, TV, Geyser, Mirror, Air Conditioning, Wi-Fi, Safe Locker, Balcony, Study Room, Air Purifier, Living Area, Terrace",
    },
    {
      name: "Standard Non AC Room",
      description: "1x King Bed, 100 Sq Ft, Accessible by stairs (1 unit available). Rate Plans: EP: ₹1476.19",
      max_occupancy: 3,
      price_per_night_inr: 1476.19,
      amenities_text: "Toiletries, Mirror, Wi-Fi",
    },
    {
      name: "Standard Non AC Tripple Bed",
      description: "1x King Bed, 200 Sq Ft, Accessible by stairs (5 units available). Rate Plans: EP: ₹1761.90",
      max_occupancy: 4,
      price_per_night_inr: 1761.9,
      amenities_text: "Mirror, Wi-Fi",
    }
  ],
  upsells: [
    {
      name: "Boat Ride for 80 Ghats + Ganga Aarti",
      description: "Boat ride for 80 Ghats and Ganga Aarti.",
      price_inr: 400,
    },
    {
      name: "Varanasi Local Sightseeing",
      description: "4-seater car for Varanasi local sightseeing for 6 hours.",
      price_inr: 2500,
    },
    {
      name: "Airport Pickup / Drop",
      description: "4-seater airport pickup or drop.",
      price_inr: 1250,
    },
    {
      name: "Saree Purchase Assistance",
      description: "For saree shopping assistance, call 05422455411 for the shop number and guidance.",
      price_inr: 0,
    }
  ],
  inventory_notes: "Payment: 25% advance required for confirmation, balance at check-in. Parking inside hotel after 10 PM. Outside visitors not allowed.",
  ai_instructions: "Be polite and try to negotiate. Never quote a price from memory or estimate; use the exact figure from the booking engine. Never name competitor hotels or OTAs. If a guest asks for an agent, human, manager, staff, or front desk, immediately trigger escalation. Mention breakfast package availability once during booking confirmation. Never discuss hotel ownership, internal staff matters, or operational issues. If a guest mentions a birthday, anniversary, or honeymoon, acknowledge it warmly and mention that the team can arrange special setups. Fallback: I'm not sure about that. Let me connect you with our hotel team.",
};

// Reusable section card wrapper
function SectionCard({ children, className = "" }) {
  return (
    <div className={`p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl space-y-4 ${className}`}>
      {children}
    </div>
  );
}

// Colored heading inside a tab
function SectionHeading({ icon: Icon, label, color = "indigo", children }) {
  const colors = {
    indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    violet: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    amber:  "text-amber-400 bg-amber-500/10 border-amber-500/20",
    rose:   "text-rose-400 bg-rose-500/10 border-rose-500/20",
  };
  return (
    <div className="flex items-center justify-between">
      <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border ${colors[color]}`}>
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
      </div>
      {children}
    </div>
  );
}

// Dynamic item card (rooms / dining / upsells)
function ItemCard({ accentColor = "indigo", badgeLabel, index, onRemove, children }) {
  const accents = {
    indigo: "border-t-indigo-500/60",
    emerald: "border-t-emerald-500/60",
    violet: "border-t-violet-500/60",
  };
  const badges = {
    indigo: "bg-indigo-500/15 text-indigo-300 border-indigo-500/25",
    emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
    violet: "bg-violet-500/15 text-violet-300 border-violet-500/25",
  };
  return (
    <div
      className={`relative p-4 bg-linear-to-br from-slate-900 to-slate-900/60 border border-slate-800/80 border-t-2 rounded-2xl space-y-4 ${accents[accentColor]}`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg border ${badges[accentColor]}`}>
          {badgeLabel} #{index + 1}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer border border-transparent hover:border-rose-500/20"
          title="Remove"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {children}
    </div>
  );
}

export default function Hotels() {
  const [hotels, setHotels] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState(null);
  const [activeTab, setActiveTab] = useState("identity");
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ state: "idle", message: "" });
  const [promptPreview, setPromptPreview] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const methods = useForm({ defaultValues: DEFAULT_HOTEL_VALUES });
  const { control, reset, handleSubmit, watch } = methods;

  const roomTypesArray = useFieldArray({ control, name: "room_types" });
  const diningArray = useFieldArray({ control, name: "amenities.dining" });
  const upsellsArray = useFieldArray({ control, name: "upsells" });

  const fetchHotels = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/v1/hotels`);
      const data = await res.json();
      if (data.success) {
        setHotels(data.data || []);
        if (data.data?.length > 0 && !selectedHotelId) {
          loadHotelData(data.data[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load hotels:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchHotels(); }, []);

  const loadHotelData = (hotel) => {
    setSelectedHotelId(hotel.hotel_id);
    setPromptPreview(null);
    setSaveStatus({ state: "idle", message: "" });
    const formattedRooms = (hotel.room_types || []).map((r) => ({
      ...r,
      amenities_text: Array.isArray(r.amenities) ? r.amenities.join(", ") : (r.amenities || ""),
    }));
    reset({
      ...DEFAULT_HOTEL_VALUES,
      ...hotel,
      room_types: formattedRooms.length ? formattedRooms : DEFAULT_HOTEL_VALUES.room_types,
      amenities: { ...DEFAULT_HOTEL_VALUES.amenities, ...(hotel.amenities || {}) },
      policies: { ...DEFAULT_HOTEL_VALUES.policies, ...(hotel.policies || {}) },
      upsells: hotel.upsells || [],
    });
  };

  const handleCreateNew = () => {
    setSelectedHotelId(null);
    setPromptPreview(null);
    setSaveStatus({ state: "idle", message: "" });
    reset(DEFAULT_HOTEL_VALUES);
  };

  const onSubmit = async (formData) => {
    setSaveStatus({ state: "loading", message: "Saving Hotel Knowledge Base..." });
    const processedRooms = (formData.room_types || []).map((r) => ({
      name: r.name,
      description: r.description || "",
      max_occupancy: parseInt(r.max_occupancy, 10) || 2,
      price_per_night_inr: parseFloat(r.price_per_night_inr) || 0,
      amenities: r.amenities_text
        ? r.amenities_text.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
    }));
    const processedUpsells = (formData.upsells || []).map((u) => ({
      name: u.name,
      description: u.description || "",
      price_inr: parseFloat(u.price_inr) || 0,
    }));
    const { _id, created_at, updated_at, ...cleanFormData } = formData;
    const payload = {
      ...cleanFormData,
      star_rating: parseInt(formData.star_rating, 10) || 4,
      room_types: processedRooms,
      upsells: processedUpsells,
    };
    try {
      const url = selectedHotelId
        ? `${backendUrl}/api/v1/hotels/${selectedHotelId}`
        : `${backendUrl}/api/v1/hotels`;
      const method = selectedHotelId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        setSaveStatus({
          state: "success",
          message: selectedHotelId
            ? "Hotel knowledge base updated successfully!"
            : "New hotel configuration created!",
        });
        if (!selectedHotelId && resData.data?.hotel_id) setSelectedHotelId(resData.data.hotel_id);
        await fetchHotels();
      } else {
        setSaveStatus({ state: "error", message: resData.message || "Failed to save." });
      }
    } catch (err) {
      setSaveStatus({ state: "error", message: err.message || "Network error." });
    }
  };

  const handlePreviewPrompt = async () => {
    if (!selectedHotelId) {
      setSaveStatus({ state: "error", message: "Save the hotel first before generating a preview." });
      return;
    }
    setIsPreviewLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/v1/hotels/${selectedHotelId}/preview-prompt`);
      const data = await res.json();
      setPromptPreview(data.success ? data.prompt_context : ("Error: " + (data.message || "Unknown")));
    } catch (err) {
      setPromptPreview("Network error: " + err.message);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedHotelId || !window.confirm("Deactivate and remove this hotel?")) return;
    try {
      const res = await fetch(`${backendUrl}/api/v1/hotels/${selectedHotelId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) { handleCreateNew(); await fetchHotels(); }
    } catch (err) { alert("Error deleting hotel: " + err.message); }
  };

  const hotelName = watch("name");

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-slate-950">

      {/* ─── Left Panel: Hotel Directory ─── */}
      <div className="w-72 bg-slate-900/60 border-r border-slate-800/80 flex flex-col shrink-0 h-full overflow-hidden backdrop-blur-xl">

        {/* Directory Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-400" />
              Hotel Registry
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Configure property knowledge bases</p>
          </div>
          <button
            type="button"
            onClick={handleCreateNew}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>

        {/* Hotel List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading && hotels.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-slate-500 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-xs">Loading...</span>
            </div>
          ) : hotels.length === 0 ? (
            <div className="m-2 p-6 rounded-2xl border border-dashed border-slate-800 flex flex-col items-center gap-3 text-center">
              <div className="p-3 bg-slate-800/60 rounded-2xl">
                <Building2 className="w-6 h-6 text-slate-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-300">No properties yet</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Click Add above to create your first hotel.</p>
              </div>
            </div>
          ) : (
            hotels.map((h) => {
              const isSelected = selectedHotelId === h.hotel_id;
              return (
                <button
                  key={h.hotel_id}
                  type="button"
                  onClick={() => loadHotelData(h)}
                  className={`w-full text-left p-3.5 rounded-2xl transition-all border cursor-pointer group ${
                    isSelected
                      ? "bg-indigo-600/12 border-indigo-500/40 shadow-sm ring-1 ring-indigo-500/20"
                      : "bg-slate-900/30 border-slate-800/50 hover:border-slate-700 hover:bg-slate-800/30"
                  }`}
                >
                  {/* Hotel name & star */}
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className={`text-xs font-semibold truncate ${isSelected ? "text-white" : "text-slate-200 group-hover:text-white"}`}>
                      {h.name}
                    </span>
                    <span className="text-[11px] text-amber-400 shrink-0 tracking-tighter">
                      {"★".repeat(h.star_rating || 4)}
                    </span>
                  </div>

                  {/* City + room count */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {h.contact?.city || "India"}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                      isSelected
                        ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/25"
                        : "bg-slate-800 text-slate-400 border-slate-700/60"
                    }`}>
                      {h.room_types?.length || 0} rooms
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ─── Right Panel: Editor ─── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">

        {/* Top Bar */}
        <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/30 backdrop-blur-xl flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2.5">
              {selectedHotelId ? (hotelName || "Edit Hotel") : "Configure New Hotel"}
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                Knowledge Base
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Structured property data that powers your AI voice agent during calls
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {selectedHotelId && (
              <button
                type="button"
                onClick={handleDelete}
                className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all border border-transparent hover:border-rose-500/20 cursor-pointer"
                title="Deactivate Hotel"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={saveStatus.state === "loading"}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
            >
              {saveStatus.state === "loading"
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Save className="w-3.5 h-3.5" />}
              {selectedHotelId ? "Save Changes" : "Create Hotel"}
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="px-6 border-b border-slate-800/80 bg-slate-900/20 flex gap-1 overflow-x-auto shrink-0 py-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/35 shadow-sm"
                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 border border-transparent"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-indigo-400" : "text-slate-600"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Status Banner */}
        {saveStatus.state !== "idle" && (
          <div className={`mx-6 mt-4 px-4 py-3 rounded-xl border flex items-center gap-2.5 text-xs shrink-0 ${
            saveStatus.state === "loading"
              ? "bg-indigo-950/40 border-indigo-500/30 text-indigo-300"
              : saveStatus.state === "success"
              ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
              : "bg-rose-950/40 border-rose-500/30 text-rose-300"
          }`}>
            {saveStatus.state === "loading" && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
            {saveStatus.state === "success" && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
            {saveStatus.state === "error" && <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
            {saveStatus.message}
          </div>
        )}

        {/* ─── Form Scroll Area ─── */}
        <div className="flex-1 overflow-y-auto p-6">
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl mx-auto space-y-5">

              {/* ════ TAB 1: PROPERTY IDENTITY ════ */}
              {activeTab === "identity" && (
                <div className="space-y-5">
                  {/* Names */}
                  <SectionCard>
                    <SectionHeading icon={Building2} label="Identity & Branding" color="indigo" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <InputField
                        name="name"
                        label="Property Name *"
                        placeholder="e.g. The Grand Palace"
                        rules={{ required: "Property name is required" }}
                      />
                      <InputField
                        name="tagline"
                        label="Marketing Tagline"
                        placeholder="e.g. Luxury by the Arabian Sea"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                      <NumberStepperField
                        name="star_rating"
                        label="Star Rating"
                        min={1}
                        max={5}
                        step={1}
                        suffix="★"
                      />
                      <SelectField
                        name="property_type"
                        label="Property Type"
                        options={PROPERTY_TYPES}
                        placeholder="Select type"
                      />
                      <InputField
                        name="contact.city"
                        label="City *"
                        placeholder="e.g. Mumbai"
                        rules={{ required: "City is required" }}
                      />
                    </div>
                  </SectionCard>

                  {/* Location & Contact */}
                  <SectionCard>
                    <SectionHeading icon={MapPin} label="Location & Contact Details" color="emerald" />
                    <InputField
                      name="contact.address"
                      label="Full Physical Address *"
                      placeholder="e.g. 104 Marine Drive, Nariman Point, Mumbai 400021"
                      rules={{ required: "Address is required" }}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <InputField
                        name="contact.phone"
                        label="Front Desk Phone"
                        placeholder="+91 22 6666 5555"
                      />
                      <InputField
                        name="contact.email"
                        label="Official Email"
                        placeholder="reservations@hotel.com"
                      />
                      <InputField
                        name="contact.website"
                        label="Website URL"
                        placeholder="https://www.hotelname.com"
                      />
                      <InputField
                        name="contact.state"
                        label="State"
                        placeholder="e.g. Maharashtra"
                      />
                    </div>
                  </SectionCard>
                </div>
              )}

              {/* ════ TAB 2: ROOMS & PRICING ════ */}
              {activeTab === "rooms" && (
                <div className="space-y-4">
                  <SectionHeading icon={Bed} label="Room Inventory & Rates" color="indigo">
                    <button
                      type="button"
                      onClick={() => roomTypesArray.append({
                        name: "", description: "", max_occupancy: 2,
                        price_per_night_inr: 5000, amenities_text: "King Bed, WiFi, AC",
                      })}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-xl border border-indigo-500/30 text-xs font-semibold transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Room Category
                    </button>
                  </SectionHeading>

                  <p className="text-xs text-slate-400 -mt-2">
                    The AI uses these to answer queries about availability, pricing, and room features
                  </p>

                  <div className="space-y-4">
                    {roomTypesArray.fields.map((field, index) => (
                      <ItemCard
                        key={field.id}
                        accentColor="indigo"
                        badgeLabel="Category"
                        index={index}
                        onRemove={() => roomTypesArray.remove(index)}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <InputField
                            name={`room_types.${index}.name`}
                            label="Category Name"
                            placeholder="e.g. Deluxe Ocean View Suite"
                            rules={{ required: "Room name required" }}
                          />
                          <NumberStepperField
                            name={`room_types.${index}.price_per_night_inr`}
                            label="Price / Night (INR)"
                            min={500}
                            max={500000}
                            step={500}
                            prefix="₹"
                          />
                          <NumberStepperField
                            name={`room_types.${index}.max_occupancy`}
                            label="Max Occupancy"
                            min={1}
                            max={12}
                            step={1}
                            suffix="guests"
                          />
                        </div>
                        <InputField
                          name={`room_types.${index}.description`}
                          label="View & Bed Setup"
                          placeholder="e.g. King-size bed with private balcony facing the sea"
                        />
                        <InputField
                          name={`room_types.${index}.amenities_text`}
                          label="Amenities (comma-separated)"
                          placeholder="e.g. Jacuzzi, Mini-bar, Ocean View, Butler Service"
                        />
                      </ItemCard>
                    ))}
                  </div>
                </div>
              )}

              {/* ════ TAB 3: DINING & FACILITIES ════ */}
              {activeTab === "amenities" && (
                <div className="space-y-5">
                  {/* Dining Outlets */}
                  <div className="space-y-4">
                    <SectionHeading icon={Utensils} label="Restaurants & In-Room Dining" color="emerald">
                      <button
                        type="button"
                        onClick={() => diningArray.append({ name: "", cuisine: "", hours: "7:00 AM - 11:00 PM", description: "" })}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-xl border border-emerald-500/30 text-xs font-semibold transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Restaurant
                      </button>
                    </SectionHeading>

                    {diningArray.fields.map((field, index) => (
                      <ItemCard
                        key={field.id}
                        accentColor="emerald"
                        badgeLabel="Dining Outlet"
                        index={index}
                        onRemove={() => diningArray.remove(index)}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <InputField name={`amenities.dining.${index}.name`} label="Restaurant Name" placeholder="Spice Route" />
                          <InputField name={`amenities.dining.${index}.cuisine`} label="Cuisine" placeholder="Pan-Asian & Indian" />
                          <InputField name={`amenities.dining.${index}.hours`} label="Operating Hours" placeholder="12:00 PM - 11:30 PM" />
                        </div>
                        <InputField name={`amenities.dining.${index}.description`} label="Highlights & Details" placeholder="Al-fresco poolside seating, live teppanyaki counter" />
                      </ItemCard>
                    ))}
                  </div>

                  {/* Amenities Grid */}
                  <SectionCard>
                    <SectionHeading icon={ConciergeBell} label="General Amenities & Services" color="indigo" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <InputField name="amenities.room_service_hours" label="In-Room Dining Hours" placeholder="24/7 or 6 AM – Midnight" />
                      <InputField name="amenities.pool_type" label="Swimming Pool" placeholder="Heated Rooftop Infinity Pool" />
                      <InputField name="amenities.spa_details" label="Spa & Wellness" placeholder="Ayurvedic therapies, steam & sauna" />
                      <InputField name="amenities.gym_hours" label="Fitness Center Hours" placeholder="24 Hours complimentary" />
                      <InputField name="amenities.parking" label="Parking" placeholder="Complimentary valet parking" />
                      <InputField name="amenities.airport_shuttle" label="Airport Transfers" placeholder="₹1,800 one-way on advance request" />
                    </div>
                  </SectionCard>
                </div>
              )}

              {/* ════ TAB 4: UPSELLS ════ */}
              {activeTab === "upsells" && (
                <div className="space-y-4">
                  <SectionHeading icon={TrendingUp} label="Upsells & Signature Experiences" color="violet">
                    <button
                      type="button"
                      onClick={() => upsellsArray.append({ name: "", description: "", price_inr: 1500 })}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 rounded-xl border border-violet-500/30 text-xs font-semibold transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Upsell
                    </button>
                  </SectionHeading>
                  <p className="text-xs text-slate-400 -mt-2">
                    High-value add-ons the AI proactively suggests during guest conversations
                  </p>

                  <div className="space-y-4">
                    {upsellsArray.fields.map((field, index) => (
                      <ItemCard
                        key={field.id}
                        accentColor="violet"
                        badgeLabel="Offer"
                        index={index}
                        onRemove={() => upsellsArray.remove(index)}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <InputField
                            name={`upsells.${index}.name`}
                            label="Experience / Package Name"
                            placeholder="e.g. Candlelight Beach Dinner"
                          />
                          <NumberStepperField
                            name={`upsells.${index}.price_inr`}
                            label="Price (INR)"
                            min={0}
                            max={100000}
                            step={100}
                            prefix="₹"
                          />
                        </div>
                        <InputField
                          name={`upsells.${index}.description`}
                          label="Description / Sales Pitch"
                          placeholder="Includes 4-course meal, sparkling wine, private violinist"
                        />
                      </ItemCard>
                    ))}
                  </div>
                </div>
              )}

              {/* ════ TAB 5: POLICIES ════ */}
              {activeTab === "policies" && (
                <div className="space-y-5">
                  <SectionCard>
                    <SectionHeading icon={Clock} label="Check-in & Check-out Timings" color="amber" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <InputField name="policies.check_in_time" label="Standard Check-in" placeholder="14:00" />
                      <InputField name="policies.check_out_time" label="Standard Check-out" placeholder="12:00" />
                      <InputField name="policies.early_checkin_policy" label="Early Check-in Policy" placeholder="Complimentary from 11 AM, subject to availability" />
                      <InputField name="policies.late_checkout_policy" label="Late Check-out Policy" placeholder="Complimentary until 2 PM upon request" />
                    </div>
                  </SectionCard>

                  <SectionCard>
                    <SectionHeading icon={ShieldAlert} label="House Rules & Guest Policies" color="rose" />
                    <div className="space-y-4">
                      <InputField name="policies.cancellation_policy" label="Cancellation & Refund Terms" placeholder="Free cancellation up to 48 hours before check-in" />
                      <InputField name="policies.pet_policy" label="Pet Policy" placeholder="Pets not allowed / Allowed with ₹1,500 deposit" />
                      <InputField name="policies.child_policy" label="Child & Extra Bed Policy" placeholder="Kids up to 6 stay free; extra bed ₹1,200/night" />
                      <InputField name="policies.smoking_policy" label="Smoking Policy" placeholder="100% smoke-free property" />
                    </div>
                  </SectionCard>
                </div>
              )}

              {/* ════ TAB 6: AI KNOWLEDGE BASE ════ */}
              {activeTab === "ai_kb" && (
                <div className="space-y-5">
                  {/* Info Banner */}
                  <div className="p-4 bg-indigo-950/30 border border-indigo-500/20 rounded-2xl flex items-start gap-3">
                    <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-indigo-300">Dynamic Operational Intelligence</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        These two fields empower hotel managers to steer the AI dynamically day-by-day.
                        The agent respects daily inventory warnings and hotel persona rules above all else.
                      </p>
                    </div>
                  </div>

                  <SectionCard>
                    <TextareaField
                      name="inventory_notes"
                      label="Daily Inventory & Operational Notes"
                      rows={4}
                      placeholder="e.g. 15 March: 95% full this weekend. Only 1 Suite left for Saturday. Early check-in NOT available tomorrow morning."
                      helperText="Free text updated daily by hotel desk. The AI checks this before making promises about availability."
                    />
                  </SectionCard>

                  <SectionCard>
                    <TextareaField
                      name="ai_instructions"
                      label="Hotel-Specific AI Behavioral Directives"
                      rows={4}
                      placeholder="e.g. Always address guests as Sir/Ma'am. If a guest asks for high-floor rooms, mention our 18th-floor club lounge views. Emphasize restaurant bookings require 1 hour prior notice."
                      helperText="Special guidelines injected into the system prompt for every call made on behalf of this hotel."
                    />
                  </SectionCard>

                  {/* Prompt Preview */}
                  <SectionCard>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-2">
                          <Eye className="w-3.5 h-3.5 text-indigo-400" />
                          Live Compiled AI Context Preview
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Verify the exact prompt fed to the Plivo CX Voice Agent for this hotel
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handlePreviewPrompt}
                        disabled={isPreviewLoading}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700/60 cursor-pointer transition-all"
                      >
                        {isPreviewLoading
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Sparkles className="w-3.5 h-3.5 text-indigo-400" />}
                        Compile & View
                      </button>
                    </div>

                    {promptPreview && (
                      <div className="mt-3 p-4 bg-slate-950/70 border border-slate-800 rounded-xl overflow-hidden">
                        <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap max-h-80 overflow-y-auto leading-relaxed">
                          {promptPreview}
                        </pre>
                      </div>
                    )}
                  </SectionCard>
                </div>
              )}

            </form>
          </FormProvider>
        </div>
      </div>
    </div>
  );
}
