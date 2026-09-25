"use client";

import { useState, useEffect } from "react";
import { formatINR, DEMO_MERCHANT_ID, API_BASE_URL } from "@/lib/constants";
import { Skeleton } from "@/components/common/Skeleton";
import { Target, CheckCircle, Circle, Play, AlertCircle, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface Step {
  id: number;
  title: string;
  description: string;
  api_action: string;
  status: "pending" | "completed";
}

interface Mission {
  id: string;
  title: string;
  target_metric: string;
  target_value: number;
  current_value: number;
  status: "active" | "completed" | "failed" | "abandoned";
  action_plan: Step[];
  start_date: string;
  end_date: string;
  metadata: any;
}

export default function MissionsPage() {
  const router = useRouter();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMissions();
  }, []);

  const fetchMissions = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/missions/${DEMO_MERCHANT_ID}`);
      const data = await res.json();
      setMissions(data.missions || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleStepComplete = async (missionId: string, step: Step) => {
    // Optimistic UI update
    setMissions(prev => prev.map(m => {
      if (m.id === missionId) {
        const newPlan = m.action_plan.map(s => s.id === step.id ? { ...s, status: "completed" as const } : s);
        const completedCount = newPlan.filter(s => s.status === "completed").length;
        const progress = completedCount / newPlan.length;
        return {
          ...m,
          action_plan: newPlan,
          current_value: m.target_value * progress,
          status: completedCount === newPlan.length ? "completed" : "active"
        };
      }
      return m;
    }));

    try {
      await fetch(`${API_BASE_URL}/api/missions/${missionId}/steps/${step.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" })
      });

      // Handle actual routing if there's an API action
      if (step.api_action === "whatsapp_broadcast") router.push("/whatsapp");
      else if (step.api_action === "inventory_reorder") router.push("/inventory");
      else if (step.api_action === "udhari_reminder") router.push("/udhari");
      else if (step.api_action === "create_invoice") router.push("/invoices");

    } catch (e) {
      console.error(e);
      fetchMissions(); // Revert on failure
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-64 mb-6" />
        {[1, 2].map((i) => <Skeleton key={i} className="h-64 w-full rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Target className="w-6 h-6 text-vyapaar-primary" />
          Mission Control
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Execute AI-generated growth plans and track your progress to goal.
        </p>
      </div>

      {missions.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center">
          <Target className="w-12 h-12 text-gray-300 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900">No active missions</h3>
          <p className="text-gray-500 mt-1 mb-4">Go to Opportunities to discover and launch a new Growth Mission.</p>
          <button 
            onClick={() => router.push('/opportunities')}
            className="px-4 py-2 bg-vyapaar-primary text-white font-semibold rounded-xl text-sm"
          >
            Find Opportunities
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {missions.map(mission => {
            const progress = (mission.current_value / (mission.target_value || 1)) * 100;
            const isCompleted = mission.status === "completed";

            return (
              <motion.div 
                key={mission.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-2xl border overflow-hidden ${
                  isCompleted ? "border-emerald-200 shadow-sm" : "border-gray-200 shadow-md"
                }`}
              >
                {/* Mission Header */}
                <div className={`p-5 border-b flex justify-between items-start ${isCompleted ? "bg-emerald-50/50 border-emerald-100" : "border-gray-100"}`}>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        isCompleted ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                      }`}>
                        {mission.status}
                      </span>
                      <span className="text-xs text-gray-500 font-medium">
                        Target: {mission.target_metric.toUpperCase()}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">{mission.title}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {mission.metadata?.scenario?.name || "Custom Scenario"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-1">Expected vs Actual</p>
                    <div className="flex items-end gap-2 justify-end">
                      <span className="text-xl font-black text-emerald-600">{formatINR(mission.current_value)}</span>
                      <span className="text-sm font-medium text-gray-400 mb-0.5">/ {formatINR(mission.target_value)}</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
                  <div className="flex justify-between text-xs mb-1.5 font-medium">
                    <span className="text-gray-600">Mission Progress</span>
                    <span className={isCompleted ? "text-emerald-600 font-bold" : "text-vyapaar-primary font-bold"}>
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <motion.div 
                      className={`h-full ${isCompleted ? 'bg-emerald-500' : 'bg-[#00BAF2]'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                </div>

                {/* Action Plan Steps */}
                <div className="p-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Action Plan</h3>
                  <div className="space-y-3">
                    {mission.action_plan.map((step, idx) => {
                      const isStepDone = step.status === "completed";
                      const isNextToAct = !isStepDone && (idx === 0 || mission.action_plan[idx - 1].status === "completed");

                      return (
                        <div 
                          key={step.id} 
                          className={`flex items-start gap-3 p-3 rounded-xl border ${
                            isStepDone ? "bg-gray-50 border-gray-100 opacity-60" : 
                            isNextToAct ? "bg-blue-50/30 border-blue-100 shadow-sm" : "bg-white border-gray-100"
                          }`}
                        >
                          <button 
                            onClick={() => !isStepDone && handleStepComplete(mission.id, step)}
                            disabled={isStepDone || (!isNextToAct && !isStepDone)}
                            className={`mt-0.5 shrink-0 ${isStepDone ? "text-emerald-500" : isNextToAct ? "text-[#00BAF2] hover:text-blue-700" : "text-gray-300"}`}
                          >
                            {isStepDone ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                          </button>
                          
                          <div className="flex-1">
                            <h4 className={`text-sm font-bold ${isStepDone ? "text-gray-500 line-through" : "text-gray-900"}`}>
                              Step {idx + 1}: {step.title}
                            </h4>
                            <p className="text-xs text-gray-600 mt-1">{step.description}</p>
                          </div>

                          {isNextToAct && (
                            <button
                              onClick={() => handleStepComplete(mission.id, step)}
                              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-[#00BAF2] text-white text-xs font-bold rounded-lg shadow-sm hover:bg-[#00BAF2]/90"
                            >
                              Execute
                              {step.api_action !== 'manual' ? <ArrowRight className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
