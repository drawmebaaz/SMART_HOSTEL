import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Building2, RefreshCw, Search, X } from 'lucide-react'

import { api } from '../api/client'
import type { DashboardSummary, IssueStatus, IssueSummary } from '../api/types'
import { AppShell } from '../components/AppShell'
import { StatusBadge } from '../components/StatusBadge'
import { formatDateTime } from '../utils/time'
import {
  displayAction,
  displayProblemTitle,
  formatNeedLevel,
  formatStatusTab,
  formatTimeStatus,
  ISSUE_STATUSES,
  issueShortId,
  percentage,
  sortProblemsForStaff,
} from './adminPageUtils'

export default function AdminIssuesPage() {
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
      setError(err instanceof Error ? err.message : 'Unable to load issues')
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
  const statusCounts = useMemo(() => countStatuses(dashboard?.issues ?? []), [dashboard])

  return (
    <AppShell>
      <div className="issues-page">
        <section className="issues-header">
          <div>
            <p className="eyebrow">Issue workspace</p>
            <h1>Issues</h1>
            <p>View, track, and manage all hostel issues reported by students. Use filters to find specific issues quickly.</p>
          </div>
          <button className="secondary-button admin-inline-action" type="button" onClick={() => void load()}>
            <RefreshCw aria-hidden="true" />
            Refresh
          </button>
        </section>

        {error && <p className="form-error">{error}</p>}
        {isLoading && <IssueSkeleton />}

        {dashboard && (
          <>
            <section className="issues-filter-card">
              <div className="issues-tabs" ref={statusTabsRef} role="tablist" aria-label="Filter issues by status">
                <span
                  aria-hidden="true"
                  className="status-tab-indicator"
                  style={{
                    opacity: tabIndicator.width > 0 ? 1 : 0,
                    transform: `translateX(${tabIndicator.left}px)`,
                    width: `${tabIndicator.width}px`,
                  }}
                />
                {ISSUE_STATUSES.map((value) => (
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
                    <span>{value === 'ALL' ? dashboard.issues.length : statusCounts[value] ?? 0}</span>
                  </button>
                ))}
              </div>

              <div className="issues-filter-grid" aria-label="Issue filters">
                <label className="filter-field search-field" htmlFor="issue-search">
                  <Search aria-hidden="true" />
                  <input
                    id="issue-search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search issue, hostel, or next step..."
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
                  <select id="category-filter" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
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
                  <select id="priority-filter" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
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
            </section>

            <section className="issues-list-section">
              <div className="admin-section-heading">
                <div>
                  <p className="eyebrow">Issue queue</p>
                  <h2>Showing {filteredIssues.length} of {dashboard.issues.length} issues</h2>
                </div>
              </div>
              {filteredIssues.length === 0 && (
                <div className="empty-state">
                  <p>No issues match these filters. Try clearing filters or wait for new student reports.</p>
                </div>
              )}
              <div className="issues-list">
                {filteredIssues.map((issue) => (
                  <FullIssueCard issue={issue} key={issue.id} />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  )
}

function FullIssueCard({ issue }: { issue: IssueSummary }) {
  const need = formatNeedLevel(issue.priority_score, issue.intelligence.sla_status)
  return (
    <article className="admin-issue-card full-issue-card">
      <div className="issue-category-bubble" aria-hidden="true">
        <Building2 />
      </div>
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
          <span>Last reported {formatDateTime(issue.last_complaint_at)}</span>
        </div>
        <p>{displayAction(issue.intelligence.recommended_action)}</p>
      </div>
      <div className="issue-card-side">
        <StatusBadge status={issue.status} />
        <div>
          <span className="priority-score">{Math.round(issue.priority_score)} priority</span>
          <div className="priority-meter" aria-label={`Priority score ${Math.round(issue.priority_score)}`}>
            <span style={{ width: `${percentage(issue.priority_score, 100)}%` }} />
          </div>
        </div>
        <Link className="primary-button review-link-primary" to={`/admin/issues/${issue.id}`}>
          Review issue
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </article>
  )
}

function countStatuses(issues: IssueSummary[]) {
  return issues.reduce<Record<string, number>>((counts, issue) => {
    counts[issue.status] = (counts[issue.status] ?? 0) + 1
    return counts
  }, {})
}

function IssueSkeleton() {
  return (
    <div className="loading-stack" aria-live="polite" aria-label="Loading issues">
      <div className="skeleton-panel" />
      <div className="skeleton-grid">
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}
