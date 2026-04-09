const TOKEN_KEY = 'smartfund.jwt';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function getUserRole(): 'Admin' | 'Member' | null {
  const token = getAuthToken();
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  const role = payload?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] as string | undefined
    ?? payload?.role as string | undefined;
  if (role === 'Admin' || role === 'Member') return role;
  return null;
}

export function getCurrentUserId(): number | null {
  const token = getAuthToken();
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  const nameId = payload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] as string | undefined
    ?? payload?.sub as string | undefined;
  const id = parseInt(nameId ?? '', 10);
  return isNaN(id) ? null : id;
}
