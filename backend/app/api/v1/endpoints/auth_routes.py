from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.services.auth_service import AuthService
from app.api.deps import get_current_user, require_admin

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    full_name: str
    email:     EmailStr
    password:  str
    role:      Optional[str] = "merchant"


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str
    login_as: Optional[str] = None


class RoleUpgradeRequest(BaseModel):
    role: str


class SwitchRoleRequest(BaseModel):
    role: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


@router.post("/register")
async def register(payload: RegisterRequest):
    return await AuthService().register(
        full_name=payload.full_name,
        email=payload.email,
        password=payload.password,
        role=payload.role or "merchant",
    )


@router.post("/login")
async def login(payload: LoginRequest):
    return await AuthService().login(
        email=payload.email,
        password=payload.password,
        login_as=payload.login_as,
    )


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    return await AuthService().forgot_password(payload.email)


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user


@router.post("/switch-role")
async def switch_role(
    payload: SwitchRoleRequest,
    current_user: dict = Depends(get_current_user),
):
    return await AuthService().switch_role(
        user_id=current_user["id"],
        new_role=payload.role,
        actual_role=current_user.get("actual_role", current_user.get("role", "merchant")),
    )


@router.get("/users")
async def list_users(current_user: dict = Depends(require_admin)):
    return await AuthService().list_users()


@router.put("/users/{user_id}/role")
async def upgrade_user_role(
    user_id: str,
    payload: RoleUpgradeRequest,
    current_user: dict = Depends(require_admin),
):
    return await AuthService().upgrade_role(user_id, payload.role)