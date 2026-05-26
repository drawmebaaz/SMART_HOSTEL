from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class IssueEventModel(Base):
    __tablename__ = "issue_events"

    id = Column(String, primary_key=True)
    issue_id = Column(String, ForeignKey("issues.id", ondelete="CASCADE"), nullable=False)
    actor_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    event_type = Column(String, nullable=False)
    from_status = Column(String, nullable=True)
    to_status = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=utcnow)

    issue = relationship("IssueModel", back_populates="events")

    __table_args__ = (
        Index("ix_issue_event_issue_id", "issue_id"),
        Index("ix_issue_event_created_at", "created_at"),
    )
