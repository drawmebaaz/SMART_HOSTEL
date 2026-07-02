import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Fingerprint } from 'lucide-react'

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
    <main className="auth-page auth-reference-page">
      <section className="auth-card" aria-label="Smart Hostel Grievance sign in">
        <h1>Login.</h1>
        <div className="auth-card-copy">
          <h2>Welcome!</h2>
          <p>Please sign in to access your account</p>
        </div>
        <form onSubmit={submit} className="auth-card-form">
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
            <button className="primary-button auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
        </form>
        {oauthStartUrl && (
          <a className="secondary-button auth-oauth-button" href={oauthStartUrl}>
            <Fingerprint aria-hidden="true" />
            Continue with {oauthProvider}
          </a>
        )}
        <p className="auth-switch">
          Don&apos;t have an account yet? <Link to="/register">Create an account</Link>
        </p>
      </section>
    </main>
  )
}
