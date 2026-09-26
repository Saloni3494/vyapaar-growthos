"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatINR, DEMO_MERCHANT_ID, API_BASE_URL } from "@/lib/constants";
import { Skeleton } from "@/components/common/Skeleton";
import {
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  Package,
  Users,
  CheckCircle,
  X,
  RefreshCw,
  Bell,
  ArrowRight,
  ShoppingCart,
  Activity
} from "lucide-react";
import { useRouter } from "next/navigation";
import { GrowthSimulatorModal } from "@/components/dashboard/GrowthSimulatorModal";

interface Opportunity {
  id: string;
  type: string;
  title: string;
  reason: string;
  priority: "high" | "medium" | "low";
  estimated_impact: number;
  confidence: number;
  action_type: string;
  recommended_action: string;
  status: "open" | "actioned" | "dismissed";
  created_at: string;
  metadata?: {
    economic_breakdown?: {
      expected_revenue: number;
      expected_profit: number;
      cash_required: number;
      risk: string;
      evidence: string;
      assumptions: string;
    }
  };
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  udhar_recovery: <Bell className="w-5 h-5 text-red-500" />,
  restock: <Package className="w-5 h-5 text-amber-500" />,
  dead_stock_bundle: <ShoppingCart className="w-5 h-5 text-blue-500" />,
  customer_winback: <Users className="w-5 h-5 text-emerald-500" />,
  cross_sell: <TrendingUp className="w-5 h-5 text-indigo-500" />,
  default: <Lightbulb className="w-5 h-5 text-vyapaar-primary" />,
};

const PRIORITY_STYLES = {
  high: "bg-red-50 text-red-700 border-red-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function OpportunitiesPage() {
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simulationOppId, setSimulationOppId] = useState<string | null>(null);
  const [simulationOppTitle, setSimulationOppTitle] = useState<string>("");

  const fetchOpportunities = async (forceRefresh = false) => {
    try {
      if (forceRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await fetch(`${API_BASE_URL}/api/opportunities/${DEMO_MERCHANT_ID}?force_refresh=${forceRefresh}`);
      if (!res.ok) throw new Error("Failed to fetch opportunities");
      
      const data = await res.json();
      setOpportunities(data.opportunities || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const handleAction = async (opp: Opportunity, action: "actioned" | "dismissed") => {
    try {
      // Optimistic update
      setOpportunities(prev => prev.filter(o => o.id !== opp.id));
      
      await fetch(`${API_BASE_URL}/api/opportunities/${opp.id}/action?action=${action}`, {
        method: "POST"
      });

      // Handle specific action routing based on type
      if (action === "actioned") {
        if (opp.action_type === "udhari_reminder") {
          router.push("/udhari");
        } else if (opp.action_type === "inventory_reorder") {
          router.push("/inventory");
        } else if (opp.action_type === "whatsapp_broadcast") {
          router.push("/whatsapp");
        } else if (opp.action_type === "create_invoice") {
          router.push("/invoices");
        }
      }
    } catch (err) {
      console.error("Action failed", err);
      // Revert optimistic update on failure by refetching
      fetchOpportunities();
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-64 mb-6" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-vyapaar-primary" />
            AI Opportunities
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Smart recommendations to grow your business and recover cash.
          </p>
        </div>
        <button
          onClick={() => fetchOpportunities(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Discovering..." : "Scan for Opportunities"}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Content */}
      {opportunities.length === 0 && !error ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">You're all caught up!</h3>
          <p className="text-gray-500 mt-1">No new opportunities found at the moment.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {opportunities.map((opp, idx) => (
              <motion.div
                key={opp.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex flex-col md:flex-row gap-5"
              >
                {/* Left: Icon & Meta */}
                <div className="flex flex-col items-center justify-center shrink-0 w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100">
                  {TYPE_ICONS[opp.type] || TYPE_ICONS.default}
                </div>
                
                {/* Center: Details */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border ${PRIORITY_STYLES[opp.priority]}`}>
                          {opp.priority} Priority
                        </span>
                        {opp.confidence > 0 && (
                          <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            {opp.confidence}% Match
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">{opp.title}</h3>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                    {opp.reason}
                  </p>
                  
                  <div className="mt-4 flex items-center gap-2 text-sm text-gray-700 bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                    <span className="font-semibold text-vyapaar-primary">Action:</span>
                    <span>{opp.recommended_action}</span>
                  </div>

                  {opp.metadata?.economic_breakdown && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Expected Profit</p>
                        <p className="text-sm font-bold text-emerald-600">+{formatINR(opp.metadata.economic_breakdown.expected_profit)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Cash Required</p>
                        <p className="text-sm font-bold text-amber-600">{formatINR(opp.metadata.economic_breakdown.cash_required)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Risk Profile</p>
                        <p className={`text-sm font-bold ${
                          opp.metadata.economic_breakdown.risk === 'High' ? 'text-red-600' : 
                          opp.metadata.economic_breakdown.risk === 'Medium' ? 'text-amber-600' : 'text-emerald-600'
                        }`}>
                            {opp.metadata.economic_breakdown.risk}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Expected Revenue</p>
                        <p className="text-sm font-bold text-blue-600">{formatINR(opp.metadata.economic_breakdown.expected_revenue)}</p>
                      </div>
                      <div className="col-span-2 md:col-span-4 mt-1 pt-3 border-t border-gray-200/60 space-y-1.5">
                        <p className="text-xs text-gray-600"><span className="font-semibold text-gray-700">Evidence:</span> {opp.metadata.economic_breakdown.evidence}</p>
                        <p className="text-xs text-gray-600"><span className="font-semibold text-gray-700">Assumptions:</span> {opp.metadata.economic_breakdown.assumptions}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Impact & Actions */}
                <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-5 shrink-0 gap-4 md:gap-3">
                  <div className="text-left md:text-right">
                    <p className="text-xs text-gray-500 mb-0.5">Est. Impact</p>
                    <p className="text-xl font-black text-emerald-600">
                      {opp.estimated_impact > 0 ? `+${formatINR(opp.estimated_impact)}` : 'N/A'}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAction(opp, "dismissed")}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Dismiss"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleAction(opp, "actioned")}
                      className="flex items-center gap-2 px-4 py-2 bg-vyapaar-primary text-white text-sm font-bold rounded-xl hover:bg-vyapaar-primary/90 transition-all shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap"
                    >
                      Take Action
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSimulationOppId(opp.id);
                        setSimulationOppTitle(opp.title);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 transition-all shadow-sm whitespace-nowrap"
                      title="Run What-If Analysis"
                    >
                      <Activity className="w-4 h-4 text-vyapaar-primary" />
                      Simulate
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      
      {simulationOppId && (
        <GrowthSimulatorModal 
          opportunityId={simulationOppId}
          opportunityTitle={simulationOppTitle}
          onClose={() => setSimulationOppId(null)}
        />
      )}
    </div>
  );
}
