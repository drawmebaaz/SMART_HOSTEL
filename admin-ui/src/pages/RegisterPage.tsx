import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, KeyRound, UserPlus } from 'lucide-react'

import { useAuth } from '../auth/AuthContext'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')
    try {
      const user = await register(form)
      navigate(user.role === 'ADMIN' ? '/admin' : '/student')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-layout compact-auth" aria-label="Student registration">
        <div className="auth-intel-panel">
          <p className="eyebrow">Student intake</p>
          <h1>Join the grievance grid</h1>
          <p className="muted">
            Submit hostel signals in natural language and keep every complaint traceable to an operational issue.
          </p>
          <div className="auth-signal-grid" aria-label="Student account capabilities">
            <span>
              <CheckCircle2 aria-hidden="true" />
              Trackable
            </span>
            <span>
              <KeyRound aria-hidden="true" />
              Private
            </span>
          </div>
        </div>

        <div className="auth-panel">
          <div>
            <p className="eyebrow">Student access</p>
            <h2>Create account</h2>
            <p className="muted">Admin accounts are created from the server-side admin script.</p>
          </div>
        <form onSubmit={submit} className="form-stack">
          <label htmlFor="register-name">
            Full name
            <input
              id="register-name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              autoComplete="name"
              required
            />
          </label>
          <label htmlFor="register-email">
            Email
            <input
              id="register-email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              type="email"
              autoComplete="email"
              required
            />
          </label>
          <label htmlFor="register-password">
            Password
            <input
              id="register-password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              minLength={8}
              type="password"
              autoComplete="new-password"
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button" type="submit" disabled={isSubmitting}>
            <UserPlus aria-hidden="true" />
            {isSubmitting ? 'Creating...' : 'Create account'}
          </button>
        </form>
        <p className="muted auth-switch">
          Already registered?{' '}
          <Link to="/login">
            Sign in
            <ArrowRight aria-hidden="true" />
          </Link>
        </p>
        </div>
      </section>
    </main>
  )
}
