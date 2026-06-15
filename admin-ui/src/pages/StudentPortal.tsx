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
  'Water is not coming in my wing',
  'Bathroom cleaning has not happened',
  'Fan is not working',
  'Mess food issue',
  'Wi-Fi problem near my room',
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
            <h1>Tell us what&apos;s wrong in your hostel.</h1>
            <p className="muted hero-copy">
              Report water, electricity, hygiene, food, room, or maintenance issues. Similar reports are grouped so
              staff can fix repeated problems faster.
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
                <h2>Guided report</h2>
              </div>
              <span className={`counter ${characterTone}`}>{text.length}/2000</span>
            </div>
            <form onSubmit={submit} className="form-stack">
              <section className="report-section">
                <div>
                  <span className="step-number">1</span>
                  <h3>Where is the problem?</h3>
                  <p className="muted">Choose the hostel and add a specific place if you can.</p>
                </div>
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
              </section>

              <section className="report-section">
                <div>
                  <span className="step-number">2</span>
                  <h3>What happened?</h3>
                  <p className="muted">Write naturally in English or Hinglish. A short clear report is enough.</p>
                </div>
                <label htmlFor="complaint-text">
                  What is the problem?
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
                <div className="example-row">
                  {EXAMPLES.map((example) => (
                    <button key={example} type="button" onClick={() => setText(example)}>
                      <MessageSquareText aria-hidden="true" />
                      {example}
                    </button>
                  ))}
                </div>
              </section>

              <section className="report-section">
                <div>
                  <span className="step-number">3</span>
                  <h3>Who is affected?</h3>
                  <p className="muted">This helps staff understand how widely the problem is spreading.</p>
                </div>
                <label htmlFor="impact-scope">
                  Who is affected?
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
              </section>

              <section className="report-section compact-report-section">
                <div>
                  <span className="step-number">4</span>
                  <h3>Can staff contact you?</h3>
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
              </section>
              {error && <p className="form-error">{error}</p>}
              <button className="primary-button" type="submit" disabled={isSubmitting}>
                <Send aria-hidden="true" />
                {isSubmitting ? 'Submitting...' : 'Submit report'}
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
                <p>No report submitted yet. After submission, you will see the reference number and what happens next.</p>
              </div>
            )}
            {lastSubmission && (
              <div className="receipt-stack">
                <div className="result-panel received-panel">
                  <strong>Report received</strong>
                  <span>
                    Your report has been received. Similar reports may be grouped so hostel staff can fix the root
                    problem faster.
                  </span>
                </div>
                <ReceiptItem label="Reference" value={`CMP-${lastSubmission.complaint.id.slice(0, 8)}`} />
                <ReceiptItem label="Hostel" value={lastSubmission.complaint.hostel} />
                <ReceiptItem
                  label="Location"
                  value={metadataText(lastSubmission.complaint.metadata.location_detail, 'Not provided')}
                />
                <ReceiptItem label="Category" value={lastSubmission.classification.category} />
                <div className="result-panel">
                  <strong>{lastSubmission.issue.title}</strong>
                  <code>ISS-{lastSubmission.issue.id.slice(0, 8)}</code>
                  <StatusBadge status={lastSubmission.issue.status} />
                  <span>{lastSubmission.issue.intelligence.recommended_action}</span>
                </div>
                <div className="result-panel next-step-panel">
                  <strong>What happens next?</strong>
                  <span>
                    Hostel staff can review this report with similar complaints and update the status when work starts
                    or finishes.
                  </span>
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
                <p>No complaints yet. When you report an issue, it will appear here.</p>
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

function metadataText(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback
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
