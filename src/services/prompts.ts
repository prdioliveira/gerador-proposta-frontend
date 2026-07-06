import http from './http'
import type {
  PromptCatalogResponse,
  PromptTemplateCreate,
  PromptTemplateListParams,
  PromptTemplateResponse,
  PromptTemplateUpdate,
} from '../types'

export const getPromptCatalog = (): Promise<PromptCatalogResponse> =>
  http.get('/api/prompt-templates/catalog').then((r) => r.data)

export const listPromptTemplates = (
  params?: PromptTemplateListParams,
): Promise<PromptTemplateResponse[]> =>
  http.get('/api/prompt-templates', { params }).then((r) => r.data)

export const createPromptTemplate = (data: PromptTemplateCreate): Promise<PromptTemplateResponse> =>
  http.post('/api/prompt-templates', data).then((r) => r.data)

export const updatePromptTemplate = (
  id: number,
  data: PromptTemplateUpdate,
): Promise<PromptTemplateResponse> =>
  http.put(`/api/prompt-templates/${id}`, data).then((r) => r.data)

export const deletePromptTemplate = (id: number) =>
  http.delete(`/api/prompt-templates/${id}`)
