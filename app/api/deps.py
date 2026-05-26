from collections.abc import Callable

import jwt
from fastapi import Cookie, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import decode_access_token
from app.db.models.user import UserModel, UserRole
from app.db.session import get_db
from app.repositories.user_repository import UserRepository


def get_current_user(
    db: Session = Depends(get_db),
    authorization: str | None = Header(default=None),
    access_token_cookie: str | None = Cookie(default=None, alias=get_settings().auth_cookie_name),
) -> UserModel:
    token = access_token_cookie
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1]
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    try:
        payload = decode_access_token(token)
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    user = UserRepository(db).get_by_id(str(payload.get("sub")))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive account")
    return user


def require_role(role: UserRole) -> Callable:
    def dependency(user: UserModel = Depends(get_current_user)) -> UserModel:
        if user.role != role.value:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        return user

    return dependency


require_admin = require_role(UserRole.ADMIN)
