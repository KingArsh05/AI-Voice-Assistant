import * as XLSX from "xlsx";
import { useState, useEffect } from "react";
import {
  Users,
  Phone,
  FileText,
  CheckCircle2,
  PhoneForwarded,
  Play,
  Pause,
  Square,
  Building2,
  Clock,
} from "lucide-react";
import {
  FileUploadField,
  StandaloneSelect,
  StandaloneStepper,
} from "./common/FormControl";
import axios from "axios";

// Formats seconds into clean "Xm Ys" or "Ys" format
const formatDuration = (totalSeconds) => {
  if (!totalSeconds || totalSeconds <= 0) return "—";
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
};

export default function MakeBulkCalls() {
  const BASE_URL = import.meta.env.VITE_BASE_URL;
  const [hotels, setHotels] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState("");
  const [isLoadingHotels, setIsLoadingHotels] = useState(false);
  const [rateLimitSecond, setRateLimitSecond] = useState(2.0);

  const [parsedContacts, setParsedContacts] = useState([]);
  const [batchId, setBatchId] = useState(null);
  const [queueStatus, setQueueStatus] = useState("idle"); // 'idle' | 'running' | 'paused' | 'stopped'
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchHotels = async () => {
      setIsLoadingHotels(true);
      try {
        const { data } = await axios.get(`${BASE_URL}/api/v1/voice/hotels`);
        if (isMounted && data?.data) {
          setHotels(data.data);
          if (data.data.length > 0) {
            setSelectedHotelId(String(data.data[0].hotel_id));
          }
        }
      } catch (error) {
        console.error("Failed to load hotels:", error);
      } finally {
        if (isMounted) setIsLoadingHotels(false);
      }
    };
    fetchHotels();
    return () => {
      isMounted = false;
    };
  }, [BASE_URL]);

  // Poll Batch Job Progress & Live Contact Statuses
  useEffect(() => {
    if (!batchId || (queueStatus !== "running" && queueStatus !== "paused")) return;

    const interval = setInterval(async () => {
      try {
        const { data } = await axios.get(`${BASE_URL}/api/v1/voice/batch/${batchId}`);
        if (data?.data) {
          const batchJob = data.data;
          if (batchJob.status === "completed" || batchJob.status === "stopped") {
            setQueueStatus(batchJob.status);
          }

          if (batchJob.contacts_summary?.length > 0) {
            const summaryMap = {};
            batchJob.contacts_summary.forEach((item) => {
              const cleanNum = String(item.to_number || "").replace(/\D/g, "");
              summaryMap[cleanNum] = item.status;
            });

            setParsedContacts((prev) =>
              prev.map((c) => {
                const cClean = String(c.to_number || "").replace(/\D/g, "");
                return {
                  ...c,
                  status: summaryMap[cClean] || c.status,
                };
              })
            );
          }
        }
      } catch (err) {
        console.error("Error polling batch status:", err);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [batchId, queueStatus, BASE_URL]);

  const handleFileSelect = (file) => {
    if (!file) {
      setParsedContacts([]);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const workbook = XLSX.read(e.target.result, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const rows = XLSX.utils.sheet_to_json(sheet);
      const formatted = rows.map((row) => ({
        guest_name: row.guest_name || row["Guest Name"] || "Guest",
        guest_lead: row.guest_lead || row["Lead Details"] || "Room inquiry",
        to_number: String(
          row.phone_number || row["Phone Number"] || "+918113848049",
        ).trim(),
      }));
      setParsedContacts(formatted);
    };
    reader.readAsBinaryString(file);
  };

  // 1. Initiate Bulk Calls
  const handleInitiate = async (e) => {
    if (e) e.preventDefault();
    if (parsedContacts.length === 0 || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const payload = {
        hotel_id:
          selectedHotelId ||
          (hotels[0]?.hotel_id ? String(hotels[0].hotel_id) : "111111"),
        rate_limit_second: Number(rateLimitSecond),
        dry_run: false,
        contacts: parsedContacts,
      };

      const response = await axios.post(
        `${BASE_URL}/api/v1/voice/batch`,
        payload,
      );
      const createdBatchId = response.data?.data?.batch_id;
      setBatchId(createdBatchId);
      setQueueStatus("running");
    } catch (err) {
      console.error("Failed to initiate batch calls:", err);
      alert(err.response?.data?.message || "Failed to initiate calls");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Pause
  const handlePause = async () => {
    if (!batchId) return;
    try {
      await axios.post(`${BASE_URL}/api/v1/voice/batch/${batchId}/pause`);
      setQueueStatus("paused");
    } catch (err) {
      console.error("Failed to pause batch:", err);
    }
  };

  // 3. Resume
  const handleResume = async () => {
    if (!batchId) return;
    try {
      await axios.post(`${BASE_URL}/api/v1/voice/batch/${batchId}/resume`);
      setQueueStatus("running");
    } catch (err) {
      console.error("Failed to resume batch:", err);
    }
  };

  // 4. Stop
  const handleStop = async () => {
    if (!batchId) return;
    try {
      await axios.post(`${BASE_URL}/api/v1/voice/batch/${batchId}/stop`);
      setQueueStatus("stopped");
    } catch (err) {
      console.error("Failed to stop batch:", err);
    }
  };

  return (
    <form
      onSubmit={handleInitiate}
      className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full flex flex-col h-full min-h-0 gap-5 overflow-hidden"
    >
      {/* Page Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <span className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <PhoneForwarded className="w-5 h-5" />
            </span>
            Make Bulk Outbound Calls
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Upload CSV/Excel contacts and batch dispatch through the telephony
            queue.
          </p>
        </div>

        {parsedContacts.length > 0 && (
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>{parsedContacts.length} Contacts Ready</span>
          </div>
        )}
      </div>

      {/* Queue Configuration & Actions Bar */}
      <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-4 backdrop-blur-xl shadow-xl flex flex-wrap items-center justify-between gap-4 shrink-0 relative z-30">
        {/* Left Side: Parameters (Hotel Knowledge Base & Call Delay Stepper) */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Hotel Select Field */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400 shrink-0">
              Hotel:
            </span>
            <div className="w-56 sm:w-64">
              <StandaloneSelect
                value={selectedHotelId}
                onChange={(val) => setSelectedHotelId(val)}
                disabled={isLoadingHotels || queueStatus === "running"}
                searchable={true}
                size="sm"
                placeholder={
                  isLoadingHotels ? "Loading hotels..." : "Select Hotel..."
                }
                options={
                  hotels.length > 0
                    ? hotels.map((hotel) => ({
                        value: String(hotel.hotel_id),
                        label:
                          hotel.name ||
                          hotel.hotel_name ||
                          `Hotel (${hotel.hotel_id})`,
                        subLabel: `ID: ${hotel.hotel_id}`,
                        icon: (
                          <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                        ),
                      }))
                    : [
                        {
                          value: "111111",
                          label: "Default Hotel (111111)",
                          subLabel: "ID: 111111",
                          icon: (
                            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                          ),
                        },
                      ]
                }
              />
            </div>
          </div>

          <div className="h-5 w-px bg-slate-800 hidden md:block" />

          {/* Delay Between Calls Stepper */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 shrink-0">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Delay between calls:</span>
            </div>
            <StandaloneStepper
              value={rateLimitSecond}
              onChange={(val) => setRateLimitSecond(val)}
              min={1.0}
              max={5.0}
              step={0.5}
              suffix="s"
              disabled={queueStatus === "running"}
            />
          </div>
        </div>

        {/* Right Side: Actions (Initiate, Pause/Resume, Stop) & Live Queue Status */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Action Button Group */}
          <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80">
            {/* Initiate / Pause / Resume Primary Button */}
            {queueStatus === "idle" || queueStatus === "stopped" ? (
              <button
                type="submit"
                disabled={parsedContacts.length === 0 || isSubmitting}
                className="h-8 flex items-center gap-2 px-3.5 rounded-lg bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/25 transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isSubmitting ? "Initiating..." : "Initiate Calls"}</span>
              </button>
            ) : queueStatus === "running" ? (
              <button
                type="button"
                onClick={handlePause}
                className="h-8 flex items-center gap-1.5 px-3 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-medium text-xs transition-all duration-200 active:scale-95 cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleResume}
                className="h-8 flex items-center gap-1.5 px-3 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-medium text-xs transition-all duration-200 active:scale-95 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Resume</span>
              </button>
            )}

            {/* Stop Queue Button */}
            <button
              type="button"
              disabled={queueStatus === "idle" || queueStatus === "stopped"}
              onClick={handleStop}
              className="h-8 flex items-center gap-1.5 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-medium text-xs transition-all duration-200 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop</span>
            </button>
          </div>

          {/* Realtime Queue Status Pill (Aligned height h-10 to match action container) */}
          <div className="h-10 flex items-center gap-2 px-3.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-mono text-slate-400">
            <span className="text-slate-500 text-[11px]">Status:</span>
            <span
              className={`font-semibold uppercase tracking-wider flex items-center gap-1.5 text-xs ${
                queueStatus === "running"
                  ? "text-emerald-400"
                  : queueStatus === "paused"
                    ? "text-amber-400"
                    : queueStatus === "stopped"
                      ? "text-rose-400"
                      : "text-slate-400"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  queueStatus === "running"
                    ? "bg-emerald-400 animate-pulse"
                    : queueStatus === "paused"
                      ? "bg-amber-400"
                      : queueStatus === "stopped"
                        ? "bg-rose-400"
                        : "bg-slate-600"
                }`}
              />
              {queueStatus}
            </span>
          </div>
        </div>
      </div>

      {/* File Upload Zone Card */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl shadow-xl shrink-0">
        <FileUploadField
          label="Upload Contacts File (CSV or Excel)"
          accept=".csv,.xlsx"
          maxSizeMB={5}
          helperText="Required columns: guest_name, phone_number, guest_lead"
          onFileSelect={handleFileSelect}
        />
      </div>

      {/* Parsed Contacts Table - Fills 100% Remaining Height with Internal Scroll */}
      {parsedContacts.length > 0 && (
        <div className="flex-1 min-h-0 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex flex-col backdrop-blur-xl shadow-xl overflow-hidden animate-in fade-in duration-200">
          {/* Table Header / Action Bar */}
          <div className="px-6 py-3.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/70 shrink-0">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-slate-100">
                Parsed Leads Preview
              </h2>
              <span className="ml-2 px-2 py-0.5 bg-slate-800 text-slate-300 rounded-full text-xs font-mono">
                {parsedContacts.length}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Scroll internally to review all leads
            </span>
          </div>

          {/* Scrollable Table Body Container */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin [scrollbar-color:#334155_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-700/60 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-600">
            <table className="w-full text-center text-xs border-collapse table-fixed">
              <thead className="bg-slate-950/90 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800/80 sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  <th className="py-3 px-2 w-[4%] text-center font-mono">#</th>
                  <th className="py-3 px-3 w-[15%] text-center font-semibold">
                    Guest Name
                  </th>
                  <th className="py-3 px-3 w-[15%] text-center font-semibold">
                    Phone Number
                  </th>
                  <th className="py-3 px-4 w-[42%] text-center font-semibold">
                    Guest Lead Context
                  </th>
                  <th className="py-3 px-3 w-[12%] text-center font-semibold">
                    Status
                  </th>
                  <th className="py-3 px-3 w-[12%] text-center font-semibold">
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {parsedContacts.map((contact, index) => (
                  <tr
                    key={index}
                    className="hover:bg-slate-800/30 transition-colors group"
                  >
                    <td className="py-3.5 px-2 text-center font-mono text-slate-500 text-xs">
                      {index + 1}
                    </td>
                    <td className="py-3.5 px-3 text-slate-100 font-semibold text-left">
                      <div className="flex items-center justify-start gap-2.5 max-w-full pl-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                          {contact.guest_name?.charAt(0)?.toUpperCase() || "G"}
                        </div>
                        <span className="truncate max-w-33">
                          {contact.guest_name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-slate-300">
                      <div className="flex justify-center">
                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/60 rounded-lg border border-slate-700/40 w-fit">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {contact.to_number}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 leading-relaxed text-center">
                      <div className="flex items-center justify-center gap-2 max-w-full">
                        <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="line-clamp-2 max-w-105">
                          {contact.guest_lead}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <div className="flex justify-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                            contact.status === "completed"
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                              : contact.status === "initiated"
                                ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-300 animate-pulse"
                                : contact.status === "answered"
                                  ? "bg-blue-500/10 border-blue-500/20 text-blue-400 animate-pulse"
                                  : contact.status === "failed" ||
                                      contact.status === "busy" ||
                                      contact.status === "no_answer"
                                    ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                                    : "bg-slate-800 border-slate-700/60 text-slate-400"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              contact.status === "completed"
                                ? "bg-emerald-400"
                                : contact.status === "initiated"
                                  ? "bg-yellow-400 animate-ping"
                                  : contact.status === "answered"
                                    ? "bg-blue-400"
                                    : contact.status === "failed"
                                      ? "bg-rose-400"
                                      : "bg-slate-500"
                            }`}
                          />
                          {contact.status}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono text-slate-300 text-xs">
                      {formatDuration(contact.duration)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </form>
  );
}
