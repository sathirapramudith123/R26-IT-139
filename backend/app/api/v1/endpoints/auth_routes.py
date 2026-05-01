from fastapi import APIRouter
from app.schemas.auth_schema import RegisterRequest, LoginRequest, ForgotPasswordRequest
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])
#service = AuthService()

@router.post("/register")
async def register(payload: RegisterRequest):
    service = AuthService()
    return await service.register(payload.full_name, payload.email, payload.password)

@router.post("/login")
async def login(payload: LoginRequest):
    service = AuthService()
    return await service.login(payload.email, payload.password)

@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    service = AuthService()
    return await service.forgot_password(payload.email)
