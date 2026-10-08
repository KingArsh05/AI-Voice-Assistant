import { FormProvider, useForm, useWatch } from "react-hook-form";
import {
  InputField,
  PhoneInputField,
  SelectField,
  TextareaField,
} from "./common/FormControl";
import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  PhoneCall,
  Loader2,
  Sparkles,
  Bot,
  Building2,
  User,
  ShieldCheck,
  CheckCircle2,
  Radio,
} from "lucide-react";

export default function MakeSingleCall() {
  const methods = useForm({
    mode: "onChange",
    defaultValues: {
      guest_name: "",
      guest_lead: "",
      agent_country_code: "+91",
      agent_number: "8031825752",
      guest_country_code: "+91",
      to_number: "",
      hotel_name: "",
    },
  });

  const [hotels, setHotels] = useState([]);
  const [isLoadingHotels, setIsLoadingHotels] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastDispatchedCall, setLastDispatchedCall] = useState(null);

  const BASE_URL =
    import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_URL;

  // React 19 Compiler-safe observation via useWatch
  const formValues = useWatch({
    control: methods.control,
  });

  const watchedGuest = formValues?.guest_name || "";
  const watchedGuestPhone = formValues?.to_number || "";
  const watchedCountryCode = formValues?.guest_country_code || "+91";
  const watchedHotelId = formValues?.hotel_name || "";
  const watchedLead = formValues?.guest_lead || "";

  const selectedHotel = hotels.find(
    (h) => String(h.hotel_id) === String(watchedHotelId),
  );

  useEffect(() => {
    let isMounted = true;
    const get_all_hotels = async () => {
      setIsLoadingHotels(true);
      try {
        const { data } = await axios.get(`${BASE_URL}/api/v1/voice/hotels`);
        if (isMounted && data?.data) {
          setHotels(data.data);
          // Set first hotel as default if not already selected
          if (data.data.length > 0 && !methods.getValues("hotel_name")) {
            methods.setValue("hotel_name", data.data[0].hotel_id);
          }
        }
      } catch (error) {
        console.error("Failed to load hotels:", error);
        toast.error("Failed to fetch hotels from server");
      } finally {
        if (isMounted) setIsLoadingHotels(false);
      }
    };
    get_all_hotels();
    return () => {
      isMounted = false;
    };
  }, [BASE_URL, methods]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setLastDispatchedCall(null);

    // Format phone numbers properly with country code
    const cleanGuestNumber = String(data.to_number || "").trim();
    const guestFullNumber = cleanGuestNumber.startsWith("+")
      ? cleanGuestNumber
      : `${data.guest_country_code || "+91"}${cleanGuestNumber}`;

    const payload = {
      to_number: guestFullNumber,
      guest_name: data.guest_name.trim(),
      hotel_id: data.hotel_name || null,
      guest_lead: data.guest_lead?.trim() || "",
      dry_run: false,
    };

    try {
      const response = await axios.post(
        `${BASE_URL}/api/v1/voice/call`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
        },
      );

      if (response.data && response.data.success) {
        const callData = response.data.data;
        setLastDispatchedCall(callData);
        toast.success(
          `🚀 Call initiated successfully to ${payload.guest_name}! Call UUID: ${callData.call_uuid?.slice(0, 8)}...`,
          { icon: "📞" },
        );
        // Clear guest details for next call while keeping agent and hotel intact
        methods.setValue("guest_name", "");
        methods.setValue("to_number", "");
        methods.setValue("guest_lead", "");
      } else {
        throw new Error(response.data?.message || "Failed to trigger call");
      }
    } catch (error) {
      console.error("Call dispatch error:", error);
      const errMsg =
        error.response?.data?.message ||
        error.response?.data?.errors?.[0]?.msg ||
        error.message ||
        "An unexpected error occurred while placing the call";
      toast.error(`❌ ${errMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full flex flex-col justify-center min-h-0 animate-in fade-in duration-300 my-auto">
      {/* Background ambient lighting */}
      <div className="absolute top-16 left-1/3 w-lg h-lg bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-violet-600/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-linear-to-tr from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-600/30">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                Make Single Call
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Ready
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Trigger dedicated Plivo CX Outbound AI voice reservation agent for individual guest lead follow-ups.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 shadow-sm">
            <Radio className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>
              Outbound Caller:{" "}
              <strong className="font-mono text-slate-100 font-semibold">
                +91 8031825752
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout (Form on Left, Live Telemetry on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 items-start">
        {/* Left Form Card (7 Columns) */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-7 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/70">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Lead Details & Telephony Parameters</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              All fields validated live
            </span>
          </div>

          <FormProvider {...methods}>
            <form
              onSubmit={methods.handleSubmit(onSubmit)}
              className="space-y-5"
            >
              {/* Hotel Name & Guest Name: Side by Side (Left & Right) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SelectField
                  name="hotel_name"
                  label="Hotel Name"
                  placeholder="Select a Hotel..."
                  searchable={true}
                  disabled={isLoadingHotels}
                  options={hotels.map((hotel) => ({
                    value: hotel.hotel_id,
                    label: `${hotel.hotel_name || hotel.name} (${hotel.hotel_id})`,
                  }))}
                  rules={{
                    required: {
                      value: true,
                      message: "Please select a Hotel",
                    },
                  }}
                  helperText="Select target property"
                />

                <InputField
                  name="guest_name"
                  label="Guest Name"
                  placeholder="e.g. Rahul Sharma"
                  rules={{
                    required: {
                      value: true,
                      message: "Guest name is required",
                    },
                    minLength: {
                      value: 2,
                      message: "Minimum 2 characters",
                    },
                  }}
                  helperText="Full name of prospective guest"
                />
              </div>

              {/* Telephony Pair: Agent Outbound Caller ID + Guest Destination Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <PhoneInputField
                  countryCodeName="agent_country_code"
                  phoneName="agent_number"
                  label="Agent Caller ID (From)"
                  disabled={true}
                  defaultCountryCode="+91"
                  defaultValue="8031825752"
                  rules={{
                    required: {
                      value: true,
                      message: "Agent Number is required",
                    },
                    minLength: {
                      value: 10,
                      message: "Phone number must be at least 10 digits",
                    },
                    maxLength: {
                      value: 10,
                      message: "Phone number cannot exceed 10 digits",
                    },
                  }}
                  helperText="Verified Plivo DID caller number"
                />

                <PhoneInputField
                  countryCodeName="guest_country_code"
                  phoneName="to_number"
                  label="Guest Phone Number (To)"
                  placeholder="9876543210"
                  defaultCountryCode="+91"
                  rules={{
                    required: {
                      value: true,
                      message: "Guest Phone Number is required",
                    },
                    pattern: {
                      value: /^[6-9]\d{9}$/,
                      message: "Please enter a valid 10-digit phone number",
                    },
                    minLength: {
                      value: 10,
                      message: "Phone number must be exactly 10 digits",
                    },
                    maxLength: {
                      value: 10,
                      message: "Phone number must be exactly 10 digits",
                    },
                  }}
                  helperText="Recipient mobile number to call"
                />
              </div>

              {/* Guest Lead Context */}
              <TextareaField
                name="guest_lead"
                label="Guest Lead"
                placeholder="e.g. Guest dropped off at payment page while booking Deluxe Room for 2 nights. Inquired about complimentary breakfast and room upgrade."
                rows={4}
                rules={{
                  required: {
                    value: true,
                    message: "Guest Lead is required",
                  },
                  minLength: {
                    value: 3,
                    message: "Please enter guest lead details (min 3 chars)",
                  },
                }}
                helperText="Provided to the voice assistant as context when following up with the guest"
              />

              {/* Submit Button with Loading State */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 rounded-2xl bg-linear-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.99] text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed border border-indigo-400/20"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Initiating AI Call Dispatch...</span>
                    </>
                  ) : (
                    <>
                      <PhoneCall className="w-4 h-4" />
                      <span>Dispatch Voice Agent Call</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </FormProvider>
        </div>

        {/* Right Preview & Telemetry Card (5 Columns) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Real-time Call Configuration Preview Card */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-xl shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/70">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Bot className="w-4 h-4 text-indigo-400" />
                <span>Call Dispatch Preview</span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                Live Preview
              </span>
            </div>

            <div className="space-y-3.5">
              {/* Hotel Preview */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3 transition-colors hover:border-slate-700/80">
                <div className="p-2.5 rounded-xl bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 shrink-0 mt-0.5">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">
                    Assigned Property
                  </p>
                  <p className="text-sm font-semibold text-white truncate mt-0.5">
                    {selectedHotel
                      ? selectedHotel.hotel_name || selectedHotel.name
                      : "No Hotel Selected"}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    ID: {watchedHotelId || "—"}
                  </p>
                </div>
              </div>

              {/* Guest Preview */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3 transition-colors hover:border-slate-700/80">
                <div className="p-2.5 rounded-xl bg-violet-600/15 text-violet-400 border border-violet-500/20 shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">
                    Target Guest
                  </p>
                  <p className="text-sm font-semibold text-white truncate mt-0.5">
                    {watchedGuest || "Guest Name..."}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {watchedGuestPhone
                      ? `${watchedCountryCode || "+91"} ${watchedGuestPhone}`
                      : "Phone not entered"}
                  </p>
                </div>
              </div>

              {/* Context Preview */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1.5 transition-colors hover:border-slate-700/80">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Guest Lead Context</span>
                </div>
                <p className="text-xs text-slate-300 italic line-clamp-3 leading-relaxed mt-1">
                  {watchedLead ||
                    "Guest lead details will appear here as you type..."}
                </p>
              </div>
            </div>
          </div>

          {/* Success Call Summary (Appears after successful dispatch) */}
          {lastDispatchedCall && (
            <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-3xl p-5 backdrop-blur-xl animate-in zoom-in-95 duration-200 space-y-3 shadow-lg">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Call Successfully Triggered</span>
              </div>
              <div className="text-xs text-slate-300 space-y-1.5 font-mono bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
                <p className="flex justify-between">
                  <span className="text-slate-400">Call UUID:</span>
                  <span className="text-emerald-300 font-semibold">
                    {lastDispatchedCall.call_uuid || "—"}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">Trigger ID:</span>
                  <span className="text-slate-300">
                    {lastDispatchedCall.trigger_id || "—"}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">Recipient:</span>
                  <span className="text-slate-200">
                    {lastDispatchedCall.to_number || "—"}
                  </span>
                </p>
                <p className="flex justify-between pt-1 border-t border-slate-800/80">
                  <span className="text-slate-400">Status:</span>
                  <span className="text-emerald-400 font-bold uppercase tracking-wider">
                    {lastDispatchedCall.status || "initiated"}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Persona Security Notice */}
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/70 flex items-start gap-3 text-xs text-slate-400 shadow-sm">
            <div className="p-2 rounded-xl bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <p className="leading-relaxed pt-0.5">
              Equipped with real-time speech synthesis, Whisper Turbo
              transcription, and automatic CRM call log recording.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
