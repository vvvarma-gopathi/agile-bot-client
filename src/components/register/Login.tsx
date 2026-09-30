import { useState } from 'react'
import type { FormEvent } from 'react'
import { loginUser } from '../../services/login/loginService'
import { saveAccessToken } from '../../services/auth/authTokenService'

type LoginProps = {
  onRegisterClick: () => void
  onLoginSuccess: () => void
}

function Login({ onRegisterClick, onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage('')

    try {
      const result = await loginUser({ email, password })
      saveAccessToken(result.access_token)
      onLoginSuccess()
    } catch (submitError) {
      setMessage(submitError instanceof Error ? submitError.message : 'Unable to log in.')
    }
  }

  return (
    <form className="auth-form login-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>Email address</span>
        <div className="input-wrap">
          <span aria-hidden="true" className="field-icon">&#9993;</span>
          <input required type="email" value={email} placeholder="Enter your email address" onChange={(event) => setEmail(event.target.value)} />
        </div>
      </label>

      <label className="field">
        <span>Password</span>
        <div className="input-wrap">
          <span aria-hidden="true" className="field-icon">&#128274;</span>
          <input required type={showPassword ? 'text' : 'password'} value={password} placeholder="Enter your password" onChange={(event) => setPassword(event.target.value)} />
          <button className="visibility-button" type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </label>

      {message && <p className="form-message success-message" role="status">{message}</p>}
      <button className="submit-button" type="submit">Login</button>
      <p className="switch-copy">New to Agile Bot? <button type="button" onClick={onRegisterClick}>Create an account</button></p>
    </form>
  )
}

export default Login
