from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import Boolean, Column, DateTime, Index, String
from sqlalchemy.orm import relationship

from app.db.base import Base


class UserRole(str, Enum):
    STUDENT = "STUDENT"
    ADMIN = "ADMIN"


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class UserModel(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    email = Column(String, nullable=False, unique=True, index=True)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False, default=UserRole.STUDENT.value)
    password_hash = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=utcnow)
    updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    complaints = relationship("ComplaintModel", back_populates="student")
    oauth_accounts = relationship(
        "OAuthAccountModel",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    __table_args__ = (Index("ix_user_role", "role"),)
