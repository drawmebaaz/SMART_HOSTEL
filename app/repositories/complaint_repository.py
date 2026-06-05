from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db.models.complaint import ComplaintModel


class ComplaintRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, data: dict) -> ComplaintModel:
        complaint = ComplaintModel(id=str(uuid4()), **data)
        self.db.add(complaint)
        self.db.flush()
        return complaint

    def list_for_student(self, student_id: str, *, limit: int = 50) -> list[ComplaintModel]:
        stmt = (
            select(ComplaintModel)
            .options(selectinload(ComplaintModel.issue), selectinload(ComplaintModel.student))
            .where(ComplaintModel.student_id == student_id)
            .order_by(ComplaintModel.created_at.desc())
            .limit(limit)
        )
        return list(self.db.execute(stmt).scalars().all())

    def list_by_issue(self, issue_id: str, *, limit: int = 200) -> list[ComplaintModel]:
        stmt = (
            select(ComplaintModel)
            .options(selectinload(ComplaintModel.issue), selectinload(ComplaintModel.student))
            .where(ComplaintModel.issue_id == issue_id)
            .order_by(ComplaintModel.created_at.desc())
            .limit(limit)
        )
        return list(self.db.execute(stmt).scalars().all())
