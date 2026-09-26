import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useForm, FormProvider } from "react-hook-form";
import * as XLSX from "xlsx";
import { ListOrdered, Sparkles } from "lucide-react";

import BulkUploadZone from "./bulk/BulkUploadZone";
import BulkLeadsPreview from "./bulk/BulkLeadsPreview";
import BulkCampaignConfig from "./bulk/BulkCampaignConfig";
import BulkRecentHistory from "./bulk/BulkRecentHistory";
import BulkLiveDashboard from "./bulk/BulkLiveDashboard";
import BulkPageSkeleton from "./bulk/BulkPageSkeleton";
import { validateLead } from "../utils/leadValidation";

const BACKEND_URL = import.meta.env.VITE_API_URL;

export default function BulkCalls() {
  const location = useLocation();

  // Page initialization loading state (prevents layout jumping/resizing)
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Campaign setup state
  const [hotels, setHotels] = useState([]);
  const [isLoadingHotels, setIsLoadingHotels] = useState(false);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);

  // File parsing & preview state
  const [parsedLeads, setParsedLeads] = useState([]);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if leads were passed from CRM
  useEffect(() => {
    if (location.state?.prefilledLeads && location.state.prefilledLeads.length > 0) {
      const formatted = location.state.prefilledLeads.map((l, idx) => ({
        index: idx + 1,
        guest_name: l.guest_name,
        phone_number: l.phone_number,
        lead_details: l.lead_details || "",
        isValid: true,
        errors: [],
      }));
      setParsedLeads(formatted);
      setFileName(`CRM Export (${formatted.length} leads)`);
      if (location.state.prefilledLeads[0]?.hotel_id) {
        methods.setValue("hotel_id", location.state.prefilledLeads[0].hotel_id);
      }
    }
  }, [location.state]);

  // Active / Loaded campaign state
  const [campaign, setCampaign] = useState(null);
  const [campaignsList, setCampaignsList] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Country Code states (synced with MakeCall)
  const [leadsCountryCode, setLeadsCountryCode] = useState("+91");
  const [callerCountryCode, setCallerCountryCode] = useState("+91");

  // React Hook Form for campaign parameters
  const methods = useForm({
    defaultValues: {
      campaign_name: "",
      hotel_id: "",
      from_number: "8031825752",
      cooldown_seconds: 15,
      max_call_duration_seconds: 210,
    },
  });

  const selectedHotelId = methods.watch("hotel_id");
  const selectedHotel = hotels.find((h) => h.hotel_id === selectedHotelId);

  // Fetch hotels and past campaigns concurrently on mount, wait for completion before rendering
  useEffect(() => {
    const initData = async () => {
      setIsInitialLoading(true);
      await Promise.allSettled([fetchHotels(), fetchCampaignsList()]);
      setIsInitialLoading(false);
    };
    initData();
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
    setIsLoadingCampaigns(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/campaigns?limit=15`);
      const data = await res.json();
      if (data.success && data.campaigns) {
        setCampaignsList(data.campaigns);
      }
    } catch (err) {
      console.error("Failed to load campaigns list:", err);
    } finally {
      setIsLoadingCampaigns(false);
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

  const formatPhoneNumber = (phone, prefix) => {
    if (!phone) return "";
    let str = String(phone).trim().replace(/[\s\-\(\)]/g, "");
    if (!str.startsWith("+")) {
      str = (prefix || "+91") + str;
    }
    return str;
  };

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

        const rawLeads = rows.map((row, idx) => {
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
          const cleanPhone = formatPhoneNumber(rawPhone, leadsCountryCode);
          const guestName = String(row[nameKey] || `Guest ${idx + 1}`).trim();

          return {
            serial: row[serialKey] ? Number(row[serialKey]) : idx + 1,
            guest_name: guestName,
            phone_number: cleanPhone,
            raw_phone: rawPhone,
            lead_details: String(row[leadKey] || "Prospective guest lead follow-up").trim(),
          };
        });

        const evaluatedLeads = rawLeads.map((lead, idx) => {
          const { isValid, issues } = validateLead(lead, rawLeads, idx);
          return {
            ...lead,
            isValid,
            issues,
          };
        });

        setParsedLeads(evaluatedLeads);

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

  const handleClearFile = () => {
    setParsedLeads([]);
    setFileName("");
    setFileError("");
  };

  const handlePrefixChange = (newPrefix) => {
    setLeadsCountryCode(newPrefix);
    if (parsedLeads.length > 0) {
      const updated = parsedLeads.map((lead, idx) => {
        const cleanPhone = formatPhoneNumber(lead.raw_phone || lead.phone_number, newPrefix);
        const tempLead = { ...lead, phone_number: cleanPhone };
        const { isValid, issues } = validateLead(tempLead, parsedLeads, idx);
        return {
          ...tempLead,
          isValid,
          issues,
        };
      });
      setParsedLeads(updated);
    }
  };

  const handleCreateCampaign = async (formData) => {
    const validLeads = parsedLeads.filter((l) => l.isValid);
    if (validLeads.length === 0) {
      setFileError("No valid leads found in file. Please resolve the detected issues before starting.");
      return;
    }

    setIsSubmitting(true);
    setFileError("");
    try {
      let fullCallerId = formData.from_number.trim();
      if (!fullCallerId.startsWith("+")) {
        fullCallerId = callerCountryCode + fullCallerId;
      }

      const payload = {
        name: formData.campaign_name || `Bulk Campaign • ${new Date().toLocaleString()}`,
        hotel_id: formData.hotel_id || null,
        from_number: fullCallerId,
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
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/campaigns/${campId}`);
      const data = await res.json();
      if (data.success && data.campaign) {
        setCampaign(data.campaign);
      }
    } catch (err) {
      console.error("Failed to load campaign:", err);
    }
  };

  const validLeadsCount = parsedLeads.filter((l) => l.isValid).length;
  const invalidLeadsCount = parsedLeads.length - validLeadsCount;

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-hidden">
      {/* Dynamic ambient backdrop */}
      <div className="absolute top-10 left-1/3 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Main Content Area: Show comprehensive page skeleton while initial data loads */}
      {isInitialLoading ? (
        <BulkPageSkeleton />
      ) : !campaign ? (
        <FormProvider {...methods}>
          <form
            onSubmit={methods.handleSubmit(handleCreateCampaign)}
            className="flex-1 flex flex-col min-h-0 gap-6 animate-in fade-in duration-300"
          >
            {/* Main 2-column split (Fills screen with stable proportions) */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 overflow-hidden">
              {/* Left Column (7 cols): Upload + Parsed Leads Preview */}
              <div className="lg:col-span-7 flex flex-col gap-6 min-h-0 overflow-hidden">
                <BulkUploadZone
                  fileName={fileName}
                  fileError={fileError}
                  onFileUpload={handleFileUpload}
                  onClearFile={handleClearFile}
                  leadsCount={validLeadsCount}
                  invalidCount={invalidLeadsCount}
                />

                {parsedLeads.length > 0 ? (
                  <BulkLeadsPreview
                    parsedLeads={parsedLeads}
                    defaultCountryCode={leadsCountryCode}
                    onPrefixChange={handlePrefixChange}
                  />
                ) : (
                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-8 flex flex-col items-center justify-center text-center flex-1 min-h-0 backdrop-blur-xl shadow-xl">
                    <div className="p-3.5 rounded-2xl bg-indigo-600/15 border border-indigo-500/25 text-indigo-400 mb-3.5 shadow-inner">
                      <Sparkles className="w-7 h-7 animate-pulse" />
                    </div>
                    <p className="text-sm font-semibold text-white">Awaiting Leads Document</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm leading-relaxed">
                      Upload or drag & drop your guest list spreadsheet above. Rows are instantly verified for phone formatting, batch duplicates, and hospitality guardrails.
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column (5 cols): Parameters & Launch Card */}
              <div className="lg:col-span-5 flex flex-col min-h-0 overflow-hidden">
                <BulkCampaignConfig
                  hotels={hotels}
                  isLoadingHotels={isLoadingHotels}
                  selectedHotel={selectedHotel}
                  validLeadsCount={validLeadsCount}
                  invalidLeadsCount={invalidLeadsCount}
                  isSubmitting={isSubmitting}
                  callerCountryCode={callerCountryCode}
                  onCallerCountryCodeChange={setCallerCountryCode}
                />
              </div>
            </div>

            {/* Bottom Row: Recent Campaigns Strip */}
            <BulkRecentHistory
              campaignsList={campaignsList}
              isLoading={isLoadingCampaigns}
              onSelectCampaign={handleSelectCampaign}
            />
          </form>
        </FormProvider>
      ) : (
        /* Active Running Campaign Dashboard */
        <BulkLiveDashboard
          campaign={campaign}
          actionLoading={actionLoading}
          onCampaignAction={handleCampaignAction}
          onResetCampaign={() => setCampaign(null)}
          onPollCampaign={pollCampaign}
        />
      )}
    </div>
  );
}
