import http from './http'
import type { GenerationJob } from '../types'

export const generateDocumentation = (client: string, name: string) =>
  http
    .post<{ job_id: string; status: string }>('/api/generate-documentation', { client, project: name })
    .then((r) => r.data)

export const generateProposal = (client: string, name: string) =>
  http
    .post<{ job_id: string; status: string }>('/api/generate-proposal', { client, project: name })
    .then((r) => r.data)

export const getJobStatus = (jobId: string) =>
  http.get<GenerationJob>(`/api/job/${jobId}`).then((r) => r.data)

