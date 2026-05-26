import type { IssueStatus } from '../api/types'

export function StatusBadge({ status }: { status: IssueStatus | string }) {
  const label = status.replace('_', ' ')
  return (
    <span aria-label={`Status ${label}`} className={`status status-${status.toLowerCase()}`}>
      {label}
    </span>
  )
}
