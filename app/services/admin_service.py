from sqlalchemy.orm import Session

from app.db.models.issue import IssueStatus
from app.db.models.user import UserModel
from app.core.config import get_settings
from app.repositories.issue_repository import IssueRepository
from app.services.presenters import issue_detail, issue_summary


class AdminService:
    def __init__(self, db: Session):
        self.db = db
        self.issues = IssueRepository(db)

    def list_issues(
        self,
        *,
        status: IssueStatus | None = None,
        hostel: str | None = None,
        category: str | None = None,
        limit: int = 100,
    ) -> list[dict]:
        issues = self.issues.list_issues(
            status=status,
            hostel=hostel,
            category=category,
            limit=limit,
        )
        summaries = [issue_summary(issue) for issue in issues]
        return sorted(summaries, key=lambda issue: issue["priority_score"], reverse=True)

    def get_issue(self, issue_id: str) -> dict | None:
        issue = self.issues.get_by_id(issue_id, include_details=True)
        return issue_detail(issue) if issue else None

    def update_status(
        self,
        *,
        issue_id: str,
        status: IssueStatus,
        actor: UserModel,
        notes: str | None = None,
    ) -> dict | None:
        issue = self.issues.get_by_id(issue_id)
        if not issue:
            return None
        self.issues.update_status(issue, status, actor_id=actor.id, notes=notes)
        self.db.commit()
        return issue_summary(issue)

    def dashboard(self) -> dict:
        issues = self.issues.list_issues(limit=50)
        counts = self.issues.dashboard_counts()
        summaries = sorted(
            [issue_summary(issue) for issue in issues],
            key=lambda issue: issue["priority_score"],
            reverse=True,
        )
        counts["issues"] = summaries
        counts["category_breakdown"] = _breakdown(summaries, "category")
        counts["hostel_breakdown"] = _breakdown(summaries, "hostel")
        counts["sla_breakdown"] = _breakdown(
            [{"sla": issue["intelligence"]["sla_status"]} for issue in summaries],
            "sla",
        )
        counts["ai_runtime"] = (
            "Transformer embeddings"
            if get_settings().enable_transformer_embeddings
            else "Local hybrid intelligence"
        )
        return counts


def _breakdown(items: list[dict], key: str) -> dict[str, int]:
    result: dict[str, int] = {}
    for item in items:
        value = str(item.get(key, "Unknown"))
        result[value] = result.get(value, 0) + 1
    return result
