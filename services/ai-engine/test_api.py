import asyncio, httpx
from config import get_settings
async def test():
    s = get_settings()
    url = 'https://api.groq.com/openai/v1/chat/completions'
    headers = {'Authorization': f'Bearer {s.groq_api_key}', 'Content-Type': 'application/json'}
    payload = {
        'model': s.groq_model,
        'messages': [{'role': 'system', 'content': 'Respond ONLY with valid JSON. Example: {"a": 1}'}, {'role': 'user', 'content': 'test'}],
        'response_format': {'type': 'json_object'}
    }
    async with httpx.AsyncClient() as c:
        r = await c.post(url, headers=headers, json=payload)
        print(r.status_code, r.text)
asyncio.run(test())
