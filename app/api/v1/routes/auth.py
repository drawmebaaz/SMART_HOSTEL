from secrets import token_urlsafe

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.security import create_access_token
from app.db.models.user import UserModel
from app.db.session import get_db
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, UserPublic
from app.services.auth_service import AuthError, AuthService

router = APIRouter(prefix="/auth", tags=["Auth"])


def user_public(user: UserModel) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": user.created_at,
    }


def set_auth_cookie(response: Response, user: UserModel) -> None:
    settings = get_settings()
    token = create_access_token(subject=user.id, role=user.role)
    response.set_cookie(
        settings.auth_cookie_name,
        token,
        max_age=settings.access_token_minutes * 60,
        httponly=True,
        secure=settings.secure_cookies,
        samesite="lax",
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, response: Response, db: Session = Depends(get_db)) -> dict:
    try:
        user = AuthService(db).register_student(
            email=payload.email,
            name=payload.name,
            password=payload.password,
        )
    except AuthError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    set_auth_cookie(response, user)
    return {"user": user_public(user)}


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)) -> dict:
    try:
        user = AuthService(db).authenticate(email=payload.email, password=payload.password)
    except AuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    set_auth_cookie(response, user)
    return {"user": user_public(user)}


@router.post("/logout")
def logout(response: Response) -> dict:
    settings = get_settings()
    response.delete_cookie(settings.auth_cookie_name)
    return {"message": "Logged out"}


@router.get("/me", response_model=AuthResponse)
def me(user: UserModel = Depends(get_current_user)) -> dict:
    return {"user": user_public(user)}


@router.get("/oauth/{provider}/start")
def oauth_start(provider: str, response: Response, db: Session = Depends(get_db)):
    settings = get_settings()
    configured_provider = settings.oauth_provider_name
    if not configured_provider or provider != configured_provider:
        raise HTTPException(status_code=404, detail="OAuth provider is not configured")
    state = token_urlsafe(32)
    try:
        authorization_url = AuthService(db).oauth_authorization_url(state=state)
    except AuthError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    redirect = RedirectResponse(authorization_url)
    redirect.set_cookie(
        "oauth_state",
        state,
        max_age=600,
        httponly=True,
        secure=settings.secure_cookies,
        samesite="lax",
    )
    return redirect


@router.get("/oauth/{provider}/callback")
async def oauth_callback(
    provider: str,
    request: Request,
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db),
):
    settings = get_settings()
    if provider != settings.oauth_provider_name:
        raise HTTPException(status_code=404, detail="OAuth provider is not configured")
    if request.cookies.get("oauth_state") != state:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    try:
        user = await AuthService(db).complete_oauth_login(code=code)
    except AuthError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    redirect_target = "/admin" if user.role == "ADMIN" else "/student"
    redirect = RedirectResponse(redirect_target)
    set_auth_cookie(redirect, user)
    redirect.delete_cookie("oauth_state")
    return redirect
