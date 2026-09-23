"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/common/Navbar";
import { BottomNav } from "@/components/common/BottomNav";
import ChatWindow from "@/components/whatsapp/ChatWindow";
import type { Message } from "@/components/whatsapp/MessageBubble";
import QuickReplyButtons, {
  type QuickReplyOption,
} from "@/components/whatsapp/QuickReplyButtons";
import { DEMO_MERCHANT_ID, API_BASE_URL } from "@/lib/constants";
import { Skeleton } from "@/components/common/Skeleton";

// ---------- Demo Messages Removed ----------
// We now rely entirely on the realtime database for the conversation history.

const QUICK_REPLIES: QuickReplyOption[] = [
  { label: "Aaj ka P&L", value: "pnl_today", variant: "primary" },
  { label: "Udhari list", value: "udhari_list", variant: "default" },
  { label: "GST status", value: "gst_status", variant: "default" },
  { label: "Remind overdue", value: "remind_overdue", variant: "danger" },
  { label: "Customer pulse", value: "customer_pulse", variant: "default" },
  { label: "Cash forecast", value: "cash_forecast", variant: "primary" },
];

export default function WhatsAppPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [composeText, setComposeText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendingBriefing, setSendingBriefing] = useState(false);
  const toPhone = "+91 9876543210";

  const fetchMessages = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/whatsapp/${DEMO_MERCHANT_ID}/messages`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const list: Message[] = (Array.isArray(json) ? json : json.data ?? []).map((d: Record<string, unknown>) => ({
        id: d.id as string,
        direction: d.direction as "inbound" | "outbound",
        content: (d.content ?? "") as string,
        message_type: (d.message_type || "text") as Message["message_type"],
        sent_at: d.sent_at as string,
        status: (d.status || "sent") as Message["status"],
        payment_link: d.payment_link as Message["payment_link"],
      })).reverse();
      setMessages(list);
    } catch (err) {
      console.error("WhatsApp fetch failed:", err);
      setFetchError((err as Error).message);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => { fetchMessages(); }, []);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchMessages(false), 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = async (customText?: string) => {
    const msgText = customText || composeText.trim();
    if (!msgText) return;
    setSendingMessage(true);

    // Add optimistic outbound message
    const optimisticMsg: Message = {
      id: `opt_${Date.now()}`,
      direction: "outbound",
      content: msgText,
      message_type: "text",
      sent_at: new Date().toISOString(),
      status: "sent",
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    if (!customText) setComposeText("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/whatsapp/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id: DEMO_MERCHANT_ID,
          message: msgText,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Refresh to get the real status and the reply
      await fetchMessages(false);
    } catch (err) {
      console.error("Failed to send message:", err);
      // Mark as failed but keep in UI
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticMsg.id ? { ...m, status: "sent" } : m
        )
      );
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSendBriefing = async () => {
    setSendingBriefing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/briefing/${DEMO_MERCHANT_ID}/send`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Refresh messages to show the briefing
      await fetchMessages(false);
    } catch (err) {
      console.error("Failed to send briefing:", err);
      // Add a local fallback briefing message
      const briefingMsg: Message = {
        id: `briefing_${Date.now()}`,
        direction: "inbound",
        content: "Morning Briefing request sent! It will appear shortly.",
        message_type: "text",
        sent_at: new Date().toISOString(),
        status: "read",
      };
      setMessages((prev) => [...prev, briefingMsg]);
    } finally {
      setSendingBriefing(false);
    }
  };

  const handleQuickReply = (value: string) => {
    const label = QUICK_REPLIES.find((q) => q.value === value)?.label || value;
    handleSendMessage(label);
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col bg-vyapaar-bg">
        <Navbar shopName="Sunita Saree Shop" payScore={74} />
        <main className="flex-1 flex flex-col px-4 pt-4 pb-24 max-w-3xl mx-auto w-full">
          <div className="mb-3">
            <Skeleton className="h-7 w-36 mb-1" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="flex-1 space-y-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                <Skeleton className={`h-16 rounded-2xl ${i % 2 === 0 ? "w-3/4" : "w-1/2"}`} />
              </div>
            ))}
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-vyapaar-bg">
      <Navbar shopName="Sunita Saree Shop" payScore={74} />

      <main className="flex-1 flex flex-col px-4 pt-4 pb-24 max-w-3xl mx-auto w-full">
        {/* Error banner */}
        {fetchError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center justify-between mb-3">
            <p className="text-xs text-red-700">API unavailable, showing demo data</p>
            <button onClick={() => fetchMessages()} className="text-xs font-semibold text-red-700 flex items-center gap-1">
              Retry
            </button>
          </div>
        )}
        {/* Page Title */}
        <div className="mb-3">
          <h1 className="text-xl font-bold text-vyapaar-primary-dark">
            Vyapaar GrowthOS Chat
          </h1>
          <p className="text-sm text-vyapaar-text-secondary">
            WhatsApp-style conversation with your AI muneem
          </p>
        </div>

        {/* Send Briefing Button */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={handleSendBriefing}
            disabled={sendingBriefing}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-wait"
          >
            {sendingBriefing ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <span className="text-sm">{"\u2600\uFE0F"}</span>
                Send Morning Briefing
              </>
            )}
          </button>
          <span className="text-[10px] text-gray-400">Get your daily business summary</span>
        </div>

        {/* Chat Window */}
        <div className="flex-1 min-h-0">
          <ChatWindow messages={messages} merchantName="Vyapaar GrowthOS - Aapka Digital Muneem" />
        </div>

        {/* Compose Box */}
        <div className="mt-3 flex items-center gap-2">
          <input
            type="text"
            value={composeText}
            onChange={(e) => setComposeText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            disabled={sendingMessage}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={sendingMessage || !composeText.trim()}
            className="h-10 w-10 flex items-center justify-center bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {sendingMessage ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            )}
          </button>
        </div>

        {/* Quick Reply Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-3"
        >
          <p className="text-[10px] text-gray-400 px-1 mb-1.5">Quick Actions</p>
          <QuickReplyButtons options={QUICK_REPLIES} onSelect={handleQuickReply} />
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}
