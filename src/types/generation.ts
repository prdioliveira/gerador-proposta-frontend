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
