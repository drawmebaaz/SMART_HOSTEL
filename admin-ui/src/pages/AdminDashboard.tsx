import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  RefreshCw,
  Search,
  X,
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
  const statusTabsRef = useRef<HTMLDivElement | null>(null)
  const statusTabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [tabIndicator, setTabIndicator] = useState({ left: 0, width: 0 })

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

  useLayoutEffect(() => {
    const updateIndicator = () => {
      const activeTab = statusTabRefs.current[status]
      const tabList = statusTabsRef.current
      if (!activeTab || !tabList) return

      const activeRect = activeTab.getBoundingClientRect()
      const listRect = tabList.getBoundingClientRect()
      setTabIndicator({
        left: activeRect.left - listRect.left,
        width: activeRect.width,
      })
    }

    updateIndicator()
    window.addEventListener('resize', updateIndicator)
    return () => window.removeEventListener('resize', updateIndicator)
  }, [dashboard, status])

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
  const topHostel = dashboard ? topBreakdownEntry(dashboard.hostel_breakdown) : null
  const breachedCount = dashboard?.sla_breakdown.BREACHED ?? 0
  const atRiskCount = dashboard?.sla_breakdown.AT_RISK ?? 0
  const needsAttentionCount = dashboard ? Math.max(dashboard.critical_issues, breachedCount + atRiskCount) : 0
  const commandMode = dashboard?.critical_issues
    ? 'Needs review'
    : dashboard && dashboard.total_open > 0
      ? 'Open problems'
      : 'All clear'
  return (
    <AppShell>
      <div className="ops-page">
        <section className="student-intro admin-intro">
          <div>
            <p className="eyebrow">Staff board</p>
            <h1>Hostel staff board</h1>
            <p className="muted hero-copy">
              See what needs attention first, where students are affected, and what action should happen next.
            </p>
            <p className="board-summary-line" aria-label="Staff board summary">
              {commandMode} / {needsAttentionCount} to check / {breachedCount > 0 ? `${breachedCount} late` : `${atRiskCount} due soon`}
              {topHostel ? ` / Most reports from ${topHostel[0]}` : ''} / {dashboard?.complaints_total ?? 0} student reports
            </p>
          </div>
        </section>

        <section className="surface attention-strip" aria-label="Top problem">
          <div>
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">Needs attention first</p>
                <h2>{topIssue ? displayProblemTitle(topIssue.title) : 'No active problem'}</h2>
              </div>
              {topIssue && <NeedLabel timeStatus={topIssue.intelligence.sla_status} value={topIssue.priority_score} />}
            </div>
            <p className="muted">
              {topIssue ? displayAction(topIssue.intelligence.recommended_action) : 'Nothing is waiting right now. New student reports will appear here.'}
            </p>
            <div className="directive-meta">
              {topIssue ? `${topIssue.hostel} / ${topIssue.category} / ${formatTimeStatus(topIssue.intelligence.sla_status)}` : 'No active hostel'}
            </div>
          </div>
          <button className="secondary-button compact-refresh" type="button" onClick={() => void load()}>
            <RefreshCw aria-hidden="true" />
            Refresh
          </button>
        </section>

        {error && <p className="form-error">{error}</p>}
        {isLoading && <DashboardSkeleton />}

        {dashboard && (
          <>
            <section className="surface queue-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Problems to handle today</p>
                  <h2>Student reports needing staff attention</h2>
                  <p className="muted queue-summary">
                    Showing {filteredIssues.length} of {dashboard.issues.length} problem{dashboard.issues.length === 1 ? '' : 's'}.
                  </p>
                </div>
                <div className="status-tabs" ref={statusTabsRef} role="tablist" aria-label="Filter problems by status">
                  <span
                    aria-hidden="true"
                    className="status-tab-indicator"
                    style={{
                      opacity: tabIndicator.width > 0 ? 1 : 0,
                      transform: `translateX(${tabIndicator.left}px)`,
                      width: `${tabIndicator.width}px`,
                    }}
                  />
                  {STATUSES.map((value) => (
                    <button
                      aria-selected={status === value}
                      className={status === value ? 'active' : ''}
                      key={value}
                      onClick={() => setStatus(value)}
                      ref={(node) => {
                        statusTabRefs.current[value] = node
                      }}
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
                      <NeedLabel timeStatus={issue.intelligence.sla_status} value={issue.priority_score} />
                      <span className={`time-label time-${issue.intelligence.sla_status.toLowerCase()}`}>
                        {formatTimeStatus(issue.intelligence.sla_status)}
                      </span>
                      <span>{issue.complaint_count} student report{issue.complaint_count === 1 ? '' : 's'}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  )
}

function NeedLabel({ value, timeStatus }: { value: number; timeStatus?: string }) {
  const label = formatNeedLevel(value, timeStatus)
  return <span className={`need-label need-${label.toLowerCase()}`}>{label} need</span>
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
