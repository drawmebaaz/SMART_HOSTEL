import { useEffect, useMemo, useState } from 'react'
import type React from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, BarChart3, Clock3, ListChecks, RefreshCw, ShieldCheck } from 'lucide-react'

import { api } from '../api/client'
import type { DashboardSummary, IssueSummary } from '../api/types'
import { AppShell } from '../components/AppShell'
import { StatusBadge } from '../components/StatusBadge'
import { formatDateTime } from '../utils/time'
import {
  displayAction,
  displayProblemTitle,
  formatNeedLevel,
  formatTimeStatus,
  issueShortId,
  percentage,
  sortProblemsForStaff,
} from './adminPageUtils'

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const load = async () => {
    setIsLoading(true)
    setError('')
    try {
      setDashboard(await api.dashboard())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const attentionIssues = useMemo(
    () =>
      dashboard
        ? dashboard.issues
            .filter((issue) => issue.status !== 'RESOLVED')
            .sort(sortProblemsForStaff)
        : [],
    [dashboard],
  )

  const topIssue = attentionIssues[0]
  const nextIssues = attentionIssues.slice(1, 5)
  const lateCount = dashboard?.sla_breakdown.BREACHED ?? 0
  const dueSoonCount = dashboard?.sla_breakdown.AT_RISK ?? 0

  return (
    <AppShell>
      <div className="ops-page admin-command-page">
        <section className="admin-command-hero">
          <div>
            <p className="eyebrow">Operations command center</p>
            <h1>Resolve hostel issues before they escalate.</h1>
            <p>
              Prioritize repeated student reports, track time pressure, and move each hostel problem through resolution.
            </p>
          </div>
          <div className="command-signal-row" aria-label="Current operations signals">
            <span>Critical {dashboard?.critical_issues ?? 0}</span>
            <span>Late {lateCount}</span>
            <span>Due soon {dueSoonCount}</span>
            <span>Open {dashboard?.total_open ?? 0}</span>
          </div>
        </section>

        {error && <p className="form-error">{error}</p>}
        {isLoading && <DashboardSkeleton />}

        {dashboard && (
          <>
            <section className="admin-briefing-layout">
              <PriorityCard issue={topIssue} />
              <div className="admin-metric-grid" aria-label="Key dashboard metrics">
                <MetricCard
                  caption="Need staff attention"
                  icon={<AlertTriangle aria-hidden="true" />}
                  label="Critical issues"
                  value={dashboard.critical_issues}
                />
                <MetricCard
                  caption="Past expected response"
                  icon={<Clock3 aria-hidden="true" />}
                  label="Late problems"
                  value={lateCount}
                />
                <MetricCard
                  caption="Review before they slip"
                  icon={<ShieldCheck aria-hidden="true" />}
                  label="Due soon"
                  value={dueSoonCount}
                />
                <MetricCard
                  caption="Still in the queue"
                  icon={<ListChecks aria-hidden="true" />}
                  label="Open issues"
                  value={dashboard.total_open}
                />
              </div>
            </section>

            <section className="admin-section-card">
              <div className="admin-section-heading">
                <div>
                  <p className="eyebrow">Needs attention</p>
                  <h2>Next issues to review</h2>
                  <p>Only the most urgent open work is shown here. Use Issues for the full queue.</p>
                </div>
                <Link className="secondary-button admin-inline-action" to="/admin/issues">
                  View all issues
                  <ArrowRight aria-hidden="true" />
                </Link>
              </div>

              {attentionIssues.length === 0 && (
                <div className="empty-state">
                  <p>No active issue waiting. All current hostel issues are under control.</p>
                </div>
              )}

              <div className="attention-list">
                {nextIssues.map((issue) => (
                  <IssueBriefCard issue={issue} key={issue.id} />
                ))}
              </div>
            </section>

            <section className="quick-actions-grid" aria-label="Admin quick links">
              <QuickActionCard
                description="Search, filter, inspect, and update all hostel issues."
                href="/admin/issues"
                icon={<ListChecks aria-hidden="true" />}
                title="View full issue queue"
              />
              <QuickActionCard
                description="Review trends and print a clean management report."
                href="/admin/reports"
                icon={<BarChart3 aria-hidden="true" />}
                title="Open reports"
              />
              <button className="quick-action-card quick-action-button" type="button" onClick={() => void load()}>
                <span className="quick-action-icon">
                  <RefreshCw aria-hidden="true" />
                </span>
                <strong>Refresh dashboard</strong>
                <small>Load the latest student reports and issue status.</small>
              </button>
            </section>
          </>
        )}
      </div>
    </AppShell>
  )
}

function PriorityCard({ issue }: { issue?: IssueSummary }) {
  if (!issue) {
    return (
      <section className="admin-priority-card">
        <p className="eyebrow">Today&apos;s priority</p>
        <h2>No active issue waiting.</h2>
        <p>All current hostel issues are under control. New student reports will appear here when they need attention.</p>
      </section>
    )
  }

  const need = formatNeedLevel(issue.priority_score, issue.intelligence.sla_status)

  return (
    <section className="admin-priority-card">
      <div className="admin-priority-head">
        <div>
          <p className="eyebrow">Today&apos;s priority</p>
          <h2>{displayProblemTitle(issue.title)}</h2>
        </div>
        <span className={`soft-pill soft-${need.toLowerCase()}`}>{need} need</span>
      </div>
      <div className="issue-meta-pills">
        <span>{issue.hostel}</span>
        <span>{issue.category}</span>
        <span>{formatTimeStatus(issue.intelligence.sla_status)}</span>
        <span>{issue.complaint_count} report{issue.complaint_count === 1 ? '' : 's'}</span>
      </div>
      <p>{displayAction(issue.intelligence.recommended_action)}</p>
      <div className="priority-footer">
        <span>Last reported {formatDateTime(issue.last_complaint_at)}</span>
        <Link className="primary-button priority-review-button" to={`/admin/issues/${issue.id}`}>
          Review issue
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}

function MetricCard({
  caption,
  icon,
  label,
  value,
}: {
  caption: string
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <article className="admin-metric-card">
      <span className="metric-icon">{icon}</span>
      <strong>{value}</strong>
      <span>{label}</span>
      <p>{caption}</p>
    </article>
  )
}

function IssueBriefCard({ issue }: { issue: IssueSummary }) {
  const need = formatNeedLevel(issue.priority_score, issue.intelligence.sla_status)
  return (
    <article className="admin-issue-card">
      <div className="issue-card-main">
        <div className="issue-card-title-row">
          <span className="issue-id">{issueShortId(issue.id)}</span>
          <span className={`soft-pill soft-${need.toLowerCase()}`}>{need} need</span>
        </div>
        <h3>{displayProblemTitle(issue.title)}</h3>
        <div className="issue-meta-pills">
          <span>{issue.hostel}</span>
          <span>{issue.category}</span>
          <span>{formatTimeStatus(issue.intelligence.sla_status)}</span>
          <span>{issue.complaint_count} report{issue.complaint_count === 1 ? '' : 's'}</span>
        </div>
        <p>{displayAction(issue.intelligence.recommended_action)}</p>
      </div>
      <div className="issue-card-side">
        <StatusBadge status={issue.status} />
        <div className="priority-meter" aria-label={`Priority score ${Math.round(issue.priority_score)}`}>
          <span style={{ width: `${percentage(issue.priority_score, 100)}%` }} />
        </div>
        <Link className="secondary-button review-link" to={`/admin/issues/${issue.id}`}>
          Review
        </Link>
      </div>
    </article>
  )
}

function QuickActionCard({
  description,
  href,
  icon,
  title,
}: {
  description: string
  href: string
  icon: React.ReactNode
  title: string
}) {
  return (
    <Link className="quick-action-card" to={href}>
      <span className="quick-action-icon">{icon}</span>
      <strong>{title}</strong>
      <small>{description}</small>
    </Link>
  )
}

function DashboardSkeleton() {
  return (
    <div className="loading-stack" aria-live="polite" aria-label="Loading dashboard">
      <div className="skeleton-grid">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="skeleton-panel" />
    </div>
  )
}
