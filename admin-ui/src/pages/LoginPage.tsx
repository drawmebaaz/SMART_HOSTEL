import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BrainCircuit, Fingerprint, LogIn, RadioTower, ShieldCheck } from 'lucide-react'

import { oauthProvider, oauthStartUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
        <div className="auth-intel-panel">
          <p className="eyebrow">Hostel operations AI</p>
          <h1>Command access</h1>
          <p className="muted">
            Real-time grievance intake, risk clustering, SLA pressure, and action intelligence for hostel teams.
          </p>
          <div className="auth-signal-grid" aria-label="Platform signals">
            <span>
              <BrainCircuit aria-hidden="true" />
              AI triage
            </span>
            <span>
              <RadioTower aria-hidden="true" />
              Live queue
            </span>
            <span>
              <ShieldCheck aria-hidden="true" />
              Role gated
            </span>
          </div>
        </div>

        <div className="auth-panel">
          <div>
            <p className="eyebrow">Secure session</p>
            <h2>Sign in</h2>
            <p className="muted">Use your student or admin account.</p>
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
            <input
              id="login-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              required
            />
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
