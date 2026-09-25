import logging
from typing import List, Dict, Any
from datetime import datetime, date, timedelta
import json

from models import db
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

def get_deterministic_facts(merchant_id: str) -> Dict[str, Any]:
    """Calculate deterministic business metrics for the merchant."""
    facts = {}
    today = date.today().isoformat()
    thirty_days_ago = (date.today() - timedelta(days=30)).isoformat()
    
    # 1. Udhari Data
    udharis = db.get_merchant_udharis(merchant_id, status="pending")
    overdue_udharis = [u for u in udharis if u.get("status") == "overdue"]
    
    facts["udhari"] = {
        "total_pending_amount": sum((u.get("remaining") or 0) for u in udharis),
        "overdue_count": len(overdue_udharis),
        "overdue_amount": sum((u.get("remaining") or 0) for u in overdue_udharis),
        "top_overdue_debtors": sorted(
            [{"name": u.get("debtor_name"), "amount": u.get("remaining")} for u in overdue_udharis],
            key=lambda x: (x["amount"] or 0), reverse=True
        )[:3]
    }
    
    # 2. Inventory Data
    try:
        inventory = db.select("inventory", filters={"merchant_id": merchant_id})
        low_stock = [i for i in inventory if (i.get("current_qty") or 0) <= (i.get("reorder_level") or 0)]
        dead_stock = [i for i in inventory if (i.get("current_qty") or 0) > 0 and (i.get("updated_at") or "") < thirty_days_ago] # Simple heuristic for dead stock
        
        facts["inventory"] = {
            "low_stock_items": [{"name": i.get("item_name"), "qty": i.get("current_qty")} for i in low_stock][:5],
            "dead_stock_items": [{"name": i.get("item_name"), "qty": i.get("current_qty"), "value": float((i.get("current_qty") or 0) * (i.get("cost_price") or 0))} for i in dead_stock][:3]
        }
    except Exception as e:
        logger.warning(f"Failed to fetch inventory facts: {e}")
        facts["inventory"] = {"low_stock_items": [], "dead_stock_items": []}

    # 3. Customer Churn Data
    try:
        customers = db.select("customers", filters={"merchant_id": merchant_id})
        churn_risk_customers = [c for c in customers if c.get("churn_risk") in ["high", "medium"]]
        dormant_customers = [c for c in customers if (c.get("days_since_last_visit") or 0) > 30 and (c.get("total_visits") or 0) > 1]
        
        facts["customers"] = {
            "churn_risk_count": len(churn_risk_customers),
            "dormant_high_value": sorted(
                [{"name": c.get("name"), "spent": c.get("total_spent", 0)} for c in dormant_customers],
                key=lambda x: (x["spent"] or 0), reverse=True
            )[:3]
        }
    except Exception as e:
        logger.warning(f"Failed to fetch customer facts: {e}")
        facts["customers"] = {"churn_risk_count": 0, "dormant_high_value": []}
        
    return facts


async def discover_opportunities(merchant_id: str) -> List[Dict[str, Any]]:
    """
    Run the Opportunity Discovery Engine.
    1. Fetch deterministic facts.
    2. Use Groq to analyze facts and suggest opportunities.
    3. Deduplicate and persist to DB.
    """
    facts = get_deterministic_facts(merchant_id)
    
    # Check if we have enough data to generate opportunities
    has_data = any(
        bool(facts.get(k, {}).get("top_overdue_debtors")) or 
        bool(facts.get(k, {}).get("low_stock_items")) or 
        bool(facts.get(k, {}).get("dormant_high_value"))
        for k in facts
    )
    
    if not has_data:
        logger.info(f"Not enough data to generate opportunities for {merchant_id}")
        return []

    try:
        from groq import AsyncGroq
        client = AsyncGroq(api_key=settings.groq_api_key)
        
        prompt = f"""
You are an expert retail business analyst for Indian MSMEs (like textile/kirana shops).
Based on the following factual data for a merchant, identify 1-3 highly actionable business opportunities.

Factual Data:
{json.dumps(facts, indent=2)}

Generate opportunities in the following JSON format ONLY:
[
  {{
    "type": "udhar_recovery" | "restock" | "dead_stock_bundle" | "customer_winback" | "cross_sell",
    "title": "Short catchy title in English/Hinglish",
    "reason": "Why is this an opportunity? Mention specific numbers from the facts.",
    "priority": "high" | "medium" | "low",
    "estimated_impact": <number representing potential revenue/savings in Rs>,
    "confidence": <integer 0-100>,
    "action_type": "remind_udhari" | "order_stock" | "send_broadcast" | "create_bundle",
    "recommended_action": "What should the merchant do?"
  }}
]

Important Rules:
- Output ONLY valid JSON array. Do not include markdown formatting like ```json.
- Do not hallucinate numbers; only use the numbers provided in the facts.
- If there is overdue udhari, ALWAYS suggest udhar_recovery with high priority.
- Keep the title and reason concise.
"""
        response = await client.chat.completions.create(
            model=settings.groq_model,
            messages=[
                {"role": "system", "content": "You are a helpful business analyst returning strict JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            max_tokens=1000
        )
        
        content = response.choices[0].message.content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
            
        opportunities = json.loads(content.strip())
        
        # Validate and structure
        valid_opps = []
        for opp in opportunities:
            if all(k in opp for k in ["type", "title", "reason", "priority", "estimated_impact"]):
                opp["merchant_id"] = merchant_id
                opp["status"] = "open"
                valid_opps.append(opp)
                
        # Deduplicate and Persist
        saved_opps = _deduplicate_and_save(merchant_id, valid_opps)
        return saved_opps
        
    except Exception as e:
        logger.error(f"Error generating opportunities: {e}")
        return []

def _deduplicate_and_save(merchant_id: str, new_opps: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Save new opportunities, avoiding duplicates of the same type that are already open."""
    try:
        existing = db.select("opportunities", filters={"merchant_id": merchant_id, "status": "open"})
        existing_types = {e["type"]: e["id"] for e in existing}
        
        saved = []
        for opp in new_opps:
            opp_type = opp["type"]
            if opp_type in existing_types:
                # Update existing opportunity
                opp_id = existing_types[opp_type]
                db.update("opportunities", opp_id, {
                    "title": opp["title"],
                    "reason": opp["reason"],
                    "priority": opp["priority"],
                    "estimated_impact": opp["estimated_impact"],
                    "confidence": opp.get("confidence", 80),
                    "action_type": opp.get("action_type"),
                    "recommended_action": opp.get("recommended_action")
                })
                opp["id"] = opp_id
                saved.append(opp)
            else:
                # Insert new opportunity
                inserted = db.insert("opportunities", opp)
                saved.append(inserted)
        
        return saved
    except Exception as e:
        logger.error(f"Database error saving opportunities: {e}")
        return []
