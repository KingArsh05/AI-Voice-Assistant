import React, { useState } from "react";
import {
  Users,
  CheckCircle2,
  AlertCircle,
  Search,
  Check,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import CountryCodeSelector from "../common/CountryCodeSelector";

export default function BulkLeadsPreview({
  parsedLeads = [],
  defaultCountryCode = "+91",
  onPrefixChange,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState("all"); // 'all' | 'valid' | 'invalid'

  const validCount = parsedLeads.filter((l) => l.isValid).length;
  const invalidCount = parsedLeads.length - validCount;

  const filteredLeads = parsedLeads.filter((lead) => {
    if (filterMode === "valid" && !lead.isValid) return false;
    if (filterMode === "invalid" && lead.isValid) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      lead.guest_name.toLowerCase().includes(term) ||
      lead.phone_number.toLowerCase().includes(term) ||
      lead.lead_details.toLowerCase().includes(term) ||
      (lead.issues && lead.issues.some((iss) => iss.toLowerCase().includes(term)))
    );
  });

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-7 backdrop-blur-xl shadow-xl flex flex-col flex-1 min-h-0 overflow-hidden space-y-4">
      {/* Header toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-2xl border shadow-inner ${
              invalidCount > 0
                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            }`}
          >
            {invalidCount > 0 ? (
              <ShieldAlert className="w-5 h-5 text-amber-400" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
              Parsed Leads Queue
              <span className="font-mono text-xs text-slate-400 font-normal">
                ({parsedLeads.length} total •{" "}
                <span className="text-emerald-400 font-medium">{validCount} ready</span>
                {invalidCount > 0 && (
                  <span className="text-rose-400 font-medium"> • {invalidCount} issues</span>
                )}
                )
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Review and verify lead details before generating calls
            </p>
          </div>
        </div>

        {/* Global country code selector matching MakeCall */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-medium text-slate-400">Default Country:</span>
          <CountryCodeSelector
            value={defaultCountryCode}
            onChange={onPrefixChange}
            size="md"
          />
        </div>
      </div>

      {/* Filter tabs & Search row */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterMode === "all"
                ? "bg-slate-800 text-white font-medium shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All Leads ({parsedLeads.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("valid")}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterMode === "valid"
                ? "bg-emerald-500/20 text-emerald-300 font-medium shadow-sm"
                : "text-slate-400 hover:text-emerald-400"
            }`}
          >
            Valid ({validCount})
          </button>
          {invalidCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterMode("invalid")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                filterMode === "invalid"
                  ? "bg-rose-500/20 text-rose-300 font-medium shadow-sm"
                  : "text-slate-400 hover:text-rose-400"
              }`}
            >
              Issues ({invalidCount})
            </button>
          )}
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search leads by name, phone or context..."
            className="w-full bg-slate-950/70 border border-slate-800/80 rounded-xl pl-10 pr-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Internal scrollable table */}
      <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl border border-slate-800/80 bg-slate-950/40">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/90 backdrop-blur text-slate-400 sticky top-0 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800 z-10">
            <tr>
              <th className="py-3 px-4 w-12">#</th>
              <th className="py-3 px-4">Guest Name</th>
              <th className="py-3 px-4">Phone Number</th>
              <th className="py-3 px-4">Lead Notes / Context</th>
              <th className="py-3 px-4 text-right">Validation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-xs text-slate-500">
                  No matching leads found
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead, i) => (
                <tr
                  key={lead.serial ?? i}
                  className={
                    lead.isValid
                      ? "hover:bg-slate-800/40 transition-colors"
                      : "bg-rose-500/5 hover:bg-rose-500/10 text-rose-300 transition-colors"
                  }
                >
                  <td className="py-3.5 px-4 text-slate-500 font-mono text-xs align-top">
                    {lead.serial}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-white whitespace-nowrap align-top">
                    {lead.guest_name}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-300 text-xs whitespace-nowrap align-top">
                    {lead.phone_number || lead.raw_phone}
                  </td>
                  <td className="py-3.5 px-4 max-w-sm text-slate-400 text-xs align-top">
                    <div className="truncate" title={lead.lead_details}>
                      {lead.lead_details}
                    </div>
                    {!lead.isValid && lead.issues && lead.issues.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {lead.issues.map((iss, idx) => (
                          <span
                            key={idx}
                            className="inline-block bg-rose-950/80 border border-rose-800/60 text-rose-300 px-2 py-0.5 rounded-lg text-[10px]"
                          >
                            ⚠ {iss}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap align-top">
                    {lead.isValid ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-rose-400 font-semibold bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20 text-[11px]">
                        <AlertCircle className="w-3.5 h-3.5" /> Blocked
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
