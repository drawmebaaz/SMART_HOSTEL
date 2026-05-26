from datetime import datetime, timezone

from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, Float, ForeignKey, Index, JSON
from sqlalchemy import String, Text
from sqlalchemy.orm import relationship

from app.core.config import get_settings
from app.db.base import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def embedding_column_type():
    settings = get_settings()
    if settings.is_postgres:
        from pgvector.sqlalchemy import Vector

        return Vector(settings.embedding_dimension)
    return JSON


class ComplaintModel(Base):
    __tablename__ = "complaints"

    id = Column(String, primary_key=True)
    student_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    issue_id = Column(String, ForeignKey("issues.id", ondelete="RESTRICT"), nullable=False)

    text = Column(Text, nullable=False)
    normalized_text = Column(Text, nullable=False)
    language = Column(String, nullable=False, default="english")
    hostel = Column(String, nullable=False)
    category = Column(String, nullable=False)
    urgency = Column(String, nullable=False)
    urgency_score = Column(Float, nullable=False, default=0.0)

    embedding = Column(embedding_column_type(), nullable=True)
    embedding_model = Column(String, nullable=True)
    embedding_status = Column(String, nullable=False, default="unavailable")

    similarity_score = Column(Float, nullable=True)
    is_duplicate = Column(Boolean, nullable=False, default=False)
    duplicate_of = Column(String, ForeignKey("complaints.id", ondelete="SET NULL"), nullable=True)

    extra_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, default=utcnow)

    student = relationship("UserModel", back_populates="complaints")
    issue = relationship("IssueModel", back_populates="complaints")

    __table_args__ = (
        CheckConstraint(
            "(is_duplicate = 0 AND duplicate_of IS NULL) OR "
            "(is_duplicate = 1 AND duplicate_of IS NOT NULL)",
            name="ck_duplicate_consistency",
        ),
        CheckConstraint(
            "similarity_score IS NULL OR (similarity_score >= 0 AND similarity_score <= 1)",
            name="ck_similarity_score_range",
        ),
        CheckConstraint(
            "urgency_score >= 0 AND urgency_score <= 100",
            name="ck_complaint_urgency_score_range",
        ),
        Index("ix_complaint_student_id", "student_id"),
        Index("ix_complaint_issue_id", "issue_id"),
        Index("ix_complaint_created_at", "created_at"),
        Index("ix_complaint_hostel_category", "hostel", "category"),
    )

    def __repr__(self) -> str:
        return f"<Complaint {self.id} {self.hostel}/{self.category}>"
