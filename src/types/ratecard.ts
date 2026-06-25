export interface RatecardOption {
  perfil: string
  seniority: string
  label?: string
}

export interface RatecardRateResponse {
  id: number
  profile_id: number
  seniority: string
  seniority_aliases: string[]
  hourly_rate: number
}

export interface RatecardProfileResponse {
  id: number
  name: string
  slug: string
  rates: RatecardRateResponse[]
}

export interface RatecardProfileCreate {
  name: string
  slug: string
}

export interface RatecardProfileUpdate {
  name?: string
  slug?: string
}

export interface RatecardRateCreate {
  seniority: string
  seniority_aliases: string[]
  hourly_rate: number
}

export interface RatecardRateUpdate {
  seniority?: string
  seniority_aliases?: string[]
  hourly_rate?: number
}
