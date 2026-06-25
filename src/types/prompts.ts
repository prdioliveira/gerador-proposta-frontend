export interface PromptTemplateResponse {
  id: number
  name: string
  content: string
  is_active: boolean
  created_at: string
}

export interface PromptTemplateCreate {
  name: string
  content: string
  is_active: boolean
}

export interface PromptTemplateUpdate {
  name?: string
  content?: string
  is_active?: boolean
}
