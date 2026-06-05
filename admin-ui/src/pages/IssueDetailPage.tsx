import { FormEvent, useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ClipboardCheck, Clock, FileText, MessageSquareText, Save, ShieldAlert, Users } from 'lucide-react'

import { api } from '../api/client'
import type { IssueDetail, IssueStatus } from '../api/types'
import { AppShell } from '../components/AppShell'
import { StatusBadge } from '../components/StatusBadge'
import { formatDateTime } from '../utils/time'

const STATUSES: IssueStatus[] = ['OPEN', 'IN_PROGRESS', 'REOPENED', 'RESOLVED']
const NOTE_TEMPLATES = [
  'Maintenance owner assigned.',
  'Warden informed and student update sent.',
  'Inspection scheduled for today.',
  'Resolved after verification.',
]

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
    void load().catch((err) => setError(err instanceof Error ? err.message : 'Unable to load issue'))
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
      setError(err instanceof Error ? err.message : 'Unable to update status')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AppShell>
      <div className="detail-page">
        <Link className="back-link" to="/admin">
          <ArrowLeft aria-hidden="true" />
          Back to dashboard
        </Link>
        {error && <p className="form-error">{error}</p>}
        {!issue && <IssueDetailSkeleton />}
        {issue && (
          <>
            <section className="detail-hero">
              <div>
                <p className="eyebrow">{issue.hostel} / {issue.category}</p>
                <h1>{issue.title}</h1>
                <code>ISS-{issue.id.slice(0, 8)}</code>
                <p className="muted hero-copy">{issue.intelligence.recommended_action}</p>
                <div className="hero-signal-row">
                  <span>
                    <ShieldAlert aria-hidden="true" />
                    {issue.intelligence.health_label}
                  </span>
                  <span>
                    <Clock aria-hidden="true" />
                    {issue.intelligence.sla_status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <StatusBadge status={issue.status} />
            </section>

            <section className="metric-grid premium">
              <Metric icon={<ShieldAlert />} label="Priority" value={issue.priority_score} caption="Risk pressure" />
              <Metric
                icon={<Users />}
                label="Affected estimate"
                value={issue.intelligence.affected_students_estimate}
                caption="Student impact"
              />
              <Metric
                icon={<Clock />}
                label="SLA"
                value={formatSlaValue(issue.intelligence.minutes_remaining)}
                caption={issue.intelligence.minutes_remaining < 0 ? 'Overdue' : 'Remaining'}
              />
              <Metric icon={<ShieldAlert />} label="Health" value={issue.intelligence.health_score} caption="Operational score" />
            </section>

            <section className="workspace-grid">
              <div className="surface wide">
                <div className="section-heading compact">
                  <h2>Complaint evidence</h2>
                  <FileText aria-hidden="true" />
                </div>
                <div className="evidence-list">
                  {issue.complaints.length === 0 && (
                    <div className="empty-state">
                      <FileText aria-hidden="true" />
                      <p>No complaint evidence is attached yet.</p>
                    </div>
                  )}
                  {issue.complaints.map((complaint) => (
                    <article className="evidence-item" key={complaint.id}>
                      <div>
                        <strong>{complaint.urgency}</strong>
                        <p>{complaint.text}</p>
                        <code>CMP-{complaint.id.slice(0, 8)}</code>
                        <EvidenceContext complaint={complaint} />
                        <small>
                          {complaint.student_name ?? 'Student'} / {complaint.language} /{' '}
                          {complaint.embedding_status.replace('_', ' ')} /{' '}
                          {formatDateTime(complaint.created_at)}
                        </small>
                      </div>
                      <span>
                        {complaint.similarity_score ? `${Math.round(complaint.similarity_score * 100)}% match` : 'New signal'}
                      </span>
                    </article>
                  ))}
                </div>
              </div>

              <aside className="surface">
                <h2>Resolution update</h2>
                <form className="form-stack" onSubmit={submit}>
                  <label htmlFor="issue-status">
                    Status
                    <select id="issue-status" value={status} onChange={(event) => setStatus(event.target.value as IssueStatus)}>
                      {STATUSES.map((value) => (
                        <option key={value} value={value}>
                          {value.replace('_', ' ')}
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
                      placeholder="Add a short operational update"
                    />
                  </label>
                  <div className="note-templates" aria-label="Quick note templates">
                    {NOTE_TEMPLATES.map((template) => (
                      <button key={template} type="button" onClick={() => setNotes(template)}>
                        <MessageSquareText aria-hidden="true" />
                        {template}
                      </button>
                    ))}
                  </div>
                  <button className="primary-button" type="submit" disabled={isSaving}>
                    <Save aria-hidden="true" />
                    {isSaving ? 'Saving...' : 'Save status'}
                  </button>
                </form>
                <h2>Decision history</h2>
                <div className="timeline">
                  {issue.events.length === 0 && (
                    <div className="empty-state">
                      <ClipboardCheck aria-hidden="true" />
                      <p>No admin decisions recorded yet.</p>
                    </div>
                  )}
                  {issue.events.map((event) => (
                    <article className="timeline-item" key={event.id}>
                      <strong>{event.event_type.replace('_', ' ')}</strong>
                      {(event.to_status || event.from_status) && (
                        <span>
                          {event.from_status ? `${event.from_status.replace('_', ' ')} to ` : ''}
                          {event.to_status?.replace('_', ' ')}
                        </span>
                      )}
                      {event.notes && <p>{event.notes}</p>}
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
      {location && <span>{location}</span>}
      {impact && <span>{impact}</span>}
      {contact !== null && <span>{contact ? 'Contact allowed' : 'No contact needed'}</span>}
    </div>
  )
}

function Metric({ icon, label, value, caption }: { icon: ReactNode; label: string; value: number | string; caption: string }) {
  return (
    <div className="metric">
      <span className="metric-icon">{icon}</span>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{caption}</small>
    </div>
  )
}

function formatSlaValue(minutes: number) {
  if (minutes < 0) {
    return `${Math.abs(minutes)}m`
  }
  return `${minutes}m`
}

function IssueDetailSkeleton() {
  return (
    <div className="loading-stack" aria-live="polite" aria-label="Loading issue">
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
