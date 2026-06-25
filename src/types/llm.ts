export interface LLMModelResponse {
  id: number
  provider_id: number
  name: string
  display_name: string
  is_active: boolean
}

export interface LLMProviderFull {
  id: number
  name: string
  slug: string
  api_key?: string
  base_url: string
  is_active: boolean
  models: LLMModelResponse[]
}

export interface LLMProviderCreate {
  name: string
  slug: string
  api_key?: string
  base_url: string
}

export interface LLMProviderUpdate {
  name?: string
  slug?: string
  api_key?: string
  base_url?: string
  is_active?: boolean
}

export interface LLMModelCreate {
  name: string
  display_name: string
}

export interface LLMModelUpdate {
  name?: string
  display_name?: string
  is_active?: boolean
}
