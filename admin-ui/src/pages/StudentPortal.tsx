import { FormEvent, useEffect, useMemo, useState } from 'react'
import { BrainCircuit, CheckCircle2, FileText, Languages, LockKeyhole, Send, Sparkles, Zap } from 'lucide-react'

import { api } from '../api/client'
import type { Complaint, ComplaintSubmissionResponse } from '../api/types'
import { AppShell } from '../components/AppShell'
import { formatDateTime } from '../utils/time'

const HOSTELS = ['BH-1', 'BH-2', 'BH-3', 'BH-4', 'BH-5', 'GH-1', 'GH-2', 'GH-3', 'New Hostel', 'Old Hostel']
const EXAMPLES = [
  'Paani nahi aa raha in BH-3 washroom since morning',
  'Electric spark near the second floor switchboard',
  'WiFi keeps disconnecting during online classes',
]

export default function StudentPortal() {
  const [text, setText] = useState('')
  const [hostel, setHostel] = useState(HOSTELS[0])
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
        metadata: { source: 'student_portal' },
      })
      setLastSubmission(result)
      setText('')
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
            <p className="eyebrow">Student portal</p>
            <h1>Report hostel issues in natural language</h1>
            <p className="muted hero-copy">
              Write in English or Hinglish. The system normalizes, classifies, prioritizes, and attaches your report to the right operational issue.
            </p>
            <div className="hero-signal-row">
              <span>
                <LockKeyhole aria-hidden="true" />
                Private intake
              </span>
              <span>
                <Zap aria-hidden="true" />
                Instant triage
              </span>
            </div>
          </div>
          <div className="trust-strip">
            <span>
              <Languages aria-hidden="true" />
              English + Hinglish
            </span>
            <span>
              <BrainCircuit aria-hidden="true" />
              AI triage
            </span>
            <span>
              <CheckCircle2 aria-hidden="true" />
              Trackable issue
            </span>
          </div>
        </section>

        <section className="workspace-grid">
          <div className="surface wide submit-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">New grievance</p>
                <h2>Submit a grievance</h2>
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
              <div className="example-row">
                {EXAMPLES.map((example) => (
                  <button key={example} type="button" onClick={() => setText(example)}>
                    <Sparkles aria-hidden="true" />
                    {example}
                  </button>
                ))}
              </div>
              {error && <p className="form-error">{error}</p>}
              <button className="primary-button" type="submit" disabled={isSubmitting}>
                <Send aria-hidden="true" />
                {isSubmitting ? 'Submitting...' : 'Submit grievance'}
              </button>
            </form>
          </div>

          <aside className="surface ai-receipt">
            <div className="section-heading compact">
              <h2>AI receipt</h2>
              <Sparkles aria-hidden="true" />
            </div>
            {!lastSubmission && (
              <div className="receipt-placeholder">
                <BrainCircuit aria-hidden="true" />
                <p>Submit a report to see classification, urgency, language detection, and issue assignment.</p>
              </div>
            )}
            {lastSubmission && (
              <div className="receipt-stack">
                <ReceiptItem label="Category" value={lastSubmission.classification.category} />
                <ReceiptItem label="Urgency" value={lastSubmission.classification.urgency} />
                <ReceiptItem label="Language" value={lastSubmission.classification.language} />
                <ReceiptItem label="Embedding" value={lastSubmission.classification.embedding_status.replace('_', ' ')} />
                <div className="result-panel">
                  <strong>{lastSubmission.issue.title}</strong>
                  <span>{lastSubmission.issue.intelligence.recommended_action}</span>
                </div>
              </div>
            )}
          </aside>
        </section>

        <section className="surface history-panel">
          <div className="section-heading compact">
            <h2>Your recent signals</h2>
            <FileText aria-hidden="true" />
          </div>
          <div className="student-history">
            {isLoading && <HistorySkeleton />}
            {!isLoading && complaints.length === 0 && (
              <div className="empty-state">
                <Sparkles aria-hidden="true" />
                <p>No complaints submitted yet.</p>
              </div>
            )}
            {complaints.map((complaint) => (
              <article className="history-row" key={complaint.id}>
                <div>
                  <strong>{complaint.category}</strong>
                  <p>{complaint.text}</p>
                </div>
                <div className="history-meta">
                  <span>{complaint.hostel}</span>
                  <span>{complaint.urgency}</span>
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

function HistorySkeleton() {
  return (
    <div className="history-skeleton" aria-live="polite" aria-label="Loading recent complaints">
      <span />
      <span />
      <span />
    </div>
  )
}
