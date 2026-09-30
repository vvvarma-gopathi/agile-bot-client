import { API_BASE_URL } from '../apiConfig'
import type { LoginResponse } from '../auth/authTokenService'

export type LoginPayload = {
  email: string
  password: string
}

export async function loginUser(payload: LoginPayload) {
  if (!payload.email || !payload.password) {
    throw new Error('Enter your email and password.')
  }

  const formData = new FormData()
  formData.append('email', payload.email)
  formData.append('password', payload.password)

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    body: formData,
  })

  const responseData: Partial<LoginResponse> & { message?: string } = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(responseData.message ?? 'Unable to log in.')
  }

  if (!responseData.access_token) {
    throw new Error('Login response did not include an access token.')
  }

  return {
    access_token: responseData.access_token,
    token_type: responseData.token_type ?? 'bearer',
  }
}
