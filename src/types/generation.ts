export interface JobStep {
  step: string
  status: 'pending' | 'running' | 'done' | 'failed'
  message?: string | null
  started_at?: string | null
  finished_at?: string | null
}

export interface GenerationJob {
  id: string
  project_client: string
  project_name: string
  job_type: 'documentation' | 'proposal'
  status: 'pending' | 'running' | 'cancelling' | 'cancelled' | 'done' | 'error'
  started_at?: string
  finished_at?: string
  result_filename?: string
  error_message?: string
  warnings?: string[]
  steps?: JobStep[]
}
