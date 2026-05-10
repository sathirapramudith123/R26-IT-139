from fastapi import HTTPException
from app.core.security import hash_password, verify_password, create_access_token
from app.models.user_model import User
from app.repositories.user_repository import UserRepository

VALID_ROLES = {"merchant", "bank_agent", "admin"}

ROLE_PERMISSIONS = {
    "merchant":   {"merchant"},
    "bank_agent": {"merchant", "bank_agent"},
    "admin":      {"merchant", "bank_agent", "admin"},
}

def _clean_role(role) -> str:
    """Normalise DB role — handles None, empty string → merchant."""
    if role and str(role).strip() in VALID_ROLES:
        return str(role).strip()
    return "merchant"


class AuthService:
    def __init__(self):
        self.repository = UserRepository()

    async def register(
        self,
        full_name: str,
        email: str,
        password: str,
        role: str = "merchant",
    ):
        existing = await self.repository.find_by_email(email)
        if existing:
            raise HTTPException(status_code=400, detail="User already exists")

        # Accept any valid role at registration — allows direct admin/bank_agent creation
        assigned_role = _clean_role(role)

        user = User(
            full_name=full_name,
            email=email,
            password_hash=hash_password(password),
            role=assigned_role,
        )
        created = await self.repository.create(user.model_dump())

        token = create_access_token({
            "sub":         created["id"],
            "user_id":     created["id"],
            "email":       created["email"],
            "full_name":   created.get("full_name", ""),
            "role":        assigned_role,
            "actual_role": assigned_role,
        })

        return {
            "access_token": token,
            "token_type":   "bearer",
            "user": {
                "id":          created["id"],
                "full_name":   created.get("full_name", ""),
                "email":       created["email"],
                "role":        assigned_role,
                "actual_role": assigned_role,
            },
        }

    async def login(self, email: str, password: str, login_as: str | None = None):
        user = await self.repository.find_by_email(email)
        if not user or not verify_password(password, user.get("password_hash", "")):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        actual_role = _clean_role(user.get("role"))
        allowed     = ROLE_PERMISSIONS.get(actual_role, {"merchant"})

        if login_as and login_as.strip():
            requested = login_as.strip()
            if requested not in VALID_ROLES:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid role '{requested}'. Must be: {', '.join(sorted(VALID_ROLES))}.",
                )
            if requested not in allowed:
                raise HTTPException(
                    status_code=403,
                    detail=(
                        f"Your account ({actual_role}) cannot log in as '{requested}'. "
                        f"Allowed: {', '.join(sorted(allowed))}."
                    ),
                )
            session_role = requested
        else:
            session_role = actual_role

        token = create_access_token({
            "sub":         user["id"],
            "user_id":     user["id"],
            "email":       user["email"],
            "full_name":   user.get("full_name", ""),
            "role":        session_role,
            "actual_role": actual_role,
        })
        return {
            "access_token": token,
            "token_type":   "bearer",
            "user": {
                "id":          user["id"],
                "full_name":   user.get("full_name", ""),
                "email":       user["email"],
                "role":        session_role,
                "actual_role": actual_role,
            },
        }

    async def switch_role(self, user_id: str, new_role: str, actual_role: str):
        actual_role = _clean_role(actual_role)
        allowed     = ROLE_PERMISSIONS.get(actual_role, {"merchant"})

        if new_role not in VALID_ROLES:
            raise HTTPException(status_code=400, detail=f"Invalid role '{new_role}'.")
        if new_role not in allowed:
            raise HTTPException(
                status_code=403,
                detail=f"Cannot switch to '{new_role}'. Allowed: {', '.join(sorted(allowed))}.",
            )

        user = await self.repository.find_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        token = create_access_token({
            "sub":         user["id"],
            "user_id":     user["id"],
            "email":       user["email"],
            "full_name":   user.get("full_name", ""),
            "role":        new_role,
            "actual_role": actual_role,
        })
        return {
            "access_token": token,
            "token_type":   "bearer",
            "user": {
                "id":          user["id"],
                "full_name":   user.get("full_name", ""),
                "email":       user["email"],
                "role":        new_role,
                "actual_role": actual_role,
            },
        }

    async def forgot_password(self, email: str):
        user = await self.repository.find_by_email(email)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return {"message": f"Password reset link simulated for {email}"}

    async def upgrade_role(self, target_user_id: str, new_role: str):
        if new_role not in VALID_ROLES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid role '{new_role}'. Must be: {', '.join(sorted(VALID_ROLES))}",
            )
        user = await self.repository.find_by_id(target_user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        old_role = _clean_role(user.get("role"))
        await self.repository.update_role(target_user_id, new_role)
        return {
            "message":  f"Role updated to '{new_role}' successfully",
            "user_id":  target_user_id,
            "old_role": old_role,
            "new_role": new_role,
        }

    async def list_users(self):
        users = await self.repository.list_all()
        return [
            {
                "id":         u.get("id", ""),
                "full_name":  u.get("full_name", ""),
                "email":      u.get("email", ""),
                "role":       _clean_role(u.get("role")),
                "created_at": u.get("created_at"),
            }
            for u in users
        ]
