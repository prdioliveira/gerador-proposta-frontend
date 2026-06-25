export interface MarginOption {
  key: string
  label: string
  percent: number
}

export interface MarginAdminResponse {
  id: number
  key: string
  label: string
  percent: number
}

export interface MarginCreate {
  key: string
  label: string
  percent: number
}

export interface MarginUpdate {
  label?: string
  percent?: number
}
