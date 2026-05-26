from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.oauth_account import OAuthAccountModel
from app.db.models.user import UserModel, UserRole


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: str) -> UserModel | None:
        return self.db.execute(select(UserModel).where(UserModel.id == user_id)).scalar_one_or_none()

    def get_by_email(self, email: str) -> UserModel | None:
        return self.db.execute(
            select(UserModel).where(UserModel.email == email.lower())
        ).scalar_one_or_none()

    def create(
        self,
        *,
        email: str,
        name: str,
        role: UserRole = UserRole.STUDENT,
        password_hash: str | None = None,
    ) -> UserModel:
        user = UserModel(
            id=str(uuid4()),
            email=email.lower(),
            name=name,
            role=role.value,
            password_hash=password_hash,
        )
        self.db.add(user)
        self.db.flush()
        return user

    def get_oauth_account(self, provider: str, provider_account_id: str) -> OAuthAccountModel | None:
        return self.db.execute(
            select(OAuthAccountModel).where(
                OAuthAccountModel.provider == provider,
                OAuthAccountModel.provider_account_id == provider_account_id,
            )
        ).scalar_one_or_none()

    def link_oauth_account(
        self,
        *,
        user_id: str,
        provider: str,
        provider_account_id: str,
        email: str,
    ) -> OAuthAccountModel:
        account = OAuthAccountModel(
            id=str(uuid4()),
            user_id=user_id,
            provider=provider,
            provider_account_id=provider_account_id,
            email=email.lower(),
        )
        self.db.add(account)
        self.db.flush()
        return account
