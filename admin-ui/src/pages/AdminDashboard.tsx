import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  Building2,
  Clock3,
  Flame,
  Gauge,
  MapPin,
  RadioTower,
  RefreshCw,
  ShieldAlert,
  Sparkles,
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
    if (status === 'ALL') return dashboard.issues
    return dashboard.issues.filter((issue) => issue.status === status)
  }, [dashboard, status])

  const topIssue = filteredIssues[0]
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
    ? 'Escalation watch'
    : dashboard && dashboard.total_open > 0
      ? 'Active monitoring'
      : 'Queue clear'

  return (
    <AppShell>
      <div className="ops-page">
        <section className="command-board">
          <div className="command-copy">
            <div className="command-kicker">
              <span className="live-dot" aria-hidden="true" />
              <p className="eyebrow">Operations command</p>
            </div>
            <h1>Hostel operations command</h1>
            <p className="muted hero-copy">
              A focused resolution workspace for student complaints, duplicate clusters, SLA pressure, and admin action.
            </p>
            <div className="hero-signal-row" aria-label="Command signals">
              <span>
                <Building2 aria-hidden="true" />
                Routing
              </span>
              <span>
                <Clock3 aria-hidden="true" />
                SLA pressure
              </span>
              <span>
                <Gauge aria-hidden="true" />
                Risk scoring
              </span>
              <span>
                <RadioTower aria-hidden="true" />
                Live evidence
              </span>
            </div>
            <div className="command-telemetry" aria-label="Operations telemetry">
              <Telemetry label="Mode" value={commandMode} />
              <Telemetry label="Avg risk" value={avgRisk} />
              <Telemetry label="Grouped" value={`${groupedRate}%`} />
              <Telemetry label="SLA heat" value={breachedCount > 0 ? `${breachedCount} breached` : `${atRiskCount} at risk`} />
            </div>
          </div>

          <aside className="directive-panel" aria-label="Priority directive">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">Priority directive</p>
                <h2>{topIssue ? topIssue.title : 'No active directive'}</h2>
              </div>
              {topIssue && <RiskRing value={topIssue.priority_score} />}
            </div>
            <p className="muted">
              {topIssue ? topIssue.intelligence.recommended_action : 'The queue is clear. New student signals will appear here.'}
            </p>
            <div className="directive-meta">
              <span>{topHostel ? topHostel[0] : 'No hostel pressure'}</span>
              <span>{topCategory ? topCategory[0] : 'No category pressure'}</span>
              <span>{topIssue ? topIssue.intelligence.sla_status.replace('_', ' ') : 'Stable'}</span>
            </div>
            <div className="hero-actions">
              <span className="runtime-pill">
                <BrainCircuit aria-hidden="true" />
                {dashboard?.ai_runtime ?? 'Local hybrid intelligence'}
              </span>
              <button className="secondary-button" type="button" onClick={() => void load()}>
                <RefreshCw aria-hidden="true" />
                Refresh
              </button>
            </div>
          </aside>
        </section>

        {dashboard && (
          <section className="signal-strip" aria-label="Live command signals">
            <SignalTile icon={<ShieldAlert />} label="Escalation" value={`${dashboard.critical_issues} critical`} tone="red" />
            <SignalTile icon={<Clock3 />} label="SLA" value={`${breachedCount} breached / ${atRiskCount} at risk`} tone="amber" />
            <SignalTile
              icon={<MapPin />}
              label="Pressure zone"
              value={topHostel ? `${topHostel[0]} (${topHostel[1]})` : 'None'}
              tone="blue"
            />
            <SignalTile
              icon={<BrainCircuit />}
              label="Evidence density"
              value={`${dashboard.complaints_total} reports / ${dashboard.issues.length} issues`}
              tone="green"
            />
          </section>
        )}

        {error && <p className="form-error">{error}</p>}
        {isLoading && <DashboardSkeleton />}

        {dashboard && (
          <>
            <section className="metric-grid premium">
              <Metric icon={<Activity />} label="Open" value={dashboard.total_open} tone="blue" caption="Active operational issues" />
              <Metric icon={<ShieldAlert />} label="Critical" value={dashboard.critical_issues} tone="red" caption="Needs escalation" />
              <Metric icon={<Users />} label="Complaints" value={dashboard.complaints_total} tone="green" caption="Real student reports" />
              <Metric
                icon={<Flame />}
                label="Grouped"
                value={groupedCount}
                tone="amber"
                caption="Reports merged into issues"
              />
            </section>

            <section className="insight-grid">
              <div className="surface">
                <div className="section-heading compact">
                  <h2>SLA pressure</h2>
                </div>
                <Breakdown data={dashboard.sla_breakdown} />
              </div>
              <div className="surface">
                <div className="section-heading compact">
                  <h2>Category mix</h2>
                </div>
                <Breakdown data={dashboard.category_breakdown} />
              </div>
              <div className="surface spotlight">
                <div className="section-heading compact">
                  <h2>Top recommended action</h2>
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
                  <p className="muted">No issues in queue.</p>
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

            <section className="surface queue-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Prioritized issue queue</p>
                  <h2>Sorted by risk and operational pressure</h2>
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
                      {value.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="issue-list">
                {filteredIssues.length === 0 && (
                  <div className="empty-state">
                    <Sparkles aria-hidden="true" />
                    <p>No issues match this filter.</p>
                  </div>
                )}
                {filteredIssues.map((issue) => (
                  <Link className="issue-row" key={issue.id} to={`/admin/issues/${issue.id}`}>
                    <div className="issue-main">
                      <div className="issue-title-line">
                        <strong>{issue.title}</strong>
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
                        {issue.intelligence.sla_status.replace('_', ' ')}
                      </span>
                      <span>{issue.complaint_count} reports</span>
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

function Breakdown({ data, compact = false }: { data: Record<string, number>; compact?: boolean }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1])
  const max = Math.max(...entries.map(([, value]) => value), 1)
  if (entries.length === 0) {
    return <p className="muted">No data yet.</p>
  }
  return (
    <div className={compact ? 'breakdown compact-breakdown' : 'breakdown'}>
      {entries.map(([label, value]) => (
        <div className="breakdown-row" key={label}>
          <span>{label.replace('_', ' ')}</span>
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
