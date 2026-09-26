import logging
from typing import Dict, Any, List
import json

from config import get_settings
from models import db

logger = logging.getLogger(__name__)

async def extract_memories(merchant_id: str) -> List[Dict[str, Any]]:
    """
    Extracts memories by scanning impact_measurements and using Groq to deduce insights.
    Only learns from actual recorded outcomes.
    """
    from groq import AsyncGroq
    settings = get_settings()
    client = AsyncGroq(api_key=settings.groq_api_key)
    
    measurements = db.select("impact_measurements", filters={"merchant_id": merchant_id})
    
    if not measurements:
        return []
        
    prompt = f"""
    You are the Growth Memory engine for a merchant. Analyze the following actual recorded impact measurements of past actions, and extract concise, generalized business insights (memories) for this merchant.
    
    Data (Measurements):
    {json.dumps(measurements, default=str)}
    
    If incremental_value is positive, conclude what worked. If 0 or negative, conclude what didn't work.
    
    Return a JSON array of objects with the exact schema:
    [
      {{
        "category": "string (e.g. campaign_response, inventory, channel_preference)",
        "insight": "string (1-sentence actionable insight)",
        "evidence": "string (brief explanation based strictly on the provided data)",
        "confidence": "string (high, medium, or low based on actual_value magnitude)"
      }}
    ]
    
    CRITICAL: Only output the raw JSON array. Do not fabricate insights not supported by the data.
    """
    
    try:
        response = await client.chat.completions.create(
            model=settings.groq_model,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        extracted_text = response.choices[0].message.content
        extracted_data = json.loads(extracted_text)
        
        # Depending on how the prompt is structured, Groq might return {"memories": [...]} or just the list
        if isinstance(extracted_data, dict) and "memories" in extracted_data:
            extracted = extracted_data["memories"]
        elif isinstance(extracted_data, dict):
            extracted = [extracted_data]
        else:
            extracted = extracted_data
            
        if not extracted or not isinstance(extracted, list):
            return []
            
        saved_memories = []
        for mem in extracted:
            existing = db.select("growth_memory", filters={"merchant_id": merchant_id, "insight": mem.get("insight")})
            if not existing:
                row = {
                    "merchant_id": merchant_id,
                    "category": mem.get("category", "general"),
                    "insight": mem.get("insight"),
                    "evidence": mem.get("evidence"),
                    "confidence": mem.get("confidence", "medium")
                }
                inserted = db.insert("growth_memory", row)
                saved_memories.append(inserted)
                
        return saved_memories
    except Exception as e:
        logger.error(f"Failed to extract memories: {e}")
        return []

def get_memories(merchant_id: str) -> List[Dict[str, Any]]:
    """Retrieve all memories for context injection."""
    return db.select("growth_memory", filters={"merchant_id": merchant_id}, order_by="created_at", order_desc=True)

def generate_memory_context(merchant_id: str) -> str:
    """Format memories as a text block to inject into prompts."""
    memories = get_memories(merchant_id)
    if not memories:
        return "No historical memories found."
        
    context_lines = []
    for m in memories:
        context_lines.append(f"- [{m.get('category').upper()}] (Confidence: {m.get('confidence')}): {m.get('insight')} (Evidence: {m.get('evidence')})")
        
    return "\n".join(context_lines)
