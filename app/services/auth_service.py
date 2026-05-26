from urllib.parse import urlencode

import httpx
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_password, verify_password
from app.db.models.user import UserModel, UserRole
from app.repositories.user_repository import UserRepository


class AuthError(ValueError):
    pass


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings()
        self.users = UserRepository(db)

    def register_student(self, *, email: str, name: str, password: str) -> UserModel:
        if self.users.get_by_email(email):
            raise AuthError("An account with this email already exists")
        user = self.users.create(
            email=email,
            name=name,
            role=UserRole.STUDENT,
            password_hash=hash_password(password),
        )
        self.db.commit()
        return user

    def authenticate(self, *, email: str, password: str) -> UserModel:
        user = self.users.get_by_email(email)
        if not user or not user.is_active or not verify_password(password, user.password_hash):
            raise AuthError("Invalid email or password")
        return user

    def oauth_authorization_url(self, *, state: str) -> str:
        if not self.oauth_configured:
            raise AuthError("OAuth is not configured")
        params = {
            "client_id": self.settings.oauth_client_id,
            "redirect_uri": str(self.settings.oauth_redirect_uri),
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
        }
        return f"{self.settings.oauth_authorize_url}?{urlencode(params)}"

    async def complete_oauth_login(self, *, code: str) -> UserModel:
        if not self.oauth_configured:
            raise AuthError("OAuth is not configured")

        async with httpx.AsyncClient(timeout=10) as client:
            token_response = await client.post(
                str(self.settings.oauth_token_url),
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": str(self.settings.oauth_redirect_uri),
                    "client_id": self.settings.oauth_client_id,
                    "client_secret": self.settings.oauth_client_secret,
                },
                headers={"Accept": "application/json"},
            )
            token_response.raise_for_status()
            access_token = token_response.json().get("access_token")
            if not access_token:
                raise AuthError("OAuth provider did not return an access token")

            user_response = await client.get(
                str(self.settings.oauth_userinfo_url),
                headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
            )
            user_response.raise_for_status()

        profile = user_response.json()
        provider_account_id = str(profile.get("sub") or profile.get("id") or "")
        email = str(profile.get("email") or "").lower()
        name = str(profile.get("name") or email.split("@")[0])
        if not provider_account_id or not email:
            raise AuthError("OAuth provider profile is missing required identity fields")

        provider = self.settings.oauth_provider_name or "oidc"
        existing_account = self.users.get_oauth_account(provider, provider_account_id)
        if existing_account:
            return existing_account.user

        user = self.users.get_by_email(email)
        if not user:
            user = self.users.create(email=email, name=name, role=UserRole.STUDENT)

        self.users.link_oauth_account(
            user_id=user.id,
            provider=provider,
            provider_account_id=provider_account_id,
            email=email,
        )
        self.db.commit()
        return user

    @property
    def oauth_configured(self) -> bool:
        return all(
            [
                self.settings.oauth_enabled,
                self.settings.oauth_provider_name,
                self.settings.oauth_client_id,
                self.settings.oauth_client_secret,
                self.settings.oauth_authorize_url,
                self.settings.oauth_token_url,
                self.settings.oauth_userinfo_url,
                self.settings.oauth_redirect_uri,
            ]
        )
