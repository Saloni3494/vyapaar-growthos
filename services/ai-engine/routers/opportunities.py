import logging
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List, Dict, Any

from models import db
from services.agents.opportunity_agent import discover_opportunities

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/{merchant_id}")
async def get_opportunities(merchant_id: str, force_refresh: bool = False, background_tasks: BackgroundTasks = None):
    """
    Get all open opportunities for a merchant.
    If none exist or force_refresh is True, triggers the discovery engine.
    """
    try:
        open_opps = db.select(
            "opportunities", 
            filters={"merchant_id": merchant_id, "status": "open"},
            order_by="created_at",
            order_desc=True
        )
        
        # Sort by priority
        priority_map = {"high": 3, "medium": 2, "low": 1}
        open_opps.sort(key=lambda x: priority_map.get(x.get("priority", "low"), 0), reverse=True)

        # Trigger background refresh if requested or if we have very few opportunities
        if force_refresh or len(open_opps) == 0:
            if background_tasks:
                background_tasks.add_task(discover_opportunities, merchant_id)
            else:
                # Synchronous fallback if background tasks aren't passed (e.g. initial load)
                new_opps = await discover_opportunities(merchant_id)
                if new_opps:
                    open_opps = new_opps
                    open_opps.sort(key=lambda x: priority_map.get(x.get("priority", "low"), 0), reverse=True)
                    
        return {"merchant_id": merchant_id, "opportunities": open_opps}
    except Exception as e:
        logger.error(f"Failed to fetch opportunities: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching opportunities.")

@router.post("/{opportunity_id}/action")
async def action_opportunity(opportunity_id: str, action: str):
    """
    Mark an opportunity as actioned or dismissed.
    action must be 'actioned' or 'dismissed'.
    """
    if action not in ["actioned", "dismissed"]:
        raise HTTPException(status_code=400, detail="Invalid action type. Must be 'actioned' or 'dismissed'.")
        
    try:
        updated = db.update("opportunities", opportunity_id, {"status": action})
        if not updated:
            raise HTTPException(status_code=404, detail="Opportunity not found.")
        return {"status": "success", "opportunity": updated}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update opportunity status: {e}")
        raise HTTPException(status_code=500, detail="Internal server error updating opportunity.")
