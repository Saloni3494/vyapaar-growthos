"use client";

import { useState, useEffect } from "react";
import { formatINR, DEMO_MERCHANT_ID, API_BASE_URL } from "@/lib/constants";
import { Skeleton } from "@/components/common/Skeleton";
import { LineChart, TrendingUp, AlertCircle, Activity, Info, BarChart2 } from "lucide-react";
import { motion } from "framer-motion";

interface Measurement {
  id: string;
  action_type: string;
  title: string;
  metric_name: string;
  baseline_rate: number;
  actual_value: number;
  incremental_value: number;
  attribution_method: string;
  confidence: string;
  status: string;
  days_active: number;
  created_at: string;
}

export default function ImpactPage() {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchImpacts();
  }, []);

  const fetchImpacts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/impact/${DEMO_MERCHANT_ID}`);
      if (!res.ok) throw new Error("Failed to fetch impacts");
      const data = await res.json();
      setMeasurements(data.measurements || []);
    } catch (e: any) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const formatValue = (val: number, metric: string) => {
    if (metric.includes('revenue') || metric.includes('cost') || metric.includes('collected')) {
      return formatINR(val);
    }
    return val.toString();
  };

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case 'revenue': return 'Revenue (₹)';
      case 'udhari_collected': return 'Udhar Collected (₹)';
      case 'inventory_cost': return 'Inventory Value (₹)';
      default: return metric;
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <LineChart className="w-6 h-6 text-vyapaar-primary" />
          Impact & ROI Measurement
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Measure the true incremental value of every automated action and mission executed by GrowthOS.
        </p>
      </div>

      {error ? (
        <div className="p-6 text-center bg-red-50 text-red-600 rounded-2xl border border-red-100">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-80" />
          <p className="font-medium">Failed to load measurements</p>
        </div>
      ) : measurements.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center">
          <BarChart2 className="w-12 h-12 text-gray-300 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900">No impact data yet</h3>
          <p className="text-gray-500 mt-1 max-w-md">
            Execute actions from your Missions or Opportunities to start tracking incremental impact.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {measurements.map(m => {
            const isInsufficient = m.status === 'insufficient_data';
            const isPositive = m.incremental_value > 0;
            const isDeterministic = m.attribution_method === 'deterministic';

            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col"
              >
                <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                      {m.action_type.replace('_', ' ')}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${
                      m.confidence === 'high' ? 'bg-emerald-100 text-emerald-700' :
                      m.confidence === 'medium' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {m.confidence} Confidence
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{m.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Attribution: {isDeterministic ? 'Direct Assignment' : 'Before vs After (Daily Avg)'}
                  </p>
                </div>

                <div className="p-5 flex-1 space-y-5">
                  {isInsufficient ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-2 py-4">
                      <AlertCircle className="w-8 h-8 text-amber-400 opacity-50" />
                      <div>
                        <p className="text-sm font-bold text-gray-700">Insufficient Historical Data</p>
                        <p className="text-xs text-gray-500 mt-1">
                          We need at least 7 days of past transaction history to calculate a reliable baseline for this action.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500 font-medium">Expected Baseline ({m.days_active || 1}d)</p>
                          <p className="text-lg font-semibold text-gray-400">
                            {isDeterministic ? "N/A" : formatValue(m.baseline_rate * (m.days_active || 1), m.metric_name)}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500 font-medium">Actual Result</p>
                          <p className="text-lg font-bold text-gray-900">
                            {formatValue(m.actual_value, m.metric_name)}
                          </p>
                        </div>
                      </div>

                      <div className={`p-4 rounded-xl border ${
                        isPositive ? 'bg-emerald-50 border-emerald-100' : 
                        m.incremental_value === 0 ? 'bg-gray-50 border-gray-100' : 'bg-red-50 border-red-100'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                              isPositive ? 'text-emerald-700' : m.incremental_value === 0 ? 'text-gray-500' : 'text-red-700'
                            }`}>
                              Incremental Impact
                            </p>
                            <p className={`text-2xl font-black ${
                              isPositive ? 'text-emerald-600' : m.incremental_value === 0 ? 'text-gray-400' : 'text-red-600'
                            }`}>
                              {isPositive ? '+' : ''}{formatValue(m.incremental_value, m.metric_name)}
                            </p>
                          </div>
                          {isPositive ? (
                            <TrendingUp className="w-8 h-8 text-emerald-500 opacity-50" />
                          ) : (
                            <Activity className="w-8 h-8 text-gray-400 opacity-50" />
                          )}
                        </div>
                        {!isDeterministic && (
                          <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
                            <Info className="w-3 h-3" />
                            Actual outcome minus expected baseline trajectory.
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
