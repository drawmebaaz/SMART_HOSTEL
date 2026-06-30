import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'

import { api } from '../api/client'
import type { IssueDetail, IssueStatus } from '../api/types'
import { AppShell } from '../components/AppShell'
import { StatusBadge } from '../components/StatusBadge'
import { formatDateTime } from '../utils/time'

const STATUSES: IssueStatus[] = ['OPEN', 'IN_PROGRESS', 'REOPENED', 'RESOLVED']

export default function IssueDetailPage() {
  const { issueId } = useParams()
  const [issue, setIssue] = useState<IssueDetail | null>(null)
  const [status, setStatus] = useState<IssueStatus>('OPEN')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const load = useCallback(async () => {
    if (!issueId) return
    const result = await api.issue(issueId)
    setIssue(result)
    setStatus(result.status)
  }, [issueId])

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : 'Unable to load problem'))
  }, [load])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!issueId) return
    setIsSaving(true)
    setError('')
    try {
      await api.updateIssueStatus(issueId, status, notes || undefined)
      setNotes('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save update')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AppShell>
      <div className="detail-page">
        <Link className="back-link" to="/admin">
          <ArrowLeft aria-hidden="true" />
          Back to staff board
        </Link>
        {error && <p className="form-error">{error}</p>}
        {!issue && <IssueDetailSkeleton />}
        {issue && (
          <>
            <section className="detail-hero">
              <div>
                <p className="eyebrow">{issue.hostel} / {issue.category}</p>
                <h1>{displayProblemTitle(issue.title)}</h1>
                <p className="muted hero-copy">{displayAction(issue.intelligence.recommended_action)}</p>
                <p className="detail-subline">
                  {formatCondition(issue.intelligence.health_label)} / {formatTimeStatus(issue.intelligence.sla_status)}
                </p>
                <dl className="detail-facts">
                  <div>
                    <dt>Need</dt>
                    <dd>{formatNeedLevel(issue.priority_score, issue.intelligence.sla_status)}</dd>
                  </div>
                  <div>
                    <dt>Students affected</dt>
                    <dd>{issue.intelligence.affected_students_estimate}</dd>
                  </div>
                  <div>
                    <dt>Time</dt>
                    <dd>{formatTimeStatus(issue.intelligence.sla_status)}</dd>
                  </div>
                  <div>
                    <dt>Reports</dt>
                    <dd>{issue.complaint_count}</dd>
                  </div>
                </dl>
              </div>
              <div className="detail-status-wrap">
                <StatusBadge status={issue.status} />
              </div>
            </section>

            <section className="workspace-grid">
              <div className="surface wide evidence-panel">
                <div className="section-heading compact">
                  <h2>Student reports</h2>
                </div>
                <div className="evidence-list">
                  {issue.complaints.length === 0 && (
                    <div className="empty-state">
                      <p>No student reports are attached yet.</p>
                    </div>
                  )}
                  {issue.complaints.map((complaint) => (
                    <article className="evidence-item" key={complaint.id}>
                      <div>
                        <strong>{formatUrgency(complaint.urgency)}</strong>
                        <p>{complaint.text}</p>
                        <EvidenceContext complaint={complaint} />
                        <small>
                          {complaint.student_name ?? 'Student'} / {formatDateTime(complaint.created_at)}
                        </small>
                      </div>
                      <span className="report-relation">
                        {complaint.similarity_score ? 'Related report' : 'First report'}
                      </span>
                    </article>
                  ))}
                </div>
              </div>

              <aside className="surface work-update-panel">
                <h2>Work update</h2>
                <form className="form-stack" onSubmit={submit}>
                  <label htmlFor="issue-status">
                    Progress
                    <select id="issue-status" value={status} onChange={(event) => setStatus(event.target.value as IssueStatus)}>
                      {STATUSES.map((value) => (
                        <option key={value} value={value}>
                          {formatStatus(value)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label htmlFor="issue-notes">
                    Notes
                    <textarea
                      id="issue-notes"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      rows={4}
                      placeholder="Add a short update"
                    />
                  </label>
                  <button className="primary-button" type="submit" disabled={isSaving}>
                    <Save aria-hidden="true" />
                    {isSaving ? 'Saving...' : 'Save update'}
                  </button>
                </form>
                <h2>Staff updates</h2>
                <div className="timeline issue-log-scroll">
                  {issue.events.length === 0 && (
                    <div className="empty-state">
                      <p>No staff updates recorded yet.</p>
                    </div>
                  )}
                  {issue.events.map((event) => (
                    <article className="timeline-item" key={event.id}>
                      <strong>{formatEventType(event.event_type)}</strong>
                      {(event.to_status || event.from_status) && (
                        <span>
                          {event.from_status ? `${formatEventStatus(event.from_status)} to ` : ''}
                          {event.to_status ? formatEventStatus(event.to_status) : ''}
                        </span>
                      )}
                      {event.notes && <p>{displayHistoryNote(event.notes)}</p>}
                      <small>{formatDateTime(event.created_at)}</small>
                    </article>
                  ))}
                </div>
              </aside>
            </section>
          </>
        )}
      </div>
    </AppShell>
  )
}

function formatTimeStatus(status: string) {
  const labels: Record<string, string> = {
    ON_TRACK: 'On time',
    AT_RISK: 'Due soon',
    BREACHED: 'Late',
    RESOLVED: 'Done',
  }
  return labels[status] ?? status.replace('_', ' ')
}

function formatStatus(status: IssueStatus) {
  const labels: Record<IssueStatus, string> = {
    OPEN: 'New',
    IN_PROGRESS: 'Being fixed',
    REOPENED: 'Needs review',
    RESOLVED: 'Resolved',
  }
  return labels[status]
}

function formatCondition(label: string) {
  const labels: Record<string, string> = {
    HEALTHY: 'Looks okay',
    WATCH: 'Keep watch',
    RISK: 'Needs attention',
    ESCALATE: 'Act soon',
  }
  return labels[label] ?? label.replace('_', ' ')
}

function formatNeedLevel(value: number, timeStatus?: string) {
  if (timeStatus === 'BREACHED') return 'High'
  if (timeStatus === 'AT_RISK' && value < 40) return 'Medium'
  if (value >= 70) return 'High'
  if (value >= 40) return 'Medium'
  return 'Low'
}

function displayProblemTitle(title: string) {
  return title.replace(/\bissue\b/gi, 'problem')
}

function displayAction(action: string) {
  return action.replace(/\bissues\b/gi, 'problems').replace(/\bissue\b/gi, 'problem')
}

function displayHistoryNote(note: string) {
  return note
    .replace(/\bcomplaints\b/gi, 'reports')
    .replace(/\bcomplaint\b/gi, 'report')
    .replace(/\bissues\b/gi, 'problems')
    .replace(/\bissue\b/gi, 'problem')
}

function formatUrgency(urgency: string) {
  const labels: Record<string, string> = {
    LOW: 'Low',
    MEDIUM: 'Medium',
    HIGH: 'High',
    CRITICAL: 'Urgent',
  }
  return labels[urgency] ?? urgency.replaceAll('_', ' ').toLowerCase()
}

function formatEventType(eventType: string) {
  const labels: Record<string, string> = {
    issue_created: 'Problem created',
    complaint_added: 'Student report added',
    status_changed: 'Progress changed',
  }
  return labels[eventType] ?? eventType.replaceAll('_', ' ')
}

function formatEventStatus(status: string) {
  const labels: Record<string, string> = {
    OPEN: 'New',
    IN_PROGRESS: 'Being fixed',
    REOPENED: 'Needs review',
    RESOLVED: 'Resolved',
  }
  return labels[status] ?? status.replace('_', ' ')
}

function EvidenceContext({ complaint }: { complaint: IssueDetail['complaints'][number] }) {
  const location = typeof complaint.metadata.location_detail === 'string' ? complaint.metadata.location_detail : ''
  const impact = typeof complaint.metadata.impact_scope === 'string' ? complaint.metadata.impact_scope : ''
  const contact =
    typeof complaint.metadata.contact_permission === 'boolean' ? complaint.metadata.contact_permission : null
  if (!location && !impact && contact === null) {
    return null
  }
  return (
    <div className="evidence-context">
      {location && <span>Location: {location}</span>}
      {impact && <span>Affected: {impact}</span>}
      {contact !== null && <span>{contact ? 'Contact allowed' : 'No contact needed'}</span>}
    </div>
  )
}

function IssueDetailSkeleton() {
  return (
    <div className="loading-stack" aria-live="polite" aria-label="Loading problem">
      <div className="skeleton-panel hero-skeleton" />
      <div className="skeleton-grid">
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}
