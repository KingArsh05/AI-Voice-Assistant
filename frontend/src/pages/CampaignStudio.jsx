import { useEffect, useState } from "react";
import {
  Hotel,
  PhoneForwarded,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  Copy,
  CheckCheck,
  Plus,
  Trash2,
  Tag,
  Loader2,
  RefreshCw,
  MapPin,
  ShieldAlert,
} from "lucide-react";
import { getCampaigns, updateCampaign } from "../services/api";

function useCopyText() {
  const [copiedKey, setCopiedKey] = useState(null);

  function copy(text, key) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  }

  return { copiedKey, copy };
}

export default function CampaignStudio() {
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const { copiedKey, copy } = useCopyText();

  // Editable Form State
  const [instructions, setInstructions] = useState("");
  const [forwardingNumber, setForwardingNumber] = useState("");
  const [hotelName, setHotelName] = useState("");
  const [city, setCity] = useState("");
  const [landmark, setLandmark] = useState("");
  const [propertyFacts, setPropertyFacts] = useState([]);
  const [newFact, setNewFact] = useState("");
  const [rateInfo, setRateInfo] = useState({});
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomPrice, setNewRoomPrice] = useState("");
  const [availStatus, setAvailStatus] = useState("");
  const [availNotes, setAvailNotes] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getCampaigns();
      if (data && typeof data === "object") {
        const c = data["booking-follow-up"] || Object.values(data)[0];
        if (c) {
          setCampaign(c);
          setInstructions(c.instructions || "");
          setForwardingNumber(c.forwarding_number || "+9198544953527");
          setHotelName(c.hotel_name || "Hotel Sahu");
          setCity(c.city || "Varanasi");
          setLandmark(c.landmark || "Sahu Market, D36/265, Dashashwamedh Ghat Rd, Godowlia, Varanasi");
          setPropertyFacts(Array.isArray(c.property_facts) ? [...c.property_facts] : []);
          setRateInfo(c.rate_info ? { ...c.rate_info } : {});
          setAvailStatus(c.availability?.status || "Available for upcoming dates");
          setAvailNotes(c.availability?.notes || "");
        }
      }
    } catch (e) {
      console.error("Error loading campaigns:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddFact = (e) => {
    e.preventDefault();
    if (!newFact.trim()) return;
    setPropertyFacts([...propertyFacts, newFact.trim()]);
    setNewFact("");
  };

  const handleRemoveFact = (index) => {
    setPropertyFacts(propertyFacts.filter((_, i) => i !== index));
  };

  const handleAddRate = (e) => {
    e.preventDefault();
    if (!newRoomName.trim() || !newRoomPrice.trim()) return;
    setRateInfo({ ...rateInfo, [newRoomName.trim()]: newRoomPrice.trim() });
    setNewRoomName("");
    setNewRoomPrice("");
  };

  const handleRemoveRate = (key) => {
    const next = { ...rateInfo };
    delete next[key];
    setRateInfo(next);
  };

  const handleSave = async () => {
    if (!campaign) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const payload = {
        ...campaign,
        hotel_name: hotelName,
        city,
        landmark,
        instructions,
        forwarding_number: forwardingNumber,
        property_facts: propertyFacts,
        rate_info: rateInfo,
        availability: {
          ...(campaign.availability || {}),
          status: availStatus,
          notes: availNotes,
        },
      };

      await updateCampaign(campaign.id, payload);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setCampaign(payload);
    } catch (err) {
      setSaveError(err.message || "Failed to update configuration");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Campaign Studio &amp; AI Config
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Live AI Prompt, Hotel Sahu configuration &amp; human call forwarding.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            title="Reset from Database"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Discard Changes
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Save &amp; Deploy to AI
              </>
            )}
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs font-medium text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span>Configuration saved successfully to MongoDB! The AI agent will now use these exact details for all upcoming calls.</span>
        </div>
      )}

      {saveError && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs font-medium text-rose-700 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 text-rose-500" />
          <span>Error saving: {saveError}</span>
        </div>
      )}

      {/* Hotel Identity Card */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#111827]/80">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <Hotel className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {hotelName} &mdash; Property Identity
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Active voice AI profile used across inbound and outbound calls.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Hotel Name
            </label>
            <input
              value={hotelName}
              onChange={(e) => setHotelName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              City
            </label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Landmark / Address
            </label>
            <input
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Human Call Forwarding Card */}
      <div className="rounded-xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/[0.04] to-violet-500/[0.04] p-5 shadow-sm dark:border-indigo-400/20 dark:bg-white/[0.02]">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
            <PhoneForwarded className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              Human Staff Call Forwarding
              <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                Live Escalation
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              When a guest is angry, dissatisfied, or requests human staff, the call automatically transfers to this phone number.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1 w-full max-w-md">
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Front Desk / Manager Forwarding Number (with country code)
            </label>
            <input
              value={forwardingNumber}
              onChange={(e) => setForwardingNumber(e.target.value)}
              placeholder="+9198544953527"
              className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-white/10 dark:bg-[#0B0F17] dark:text-white"
            />
          </div>
          <div className="rounded-lg border border-indigo-200/60 bg-white/70 p-3 text-xs text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 max-w-sm">
            <p className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5" /> Automatic Escalation Active
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              Inbound and outbound calls will immediately trigger staff handoff upon detected frustration.
            </p>
          </div>
        </div>
      </div>

      {/* AI Prompt & Instructions Editor */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#111827]/80">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-500" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              AI Agent Prompt Instructions
            </h2>
          </div>
          <button
            onClick={() => copy(instructions, "instructions")}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400"
          >
            {copiedKey === "instructions" ? (
              <>
                <CheckCheck className="h-3.5 w-3.5 text-emerald-500" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> Copy Prompt
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          This system prompt dictates how the AI agent introduces Hotel Sahu, asks questions, handles booking objections, and answers questions.
        </p>

        <textarea
          rows={5}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Goal: Warmly follow up with guests who started a reservation on our website..."
          className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs font-mono leading-relaxed text-slate-800 outline-none focus:border-emerald-400 dark:border-white/10 dark:bg-[#0B0F17] dark:text-slate-200"
        />
      </div>

      {/* Property Facts & Rates */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Facts */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#111827]/80">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
            Property Facts &amp; Amenities
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Bullet points shared by the AI agent when the caller inquires about amenities and location.
          </p>

          <form onSubmit={handleAddFact} className="flex gap-2 mb-4">
            <input
              value={newFact}
              onChange={(e) => setNewFact(e.target.value)}
              placeholder="e.g. Complimentary boat ride arrangement for Morning Ganga Aarti"
              className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-emerald-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
            <button
              type="submit"
              className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </form>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {propertyFacts.map((fact, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-300"
              >
                <span>&bull; {fact}</span>
                <button
                  onClick={() => handleRemoveFact(idx)}
                  className="text-slate-400 hover:text-rose-500"
                  title="Remove fact"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Rates */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#111827]/80">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
            Room Rates &amp; Pricing Info
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Pricing and room categories quoted by the voice AI during calls.
          </p>

          <form onSubmit={handleAddRate} className="flex gap-2 mb-4">
            <input
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Room Name"
              className="w-1/2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-emerald-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
            <input
              value={newRoomPrice}
              onChange={(e) => setNewRoomPrice(e.target.value)}
              placeholder="Rate Info (e.g. INR 3,200/night)"
              className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-emerald-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
            <button
              type="submit"
              className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </form>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {Object.entries(rateInfo).map(([room, rate]) => (
              <div
                key={room}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-300"
              >
                <div className="flex flex-col sm:flex-row sm:gap-2">
                  <span className="font-medium text-slate-900 dark:text-slate-100">{room}:</span>
                  <span className="text-slate-500 dark:text-slate-400">{rate}</span>
                </div>
                <button
                  onClick={() => handleRemoveRate(room)}
                  className="text-slate-400 hover:text-rose-500"
                  title="Remove rate"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
