import { useEffect, useMemo, useState } from 'react'
import type React from 'react'
import { ArrowDownToLine, BarChart3, CalendarDays, FileText, Printer, RefreshCw } from 'lucide-react'

import { api } from '../api/client'
import type { DashboardSummary, IssueSummary } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { AppShell } from '../components/AppShell'
import { formatDateTime } from '../utils/time'
import {
  displayAction,
  displayProblemTitle,
  formatNeedLevel,
  formatStatusShort,
  issueDate,
  issueShortId,
  percentage,
  sortProblemsForStaff,
  topBreakdownEntry,
} from './adminPageUtils'

type ReportRange = 'ALL' | 'YEAR' | 'MONTH'

const RANGE_LABELS: Record<ReportRange, string> = {
  ALL: 'All time',
  YEAR: 'Past 1 year',
  MONTH: 'Past 1 month',
}

export default function AdminReportsPage() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null)
  const [range, setRange] = useState<ReportRange>('ALL')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const load = async () => {
    setIsLoading(true)
    setError('')
    try {
      setDashboard(await api.dashboard())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate report')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filteredIssues = useMemo(() => filterIssuesByRange(dashboard?.issues ?? [], range), [dashboard, range])
  const report = useMemo(() => buildReport(filteredIssues), [filteredIssues])

  const printReport = () => {
    window.print()
  }

  return (
    <AppShell>
      <div className="reports-page">
        <section className="reports-header">
          <div>
            <p className="eyebrow">Reporting center</p>
            <h1>Understand hostel grievance trends over time.</h1>
            <p>
              Track complaints, issue resolution, urgency patterns, category distribution, hostel-wise load, and export clean PDF reports for review.
            </p>
          </div>
          <div className="reports-actions">
            <button className="secondary-button" type="button" onClick={() => void load()}>
              <RefreshCw aria-hidden="true" />
              Refresh
            </button>
            <button className="primary-button" type="button" onClick={printReport}>
              <ArrowDownToLine aria-hidden="true" />
              Download PDF
            </button>
          </div>
        </section>

        <section className="report-range-card" aria-label="Report range">
          <div>
            <CalendarDays aria-hidden="true" />
            <span>Report range</span>
          </div>
          <div className="report-range-tabs" role="tablist" aria-label="Choose report range">
            {(Object.keys(RANGE_LABELS) as ReportRange[]).map((value) => (
              <button
                aria-selected={range === value}
                className={range === value ? 'active' : ''}
                key={value}
                onClick={() => setRange(value)}
                role="tab"
                type="button"
              >
                {RANGE_LABELS[value]}
              </button>
            ))}
          </div>
        </section>

        {error && (
          <section className="report-alert">
            <strong>Could not generate report.</strong>
            <p>{error}. Please refresh and try again.</p>
          </section>
        )}

        {isLoading && <ReportsSkeleton />}

        {dashboard && !isLoading && (
          <>
            {filteredIssues.length === 0 ? (
              <section className="report-alert">
                <strong>No report data available for this range.</strong>
                <p>New activity will appear here after student complaints are submitted.</p>
              </section>
            ) : (
              <>
                <section className="report-summary-grid">
                  <ReportMetric label="Total complaints" value={report.totalComplaints} caption="Student reports in range" />
                  <ReportMetric label="Grouped issues" value={report.totalIssues} caption="Operational problems" />
                  <ReportMetric label="Resolved issues" value={report.resolvedIssues} caption="Completed work" />
                  <ReportMetric label="Open issues" value={report.openIssues} caption="Still active" />
                  <ReportMetric label="Critical issues" value={report.criticalIssues} caption="Highest attention" />
                  <ReportMetric label="Avg priority" value={report.averagePriority} caption="Across visible issues" />
                </section>

                <section className="report-chart-grid">
                  <ChartCard title="Complaints over time" description="Issue activity grouped by report date.">
                    <MiniBarChart items={report.timeline} />
                  </ChartCard>
                  <ChartCard title="Issues by status" description="Current progress state for grouped issues.">
                    <MiniBarChart items={report.statusDistribution} />
                  </ChartCard>
                  <ChartCard title="Category distribution" description="Problem types reported by students.">
                    <HorizontalBars items={report.categoryDistribution} />
                  </ChartCard>
                  <ChartCard title="Hostel-wise load" description="Hostels receiving the most reports.">
                    <HorizontalBars items={report.hostelDistribution} />
                  </ChartCard>
                  <ChartCard title="Urgency distribution" description="Need level based on priority and time pressure.">
                    <MiniBarChart items={report.urgencyDistribution} />
                  </ChartCard>
                  <ChartCard title="Resolution performance" description="Resolved, late, and due-soon operating state.">
                    <MiniBarChart items={report.resolutionDistribution} />
                  </ChartCard>
                </section>

                <section className="report-insights-grid">
                  {report.insights.map((insight) => (
                    <article className="report-insight-card" key={insight.title}>
                      <span>
                        <BarChart3 aria-hidden="true" />
                      </span>
                      <strong>{insight.title}</strong>
                      <p>{insight.description}</p>
                    </article>
                  ))}
                </section>

                <section className="report-download-panel">
                  <div>
                    <p className="eyebrow">Printable report</p>
                    <h2>Download a clean management PDF</h2>
                    <p>
                      The report below is formatted for print and reflects the selected range: {RANGE_LABELS[range]}.
                    </p>
                  </div>
                  <button className="primary-button" type="button" onClick={printReport}>
                    <Printer aria-hidden="true" />
                    Download PDF
                  </button>
                </section>

                <PrintableReport
                  generatedBy={user?.name ?? 'Hostel staff'}
                  range={RANGE_LABELS[range]}
                  report={report}
                />
              </>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}

function ReportMetric({ caption, label, value }: { caption: string; label: string; value: number | string }) {
  return (
    <article className="report-metric-card">
      <span className="metric-icon">
        <FileText aria-hidden="true" />
      </span>
      <strong>{value}</strong>
      <span>{label}</span>
      <p>{caption}</p>
    </article>
  )
}

function ChartCard({ children, description, title }: { children: React.ReactNode; description: string; title: string }) {
  return (
    <article className="report-chart-card">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {children}
    </article>
  )
}

function MiniBarChart({ items }: { items: ChartItem[] }) {
  const max = Math.max(...items.map((item) => item.value), 1)
  return (
    <div className="mini-bar-chart">
      {items.map((item) => (
        <div className="mini-bar-item" key={item.label}>
          <span>{item.label}</span>
          <div>
            <i style={{ height: `${Math.max(8, percentage(item.value, max))}%` }} />
          </div>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  )
}

function HorizontalBars({ items }: { items: ChartItem[] }) {
  const max = Math.max(...items.map((item) => item.value), 1)
  return (
    <div className="horizontal-bars">
      {items.map((item) => (
        <div key={item.label}>
          <span>{item.label}</span>
          <div>
            <i style={{ width: `${percentage(item.value, max)}%` }} />
          </div>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  )
}

function PrintableReport({
  generatedBy,
  range,
  report,
}: {
  generatedBy: string
  range: string
  report: ReportModel
}) {
  return (
    <section className="print-report" aria-label="Printable report">
      <header>
        <p>Smart Hostel Grievance Report</p>
        <h1>{range}</h1>
        <span>Generated {formatDateTime(new Date().toISOString())} by {generatedBy}</span>
      </header>

      <section>
        <h2>Executive summary</h2>
        <div className="print-summary-grid">
          <span>Total complaints: {report.totalComplaints}</span>
          <span>Total issues: {report.totalIssues}</span>
          <span>Resolved issues: {report.resolvedIssues}</span>
          <span>Open issues: {report.openIssues}</span>
          <span>Critical issues: {report.criticalIssues}</span>
          <span>Top hostel: {report.topHostel}</span>
          <span>Top category: {report.topCategory}</span>
        </div>
      </section>

      <section>
        <h2>Key insights</h2>
        <ul>
          {report.insights.map((insight) => (
            <li key={insight.title}>
              <strong>{insight.title}:</strong> {insight.description}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Issue summary</h2>
        <table className="report-table">
          <thead>
            <tr>
              <th>Issue ID</th>
              <th>Title</th>
              <th>Hostel</th>
              <th>Category</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Reports</th>
              <th>Last reported</th>
              <th>Recommended action</th>
            </tr>
          </thead>
          <tbody>
            {report.issues.map((issue) => (
              <tr key={issue.id}>
                <td>{issueShortId(issue.id)}</td>
                <td>{displayProblemTitle(issue.title)}</td>
                <td>{issue.hostel}</td>
                <td>{issue.category}</td>
                <td>{formatStatusShort(issue.status)}</td>
                <td>{Math.round(issue.priority_score)}</td>
                <td>{issue.complaint_count}</td>
                <td>{formatDateTime(issueDate(issue))}</td>
                <td>{displayAction(issue.intelligence.recommended_action)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer>Smart Hostel Grievance Intelligence Platform</footer>
    </section>
  )
}

interface ChartItem {
  label: string
  value: number
}

interface ReportModel {
  averagePriority: number
  categoryDistribution: ChartItem[]
  criticalIssues: number
  hostelDistribution: ChartItem[]
  insights: Array<{ title: string; description: string }>
  issues: IssueSummary[]
  openIssues: number
  resolvedIssues: number
  resolutionDistribution: ChartItem[]
  statusDistribution: ChartItem[]
  timeline: ChartItem[]
  topCategory: string
  topHostel: string
  totalComplaints: number
  totalIssues: number
  urgencyDistribution: ChartItem[]
}

function filterIssuesByRange(issues: IssueSummary[], range: ReportRange) {
  if (range === 'ALL') return [...issues].sort(sortProblemsForStaff)
  const now = Date.now()
  const cutoff = range === 'YEAR' ? addMonths(now, -12) : addMonths(now, -1)
  return issues
    .filter((issue) => new Date(issueDate(issue)).getTime() >= cutoff)
    .sort(sortProblemsForStaff)
}

function buildReport(issues: IssueSummary[]): ReportModel {
  const totalComplaints = sum(issues.map((issue) => issue.complaint_count))
  const statusDistribution = objectToChart(
    issues.reduce<Record<string, number>>((counts, issue) => {
      counts[formatStatusShort(issue.status)] = (counts[formatStatusShort(issue.status)] ?? 0) + 1
      return counts
    }, {}),
  )
  const categoryBreakdown = issues.reduce<Record<string, number>>((counts, issue) => {
    counts[issue.category] = (counts[issue.category] ?? 0) + issue.complaint_count
    return counts
  }, {})
  const hostelBreakdown = issues.reduce<Record<string, number>>((counts, issue) => {
    counts[issue.hostel] = (counts[issue.hostel] ?? 0) + issue.complaint_count
    return counts
  }, {})
  const urgencyBreakdown = issues.reduce<Record<string, number>>((counts, issue) => {
    const need = formatNeedLevel(issue.priority_score, issue.intelligence.sla_status)
    counts[need] = (counts[need] ?? 0) + 1
    return counts
  }, {})
  const resolutionBreakdown = {
    Resolved: issues.filter((issue) => issue.status === 'RESOLVED').length,
    Late: issues.filter((issue) => issue.intelligence.sla_status === 'BREACHED').length,
    'Due soon': issues.filter((issue) => issue.intelligence.sla_status === 'AT_RISK').length,
    Open: issues.filter((issue) => issue.status !== 'RESOLVED').length,
  }
  const topHostel = topBreakdownEntry(hostelBreakdown)?.[0] ?? 'None'
  const topCategory = topBreakdownEntry(categoryBreakdown)?.[0] ?? 'None'
  const criticalIssues = issues.filter((issue) => formatNeedLevel(issue.priority_score, issue.intelligence.sla_status) === 'High').length
  const resolvedIssues = issues.filter((issue) => issue.status === 'RESOLVED').length
  const openIssues = issues.filter((issue) => issue.status !== 'RESOLVED').length
  const averagePriority = issues.length
    ? Math.round(sum(issues.map((issue) => issue.priority_score)) / issues.length)
    : 0

  return {
    averagePriority,
    categoryDistribution: objectToChart(categoryBreakdown).slice(0, 8),
    criticalIssues,
    hostelDistribution: objectToChart(hostelBreakdown).slice(0, 8),
    insights: buildInsights({
      criticalIssues,
      dueSoon: resolutionBreakdown['Due soon'],
      openIssues,
      resolvedIssues,
      topCategory,
      topHostel,
      totalIssues: issues.length,
    }),
    issues,
    openIssues,
    resolvedIssues,
    resolutionDistribution: objectToChart(resolutionBreakdown),
    statusDistribution,
    timeline: buildTimeline(issues),
    topCategory,
    topHostel,
    totalComplaints,
    totalIssues: issues.length,
    urgencyDistribution: objectToChart(urgencyBreakdown),
  }
}

function buildInsights({
  criticalIssues,
  dueSoon,
  openIssues,
  resolvedIssues,
  topCategory,
  topHostel,
  totalIssues,
}: {
  criticalIssues: number
  dueSoon: number
  openIssues: number
  resolvedIssues: number
  topCategory: string
  topHostel: string
  totalIssues: number
}) {
  const insights = [
    {
      title: 'Highest category',
      description: topCategory === 'None' ? 'No category pattern is visible yet.' : `${topCategory} has the highest report load in this range.`,
    },
    {
      title: 'Hostel pressure',
      description: topHostel === 'None' ? 'No hostel has reported activity in this range.' : `${topHostel} has the most repeated student reports.`,
    },
    {
      title: 'Active workload',
      description: openIssues > 0 ? `${openIssues} issues still need staff follow-up.` : 'All visible issues are resolved in this range.',
    },
    {
      title: 'Time pressure',
      description: criticalIssues > 0 || dueSoon > 0 ? `${criticalIssues} high-need and ${dueSoon} due-soon issues need review.` : 'No high time-pressure issue is visible in this range.',
    },
    {
      title: 'Resolution progress',
      description: totalIssues > 0 ? `${resolvedIssues} of ${totalIssues} grouped issues are resolved.` : 'Resolution progress will appear after reports are submitted.',
    },
  ]
  return insights
}

function buildTimeline(issues: IssueSummary[]) {
  const groups = issues.reduce<Record<string, number>>((counts, issue) => {
    const date = new Date(issueDate(issue))
    const label = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    counts[label] = (counts[label] ?? 0) + issue.complaint_count
    return counts
  }, {})
  return objectToChart(groups).sort((a, b) => a.label.localeCompare(b.label)).slice(-8)
}

function objectToChart(data: Record<string, number>) {
  return Object.entries(data)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

function addMonths(timestamp: number, months: number) {
  const date = new Date(timestamp)
  date.setMonth(date.getMonth() + months)
  return date.getTime()
}

function ReportsSkeleton() {
  return (
    <div className="loading-stack" aria-live="polite" aria-label="Loading reports">
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
