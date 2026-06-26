import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  Building2,
  Clock3,
  ClipboardList,
  Layers3,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
  Users,
} from 'lucide-react'

import { api } from '../api/client'
import type { DashboardSummary, IssueStatus, IssueSummary } from '../api/types'
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
      setError(err instanceof Error ? err.message : 'Unable to load staff board')
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
    return dashboard.issues
      .filter((issue) => {
        const matchesStatus = status === 'ALL' || issue.status === status
        const matchesHostel = hostelFilter === 'ALL' || issue.hostel === hostelFilter
        const matchesCategory = categoryFilter === 'ALL' || issue.category === categoryFilter
        const matchesSla = slaFilter === 'ALL' || issue.intelligence.sla_status === slaFilter
        const displayedNeed = formatNeedLevel(issue.priority_score, issue.intelligence.sla_status)
        const matchesPriority =
          priorityFilter === 'ALL' ||
          (priorityFilter === 'HIGH' && displayedNeed === 'High') ||
          (priorityFilter === 'MEDIUM' && displayedNeed === 'Medium') ||
          (priorityFilter === 'LOW' && displayedNeed === 'Low')
        const matchesSearch =
          !searchTerm ||
          [
            issue.title,
            issue.hostel,
            issue.category,
            issue.status,
            issue.intelligence.sla_status,
            issue.intelligence.recommended_action,
          ]
            .join(' ')
            .toLowerCase()
            .includes(searchTerm)
        return matchesStatus && matchesHostel && matchesCategory && matchesSla && matchesPriority && matchesSearch
      })
      .sort(sortProblemsForStaff)
  }, [categoryFilter, dashboard, hostelFilter, priorityFilter, search, slaFilter, status])

  const hostelOptions = useMemo(() => Object.keys(dashboard?.hostel_breakdown ?? {}).sort(), [dashboard])
  const categoryOptions = useMemo(() => Object.keys(dashboard?.category_breakdown ?? {}).sort(), [dashboard])
  const slaOptions = useMemo(() => Object.keys(dashboard?.sla_breakdown ?? {}).sort(), [dashboard])

  const attentionIssues = filteredIssues.filter((issue) => issue.status !== 'RESOLVED')
  const topIssue = attentionIssues[0]
  const groupedCount = dashboard ? Math.max(0, dashboard.complaints_total - dashboard.issues.length) : 0
  const topHostel = dashboard ? topBreakdownEntry(dashboard.hostel_breakdown) : null
  const breachedCount = dashboard?.sla_breakdown.BREACHED ?? 0
  const atRiskCount = dashboard?.sla_breakdown.AT_RISK ?? 0
  const needsAttentionCount = dashboard ? Math.max(dashboard.critical_issues, breachedCount + atRiskCount) : 0
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
            <h1>Hostel staff board</h1>
            <p className="muted hero-copy">
              See what needs attention first, where students are affected, and what action should happen next.
            </p>
            
            <div className="command-telemetry" aria-label="Staff board summary">
              <Telemetry label="Board" value={commandMode} />
              <Telemetry label="Usual need" value={formatNeedLevel(avgRisk)} />
              <Telemetry label="Same problem reports" value={`${groupedRate}%`} />
              <Telemetry label="Time" value={breachedCount > 0 ? `${breachedCount} late` : `${atRiskCount} due soon`} />
            </div>
          </div>

          <aside className="directive-panel" aria-label="Top problem">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">Needs attention first</p>
                <h2>{topIssue ? displayProblemTitle(topIssue.title) : 'No active problem'}</h2>
              </div>
              {topIssue && <NeedPill timeStatus={topIssue.intelligence.sla_status} value={topIssue.priority_score} />}
            </div>
            <p className="muted">
              {topIssue ? displayAction(topIssue.intelligence.recommended_action) : 'Nothing is waiting right now. New student reports will appear here.'}
            </p>
            <div className="directive-meta">
              <span>{topIssue ? topIssue.hostel : 'No active hostel'}</span>
              <span>{topIssue ? topIssue.category : 'No active type'}</span>
              <span>{topIssue ? formatTimeStatus(topIssue.intelligence.sla_status) : 'Stable'}</span>
            </div>
            <div className="hero-actions">
              <span className="runtime-pill">
                Most urgent first
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
            <section className="signal-strip" aria-label="Staff board summary">
              <SignalTile icon={<ShieldAlert />} label="Needs attention" value={`${needsAttentionCount} to check`} tone="red" />
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
                  <h2>Student reports needing staff attention</h2>
                  <p className="muted queue-summary">
                    Showing {filteredIssues.length} of {dashboard.issues.length} problem{dashboard.issues.length === 1 ? '' : 's'}.
                  </p>
                </div>
                <div className="status-tabs" role="tablist" aria-label="Filter problems by status">
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

              <div className="filter-bar" aria-label="Problem filters">
                <label className="filter-field search-field" htmlFor="issue-search">
                  <Search aria-hidden="true" />
                  <input
                    id="issue-search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search problem, hostel, or next step..."
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
                  <span>Type</span>
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
                  <span>Need</span>
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
                    <p>No problems match this filter.</p>
                  </div>
                )}
                {filteredIssues.map((issue) => (
                  <Link className="issue-row" key={issue.id} to={`/admin/issues/${issue.id}`}>
                    <div className="issue-main">
                      <div className="issue-title-line">
                        <div>
                          <strong>{displayProblemTitle(issue.title)}</strong>
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
                      <p>{displayAction(issue.intelligence.recommended_action)}</p>
                    </div>
                    <div className="issue-scoreboard">
                      <NeedPill timeStatus={issue.intelligence.sla_status} value={issue.priority_score} />
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
              <Metric icon={<ShieldAlert />} label="To check" value={needsAttentionCount} tone="red" caption="Needs quick review" />
              <Metric icon={<Users />} label="Reports" value={dashboard.complaints_total} tone="green" caption="From students" />
              <Metric
                icon={<Layers3 />}
                label="Repeated"
                value={groupedCount}
                tone="amber"
                caption="Reports about existing problems"
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
                  <h2>Problem types</h2>
                </div>
                <Breakdown data={dashboard.category_breakdown} />
              </div>
              <div className="surface spotlight">
                <div className="section-heading compact">
                  <h2>Suggested next step</h2>
                </div>
                {topIssue ? (
                  <>
                    <p className="spotlight-title">{displayProblemTitle(topIssue.title)}</p>
                    <p className="muted">{displayAction(topIssue.intelligence.recommended_action)}</p>
                    <Link className="secondary-button" to={`/admin/issues/${topIssue.id}`}>
                      Open problem
                    </Link>
                  </>
                ) : (
                  <p className="muted">No problems waiting.</p>
                )}
              </div>
              <div className="surface hostel-pulse">
                <div className="section-heading compact">
                  <h2>Hostel load</h2>
                </div>
                {topHostel ? (
                  <div className="pulse-readout">
                    <strong>{topHostel[0]}</strong>
                    <span>{topHostel[1]} active problem{topHostel[1] === 1 ? '' : 's'}</span>
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

function NeedPill({ value, timeStatus }: { value: number; timeStatus?: string }) {
  const label = formatNeedLevel(value, timeStatus)
  return <span className={`need-pill need-${label.toLowerCase()}`}>{label}</span>
}

function DashboardSkeleton() {
  return (
    <div className="loading-stack" aria-live="polite" aria-label="Loading staff board">
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

function displayProblemTitle(title: string) {
  return title.replace(/\bissue\b/gi, 'problem')
}

function displayAction(action: string) {
  return action.replace(/\bissues\b/gi, 'problems').replace(/\bissue\b/gi, 'problem')
}

function formatNeedLevel(value: number, timeStatus?: string) {
  if (timeStatus === 'BREACHED') return 'High'
  if (timeStatus === 'AT_RISK' && value < 40) return 'Medium'
  if (value >= 70) return 'High'
  if (value >= 40) return 'Medium'
  return 'Low'
}

function sortProblemsForStaff(a: IssueSummary, b: IssueSummary) {
  const statusWeight = (issue: IssueSummary) => (issue.status === 'RESOLVED' ? 1 : 0)
  const timeWeight = (issue: IssueSummary) => {
    if (issue.intelligence.sla_status === 'BREACHED') return 0
    if (issue.intelligence.sla_status === 'AT_RISK') return 1
    if (issue.intelligence.sla_status === 'ON_TRACK') return 2
    return 3
  }
  const byStatus = statusWeight(a) - statusWeight(b)
  if (byStatus !== 0) return byStatus
  const byTime = timeWeight(a) - timeWeight(b)
  if (byTime !== 0) return byTime
  const byNeed = b.priority_score - a.priority_score
  if (byNeed !== 0) return byNeed
  return new Date(b.last_complaint_at ?? b.created_at).getTime() - new Date(a.last_complaint_at ?? a.created_at).getTime()
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
