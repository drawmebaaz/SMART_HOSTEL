import os
from pathlib import Path

os.environ.setdefault("DATABASE_URL", "sqlite:///./data/test.db")
os.environ.setdefault("SECRET_KEY", "test-secret-key-with-at-least-32-characters")


def pytest_sessionstart(session):
    for suffix in ("", "-wal", "-shm"):
        path = Path(f"data/test.db{suffix}")
        if path.exists():
            path.unlink()
