import logging
from fastapi import APIRouter
from services.agents.impact_agent import calculate_impacts

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/{merchant_id}")
async def fetch_impacts(merchant_id: str):
    """
    Fetch calculated incremental impacts for all tracked actions.
    """
    return {"measurements": calculate_impacts(merchant_id)}
