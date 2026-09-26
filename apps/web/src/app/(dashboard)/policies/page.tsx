"use client";

import { useState, useEffect } from "react";
import { formatINR, DEMO_MERCHANT_ID, API_BASE_URL } from "@/lib/constants";
import { Skeleton } from "@/components/common/Skeleton";
import { ShieldCheck, Sliders, CheckCircle2, XCircle, AlertTriangle, MessageSquare, Package, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface Policy {
  merchant_id: string;
  autonomy_level: "suggest" | "approve" | "auto";
  max_auto_spend: number;
  require_approval_high_risk: boolean;
  allow_whatsapp_auto: boolean;
}

interface ApprovalRequest {
  id: string;
  action_type: string;
  title: string;
  description: string;
  payload: any;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export default function PoliciesPage() {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

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

  const handleSavePolicy = async (updates: Partial<Policy>) => {
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE_URL}/api/policies/${DEMO_MERCHANT_ID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      const newPol = await res.json();
      setPolicy(newPol);
    } catch (e) {
      console.error(e);
      alert("Failed to update policy");
    } finally {
      setSaving(false);
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
    return (
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-64 mb-6" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const pendingCount = approvals.filter(a => a.status === 'pending').length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-vyapaar-primary" />
          Policy Gateway & Approvals
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Set guardrails for AI agents and review actions requiring your manual approval.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Policy Settings */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
            <Sliders className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-bold text-gray-900">Autonomy Dial</h2>
          </div>
          
          <div className="p-5 space-y-6">
            {/* Level Selector */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-700">Muneem AI Autonomy Level</label>
              <div className="grid grid-cols-3 gap-3">
                {(['suggest', 'approve', 'auto'] as const).map(level => {
                  const isActive = policy.autonomy_level === level;
                  return (
                    <button
                      key={level}
                      onClick={() => handleSavePolicy({ autonomy_level: level })}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        isActive 
                        ? 'border-[#00BAF2] bg-blue-50/30 ring-4 ring-blue-50' 
                        : 'border-gray-100 hover:border-gray-200 bg-white'
                      }`}
                    >
                      <p className={`font-bold capitalize text-sm ${isActive ? 'text-[#00BAF2]' : 'text-gray-700'}`}>
                        {level}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-1 leading-tight">
                        {level === 'suggest' && "Just gives ideas. You do the work."}
                        {level === 'approve' && "Prepares actions for your 1-click approval."}
                        {level === 'auto' && "Executes actions automatically within limits."}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Granular Limits (Only visible if Auto or Approve) */}
            <div className={`space-y-4 pt-4 border-t border-gray-100 transition-opacity ${policy.autonomy_level === 'suggest' ? 'opacity-40 pointer-events-none' : ''}`}>
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-1">Max Auto-Spend Limit</label>
                <p className="text-xs text-gray-500 mb-2">Transactions above this will always require approval.</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
                  <input 
                    type="number" 
                    className="w-full pl-8 pr-4 py-2 border-2 border-gray-200 rounded-xl focus:border-[#00BAF2] focus:ring-0 outline-none text-sm font-bold text-gray-900"
                    value={policy.max_auto_spend}
                    onChange={(e) => handleSavePolicy({ max_auto_spend: Number(e.target.value) })}
                    onBlur={(e) => handleSavePolicy({ max_auto_spend: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-bold text-gray-700 block">Require Approval for High Risk</label>
                  <p className="text-xs text-gray-500">Block risky actions (e.g. strict collection notices).</p>
                </div>
                <button 
                  onClick={() => handleSavePolicy({ require_approval_high_risk: !policy.require_approval_high_risk })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${policy.require_approval_high_risk ? 'bg-[#00BAF2]' : 'bg-gray-200'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${policy.require_approval_high_risk ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-bold text-gray-700 block">Allow WhatsApp Auto-Broadcast</label>
                  <p className="text-xs text-gray-500">Let AI message customers automatically.</p>
                </div>
                <button 
                  onClick={() => handleSavePolicy({ allow_whatsapp_auto: !policy.allow_whatsapp_auto })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${policy.allow_whatsapp_auto ? 'bg-[#00BAF2]' : 'bg-gray-200'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${policy.allow_whatsapp_auto ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
            
            {saving && <p className="text-xs text-[#00BAF2] font-medium animate-pulse text-center">Saving policies...</p>}
          </div>
        </div>

        {/* Right Column - Approvals Inbox */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col h-[600px]">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-gray-900">Pending Approvals</h2>
            </div>
            {pendingCount > 0 && (
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-md">
                {pendingCount} req
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            {approvals.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <CheckCircle2 className="w-12 h-12 mb-2 text-emerald-200" />
                <p className="font-medium text-gray-600">All caught up!</p>
                <p className="text-sm">No pending approvals.</p>
              </div>
            ) : (
              approvals.map(req => (
                <div key={req.id} className={`bg-white border rounded-xl p-4 transition-all ${
                  req.status === 'pending' ? 'border-amber-200 shadow-sm' : 'border-gray-100 opacity-60'
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {req.action_type === 'whatsapp_broadcast' ? <MessageSquare className="w-4 h-4 text-[#00BAF2]" /> : <Package className="w-4 h-4 text-emerald-500" />}
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        {req.action_type.replace('_', ' ')}
                      </span>
                    </div>
                    {req.status === 'pending' && <span className="flex h-2 w-2 rounded-full bg-amber-500" />}
                    {req.status === 'approved' && <span className="text-xs font-bold text-emerald-600">Approved</span>}
                    {req.status === 'rejected' && <span className="text-xs font-bold text-red-600">Rejected</span>}
                  </div>
                  
                  <h3 className={`font-bold text-sm ${req.status !== 'pending' && 'line-through text-gray-500'}`}>{req.title}</h3>
                  <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{req.description}</p>
                  
                  {req.payload?.amount > 0 && (
                    <p className="mt-2 text-sm font-black text-gray-900">
                      Spend: {formatINR(req.payload.amount)}
                    </p>
                  )}

                  {req.status === 'pending' && (
                    <div className="mt-4 flex gap-2">
                      <button 
                        onClick={() => handleDecide(req.id, "approved")}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button 
                        onClick={() => handleDecide(req.id, "rejected")}
                        className="flex-1 bg-white border border-gray-200 text-red-600 hover:bg-red-50 text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
