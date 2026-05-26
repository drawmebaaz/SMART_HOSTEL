export type UserRole = 'STUDENT' | 'ADMIN'
export type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'REOPENED'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface Complaint {
  id: string
  issue_id: string
  text: string
  normalized_text: string
  language: string
  hostel: string
  category: string
  urgency: string
  urgency_score: number
  is_duplicate: boolean
  duplicate_of: string | null
  similarity_score: number | null
  embedding_status: string
  created_at: string
}

export interface IssueSummary {
  id: string
  title: string
  hostel: string
  category: string
  status: IssueStatus
  urgency_max: string
  urgency_score_avg: number
  complaint_count: number
  duplicate_count: number
  priority_score: number
  intelligence: {
    priority_score: number
    health_score: number
    health_label: 'HEALTHY' | 'WATCH' | 'RISK' | 'ESCALATE'
    sla_status: 'ON_TRACK' | 'AT_RISK' | 'BREACHED' | 'RESOLVED'
    sla_due_at: string
    minutes_remaining: number
    recommended_action: string
    affected_students_estimate: number
    urgency_rank: number
  }
  last_complaint_at: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
}

export interface IssueEvent {
  id: string
  event_type: string
  actor_id: string | null
  from_status: string | null
  to_status: string | null
  notes: string | null
  created_at: string
}

export interface IssueDetail extends IssueSummary {
  description: string | null
  complaints: Complaint[]
  events: IssueEvent[]
}

export interface DashboardSummary {
  total_open: number
  total_in_progress: number
  total_resolved: number
  total_reopened: number
  critical_issues: number
  complaints_total: number
  duplicates_total: number
  category_breakdown: Record<string, number>
  hostel_breakdown: Record<string, number>
  sla_breakdown: Record<string, number>
  ai_runtime: string
  issues: IssueSummary[]
}

export interface ComplaintSubmissionResponse {
  complaint: Complaint
  classification: {
    normalized_text: string
    language: string
    category: string
    category_confidence: number
    urgency: string
    urgency_score: number
    urgency_confidence: number
    embedding_status: string
    warnings: string[]
  }
  issue: IssueSummary
}
