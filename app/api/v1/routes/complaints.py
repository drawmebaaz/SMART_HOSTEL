from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.models.user import UserModel
from app.db.session import get_db
from app.schemas.complaint import ComplaintCreate, ComplaintPublic, ComplaintSubmissionResponse
from app.services.complaint_service import ComplaintService

router = APIRouter(prefix="/complaints", tags=["Complaints"])


@router.post("", response_model=ComplaintSubmissionResponse, status_code=status.HTTP_201_CREATED)
def submit_complaint(
    payload: ComplaintCreate,
    user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return ComplaintService(db).submit(
        student=user,
        text=payload.text,
        hostel=payload.hostel,
        metadata=payload.metadata,
    )


@router.get("/me", response_model=list[ComplaintPublic])
def my_complaints(
    user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    return ComplaintService(db).list_for_student(user.id)
