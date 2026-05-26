from sqlalchemy.orm import Session

from app.ai.grievance_ai import GrievanceAI, cosine_similarity, get_grievance_ai
from app.core.config import get_settings
from app.db.models.complaint import ComplaintModel
from app.db.models.issue import IssueModel
from app.db.models.user import UserModel
from app.repositories.complaint_repository import ComplaintRepository
from app.repositories.issue_repository import IssueRepository
from app.services.presenters import complaint_public, issue_summary


class ComplaintService:
    def __init__(self, db: Session, ai: GrievanceAI | None = None):
        self.db = db
        self.ai = ai or get_grievance_ai()
        self.settings = get_settings()
        self.complaints = ComplaintRepository(db)
        self.issues = IssueRepository(db)

    def submit(self, *, student: UserModel, text: str, hostel: str, metadata: dict) -> dict:
        analysis = self.ai.analyze(text)
        embedding = self.ai.embed(analysis.normalized_text)
        issue, similarity, duplicate_of = self._select_issue(
            hostel=hostel,
            category=analysis.category,
            embedding=embedding.vector,
        )

        if issue is None:
            issue = self.issues.create(
                hostel=hostel,
                category=analysis.category,
                title=f"{analysis.category} issue in {hostel}",
                description=analysis.normalized_text[:500],
            )
            self.issues.add_event(
                issue.id,
                "issue_created",
                actor_id=student.id,
                notes="Created from student complaint.",
            )

        duplicate_threshold = 0.52 if embedding.model == "local-hybrid-lexical" else self.settings.duplicate_threshold
        is_duplicate = similarity is not None and similarity >= duplicate_threshold
        complaint = self.complaints.create(
            {
                "student_id": student.id,
                "issue_id": issue.id,
                "text": text,
                "normalized_text": analysis.normalized_text,
                "language": analysis.language,
                "hostel": hostel,
                "category": analysis.category,
                "urgency": analysis.urgency,
                "urgency_score": analysis.urgency_score,
                "embedding": embedding.vector,
                "embedding_model": embedding.model,
                "embedding_status": embedding.status,
                "similarity_score": round(similarity, 4) if similarity is not None else None,
                "is_duplicate": is_duplicate,
                "duplicate_of": duplicate_of.id if is_duplicate and duplicate_of else None,
                "extra_metadata": metadata,
            }
        )

        self.issues.add_event(
            issue.id,
            "complaint_added",
            actor_id=student.id,
            notes="Student complaint attached to issue.",
        )
        self.issues.update_after_complaint(issue, complaint)
        self.db.commit()

        warnings = [embedding.warning] if embedding.warning else []
        return {
            "complaint": complaint_public(complaint),
            "classification": {
                "normalized_text": analysis.normalized_text,
                "language": analysis.language,
                "category": analysis.category,
                "category_confidence": analysis.category_confidence,
                "urgency": analysis.urgency,
                "urgency_score": analysis.urgency_score,
                "urgency_confidence": analysis.urgency_confidence,
                "embedding_status": embedding.status,
                "warnings": warnings,
            },
            "issue": issue_summary(issue),
        }

    def list_for_student(self, student_id: str) -> list[dict]:
        return [complaint_public(complaint) for complaint in self.complaints.list_for_student(student_id)]

    def _select_issue(
        self,
        *,
        hostel: str,
        category: str,
        embedding: list[float] | None,
    ) -> tuple[IssueModel | None, float | None, ComplaintModel | None]:
        candidates = self.issues.list_candidates(hostel, category)
        if not candidates:
            return None, None, None
        if embedding is None:
            return candidates[0], None, None

        best_issue: IssueModel | None = None
        best_complaint: ComplaintModel | None = None
        best_score = 0.0
        for issue in candidates:
            for complaint in issue.complaints:
                existing_embedding = complaint.embedding
                if hasattr(existing_embedding, "tolist"):
                    existing_embedding = existing_embedding.tolist()
                score = cosine_similarity(embedding, existing_embedding)
                if score > best_score:
                    best_issue = issue
                    best_complaint = complaint
                    best_score = score

        if best_issue and best_score >= self.settings.issue_match_threshold:
            return best_issue, best_score, best_complaint

        # Same hostel + category is already a strong operational boundary. Keep reports grouped
        # even when the lightweight local embedding has sparse vocabulary overlap.
        return candidates[0], best_score if best_score else None, best_complaint
