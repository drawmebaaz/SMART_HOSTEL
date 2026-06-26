import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Send } from 'lucide-react'
import { api } from '../api/client'
import type { Complaint } from '../api/types'
import { AppShell } from '../components/AppShell'
import { StatusBadge } from '../components/StatusBadge'
import { formatDateTime } from '../utils/time'

const HOSTELS = ['BH-1', 'BH-2', 'BH-3', 'BH-4', 'BH-5', 'GH-1', 'GH-2', 'GH-3', 'New Hostel', 'Old Hostel']
const IMPACT_OPTIONS = ['Only my room', 'Same floor', 'Whole wing', 'Common area', 'Multiple students']
export default function StudentPortal() {
  const [text, setText] = useState('')
  const [hostel, setHostel] = useState(HOSTELS[0])
  const [context, setContext] = useState({
    location: '',
    impact: IMPACT_OPTIONS[0],
    contactPermission: true,
  })
  const [complaints, setComplaints] = useState<Complaint[]>([])
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
      setError(err instanceof Error ? err.message : 'Unable to load reports')
      setIsLoading(false)
    })
  }, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')
    try {
      await api.submitComplaint({
        text,
        hostel,
        metadata: {
          source: 'student_portal',
          location_detail: context.location.trim() || null,
          impact_scope: context.impact,
          contact_permission: context.contactPermission,
        },
      })

      setText('')
      setContext((current) => ({ ...current, location: '' }))
      await loadComplaints()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit report')
    } finally {
      setIsSubmitting(false)
    }
  }

  const characterTone = useMemo(() => {
    if (text.length > 1600) return 'limit-warn'
    if (text.length > 40) return 'limit-good'
    return ''
  }, [text.length])

  const sortedComplaints = useMemo(
    () =>
      [...complaints].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [complaints],
  )

  return (
    <AppShell>
      <div className="student-page">
        <section className="student-intro">
          <div>
            <p className="eyebrow">Student portal</p>
            <h1>Report a hostel problem</h1>
            <p className="muted">
              Tell the hostel team what happened, where it happened, and who is affected. Your recent reports stay visible here.
            </p>
          </div>
        </section>
        <section className="workspace-grid">
          <div className="surface wide submit-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">New report</p>
                <h2>Report details</h2>
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

          <aside className="surface ai-receipt complaint-details-panel">
            <div className="section-heading compact">
              <div>
                <h2>Your reports</h2>
                <p className="muted">{sortedComplaints.length} report{sortedComplaints.length === 1 ? '' : 's'} sent</p>
              </div>
            </div>

            <div className="complaint-details-scroll">
              {isLoading && <HistorySkeleton />}

              {!isLoading && sortedComplaints.length === 0 && (
                <div className="empty-state">
                  <p>No reports yet. When you report a problem, it will appear here.</p>
                </div>
              )}

              {sortedComplaints.map((complaint) => (
                <article className="complaint-card" key={complaint.id}>
                  <div className="complaint-card-header">
                    <strong>{displayProblemTitle(complaint.issue_title ?? `${complaint.category} problem`)}</strong>

                    {complaint.issue_status ? (
                      <StatusBadge status={complaint.issue_status} />
                    ) : (
                      <span className="status-muted">Pending</span>
                    )}
                  </div>

                  <p className="complaint-text">{complaint.text}</p>

                  <ComplaintLocation complaint={complaint} />

                  <div className="complaint-card-footer">
                    <span>{formatDateTime(complaint.created_at)}</span>
                  </div>
                </article>
              ))}
            </div>
          </aside>
        </section>
      </div>
    </AppShell>
  )
}

function ComplaintLocation({ complaint }: { complaint: Complaint }) {
  const location = typeof complaint.metadata.location_detail === 'string' ? complaint.metadata.location_detail : ''

  if (!location.trim()) {
    return null
  }

  return <span className="complaint-location">Location: {location}</span>
}

function displayProblemTitle(title: string) {
  return title.replace(/\bissue\b/gi, 'problem')
}

function HistorySkeleton() {
  return (
    <div className="history-skeleton" aria-live="polite" aria-label="Loading recent reports">
      <span />
      <span />
      <span />
    </div>
  )
}
