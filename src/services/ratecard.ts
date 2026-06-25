import http from './http'
import type {
  RatecardOption,
  RatecardProfileResponse,
  RatecardProfileCreate,
  RatecardProfileUpdate,
  RatecardRateResponse,
  RatecardRateCreate,
  RatecardRateUpdate,
} from '../types'

export const getRatecard = (): Promise<{ options: RatecardOption[] }> =>
  http.get('/api/ratecard').then((r) => r.data)

export const listRatecardProfiles = (): Promise<RatecardProfileResponse[]> =>
  http.get('/api/ratecard/profiles').then((r) => r.data)

export const createRatecardProfile = (data: RatecardProfileCreate): Promise<RatecardProfileResponse> =>
  http.post('/api/ratecard/profiles', data).then((r) => r.data)

export const updateRatecardProfile = (
  id: number,
  data: RatecardProfileUpdate,
): Promise<RatecardProfileResponse> =>
  http.put(`/api/ratecard/profiles/${id}`, data).then((r) => r.data)

export const deleteRatecardProfile = (id: number) =>
  http.delete(`/api/ratecard/profiles/${id}`)

export const createRatecardRate = (
  profileId: number,
  data: RatecardRateCreate,
): Promise<RatecardRateResponse> =>
  http.post(`/api/ratecard/profiles/${profileId}/rates`, data).then((r) => r.data)

export const updateRatecardRate = (
  profileId: number,
  rateId: number,
  data: RatecardRateUpdate,
): Promise<RatecardRateResponse> =>
  http.put(`/api/ratecard/profiles/${profileId}/rates/${rateId}`, data).then((r) => r.data)

export const deleteRatecardRate = (profileId: number, rateId: number) =>
  http.delete(`/api/ratecard/profiles/${profileId}/rates/${rateId}`)
