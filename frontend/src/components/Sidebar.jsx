import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  PhoneCall,
  ListChecks,
  Megaphone,
  BedDouble,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/dialer", label: "Outbound Dialer", icon: PhoneCall },
  { to: "/call-logs", label: "Call Logs & Intelligence", icon: ListChecks },
  { to: "/campaign-studio", label: "Campaign Studio", icon: Megaphone },
];

export default function Sidebar({ mobileOpen, onCloseMobile }) {
  return (
    <>
      {/* Mobile scrim */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200/80 bg-white/90 backdrop-blur-xl transition-transform duration-300 ease-out dark:border-white/10 dark:bg-[#111827]/80 lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-emerald-400 to-cyan-500 text-sm font-semibold text-white">
              SC
            </div>
            <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
              StayChat Voice AI
            </span>
          </div>
          <button
            onClick={onCloseMobile}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10 lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
                }`
              }
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200/80 px-5 py-4 text-xs text-slate-400 dark:border-white/10 dark:text-slate-500">
          Hotel Sahu &middot; Varanasi
        </div>
      </aside>
    </>
  );
}