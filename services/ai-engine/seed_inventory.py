import asyncio
import httpx
from datetime import datetime

async def seed():
    merchant_id = "11111111-1111-1111-1111-111111111111"
    
    items = [
        {
            "merchant_id": merchant_id,
            "item_name": "Parle G 100g",
            "category": "Snacks",
            "current_qty": 50,
            "unit": "pkts",
            "cost_price": 4.5,
            "selling_price": 5.0,
            "reorder_level": 10
        },
        {
            "merchant_id": merchant_id,
            "item_name": "Amul Taaza Milk 500ml",
            "category": "Dairy",
            "current_qty": 15,
            "unit": "pkts",
            "cost_price": 25.0,
            "selling_price": 27.0,
            "reorder_level": 20  # This one should trigger low stock!
        },
        {
            "merchant_id": merchant_id,
            "item_name": "Maggi 2-Min Noodles",
            "category": "Snacks",
            "current_qty": 8,
            "unit": "pkts",
            "cost_price": 12.0,
            "selling_price": 14.0,
            "reorder_level": 15  # Low stock!
        },
        {
            "merchant_id": merchant_id,
            "item_name": "Tata Salt 1kg",
            "category": "Groceries",
            "current_qty": 0,
            "unit": "pkts",
            "cost_price": 24.0,
            "selling_price": 28.0,
            "reorder_level": 5  # Out of stock!
        }
    ]
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        for item in items:
            res = await client.post("http://127.0.0.1:8000/api/inventory/", json=item)
            if res.status_code == 200:
                print(f"Created {item['item_name']}")
            else:
                print(f"Error creating {item['item_name']}: {res.text}")

if __name__ == "__main__":
    asyncio.run(seed())
