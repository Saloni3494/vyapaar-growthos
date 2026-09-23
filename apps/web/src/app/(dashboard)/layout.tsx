"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/common/Sidebar";
import { TopHeader } from "@/components/common/TopHeader";
import { VoiceChatWidget } from "@/components/common/VoiceChatWidget";
import { VoiceFAB } from "@/components/voice/VoiceFAB";
import { AuthGuard } from "@/components/common/AuthGuard";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { API_BASE_URL, DEMO_MERCHANT_ID } from "@/lib/constants";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [payScore, setPayScore] = useState(74);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/payscore/${DEMO_MERCHANT_ID}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.score) setPayScore(Math.round(d.score)); })
      .catch(() => {});
  }, []);

  return (
    <AuthGuard requireOnboarded={true}>
      <LanguageProvider>
        <div className="flex min-h-dvh bg-transparent">
          <Sidebar payScore={payScore} />
          <div className="flex-1 flex flex-col min-w-0">
            <TopHeader />
            <main className="flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-[1680px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
                {children}
              </div>
            </main>
          </div>
          <VoiceFAB />
          <VoiceChatWidget />
        </div>
      </LanguageProvider>
    </AuthGuard>
  );
}
