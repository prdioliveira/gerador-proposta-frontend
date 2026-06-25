import http from './http'
import type { AppConfigFull, AppConfigUpdate } from '../types'

export const getConfig = () =>
  http.get('/api/config').then((r) => r.data)

export const getAppConfig = (): Promise<AppConfigFull> =>
  http.get('/api/config/app').then((r) => r.data)

export const saveAppConfig = (data: AppConfigUpdate): Promise<AppConfigFull> =>
  http.put('/api/config/app', data).then((r) => r.data)

export const getGoogleAuthUrl = (): Promise<{ url: string; redirectUri: string }> =>
  http.get('/api/google/auth-url').then((r) => r.data)

export const reloadConfig = (): Promise<{ message: string }> =>
  http.post('/api/reload-config').then((r) => r.data)
