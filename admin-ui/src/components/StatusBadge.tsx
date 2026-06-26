import type { IssueStatus } from '../api/types'

export function StatusBadge({ status }: { status: IssueStatus | string }) {
  const label = statusLabel(status)
  return (
    <span aria-label={`Progress ${label}`} className={`status status-${status.toLowerCase()}`}>
      {label}
    </span>
  )
}

function statusLabel(status: IssueStatus | string) {
  const labels: Record<string, string> = {
    OPEN: 'New',
    IN_PROGRESS: 'Being fixed',
    REOPENED: 'Needs review',
    RESOLVED: 'Resolved',
  }
  return labels[status] ?? status.replace('_', ' ')
}
