import { Activity, ClipboardList, LogOut, ShieldCheck } from 'lucide-react'
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
            <span className="brand-mark">
              <ClipboardList aria-hidden="true" />
            </span>
            <span>
              <strong>Smart Hostel</strong>
              <small>Operations Desk</small>
            </span>
          </Link>
          <nav className="nav" aria-label="Primary navigation">
            {user?.role === 'STUDENT' && <NavLink to="/student">Student intake</NavLink>}
            {user?.role === 'ADMIN' && <NavLink to="/admin">Issue desk</NavLink>}
          </nav>
          <div className="topbar-status" aria-label="System status">
            <Activity aria-hidden="true" />
            <span>Online</span>
          </div>
          <div className="account">
            <ShieldCheck aria-hidden="true" />
            <span>{user?.name}</span>
            <small>{user?.role}</small>
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
