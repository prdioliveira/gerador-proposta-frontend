export interface SelectedProfile {
  perfil: string
  seniority: string
}

export interface RatecardOption {
  perfil: string
  seniority: string
}

export interface MarginOption {
  key: string
  label: string
  percent: number
}

export interface ProjectFile {
  id: string
  name: string
  size: number
  modified_time: string
  mime_type: string
}

export interface FolderSummary {
  name: string
  files: ProjectFile[]
}

export interface ProjectSummary {
  client: string
  project: string
  status: 'sem_arquivos' | 'em_andamento' | 'concluido' | 'erro'
  folders: FolderSummary[]
  site_url?: string
  proposal_type?: string
  margin_key?: string
}

export interface ProjectDetails {
  site_url?: string
  proposal_type?: string
  margin_key?: string
  details_text?: string
}

export interface GenerationJob {
  id: string
  project_client: string
  project_name: string
  job_type: 'documentation' | 'proposal'
  status: 'pending' | 'running' | 'done' | 'error'
  started_at?: string
  finished_at?: string
  result_filename?: string
  error_message?: string
  warnings?: string[]
}

// --- LLM ---

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

// --- Templates PPT ---

export interface TemplateResponse {
  id: number
  name: string
  proposal_type: 'alocacao' | 'desenvolvimento'
  file_path?: string
  uploaded_at?: string
  is_active: boolean
}

export interface TemplateCreate {
  name: string
  proposal_type: 'alocacao' | 'desenvolvimento'
}

export interface TemplateUpdate {
  name?: string
  is_active?: boolean
}

// --- AppConfig ---

export interface AppConfigFull {
  active_alloc_template_id?: number
  active_dev_template_id?: number
  active_llm_model_id?: number
  active_alloc_template?: TemplateResponse
  active_dev_template?: TemplateResponse
  active_llm_model?: LLMModelResponse & { provider: LLMProviderFull }
}

export interface AppConfigUpdate {
  active_alloc_template_id?: number | null
  active_dev_template_id?: number | null
  active_llm_model_id?: number | null
}
