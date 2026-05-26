from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import CheckConstraint, Column, DateTime, Float, Index, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base


class IssueStatus(str, Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    REOPENED = "REOPENED"


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class IssueModel(Base):
    __tablename__ = "issues"

    id = Column(String, primary_key=True, index=True)
    hostel = Column(String, nullable=False)
    category = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, nullable=False, default=IssueStatus.OPEN.value)

    urgency_max = Column(String, nullable=False, default="LOW")
    urgency_score_avg = Column(Float, nullable=False, default=0.0)
    complaint_count = Column(Integer, nullable=False, default=0)
    duplicate_count = Column(Integer, nullable=False, default=0)
    last_complaint_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, nullable=False, default=utcnow, index=True)
    updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)
    resolved_at = Column(DateTime, nullable=True)

    complaints = relationship(
        "ComplaintModel",
        back_populates="issue",
        cascade="all, delete-orphan",
        order_by="ComplaintModel.created_at.desc()",
    )
    events = relationship(
        "IssueEventModel",
        back_populates="issue",
        cascade="all, delete-orphan",
        order_by="IssueEventModel.created_at.desc()",
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'REOPENED')",
            name="ck_issue_status_valid",
        ),
        CheckConstraint(
            "urgency_score_avg >= 0 AND urgency_score_avg <= 100",
            name="ck_issue_urgency_score_range",
        ),
        CheckConstraint(
            "complaint_count >= 0 AND duplicate_count >= 0 AND duplicate_count <= complaint_count",
            name="ck_issue_counts_valid",
        ),
        Index("ix_issue_status", "status"),
        Index("ix_issue_hostel_category_status", "hostel", "category", "status"),
        Index("ix_issue_last_complaint_at", "last_complaint_at"),
        Index("ix_issue_resolved_at", "resolved_at"),
    )

    def __repr__(self) -> str:
        return f"<Issue {self.id} {self.hostel}/{self.category} {self.status}>"
