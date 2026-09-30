const ACCESS_TOKEN_COOKIE = 'agile_bot_access_token'
const ACCESS_TOKEN_MAX_AGE = 60 * 60

export type LoginResponse = {
  access_token: string
  token_type: string
}

export function saveAccessToken(token: string) {
  const secureFlag = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(token)}; Max-Age=${ACCESS_TOKEN_MAX_AGE}; Path=/; SameSite=Lax${secureFlag}`
}

export function getAccessToken() {
  const tokenCookie = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(`${ACCESS_TOKEN_COOKIE}=`))

  return tokenCookie ? decodeURIComponent(tokenCookie.split('=').slice(1).join('=')) : null
}

export function getAccessTokenUserId() {
  const token = getAccessToken()
  const payload = token?.split('.')[1]
  if (!payload) return ''

  try {
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decodedPayload = atob(normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '='))
    const claims: unknown = JSON.parse(decodedPayload)
    if (!claims || typeof claims !== 'object') return ''

    const record = claims as Record<string, unknown>
    for (const key of ['user_id', 'userId', 'id', 'sub']) {
      if (typeof record[key] === 'string') return record[key]
    }
  } catch {
    return ''
  }

  return ''
}

export function clearAccessToken() {
  document.cookie = `${ACCESS_TOKEN_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`
}
