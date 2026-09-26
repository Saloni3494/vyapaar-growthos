"use client";

import React, { useEffect, useState } from "react";
import { BrainCircuit, Cpu, Loader2, Sparkles } from "lucide-react";

const DEMO_MERCHANT_ID = "11111111-1111-1111-1111-111111111111";
const API_BASE_URL = "http://localhost:8000";

export default function MobileMemory() {
  const [memories, setMemories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [synthesizing, setSynthesizing] = useState(false);

  const fetchMemories = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/memory/${DEMO_MERCHANT_ID}`);
      const data = await res.json();
      setMemories(data.memories || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, []);

  const handleSynthesize = async () => {
    setSynthesizing(true);
    try {
      await fetch(`${API_BASE_URL}/api/memory/${DEMO_MERCHANT_ID}/extract`, { method: "POST" });
      await fetchMemories();
    } finally {
      setSynthesizing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 pb-20">
      <div className="bg-white px-5 py-4 sticky top-0 z-10 shadow-sm border-b border-gray-100 flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-purple-500" />
          Growth Memory
        </h1>
        <button
          onClick={handleSynthesize}
          disabled={synthesizing}
          className="bg-purple-50 text-purple-600 px-3 py-1.5 rounded-full text-[10px] font-bold border border-purple-100 flex items-center gap-1 active:scale-95 transition-transform"
        >
          {synthesizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          Learn
        </button>
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 text-purple-500 animate-spin" /></div>
        ) : memories.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-3xl border border-gray-100 text-gray-500 text-xs font-medium">
            Vyapaar AI is learning your business...
          </div>
        ) : (
          memories.map((m) => (
            <div key={m.id} className="bg-white rounded-3xl p-5 shadow-sm border border-purple-100/50 relative overflow-hidden">
              <div className="flex justify-between items-start mb-3">
                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                  {m.category.replace('_', ' ')}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 ${m.confidence === 'high' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'
                  }`}>
                  <Cpu className="w-3 h-3" />
                  {m.confidence} Confidence
                </span>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-1 bg-purple-200 rounded-full h-full self-stretch" />
                <div>
                  <p className="text-sm font-bold text-slate-900 mb-2 leading-snug">{m.insight}</p>
                  <p className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded-xl italic">
                    Evidence: {m.evidence}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
