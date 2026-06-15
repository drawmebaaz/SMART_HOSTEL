import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  Building2,
  Clock3,
  ClipboardList,
  Gauge,
  Layers3,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
  Users,
} from 'lucide-react'

import { api } from '../api/client'
import type { DashboardSummary, IssueStatus } from '../api/types'
import { AppShell } from '../components/AppShell'
import { StatusBadge } from '../components/StatusBadge'
import { formatDateTime } from '../utils/time'

const STATUSES: Array<IssueStatus | 'ALL'> = ['ALL', 'OPEN', 'IN_PROGRESS', 'REOPENED', 'RESOLVED']

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null)
  const [status, setStatus] = useState<IssueStatus | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const [hostelFilter, setHostelFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [slaFilter, setSlaFilter] = useState('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')
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

  const filteredIssues = useMemo(() => {
    if (!dashboard) return []
    const searchTerm = search.trim().toLowerCase()
    return dashboard.issues.filter((issue) => {
      const matchesStatus = status === 'ALL' || issue.status === status
      const matchesHostel = hostelFilter === 'ALL' || issue.hostel === hostelFilter
      const matchesCategory = categoryFilter === 'ALL' || issue.category === categoryFilter
      const matchesSla = slaFilter === 'ALL' || issue.intelligence.sla_status === slaFilter
      const matchesPriority =
        priorityFilter === 'ALL' ||
        (priorityFilter === 'HIGH' && issue.priority_score >= 70) ||
        (priorityFilter === 'MEDIUM' && issue.priority_score >= 40 && issue.priority_score < 70) ||
        (priorityFilter === 'LOW' && issue.priority_score < 40)
      const matchesSearch =
        !searchTerm ||
        [
          issue.title,
          issue.hostel,
          issue.category,
          issue.status,
          issue.intelligence.sla_status,
          issue.intelligence.recommended_action,
          `ISS-${issue.id.slice(0, 8)}`,
        ]
          .join(' ')
          .toLowerCase()
          .includes(searchTerm)
      return matchesStatus && matchesHostel && matchesCategory && matchesSla && matchesPriority && matchesSearch
    })
  }, [categoryFilter, dashboard, hostelFilter, priorityFilter, search, slaFilter, status])

  const hostelOptions = useMemo(() => Object.keys(dashboard?.hostel_breakdown ?? {}).sort(), [dashboard])
  const categoryOptions = useMemo(() => Object.keys(dashboard?.category_breakdown ?? {}).sort(), [dashboard])
  const slaOptions = useMemo(() => Object.keys(dashboard?.sla_breakdown ?? {}).sort(), [dashboard])

  const attentionIssues = filteredIssues.filter((issue) => issue.status !== 'RESOLVED')
  const topIssue = attentionIssues[0]
  const groupedCount = dashboard ? Math.max(0, dashboard.complaints_total - dashboard.issues.length) : 0
  const topHostel = dashboard ? topBreakdownEntry(dashboard.hostel_breakdown) : null
  const topCategory = dashboard ? topBreakdownEntry(dashboard.category_breakdown) : null
  const breachedCount = dashboard?.sla_breakdown.BREACHED ?? 0
  const atRiskCount = dashboard?.sla_breakdown.AT_RISK ?? 0
  const avgRisk =
    dashboard && dashboard.issues.length > 0
      ? Math.round(dashboard.issues.reduce((total, issue) => total + issue.priority_score, 0) / dashboard.issues.length)
      : 0
  const groupedRate =
    dashboard && dashboard.complaints_total > 0
      ? Math.round((groupedCount / dashboard.complaints_total) * 100)
      : 0
  const commandMode = dashboard?.critical_issues
    ? 'Needs review'
    : dashboard && dashboard.total_open > 0
      ? 'Open problems'
      : 'All clear'
  return (
    <AppShell>
      <div className="ops-page">
        <section className="command-board">
          <div className="command-copy">
            <h1>Hostel problem dashboard</h1>
            <p className="muted hero-copy">
              See what needs attention first, where students are affected, and what action should happen next.
            </p>
            
            <div className="command-telemetry" aria-label="Dashboard summary">
              <Telemetry label="View" value={commandMode} />
              <Telemetry label="Avg priority" value={avgRisk} />
              <Telemetry label="Combined" value={`${groupedRate}%`} />
              <Telemetry label="Time alerts" value={breachedCount > 0 ? `${breachedCount} late` : `${atRiskCount} due soon`} />
            </div>
          </div>

          <aside className="directive-panel" aria-label="Top problem">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">Needs attention first</p>
                <h2>{topIssue ? topIssue.title : 'No active issue'}</h2>
              </div>
              {topIssue && <RiskRing value={topIssue.priority_score} />}
            </div>
            <p className="muted">
              {topIssue ? topIssue.intelligence.recommended_action : 'Nothing is waiting right now. New student complaints will appear here.'}
            </p>
            <div className="directive-meta">
              <span>{topIssue ? topIssue.hostel : 'No active hostel'}</span>
              <span>{topIssue ? topIssue.category : 'No active category'}</span>
              <span>{topIssue ? formatTimeStatus(topIssue.intelligence.sla_status) : 'Stable'}</span>
            </div>
            <div className="hero-actions">
              <span className="runtime-pill">
                <Gauge aria-hidden="true" />
                Sorted by priority
              </span>
              <button className="secondary-button" type="button" onClick={() => void load()}>
                <RefreshCw aria-hidden="true" />
                Refresh
              </button>
            </div>
          </aside>
        </section>

        {error && <p className="form-error">{error}</p>}
        {isLoading && <DashboardSkeleton />}

        {dashboard && (
          <>
            <section className="signal-strip" aria-label="Dashboard summary">
              <SignalTile icon={<ShieldAlert />} label="Needs attention" value={`${dashboard.critical_issues} critical`} tone="red" />
              <SignalTile icon={<Clock3 />} label="Late problems" value={`${breachedCount} late`} tone="amber" />
              <SignalTile icon={<Clock3 />} label="Due soon" value={`${atRiskCount} due soon`} tone="blue" />
              <SignalTile
                icon={<MapPin />}
                label="Most affected hostel"
                value={topHostel ? `${topHostel[0]} (${topHostel[1]})` : 'None'}
                tone="green"
              />
              <SignalTile
                icon={<ClipboardList />}
                label="Student reports"
                value={`${dashboard.complaints_total} reports`}
                tone="blue"
              />
            </section>

            <section className="surface queue-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Problems to handle today</p>
                  <h2>Student complaints sorted by priority</h2>
                  <p className="muted queue-summary">
                    Showing {filteredIssues.length} of {dashboard.issues.length} problem{dashboard.issues.length === 1 ? '' : 's'}.
                  </p>
                </div>
                <div className="status-tabs" role="tablist" aria-label="Filter issues by status">
                  {STATUSES.map((value) => (
                    <button
                      aria-selected={status === value}
                      className={status === value ? 'active' : ''}
                      key={value}
                      onClick={() => setStatus(value)}
                      role="tab"
                      type="button"
                    >
                      {formatStatusTab(value)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-bar" aria-label="Issue filters">
                <label className="filter-field search-field" htmlFor="issue-search">
                  <Search aria-hidden="true" />
                  <input
                    id="issue-search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search problem, hostel, action, ID..."
                  />
                </label>
                <label className="filter-field" htmlFor="hostel-filter">
                  <span>Hostel</span>
                  <select id="hostel-filter" value={hostelFilter} onChange={(event) => setHostelFilter(event.target.value)}>
                    <option value="ALL">All</option>
                    {hostelOptions.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="filter-field" htmlFor="category-filter">
                  <span>Category</span>
                  <select
                    id="category-filter"
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                  >
                    <option value="ALL">All</option>
                    {categoryOptions.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="filter-field" htmlFor="sla-filter">
                  <span>Time</span>
                  <select id="sla-filter" value={slaFilter} onChange={(event) => setSlaFilter(event.target.value)}>
                    <option value="ALL">All</option>
                    {slaOptions.map((value) => (
                      <option key={value} value={value}>
                        {formatTimeStatus(value)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="filter-field" htmlFor="priority-filter">
                  <span>Priority</span>
                  <select
                    id="priority-filter"
                    value={priorityFilter}
                    onChange={(event) => setPriorityFilter(event.target.value)}
                  >
                    <option value="ALL">All</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </label>
                <button
                  className="secondary-button reset-filters"
                  type="button"
                  onClick={() => {
                    setSearch('')
                    setHostelFilter('ALL')
                    setCategoryFilter('ALL')
                    setSlaFilter('ALL')
                    setPriorityFilter('ALL')
                    setStatus('ALL')
                  }}
                >
                  <X aria-hidden="true" />
                  Reset
                </button>
              </div>

              <div className="issue-list">
                {filteredIssues.length === 0 && (
                  <div className="empty-state">
                    <ClipboardList aria-hidden="true" />
                    <p>No issues match this filter.</p>
                  </div>
                )}
                {filteredIssues.map((issue) => (
                  <Link className="issue-row" key={issue.id} to={`/admin/issues/${issue.id}`}>
                    <div className="issue-main">
                      <div className="issue-title-line">
                        <div>
                          <code>ISS-{issue.id.slice(0, 8)}</code>
                          <strong>{issue.title}</strong>
                        </div>
                        <StatusBadge status={issue.status} />
                      </div>
                      <div className="issue-meta">
                        <span>
                          <Building2 aria-hidden="true" />
                          {issue.hostel}
                        </span>
                        <span>{issue.category}</span>
                        <span>{formatDateTime(issue.last_complaint_at)}</span>
                      </div>
                      <p>{issue.intelligence.recommended_action}</p>
                    </div>
                    <div className="issue-scoreboard">
                      <RiskRing value={issue.priority_score} />
                      <span className={`sla-chip sla-${issue.intelligence.sla_status.toLowerCase()}`}>
                        {formatTimeStatus(issue.intelligence.sla_status)}
                      </span>
                      <span>{issue.complaint_count} student report{issue.complaint_count === 1 ? '' : 's'}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section className="metric-grid premium">
              <Metric icon={<Activity />} label="Open" value={dashboard.total_open} tone="blue" caption="Problems waiting" />
              <Metric icon={<ShieldAlert />} label="Critical" value={dashboard.critical_issues} tone="red" caption="Needs urgent review" />
              <Metric icon={<Users />} label="Complaints" value={dashboard.complaints_total} tone="green" caption="Real student reports" />
              <Metric
                icon={<Layers3 />}
                label="Combined"
                value={groupedCount}
                tone="amber"
                caption="Reports joined together"
              />
            </section>

            <section className="insight-grid">
              <div className="surface">
                <div className="section-heading compact">
                  <h2>Time status</h2>
                </div>
                <Breakdown data={dashboard.sla_breakdown} labelFormatter={formatTimeStatus} />
              </div>
              <div className="surface">
                <div className="section-heading compact">
                  <h2>Category mix</h2>
                </div>
                <Breakdown data={dashboard.category_breakdown} />
              </div>
              <div className="surface spotlight">
                <div className="section-heading compact">
                  <h2>Suggested next step</h2>
                  <AlertTriangle aria-hidden="true" />
                </div>
                {topIssue ? (
                  <>
                    <p className="spotlight-title">{topIssue.title}</p>
                    <p className="muted">{topIssue.intelligence.recommended_action}</p>
                    <Link className="secondary-button" to={`/admin/issues/${topIssue.id}`}>
                      Open issue
                    </Link>
                  </>
                ) : (
                  <p className="muted">No problems waiting.</p>
                )}
              </div>
              <div className="surface hostel-pulse">
                <div className="section-heading compact">
                  <h2>Hostel pressure</h2>
                  <MapPin aria-hidden="true" />
                </div>
                {topHostel ? (
                  <div className="pulse-readout">
                    <strong>{topHostel[0]}</strong>
                    <span>{topHostel[1]} active issue{topHostel[1] === 1 ? '' : 's'}</span>
                  </div>
                ) : (
                  <p className="muted">No hostel pressure yet.</p>
                )}
                <Breakdown data={dashboard.hostel_breakdown} compact />
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  )
}

function Telemetry({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="telemetry-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function SignalTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode
  label: string
  value: string
  tone: 'blue' | 'red' | 'green' | 'amber'
}) {
  return (
    <div className={`signal-tile signal-${tone}`}>
      <span className="signal-icon">{icon}</span>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function Metric({
  icon,
  label,
  value,
  tone,
  caption,
}: {
  icon: ReactNode
  label: string
  value: number
  tone: 'blue' | 'red' | 'green' | 'amber'
  caption: string
}) {
  return (
    <div className={`metric metric-${tone}`}>
      <span className="metric-icon">{icon}</span>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{caption}</small>
    </div>
  )
}

function Breakdown({
  data,
  compact = false,
  labelFormatter,
}: {
  data: Record<string, number>
  compact?: boolean
  labelFormatter?: (label: string) => string
}) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1])
  const max = Math.max(...entries.map(([, value]) => value), 1)
  if (entries.length === 0) {
    return <p className="muted">No data yet.</p>
  }
  return (
    <div className={compact ? 'breakdown compact-breakdown' : 'breakdown'}>
      {entries.map(([label, value]) => (
        <div className="breakdown-row" key={label}>
          <span>{labelFormatter ? labelFormatter(label) : label.replace('_', ' ')}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(value / max) * 100}%` }} />
          </div>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  )
}

function RiskRing({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className="risk-meter">
      <strong>{Math.round(clamped)}</strong>
      <span>
        <i style={{ width: `${clamped}%` }} />
      </span>
    </div>
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

function topBreakdownEntry(data: Record<string, number>) {
  return Object.entries(data).sort((a, b) => b[1] - a[1])[0] ?? null
}

function formatStatusTab(status: IssueStatus | 'ALL') {
  const labels: Record<IssueStatus | 'ALL', string> = {
    ALL: 'All',
    OPEN: 'New',
    IN_PROGRESS: 'Being fixed',
    REOPENED: 'Needs review',
    RESOLVED: 'Resolved',
  }
  return labels[status]
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
