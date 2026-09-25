import React, { useRef, useState } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  FileCheck,
  X,
  FileDown,
  Info,
  CheckCircle2,
} from "lucide-react";

export default function BulkUploadZone({
  fileName,
  fileError,
  onFileUpload,
  onClearFile,
  leadsCount = 0,
  invalidCount = 0,
}) {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileUpload({ target: { files: e.dataTransfer.files } });
    }
  };

  const downloadSampleCSV = () => {
    const csvContent =
      "Guest Name,Phone Number,Lead Details\n" +
      "Rahul Sharma,8544953527,Interested in Deluxe Room for 2 nights check-in tomorrow\n" +
      "Priya Verma,8544953528,Inquired about suite pricing and airport cab pickup\n" +
      "Aman Gupta,8544953529,Looking to book banquet hall for family dinner\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "staychat_sample_leads.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderPrettifiedError = (errorText) => {
    if (!errorText) return null;

    if (errorText.includes("Lead #") || errorText.includes(" | ")) {
      const parts = errorText.split(" | ").map((p) => p.trim()).filter(Boolean);
      return (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-2 animate-in fade-in">
          <div className="flex items-center gap-2 font-semibold text-rose-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>Campaign Pre-flight Validation Issues Detected</span>
          </div>
          <div className="space-y-1.5 pl-6 max-h-36 overflow-y-auto pr-1">
            {parts.map((part, idx) => (
              <div
                key={idx}
                className="text-[11px] leading-relaxed bg-rose-950/40 p-2.5 rounded-xl border border-rose-800/40 flex items-start gap-2"
              >
                <span className="text-rose-400 font-bold shrink-0">•</span>
                <span className="text-rose-200">{part.replace(/^Campaign pre-flight validation failed:\s*/i, "")}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
        <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
        <span className="leading-relaxed">{errorText}</span>
      </div>
    );
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-7 backdrop-blur-xl shadow-xl shrink-0 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-inner">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white tracking-wide">
              Upload Leads Spreadsheet
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Accepts .csv or .xlsx with customer names, phones, and booking inquiries
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={downloadSampleCSV}
          className="px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          title="Download template with correct column headers"
        >
          <FileDown className="w-4 h-4" />
          Sample CSV
        </button>
      </div>

      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-5 sm:p-6 flex items-center gap-4 cursor-pointer transition-all duration-200 group ${
          isDragOver
            ? "border-indigo-500 bg-indigo-950/30 ring-2 ring-indigo-500/20"
            : fileName
            ? invalidCount > 0
              ? "border-amber-500/50 bg-amber-950/10 hover:border-amber-500/70"
              : "border-emerald-500/50 bg-emerald-950/10 hover:border-emerald-500/70"
            : "border-slate-800 hover:border-indigo-500/80 bg-slate-950/50 hover:bg-indigo-950/20"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
          className="hidden"
          onChange={onFileUpload}
        />

        <div
          className={`p-3.5 rounded-2xl shrink-0 transition-colors shadow-inner ${
            fileName
              ? invalidCount > 0
                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "bg-slate-800/80 text-slate-400 group-hover:text-indigo-400 group-hover:bg-indigo-600/20 border border-slate-700/60"
          }`}
        >
          {fileName ? (
            invalidCount > 0 ? (
              <AlertCircle className="w-6 h-6 text-amber-400" />
            ) : (
              <FileCheck className="w-6 h-6 text-emerald-400" />
            )
          ) : (
            <UploadCloud className="w-6 h-6" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {fileName ? (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{fileName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-emerald-400 font-medium">
                    ✓ {leadsCount} valid leads
                  </span>
                  {invalidCount > 0 && (
                    <span className="text-xs text-amber-400 font-medium">
                      • ⚠ {invalidCount} need attention
                    </span>
                  )}
                  <span className="text-xs text-slate-500">• Click to replace file</span>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (fileInputRef.current) fileInputRef.current.value = "";
                  onClearFile?.();
                }}
                className="p-2 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                Drop your spreadsheet here, or{" "}
                <span className="text-indigo-400 underline decoration-indigo-400/50">browse files</span>
              </p>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400 font-mono">
                <span className="bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800 text-slate-300">
                  Guest Name
                </span>
                <span className="bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800 text-slate-300">
                  Phone Number
                </span>
                <span className="bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800 text-slate-300">
                  Lead Details
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {fileError && renderPrettifiedError(fileError)}
    </div>
  );
}
