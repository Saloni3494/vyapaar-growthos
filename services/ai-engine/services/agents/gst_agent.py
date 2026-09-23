import json
import logging
import httpx

from config import get_settings

logger = logging.getLogger(__name__)

async def auto_classify_transaction(txn: dict) -> dict:
    """
    Classify a transaction/item to get HSN code and GST rate via LLM.
    Expects txn dict with 'category' or 'description'.
    Returns a dict with 'hsn_code' (str) and 'gst_rate' (float).
    """
    settings = get_settings()
    
    item_name = txn.get("category", "") or txn.get("description", "Unknown Item")

    prompt = (
        f"You are a GST classification expert for India. "
        f"Given the item name '{item_name}', determine its most likely 4-digit or 6-digit HSN code "
        f"and the standard applicable GST rate in India (usually 0, 5, 12, 18, or 28).\n"
        f"For example, biscuits like Parle G usually fall under 1905 with 18% GST (if standard) or 5% depending on type. "
        f"Just provide your best estimate.\n"
        f"Respond ONLY in valid JSON format with exactly two keys: 'hsn_code' (string) and 'gst_rate' (number)."
    )

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.groq_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.groq_model,
        "messages": [
            {"role": "system", "content": "You are a helpful JSON-only output assistant."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.1,
        "response_format": {"type": "json_object"},
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
        
        if resp.status_code == 200:
            raw = resp.json()["choices"][0]["message"]["content"]
            data = json.loads(raw)
            return {
                "hsn_code": str(data.get("hsn_code", "9999")),
                "gst_rate": float(data.get("gst_rate", 18.0)),
            }
        else:
            logger.error("Groq API error in GST classification: %s", resp.text)
    except Exception as e:
        logger.exception("Failed to classify transaction: %s", e)

    # Fallback if API fails
    return {"hsn_code": "9999", "gst_rate": 18.0}
