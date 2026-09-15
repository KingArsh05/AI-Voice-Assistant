import { useState } from "react";
import { Phone, Loader2, CheckCircle2, UploadCloud, FileText, X } from "lucide-react";
import { initiateCall } from "../services/api";

const COUNTRY_CODES = [
  { code: "+91", label: "IN" },
  { code: "+1", label: "US" },
  { code: "+44", label: "UK" },
  { code: "+971", label: "AE" },
];

function QuickDial() {
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [campaignId] = useState("booking-follow-up");
  const [dialState, setDialState] = useState("idle"); // idle | dispatching | dialing | completed
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!phone || !name) return;

    setDialState("dispatching");
    setResult(null);

    const res = await initiateCall({
      to_number: `${countryCode}${phone}`,
      customer_name: name,
      campaign_id: campaignId,
    });

    setDialState("dialing");
    await new Promise((r) => setTimeout(r, 1100));

    setResult(res);
    setDialState("completed");
  }

  function reset() {
    setDialState("idle");
    setResult(null);
    setPhone("");
    setName("");
  }

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/90 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-[#111827]/80">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Single Quick Dial</h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Dispatch a single AI call immediately.</p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">Guest Phone Number</label>
          <div className="flex overflow-hidden rounded-lg border border-slate-200 dark:border-white/10">
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="border-r border-slate-200 bg-slate-50 px-2 text-sm text-slate-700 outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code}>{c.label} {c.code}</option>
              ))}
            </select>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              placeholder="98765 43210"
              className="w-full bg-white px-3 py-2.5 text-sm text-slate-900 outline-none dark:bg-[#0B0F17] dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">Guest Full Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ravi Kapoor"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400 dark:border-white/10 dark:bg-[#0B0F17] dark:text-white"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">Campaign</label>
          <select
            value={campaignId}
            disabled
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
          >
            <option value="booking-follow-up">Hotel Sahu &mdash; Booking Follow-Up</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={dialState === "dispatching" || dialState === "dialing"}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-linear-to-r from-emerald-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {dialState === "dispatching" && <><Loader2 className="h-4 w-4 animate-spin" /> Dispatching…</>}
          {dialState === "dialing" && <><Loader2 className="h-4 w-4 animate-spin" /> Dialing…</>}
          {(dialState === "idle" || dialState === "completed") && <><Phone className="h-4 w-4" /> Start AI Call</>}
        </button>
      </form>

      {dialState === "completed" && result && (
        <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          <div className="flex-1">
            <p className="font-medium text-emerald-700 dark:text-emerald-400">
              Call successfully dispatched
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
              {result.to_number} &middot; UUID: {result.call_uuid || result.message || "queued"}
            </p>
          </div>
          <button onClick={reset} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function parseCsv(text) {
  const lines = text.trim().split("\n").filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    const row = {};
    headers.forEach((h, i) => (row[h] = cells[i] || ""));
    row.valid = /^\+?\d{7,13}$/.test(row.phone || "");
    return row;
  });
}

function BatchImporter() {
  const [leads, setLeads] = useState([]);
  const [fileName, setFileName] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  function handleFile(file) {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => setLeads(parseCsv(e.target.result));
    reader.readAsText(file);
  }

  async function runCampaign() {
    setRunning(true);
    setProgress(0);
    const validLeads = leads.filter((l) => l.valid);
    for (let i = 0; i < validLeads.length; i++) {
      await new Promise((r) => setTimeout(r, 350));
      setProgress(Math.round(((i + 1) / validLeads.length) * 100));
    }
    setRunning(false);
  }

  const validCount = leads.filter((l) => l.valid).length;

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/90 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-[#111827]/80">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Batch CSV Lead Importer</h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Columns expected: <span className="font-mono">name, phone, tentative_dates</span>
      </p>

      {!leads.length ? (
        <label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          className={`mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-10 text-center transition-colors ${
            dragOver
              ? "border-emerald-400 bg-emerald-500/5"
              : "border-slate-200 hover:border-slate-300 dark:border-white/10 dark:hover:border-white/20"
          }`}
        >
          <UploadCloud className="h-6 w-6 text-slate-400" />
          <p className="text-sm text-slate-600 dark:text-slate-300">Drag & drop your CSV, or click to browse</p>
          <input type="file" accept=".csv" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        </label>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <FileText className="h-4 w-4" />
              {fileName} &middot; {leads.length} rows &middot; {validCount} valid
            </div>
            <button onClick={() => { setLeads([]); setFileName(""); setProgress(0); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-56 overflow-auto rounded-lg border border-slate-200 dark:border-white/10">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Phone</th>
                  <th className="px-3 py-2 font-medium">Dates</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {leads.map((lead, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{lead.name}</td>
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{lead.phone}</td>
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{lead.tentative_dates}</td>
                    <td className="px-3 py-2">
                      <span className={lead.valid ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}>
                        {lead.valid ? "Valid" : "Invalid phone"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {running || progress > 0 ? (
            <div>
              <div className="mb-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Running outreach campaign…</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                <div className="h-full rounded-full bg-linear-to-r from-emerald-500 to-cyan-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : (
            <button
              onClick={runCampaign}
              disabled={!validCount}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-linear-to-r from-emerald-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Phone className="h-4 w-4" /> Run Outreach Campaign ({validCount} leads)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function Dialer() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Outbound Dialer</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Dispatch a single call or launch a batch outreach run.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <QuickDial />
        <BatchImporter />
      </div>
    </div>
  );
}