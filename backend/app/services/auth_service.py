from fastapi import HTTPException
from app.core.security import hash_password, verify_password, create_access_token
from app.models.user_model import User
from app.repositories.user_repository import UserRepository

class AuthService:
    def __init__(self):
        self.repository = UserRepository()

    async def register(self, full_name: str, email: str, password: str):
        existing = await self.repository.find_by_email(email)
        if existing:
            raise HTTPException(status_code=400, detail="User already exists")
        user = User(full_name=full_name, email=email, password_hash=hash_password(password))
        created = await self.repository.create(user.model_dump())
        token = create_access_token({"sub": created["email"], "user_id": created["id"]})
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": created["id"],
                "full_name": created["full_name"],
                "email": created["email"],
                "role": created["role"],
            },
        }

    async def login(self, email: str, password: str):
        user = await self.repository.find_by_email(email)
        if not user or not verify_password(password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        token = create_access_token({"sub": user["email"], "user_id": user["id"]})
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user["id"],
                "full_name": user["full_name"],
                "email": user["email"],
                "role": user.get("role", "merchant"),
            },
        }

    async def forgot_password(self, email: str):
        user = await self.repository.find_by_email(email)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return {"message": f"Password reset link simulated for {email}"}
