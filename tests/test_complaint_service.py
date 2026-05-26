import pytest

from app.ai.grievance_ai import EmbeddingResult
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.repositories.user_repository import UserRepository
from app.services.complaint_service import ComplaintService


class StubAI:
    def analyze(self, text: str):
        from app.ai.grievance_ai import TextAnalysis

        return TextAnalysis(
            original_text=text,
            normalized_text=text.lower(),
            language="english",
            category="Water",
            category_confidence=0.8,
            urgency="HIGH",
            urgency_score=75.0,
            urgency_confidence=0.8,
        )

    def embed(self, normalized_text: str):
        return EmbeddingResult(
            vector=[1.0, 0.0, 0.0],
            model="stub",
            status="available",
        )


@pytest.fixture(autouse=True)
def sqlite_schema():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


def test_submission_creates_issue_and_complaint() -> None:
    with SessionLocal() as db:
        student = UserRepository(db).create(
            email="student@example.com",
            name="Student",
            password_hash="hash",
        )
        db.commit()

        result = ComplaintService(db, ai=StubAI()).submit(
            student=student,
            text="No water in bathroom",
            hostel="BH-3",
            metadata={},
        )

        assert result["complaint"]["hostel"] == "BH-3"
        assert result["issue"]["complaint_count"] == 1
        assert result["classification"]["category"] == "Water"


def test_same_hostel_category_clusters_into_existing_issue() -> None:
    with SessionLocal() as db:
        student = UserRepository(db).create(
            email="student@example.com",
            name="Student",
            password_hash="hash",
        )
        db.commit()

        service = ComplaintService(db, ai=StubAI())
        first = service.submit(
            student=student,
            text="No water in bathroom",
            hostel="BH-3",
            metadata={},
        )
        second = service.submit(
            student=student,
            text="Water supply is still not coming",
            hostel="BH-3",
            metadata={},
        )

        assert second["issue"]["id"] == first["issue"]["id"]
        assert second["issue"]["complaint_count"] == 2
