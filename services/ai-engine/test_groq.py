import asyncio
from config import get_settings
from groq import AsyncGroq
async def test():
    settings = get_settings()
    print("Model in settings:", settings.groq_model)
    client = AsyncGroq(api_key=settings.groq_api_key)
    try:
        r = await client.chat.completions.create(
            model=settings.groq_model,
            messages=[{"role": "user", "content": "Say hi"}],
            max_tokens=10
        )
        print("Success:", r.choices[0].message.content)
    except Exception as e:
        print("Error:", e)
asyncio.run(test())
