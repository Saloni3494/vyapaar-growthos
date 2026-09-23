"use client";

import { usePathname } from "next/navigation";
import { Search, Mic, Sparkles } from "lucide-react";
import { LiveDot } from "./LiveDot";
import { LanguageToggle } from "./LanguageToggle";
import { useSocket } from "@/hooks/useSocket";
import { NotificationCenter } from "./NotificationCenter";

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard", subtitle: "Aaj ka hisaab" },
  "/udhari": { title: "Udhari Book", subtitle: "Sabki udhari ek jagah" },
  "/forecast": { title: "Cash Flow Forecast", subtitle: "Aane wale din ka hisaab" },
  "/customers": { title: "Customers", subtitle: "Apne grahak" },
  "/gst": { title: "GST Autopilot", subtitle: "Tax compliance on autopilot" },
  "/schemes": { title: "Government Schemes", subtitle: "Sarkari yojnayein" },
  "/employees": { title: "Employees", subtitle: "Apni team" },
  "/whatsapp": { title: "WhatsApp", subtitle: "Business messaging" },
  "/soundbox": { title: "Soundbox", subtitle: "Payment alerts" },
  "/chat": { title: "AI Chat", subtitle: "Vyapaar GrowthOS se baat karein" },
};

export function TopHeader() {
  const pathname = usePathname();
  const { isConnected } = useSocket();
  const page = PAGE_TITLES[pathname] || PAGE_TITLES["/"];

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-slate-200/70 bg-white/75 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      {/* Left: Page Title */}
      <div className="flex items-center gap-3 min-w-0 pl-12 lg:pl-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-[#002e6e]">
              {page.title}
            </h1>
            {isConnected && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-semibold">
                <LiveDot />
              </span>
            )}
          </div>
            <p className="hidden text-xs font-medium text-slate-400 sm:block">
            {page.subtitle}
          </p>
        </div>
      </div>

      {/* Center: Search Bar */}
      <div className="hidden md:flex flex-1 max-w-md mx-4">
        <div className="relative w-full group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 group-focus-within:text-[#00BAF2] transition-colors" />
          <input
            type="text"
            placeholder="Search transactions, customers, udhari..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#00baf2]/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#00baf2]/10 transition-all"
          />
          <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-400 lg:inline-flex">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Language Toggle */}
        <LanguageToggle className="hidden sm:flex" />

        {/* AI Sparkle */}
        <button className="hidden h-10 items-center gap-1.5 rounded-xl bg-[#002e6e] px-3.5 text-xs font-semibold text-white shadow-[0_8px_18px_-10px_rgba(0,46,110,0.8)] transition-all hover:bg-[#00428d] hover:shadow-[#00baf2]/30 active:scale-[0.98] sm:flex">
          <Sparkles className="h-3.5 w-3.5" />
          <span>AI Vyapaar</span>
        </button>

        {/* Voice Input */}
        <button
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#00baf2]/20 bg-[#00baf2]/10 text-[#007bb0] transition-all hover:bg-[#00baf2]/20 hover:scale-105 active:scale-95"
          aria-label="Voice input"
        >
          <Mic className="h-4 w-4" />
          <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00BAF2] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00BAF2]" />
          </span>
        </button>

        {/* Notifications */}
        <NotificationCenter />

        {/* User Avatar */}
        <div className="hidden h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-gradient-to-br from-[#002e6e] to-[#00baf2] text-xs font-bold text-white transition-all hover:scale-105 hover:shadow-lg hover:shadow-[#00baf2]/20 sm:flex">
          SS
        </div>
      </div>
    </header>
  );
}
