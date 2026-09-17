import React, { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import {
  InputField,
  SelectField,
  TextareaField,
  PhoneInputField,
} from "./common/FormControl";
import { PhoneCall, Bot, Loader2, CheckCircle2, AlertCircle, Building2, Sparkles } from "lucide-react";

export default function MakeCall() {
  const [callStatus, setCallStatus] = useState({ state: "idle", message: "" });
  const [hotels, setHotels] = useState([]);
  const [isLoadingHotels, setIsLoadingHotels] = useState(false);

  const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const methods = useForm({
    defaultValues: {
      username: "",
      from_country_code: "+91",
      from_phone_number: "8031825752",
      to_country_code: "+91",
      to_phone_number: "",
      hotel_id: "",
      ai_persona: "concierge",
      custom_prompt: "You are a helpful customer concierge representing StayChat.",
    },
  });

  const selectedHotelId = methods.watch("hotel_id");
  const selectedHotel = hotels.find((h) => h.hotel_id === selectedHotelId);

  useEffect(() => {
    const fetchHotels = async () => {
      setIsLoadingHotels(true);
      try {
        const res = await fetch(`${backendUrl}/api/v1/hotels?active_only=true`);
        const data = await res.json();
        if (data.success) {
          setHotels(data.data || []);
        }
      } catch (err) {
        console.error("Error loading hotels:", err);
      } finally {
        setIsLoadingHotels(false);
      }
    };
    fetchHotels();
  }, [backendUrl]);

  const onSubmit = async (data) => {
    setCallStatus({ state: "loading", message: "Triggering Plivo CX Voice Agent..." });

    const payload = {
      username: data.username,
      from_number: `${data.from_country_code}${data.from_phone_number}`,
      to_number: `${data.to_country_code}${data.to_phone_number}`,
      persona: data.ai_persona,
      prompt: data.custom_prompt,
      hotel_id: data.hotel_id || null,
    };

    try {
      const response = await fetch(`${backendUrl}/api/v1/voice/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();

      if (response.ok && resData.success) {
        setCallStatus({
          state: "success",
          message: `Call successfully dispatched! Trigger ID: ${resData.data?.trigger_id || "Active"}`,
        });
      } else {
        setCallStatus({
          state: "error",
          message: resData.message || "Failed to trigger voice agent.",
        });
      }
    } catch (err) {
      setCallStatus({
        state: "error",
        message: err.message || "Network error communicating with backend server.",
      });
    }
  };

  return (
    <div className="flex-1 p-6 sm:p-8 flex items-center justify-center relative overflow-y-auto">
      <div className="absolute top-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10">
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-800/80">
          <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-2xl border border-indigo-500/30 shadow-inner">
            <Bot className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white flex items-center gap-2">
              StayChat Voice Agent
              <span className="text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Live
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Initiate instant AI-powered phone conversations via Plivo
            </p>
          </div>
        </div>

        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
            <InputField
              name="username"
              label="Username / Client Name"
              placeholder="e.g. Staychat Client Name"
              rules={{ required: "Username is required" }}
            />

            <PhoneInputField
              countryCodeName="from_country_code"
              phoneName="from_phone_number"
              label="From (Your Plivo Number)"
              placeholder="8031825752"
              helperText="This number must be rented/verified in your Plivo dashboard"
            />

            <PhoneInputField
              countryCodeName="to_country_code"
              phoneName="to_phone_number"
              label="To (Destination Number)"
              placeholder="9876543210"
              helperText="The user or customer whom the AI assistant will call"
            />

            <SelectField
              name="ai_persona"
              label="AI Assistant Persona"
              placeholder=""
              options={[
                { value: "concierge", label: "Hotel / Booking Concierge" },
                { value: "support", label: "Customer Support Agent" },
                { value: "sales", label: "Lead Qualification & Sales" },
                { value: "feedback", label: "Post-Stay Feedback Collector" },
              ]}
            />

            {/* Hotel Knowledge Base Selector */}
            <div className="space-y-2">
              <SelectField
                name="hotel_id"
                label="Hotel Knowledge Base (Optional)"
                placeholder="-- None / Generic Call --"
                options={[
                  { value: "", label: "No Hotel (Generic AI Assistant)" },
                  ...hotels.map((h) => ({
                    value: h.hotel_id,
                    label: `${h.name} (${h.contact?.city || "India"} - ${"★".repeat(h.star_rating || 4)})`,
                  })),
                ]}
              />

              {/* Selected Hotel Knowledge Preview */}
              {selectedHotel && (
                <div className="p-3 bg-indigo-950/30 border border-indigo-500/20 rounded-xl text-xs space-y-1.5 animate-in fade-in">
                  <div className="flex items-center justify-between font-semibold text-indigo-300">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                      {selectedHotel.name}
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono">
                      {"★".repeat(selectedHotel.star_rating || 4)} {selectedHotel.property_type}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    {selectedHotel.room_types?.length || 0} Room Categories • Check-in: {selectedHotel.policies?.check_in_time || "14:00"} • Check-out: {selectedHotel.policies?.check_out_time || "12:00"}
                  </p>
                  {selectedHotel.inventory_notes && (
                    <p className="text-[10px] text-amber-300/90 font-medium bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                      ⚡ Live Note: {selectedHotel.inventory_notes}
                    </p>
                  )}
                  <p className="text-[10px] text-indigo-400/80 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Full property amenities, dining, and rates will be compiled into this call's AI system prompt.
                  </p>
                </div>
              )}
            </div>

            <TextareaField
              name="custom_prompt"
              label="Custom Instructions / Agent Context"
              rows={3}
              placeholder="Provide background knowledge or call goals..."
              helperText="Instructions passed to the AI voice model during the call"
            />

            {callStatus.state !== "idle" && (
              <div
                className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs transition-all ${
                  callStatus.state === "loading"
                    ? "bg-indigo-950/40 border-indigo-500/30 text-indigo-300"
                    : callStatus.state === "success"
                    ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                    : "bg-rose-950/40 border-rose-500/30 text-rose-300"
                }`}
              >
                {callStatus.state === "loading" && (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0 text-indigo-400 mt-0.5" />
                )}
                {callStatus.state === "success" && (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                )}
                {callStatus.state === "error" && (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                )}
                <span className="leading-relaxed">{callStatus.message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={callStatus.state === "loading"}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none text-white font-medium text-sm transition-all duration-200 shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              {callStatus.state === "loading" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Initiating Outbound Flow...</span>
                </>
              ) : (
                <>
                  <PhoneCall className="w-4 h-4" />
                  <span>Initiate AI Call</span>
                </>
              )}
            </button>
          </form>
        </FormProvider>
      </div>
    </div>
  );
}
