import React, { useState, useEffect, useRef } from "react";
import { useForm, FormProvider } from "react-hook-form";
import * as XLSX from "xlsx";
import {
  UploadCloud,
  FileSpreadsheet,
  Play,
  Pause,
  RotateCcw,
  XCircle,
  CheckCircle2,
  PhoneCall,
  Clock,
  AlertCircle,
  Building2,
  RefreshCw,
  Download,
  Users,
  ChevronRight,
  ListOrdered,
  Sparkles,
  Search,
  Check,
  ChevronDown,
  Trash2,
  PhoneForwarded,
} from "lucide-react";
import {
  InputField,
  SelectField,
  NumberStepperField,
} from "./common/FormControl";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function BulkCalls() {
  // Campaign setup state
  const [hotels, setHotels] = useState([]);
  const [isLoadingHotels, setIsLoadingHotels] = useState(false);

  // File parsing & preview state
  const [parsedLeads, setParsedLeads] = useState([]);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active / Loaded campaign state
  const [campaign, setCampaign] = useState(null);
  const [campaignsList, setCampaignsList] = useState([]);
  const [loadingCampaign, setLoadingCampaign] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fileInputRef = useRef(null);

  // React Hook Form for campaign parameters
  const methods = useForm({
    defaultValues: {
      campaign_name: "",
      hotel_id: "",
      from_number: "+918031825752",
      default_country_code: "+91",
      cooldown_seconds: 15, // 10 to 30 seconds gap between calls
      max_call_duration_seconds: 210, // 3.5 minutes (e.g. 180s - 240s)
    },
  });

  const selectedHotelId = methods.watch("hotel_id");
  const selectedHotel = hotels.find((h) => h.hotel_id === selectedHotelId);
  const defaultCountryCode = methods.watch("default_country_code") || "+91";

  // Fetch hotels and past campaigns on mount
  useEffect(() => {
    fetchHotels();
    fetchCampaignsList();
  }, []);

  // Polling loop when a campaign is active
  useEffect(() => {
    let intervalId = null;
    if (campaign && (campaign.status === "running" || campaign.status === "queued")) {
      intervalId = setInterval(() => {
        pollCampaign(campaign.campaign_id);
      }, 3000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [campaign?.campaign_id, campaign?.status]);

  const fetchHotels = async () => {
    setIsLoadingHotels(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/hotels?active_only=true`);
      const data = await res.json();
      if (data.success && data.data) {
        setHotels(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load hotels:", err);
    } finally {
      setIsLoadingHotels(false);
    }
  };

  const fetchCampaignsList = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/campaigns?limit=15`);
      const data = await res.json();
      if (data.success && data.campaigns) {
        setCampaignsList(data.campaigns);
      }
    } catch (err) {
      console.error("Failed to load campaigns list:", err);
    }
  };

  const pollCampaign = async (campaignId) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/campaigns/${campaignId}`);
      const data = await res.json();
      if (data.success && data.campaign) {
        setCampaign(data.campaign);
        if (data.campaign.status === "completed" || data.campaign.status === "cancelled") {
          fetchCampaignsList();
        }
      }
    } catch (err) {
      console.error("Polling campaign error:", err);
    }
  };

  // Helper to normalize phone number
  const formatPhoneNumber = (phone, prefix) => {
    if (!phone) return "";
    let str = String(phone).trim().replace(/[\s\-\(\)]/g, "");
    if (!str.startsWith("+")) {
      if (str.length === 10) {
        str = (prefix || "+91") + str;
      } else {
        str = "+" + str;
      }
    }
    return str;
  };

  // Parse XLSX / CSV via SheetJS
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError("");
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (!rows || rows.length === 0) {
          setFileError("Uploaded sheet is empty. Please provide columns: Guest Name, Phone Number, Lead Details.");
          return;
        }

        const prefix = methods.getValues("default_country_code") || "+91";

        // Map column variations flexibly
        const leads = rows.map((row, idx) => {
          const keys = Object.keys(row);
          const findKey = (candidates) =>
            keys.find((k) =>
              candidates.some((c) => k.toLowerCase().replace(/[^a-z]/g, "").includes(c))
            );

          const nameKey = findKey(["name", "guest", "customer", "leadname"]) || keys[0];
          const phoneKey = findKey(["phone", "mobile", "contact", "tel", "cell"]) || keys[1];
          const leadKey = findKey(["lead", "query", "enquiry", "details", "remark", "note", "interest"]) || keys[2];
          const serialKey = findKey(["serial", "sr", "sno", "id", "index"]);

          const rawPhone = String(row[phoneKey] || "").trim();
          const cleanPhone = formatPhoneNumber(rawPhone, prefix);
          const isValidPhone = /^\+[1-9]\d{7,14}$/.test(cleanPhone);
          const guestName = String(row[nameKey] || `Guest ${idx + 1}`).trim();

          return {
            serial: row[serialKey] ? Number(row[serialKey]) : idx + 1,
            guest_name: guestName,
            phone_number: cleanPhone,
            raw_phone: rawPhone,
            lead_details: String(row[leadKey] || "Prospective guest lead follow-up").trim(),
            isValid: isValidPhone && guestName.length > 0,
          };
        });

        setParsedLeads(leads);

        // Auto populate title if empty
        if (!methods.getValues("campaign_name")) {
          const baseName = file.name.replace(/\.[^/.]+$/, "");
          methods.setValue("campaign_name", `${baseName} • ${new Date().toLocaleDateString()}`);
        }
      } catch (err) {
        console.error("Failed to parse file:", err);
        setFileError("Error parsing file. Please ensure it is a valid .xlsx or .csv file.");
      }
    };

    reader.readAsBinaryString(file);
  };

  // Re-format phone numbers if user changes default country prefix
  const handlePrefixChange = (newPrefix) => {
    methods.setValue("default_country_code", newPrefix);
    if (parsedLeads.length > 0) {
      setParsedLeads((prev) =>
        prev.map((lead) => {
          const cleanPhone = formatPhoneNumber(lead.raw_phone || lead.phone_number, newPrefix);
          const isValidPhone = /^\+[1-9]\d{7,14}$/.test(cleanPhone);
          return {
            ...lead,
            phone_number: cleanPhone,
            isValid: isValidPhone && lead.guest_name.length > 0,
          };
        })
      );
    }
  };

  // Submit and create campaign
  const handleCreateCampaign = async (formData) => {
    const validLeads = parsedLeads.filter((l) => l.isValid);
    if (validLeads.length === 0) {
      setFileError("No valid leads found in file. Please ensure phone numbers have valid international or 10-digit formats.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.campaign_name || `Bulk Campaign • ${new Date().toLocaleString()}`,
        hotel_id: formData.hotel_id || null,
        from_number: formData.from_number,
        persona: "lead_followup",
        cooldown_seconds: Number(formData.cooldown_seconds) || 0,
        max_call_duration_seconds: Number(formData.max_call_duration_seconds) || 210,
        max_retries: 0,
        leads: validLeads.map((l) => ({
          serial: l.serial,
          guest_name: l.guest_name,
          phone_number: l.phone_number,
          lead_details: l.lead_details,
        })),
      };

      const res = await fetch(`${BACKEND_URL}/api/v1/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.campaign) {
        setCampaign(data.campaign);
        fetchCampaignsList();
        setParsedLeads([]);
        setFileName("");
      } else {
        setFileError(data.error || "Failed to create campaign");
      }
    } catch (err) {
      setFileError(err.message || "Failed to connect to backend server");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Campaign controls: start, pause, resume, cancel
  const handleCampaignAction = async (action) => {
    if (!campaign?.campaign_id) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/campaigns/${campaign.campaign_id}/${action}`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success && data.campaign) {
        setCampaign(data.campaign);
        fetchCampaignsList();
      }
    } catch (err) {
      console.error(`Failed to ${action} campaign:`, err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectCampaign = async (campId) => {
    setLoadingCampaign(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/campaigns/${campId}`);
      const data = await res.json();
      if (data.success && data.campaign) {
        setCampaign(data.campaign);
      }
    } catch (err) {
      console.error("Failed to load campaign:", err);
    } finally {
      setLoadingCampaign(false);
    }
  };

  const exportResultsCSV = () => {
    if (!campaign || !campaign.leads) return;
    const exportData = campaign.leads.map((l) => ({
      Serial: l.serial,
      "Guest Name": l.guest_name,
      Phone: l.phone_number,
      "Lead Details": l.lead_details,
      Status: l.status,
      "Duration (s)": l.duration || 0,
      "Trigger ID": l.call_trigger_id || "",
      Completed: l.completed_at || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Call Results");
    XLSX.writeFile(workbook, `${campaign.name || "campaign"}_results.xlsx`);
  };

  // Compute live statistics
  const completedCount = campaign?.completed_count || 0;
  const failedCount = campaign?.failed_count || 0;
  const totalCount = campaign?.total_leads || 0;
  const progressPercent = totalCount > 0 ? Math.round(((completedCount + failedCount) / totalCount) * 100) : 0;
  const validLeadsCount = parsedLeads.filter((l) => l.isValid).length;

  return (
    <div className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in duration-300">
      {/* Dynamic ambient backdrop */}
      <div className="absolute top-10 left-1/3 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-2xl border border-indigo-500/30 shadow-inner">
            <ListOrdered className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              Bulk Lead Follow-up Queue
              <span className="text-[11px] font-semibold tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Automated Sequencer
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Upload customer leads via spreadsheet to execute sequential, high-touch AI follow-ups one by one.
            </p>
          </div>
        </div>

        {campaign && (
          <button
            onClick={() => setCampaign(null)}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800/80 rounded-xl border border-slate-800 transition-all flex items-center gap-2 self-start md:self-auto shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Upload New Batch
          </button>
        )}
      </div>

      {/* Main Content Layout */}
      {!campaign ? (
        /* PHASE 1: UPLOAD & CONFIGURATION */
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(handleCreateCampaign)} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left 7 Columns: File Upload & Leads Preview */}
            <div className="lg:col-span-7 space-y-6">
              {/* Upload Zone Card */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-xl shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                    Upload Leads Document
                  </h2>
                  <span className="text-[11px] font-medium text-slate-400 bg-slate-800/60 px-2.5 py-0.5 rounded-full border border-slate-700/60">
                    Supports .xlsx & .csv
                  </span>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700/80 hover:border-indigo-500/80 bg-slate-950/40 hover:bg-indigo-950/15 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 group text-center"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <div className="p-4 bg-slate-800/80 group-hover:bg-indigo-600/25 text-slate-400 group-hover:text-indigo-400 rounded-2xl mb-3.5 transition-all shadow-inner">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                    {fileName ? fileName : "Choose or drag & drop CSV or Excel spreadsheet"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Columns: <code className="text-slate-300 font-mono">Guest Name</code>,{" "}
                    <code className="text-slate-300 font-mono">Phone Number</code>,{" "}
                    <code className="text-slate-300 font-mono">Lead Details</code>
                  </p>
                </div>

                {fileError && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{fileError}</span>
                  </div>
                )}
              </div>

              {/* Parsed Leads Table Preview */}
              {parsedLeads.length > 0 && (
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-xl shadow-xl space-y-4 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/60">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-400" />
                      Parsed Leads ({parsedLeads.length} total,{" "}
                      <span className="text-emerald-400 font-bold">{validLeadsCount} ready to call</span>)
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Prefix:</span>
                      <input
                        type="text"
                        value={defaultCountryCode}
                        onChange={(e) => handlePrefixChange(e.target.value)}
                        placeholder="+91"
                        className="w-16 px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-center text-indigo-400 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto max-h-96 rounded-2xl border border-slate-800/80">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950/80 text-slate-400 sticky top-0 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="p-3">#</th>
                          <th className="p-3">Guest Name</th>
                          <th className="p-3">Phone</th>
                          <th className="p-3">Lead Interest / Context</th>
                          <th className="p-3 text-right">Validation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {parsedLeads.map((lead, i) => (
                          <tr
                            key={i}
                            className={
                              lead.isValid
                                ? "hover:bg-slate-800/40 transition-colors"
                                : "bg-rose-500/5 hover:bg-rose-500/10 text-rose-300 transition-colors"
                            }
                          >
                            <td className="p-3 text-slate-500 font-mono">{lead.serial}</td>
                            <td className="p-3 font-medium text-white">{lead.guest_name}</td>
                            <td className="p-3 font-mono text-slate-300">
                              {lead.phone_number || lead.raw_phone}
                            </td>
                            <td className="p-3 max-w-xs truncate text-slate-400">
                              {lead.lead_details}
                            </td>
                            <td className="p-3 text-right">
                              {lead.isValid ? (
                                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                  <CheckCircle2 className="w-3 h-3" /> Valid
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-rose-400 font-medium bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                                  <AlertCircle className="w-3 h-3" /> Check Phone
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Right 5 Columns: Campaign Parameters & Hotel Selector */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-xl shadow-xl space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                  <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-400" />
                    Campaign Parameters
                  </h2>
                  <span className="text-[10px] font-mono text-indigo-400/90 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                    Live Tuning
                  </span>
                </div>

                {/* Campaign Name */}
                <InputField
                  name="campaign_name"
                  label="Campaign Name"
                  placeholder="e.g. Goa Inquiries • Batch 1"
                  helperText="Identify this batch in call reports and analytics"
                />

                {/* Hotel Knowledge Base Selector using custom SelectField */}
                <div className="space-y-2">
                  <SelectField
                    name="hotel_id"
                    label="Hotel Knowledge Base (Optional)"
                    placeholder={isLoadingHotels ? "Loading verified hotels..." : "-- Select Property --"}
                    options={[
                      { value: "", label: "No Hotel (Generic StayChat AI Assistant)" },
                      ...hotels.map((h) => ({
                        value: h.hotel_id,
                        label: `${h.name} (${h.contact?.city || "Property"} • ${"★".repeat(h.star_rating || 4)})`,
                      })),
                    ]}
                  />

                  {/* Selected Hotel Knowledge Preview */}
                  {selectedHotel && (
                    <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/25 rounded-2xl text-xs space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-between font-semibold text-indigo-200">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                          {selectedHotel.name}
                        </span>
                        <span className="text-[10px] text-amber-400 font-mono">
                          {"★".repeat(selectedHotel.star_rating || 4)} {selectedHotel.property_type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        {selectedHotel.room_types?.length || 0} Room Categories • Check-in:{" "}
                        {selectedHotel.policies?.check_in_time || "14:00"} • Check-out:{" "}
                        {selectedHotel.policies?.check_out_time || "12:00"}
                      </p>
                      {selectedHotel.inventory_notes && (
                        <p className="text-[10px] text-amber-300/90 font-medium bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                          ⚡ Inventory: {selectedHotel.inventory_notes}
                        </p>
                      )}
                      <p className="text-[10px] text-indigo-300/80 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        AI will inject this property's tariffs, rooms, and policies into every call.
                      </p>
                    </div>
                  )}
                </div>

                {/* Outbound Caller ID */}
                <InputField
                  name="from_number"
                  label="Outbound Caller ID (Plivo)"
                  placeholder="+918031825752"
                  helperText="Rented/verified outbound telephony number"
                />

                {/* Cooldown Between Calls with NumberStepperField */}
                <NumberStepperField
                  name="cooldown_seconds"
                  label="Gap Between Consecutive Calls (10-30s Recommended)"
                  min={5}
                  max={120}
                  step={5}
                  suffix="sec gap"
                  helperText="Rest gap after previous call ends before initiating next lead (e.g. 10 to 30 seconds)"
                />

                {/* Max Call Duration Stepper (3-4 mins) */}
                <NumberStepperField
                  name="max_call_duration_seconds"
                  label="Max Call Duration Per Lead (3-4 Minutes)"
                  min={60}
                  max={900}
                  step={15}
                  suffix="sec max"
                  helperText="Safety limit: Disconnects the call and advances queue if conversation exceeds this duration (e.g. 180s - 240s)"
                />

                {/* AI Persona Information */}
                <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-2xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <PhoneForwarded className="w-3.5 h-3.5 text-indigo-400" />
                      Agent Persona
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                      Lead Follow-up & Booking Close
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    The voice assistant calls each customer, introduces itself on behalf of the hotel, discusses their room requirements, answers property policies, and assists in securing confirmed reservations.
                  </p>
                </div>

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || validLeadsCount === 0}
                  className="w-full py-3.5 px-4 rounded-2xl font-semibold text-sm bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Initializing Campaign...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" />
                      Create & Prepare Campaign ({validLeadsCount} Leads)
                    </>
                  )}
                </button>
              </div>

              {/* Past Campaigns Picker */}
              {campaignsList.length > 0 && (
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-xl shadow-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Recent Campaigns History
                    </h3>
                    <span className="text-[11px] text-slate-500">{campaignsList.length} recorded</span>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {campaignsList.map((c) => (
                      <div
                        key={c.campaign_id}
                        onClick={() => handleSelectCampaign(c.campaign_id)}
                        className="p-3 rounded-2xl bg-slate-950/60 hover:bg-slate-800/70 border border-slate-800/80 cursor-pointer flex items-center justify-between transition-all group hover:border-slate-700"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-semibold text-white truncate group-hover:text-indigo-400 transition-colors">
                            {c.name}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {c.completed_count}/{c.total_leads} calls completed •{" "}
                            <span
                              className={
                                c.status === "completed"
                                  ? "text-emerald-400 font-medium"
                                  : c.status === "running"
                                  ? "text-indigo-400 font-medium animate-pulse"
                                  : "text-slate-400"
                              }
                            >
                              {c.status}
                            </span>
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </form>
        </FormProvider>
      ) : (
        /* PHASE 2 & 3: ACTIVE CAMPAIGN DASHBOARD & LIVE SEQUENCER RUNNER */
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Campaign Overview Card */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {campaign.name}
                  </h2>
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider border ${
                      campaign.status === "running"
                        ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 animate-pulse"
                        : campaign.status === "completed"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : campaign.status === "paused"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    }`}
                  >
                    {campaign.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 flex flex-wrap items-center gap-2">
                  <span>
                    ID: <code className="font-mono text-indigo-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">{campaign.campaign_id}</code>
                  </span>
                  <span>•</span>
                  <span>
                    Caller ID: <code className="font-mono text-slate-300">{campaign.from_number}</code>
                  </span>
                  <span>•</span>
                  <span>Rest: {campaign.cooldown_seconds}s</span>
                  {campaign.max_call_duration_seconds && (
                    <>
                      <span>•</span>
                      <span>Max Call: {Math.round(campaign.max_call_duration_seconds / 60 * 10) / 10}m ({campaign.max_call_duration_seconds}s)</span>
                    </>
                  )}
                </p>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                {campaign.status === "queued" && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleCampaignAction("start")}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" /> Start Queue
                  </button>
                )}

                {campaign.status === "running" && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleCampaignAction("pause")}
                    className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-amber-600/20 transition-all cursor-pointer"
                  >
                    <Pause className="w-4 h-4" /> Pause Queue
                  </button>
                )}

                {campaign.status === "paused" && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleCampaignAction("resume")}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" /> Resume Queue
                  </button>
                )}

                {["queued", "running", "paused"].includes(campaign.status) && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleCampaignAction("cancel")}
                    className="px-4 py-2.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" /> Cancel Queue
                  </button>
                )}

                <button
                  onClick={exportResultsCSV}
                  className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <Download className="w-4 h-4" /> Export XLSX
                </button>
              </div>
            </div>

            {/* Metrics Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Total Leads
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-white mt-1">{totalCount}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                  Completed
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-emerald-400 mt-1">{completedCount}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                <p className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">
                  Failed / Unanswered
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-rose-400 mt-1">{failedCount}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                <p className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
                  Queue Progress
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-indigo-400 mt-1">{progressPercent}%</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800/80 p-0.5">
                <div
                  className="bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500 h-full rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-400 font-medium px-1">
                <span>{completedCount + failedCount} of {totalCount} calls executed</span>
                <span>{Math.max(0, totalCount - (completedCount + failedCount))} remaining in queue</span>
              </div>
            </div>
          </div>

          {/* Sequential Lead-by-Lead Progression Table */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-indigo-400" />
                Live Sequence Table
              </h3>
              <button
                onClick={() => pollCampaign(campaign.campaign_id)}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 font-medium px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Force Sync
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">#</th>
                    <th className="p-3.5">Guest / Lead Name</th>
                    <th className="p-3.5">Phone</th>
                    <th className="p-3.5">Lead Details / Inquiries</th>
                    <th className="p-3.5">Call State</th>
                    <th className="p-3.5">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {campaign.leads?.map((lead, idx) => {
                    const isCalling = lead.status === "calling";
                    const isDone = lead.status === "completed";
                    const isFailed = ["failed", "no-answer", "busy", "rejected"].includes(lead.status);

                    return (
                      <tr
                        key={idx}
                        className={
                          isCalling
                            ? "bg-indigo-600/15 border-l-4 border-indigo-500 transition-colors"
                            : "hover:bg-slate-800/30 transition-colors"
                        }
                      >
                        <td className="p-3.5 text-slate-500 font-mono">{lead.serial || idx + 1}</td>
                        <td className="p-3.5 font-semibold text-white">
                          <div className="flex items-center gap-2">
                            {lead.guest_name}
                            {isCalling && (
                              <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-slate-300">{lead.phone_number}</td>
                        <td className="p-3.5 max-w-xs truncate text-slate-400">{lead.lead_details}</td>
                        <td className="p-3.5">
                          {isCalling ? (
                            <span className="inline-flex items-center gap-1.5 text-indigo-300 font-semibold bg-indigo-500/20 border border-indigo-500/40 px-2.5 py-1 rounded-full text-[11px] animate-pulse">
                              <PhoneCall className="w-3 h-3 text-indigo-400" /> Active Call...
                            </span>
                          ) : isDone ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full text-[11px]">
                              <CheckCircle2 className="w-3 h-3" /> Completed
                            </span>
                          ) : isFailed ? (
                            <span className="inline-flex items-center gap-1.5 text-rose-400 font-semibold bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-full text-[11px]">
                              <AlertCircle className="w-3 h-3" /> {lead.status}
                            </span>
                          ) : lead.status === "skipped" ? (
                            <span className="inline-flex items-center gap-1.5 text-slate-500 font-medium bg-slate-800/80 px-2.5 py-1 rounded-full text-[11px]">
                              Skipped
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-slate-400 font-medium bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-full text-[11px]">
                              <Clock className="w-3 h-3 text-slate-500" /> Queued
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 font-mono text-slate-300">
                          {lead.duration ? `${lead.duration}s` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
