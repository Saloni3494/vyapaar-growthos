import asyncio
from config import get_settings
from groq import AsyncGroq
async def test():
    settings = get_settings()
    client = AsyncGroq(api_key=settings.groq_api_key)
    try:
        r = await client.models.list()
        for m in r.data:
            print(m.id)
    except Exception as e:
        print("Error:", e)
asyncio.run(test())
