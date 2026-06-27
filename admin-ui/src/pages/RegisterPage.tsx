import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, UserPlus } from 'lucide-react'

import { useAuth } from '../auth/AuthContext'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
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
        <div className="auth-intel-panel auth-minimal-panel">
          <div className="auth-brand-block">
            <div>
              <p className="eyebrow">Student account</p>
              <h1>Create your hostel help desk account</h1>
              <p className="muted">
                Send hostel reports, keep a record of them, and track when the problem moves forward.
              </p>
            </div>
          </div>

          <div className="auth-minimal-list">
            <div>
              <span>Your reports are saved with hostel and location details.</span>
            </div>

            <div>
              <span>Track whether your reported problem is new, being fixed, or resolved.</span>
            </div>
          </div>

          <p className="auth-note">
            Student accounts only. Staff access is managed separately.
          </p>
        </div>

        <div className="auth-panel">
          <div>
            <p className="eyebrow">Student access</p>
            <h2>Create account</h2>
            <p className="muted">Staff accounts are created separately by the hostel team.</p>
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
              <div className="password-field">
                <input
                  id="register-password"
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  minLength={8}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
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
