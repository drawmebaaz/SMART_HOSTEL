from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.core.security import hash_password
from app.db.models.user import UserRole
from app.db.models.complaint import ComplaintModel
from app.db.session import SessionLocal, init_db
from app.repositories.user_repository import UserRepository
from app.services.complaint_service import ComplaintService
from sqlalchemy import select


DEMO_COMPLAINTS = [
    ("BH-2", "Paani nahi aa raha in BH-2 washroom since morning"),
    ("BH-2", "No water supply in second floor bathroom for four hours"),
    ("BH-3", "Electric spark near room 214 switchboard, it feels unsafe"),
    ("BH-3", "Bijli socket kharab hai and sparks are coming near bed"),
    ("GH-1", "WiFi keeps disconnecting during online classes"),
    ("GH-1", "Internet speed is very slow in the east wing"),
    ("BH-4", "Mess food smells bad and several students are feeling sick"),
    ("BH-5", "Unknown person roaming near hostel entry late night"),
    ("Old Hostel", "Bathroom cleaning has not happened for three days and badbu is strong"),
    ("New Hostel", "Fan is broken in room 302 and room is too hot"),
]


def upsert_user(users: UserRepository, *, email: str, name: str, role: UserRole, password: str):
    existing = users.get_by_email(email)
    if existing:
        existing.name = name
        existing.role = role.value
        existing.password_hash = hash_password(password)
        existing.is_active = True
        return existing
    return users.create(email=email, name=name, role=role, password_hash=hash_password(password))


def main() -> None:
    init_db()
    with SessionLocal() as db:
        users = UserRepository(db)
        student = upsert_user(
            users,
            email="student@example.com",
            name="Demo Student",
            role=UserRole.STUDENT,
            password="StudentPassword123",
        )
        upsert_user(
            users,
            email="admin@example.com",
            name="Hostel Admin",
            role=UserRole.ADMIN,
            password="YourStrongPassword123",
        )
        db.commit()

        existing_demo = db.execute(select(ComplaintModel).limit(1000)).scalars().all()
        if any((complaint.extra_metadata or {}).get("source") == "demo_seed" for complaint in existing_demo):
            print("Demo data already exists")
            print("Admin:   admin@example.com / YourStrongPassword123")
            print("Student: student@example.com / StudentPassword123")
            return

        service = ComplaintService(db)
        for hostel, text in DEMO_COMPLAINTS:
            service.submit(
                student=student,
                text=text,
                hostel=hostel,
                metadata={"source": "demo_seed"},
            )

    print("Demo data ready")
    print("Admin:   admin@example.com / YourStrongPassword123")
    print("Student: student@example.com / StudentPassword123")


if __name__ == "__main__":
    main()
