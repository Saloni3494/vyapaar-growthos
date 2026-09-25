import logging
from typing import List, Dict, Any
from datetime import datetime, date, timedelta
import json

from models import db
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

def generate_deterministic_opportunities(merchant_id: str) -> List[Dict[str, Any]]:
    """Generate opportunities deterministically based on business rules and economics."""
    opps = []
    today = date.today()
    
    # 1. Udhar Recovery
    try:
        udharis = db.get_merchant_udharis(merchant_id, status="pending")
        for u in udharis:
            if u.get("status") == "overdue":
                amount = u.get("remaining") or 0
                due_date_str = u.get("due_date")
                
                days_overdue = 15
                if due_date_str:
                    try:
                        days_overdue = (today - date.fromisoformat(due_date_str[:10])).days
                    except:
                        pass
                        
                risk_score = min(100, days_overdue * 2)
                risk_level = "High" if risk_score > 60 else "Medium" if risk_score > 30 else "Low"
                
                opps.append({
                    "type": "udhar_recovery",
                    "priority": "high" if amount > 1000 else "medium",
                    "estimated_impact": float(amount),
                    "confidence": max(10, 100 - risk_score),
                    "economic_breakdown": {
                        "expected_revenue": float(amount),
                        "expected_profit": float(amount),
                        "cash_required": 0.0,
                        "risk": risk_level,
                        "evidence": f"Customer {u.get('debtor_name')} owes Rs {amount}, overdue by {days_overdue} days.",
                        "assumptions": "Full amount is recoverable directly improving cash position."
                    }
                })
    except Exception as e:
        logger.warning(f"Error generating udhari opps: {e}")

    # 2. Restock Low Inventory
    try:
        inventory = db.select("inventory", filters={"merchant_id": merchant_id})
        for item in inventory:
            curr = item.get("current_qty") or 0
            reorder = item.get("reorder_level") or 0
            if curr <= reorder:
                cost_price = item.get("cost_price") or 0
                selling_price = item.get("selling_price") or 0
                qty_to_order = max(10, reorder * 2 - curr)
                
                cash_req = qty_to_order * cost_price
                rev = qty_to_order * selling_price
                profit = rev - cash_req
                
                if profit > 0:
                    opps.append({
                        "type": "restock",
                        "priority": "high" if curr == 0 else "medium",
                        "estimated_impact": float(profit),
                        "confidence": 85,
                        "economic_breakdown": {
                            "expected_revenue": float(rev),
                            "expected_profit": float(profit),
                            "cash_required": float(cash_req),
                            "risk": "Low",
                            "evidence": f"Stock for {item.get('item_name')} is critically low ({curr} left).",
                            "assumptions": f"Restocking {qty_to_order} units will meet expected demand based on historical run-rate."
                        }
                    })
    except Exception as e:
        logger.warning(f"Error generating inventory opps: {e}")

    # 3. Customer Winback
    try:
        customers = db.select("customers", filters={"merchant_id": merchant_id})
        for c in customers:
            days_since = c.get("days_since_last_visit") or 0
            visits = c.get("total_visits") or 0
            if days_since > 30 and visits > 1:
                total_spent = c.get("total_spent") or 0
                avg_order = c.get("average_order_value") or (total_spent / max(1, visits))
                
                opps.append({
                    "type": "customer_winback",
                    "priority": "medium",
                    "estimated_impact": float(avg_order),
                    "confidence": 70,
                    "economic_breakdown": {
                        "expected_revenue": float(avg_order),
                        "expected_profit": float(avg_order * 0.2), # Assume 20% margin
                        "cash_required": 0.0,
                        "risk": "Medium",
                        "evidence": f"Loyal customer {c.get('name')} hasn't visited in {days_since} days.",
                        "assumptions": f"A targeted WhatsApp offer has a 30% chance to bring them back for an expected purchase of Rs {avg_order:.2f}."
                    }
                })
    except Exception as e:
        logger.warning(f"Error generating customer opps: {e}")

    # Sort and pick top 5
    opps.sort(key=lambda x: x["estimated_impact"], reverse=True)
    return opps[:5]


async def discover_opportunities(merchant_id: str) -> List[Dict[str, Any]]:
    """
    Run the Economic Opportunity Discovery Engine.
    1. Generate opportunities deterministically with economic breakdowns.
    2. Use Groq to add contextual reasoning/explanation.
    3. Deduplicate and persist to DB.
    """
    deterministic_opps = generate_deterministic_opportunities(merchant_id)
    
    if not deterministic_opps:
        logger.info(f"Not enough data to generate opportunities for {merchant_id}")
        return []

    try:
        from groq import AsyncGroq
        client = AsyncGroq(api_key=settings.groq_api_key)
        
        prompt = f"""
You are an expert retail business analyst for Indian MSMEs. 
I have deterministically calculated the economics for these highly actionable opportunities:

{json.dumps(deterministic_opps, indent=2)}

For each opportunity in the list, add the following presentation fields:
- "title": A short catchy title in English/Hinglish.
- "reason": A persuasive explanation of WHY they should do this, referencing the evidence and the expected profit.
- "action_type": Choose one of "remind_udhari" | "order_stock" | "send_broadcast" | "create_bundle"
- "recommended_action": What exact action should the merchant take? (e.g., "Send WhatsApp Reminder")

Return ONLY a JSON array of objects. The objects must include ALL the original fields from the input (including the full 'economic_breakdown') PLUS your 4 new fields.
Do not output anything outside of the JSON array.
"""
        response = await client.chat.completions.create(
            model=settings.groq_model,
            messages=[
                {"role": "system", "content": "You are a helpful business analyst returning strict JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            max_tokens=2000
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
            if all(k in opp for k in ["type", "title", "reason", "priority", "estimated_impact", "economic_breakdown"]):
                db_opp = {
                    "merchant_id": merchant_id,
                    "type": opp["type"],
                    "title": opp["title"],
                    "reason": opp["reason"],
                    "priority": opp["priority"],
                    "estimated_impact": opp["estimated_impact"],
                    "confidence": opp.get("confidence", 80),
                    "action_type": opp.get("action_type"),
                    "recommended_action": opp.get("recommended_action"),
                    "status": "open",
                    "metadata": {
                        "economic_breakdown": opp["economic_breakdown"]
                    }
                }
                valid_opps.append(db_opp)
                
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
                    "recommended_action": opp.get("recommended_action"),
                    "metadata": opp.get("metadata", {})
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
