import type { IssueStatus, IssueSummary } from '../api/types'

export const ISSUE_STATUSES: Array<IssueStatus | 'ALL'> = ['ALL', 'OPEN', 'IN_PROGRESS', 'REOPENED', 'RESOLVED']

export function displayProblemTitle(title: string) {
  return title.replace(/\bissue\b/gi, 'problem')
}

export function displayAction(action: string) {
  return action.replace(/\bissues\b/gi, 'problems').replace(/\bissue\b/gi, 'problem')
}

export function formatNeedLevel(value: number, timeStatus?: string) {
  if (timeStatus === 'BREACHED') return 'High'
  if (timeStatus === 'AT_RISK' && value < 40) return 'Medium'
  if (value >= 70) return 'High'
  if (value >= 40) return 'Medium'
  return 'Low'
}

export function formatStatusTab(status: IssueStatus | 'ALL') {
  const labels: Record<IssueStatus | 'ALL', string> = {
    ALL: 'All Issues',
    OPEN: 'New',
    IN_PROGRESS: 'Being fixed',
    REOPENED: 'Needs review',
    RESOLVED: 'Resolved',
  }
  return labels[status]
}

export function formatStatusShort(status: IssueStatus | string) {
  const labels: Record<string, string> = {
    OPEN: 'New',
    IN_PROGRESS: 'Being fixed',
    REOPENED: 'Needs review',
    RESOLVED: 'Resolved',
  }
  return labels[status] ?? status.replace('_', ' ')
}

export function formatTimeStatus(status: string) {
  const labels: Record<string, string> = {
    ON_TRACK: 'On time',
    AT_RISK: 'Due soon',
    BREACHED: 'Late',
    RESOLVED: 'Done',
  }
  return labels[status] ?? status.replace('_', ' ')
}

export function sortProblemsForStaff(a: IssueSummary, b: IssueSummary) {
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

export function topBreakdownEntry(data: Record<string, number>) {
  return Object.entries(data).sort((a, b) => b[1] - a[1])[0] ?? null
}

export function issueShortId(id: string) {
  return `#${id.replaceAll('-', '').slice(0, 6).toUpperCase()}`
}

export function issueDate(issue: IssueSummary) {
  return issue.last_complaint_at ?? issue.updated_at ?? issue.created_at
}

export function percentage(value: number, max: number) {
  if (max <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)))
}
