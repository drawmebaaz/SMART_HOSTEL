from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.db.models.user import UserRole


class UserPublic(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: UserRole
    is_active: bool
    created_at: datetime


class RegisterRequest(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=120)
    password: str = Field(..., min_length=8, max_length=128)
    role: UserRole = UserRole.STUDENT

    @field_validator("role")
    @classmethod
    def prevent_public_admin_registration(cls, value: UserRole) -> UserRole:
        if value == UserRole.ADMIN:
            raise ValueError("Admin accounts must be provisioned by an existing admin")
        return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class AuthResponse(BaseModel):
    user: UserPublic


class OAuthStartResponse(BaseModel):
    provider: str
    enabled: bool
    authorization_url: str | None = None
