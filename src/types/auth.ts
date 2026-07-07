export interface AuthUser {
  id: number
  email: string
  name: string
  picture?: string | null
  domain: string
}

export interface AuthStatus {
  authEnabled: boolean
  authenticated: boolean
  allowedDomains: string[]
  user: AuthUser | null
}
