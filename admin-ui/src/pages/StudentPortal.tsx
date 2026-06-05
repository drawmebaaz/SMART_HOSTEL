import { FormEvent, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ClipboardCheck, FileText, Languages, LockKeyhole, MessageSquareText, Send, ShieldCheck } from 'lucide-react'

import { api } from '../api/client'
import type { Complaint, ComplaintSubmissionResponse } from '../api/types'
import { AppShell } from '../components/AppShell'
import { StatusBadge } from '../components/StatusBadge'
import { formatDateTime } from '../utils/time'

const HOSTELS = ['BH-1', 'BH-2', 'BH-3', 'BH-4', 'BH-5', 'GH-1', 'GH-2', 'GH-3', 'New Hostel', 'Old Hostel']
const IMPACT_OPTIONS = ['Only my room', 'Same floor', 'Whole wing', 'Common area', 'Multiple students']
const EXAMPLES = [
  'Paani nahi aa raha in BH-3 washroom since morning',
  'Electric spark near the second floor switchboard',
  'WiFi keeps disconnecting during online classes',
]

export default function StudentPortal() {
  const [text, setText] = useState('')
  const [hostel, setHostel] = useState(HOSTELS[0])
  const [context, setContext] = useState({
    location: '',
    impact: IMPACT_OPTIONS[0],
    contactPermission: true,
  })
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [lastSubmission, setLastSubmission] = useState<ComplaintSubmissionResponse | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadComplaints = async () => {
    setIsLoading(true)
    const result = await api.myComplaints()
    setComplaints(result)
    setIsLoading(false)
  }

  useEffect(() => {
    void loadComplaints().catch((err) => {
      setError(err instanceof Error ? err.message : 'Unable to load complaints')
      setIsLoading(false)
    })
  }, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')
    try {
      const result = await api.submitComplaint({
        text,
        hostel,
        metadata: {
          source: 'student_portal',
          location_detail: context.location.trim() || null,
          impact_scope: context.impact,
          contact_permission: context.contactPermission,
        },
      })
      setLastSubmission(result)
      setText('')
      setContext((current) => ({ ...current, location: '' }))
      await loadComplaints()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit complaint')
    } finally {
      setIsSubmitting(false)
    }
  }

  const characterTone = useMemo(() => {
    if (text.length > 1600) return 'limit-warn'
    if (text.length > 40) return 'limit-good'
    return ''
  }, [text.length])

  return (
    <AppShell>
      <div className="student-page">
        <section className="student-hero">
          <div>
            <p className="eyebrow">Student help desk</p>
            <h1>Report a hostel problem</h1>
            <p className="muted hero-copy">
              Write in English or Hinglish. Your complaint is saved and sent to the right hostel staff for review.
            </p>
            <div className="hero-signal-row">
              <span>
                <LockKeyhole aria-hidden="true" />
                Private
              </span>
              <span>
                <ClipboardCheck aria-hidden="true" />
                Track status
              </span>
            </div>
          </div>
          <div className="trust-strip">
            <span>
              <Languages aria-hidden="true" />
              English + Hinglish
            </span>
            <span>
              <ShieldCheck aria-hidden="true" />
              Staff reviewed
            </span>
            <span>
              <CheckCircle2 aria-hidden="true" />
              Issue linked
            </span>
          </div>
        </section>

        <section className="workspace-grid">
          <div className="surface wide submit-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">New complaint</p>
                <h2>Tell us what happened</h2>
              </div>
              <span className={`counter ${characterTone}`}>{text.length}/2000</span>
            </div>
            <form onSubmit={submit} className="form-stack">
              <label htmlFor="hostel-select">
                Hostel
                <select id="hostel-select" value={hostel} onChange={(event) => setHostel(event.target.value)}>
                  {HOSTELS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="complaint-text">
                Complaint
                <textarea
                  id="complaint-text"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  minLength={5}
                  maxLength={2000}
                  rows={8}
                  placeholder="Example: Paani nahi aa raha in BH-3 washroom since morning"
                  required
                />
              </label>
              <div className="context-grid">
                <label htmlFor="location-detail">
                  Exact location <small>Optional</small>
                  <input
                    id="location-detail"
                    value={context.location}
                    onChange={(event) =>
                      setContext((current) => ({ ...current, location: event.target.value }))
                    }
                    maxLength={120}
                    placeholder="Room 214, 2nd floor washroom, mess counter..."
                  />
                </label>
                <label htmlFor="impact-scope">
                  Impact
                  <select
                    id="impact-scope"
                    value={context.impact}
                    onChange={(event) =>
                      setContext((current) => ({ ...current, impact: event.target.value }))
                    }
                  >
                    {IMPACT_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="checkbox-row" htmlFor="contact-permission">
                <input
                  id="contact-permission"
                  type="checkbox"
                  checked={context.contactPermission}
                  onChange={(event) =>
                    setContext((current) => ({ ...current, contactPermission: event.target.checked }))
                  }
                />
                <span>Allow hostel staff to contact me if they need clarification.</span>
              </label>
              <div className="example-row">
                {EXAMPLES.map((example) => (
                  <button key={example} type="button" onClick={() => setText(example)}>
                    <MessageSquareText aria-hidden="true" />
                    {example}
                  </button>
                ))}
              </div>
              {error && <p className="form-error">{error}</p>}
              <button className="primary-button" type="submit" disabled={isSubmitting}>
                <Send aria-hidden="true" />
                {isSubmitting ? 'Submitting...' : 'Submit complaint'}
              </button>
            </form>
          </div>

          <aside className="surface ai-receipt">
            <div className="section-heading compact">
              <h2>Complaint details</h2>
              <ClipboardCheck aria-hidden="true" />
            </div>
            {!lastSubmission && (
              <div className="receipt-placeholder">
                <FileText aria-hidden="true" />
                <p>Submit a complaint to see what we understood and where it was sent.</p>
              </div>
            )}
            {lastSubmission && (
              <div className="receipt-stack">
                <ReceiptItem label="Reference" value={`CMP-${lastSubmission.complaint.id.slice(0, 8)}`} />
                <ReceiptItem label="Category" value={lastSubmission.classification.category} />
                <ReceiptItem label="Urgency" value={lastSubmission.classification.urgency} />
                <ReceiptItem label="Language" value={lastSubmission.classification.language} />
                <div className="result-panel">
                  <strong>{lastSubmission.issue.title}</strong>
                  <code>ISS-{lastSubmission.issue.id.slice(0, 8)}</code>
                  <StatusBadge status={lastSubmission.issue.status} />
                  <span>{lastSubmission.issue.intelligence.recommended_action}</span>
                </div>
              </div>
            )}
          </aside>
        </section>

        <section className="surface history-panel">
          <div className="section-heading compact">
            <h2>Your recent complaints</h2>
            <FileText aria-hidden="true" />
          </div>
          <div className="student-history">
            {isLoading && <HistorySkeleton />}
            {!isLoading && complaints.length === 0 && (
              <div className="empty-state">
                <FileText aria-hidden="true" />
                <p>No complaints submitted yet.</p>
              </div>
            )}
            {complaints.map((complaint) => (
              <article className="history-row" key={complaint.id}>
                <div>
                  <div className="history-title">
                    <strong>{complaint.issue_title ?? `${complaint.category} issue`}</strong>
                    {complaint.issue_status && <StatusBadge status={complaint.issue_status} />}
                  </div>
                  <p>{complaint.text}</p>
                  <code>CMP-{complaint.id.slice(0, 8)}</code>
                  <EvidenceContext complaint={complaint} />
                  {complaint.issue_recommended_action && (
                    <small className="history-action">{complaint.issue_recommended_action}</small>
                  )}
                </div>
                <div className="history-meta">
                  <span>{complaint.hostel}</span>
                  <span>{complaint.urgency}</span>
                  {complaint.issue_sla_status && <span>{formatTimeStatus(complaint.issue_sla_status)}</span>}
                  <small>{formatDateTime(complaint.created_at)}</small>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  )
}

function ReceiptItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="receipt-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function EvidenceContext({ complaint }: { complaint: Complaint }) {
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

function formatTimeStatus(status: string) {
  const labels: Record<string, string> = {
    ON_TRACK: 'On time',
    AT_RISK: 'Due soon',
    BREACHED: 'Late',
    RESOLVED: 'Done',
  }
  return labels[status] ?? status.replace('_', ' ')
}

function HistorySkeleton() {
  return (
    <div className="history-skeleton" aria-live="polite" aria-label="Loading recent complaints">
      <span />
      <span />
      <span />
    </div>
  )
}
