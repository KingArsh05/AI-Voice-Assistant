import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, Sun, Moon, Phone, ChevronDown, Circle } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

import { checkHealth } from "../services/api";

function useBackendHealth() {
  const [status, setStatus] = useState("checking"); // checking | connected | offline

  useEffect(() => {
    let cancelled = false;

    async function ping() {
      try {
        const data = await checkHealth();
        if (!cancelled) {
          setStatus(data && data.status === "ok" ? "connected" : "offline");
        }
      } catch {
        if (!cancelled) setStatus("offline");
      }
    }

    ping();
    const interval = setInterval(ping, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return status;
}

export default function Navbar({ onOpenMobile }) {
  const { isDark, toggleTheme } = useTheme();
  const status = useBackendHealth();

  const healthConfig = {
    checking: { label: "Checking…", dot: "text-slate-400", pill: "border-slate-200 text-slate-500 dark:border-white/10 dark:text-slate-400" },
    connected: { label: "Connected", dot: "text-emerald-500 fill-emerald-500", pill: "border-emerald-500/20 text-emerald-600 dark:text-emerald-400" },
    offline: { label: "Backend Offline", dot: "text-rose-500 fill-rose-500", pill: "border-rose-500/20 text-rose-600 dark:text-rose-400" },
  }[status] || { label: "Offline", dot: "text-slate-400", pill: "border-slate-200 text-slate-500" };

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#0B0F17]/80 sm:px-6">
      <button
        onClick={onOpenMobile}
        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Hotel switcher */}
      <button className="hidden items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 sm:flex">
        <span>Hotel Sahu &mdash; Varanasi</span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {/* Health pill */}
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${healthConfig.pill}`}
        >
          <Circle className={`h-2 w-2 ${healthConfig.dot}`} />
          {healthConfig.label}
        </span>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="rounded-lg border border-slate-200/80 p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* New call CTA */}
        <Link
          to="/dialer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-linear-to-r from-emerald-500 to-cyan-500 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 sm:gap-2"
        >
          <Phone className="h-4 w-4" />
          <span className="hidden sm:inline">New Call</span>
        </Link>
      </div>
    </header>
  );
}