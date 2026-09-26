import logging
from fastapi import APIRouter
from services.agents.memory_agent import get_memories, extract_memories

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/{merchant_id}")
async def list_memories(merchant_id: str):
    return {"memories": get_memories(merchant_id)}

@router.post("/{merchant_id}/extract")
async def trigger_extraction(merchant_id: str):
    new_memories = await extract_memories(merchant_id)
    return {"success": True, "new_memories_count": len(new_memories), "new_memories": new_memories}
