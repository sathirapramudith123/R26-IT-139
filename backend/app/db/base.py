from app.core.database import MongoDB

async def init_db():
    await MongoDB.connect()
