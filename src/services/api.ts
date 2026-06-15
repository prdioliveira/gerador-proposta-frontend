import axios from 'axios'
import type {
  ProjectSummary,
  ProjectDetails,
  SelectedProfile,
  RatecardOption,
  MarginOption,
  AppConfigFull,
  AppConfigUpdate,
  LLMProviderFull,
  LLMProviderCreate,
  LLMProviderUpdate,
  LLMModelCreate,
  LLMModelUpdate,
  LLMModelResponse,
  TemplateResponse,
  TemplateCreate,
  TemplateUpdate,
  GenerationJob,
} from '../types'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[API Error]', error.response?.status, error.response?.data)
    return Promise.reject(error)
  }
)

// --- Projetos ---

export const listProjects = () =>
  http.get<ProjectSummary[]>('/api/projects').then((r) => r.data)

export const getProject = (client: string, name: string) =>
  http.get<ProjectSummary>('/api/project', { params: { client, project: name } }).then((r) => r.data)

export const createProject = (data: {
  client: string
  project: string
  site_url?: string
  proposal_type?: string
  margin_key?: string
}) => http.post<ProjectSummary>('/api/projects', data).then((r) => r.data)

export const deleteProject = (client: string, name: string) =>
  http.delete('/api/project', { params: { client, project: name } })

export const saveProjectDetails = (client: string, name: string, details: ProjectDetails) =>
  http.post('/api/project-details', { client, project: name, ...details })

export const setProfiles = (client: string, name: string, profiles: SelectedProfile[]) =>
  http.post('/api/profiles', { client, project: name, profiles })

// --- Arquivos ---

export const uploadFile = (
  client: string,
  projectName: string,
  folder: string,
  file: File,
  onProgress?: (percent: number) => void
) => {
  const form = new FormData()
  form.append('client', client)
  form.append('project', projectName)
  form.append('folder', folder)
  form.append('file', file)
  return http.post('/api/upload', form, {
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total))
    },
  })
}

export const downloadFile = (
  client: string,
  projectName: string,
  folder: string,
  filename: string
): Promise<Blob> =>
  http
    .get('/api/download', {
      params: { client, project: projectName, folder, filename },
      responseType: 'blob',
    })
    .then((r) => r.data as Blob)

export const downloadProjectZip = (client: string, projectName: string): Promise<Blob> =>
  http
    .get('/api/download-project', {
      params: { client, project: projectName },
      responseType: 'blob',
    })
    .then((r) => r.data as Blob)

// --- Geração ---

export const generateDocumentation = (client: string, name: string) =>
  http
    .post<{ job_id: string; status: string }>('/api/generate-documentation', {
      client,
      project: name,
    })
    .then((r) => r.data)

export const generateProposal = (client: string, name: string) =>
  http
    .post<{ job_id: string; status: string }>('/api/generate-proposal', {
      client,
      project: name,
    })
    .then((r) => r.data)

export const getJobStatus = (jobId: string) =>
  http.get<GenerationJob>(`/api/job/${jobId}`).then((r) => r.data)

export const pollJob = (
  jobId: string,
  onUpdate: (job: GenerationJob) => void,
  onDone: (job: GenerationJob) => void,
  onError: (job: GenerationJob) => void
): (() => void) => {
  let stopped = false
  let attempts = 0
  const MAX_ATTEMPTS = 100 // 100 × 3s = 5 minutos

  const poll = async () => {
    if (stopped) return
    try {
      const job = await getJobStatus(jobId)
      onUpdate(job)
      if (job.status === 'done') { onDone(job); return }
      if (job.status === 'error') { onError(job); return }
      attempts++
      if (attempts >= MAX_ATTEMPTS) {
        onError({ ...job, error_message: 'Tempo limite excedido (5 minutos)' })
        return
      }
      setTimeout(poll, 3000)
    } catch {
      if (!stopped) setTimeout(poll, 3000)
    }
  }

  setTimeout(poll, 3000)
  return () => { stopped = true }
}

// --- Config Geral ---

export const getConfig = () =>
  http.get('/api/config').then((r) => r.data)

export const getRatecard = (): Promise<RatecardOption[]> =>
  http.get('/api/ratecard').then((r) => r.data)

export const getMargins = (): Promise<MarginOption[]> =>
  http.get('/api/margins').then((r) => r.data)

// --- LLMs ---

export const listProviders = (): Promise<LLMProviderFull[]> =>
  http.get('/api/llm/providers').then((r) => r.data)

export const createProvider = (data: LLMProviderCreate): Promise<LLMProviderFull> =>
  http.post('/api/llm/providers', data).then((r) => r.data)

export const updateProvider = (id: number, data: LLMProviderUpdate): Promise<LLMProviderFull> =>
  http.put(`/api/llm/providers/${id}`, data).then((r) => r.data)

export const deleteProvider = (id: number) =>
  http.delete(`/api/llm/providers/${id}`)

export const createModel = (providerId: number, data: LLMModelCreate): Promise<LLMModelResponse> =>
  http.post(`/api/llm/providers/${providerId}/models`, data).then((r) => r.data)

export const updateModel = (
  providerId: number,
  modelId: number,
  data: LLMModelUpdate
): Promise<LLMModelResponse> =>
  http.put(`/api/llm/providers/${providerId}/models/${modelId}`, data).then((r) => r.data)

export const deleteModel = (providerId: number, modelId: number) =>
  http.delete(`/api/llm/providers/${providerId}/models/${modelId}`)

// --- Templates PPT ---

export const listTemplates = (proposalType?: string): Promise<TemplateResponse[]> =>
  http
    .get('/api/templates', {
      params: proposalType ? { proposal_type: proposalType } : undefined,
    })
    .then((r) => r.data)

export const createTemplate = (data: TemplateCreate): Promise<TemplateResponse> =>
  http.post('/api/templates', data).then((r) => r.data)

export const updateTemplate = (id: number, data: TemplateUpdate): Promise<TemplateResponse> =>
  http.put(`/api/templates/${id}`, data).then((r) => r.data)

export const deleteTemplate = (id: number) =>
  http.delete(`/api/templates/${id}`)

export const uploadTemplateFile = (
  id: number,
  file: File,
  onProgress?: (percent: number) => void
) => {
  const form = new FormData()
  form.append('file', file)
  return http.post(`/api/templates/${id}/upload`, form, {
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total))
    },
  })
}

// --- AppConfig ---

export const getAppConfig = (): Promise<AppConfigFull> =>
  http.get('/api/config/app').then((r) => r.data)

export const saveAppConfig = (data: AppConfigUpdate): Promise<AppConfigFull> =>
  http.put('/api/config/app', data).then((r) => r.data)
