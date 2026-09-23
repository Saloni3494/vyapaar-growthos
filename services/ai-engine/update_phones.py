from models import db

merchant_id = "11111111-1111-1111-1111-111111111111"
phone = "+918261983331"

udharis = db.select("udhari", filters={"merchant_id": merchant_id})
print(f"Total udharis: {len(udharis)}")
if udharis:
    for u in udharis[:5]:
        print(f"ID: {u['id']}, Status: {u['status']}, Phone: {u.get('debtor_phone')}")
        db.update("udhari", u["id"], {"debtor_phone": phone, "status": "pending"})
print("Updated up to 5 udharis to pending and " + phone)
