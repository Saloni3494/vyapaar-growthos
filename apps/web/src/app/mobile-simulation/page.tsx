"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Search,
  QrCode,
  Wallet,
  Building2,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Zap
} from "lucide-react";

export default function MobileHome() {
  const [merchantName] = useState("SS Merchant");
  const [oppCount, setOppCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const DEMO_MERCHANT_ID = "11111111-1111-1111-1111-111111111111";
  const API_BASE_URL = "http://localhost:8000";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const oppRes = await fetch(`${API_BASE_URL}/api/opportunities/${DEMO_MERCHANT_ID}`);
        const oppData = await oppRes.json();
        const activeOpps = oppData.opportunities?.filter((o: any) => o.status === 'open') || [];
        setOppCount(activeOpps.length);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Paytm Style Header */}
      <div className="bg-white px-5 pt-4 pb-4 sticky top-0 z-10 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-[#00BAF2] font-bold text-sm">
            SS
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-extrabold text-lg text-slate-800 tracking-tight">paytm</span>
              <span className="text-[10px] font-bold bg-blue-50 text-[#00BAF2] px-1.5 py-0.5 rounded-full mt-1 border border-blue-100">Business</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-slate-700">
          <Search className="w-6 h-6" />
          <div className="relative">
            <Bell className="w-6 h-6" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">

        {/* Quick Actions (Paytm style) */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100">
          <div className="grid grid-cols-4 gap-4">
            <Link href="/mobile-simulation/udhari" className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-[#00BAF2]">
                <QrCode className="w-7 h-7" />
              </div>
              <span className="text-[11px] font-medium text-center leading-tight">Udhari<br />Khata</span>
            </Link>
            <Link href="/mobile-simulation/inventory" className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-[#00BAF2]">
                <Wallet className="w-7 h-7" />
              </div>
              <span className="text-[11px] font-medium text-center leading-tight">Stock &<br />Inventory</span>
            </Link>
            <Link href="/mobile-simulation/invoices" className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-[#00BAF2]">
                <Building2 className="w-7 h-7" />
              </div>
              <span className="text-[11px] font-medium text-center leading-tight">Smart<br />Invoices</span>
            </Link>
            <Link href="/mobile-simulation/customers" className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-[#00BAF2]">
                <TrendingUp className="w-7 h-7" />
              </div>
              <span className="text-[11px] font-medium text-center leading-tight">Customers</span>
            </Link>
          </div>
        </div>

        {/* GrowthOS AI Banner */}
        <div className="relative bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-5 shadow-lg overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500 rounded-full blur-2xl opacity-20" />
          <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-purple-500 rounded-full blur-2xl opacity-20" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              <h3 className="text-white font-bold text-lg">Vyapaar AI</h3>
              <span className="bg-yellow-400/20 text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-yellow-400/30">GrowthOS</span>
            </div>
            <p className="text-slate-300 text-sm mb-4">
              {loading
                ? "Checking for growth opportunities..."
                : oppCount > 0
                  ? `I found ${oppCount} new opportunit${oppCount === 1 ? 'y' : 'ies'} to increase your weekend profit.`
                  : "You're all caught up! I am monitoring your business."}
            </p>

            <Link href="/mobile-simulation/opportunities" className="inline-flex items-center justify-center w-full bg-white text-slate-900 font-bold py-3 px-4 rounded-xl shadow-sm active:scale-95 transition-transform">
              <Zap className="w-4 h-4 mr-2 text-[#00BAF2]" />
              View Opportunities
            </Link>
          </div>
        </div>

        {/* Today's Overview */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-gray-900">Today's Sales</h3>
            <span className="text-xs font-semibold text-[#00BAF2] bg-blue-50 px-2 py-1 rounded-lg">View All</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-extrabold text-gray-900">₹12,450</span>
            <span className="text-sm font-semibold text-green-500 mb-1">+14% vs yesterday</span>
          </div>
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#00BAF2] to-blue-600 w-3/4 rounded-full" />
          </div>
        </div>

      </div>
    </div>
  );
}
