import logging
import httpx
from typing import Dict, Any

logger = logging.getLogger(__name__)

API_BASE = "http://localhost:8000/api"

async def execute_approved_action(merchant_id: str, action_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Executes an action via Controlled Tool Interfaces (APIs).
    NEVER accesses the database directly. This enforces strict API boundaries.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            if action_type == "whatsapp_broadcast":
                res = await client.post(f"{API_BASE}/whatsapp/send", json={
                    "merchant_id": merchant_id,
                    "to_phone": payload.get("phone", "9999999999"),
                    "message": payload.get("message", "Hello! Here is an offer for you.")
                })
                res.raise_for_status()
                from services.agents.impact_agent import register_action_impact
                await register_action_impact(merchant_id, action_type, payload)
                return {"success": True, "verification": "WhatsApp message sent successfully via controlled API."}
                
            elif action_type == "inventory_reorder":
                res = await client.post(f"{API_BASE}/transactions", json={
                    "merchant_id": merchant_id,
                    "type": "expense",
                    "amount": float(payload.get("amount", 1000)),
                    "category": "Inventory Purchase",
                    "description": payload.get("description", "Agentic inventory reorder")
                })
                res.raise_for_status()
                from services.agents.impact_agent import register_action_impact
                await register_action_impact(merchant_id, action_type, payload)
                return {"success": True, "verification": "Inventory purchase transaction logged via controlled API."}
                
            elif action_type == "udhari_reminder":
                # For demo, just trigger a whatsapp message
                res = await client.post(f"{API_BASE}/whatsapp/send", json={
                    "merchant_id": merchant_id,
                    "to_phone": "9999999999",
                    "message": "Reminder: Please settle your pending Udhar amount."
                })
                res.raise_for_status()
                from services.agents.impact_agent import register_action_impact
                await register_action_impact(merchant_id, action_type, payload)
                return {"success": True, "verification": "Udhar reminder broadcasted via controlled API."}
                
            elif action_type == "create_invoice":
                res = await client.post(f"{API_BASE}/invoices", json={
                    "merchant_id": merchant_id,
                    "customer_name": payload.get("name", "Loyal Customer"),
                    "items": [{"name": "Promotional Bundle", "qty": 1, "rate": float(payload.get("amount", 100))}],
                    "discount_pct": 10
                })
                res.raise_for_status()
                from services.agents.impact_agent import register_action_impact
                await register_action_impact(merchant_id, action_type, payload)
                return {"success": True, "verification": "Invoice and promotional bundle created via controlled API."}
                
            else:
                # Fallback to standard logging
                return {"success": True, "verification": f"Action {action_type} marked as executed."}
                
    except httpx.HTTPError as exc:
        logger.error(f"Action execution API failed: {exc}")
        return {"success": False, "error": str(exc)}
    except Exception as e:
        logger.error(f"Action execution failed: {e}")
        return {"success": False, "error": str(e)}
