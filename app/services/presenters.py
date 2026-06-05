from app.db.models.complaint import ComplaintModel
from app.db.models.issue import IssueModel
from app.db.models.issue_event import IssueEventModel
from datetime import datetime, timedelta, timezone


def utc_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def priority_score(issue: IssueModel) -> float:
    volume = min(issue.complaint_count * 4.0, 30.0)
    duplicate_pressure = min(issue.duplicate_count * 2.0, 10.0)
    urgency = issue.urgency_score_avg * 0.6
    status_boost = 5.0 if issue.status == "REOPENED" else 0.0
    return round(min(100.0, urgency + volume + duplicate_pressure + status_boost), 1)


def issue_intelligence(issue: IssueModel) -> dict:
    urgency_rank = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}
    sla_hours = {"LOW": 72, "MEDIUM": 48, "HIGH": 12, "CRITICAL": 2}.get(issue.urgency_max, 48)
    created_at = utc_datetime(issue.created_at) or datetime.now(timezone.utc)
    due_at = created_at + timedelta(hours=sla_hours)
    now = datetime.now(timezone.utc)
    minutes_remaining = int((due_at - now).total_seconds() // 60)
    elapsed_ratio = max(0.0, min(1.4, (now - created_at).total_seconds() / (sla_hours * 3600)))

    if issue.status == "RESOLVED":
        sla_status = "RESOLVED"
    elif minutes_remaining < 0:
        sla_status = "BREACHED"
    elif elapsed_ratio >= 0.75:
        sla_status = "AT_RISK"
    else:
        sla_status = "ON_TRACK"

    pressure = priority_score(issue)
    freshness_boost = 12 if issue.last_complaint_at and issue.last_complaint_at == issue.updated_at else 0
    health_score = max(0, round(100 - pressure - freshness_boost))
    if health_score >= 75:
        health_label = "HEALTHY"
    elif health_score >= 55:
        health_label = "WATCH"
    elif health_score >= 35:
        health_label = "RISK"
    else:
        health_label = "ESCALATE"

    if issue.urgency_max == "CRITICAL" or sla_status in {"BREACHED", "AT_RISK"}:
        recommendation = "Escalate to warden and assign maintenance owner now"
    elif issue.complaint_count >= 4:
        recommendation = "Batch related reports and send a consolidated work order"
    elif urgency_rank.get(issue.urgency_max, 0) >= 3:
        recommendation = "Acknowledge publicly and start resolution tracking"
    else:
        recommendation = "Monitor, acknowledge, and resolve in normal queue"

    return {
        "priority_score": priority_score(issue),
        "health_score": health_score,
        "health_label": health_label,
        "sla_status": sla_status,
        "sla_due_at": due_at,
        "minutes_remaining": minutes_remaining,
        "recommended_action": recommendation,
        "affected_students_estimate": max(issue.complaint_count, issue.complaint_count * 2),
        "urgency_rank": urgency_rank.get(issue.urgency_max, 2),
    }


def complaint_public(complaint: ComplaintModel) -> dict:
    linked_issue = complaint.issue
    linked_issue_intelligence = issue_intelligence(linked_issue) if linked_issue else None
    return {
        "id": complaint.id,
        "issue_id": complaint.issue_id,
        "text": complaint.text,
        "normalized_text": complaint.normalized_text,
        "language": complaint.language,
        "hostel": complaint.hostel,
        "category": complaint.category,
        "urgency": complaint.urgency,
        "urgency_score": complaint.urgency_score,
        "is_duplicate": complaint.is_duplicate,
        "duplicate_of": complaint.duplicate_of,
        "similarity_score": complaint.similarity_score,
        "embedding_status": complaint.embedding_status,
        "metadata": complaint.extra_metadata or {},
        "student_name": complaint.student.name if complaint.student else None,
        "issue_title": linked_issue.title if linked_issue else None,
        "issue_status": linked_issue.status if linked_issue else None,
        "issue_priority_score": linked_issue_intelligence["priority_score"] if linked_issue_intelligence else None,
        "issue_sla_status": linked_issue_intelligence["sla_status"] if linked_issue_intelligence else None,
        "issue_recommended_action": linked_issue_intelligence["recommended_action"] if linked_issue_intelligence else None,
        "created_at": utc_datetime(complaint.created_at),
    }


def issue_summary(issue: IssueModel) -> dict:
    intelligence = issue_intelligence(issue)
    return {
        "id": issue.id,
        "title": issue.title,
        "hostel": issue.hostel,
        "category": issue.category,
        "status": issue.status,
        "urgency_max": issue.urgency_max,
        "urgency_score_avg": round(issue.urgency_score_avg, 1),
        "complaint_count": issue.complaint_count,
        "duplicate_count": issue.duplicate_count,
        "priority_score": intelligence["priority_score"],
        "intelligence": intelligence,
        "last_complaint_at": utc_datetime(issue.last_complaint_at),
        "created_at": utc_datetime(issue.created_at),
        "updated_at": utc_datetime(issue.updated_at),
        "resolved_at": utc_datetime(issue.resolved_at),
    }


def issue_event_public(event: IssueEventModel) -> dict:
    return {
        "id": event.id,
        "event_type": event.event_type,
        "actor_id": event.actor_id,
        "from_status": event.from_status,
        "to_status": event.to_status,
        "notes": event.notes,
        "created_at": utc_datetime(event.created_at),
    }


def issue_detail(issue: IssueModel) -> dict:
    data = issue_summary(issue)
    data["description"] = issue.description
    data["complaints"] = [complaint_public(complaint) for complaint in issue.complaints]
    data["events"] = [issue_event_public(event) for event in issue.events]
    return data
