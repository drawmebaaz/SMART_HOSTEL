import argparse
from getpass import getpass
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.core.security import hash_password
from app.db.models.user import UserRole
from app.db.session import SessionLocal, engine, init_db
from app.repositories.user_repository import UserRepository
from app.core.config import get_settings
from sqlalchemy import inspect


def ensure_schema() -> None:
    inspector = inspect(engine)
    if inspector.has_table("users"):
        return

    settings = get_settings()
    if settings.is_postgres:
        raise SystemExit("Database schema is missing. Run: alembic upgrade head")

    init_db()


def main() -> None:
    parser = argparse.ArgumentParser(description="Create or update an admin account.")
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", required=True)
    parser.add_argument("--password")
    args = parser.parse_args()

    password = args.password or getpass("Password: ")
    if len(password) < 8:
        raise SystemExit("Password must be at least 8 characters.")

    ensure_schema()

    with SessionLocal() as db:
        users = UserRepository(db)
        existing = users.get_by_email(args.email)
        if existing:
            existing.name = args.name
            existing.role = UserRole.ADMIN.value
            existing.password_hash = hash_password(password)
            existing.is_active = True
            action = "updated"
        else:
            users.create(
                email=args.email,
                name=args.name,
                role=UserRole.ADMIN,
                password_hash=hash_password(password),
            )
            action = "created"
        db.commit()
        print(f"Admin account {action}: {args.email}")


if __name__ == "__main__":
    main()
