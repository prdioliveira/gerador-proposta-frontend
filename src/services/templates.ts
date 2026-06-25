import http from './http'
import type { TemplateResponse, TemplateCreate, TemplateUpdate } from '../types'

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

export const downloadTemplateUrl = (id: number): string =>
  `${import.meta.env.VITE_API_URL ?? ''}/api/templates/${id}/download`

export const uploadTemplateFile = (
  id: number,
  file: File,
  onProgress?: (percent: number) => void,
) => {
  const form = new FormData()
  form.append('file', file)
  return http.post(`/api/templates/${id}/upload`, form, {
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total))
    },
  })
}
