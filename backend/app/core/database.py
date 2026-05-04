from pymongo import AsyncMongoClient
from app.core.config import settings

class MongoDB:
    client: AsyncMongoClient | None = None

    @classmethod
    async def connect(cls):
        if cls.client is None:
            cls.client = AsyncMongoClient(settings.mongodb_url)
            await cls.client.admin.command("ping")
            print("MongoDB connected successfully")

    @classmethod
    def get_database(cls):
        if cls.client is None:
            raise RuntimeError("MongoDB is not connected")
        return cls.client[settings.mongodb_db]

    @classmethod
    async def close(cls):
        if cls.client is not None:
            await cls.client.close()
            cls.client = None
