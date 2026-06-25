export interface TemplateResponse {
  id: number
  name: string
  proposal_type: 'alocacao' | 'desenvolvimento' | 'assessment'
  file_path?: string
  uploaded_at?: string
  is_active: boolean
}

export interface TemplateCreate {
  name: string
  proposal_type: 'alocacao' | 'desenvolvimento' | 'assessment'
}

export interface TemplateUpdate {
  name?: string
  is_active?: boolean
}
