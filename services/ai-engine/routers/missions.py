import logging
from fastapi import APIRouter, HTTPException, Request
from typing import Dict, Any
from services.agents.mission_agent import create_mission_from_opportunity, get_missions, update_mission_step

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/from-opportunity/{opportunity_id}")
async def create_mission(opportunity_id: str, request: Request):
    try:
        body = await request.json()
        scenario = body.get("scenario")
        if not scenario:
            raise HTTPException(status_code=400, detail="Scenario is required")
            
        result = await create_mission_from_opportunity(opportunity_id, scenario)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create mission: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{merchant_id}")
async def fetch_missions(merchant_id: str):
    try:
        return {"missions": get_missions(merchant_id)}
    except Exception as e:
        logger.error(f"Failed to fetch missions: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.patch("/{mission_id}/steps/{step_id}")
async def update_step(mission_id: str, step_id: int, request: Request):
    try:
        body = await request.json()
        status = body.get("status")
        if not status:
            raise HTTPException(status_code=400, detail="Status is required")
            
        result = update_mission_step(mission_id, step_id, status)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update step: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
