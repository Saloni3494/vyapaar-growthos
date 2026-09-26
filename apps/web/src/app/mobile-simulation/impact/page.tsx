"use client";

import React, { useEffect, useState } from "react";
import { BarChart3, TrendingUp, TrendingDown, Loader2 } from "lucide-react";

import { DEMO_MERCHANT_ID, API_BASE_URL } from "@/lib/constants";

export default function MobileImpact() {
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMeasurements();
  }, []);

  const fetchMeasurements = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/impact/${DEMO_MERCHANT_ID}`);
      const data = await res.json();
      setMeasurements(data.measurements || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 pb-20">
      <div className="bg-white px-5 py-4 sticky top-0 z-10 shadow-sm border-b border-gray-100 flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#00BAF2]" />
          Impact & ROI
        </h1>
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 text-[#00BAF2] animate-spin" /></div>
        ) : measurements.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-3xl border border-gray-100 text-gray-500 text-xs font-medium">
            No active measurements yet.
          </div>
        ) : (
          measurements.map((m) => (
            <div key={m.id} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-[#00BAF2]" />
              
              <div className="flex justify-between items-start mb-3">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                  m.status === 'tracking' ? 'bg-blue-50 text-[#00BAF2]' : 'bg-green-50 text-green-600'
                }`}>
                  {m.status.replace('_', ' ')}
                </span>
                <span className="text-[10px] text-gray-400 font-medium">Confidence: {m.confidence}</span>
              </div>

              <h3 className="font-bold text-slate-900 mb-4 leading-tight">{m.title}</h3>
              
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-50 p-3 rounded-2xl border border-gray-100">
                  <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Baseline</p>
                  <p className="font-extrabold text-slate-700">₹{m.baseline_rate}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-gray-100">
                  <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Actual</p>
                  <p className="font-extrabold text-slate-900">₹{m.actual_value}</p>
                </div>
              </div>

              <div className={`p-4 rounded-2xl border ${m.incremental_value > 0 ? 'bg-green-50 border-green-100' : m.incremental_value < 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Incremental Impact</span>
                  {m.incremental_value > 0 ? <TrendingUp className="w-4 h-4 text-green-600" /> : m.incremental_value < 0 ? <TrendingDown className="w-4 h-4 text-red-600" /> : null}
                </div>
                <p className={`text-2xl font-black ${m.incremental_value > 0 ? 'text-green-600' : m.incremental_value < 0 ? 'text-red-600' : 'text-slate-700'}`}>
                  {m.incremental_value > 0 ? '+' : ''}₹{m.incremental_value}
                </p>
                <p className="text-[9px] text-slate-400 mt-1">Method: {m.attribution_method}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
