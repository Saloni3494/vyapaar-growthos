"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  Target, 
  ShieldCheck, 
  BarChart3, 
  BrainCircuit,
  Battery,
  Wifi,
  Signal
} from "lucide-react";
import { VoiceChatWidget } from "@/components/common/VoiceChatWidget";

export default function MobileSimulationLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { name: "Home", href: "/mobile-simulation", icon: Home },
    { name: "Missions", href: "/mobile-simulation/missions", icon: Target },
    { name: "Approvals", href: "/mobile-simulation/approvals", icon: ShieldCheck },
    { name: "Impact", href: "/mobile-simulation/impact", icon: BarChart3 },
    { name: "Memory", href: "/mobile-simulation/memory", icon: BrainCircuit },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4 sm:p-8 font-sans">
      {/* Phone Frame wrapper */}
      <div 
        className="relative w-[390px] h-[844px] bg-black rounded-[50px] shadow-2xl border-[12px] border-black overflow-hidden flex flex-col ring-1 ring-gray-900/10"
        style={{ transform: "translateZ(0)", contain: "strict" }}
      >
        
        {/* Notch & Status Bar */}
        <div className="absolute top-0 inset-x-0 h-12 z-50 flex items-center justify-between px-6 text-black pointer-events-none">
          {/* Time */}
          <span className="text-[13px] font-semibold mt-1">10:43</span>
          
          {/* Dynamic Island / Notch Mock */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[120px] h-[30px] bg-black rounded-full shadow-inner border border-gray-800"></div>
          
          {/* Icons */}
          <div className="flex items-center gap-1.5 mt-1">
            <Signal className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold">5G</span>
            <Battery className="w-5 h-5 ml-1" />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-gray-50 overflow-y-auto overflow-x-hidden relative pt-12 pb-24 hide-scrollbar">
          {children}
        </div>

        {/* Paytm-style Bottom Navigation */}
        <div className="absolute bottom-0 inset-x-0 bg-white border-t border-gray-100 pb-6 pt-2 px-2 flex justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href} className="flex flex-col items-center justify-center w-full group relative">
                <div className={`p-2 rounded-2xl transition-all duration-300 ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                  <item.icon className={`w-[22px] h-[22px] ${isActive ? 'text-[#00BAF2]' : 'text-gray-500'}`} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] mt-1 font-medium ${isActive ? 'text-[#00BAF2]' : 'text-gray-500'}`}>
                  {item.name}
                </span>
                {isActive && (
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#00BAF2]" />
                )}
              </Link>
            );
          })}
        </div>
        
        {/* Home Indicator */}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1/3 h-1 bg-gray-900 rounded-full z-50 pointer-events-none opacity-80" />

        <VoiceChatWidget />
      </div>

      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
