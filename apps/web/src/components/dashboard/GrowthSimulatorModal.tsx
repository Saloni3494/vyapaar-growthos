"use client";

import { useState, useEffect } from "react";
import { X, TrendingUp, Activity, AlertTriangle, ShieldCheck, CheckCircle2 } from "lucide-react";
import { formatINR, API_BASE_URL } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/common/Skeleton";
import { useRouter } from "next/navigation";

interface Scenario {
  name: string;
  description: string;
  expected_revenue: number;
  expected_profit: number;
  cash_required: number;
  risk: string;
  inventory_impact: string;
  customer_response: string;
  trade_off: string;
}

interface SimulatorData {
  opportunity_id: string;
  scenarios: Scenario[];
  recommendation: string;
}

interface Props {
  opportunityId: string | null;
  onClose: () => void;
  opportunityTitle: string;
}

export function GrowthSimulatorModal({ opportunityId, onClose, opportunityTitle }: Props) {
  const router = useRouter();
  const [data, setData] = useState<SimulatorData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [launching, setLaunching] = useState<number | null>(null);

  const handleLaunchMission = async (scenario: Scenario, index: number) => {
    try {
      setLaunching(index);
      const res = await fetch(`${API_BASE_URL}/api/missions/from-opportunity/${opportunityId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
      });
      if (!res.ok) throw new Error("Failed to launch mission");
      
      router.push("/missions");
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to launch mission. Please try again.");
    } finally {
      setLaunching(null);
    }
  };

  useEffect(() => {
    if (!opportunityId) return;

    const fetchSimulation = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE_URL}/api/simulator/opportunities/${opportunityId}`);
        if (!res.ok) throw new Error("Failed to run simulation");
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSimulation();
  }, [opportunityId]);

  if (!opportunityId) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#00BAF2]/10 flex items-center justify-center text-[#00BAF2]">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Growth Simulator</h2>
                <p className="text-sm text-gray-500">What-if analysis for: {opportunityTitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
            {loading ? (
              <div className="space-y-6">
                <Skeleton className="h-16 w-full rounded-2xl" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-96 w-full rounded-2xl" />)}
                </div>
              </div>
            ) : error ? (
              <div className="p-6 text-center bg-red-50 text-red-600 rounded-2xl border border-red-100">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-80" />
                <p className="font-medium">Error running simulation</p>
                <p className="text-sm opacity-80 mt-1">{error}</p>
              </div>
            ) : data ? (
              <div className="space-y-6">
                {/* AI Recommendation */}
                <div className="bg-[#002E6E] text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-64 h-64 bg-[#00BAF2] blur-[100px] rounded-full opacity-20 translate-x-1/2 -translate-y-1/2" />
                  <div className="relative z-10 flex items-start gap-3">
                    <div className="shrink-0 mt-1">
                      <TrendingUp className="w-6 h-6 text-[#00BAF2]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#00BAF2] uppercase tracking-wider mb-1">Muneem's Recommendation</h3>
                      <p className="text-base leading-relaxed text-blue-50">{data.recommendation}</p>
                    </div>
                  </div>
                </div>

                {/* Scenarios Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {data.scenarios.map((sc, idx) => {
                    const isRecommended = sc.name.toLowerCase().includes("recommend");
                    return (
                      <div 
                        key={idx} 
                        className={`bg-white rounded-2xl border-2 flex flex-col relative overflow-hidden transition-all hover:shadow-lg ${
                          isRecommended ? "border-[#00BAF2] shadow-md scale-[1.02]" : "border-gray-100"
                        }`}
                      >
                        {isRecommended && (
                          <div className="absolute top-0 inset-x-0 h-1 bg-[#00BAF2]" />
                        )}
                        
                        <div className="p-5 border-b border-gray-100">
                          {isRecommended && (
                            <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-[#00BAF2] bg-[#00BAF2]/10 px-2.5 py-1 rounded-full mb-3">
                              <CheckCircle2 className="w-3 h-3" />
                              Optimal Path
                            </span>
                          )}
                          <h4 className="text-lg font-bold text-gray-900">{sc.name}</h4>
                          <p className="text-sm text-gray-500 mt-1 h-10">{sc.description}</p>
                        </div>

                        <div className="p-5 space-y-4 flex-1">
                          <div className="flex justify-between items-end">
                            <span className="text-sm text-gray-500">Expected Profit</span>
                            <span className="text-lg font-black text-emerald-600">+{formatINR(sc.expected_profit)}</span>
                          </div>
                          <div className="flex justify-between items-end">
                            <span className="text-sm text-gray-500">Expected Revenue</span>
                            <span className="text-sm font-bold text-blue-600">{formatINR(sc.expected_revenue)}</span>
                          </div>
                          <div className="flex justify-between items-end">
                            <span className="text-sm text-gray-500">Cash Required</span>
                            <span className="text-sm font-bold text-amber-600">{formatINR(sc.cash_required)}</span>
                          </div>
                          
                          <div className="pt-4 mt-4 border-t border-gray-100 space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-500">Risk Profile</span>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                                sc.risk === 'High' ? 'bg-red-50 text-red-700' : 
                                sc.risk === 'Medium' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                              }`}>{sc.risk}</span>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-gray-400">Inventory Impact</p>
                              <p className="text-xs font-medium text-gray-700 line-clamp-2">{sc.inventory_impact}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-gray-400">Customer Response</p>
                              <p className="text-xs font-medium text-gray-700">{sc.customer_response}</p>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-gray-50 border-t border-gray-100 mt-auto space-y-4">
                          <p className="text-xs text-gray-600 italic">"{sc.trade_off}"</p>
                          <button
                            onClick={() => handleLaunchMission(sc, idx)}
                            disabled={launching !== null}
                            className={`w-full py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${
                              isRecommended 
                                ? "bg-[#00BAF2] text-white shadow-md hover:bg-[#00BAF2]/90" 
                                : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            {launching === idx ? "Launching..." : "Launch Mission"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
