import { LogOut } from 'lucide-react'
import { Link, NavLink, useNavigate } from 'react-router-dom'

import { useAuth } from '../auth/AuthContext'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link to={user?.role === 'ADMIN' ? '/admin' : '/student'} className="brand">
            <span>
              <strong>Smart Hostel</strong>
              <small>Hostel help desk</small>
            </span>
          </Link>
          <nav className="nav" aria-label="Primary navigation">
            {user?.role === 'ADMIN' ? (
              <NavLink to="/admin">
                Staff board
              </NavLink>
            ) : (
              <NavLink to="/student">
                My reports
              </NavLink>
            )}
          </nav>
          <div className="account">
            <span>{user?.name}</span>
            <button className="icon-button" type="button" onClick={handleLogout} aria-label="Log out">
              <LogOut aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>
      <main className="page">{children}</main>
    </div>
  )
}
