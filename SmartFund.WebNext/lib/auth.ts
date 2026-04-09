const TOKEN_KEY = 'sf_token'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export function isAuthenticated(): boolean {
  return !!getToken()
}

export interface DecodedUser {
  name: string
  email: string
  role: string
  sub: string
}

export function decodeUser(): DecodedUser | null {
  const token = getToken()
  if (!token) return null
  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload))
    return {
      sub: decoded.sub ?? decoded['sub'] ?? '',
      name: decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ?? decoded.name ?? '',
      email: decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ?? decoded.email ?? '',
      role: decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ?? decoded.role ?? 'Member',
    }
  } catch {
    return null
  }
}
