import { API_BASE_URL } from '../apiConfig'

export type RegisterPayload = {
  username: string
  name: string
  email: string
  phone: string
  password: string
  confirmPassword: string
  role: string
}

const REGISTER_URL = `${API_BASE_URL}/auth/register`

export async function registerUser(payload: RegisterPayload) {
  if (!payload.username || !payload.name || !payload.email || !payload.phone || !payload.password || !payload.confirmPassword || !payload.role) {
    throw new Error('Please complete all fields.')
  }

  if (payload.password.length < 8) {
    throw new Error('Password must be at least 8 characters.')
  }
  if (payload.password!=payload.confirmPassword){
    throw new Error('Password not matched check the passwords .')
  }

  const formData = new FormData()
  formData.append('user_name', payload.username)
  formData.append('name', payload.name)
  formData.append('email', payload.email)
  formData.append('phone_number', payload.phone)
  formData.append('password', payload.password)
  formData.append('role_id', payload.role)

  const response = await fetch(REGISTER_URL, {
    method: 'POST',
    body: formData,
  })

  const responseData: { message?: string } = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(responseData.message ?? 'Unable to create your account.')
  }

  return {
    message: responseData.message ?? 'User registered successfully',
  }
}
