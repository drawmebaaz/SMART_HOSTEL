import { Navigate } from 'react-router-dom'

import type { UserRole } from '../api/types'
import { useAuth } from '../auth/AuthContext'

export function ProtectedRoute({
  role,
  children,
}: {
  role?: UserRole
  children: React.ReactElement
}) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="screen-center">
        <div className="loader-card" aria-live="polite">
          <span className="loader-bar" />
          <strong>Loading workspace</strong>
          <small>Checking account access...</small>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (role && user.role !== role) {
    return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/student'} replace />
  }

  return children
}
