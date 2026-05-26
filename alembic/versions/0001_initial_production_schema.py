from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"
    if is_postgres:
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "users",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_user_role", "users", ["role"])

    op.create_table(
        "issues",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("hostel", sa.String(), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("urgency_max", sa.String(), nullable=False),
        sa.Column("urgency_score_avg", sa.Float(), nullable=False),
        sa.Column("complaint_count", sa.Integer(), nullable=False),
        sa.Column("duplicate_count", sa.Integer(), nullable=False),
        sa.Column("last_complaint_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.CheckConstraint(
            "status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'REOPENED')",
            name="ck_issue_status_valid",
        ),
        sa.CheckConstraint(
            "urgency_score_avg >= 0 AND urgency_score_avg <= 100",
            name="ck_issue_urgency_score_range",
        ),
        sa.CheckConstraint(
            "complaint_count >= 0 AND duplicate_count >= 0 AND duplicate_count <= complaint_count",
            name="ck_issue_counts_valid",
        ),
    )
    op.create_index("ix_issues_id", "issues", ["id"])
    op.create_index("ix_issues_created_at", "issues", ["created_at"])
    op.create_index("ix_issue_status", "issues", ["status"])
    op.create_index("ix_issue_hostel_category_status", "issues", ["hostel", "category", "status"])
    op.create_index("ix_issue_last_complaint_at", "issues", ["last_complaint_at"])
    op.create_index("ix_issue_resolved_at", "issues", ["resolved_at"])

    embedding_type = Vector(384) if is_postgres else sa.JSON()
    op.create_table(
        "complaints",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("student_id", sa.String(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("issue_id", sa.String(), sa.ForeignKey("issues.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("normalized_text", sa.Text(), nullable=False),
        sa.Column("language", sa.String(), nullable=False),
        sa.Column("hostel", sa.String(), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("urgency", sa.String(), nullable=False),
        sa.Column("urgency_score", sa.Float(), nullable=False),
        sa.Column("embedding", embedding_type, nullable=True),
        sa.Column("embedding_model", sa.String(), nullable=True),
        sa.Column("embedding_status", sa.String(), nullable=False),
        sa.Column("similarity_score", sa.Float(), nullable=True),
        sa.Column("is_duplicate", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("duplicate_of", sa.String(), sa.ForeignKey("complaints.id", ondelete="SET NULL")),
        sa.Column("extra_metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint(
            "(is_duplicate = false AND duplicate_of IS NULL) OR "
            "(is_duplicate = true AND duplicate_of IS NOT NULL)",
            name="ck_duplicate_consistency",
        ),
        sa.CheckConstraint(
            "similarity_score IS NULL OR (similarity_score >= 0 AND similarity_score <= 1)",
            name="ck_similarity_score_range",
        ),
        sa.CheckConstraint(
            "urgency_score >= 0 AND urgency_score <= 100",
            name="ck_complaint_urgency_score_range",
        ),
    )
    op.create_index("ix_complaint_student_id", "complaints", ["student_id"])
    op.create_index("ix_complaint_issue_id", "complaints", ["issue_id"])
    op.create_index("ix_complaint_created_at", "complaints", ["created_at"])
    op.create_index("ix_complaint_hostel_category", "complaints", ["hostel", "category"])
    if is_postgres:
        op.execute("CREATE INDEX ix_complaint_embedding ON complaints USING ivfflat (embedding vector_cosine_ops)")

    op.create_table(
        "issue_events",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("issue_id", sa.String(), sa.ForeignKey("issues.id", ondelete="CASCADE"), nullable=False),
        sa.Column("actor_id", sa.String(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("from_status", sa.String(), nullable=True),
        sa.Column("to_status", sa.String(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_issue_event_issue_id", "issue_events", ["issue_id"])
    op.create_index("ix_issue_event_created_at", "issue_events", ["created_at"])

    op.create_table(
        "oauth_accounts",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("provider_account_id", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("provider", "provider_account_id", name="uq_oauth_provider_account"),
    )
    op.create_index("ix_oauth_user_id", "oauth_accounts", ["user_id"])


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP INDEX IF EXISTS ix_complaint_embedding")
    op.drop_table("oauth_accounts")
    op.drop_table("issue_events")
    op.drop_table("complaints")
    op.drop_table("issues")
    op.drop_table("users")
