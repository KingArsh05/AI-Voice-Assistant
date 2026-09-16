import React from "react";
import { useForm, FormProvider } from "react-hook-form";
import {
  InputField,
  SelectField,
  TextareaField,
  PhoneInputField,
} from "./common/FormControl";
import { PhoneCall, Bot } from "lucide-react";

export default function MakeCall() {
  const methods = useForm({
    defaultValues: {
      username: "",
      from_country_code: "+91",
      from_phone_number: "8031825752",
      to_country_code: "+91",
      to_phone_number: "",
      ai_persona: "support",
      custom_prompt: "You are a helpful customer concierge representing StayChat.",
    },
  });

  const onSubmit = (data) => {
    const payload = {
      username: data.username,
      from_number: `${data.from_country_code}${data.from_phone_number}`,
      to_number: `${data.to_country_code}${data.to_phone_number}`,
      persona: data.ai_persona,
      prompt: data.custom_prompt,
    };

    const backendUrl = import.meta.env.VITE_API_URL;

    fetch(`${backendUrl}/api/v1/voice/call`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
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
                { value: "support", label: "Customer Support Agent" },
                { value: "sales", label: "Lead Qualification & Sales" },
                { value: "concierge", label: "Hotel / Booking Concierge" },
                { value: "feedback", label: "Post-Stay Feedback Collector" },
              ]}
            />

            <TextareaField
              name="custom_prompt"
              label="Custom Instructions / Agent Context"
              rows={3}
              placeholder="Provide background knowledge or call goals..."
              helperText="Instructions passed to the AI voice model during the call"
            />

            <button
              type="submit"
              className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-medium text-sm transition-all duration-200 shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Initiate AI Call</span>
            </button>
          </form>
        </FormProvider>
      </div>
    </div>
  );
}
