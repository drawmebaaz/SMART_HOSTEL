import pytest

from app.core.config import get_settings
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.services.auth_service import AuthError, AuthService


@pytest.fixture(autouse=True)
def sqlite_schema():
    if not get_settings().database_url.startswith("sqlite"):
        pytest.skip("schema fixture is only for sqlite-backed tests")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


def test_register_and_authenticate_student() -> None:
    with SessionLocal() as db:
        service = AuthService(db)
        user = service.register_student(
            email="student@example.com",
            name="Student User",
            password="password123",
        )

        assert user.role == "STUDENT"
        authenticated = service.authenticate(email="student@example.com", password="password123")
        assert authenticated.id == user.id


def test_authentication_rejects_bad_password() -> None:
    with SessionLocal() as db:
        service = AuthService(db)
        service.register_student(
            email="student@example.com",
            name="Student User",
            password="password123",
        )

        with pytest.raises(AuthError):
            service.authenticate(email="student@example.com", password="wrong-password")
