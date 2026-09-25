import logging
from typing import List, Dict, Any
import json

from models import db
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

def generate_deterministic_scenarios(opportunity: Dict[str, Any]) -> List[Dict[str, Any]]:
    opp_type = opportunity.get("type")
    metadata = opportunity.get("metadata", {})
    breakdown = metadata.get("economic_breakdown", {})
    
    scenarios = []
    
    # Extract base values
    base_revenue = float(breakdown.get("expected_revenue", 0))
    base_profit = float(breakdown.get("expected_profit", 0))
    base_cash = float(breakdown.get("cash_required", 0))
    
    if opp_type == "restock":
        scenarios.append({
            "name": "Conservative",
            "description": "Order 50% of the recommended quantity to preserve cash.",
            "expected_revenue": base_revenue * 0.5,
            "expected_profit": base_profit * 0.5,
            "cash_required": base_cash * 0.5,
            "risk": "Low",
            "inventory_impact": "Prevents immediate stockout but may run out again soon.",
            "customer_response": "Neutral"
        })
        scenarios.append({
            "name": "Recommended",
            "description": "Order the optimal amount based on historical run-rate.",
            "expected_revenue": base_revenue,
            "expected_profit": base_profit,
            "cash_required": base_cash,
            "risk": breakdown.get("risk", "Low"),
            "inventory_impact": "Maintains healthy stock levels for 30 days.",
            "customer_response": "Positive - good availability."
        })
        scenarios.append({
            "name": "Aggressive (Festival Bulk)",
            "description": "Order 200% of recommended quantity with a 5% volume discount assumption.",
            "expected_revenue": base_revenue * 2,
            "expected_profit": (base_revenue * 2) - (base_cash * 2 * 0.95),
            "cash_required": base_cash * 2 * 0.95,
            "risk": "High",
            "inventory_impact": "Overstocks by 100%. Risk of dead stock if demand drops.",
            "customer_response": "Highly Positive - never out of stock."
        })
        
    elif opp_type == "udhar_recovery":
        scenarios.append({
            "name": "Offer 10% Discount",
            "description": "Offer a 10% discount for immediate settlement.",
            "expected_revenue": base_revenue * 0.9,
            "expected_profit": base_profit * 0.9,
            "cash_required": 0,
            "risk": "Low",
            "inventory_impact": "N/A",
            "customer_response": "Highly Positive - incentivized to pay."
        })
        scenarios.append({
            "name": "Standard Reminder",
            "description": "Send a standard polite WhatsApp reminder.",
            "expected_revenue": base_revenue,
            "expected_profit": base_profit,
            "cash_required": 0,
            "risk": breakdown.get("risk", "Medium"),
            "inventory_impact": "N/A",
            "customer_response": "Neutral"
        })
        scenarios.append({
            "name": "Strict Notice",
            "description": "Send a strict reminder warning of halted services.",
            "expected_revenue": base_revenue,
            "expected_profit": base_profit,
            "cash_required": 0,
            "risk": "High",
            "inventory_impact": "N/A",
            "customer_response": "Negative - high risk of customer churn."
        })
        
    elif opp_type == "customer_winback":
        scenarios.append({
            "name": "Soft Reminder",
            "description": "Send a personalized 'we miss you' message without discounts.",
            "expected_revenue": base_revenue * 0.5, # Lower conversion assumption
            "expected_profit": base_profit * 0.5,
            "cash_required": 0,
            "risk": "Low",
            "inventory_impact": "N/A",
            "customer_response": "Neutral"
        })
        scenarios.append({
            "name": "10% Welcome Back Offer",
            "description": "Offer a 10% discount on their next purchase.",
            "expected_revenue": base_revenue,
            "expected_profit": base_profit - (base_revenue * 0.1),
            "cash_required": 0,
            "risk": breakdown.get("risk", "Medium"),
            "inventory_impact": "N/A",
            "customer_response": "Positive - incentivized to return."
        })
        scenarios.append({
            "name": "Free Gift / 25% Off",
            "description": "Offer a 25% discount or free item (loss leader).",
            "expected_revenue": base_revenue * 1.5,
            "expected_profit": (base_profit * 1.5) - (base_revenue * 1.5 * 0.25),
            "cash_required": 0,
            "risk": "High",
            "inventory_impact": "Depletes some stock at low margin.",
            "customer_response": "Highly Positive"
        })
    else:
        scenarios.append({
            "name": "Base Scenario",
            "description": "Proceed with the recommended action.",
            "expected_revenue": base_revenue,
            "expected_profit": base_profit,
            "cash_required": base_cash,
            "risk": breakdown.get("risk", "Medium"),
            "inventory_impact": "N/A",
            "customer_response": "Neutral"
        })

    return scenarios

async def run_growth_simulation(opportunity_id: str) -> Dict[str, Any]:
    """Run deterministic scenarios and LLM reasoning for an opportunity."""
    opps = db.select("opportunities", filters={"id": opportunity_id})
    if not opps:
        return {"error": "Opportunity not found"}
    opp = opps[0]
    
    scenarios = generate_deterministic_scenarios(opp)
    
    try:
        from groq import AsyncGroq
        client = AsyncGroq(api_key=settings.groq_api_key)
        
        prompt = f"""
You are an expert financial advisor for MSMEs.
I am running a Growth Simulator for this opportunity:
Title: {opp.get('title')}
Reason: {opp.get('reason')}

Here are the deterministically calculated scenarios:
{json.dumps(scenarios, indent=2)}

Provide a brief 'trade_off' string (1 sentence) for EACH scenario explaining the pros/cons.
Also provide a 'recommendation' (1-2 sentences) advising which scenario is best.

Return ONLY a JSON object with this exact structure:
{{
  "trade_offs": ["trade-off for scenario 1", "trade-off for scenario 2", "trade-off for scenario 3"],
  "recommendation": "Overall recommendation text."
}}
"""
        response = await client.chat.completions.create(
            model=settings.groq_model,
            messages=[
                {"role": "system", "content": "Return strict JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            max_tokens=500
        )
        
        content = response.choices[0].message.content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
            
        llm_out = json.loads(content.strip())
        
        trade_offs = llm_out.get("trade_offs", [])
        for i, sc in enumerate(scenarios):
            if i < len(trade_offs):
                sc["trade_off"] = trade_offs[i]
            else:
                sc["trade_off"] = "No trade-off analysis available."
                
        recommendation = llm_out.get("recommendation", "Consider your current cash flow before deciding.")
        
    except Exception as e:
        logger.error(f"Error generating simulator LLM reasoning: {e}")
        recommendation = "Consider your current cash flow before deciding."
        for sc in scenarios:
            sc["trade_off"] = "Review the numbers carefully."
            
    return {
        "opportunity_id": opportunity_id,
        "scenarios": scenarios,
        "recommendation": recommendation
    }
