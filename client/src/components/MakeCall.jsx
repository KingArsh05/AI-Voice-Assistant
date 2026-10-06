import React, { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import {
  InputField,
  SelectField,
  TextareaField,
  PhoneInputField,
} from "./common/FormControl";
import {
  PhoneCall,
  Bot,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building2,
  Sparkles,
  BedDouble,
  Clock,
  MapPin,
  Tag,
} from "lucide-react";

export default function MakeCall() {
  const [callStatus, setCallStatus] = useState({ state: "idle", message: "" });
  const [hotels, setHotels] = useState([]);
  const [isLoadingHotels, setIsLoadingHotels] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState(null);
  const [isLoadingKB, setIsLoadingKB] = useState(false);

  const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const methods = useForm({
    defaultValues: {
      guest_name: "",
      from_country_code: "+91",
      from_phone_number: "8031825752",
      to_country_code: "+91",
      to_phone_number: "",
      hotel_id: "",
      persona: "lead_followup",
      guest_lead:
        "Prospective guest interested in booking a room. Follow up to confirm dates, answer room and tariff questions, and assist them in finalizing their reservation.",
    },
  });

  const selectedHotelId = methods.watch("hotel_id");

  // Fetch list of hotels from MONGODB_SOURCE_DB_NAME (staychat_clone_db.hotels) via GET /api/v1/hotels?source=true
  useEffect(() => {
    let isMounted = true;
    const fetchHotels = async () => {
      setIsLoadingHotels(true);
      try {
        const res = await fetch(`${backendUrl}/api/v1/hotels?source=true`);
        const data = await res.json();
        if (isMounted && data.success) {
          setHotels(data.data || []);
        }
      } catch (err) {
        console.error("Error loading hotels from source DB:", err);
      } finally {
        if (isMounted) setIsLoadingHotels(false);
      }
    };
    fetchHotels();
    return () => {
      isMounted = false;
    };
  }, [backendUrl]);

  // Fetch knowledge base in a SINGLE GET CALL when hotel_id changes:
  // GET /api/v1/hotels/<hotel_id>/knowledge-base
  useEffect(() => {
    if (!selectedHotelId) {
      setKnowledgeBase(null);
      return;
    }

    let isMounted = true;
    const fetchKnowledgeBase = async () => {
      setIsLoadingKB(true);
      try {
        const res = await fetch(
          `${backendUrl}/api/v1/hotels/${encodeURIComponent(selectedHotelId)}/knowledge-base`,
        );
        if (!res.ok) {
          throw new Error(`Failed to fetch knowledge base (${res.status})`);
        }
        const data = await res.json();
        if (isMounted) {
          setKnowledgeBase(data);
        }
      } catch (err) {
        console.error("Error loading hotel knowledge base:", err);
        if (isMounted) {
          setKnowledgeBase(null);
        }
      } finally {
        if (isMounted) setIsLoadingKB(false);
      }
    };

    fetchKnowledgeBase();
    return () => {
      isMounted = false;
    };
  }, [selectedHotelId, backendUrl]);

  const onSubmit = async (data) => {
    setCallStatus({
      state: "loading",
      message: "Triggering Plivo CX Voice Agent for Lead Follow-up...",
    });

    const leadInfo = data.guest_lead?.trim() || "";

    const payload = {
      guest_name: data.guest_name,
      from_number: `${data.from_country_code}${data.from_phone_number}`,
      to_number: `${data.to_country_code}${data.to_phone_number}`,
      persona: "lead_followup",
      guest_lead: leadInfo,
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
          message: `Lead follow-up call successfully dispatched! Trigger ID: ${resData.data?.trigger_id || "Active"}`,
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
        message:
          err.message || "Network error communicating with backend server.",
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
                Lead Follow-up
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Outbound AI voice agent calling potential guests to nurture &
              convert booking leads
            </p>
          </div>
        </div>

        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
            <InputField
              name="guest_name"
              label="Guest / Lead Name (Potential Customer)"
              placeholder="e.g. Arsh, Ravi Sharma, Priya Patel"
              helperText="The potential customer's name — the AI will greet them warmly by name to discuss their booking"
              rules={{ required: "Guest lead name is required" }}
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
              label="To (Guest's Phone Number)"
              placeholder="9876543210"
              helperText="Phone number of the prospective customer — the AI will call to follow up on their reservation"
            />

            {/* AI Assistant Persona - Fixed / Specialized for Lead Follow-up */}
            <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-2xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-indigo-400" />
                  AI Agent Persona
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                  Hotel Booking & Lead Follow-up Concierge
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Trained specifically to call prospective hotel guests, take
                follow-ups on room requirements, quote accurate room tariffs,
                and assist in securing confirmed reservations.
              </p>
            </div>

            {/* Hotel Knowledge Base Selector */}
            <div className="space-y-3">
              <SelectField
                name="hotel_id"
                label="Hotel Knowledge Base (Optional)"
                placeholder="-- None / Generic AI Assistant --"
                searchable={true}
                disabled={isLoadingHotels}
                options={[
                  { value: "", label: "No Hotel (Generic AI Assistant)" },
                  ...hotels.map((h) => ({
                    value: h.hotel_id,
                    label: `${h.name} (${h.property_code || h.hotel_id})`,
                    subLabel: h.address || "",
                  })),
                ]}
              />

              {/* Loading State for Knowledge Base */}
              {isLoadingKB && (
                <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center gap-2.5 text-xs text-indigo-300">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400 shrink-0" />
                  <span>
                    Loading hotel knowledge base snapshot (rooms, rates,
                    policies)...
                  </span>
                </div>
              )}

              {/* Selected Hotel Knowledge Base Preview Card */}
              {knowledgeBase && !isLoadingKB && (
                <div className="p-4 bg-gradient-to-br from-indigo-950/40 via-slate-900/80 to-slate-950/60 border border-indigo-500/25 rounded-2xl text-xs space-y-3 shadow-xl backdrop-blur-md animate-in fade-in">
                  {/* Hotel Header */}
                  <div className="flex items-start justify-between gap-3 border-b border-indigo-500/15 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2 font-semibold text-white text-sm">
                        <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span>{knowledgeBase.name}</span>
                        {knowledgeBase.property_code && (
                          <span className="text-[10px] font-mono font-normal px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                            {knowledgeBase.property_code}
                          </span>
                        )}
                      </div>
                      {knowledgeBase.address && (
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="line-clamp-1">
                            {knowledgeBase.address}
                          </span>
                        </p>
                      )}
                    </div>
                    {knowledgeBase.hotel_details?.property?.star_rating && (
                      <span className="text-[11px] text-amber-400 font-medium px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 whitespace-nowrap">
                        {knowledgeBase.hotel_details.property.star_rating}
                      </span>
                    )}
                  </div>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 bg-slate-950/40 rounded-lg border border-slate-800/60 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <div className="truncate">
                        <span className="text-slate-400 block text-[10px]">
                          Timings
                        </span>
                        <span className="text-slate-200 font-medium">
                          In:{" "}
                          {knowledgeBase.hotel_details?.timings?.check_in ||
                            knowledgeBase.policies?.check_in_time ||
                            "12:00 PM"}{" "}
                          | Out:{" "}
                          {knowledgeBase.hotel_details?.timings?.check_out ||
                            knowledgeBase.policies?.check_out_time ||
                            "11:00 AM"}
                        </span>
                      </div>
                    </div>
                    <div className="p-2 bg-slate-950/40 rounded-lg border border-slate-800/60 flex items-center gap-2">
                      <BedDouble className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <div className="truncate">
                        <span className="text-slate-400 block text-[10px]">
                          Inventory
                        </span>
                        <span className="text-slate-200 font-medium">
                          {knowledgeBase.rooms?.length || 0} Categories •{" "}
                          {knowledgeBase.hotel_details?.property?.total_rooms ||
                            "—"}{" "}
                          Total Rooms
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Room Categories Preview */}
                  {knowledgeBase.rooms && knowledgeBase.rooms.length > 0 && (
                    <div className="space-y-1.5 pt-0.5">
                      <div className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5">
                        <Tag className="w-3 h-3 text-indigo-400" />
                        <span>Room Types & Dynamic Tariffs</span>
                      </div>
                      <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                        {knowledgeBase.rooms.map((room, idx) => {
                          const basePrice = room.pricing?.base_price;
                          const minNegotiable =
                            room.pricing?.min_negotiable_price;
                          return (
                            <div
                              key={room.room_type_id || idx}
                              className="p-2 bg-slate-950/60 rounded-lg border border-slate-800/70 flex items-center justify-between text-[11px]"
                            >
                              <div className="min-w-0 pr-2">
                                <span className="font-medium text-slate-200 block truncate">
                                  {room.name}
                                </span>
                                {room.rate_plans &&
                                  room.rate_plans.length > 0 && (
                                    <span className="text-[10px] text-slate-400">
                                      Plans:{" "}
                                      {room.rate_plans
                                        .map(
                                          (p) =>
                                            p.rate_type?.short_name || p.name,
                                        )
                                        .filter(Boolean)
                                        .join(", ")}
                                    </span>
                                  )}
                              </div>
                              <div className="text-right shrink-0">
                                {basePrice != null ? (
                                  <>
                                    <span className="font-semibold text-emerald-400 block">
                                      ₹{basePrice.toLocaleString("en-IN")}
                                    </span>
                                    {minNegotiable != null && (
                                      <span className="text-[9px] text-slate-400 block">
                                        Floor: ₹
                                        {minNegotiable.toLocaleString("en-IN")}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-slate-500">N/A</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* AI Integration Footer */}
                  <div className="pt-2 border-t border-indigo-500/15 flex items-center justify-between text-[10px] text-indigo-300/80">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-indigo-400" />
                      Injected as structured knowledge base for Plivo CX AI
                      Agent
                    </span>
                    <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      Live Synced
                    </span>
                  </div>
                </div>
              )}
            </div>

            <TextareaField
              name="guest_lead"
              label="Guest Lead & Booking Interest"
              rows={3}
              placeholder="Describe the lead's booking requirements — e.g. 'Guest expressed interest in a Deluxe room for 2 nights next weekend. Inquired about breakfast inclusions and extra bed options. Follow up to answer queries and close booking.'"
              helperText="Context about what this prospective customer is looking for — the AI uses this to take tailored follow-ups and convert the lead"
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
