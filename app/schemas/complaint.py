from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ComplaintCreate(BaseModel):
    text: str = Field(..., min_length=5, max_length=2000)
    hostel: str = Field(..., min_length=2, max_length=80)
    metadata: dict[str, Any] = Field(default_factory=dict)


class ClassificationResult(BaseModel):
    normalized_text: str
    language: str
    category: str
    category_confidence: float
    urgency: str
    urgency_score: float
    urgency_confidence: float
    embedding_status: str
    warnings: list[str] = Field(default_factory=list)


class ComplaintPublic(BaseModel):
    id: str
    issue_id: str
    text: str
    normalized_text: str
    language: str
    hostel: str
    category: str
    urgency: str
    urgency_score: float
    is_duplicate: bool
    duplicate_of: str | None
    similarity_score: float | None
    embedding_status: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    student_name: str | None = None
    issue_title: str | None = None
    issue_status: str | None = None
    issue_priority_score: float | None = None
    issue_sla_status: str | None = None
    issue_recommended_action: str | None = None
    created_at: datetime


class ComplaintSubmissionResponse(BaseModel):
    complaint: ComplaintPublic
    classification: ClassificationResult
    issue: dict[str, Any]
