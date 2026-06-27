import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, Fingerprint, LogIn } from 'lucide-react'

import { oauthProvider, oauthStartUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')
    try {
      const user = await login(email, password)
      navigate(user.role === 'ADMIN' ? '/admin' : '/student')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-layout" aria-label="Smart Hostel Grievance sign in">
        <div className="auth-intel-panel auth-minimal-panel">
          <div className="auth-brand-block">
            <div>
              <p className="eyebrow">Hostel access</p>
              <h1>Hostel help desk</h1>
              <p className="muted">
                Report hostel problems clearly and help staff resolve the most important problems first.
              </p>
            </div>
          </div>

          <div className="auth-minimal-list">
            <div>
              <span>Send reports with hostel, location, and useful details.</span>
            </div>

            <div>
              <span>Track whether your problem is new, being fixed, or resolved.</span>
            </div>
          </div>

          <p className="auth-note">
            Built for students and hostel staff.
          </p>
        </div>
        <div className="auth-panel">
          <div>
            <p className="eyebrow">Welcome back</p>
            <h2>Sign in</h2>
            <p className="muted">Use your student or staff account.</p>
          </div>
          <form onSubmit={submit} className="form-stack">
            <label htmlFor="login-email">
              Email
              <input
                id="login-email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                required
              />
            </label>
            <label htmlFor="login-password">
              Password
              <div className="password-field">
                <input
                  id="login-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                />
                <button
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </div>
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              <LogIn aria-hidden="true" />
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          {oauthStartUrl && (
            <a className="secondary-button" href={oauthStartUrl}>
              <Fingerprint aria-hidden="true" />
              Continue with {oauthProvider}
            </a>
          )}
          <p className="muted auth-switch">
            New student?{' '}
            <Link to="/register">
              Create an account
              <ArrowRight aria-hidden="true" />
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}
