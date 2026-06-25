import http from './http'
import type { PromptTemplateResponse, PromptTemplateCreate, PromptTemplateUpdate } from '../types'

export const listPromptTemplates = (): Promise<PromptTemplateResponse[]> =>
  http.get('/api/prompt-templates').then((r) => r.data)

export const createPromptTemplate = (data: PromptTemplateCreate): Promise<PromptTemplateResponse> =>
  http.post('/api/prompt-templates', data).then((r) => r.data)

export const updatePromptTemplate = (
  id: number,
  data: PromptTemplateUpdate,
): Promise<PromptTemplateResponse> =>
  http.put(`/api/prompt-templates/${id}`, data).then((r) => r.data)

export const deletePromptTemplate = (id: number) =>
  http.delete(`/api/prompt-templates/${id}`)
