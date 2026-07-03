import { useEffect, useState } from 'react'
import { LogOut, Menu, X } from 'lucide-react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../auth/AuthContext'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isNavOpen, setIsNavOpen] = useState(false)

  const homePath = user?.role === 'ADMIN' ? '/admin' : '/student'
  const primaryNavLabel = user?.role === 'ADMIN' ? 'Dashboard' : 'Submit complaint'

  const handleLogout = async () => {
    setIsNavOpen(false)
    await logout()
    navigate('/login')
  }

  useEffect(() => {
    setIsNavOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.classList.toggle('nav-drawer-open', isNavOpen)
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsNavOpen(false)
      }
    }

    if (isNavOpen) {
      window.addEventListener('keydown', closeOnEscape)
    }

    return () => {
      document.body.classList.remove('nav-drawer-open')
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [isNavOpen])

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <button
            aria-controls="side-navigation"
            aria-expanded={isNavOpen}
            aria-label="Open menu"
            className="nav-menu-button"
            type="button"
            onClick={() => setIsNavOpen(true)}
          >
            <Menu aria-hidden="true" />
          </button>

          <Link to={homePath} className="brand">
            <span>
              <strong>Smart Hostel</strong>
              <small>Hostel help desk</small>
            </span>
          </Link>
          <nav className="nav desktop-nav" aria-label="Primary navigation">
            <NavLink end to={homePath}>{primaryNavLabel}</NavLink>
            {user?.role === 'ADMIN' && <NavLink end to="/admin/issues">Issues</NavLink>}
            {user?.role === 'ADMIN' && <NavLink to="/admin/reports">Reports</NavLink>}
            {user?.role === 'STUDENT' && <NavLink to="/student/reports">My complaints</NavLink>}
          </nav>
          <div className="account">
            <span>{user?.name}</span>
            <button className="icon-button" type="button" onClick={handleLogout} aria-label="Log out">
              <LogOut aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <button
        aria-label="Close menu"
        className={`nav-backdrop ${isNavOpen ? 'open' : ''}`}
        tabIndex={isNavOpen ? 0 : -1}
        type="button"
        onClick={() => setIsNavOpen(false)}
      />

      <aside
        aria-hidden={!isNavOpen}
        aria-label="Navigation menu"
        className={`side-nav ${isNavOpen ? 'open' : ''}`}
        id="side-navigation"
      >
        <div className="side-nav-header">
          <Link to={homePath} className="side-nav-title">
            <strong>Smart Hostel</strong>
            <span>Hostel help desk</span>
          </Link>
          <button
            aria-label="Close menu"
            className="icon-button"
            type="button"
            onClick={() => setIsNavOpen(false)}
          >
            <X aria-hidden="true" />
          </button>
        </div>

        <nav className="side-nav-links" aria-label="Side navigation">
          <NavLink end to={homePath}>{primaryNavLabel}</NavLink>
          {user?.role === 'ADMIN' && <NavLink end to="/admin/issues">Issues</NavLink>}
          {user?.role === 'ADMIN' && <NavLink to="/admin/reports">Reports</NavLink>}
          {user?.role === 'STUDENT' && <NavLink to="/student/reports">My complaints</NavLink>}
        </nav>

        <div className="side-nav-footer">
          <span>Signed in as</span>
          <strong>{user?.name}</strong>
          <button className="secondary-button" type="button" onClick={handleLogout}>
            <LogOut aria-hidden="true" />
            Log out
          </button>
        </div>
      </aside>

      <main className="page">{children}</main>
    </div>
  )
}
