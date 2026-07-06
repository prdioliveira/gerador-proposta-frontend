export interface GenerationModeResponse {
  id: number
  code: string
  name: string
  description: string
  sort_order: number
  is_active: boolean
}

export interface PromptDefinitionResponse {
  id: number
  generation_mode_id: number
  mode_code: string
  kind: string
  label: string
  description: string
  required: boolean
  sort_order: number
  is_active: boolean
}

export interface PromptCatalogResponse {
  modes: GenerationModeResponse[]
  definitions: PromptDefinitionResponse[]
}

export interface PromptTemplateResponse {
  id: number
  name: string
  content: string
  kind: string
  generation_mode_id: number | null
  definition_id: number | null
  mode_code: string | null
  definition_label: string | null
  is_active: boolean
  created_at: string
  updated_at: string | null
}

export interface PromptTemplateCreate {
  name: string
  content: string
  kind: string
  generation_mode_id?: number | null
  definition_id?: number | null
  mode_code?: string | null
  is_active?: boolean
}

export interface PromptTemplateUpdate {
  name?: string
  content?: string
  kind?: string
  generation_mode_id?: number | null
  definition_id?: number | null
  mode_code?: string | null
  is_active?: boolean
}

export interface PromptTemplateListParams {
  mode_code?: string
  definition_id?: number
  kind?: string
}
