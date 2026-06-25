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

export const pollJob = (
  jobId: string,
  onUpdate: (job: GenerationJob) => void,
  onDone: (job: GenerationJob) => void,
  onError: (job: GenerationJob) => void,
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
