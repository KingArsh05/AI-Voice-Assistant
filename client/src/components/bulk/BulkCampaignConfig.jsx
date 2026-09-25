import React, { useState } from "react";
import {
  Building2,
  PhoneForwarded,
  Sparkles,
  Sliders,
  ChevronDown,
  ChevronUp,
  Play,
  RefreshCw,
  Phone,
  ShieldAlert,
} from "lucide-react";
import {
  InputField,
  SelectField,
  NumberStepperField,
} from "../common/FormControl";
import CountryCodeSelector from "../common/CountryCodeSelector";

export default function BulkCampaignConfig({
  hotels = [],
  isLoadingHotels = false,
  selectedHotel,
  validLeadsCount = 0,
  invalidLeadsCount = 0,
  isSubmitting = false,
  callerCountryCode = "+91",
  onCallerCountryCodeChange,
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-7 backdrop-blur-xl shadow-xl flex flex-col h-full overflow-hidden space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-inner">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
              Campaign Parameters
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Configure telephony and AI persona</p>
          </div>
        </div>

        <span className="text-[10px] font-mono text-indigo-400/90 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
          Live Tuning
        </span>
      </div>

      {/* Form Fields: internal scroll if height is constrained */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">
        {/* Campaign Name */}
        <InputField
          name="campaign_name"
          label="Campaign Name"
          placeholder="e.g. Goa Inquiries • Batch 1"
          helperText="Identify this batch in call reports and analytics"
        />

        {/* Hotel Knowledge Base Selector */}
        <div className="space-y-1.5">
          <SelectField
            name="hotel_id"
            label="Hotel Knowledge Base"
            placeholder={isLoadingHotels ? "Loading verified hotels..." : "-- Select Property --"}
            options={[
              { value: "", label: "No Hotel (Generic StayChat AI Assistant)" },
              ...hotels.map((h) => ({
                value: h.hotel_id,
                label: `${h.name} (${h.contact?.city || "Property"} • ${"★".repeat(h.star_rating || 4)})`,
              })),
            ]}
          />

          {/* Selected Hotel Quick Pill */}
          {selectedHotel && (
            <div className="p-3 bg-indigo-950/40 border border-indigo-500/25 rounded-2xl text-xs space-y-1.5 animate-in fade-in">
              <div className="flex items-center justify-between font-semibold text-indigo-200">
                <span className="flex items-center gap-1.5 truncate">
                  <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  {selectedHotel.name}
                </span>
                <span className="text-[11px] text-amber-400 font-mono shrink-0">
                  {"★".repeat(selectedHotel.star_rating || 4)} {selectedHotel.property_type}
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                {selectedHotel.room_types?.length || 0} Room Categories • Check-in:{" "}
                {selectedHotel.policies?.check_in_time || "14:00"} • Check-out:{" "}
                {selectedHotel.policies?.check_out_time || "12:00"}
              </p>
              {selectedHotel.inventory_notes && (
                <p className="text-[10px] text-amber-300/90 font-medium bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20 truncate">
                  ⚡ {selectedHotel.inventory_notes}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Outbound Caller ID with Country Flag Prefix Selector - Pixel-aligned */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-200">
              Outbound Caller ID (Plivo)
            </label>
            <span className="text-[11px] text-slate-500 font-normal">Telephony CLI</span>
          </div>
          <div className="flex gap-2 items-start">
            <CountryCodeSelector
              value={callerCountryCode}
              onChange={onCallerCountryCodeChange}
              size="md"
            />
            <div className="flex-1">
              <InputField
                name="from_number"
                placeholder="8031825752"
                rules={{ required: "Caller ID is required" }}
              />
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Rented or verified outbound number from your Plivo trunk
          </p>
        </div>

        {/* Collapsible Advanced Timing & Persona Settings */}
        <div className="border border-slate-800/80 rounded-2xl overflow-hidden bg-slate-950/40">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full px-4 py-3 text-xs font-semibold text-slate-200 hover:text-white flex items-center justify-between transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              Timing & Persona Settings
            </span>
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showAdvanced && (
            <div className="p-4 pt-1 space-y-4 border-t border-slate-800/60 animate-in fade-in">
              {/* Cooldown Between Calls */}
              <NumberStepperField
                name="cooldown_seconds"
                label="Gap Between Calls (10-30s Recommended)"
                min={5}
                max={120}
                step={5}
                suffix="sec gap"
                helperText="Rest gap after previous call ends before initiating next lead"
              />

              {/* Max Call Duration */}
              <NumberStepperField
                name="max_call_duration_seconds"
                label="Max Call Duration Per Lead (3-4 Minutes)"
                min={60}
                max={900}
                step={15}
                suffix="sec max"
                helperText="Safety limit: Disconnects the call and advances queue if conversation exceeds this duration"
              />

              {/* AI Persona Pill */}
              <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <PhoneForwarded className="w-3.5 h-3.5 text-indigo-400" />
                    Agent Persona
                  </span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                    Lead Follow-up & Booking Close
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Introduces itself on behalf of the hotel, answers room tariff & policy queries, and confirms reservations.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Launch Button sticky at bottom */}
      <div className="pt-3 border-t border-slate-800/80 mt-2 shrink-0">
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
    </div>
  );
}
