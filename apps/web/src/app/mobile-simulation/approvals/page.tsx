"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, Sliders, CheckCircle2, XCircle, Loader2, Check } from "lucide-react";

const DEMO_MERCHANT_ID = "11111111-1111-1111-1111-111111111111";
const API_BASE_URL = "http://localhost:8000";

export default function MobileApprovals() {
  const [policy, setPolicy] = useState<any>(null);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [polRes, appRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/policies/${DEMO_MERCHANT_ID}`),
        fetch(`${API_BASE_URL}/api/policies/${DEMO_MERCHANT_ID}/approvals`)
      ]);
      const polData = await polRes.json();
      const appData = await appRes.json();
      setPolicy(polData);
      setApprovals(appData.approvals || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSavePolicy = async (updates: any) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/policies/${DEMO_MERCHANT_ID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      const newPol = await res.json();
      setPolicy(newPol);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDecide = async (approvalId: string, decision: "approved" | "rejected") => {
    try {
      await fetch(`${API_BASE_URL}/api/policies/approvals/${approvalId}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision })
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading || !policy) {
    return <div className="flex justify-center p-20"><Loader2 className="w-8 h-8 text-[#00BAF2] animate-spin" /></div>;
  }

  const pendingApprovals = approvals.filter(a => a.status === 'pending');

  return (
    <div className="flex flex-col h-full bg-gray-50 pb-20">
      <div className="bg-white px-5 py-4 sticky top-0 z-10 shadow-sm border-b border-gray-100 flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#00BAF2]" />
          Autonomy & Policies
        </h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Autonomy Dial */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Sliders className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900">Vyapaar AI Autonomy</h2>
          </div>

          <div className="space-y-3">
            {(['suggest', 'approve', 'auto'] as const).map(level => {
              const isActive = policy.autonomy_level === level;
              return (
                <button
                  key={level}
                  onClick={() => handleSavePolicy({ autonomy_level: level })}
                  className={`w-full p-3 rounded-2xl border-2 text-left transition-all flex items-center justify-between ${isActive ? 'border-[#00BAF2] bg-blue-50/30' : 'border-gray-100 bg-white'
                    }`}
                >
                  <div>
                    <p className={`font-bold capitalize text-sm ${isActive ? 'text-[#00BAF2]' : 'text-slate-700'}`}>
                      {level}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {level === 'suggest' && "Ideas only. No actions prepared."}
                      {level === 'approve' && "Prepares actions for 1-click approval."}
                      {level === 'auto' && "Executes autonomously within limits."}
                    </p>
                  </div>
                  {isActive && <Check className="w-5 h-5 text-[#00BAF2]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Pending Approvals */}
        <div>
          <h2 className="text-sm font-bold text-slate-900 mb-3 px-2">Pending Approvals ({pendingApprovals.length})</h2>
          <div className="space-y-4">
            {pendingApprovals.length === 0 ? (
              <div className="text-center p-8 bg-white rounded-3xl border border-gray-100 text-gray-500 text-xs font-medium">
                You're all caught up!
              </div>
            ) : (
              pendingApprovals.map(req => (
                <div key={req.id} className="bg-white rounded-3xl p-5 shadow-sm border border-yellow-100 relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-1 bg-yellow-400" />

                  <div className="flex justify-between items-start mb-3">
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                      {req.action_type.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">Just now</span>
                  </div>

                  <h3 className="font-bold text-slate-900 mb-1 leading-tight">{req.title}</h3>
                  <p className="text-xs text-slate-500 mb-4 whitespace-pre-wrap">{req.description}</p>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleDecide(req.id, 'rejected')}
                      className="flex-1 bg-gray-50 text-slate-600 font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                    <button
                      onClick={() => handleDecide(req.id, 'approved')}
                      className="flex-1 bg-[#00BAF2] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-md"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
