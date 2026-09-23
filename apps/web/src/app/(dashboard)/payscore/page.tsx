"use client";

import { useState, useMemo, useEffect } from "react";

const DEMO_MERCHANT_ID = "11111111-1111-1111-1111-111111111111";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
import { motion } from "framer-motion";
import { formatINR } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { PayScoreGauge } from "@/components/dashboard/PayScoreGauge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Zap,
  Target,
  Star,
  Shield,
  BadgeCheck,
  Rocket,
  Lightbulb,
  Calculator,
  RefreshCw,
} from "lucide-react";

// ---------- Types ----------
interface ScoreCategory {
  label: string;
  labelHindi: string;
  score: number;
  maxScore: 100;
  features: { name: string; value: string; impact: string }[];
}

// ---------- Demo Data ----------

const MILESTONES = [
  { score: 0, grade: "F", label: "Start" },
  { score: 40, grade: "D", label: "Basic" },
  { score: 60, grade: "C", label: "Healthy" },
  { score: 70, grade: "B", label: "Fast Growing" },
  { score: 80, grade: "A", label: "Growth Ready" },
];

const BADGES = [
  { label: "Healthy", minScore: 60, icon: Shield, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  { label: "Fast Growing", minScore: 70, icon: Rocket, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
  { label: "Growth Ready", minScore: 80, icon: BadgeCheck, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
];

const IMPROVEMENT_TIPS = [
  { text: "3 aur customers ko UPI pe laao", impact: "+5 points", progress: 40, icon: Target },
  { text: "Next month GST time pe file karo", impact: "+3 points", progress: 83, icon: Zap },
  { text: "Udhari Rs 50K neeche laao", impact: "+4 points", progress: 25, icon: TrendingDown },
  { text: "Rozana expenses voice se daalo", impact: "+1 point", progress: 70, icon: Lightbulb },
  { text: "Doosra bank account link karo", impact: "+3 points", progress: 0, icon: Star },
];

function getScoreColor(score: number): string {
  if (score >= 80) return "#22C55E";
  if (score >= 60) return "#00BAF2";
  if (score >= 40) return "#F59E0B";
  return "#EF4444";
}

function getScoreGrade(score: number): string {
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  if (score >= 20) return "D";
  return "F";
}

function getBarColor(score: number): string {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 50) return "bg-blue-500";
  if (score >= 30) return "bg-amber-500";
  return "bg-red-500";
}


export default function PayScorePage() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [scoreData, setScoreData] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);

  const fetchScore = async () => {
    try {
      const [scoreRes, histRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/payscore/${DEMO_MERCHANT_ID}`),
        fetch(`${API_BASE_URL}/api/payscore/${DEMO_MERCHANT_ID}/history`),
      ]);
      const sData = await scoreRes.json();
      const hData = await histRes.json();
      
      setScoreData(sData);
      
      if (hData.entries && hData.entries.length > 0) {
        const mapped = hData.entries.map((e: any) => {
          const d = new Date(e.calculated_at);
          return {
            month: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            score: e.score,
          };
        });
        setHistoryData(mapped);
      } else {
        setHistoryData([{ month: "Now", score: sData.score || 50 }]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScore();
  }, []);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await fetch(`${API_BASE_URL}/api/payscore/${DEMO_MERCHANT_ID}/recalculate`, {
        method: "POST"
      });
      await fetchScore();
    } catch (e) {
      console.error(e);
    } finally {
      setRecalculating(false);
    }
  };

  const CURRENT_SCORE = scoreData?.score || 0;

  const SCORE_CATEGORIES = useMemo(() => {
    if (!scoreData?.factors) return [];
    return scoreData.factors.map((f: any) => ({
      label: f.name,
      labelHindi: f.label,
      score: Math.round((f.score / f.max) * 100),
      maxScore: 100,
      features: [
        { name: "Score Details", value: f.note, impact: f.score >= f.max * 0.8 ? "Good" : "Average" }
      ]
    })) as ScoreCategory[];
  }, [scoreData]);

  const trend = useMemo(() => {
    if (historyData.length < 2) return "Stable";
    const recent = historyData.slice(-3);
    const diff = recent[recent.length - 1].score - recent[0].score;
    if (diff > 3) return "Improving";
    if (diff < -3) return "Declining";
    return "Stable";
  }, [historyData]);

  const nextMilestone = MILESTONES.find((m) => m.score > CURRENT_SCORE);
  const pointsNeeded = nextMilestone ? nextMilestone.score - CURRENT_SCORE : 0;

  if (loading) return <div className="p-8 text-center text-gray-500">Loading PayScore...</div>;

  return (
    <div className="px-4 pt-4 space-y-5 w-full pb-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-vyapaar-primary-dark">PayScore</h1>
          <p className="text-sm text-vyapaar-text-secondary">
            Aapki business health ka AI score
          </p>
        </div>
        <button 
          onClick={handleRecalculate}
          disabled={recalculating}
          className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 disabled:opacity-50"
        >
          <RefreshCw className={cn("w-4 h-4", recalculating && "animate-spin")} />
          Recalculate
        </button>
      </div>

      {/* ===== A. Score Display + B. Score Breakdown (side by side on desktop) ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-[#002E6E] to-[#0052B4] rounded-2xl p-6 text-white text-center"
      >
        <PayScoreGauge score={CURRENT_SCORE} size="lg" showLabel={false} className="mx-auto" />
        <div className="mt-3">
          <span
            className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full"
            style={{
              backgroundColor: `${getScoreColor(CURRENT_SCORE)}30`,
              color: getScoreColor(CURRENT_SCORE),
            }}
          >
            <Award className="w-4 h-4" />
            Grade {getScoreGrade(CURRENT_SCORE)}
          </span>
        </div>
        {nextMilestone && (
          <p className="text-sm text-blue-200 mt-3">
            {pointsNeeded} points se{" "}
            <span className="font-bold text-white">
              {nextMilestone.label}
            </span>{" "}
            status unlock hoga!
          </p>
        )}
      </motion.div>

      {/* ===== B. Score Breakdown ===== */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
      >
        <h3 className="font-semibold text-gray-900 mb-4">Score Breakdown</h3>
        <div className="space-y-3">
          {SCORE_CATEGORIES.map((cat: ScoreCategory) => {
            const isExpanded = expandedCategory === cat.label;
            return (
              <div key={cat.label}>
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : cat.label)}
                  className="w-full"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{cat.label}</span>
                      <span className="text-[10px] text-gray-400">({cat.labelHindi})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-xs font-bold",
                        cat.score >= 75 ? "text-emerald-600" : cat.score >= 50 ? "text-blue-600" : "text-red-600"
                      )}>
                        {cat.score}/100
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                      )}
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${cat.score}%` }}
                      transition={{ duration: 0.8, delay: 0.1 }}
                      className={cn("h-full rounded-full", getBarColor(cat.score))}
                    />
                  </div>
                </button>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-2 ml-2 space-y-1.5"
                  >
                    {cat.features.map((f, j) => (
                      <div key={j} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                        <span className="text-gray-600">{f.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{f.value}</span>
                          <span className={cn(
                            "text-[10px] font-medium px-1.5 py-0.5 rounded-md",
                            f.impact === "Good" ? "bg-emerald-50 text-emerald-600" :
                            f.impact === "Average" ? "bg-amber-50 text-amber-600" :
                            "bg-red-50 text-red-600"
                          )}>
                            {f.impact}
                          </span>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>
      </div>

      {/* ===== C. Milestones & D. Tips (side by side on desktop) ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
      >
        <h3 className="font-semibold text-gray-900 mb-4">Milestones</h3>

        {/* Progress line */}
        <div className="relative mb-6">
          <div className="h-2 bg-gray-100 rounded-full">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${CURRENT_SCORE}%` }}
              transition={{ duration: 1, delay: 0.2 }}
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full relative"
            >
              {/* Animated current position dot */}
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute -right-2 -top-1.5 w-5 h-5 bg-white border-3 border-blue-500 rounded-full shadow-md"
                style={{ borderWidth: 3, borderColor: getScoreColor(CURRENT_SCORE) }}
              />
            </motion.div>
          </div>

          {/* Milestone markers */}
          <div className="flex justify-between mt-3">
            {MILESTONES.map((m) => (
              <div
                key={m.score}
                className={cn(
                  "flex flex-col items-center",
                  CURRENT_SCORE >= m.score ? "opacity-100" : "opacity-40"
                )}
                style={{ position: "relative" }}
              >
                <span className={cn(
                  "text-[10px] font-bold",
                  CURRENT_SCORE >= m.score ? "text-gray-900" : "text-gray-400"
                )}>
                  {m.score}
                </span>
                <span className={cn(
                  "text-[9px]",
                  CURRENT_SCORE >= m.score ? "text-gray-600" : "text-gray-400"
                )}>
                  {m.grade}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Badges */}
        <div className="space-y-2">
          {BADGES.map((badge) => {
            const earned = CURRENT_SCORE >= badge.minScore;
            const Icon = badge.icon;
            return (
              <div
                key={badge.label}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl border",
                  earned ? `${badge.bg} ${badge.border}` : "bg-gray-50 border-gray-200 opacity-50"
                )}
              >
                <Icon className={cn("w-5 h-5", earned ? badge.color : "text-gray-400")} />
                <div className="flex-1">
                  <span className={cn("text-sm font-semibold", earned ? badge.color : "text-gray-400")}>
                    {badge.label}
                  </span>
                  <span className="text-[10px] text-gray-400 ml-2">({badge.minScore}+ score)</span>
                </div>
                {earned ? (
                  <span className="text-xs font-bold text-emerald-600">Earned</span>
                ) : (
                  <span className="text-xs text-gray-400">{badge.minScore - CURRENT_SCORE} pts away</span>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ===== D. Improvement Tips ===== */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-gray-900">Score Badhao Tips</h3>
        </div>
        <div className="space-y-3">
          {IMPROVEMENT_TIPS.map((tip, i) => {
            const Icon = tip.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.05 }}
                className="bg-gray-50 rounded-xl p-3"
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                    <Icon className="w-4 h-4 text-vyapaar-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{tip.text}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs font-bold text-emerald-600">{tip.impact}</span>
                      <span className="text-[10px] text-gray-400">{tip.progress}% done</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${tip.progress}%` }}
                        transition={{ duration: 0.6, delay: 0.3 + i * 0.05 }}
                        className="h-full bg-emerald-400 rounded-full"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
      </div>



      {/* ===== F. Score History Chart ===== */}
      <div className="grid grid-cols-1 gap-5">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Score History</h3>
          <div className={cn(
            "flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full",
            trend === "Improving" ? "bg-emerald-50 text-emerald-600" :
            trend === "Declining" ? "bg-red-50 text-red-600" :
            "bg-gray-50 text-gray-600"
          )}>
            {trend === "Improving" ? <TrendingUp className="w-3.5 h-3.5" /> :
             trend === "Declining" ? <TrendingDown className="w-3.5 h-3.5" /> :
             <Minus className="w-3.5 h-3.5" />}
            {trend}
          </div>
        </div>

        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis domain={[40, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => `${value}`}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#00BAF2"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#00BAF2", stroke: "#fff", strokeWidth: 2 }}
                activeDot={{ r: 6, fill: "#002E6E" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-500">
          <span>
            6 mahine ka trend:{" "}
            <span className={cn(
              "font-bold",
              trend === "Improving" ? "text-emerald-600" : trend === "Declining" ? "text-red-600" : "text-gray-700"
            )}>
              +{historyData.length >= 2 ? historyData[historyData.length - 1].score - historyData[0].score : 0} points
            </span>
          </span>
        </div>
      </motion.div>
      </div>
    </div>
  );
}
