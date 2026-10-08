import {
  CalendarCheck,
  TrendingUp,
  XCircle,
  FileEdit,
  DollarSign,
  HelpCircle,
  UsersRound,
  FileQuestion,
  Sparkles,
  ArrowUpRight,
  AlertCircle,
  Layers,
} from "lucide-react";

// Rainbow colors requested:
// INQUIRY: Blue (Sky/Blue)
// LEAD: Blue/Cyan
// HIGH_PAY: Purple (Violet/Purple)
// GROUP: Pink (Fuchsia/Pink)
// UPSELL: Purple/Indigo
// CONFIRMED_UPSELL: Emerald/Teal (Green)
// CONFIRMED_BOOKING: Green (Emerald/Green)
// AMENDMENT: Yellow (Amber/Yellow)
// AMENDMENT_REQUEST: Orange (Orange)
// CANCELLATION_REQUEST: Salmon/Coral (Orange-Red)
// CANCELLATION: Red (Red)
// OTHER: Slate (Neutral Slate)

const INTENT_CONFIG = {
  INQUIRY: {
    label: "Inquiry",
    icon: HelpCircle,
    badgeClasses: "bg-blue-500/15 text-blue-300 border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.15)]",
    iconColor: "text-blue-400",
  },
  LEAD: {
    label: "Lead",
    icon: Sparkles,
    badgeClasses: "bg-sky-500/15 text-sky-300 border-sky-500/30 shadow-[0_0_12px_rgba(14,165,233,0.15)]",
    iconColor: "text-sky-400",
  },
  HIGH_PAY: {
    label: "High Pay",
    icon: DollarSign,
    badgeClasses: "bg-purple-500/15 text-purple-300 border-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.15)]",
    iconColor: "text-purple-400",
  },
  GROUP: {
    label: "Group",
    icon: UsersRound,
    badgeClasses: "bg-pink-500/15 text-pink-300 border-pink-500/30 shadow-[0_0_12px_rgba(236,72,153,0.15)]",
    iconColor: "text-pink-400",
  },
  UPSELL: {
    label: "Upsell",
    icon: ArrowUpRight,
    badgeClasses: "bg-violet-500/15 text-violet-300 border-violet-500/30 shadow-[0_0_12px_rgba(139,92,246,0.15)]",
    iconColor: "text-violet-400",
  },
  CONFIRMED_UPSELL: {
    label: "Confirmed Upsell",
    icon: TrendingUp,
    badgeClasses: "bg-teal-500/15 text-teal-300 border-teal-500/30 shadow-[0_0_12px_rgba(20,184,166,0.15)]",
    iconColor: "text-teal-400",
  },
  CONFIRMED_BOOKING: {
    label: "Confirmed Booking",
    icon: CalendarCheck,
    badgeClasses: "bg-green-500/15 text-green-300 border-green-500/30 shadow-[0_0_12px_rgba(34,197,94,0.15)]",
    iconColor: "text-green-400",
  },
  AMENDMENT: {
    label: "Amendment",
    icon: FileEdit,
    badgeClasses: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30 shadow-[0_0_12px_rgba(234,179,8,0.15)]",
    iconColor: "text-yellow-400",
  },
  AMENDMENT_REQUEST: {
    label: "Amendment Request",
    icon: AlertCircle,
    badgeClasses: "bg-orange-500/15 text-orange-300 border-orange-500/30 shadow-[0_0_12px_rgba(249,115,22,0.15)]",
    iconColor: "text-orange-400",
  },
  CANCELLATION_REQUEST: {
    label: "Cancellation Request",
    icon: FileQuestion,
    badgeClasses: "bg-rose-500/15 text-rose-300 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.15)]",
    iconColor: "text-rose-400",
  },
  CANCELLATION: {
    label: "Cancellation",
    icon: XCircle,
    badgeClasses: "bg-red-500/15 text-red-400 border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.15)]",
    iconColor: "text-red-400",
  },
  OTHER: {
    label: "Other",
    icon: Layers,
    badgeClasses: "bg-slate-800 text-slate-300 border-slate-700",
    iconColor: "text-slate-400",
  },
};

export default function CRMIntentBadge({ intent }) {
  const key = (intent || "").toUpperCase().trim();
  const config = INTENT_CONFIG[key] || {
    label: intent ? intent.replace(/_/g, " ") : "Unknown",
    icon: Layers,
    badgeClasses: "bg-slate-800/80 text-slate-300 border-slate-700",
    iconColor: "text-slate-400",
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all ${config.badgeClasses}`}
    >
      <Icon className={`w-3.5 h-3.5 ${config.iconColor}`} />
      <span className="capitalize whitespace-nowrap">{config.label}</span>
    </span>
  );
}
