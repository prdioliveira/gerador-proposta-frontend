import http from './http'
import type { MarginOption, MarginAdminResponse, MarginCreate, MarginUpdate } from '../types'

export const getMargins = (): Promise<{ options: MarginOption[] }> =>
  http.get('/api/margins').then((r) => r.data)

export const listMarginsAdmin = (): Promise<MarginAdminResponse[]> =>
  http.get('/api/margins/admin').then((r) => r.data)

export const createMargin = (data: MarginCreate): Promise<MarginAdminResponse> =>
  http.post('/api/margins/admin', data).then((r) => r.data)

export const updateMargin = (id: number, data: MarginUpdate): Promise<MarginAdminResponse> =>
  http.put(`/api/margins/admin/${id}`, data).then((r) => r.data)

export const deleteMargin = (id: number) =>
  http.delete(`/api/margins/admin/${id}`)
