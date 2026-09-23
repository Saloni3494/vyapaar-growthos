import re

with open('apps/web/src/app/(dashboard)/payscore/page.tsx', 'r') as f:
    content = f.read()

# Add useEffect and fetch
content = content.replace('import { useState, useMemo } from "react";', 'import { useState, useMemo, useEffect } from "react";\n\nconst DEMO_MERCHANT_ID = "11111111-1111-1111-1111-111111111111";\nconst API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";')

# Add RefreshCw to lucide imports
content = content.replace('  Calculator,\n} from "lucide-react";', '  Calculator,\n  RefreshCw,\n} from "lucide-react";')

# Remove hardcoded constants that we will replace
# We will leave IMPROVEMENT_TIPS, BADGES, MILESTONES
content = re.sub(r'const CURRENT_SCORE = 72;\n\nconst SCORE_CATEGORIES: ScoreCategory\[\] = \[.*?\];\n\nconst SCORE_HISTORY = \[.*?\];\n', '', content, flags=re.DOTALL)

# Update PayScorePage
new_component = '''
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
    }));
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
      </div>'''

content = re.sub(r'export default function PayScorePage\(\) \{.*?<div className="px-4 pt-4 space-y-5 w-full pb-8">\s*\{/\* Header \*/\}\s*<div>\s*<h1 className="text-xl font-bold text-vyapaar-primary-dark">PayScore</h1>\s*<p className="text-sm text-vyapaar-text-secondary">\s*Aapki business health ka AI score\s*</p>\s*</div>', new_component, content, flags=re.DOTALL)

with open('apps/web/src/app/(dashboard)/payscore/page.tsx', 'w') as f:
    f.write(content)
