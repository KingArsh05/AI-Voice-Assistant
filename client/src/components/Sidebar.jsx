import React from "react";
import { NavLink } from "react-router-dom";
import { PhoneCall, ListFilter, Bot, Activity, PhoneIncoming, Building2, ListOrdered } from "lucide-react";

export default function Sidebar() {
  const navItems = [
    {
      name: "Make Call",
      path: "/make-call",
      icon: PhoneCall,
      badge: "AI Agent",
    },
    {
      name: "Bulk Calls",
      path: "/bulk-calls",
      icon: ListOrdered,
      badge: "Queue",
    },
    {
      name: "Call Logs",
      path: "/call-logs",
      icon: ListFilter,
      badge: "Realtime",
    },
    {
      name: "Hotels",
      path: "/hotels",
      icon: Building2,
      badge: "Config",
    },
  ];

  return (
    <aside className="w-64 bg-slate-900/90 border-r border-slate-800/80 backdrop-blur-xl flex flex-col shrink-0 h-screen sticky top-0">
      {/* Brand / Logo */}
      <div className="p-6 border-b border-slate-800/80 flex items-center gap-3">
        <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-xl text-white shadow-lg shadow-indigo-600/30">
          <Bot className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white tracking-tight leading-tight flex items-center gap-2">
            StayChat
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </h2>
          <p className="text-[11px] text-slate-400 font-medium">Voice Assistant Portal</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
        <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Telephony Hub
        </p>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive
                          ? "text-indigo-400"
                          : "text-slate-400 group-hover:text-slate-200"
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                        isActive
                          ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                          : "bg-slate-800 text-slate-400 border-slate-700/60"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Footer System Status */}
      <div className="p-4 m-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            Plivo CX Flow
          </span>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-medium px-1.5 py-0.5 rounded border border-emerald-500/20">
            Active
          </span>
        </div>
        <p className="text-[11px] text-slate-400 truncate">
          Outbound: +91 8031825752
        </p>
      </div>
    </aside>
  );
}
