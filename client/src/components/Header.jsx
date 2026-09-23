import React from "react";
import { useLocation } from "react-router-dom";
import { Sparkles, Radio, ShieldCheck } from "lucide-react";

export default function Header() {
  const location = useLocation();

  const getPageInfo = () => {
    switch (location.pathname) {
      case "/call-logs":
        return {
          title: "Call Logs & Transcriptions",
          description: "Inspect live calls, recording playback, agent summaries & webhooks",
        };
      case "/make-call":
      case "/":
      default:
        return {
          title: "Initiate Voice Agent",
          description: "Trigger Plivo CX Outbound Flow for hotel guest leads and booking follow-ups",
        };
    }
  };

  const { title, description } = getPageInfo();

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h1 className="text-sm sm:text-base font-semibold text-white tracking-tight flex items-center gap-2">
          {title}
        </h1>
        <p className="text-xs text-slate-400 hidden sm:block">
          {description}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/70 border border-slate-700/60 text-slate-300 text-xs">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="font-medium">CX Flow v1</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          <span>StayChat AI</span>
        </div>
      </div>
    </header>
  );
}
