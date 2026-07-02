import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'

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
    <main className="auth-page auth-reference-page">
      <section className="auth-card auth-card-register" aria-label="Student registration">
        <h1>Signup.</h1>
        <div className="auth-card-copy">
          <h2>Welcome!</h2>
          <p>Create your student account</p>
        </div>
        <form onSubmit={submit} className="auth-card-form">
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
            <button className="primary-button auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create account'}
            </button>
        </form>
        <p className="auth-switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </section>
    </main>
  )
}
