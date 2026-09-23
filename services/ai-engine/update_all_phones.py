from models import db
db.get_client().table("customers").update({"phone": "+918261983331"}).eq("merchant_id", "11111111-1111-1111-1111-111111111111").execute()
print("Updated all customers to +918261983331")
