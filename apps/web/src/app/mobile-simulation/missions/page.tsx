"use client";

import React, { useEffect, useState } from "react";
import { Target, CheckCircle2, Circle, Loader2, Play } from "lucide-react";
import { useRouter } from "next/navigation";

const DEMO_MERCHANT_ID = "11111111-1111-1111-1111-111111111111";
const API_BASE_URL = "http://localhost:8000";

export default function MobileMissions() {
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchMissions();
  }, []);

  const fetchMissions = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/missions/${DEMO_MERCHANT_ID}`);
      const data = await res.json();
      setMissions(data.missions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStepComplete = async (missionId: string, step: any) => {
    try {
      // Check Policy Gateway
      const evalRes = await fetch(`${API_BASE_URL}/api/policies/${DEMO_MERCHANT_ID}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_type: step.api_action,
          title: step.title,
          description: step.description,
          payload: {
            amount: missionId === 'dummy' ? 6000 : 0,
            mission_id: missionId,
            step_id: step.id
          }
        })
      });

      const evalData = await evalRes.json();
      if (evalData.status === "pending_approval") {
        alert("Policy Gateway Blocked: Action requires your manual approval.");
        router.push("/mobile-simulation/approvals");
        return;
      }

      // Optimistic Update
      setMissions(prev => prev.map(m => {
        if (m.id === missionId) {
          const newPlan = m.action_plan.map((s: any) => s.id === step.id ? { ...s, status: "completed" } : s);
          const completedCount = newPlan.filter((s: any) => s.status === "completed").length;
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

      await fetch(`${API_BASE_URL}/api/missions/${missionId}/steps/${step.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" })
      });

      // Show temporary alert mimicking routing for the mobile simulation, 
      // or actually route if those mobile pages existed. 
      // Since they don't, we'll just show a success alert to complete the UX loop.
      alert(`Action '${step.api_action}' executed successfully via Agent!`);

    } catch (err) {
      console.error(err);
      alert("Failed to execute step");
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 pb-20">
      <div className="bg-white px-5 py-4 sticky top-0 z-10 shadow-sm border-b border-gray-100 flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <Target className="w-5 h-5 text-[#00BAF2]" />
          Growth Missions
        </h1>
      </div>

      <div className="p-4 space-y-5">
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 text-[#00BAF2] animate-spin" /></div>
        ) : missions.length === 0 ? (
          <div className="text-center p-8 text-gray-500">No active missions.</div>
        ) : (
          missions.map((mission) => {
            const completedSteps = mission.action_plan.filter((s: any) => s.status === "completed").length;
            const progress = (completedSteps / mission.action_plan.length) * 100;

            return (
              <div key={mission.id} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${mission.status === 'active' ? 'bg-blue-50 text-[#00BAF2]' : 'bg-green-50 text-green-600'
                    }`}>
                    {mission.status}
                  </span>
                  <div className="text-right">
                    <span className="text-[9px] text-gray-400 font-bold uppercase block">Target {mission.target_metric}</span>
                    <span className="text-xs font-extrabold text-green-600">₹{Math.round(mission.current_value)} <span className="text-gray-400 font-medium">/ ₹{mission.target_value}</span></span>
                  </div>
                </div>

                <h3 className="font-bold text-slate-900 mb-4 leading-tight">{mission.title}</h3>

                {/* Progress Bar */}
                <div className="mb-5">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                    <span>Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#00BAF2] to-blue-600 transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                {/* Steps */}
                <div className="space-y-3">
                  {mission.action_plan.map((step: any, index: number) => {
                    const isCompleted = step.status === "completed";
                    return (
                      <div key={step.id} className={`p-3 rounded-2xl border ${isCompleted ? 'bg-gray-50 border-gray-100' : 'bg-white border-blue-50 shadow-sm'}`}>
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {isCompleted ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                              <Circle className="w-5 h-5 text-gray-300" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className={`text-sm font-bold ${isCompleted ? 'text-gray-500 line-through' : 'text-slate-900'}`}>
                              Step {index + 1}: {step.title}
                            </h4>
                            <p className="text-[10px] text-gray-500 mt-1 leading-tight">{step.description}</p>

                            {!isCompleted && (
                              <button
                                onClick={() => handleStepComplete(mission.id, step)}
                                className="mt-3 bg-[#00BAF2] text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform w-full"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                Execute Action
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
