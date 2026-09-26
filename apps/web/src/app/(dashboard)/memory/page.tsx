"use client";

import { useState, useEffect } from "react";
import { DEMO_MERCHANT_ID, API_BASE_URL } from "@/lib/constants";
import { Skeleton } from "@/components/common/Skeleton";
import { BrainCircuit, RefreshCw, AlertCircle, Database, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

interface Memory {
  id: string;
  category: string;
  insight: string;
  evidence: string;
  confidence: string;
  created_at: string;
}

export default function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMemories();
  }, []);

  const fetchMemories = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/memory/${DEMO_MERCHANT_ID}`);
      if (!res.ok) throw new Error("Failed to fetch memories");
      const data = await res.json();
      setMemories(data.memories || []);
    } catch (e: any) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExtract = async () => {
    try {
      setExtracting(true);
      const res = await fetch(`${API_BASE_URL}/api/memory/${DEMO_MERCHANT_ID}/extract`, {
        method: "POST"
      });
      if (!res.ok) throw new Error("Extraction failed");
      await fetchMemories();
    } catch (e: any) {
      alert("Failed to extract new memories: " + e.message);
    } finally {
      setExtracting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-64 mb-6" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-[#00BAF2]" />
            Growth Memory
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Personalized insights learned from past actual outcomes.
            Vyapaar AI uses these to refine future Opportunity recommendations.
          </p>
        </div>

        <button
          onClick={handleExtract}
          disabled={extracting}
          className="flex items-center gap-2 px-4 py-2 bg-[#00BAF2] hover:bg-[#00a3d4] text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${extracting ? 'animate-spin' : ''}`} />
          {extracting ? "Analyzing Outcomes..." : "Synthesize New Insights"}
        </button>
      </div>

      {error ? (
        <div className="p-6 text-center bg-red-50 text-red-600 rounded-2xl border border-red-100">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-80" />
          <p className="font-medium">Failed to load memory store</p>
        </div>
      ) : memories.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center">
          <Database className="w-12 h-12 text-gray-300 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900">Blank Slate</h3>
          <p className="text-gray-500 mt-1 max-w-md">
            Execute actions and let their impact measurements accumulate. Once outcomes are recorded, click "Synthesize New Insights" to extract learnings.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {memories.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex"
            >
              <div className={`w-2 ${m.confidence === 'high' ? 'bg-emerald-500' : m.confidence === 'medium' ? 'bg-blue-500' : 'bg-amber-500'}`} />
              <div className="p-5 flex-1">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                    {m.category.replace('_', ' ')}
                  </span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${m.confidence === 'high' ? 'bg-emerald-100 text-emerald-700' :
                      m.confidence === 'medium' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                    {m.confidence} Confidence
                  </span>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  "{m.insight}"
                </h3>

                <div className="flex gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-gray-700">Evidence Log</p>
                    <p className="text-xs text-gray-500 mt-0.5">{m.evidence}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
