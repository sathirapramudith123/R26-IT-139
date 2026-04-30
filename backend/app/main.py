from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.database import MongoDB
from app.core.middleware import register_middleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    await MongoDB.connect()
    yield
    await MongoDB.close()


app = FastAPI(title=settings.app_name, lifespan=lifespan)

register_middleware(app)


@app.get("/")
async def root():
    return {"service": settings.app_name, "status": "ok"}


@app.get("/health/db")
async def db_health():
    try:
        await MongoDB.client.admin.command("ping")
        return {"database": "connected"}
    except Exception as exc:
        return {"database": "failed", "error": str(exc)}


app.include_router(api_router, prefix=settings.api_v1_prefix)