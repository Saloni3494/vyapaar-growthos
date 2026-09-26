import logging
from typing import Dict, Any, List
from datetime import datetime

from models import db

logger = logging.getLogger(__name__)

def get_policy(merchant_id: str) -> Dict[str, Any]:
    policies = db.select("merchant_policies", filters={"merchant_id": merchant_id})
    if policies:
        return policies[0]
    # Default policy
    return {
        "merchant_id": merchant_id,
        "autonomy_level": "approve",
        "max_auto_spend": 1000.0,
        "require_approval_high_risk": True,
        "allow_whatsapp_auto": False
    }

def update_policy(merchant_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    updates["merchant_id"] = merchant_id
    db.upsert("merchant_policies", updates)
    return get_policy(merchant_id)

def evaluate_action(merchant_id: str, action_type: str, title: str, description: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Evaluates an action against the merchant's policy gateway.
    Returns {"status": "executed"} or {"status": "pending_approval", "approval_id": ...}
    """
    policy = get_policy(merchant_id)
    autonomy = policy.get("autonomy_level", "approve")
    
    requires_approval = False
    reason = []
    
    if autonomy == "suggest":
        requires_approval = True
        reason.append("Autonomy dial is set to 'Suggest' (always ask).")
    elif autonomy == "approve":
        requires_approval = True
        reason.append("Autonomy dial is set to 'Approve' (always ask).")
    else:
        # Check specific constraints for 'auto'
        spend = float(payload.get("amount", 0))
        max_spend = float(policy.get("max_auto_spend", 1000))
        if spend > max_spend:
            requires_approval = True
            reason.append(f"Spend limit exceeded: ₹{spend} > ₹{max_spend}.")
            
        is_high_risk = payload.get("risk") == "High"
        if is_high_risk and policy.get("require_approval_high_risk", True):
            requires_approval = True
            reason.append("Action is flagged as High Risk.")
            
        if action_type == "whatsapp_broadcast" and not policy.get("allow_whatsapp_auto", False):
            requires_approval = True
            reason.append("WhatsApp auto-broadcasts are disabled.")

    if requires_approval:
        req = {
            "merchant_id": merchant_id,
            "action_type": action_type,
            "title": title,
            "description": description + f"\n\nGateway Flag: {' '.join(reason)}",
            "payload": payload,
            "status": "pending"
        }
        inserted = db.insert("approval_requests", req)
        return {"status": "pending_approval", "approval": inserted}
    else:
        # Simulate execution
        return {"status": "executed", "message": "Action auto-executed under policy limits."}

def get_approvals(merchant_id: str, status: str = None) -> List[Dict[str, Any]]:
    filters = {"merchant_id": merchant_id}
    if status:
        filters["status"] = status
    return db.select("approval_requests", filters=filters, order_by="created_at", order_desc=True)

async def decide_approval(approval_id: str, decision: str) -> Dict[str, Any]:
    req = db.select("approval_requests", filters={"id": approval_id})
    if not req:
        return {"error": "Not found"}
    req = req[0]
    
    db.update("approval_requests", approval_id, {
        "status": decision,
        "resolved_at": datetime.now().isoformat()
    })
    
    if decision == "approved":
        from services.agents.action_agent import execute_approved_action
        result = await execute_approved_action(req["merchant_id"], req["action_type"], req["payload"])
        # Log verification audit
        db.update("approval_requests", approval_id, {
            "description": req["description"] + f"\n\n[AUDIT LOG] Execution Verification:\n{result}"
        })
        
        # If this was part of a mission, mark the step as completed
        mission_id = req["payload"].get("mission_id")
        step_id = req["payload"].get("step_id")
        if mission_id and step_id:
            from services.agents.mission_agent import update_mission_step
            update_mission_step(mission_id, step_id, "completed")
        
    return db.select("approval_requests", filters={"id": approval_id})[0]
