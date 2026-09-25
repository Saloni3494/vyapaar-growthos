import logging
from typing import List, Dict, Any
import json
from datetime import datetime, timedelta

from models import db
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

async def create_mission_from_opportunity(opportunity_id: str, scenario: Dict[str, Any]) -> Dict[str, Any]:
    opps = db.select("opportunities", filters={"id": opportunity_id})
    if not opps:
        return {"error": "Opportunity not found"}
    opp = opps[0]
    merchant_id = opp["merchant_id"]
    
    try:
        from groq import AsyncGroq
        client = AsyncGroq(api_key=settings.groq_api_key)
        
        prompt = f"""
You are an elite business strategist for MSMEs.
Your goal is to convert this opportunity and selected scenario into an actionable "Growth Mission".

Opportunity: {opp.get('title')} ({opp.get('reason')})
Scenario Chosen: {scenario.get('name')}
Expected Profit: {scenario.get('expected_profit')}
Expected Revenue: {scenario.get('expected_revenue')}

Create exactly 5 logical, sequential steps for the merchant to execute this mission.
For each step, specify an 'api_action' if it maps to existing modules:
- 'whatsapp_broadcast' (for reaching out to customers)
- 'inventory_reorder' (for adding stock)
- 'udhari_reminder' (for collecting money)
- 'create_invoice' (for billing)
- 'manual' (if it requires physical action in store)

Return ONLY a JSON object:
{{
  "title": "A highly motivating mission title (e.g., 'Operation Weekend Boost')",
  "target_metric": "profit",
  "target_value": {scenario.get('expected_profit', 0)},
  "steps": [
    {{ "id": 1, "title": "Step title", "description": "Details", "api_action": "manual", "status": "pending" }}
  ]
}}
"""
        response = await client.chat.completions.create(
            model=settings.groq_model,
            messages=[
                {"role": "system", "content": "Return strict JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            max_tokens=800
        )
        
        content = response.choices[0].message.content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
            
        mission_data = json.loads(content.strip())
        
        # Save to DB
        end_date = datetime.now() + timedelta(days=7) # 1 week sprint
        
        mission_record = {
            "merchant_id": merchant_id,
            "opportunity_id": opportunity_id,
            "title": mission_data.get("title", "Growth Mission"),
            "target_metric": mission_data.get("target_metric", "profit"),
            "target_value": float(mission_data.get("target_value", 0)),
            "current_value": 0.0,
            "status": "active",
            "action_plan": mission_data.get("steps", []),
            "end_date": end_date.isoformat(),
            "metadata": {
                "scenario": scenario
            }
        }
        
        inserted = db.insert("growth_missions", mission_record)
        
        # Mark opportunity as actioned
        db.update("opportunities", opportunity_id, {"status": "actioned"})
        
        return inserted
        
    except Exception as e:
        logger.error(f"Error creating mission: {e}")
        return {"error": "Failed to create mission"}

def get_missions(merchant_id: str) -> List[Dict[str, Any]]:
    return db.select("growth_missions", filters={"merchant_id": merchant_id}, order_by="created_at", order_desc=True)

def update_mission_step(mission_id: str, step_id: int, status: str) -> Dict[str, Any]:
    missions = db.select("growth_missions", filters={"id": mission_id})
    if not missions:
        return {"error": "Mission not found"}
    
    mission = missions[0]
    steps = mission.get("action_plan", [])
    
    completed_steps = 0
    for step in steps:
        if step.get("id") == step_id:
            step["status"] = status
        if step.get("status") == "completed":
            completed_steps += 1
            
    # Auto-update progress (mocking progress based on steps completed)
    progress_pct = completed_steps / max(1, len(steps))
    target_value = float(mission.get("target_value", 0))
    current_value = target_value * progress_pct
    
    mission_status = "active"
    if completed_steps == len(steps):
        mission_status = "completed"
        current_value = target_value
        
    updated = db.update("growth_missions", mission_id, {
        "action_plan": steps,
        "current_value": current_value,
        "status": mission_status
    })
    
    return updated or {"error": "Update failed"}
