from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

class MongoDB:
    client: AsyncIOMotorClient | None = None

    @classmethod
    async def connect(cls):
        if cls.client is None:
            cls.client = AsyncIOMotorClient(
                settings.mongodb_url,
                tlsAllowInvalidCertificates=True,
                serverSelectionTimeoutMS=5000,
            )
            await cls.client.admin.command("ping")
            print("MongoDB connected successfully")

    @classmethod
    def get_database(cls):
        if cls.client is None:
            raise RuntimeError("MongoDB is not connected. Call connect_db() first.")
        return cls.client[settings.mongodb_db]

    @classmethod
    async def close(cls):
        if cls.client is not None:
            cls.client.close()
            cls.client = None

async def connect_db():
    await MongoDB.connect()

async def close_db():
    await MongoDB.close()

def get_database():
    return MongoDB.get_database()

def get_db():
    return MongoDB.get_database()