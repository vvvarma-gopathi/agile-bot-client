import { useState } from 'react'
import type { FormEvent } from 'react'
import { registerUser } from '../../services/register/registerService'

type RegisterProps = {
  onLoginClick: () => void
}

type RegisterForm = {
  username: string
  name: string
  email: string
  phone: string
  password: string
  confirmPassword: string
  role: string
}

const initialForm: RegisterForm = {
  username: '',
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  role: '',
}

function FieldIcon({ type }: { type: 'user' | 'mail' | 'phone' | 'lock' }) {
  if (type === 'mail') {
    return <span aria-hidden="true" className="field-icon">&#9993;</span>
  }

  if (type === 'phone') {
    return <span aria-hidden="true" className="field-icon">&#9742;</span>
  }

  if (type === 'lock') {
    return <span aria-hidden="true" className="field-icon">&#128274;</span>
  }

  return <span aria-hidden="true" className="field-icon">&#128100;</span>
}

function Register({ onLoginClick }: RegisterProps) {
  const [form, setForm] = useState(initialForm)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const updateField = (field: keyof RegisterForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setError('')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    try {
      const result = await registerUser(form)
      setForm(initialForm)
      window.alert(result.message)
      onLoginClick()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create your account.')
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="field-grid">
        <label className="field">
          <span>User name</span>
          <div className="input-wrap">
            <FieldIcon type="user" />
            <input
              required
              type="text"
              value={form.username}
              placeholder="Choose a user name"
              onChange={(event) => updateField('username', event.target.value)}
            />
          </div>
          <small>Choose a unique user name</small>
        </label>

        <label className="field">
          <span>Full name</span>
          <div className="input-wrap">
            <FieldIcon type="user" />
            <input
              required
              type="text"
              value={form.name}
              placeholder="Enter your full name"
              onChange={(event) => updateField('name', event.target.value)}
            />
          </div>
          <small>Enter your full name</small>
        </label>

        <label className="field">
          <span>Email address</span>
          <div className="input-wrap">
            <FieldIcon type="mail" />
            <input
              required
              type="email"
              value={form.email}
              placeholder="Enter your email address"
              onChange={(event) => updateField('email', event.target.value)}
            />
          </div>
          <small>Enter your email address</small>
        </label>

        <label className="field">
          <span>Phone number</span>
          <div className="input-wrap">
            <FieldIcon type="phone" />
            <input
              required
              type="tel"
              value={form.phone}
              placeholder="Enter your phone number"
              onChange={(event) => updateField('phone', event.target.value)}
            />
          </div>
          <small>Enter your phone number</small>
        </label>

        <label className="field">
          <span>Role</span>
          <div className="input-wrap">
            <FieldIcon type="user" />
            <select required value={form.role} onChange={(event) => updateField('role', event.target.value)}>
              <option value="" disabled>Select your role</option>
              <option value="1">Project Manager</option>
              <option value="2">Developer</option>
              <option value="3">Admin</option>
              <option value="4">Stake Holder</option>
            </select>
          </div>
          <small>Select your role</small>
        </label>

        <label className="field">
          <span>Password</span>
          <div className="input-wrap">
            <FieldIcon type="lock" />
            <input
              required
              minLength={8}
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              placeholder="Create a strong password"
              onChange={(event) => updateField('password', event.target.value)}
            />
            <button className="visibility-button" type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <small>Create a strong password</small>
        </label>

        <label className="field">
          <span>Confirm password</span>
          <div className="input-wrap">
            <FieldIcon type="lock" />
            <input
              required
              minLength={8}
              type={showPassword ? 'text' : 'password'}
              value={form.confirmPassword}
              placeholder="Re-enter your password"
              onChange={(event) => updateField('confirmPassword', event.target.value)}
            />
            <button className="visibility-button" type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <small>Re-enter your password</small>
        </label>
      </div>

      {error && <p className="form-message error-message" role="alert">{error}</p>}
      <button className="submit-button" type="submit">Create Account</button>
      <p className="switch-copy">Already have an account? <button type="button" onClick={onLoginClick}>Login</button></p>
    </form>
  )
}

export default Register
