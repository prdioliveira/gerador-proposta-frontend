import http from './http'
import type { AuthStatus } from '../types'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

export const getAuthStatus = () => http.get<AuthStatus>('/api/auth/me').then((r) => r.data)

export const getGoogleLoginUrl = (returnTo = '/') =>
  http
    .get<{ url: string; redirectUri: string }>('/api/auth/google/url', { params: { returnTo } })
    .then((r) => r.data)

export const logout = () => http.post<{ ok: boolean }>('/api/auth/logout').then((r) => r.data)

// Redirecionamento simples: o backend leva ao consentimento Google e volta para `returnTo`
// depois de criar a sessao (cookie HTTP-only). Nao ha token para o frontend manipular.
export function startGoogleLogin(returnTo: string = window.location.pathname || '/') {
  const url = new URL(`${API_BASE}/api/auth/google/start`, window.location.origin)
  url.searchParams.set('returnTo', returnTo)
  window.location.href = url.toString()
}
