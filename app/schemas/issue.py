from datetime import datetime

from pydantic import BaseModel, Field

from app.db.models.issue import IssueStatus
from app.schemas.complaint import ComplaintPublic


class IssueSummary(BaseModel):
    id: str
    title: str
    hostel: str
    category: str
    status: IssueStatus
    urgency_max: str
    urgency_score_avg: float
    complaint_count: int
    duplicate_count: int
    priority_score: float
    intelligence: dict
    last_complaint_at: datetime | None
    created_at: datetime
    updated_at: datetime
    resolved_at: datetime | None


class IssueEventPublic(BaseModel):
    id: str
    event_type: str
    actor_id: str | None
    from_status: str | None
    to_status: str | None
    notes: str | None
    created_at: datetime


class IssueDetail(IssueSummary):
    description: str | None
    complaints: list[ComplaintPublic] = Field(default_factory=list)
    events: list[IssueEventPublic] = Field(default_factory=list)


class IssueStatusUpdate(BaseModel):
    status: IssueStatus
    notes: str | None = Field(default=None, max_length=500)


class DashboardSummary(BaseModel):
    total_open: int
    total_in_progress: int
    total_resolved: int
    total_reopened: int
    critical_issues: int
    complaints_total: int
    duplicates_total: int
    category_breakdown: dict[str, int]
    hostel_breakdown: dict[str, int]
    sla_breakdown: dict[str, int]
    ai_runtime: str
    issues: list[IssueSummary]
