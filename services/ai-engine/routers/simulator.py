import logging
from fastapi import APIRouter, HTTPException
from services.agents.simulator_agent import run_growth_simulation

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/opportunities/{opportunity_id}")
async def simulate_opportunity(opportunity_id: str):
    """
    Run the Growth Simulator for a specific opportunity.
    Returns calculated scenarios (Conservative, Recommended, Aggressive) and LLM trade-offs.
    """
    try:
        result = await run_growth_simulation(opportunity_id)
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to run simulation: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
