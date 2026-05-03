import asyncio

from app.core.database import MongoDB


async def migrate_inventory_items():
    collection = MongoDB.get_database()["inventory_items"]

    result_1 = await collection.update_many(
        {"supplier_name": {"$exists": False}},
        {"$set": {"supplier_name": "Unknown Supplier"}},
    )

    result_2 = await collection.update_many(
        {"unit": {"$exists": False}},
        {"$set": {"unit": "unit"}},
    )

    print("Migration completed.")
    print(f"Updated supplier_name on {result_1.modified_count} documents.")
    print(f"Updated unit on {result_2.modified_count} documents.")


if __name__ == "__main__":
    asyncio.run(migrate_inventory_items())