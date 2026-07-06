import type { TemplateResponse } from './templates'
import type { LLMModelResponse } from './llm'

export interface ActiveLLMModelResponse extends LLMModelResponse {
  provider_name: string
  provider_slug: string
}

export interface AppConfigFull {
  active_alloc_template_id?: number | null
  active_dev_template_id?: number | null
  active_assessment_template_id?: number | null
  active_llm_model_id?: number | null
  active_alloc_template?: TemplateResponse | null
  active_dev_template?: TemplateResponse | null
  active_assessment_template?: TemplateResponse | null
  active_llm_model?: ActiveLLMModelResponse | null
  storage_backend: string
  local_drive_root: string
  google_auth_mode: string
  google_drive_root_folder_id?: string | null
  google_shared_drive_id?: string | null
  use_env_proxy: boolean
  transcript_strategy: string
  transcript_chunk_size: number
  /** @deprecated legado — não exibir na UI; backend pode retornar mesmo assim */
  generation_mode?: string
}

export interface AppConfigUpdate {
  active_alloc_template_id?: number | null
  active_dev_template_id?: number | null
  active_assessment_template_id?: number | null
  active_llm_model_id?: number | null
  storage_backend?: string
  local_drive_root?: string
  google_auth_mode?: string
  google_drive_root_folder_id?: string | null
  google_shared_drive_id?: string | null
  use_env_proxy?: boolean
  transcript_strategy?: string
  transcript_chunk_size?: number
  /** @deprecated legado — enviar sempre 'completo' por compatibilidade com o backend */
  generation_mode?: string
}
