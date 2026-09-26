import logging
from typing import Dict, Any, List
from datetime import datetime, date, timedelta

from models import db

logger = logging.getLogger(__name__)

async def register_action_impact(merchant_id: str, action_type: str, payload: Dict[str, Any]) -> None:
    """
    Called when an action executes. Captures the baseline metric.
    """
    title = payload.get("description") or f"Agentic Action: {action_type}"
    metric_name = "revenue"
    baseline_rate = 0.0
    attribution = "before_vs_after"
    confidence = "low"
    status = "tracking"
    
    try:
        today = date.today()
        seven_days_ago = today - timedelta(days=7)
        
        if action_type in ["whatsapp_broadcast", "create_invoice"]:
            metric_name = "revenue"
            summaries = db.select("daily_summary", filters={"merchant_id": merchant_id})
            recent_revenue = []
            for s in summaries:
                try:
                    s_date = date.fromisoformat(s.get("date", ""))
                    if seven_days_ago <= s_date <= today:
                        recent_revenue.append(float(s.get("total_income", 0)))
                except Exception:
                    pass
            
            if recent_revenue:
                baseline_rate = sum(recent_revenue) / len(recent_revenue)
                confidence = "medium"
            else:
                status = "insufficient_data"
                
        elif action_type == "udhari_reminder":
            metric_name = "udhari_collected"
            summaries = db.select("daily_summary", filters={"merchant_id": merchant_id})
            recent_collections = []
            for s in summaries:
                try:
                    s_date = date.fromisoformat(s.get("date", ""))
                    if seven_days_ago <= s_date <= today:
                        recent_collections.append(float(s.get("udhari_collected", 0)))
                except Exception:
                    pass
            if recent_collections:
                baseline_rate = sum(recent_collections) / len(recent_collections)
                confidence = "medium"
            else:
                baseline_rate = 0.0
                
        elif action_type == "inventory_reorder":
            metric_name = "inventory_cost"
            baseline_rate = 0.0
            confidence = "high"
            attribution = "deterministic"
            
        db.insert("impact_measurements", {
            "merchant_id": merchant_id,
            "action_type": action_type,
            "title": title,
            "metric_name": metric_name,
            "baseline_rate": baseline_rate,
            "actual_value": 0.0,
            "incremental_value": 0.0,
            "attribution_method": attribution,
            "confidence": confidence,
            "status": status,
            "metadata": payload
        })
    except Exception as e:
        logger.error(f"Error registering impact tracking: {e}")

def calculate_impacts(merchant_id: str) -> List[Dict[str, Any]]:
    """
    Fetch all active measurements and calculate the incremental impact up to now.
    """
    measurements = db.select("impact_measurements", filters={"merchant_id": merchant_id}, order_by="created_at", order_desc=True)
    today = date.today()
    
    updated_measurements = []
    
    for m in measurements:
        if m.get("status") == "insufficient_data":
            updated_measurements.append(m)
            continue
            
        created_at_str = m.get("created_at", "")
        try:
            created_date = datetime.fromisoformat(created_at_str.replace("Z", "+00:00")).date()
        except:
            created_date = today
            
        days_passed = (today - created_date).days
        if days_passed < 0:
            days_passed = 0
            
        pacing_days = max(1, days_passed)
        
        baseline_rate = float(m.get("baseline_rate", 0))
        metric_name = m.get("metric_name")
        actual_value = 0.0
        
        summaries = db.select("daily_summary", filters={"merchant_id": merchant_id})
        
        for s in summaries:
            try:
                s_date = date.fromisoformat(s.get("date", ""))
                if created_date <= s_date <= today:
                    if metric_name == "revenue":
                        actual_value += float(s.get("total_income", 0))
                    elif metric_name == "udhari_collected":
                        actual_value += float(s.get("udhari_collected", 0))
            except Exception:
                pass
                
        if m.get("attribution_method") == "deterministic":
            if m.get("action_type") == "inventory_reorder":
                actual_value = float(m.get("metadata", {}).get("amount", 0))
                incremental_value = actual_value
            else:
                incremental_value = actual_value
        else:
            expected_value = baseline_rate * pacing_days
            incremental_value = actual_value - expected_value
            
        if days_passed == 0 and incremental_value < 0:
            incremental_value = 0.0
            
        db.update("impact_measurements", m["id"], {
            "actual_value": actual_value,
            "incremental_value": incremental_value
        })
        
        m["actual_value"] = actual_value
        m["incremental_value"] = incremental_value
        m["days_active"] = days_passed
        updated_measurements.append(m)
        
    return updated_measurements
