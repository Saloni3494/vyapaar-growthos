"use client";

import React, { useEffect, useState } from "react";
import { Zap, Activity, Brain, ArrowRight, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";

const DEMO_MERCHANT_ID = "11111111-1111-1111-1111-111111111111";
const API_BASE_URL = "http://localhost:8000";

interface Opportunity {
  id: string;
  type: string;
  title: string;
  reason: string;
  priority: "high" | "medium" | "low";
  estimated_impact: number;
  confidence: number;
  status: string;
  metadata: any;
}

export default function MobileOpportunities() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simulationData, setSimulationData] = useState<any>(null);
  const [launchingMission, setLaunchingMission] = useState<number | null>(null);
  const router = useRouter();

  const fetchOpportunities = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/opportunities/${DEMO_MERCHANT_ID}`);
      const data = await res.json();
      setOpportunities(data.opportunities.filter((o:any) => o.status === 'open'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/opportunities/${DEMO_MERCHANT_ID}?force_refresh=true`);
      const data = await res.json();
      setOpportunities(data.opportunities?.filter((o:any) => o.status === 'open') || []);
    } catch (err) {
      console.error(err);
    } finally {
      setScanning(false);
    }
  };

  const handleSimulate = async (opp: Opportunity) => {
    setSelectedOpp(opp);
    setSimulating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/simulator/opportunities/${opp.id}`);
      const data = await res.json();
      setSimulationData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  const handleLaunchMission = async (scenario: any, index: number) => {
    if (!selectedOpp) return;
    try {
      setLaunchingMission(index);
      await fetch(`${API_BASE_URL}/api/missions/from-opportunity/${selectedOpp.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
      });
      router.push("/mobile-simulation/missions");
    } catch (err) {
      console.error(err);
    } finally {
      setLaunchingMission(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white px-5 py-4 sticky top-0 z-10 shadow-sm flex items-center justify-between border-b border-gray-100">
        <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#00BAF2]" />
          Opportunities
        </h1>
        <button 
          onClick={handleScan}
          disabled={scanning}
          className="bg-blue-50 text-[#00BAF2] px-3 py-1.5 rounded-full text-xs font-bold border border-blue-100 flex items-center gap-1 active:scale-95 transition-transform"
        >
          {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
          Scan
        </button>
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 text-[#00BAF2] animate-spin" /></div>
        ) : opportunities.length === 0 ? (
          <div className="text-center p-8 text-gray-500">No open opportunities found.</div>
        ) : (
          opportunities.map((opp) => (
            <div key={opp.id} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  opp.priority === 'high' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600'
                }`}>
                  {opp.priority} Priority
                </span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  <Brain className="w-3 h-3" /> {opp.confidence}% Match
                </span>
              </div>
              
              <h3 className="font-bold text-slate-900 mb-1 leading-tight">{opp.title}</h3>
              <p className="text-xs text-slate-500 mb-4 line-clamp-2">{opp.reason}</p>
              
              <div className="bg-slate-50 rounded-2xl p-3 mb-4 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] text-slate-400 font-medium uppercase">Expected Profit</p>
                  <p className="font-bold text-green-600">₹{opp.estimated_impact}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium uppercase">Cash Required</p>
                  <p className="font-bold text-slate-700">₹{opp.metadata.economics?.cash_required || 0}</p>
                </div>
              </div>

              <button 
                onClick={() => handleSimulate(opp)}
                className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <Activity className="w-4 h-4" />
                Simulate Outcomes
              </button>
            </div>
          ))
        )}
      </div>

      {/* Simulator Bottom Sheet Overlay */}
      {selectedOpp && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedOpp(null)} />
          <div className="relative bg-white rounded-t-[40px] w-full max-h-[85%] flex flex-col shadow-2xl">
            
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-lg text-slate-900 leading-tight">Growth Simulator</h2>
                <p className="text-[10px] text-slate-500 font-medium">Running counterfactuals</p>
              </div>
              <button onClick={() => setSelectedOpp(null)} className="p-2 bg-gray-50 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto pb-24">
              {simulating ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-[#00BAF2]" />
                  <p className="text-xs font-bold animate-pulse">Running ML simulations...</p>
                </div>
              ) : simulationData ? (
                <div className="space-y-4">
                  {simulationData.scenarios.map((scenario: any, i: number) => (
                    <div key={i} className={`rounded-3xl p-4 border-2 ${scenario.name === 'Recommended' ? 'border-[#00BAF2] bg-blue-50/30' : 'border-gray-100 bg-white'}`}>
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-sm text-slate-900">{scenario.name}</h4>
                        {scenario.name === 'Recommended' && (
                          <span className="text-[10px] font-bold bg-[#00BAF2] text-white px-2 py-0.5 rounded-full">Best ROI</span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 text-center">
                          <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Profit</p>
                          <p className="text-xs font-extrabold text-green-600">₹{scenario.expected_profit}</p>
                        </div>
                        <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 text-center">
                          <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Risk</p>
                          <p className="text-xs font-extrabold text-slate-700">{scenario.risk || "Medium"}</p>
                        </div>
                        <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 text-center">
                          <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Win Rate</p>
                          <p className="text-xs font-extrabold text-[#00BAF2]">
                            {scenario.risk === 'Low' ? '92' : scenario.risk === 'High' ? '65' : '80'}%
                          </p>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleLaunchMission(scenario, i)}
                        disabled={launchingMission === i}
                        className={`w-full py-3 rounded-xl font-bold text-xs flex justify-center items-center gap-2 active:scale-95 transition-transform ${
                          scenario.name === 'Recommended' ? 'bg-[#00BAF2] text-white shadow-md' : 'bg-slate-900 text-white'
                        }`}
                      >
                        {launchingMission === i ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                        Convert to Mission
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
