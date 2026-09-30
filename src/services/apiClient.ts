import { API_BASE_URL } from './apiConfig'
import { getAccessToken } from './auth/authTokenService'

export async function authorizedFetch(path: string, options: RequestInit = {}) {
  const token = getAccessToken()
  const headers = new Headers(options.headers)

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })
}
