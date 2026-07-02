import { FormEvent, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, LockKeyhole, MessageSquare, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { Complaint } from '../api/types'
import { AppShell } from '../components/AppShell'

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
      <div className="student-page student-reference-page">
        <section className="student-complaints-strip" aria-label="Complaint summary">
          <h1>Complaints</h1>
          {isLoading && <p>Loading your complaints...</p>}
          {!isLoading && sortedComplaints.length === 0 && <p>No complaints registered yet.</p>}
          {!isLoading && sortedComplaints.length > 0 && (
            <div>
              <p>
                You have {sortedComplaints.length} complaint{sortedComplaints.length === 1 ? '' : 's'} registered.
              </p>
              <Link to="/student/reports">View complaint dashboard</Link>
            </div>
          )}
        </section>

        <section className="student-submit-layout">
          <div className="student-copy-block">
            <p className="student-kicker">Hostel Grievance Redressal</p>
            <h2>Submit Your Grievance</h2>
            <p>
              Tell the hostel team what happened, where it happened, and who is affected. Your report is saved and tracked until the issue moves forward.
            </p>

            <div className="student-feature-list">
              <article>
                <CheckCircle2 aria-hidden="true" />
                <div>
                  <h3>Quick problem routing</h3>
                  <p>Your report is sent with hostel, location, and impact details so staff can act faster.</p>
                </div>
              </article>
              <article>
                <LockKeyhole aria-hidden="true" />
                <div>
                  <h3>Private student record</h3>
                  <p>Your complaint history remains visible to you after submission.</p>
                </div>
              </article>
              <article>
                <MessageSquare aria-hidden="true" />
                <div>
                  <h3>Clear communication</h3>
                  <p>Write naturally in English or Hinglish. A short, clear report is enough.</p>
                </div>
              </article>
            </div>
          </div>

          <div className="student-form-card">
            <div className="student-form-card-head">
              <div>
                <h2>Submit Complaint</h2>
                <p>Contact us for hostel grievance redressal</p>
              </div>
              <span>Quick Response</span>
            </div>
            <form onSubmit={submit} className="student-complaint-form">
              <div className="student-form-grid">
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
                  Room or exact location
                  <input
                    id="location-detail"
                    value={context.location}
                    onChange={(event) =>
                      setContext((current) => ({ ...current, location: event.target.value }))
                    }
                    maxLength={120}
                    placeholder="Room 214, 2nd floor..."
                  />
                </label>
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
              </div>

              <label htmlFor="complaint-text">
                Tell us about your grievance
                <textarea
                  id="complaint-text"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  minLength={5}
                  maxLength={2000}
                  rows={5}
                  placeholder="Example: Paani nahi aa raha since morning"
                  required
                />
                <small className={`counter ${characterTone}`}>{text.length}/2000</small>
              </label>

              <div className="student-permission-row">
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
              </div>
              {error && <p className="form-error">{error}</p>}
              <button className="primary-button student-submit-button" type="submit" disabled={isSubmitting}>
                <Send aria-hidden="true" />
                {isSubmitting ? 'Submitting...' : 'Submit report'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </AppShell>
  )
}
