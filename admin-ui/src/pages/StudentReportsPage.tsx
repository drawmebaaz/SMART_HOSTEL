import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { api } from '../api/client'
import type { Complaint } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { AppShell } from '../components/AppShell'
import { StatusBadge } from '../components/StatusBadge'
import { formatDateTime } from '../utils/time'

export default function StudentReportsPage() {
  const { user } = useAuth()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        setComplaints(await api.myComplaints())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load complaints')
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [])

  const sortedComplaints = useMemo(
    () =>
      [...complaints].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [complaints],
  )

  const openCount = sortedComplaints.filter((complaint) => complaint.issue_status !== 'RESOLVED').length

  return (
    <AppShell>
      <div className="student-dashboard-page">
        <section className="student-dashboard-head">
          <div>
            <p className="student-kicker">Student dashboard</p>
            <h1>My Complaints</h1>
            <p>Track every hostel problem you have reported and check what stage it is in.</p>
          </div>
          <aside className="student-profile-card" aria-label="Student account">
            <span>Account</span>
            <strong>{user?.name}</strong>
            <p>{user?.email}</p>
          </aside>
        </section>

        <section className="student-dashboard-summary" aria-label="Complaint summary">
          <article>
            <span>Total complaints</span>
            <strong>{sortedComplaints.length}</strong>
          </article>
          <article>
            <span>Still open</span>
            <strong>{openCount}</strong>
          </article>
          <article>
            <span>Resolved</span>
            <strong>{sortedComplaints.length - openCount}</strong>
          </article>
        </section>

        {error && <p className="form-error">{error}</p>}

        <section className="student-complaint-list" aria-label="Your submitted complaints">
          <div className="student-list-head">
            <div>
              <h2>Complaint history</h2>
              <p>{isLoading ? 'Loading complaints...' : `${sortedComplaints.length} saved complaint${sortedComplaints.length === 1 ? '' : 's'}`}</p>
            </div>
            <Link className="secondary-button student-new-report-link" to="/student">
              Submit another complaint
            </Link>
          </div>

          {isLoading && <StudentListSkeleton />}

          {!isLoading && sortedComplaints.length === 0 && (
            <div className="student-empty-dashboard">
              <h3>No complaints registered yet.</h3>
              <p>When you submit a hostel problem, it will appear here with its status.</p>
              <Link className="primary-button" to="/student">
                Submit complaint
              </Link>
            </div>
          )}

          <div className="student-report-cards">
            {sortedComplaints.map((complaint) => (
              <article className="student-report-card" key={complaint.id}>
                <div className="student-report-main">
                  <div>
                    <span className="student-report-id">{complaint.hostel}</span>
                    <h3>{displayProblemTitle(complaint.issue_title ?? `${complaint.category} problem`)}</h3>
                  </div>
                  {complaint.issue_status ? (
                    <StatusBadge status={complaint.issue_status} />
                  ) : (
                    <span className="status-muted">Pending</span>
                  )}
                </div>
                <p>{complaint.text}</p>
                <div className="student-report-meta">
                  <span>{complaint.category}</span>
                  <span>{complaint.urgency}</span>
                  <span>{formatDateTime(complaint.created_at)}</span>
                </div>
                {complaint.issue_recommended_action && (
                  <div className="student-report-note">
                    <strong>Current update</strong>
                    <span>{displayProblemTitle(complaint.issue_recommended_action)}</span>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  )
}

function displayProblemTitle(title: string) {
  return title.replace(/\bissue\b/gi, 'problem')
}

function StudentListSkeleton() {
  return (
    <div className="student-list-skeleton" aria-live="polite" aria-label="Loading complaints">
      <span />
      <span />
      <span />
    </div>
  )
}
