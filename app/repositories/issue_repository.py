from collections import Counter
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session, joinedload

from app.db.models.complaint import ComplaintModel
from app.db.models.issue import IssueModel, IssueStatus
from app.db.models.issue_event import IssueEventModel


ACTIVE_STATUSES = {
    IssueStatus.OPEN.value,
    IssueStatus.IN_PROGRESS.value,
    IssueStatus.REOPENED.value,
}


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class IssueRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, hostel: str, category: str, title: str, description: str | None = None) -> IssueModel:
        issue = IssueModel(
            id=str(uuid4()),
            hostel=hostel,
            category=category,
            title=title,
            description=description,
            status=IssueStatus.OPEN.value,
            created_at=utcnow(),
            updated_at=utcnow(),
        )
        self.db.add(issue)
        self.db.flush()
        return issue

    def get_by_id(self, issue_id: str, *, include_details: bool = False) -> IssueModel | None:
        stmt: Select[tuple[IssueModel]] = select(IssueModel).where(IssueModel.id == issue_id)
        if include_details:
            stmt = stmt.options(
                joinedload(IssueModel.complaints).joinedload(ComplaintModel.student),
                joinedload(IssueModel.events),
            )
        return self.db.execute(stmt).unique().scalar_one_or_none()

    def list_candidates(self, hostel: str, category: str) -> list[IssueModel]:
        stmt = (
            select(IssueModel)
            .where(
                IssueModel.hostel == hostel,
                IssueModel.category == category,
                IssueModel.status.in_(ACTIVE_STATUSES),
            )
            .options(joinedload(IssueModel.complaints))
            .order_by(IssueModel.last_complaint_at.desc().nullslast(), IssueModel.created_at.desc())
        )
        return list(self.db.execute(stmt).unique().scalars().all())

    def list_issues(
        self,
        *,
        status: IssueStatus | None = None,
        hostel: str | None = None,
        category: str | None = None,
        limit: int = 100,
    ) -> list[IssueModel]:
        stmt = select(IssueModel)
        if status:
            stmt = stmt.where(IssueModel.status == status.value)
        if hostel:
            stmt = stmt.where(IssueModel.hostel == hostel)
        if category:
            stmt = stmt.where(IssueModel.category == category)
        stmt = stmt.order_by(IssueModel.updated_at.desc()).limit(limit)
        return list(self.db.execute(stmt).scalars().all())

    def add_event(
        self,
        issue_id: str,
        event_type: str,
        *,
        actor_id: str | None = None,
        from_status: str | None = None,
        to_status: str | None = None,
        notes: str | None = None,
    ) -> IssueEventModel:
        event = IssueEventModel(
            id=str(uuid4()),
            issue_id=issue_id,
            actor_id=actor_id,
            event_type=event_type,
            from_status=from_status,
            to_status=to_status,
            notes=notes,
            created_at=utcnow(),
        )
        self.db.add(event)
        self.db.flush()
        return event

    def update_after_complaint(self, issue: IssueModel, complaint: ComplaintModel) -> IssueModel:
        count_stmt = select(func.count(ComplaintModel.id)).where(ComplaintModel.issue_id == issue.id)
        dup_stmt = select(func.count(ComplaintModel.id)).where(
            ComplaintModel.issue_id == issue.id,
            ComplaintModel.is_duplicate.is_(True),
        )
        avg_stmt = select(func.avg(ComplaintModel.urgency_score)).where(ComplaintModel.issue_id == issue.id)

        issue.complaint_count = int(self.db.execute(count_stmt).scalar() or 0)
        issue.duplicate_count = int(self.db.execute(dup_stmt).scalar() or 0)
        issue.urgency_score_avg = float(self.db.execute(avg_stmt).scalar() or complaint.urgency_score)
        issue.urgency_max = self._max_urgency(issue.id)
        issue.last_complaint_at = complaint.created_at
        issue.updated_at = utcnow()
        self.db.flush()
        return issue

    def update_status(
        self,
        issue: IssueModel,
        status: IssueStatus,
        *,
        actor_id: str,
        notes: str | None = None,
    ) -> IssueModel:
        previous = issue.status
        issue.status = status.value
        issue.updated_at = utcnow()
        issue.resolved_at = utcnow() if status == IssueStatus.RESOLVED else None
        self.add_event(
            issue.id,
            "status_changed",
            actor_id=actor_id,
            from_status=previous,
            to_status=status.value,
            notes=notes,
        )
        self.db.flush()
        return issue

    def dashboard_counts(self) -> dict[str, int]:
        statuses = Counter()
        rows = self.db.execute(
            select(IssueModel.status, func.count(IssueModel.id)).group_by(IssueModel.status)
        ).all()
        for status, count in rows:
            statuses[status] = int(count)
        complaints_total = int(self.db.execute(select(func.count(ComplaintModel.id))).scalar() or 0)
        duplicates_total = int(
            self.db.execute(
                select(func.count(ComplaintModel.id)).where(ComplaintModel.is_duplicate.is_(True))
            ).scalar()
            or 0
        )
        critical_issues = int(
            self.db.execute(
                select(func.count(IssueModel.id)).where(
                    IssueModel.urgency_max == "CRITICAL",
                    IssueModel.status.in_(ACTIVE_STATUSES),
                )
            ).scalar()
            or 0
        )
        return {
            "total_open": statuses[IssueStatus.OPEN.value],
            "total_in_progress": statuses[IssueStatus.IN_PROGRESS.value],
            "total_resolved": statuses[IssueStatus.RESOLVED.value],
            "total_reopened": statuses[IssueStatus.REOPENED.value],
            "critical_issues": critical_issues,
            "complaints_total": complaints_total,
            "duplicates_total": duplicates_total,
        }

    def _max_urgency(self, issue_id: str) -> str:
        rank = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}
        rows = self.db.execute(
            select(ComplaintModel.urgency).where(ComplaintModel.issue_id == issue_id)
        ).scalars()
        return max(rows, key=lambda urgency: rank.get(urgency, 0), default="LOW")
