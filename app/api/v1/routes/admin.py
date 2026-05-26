from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.db.models.issue import IssueStatus
from app.db.models.user import UserModel
from app.db.session import get_db
from app.schemas.issue import DashboardSummary, IssueDetail, IssueStatusUpdate, IssueSummary
from app.services.admin_service import AdminService

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/dashboard", response_model=DashboardSummary)
def dashboard(
    _admin: UserModel = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    return AdminService(db).dashboard()


@router.get("/issues", response_model=list[IssueSummary])
def list_issues(
    status: IssueStatus | None = Query(default=None),
    hostel: str | None = Query(default=None),
    category: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    _admin: UserModel = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[dict]:
    return AdminService(db).list_issues(
        status=status,
        hostel=hostel,
        category=category,
        limit=limit,
    )


@router.get("/issues/{issue_id}", response_model=IssueDetail)
def get_issue(
    issue_id: str,
    _admin: UserModel = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    issue = AdminService(db).get_issue(issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue


@router.patch("/issues/{issue_id}/status", response_model=IssueSummary)
def update_issue_status(
    issue_id: str,
    payload: IssueStatusUpdate,
    admin: UserModel = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    issue = AdminService(db).update_status(
        issue_id=issue_id,
        status=payload.status,
        actor=admin,
        notes=payload.notes,
    )
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue
