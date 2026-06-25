import http from './http'
import type {
  LLMProviderFull,
  LLMProviderCreate,
  LLMProviderUpdate,
  LLMModelCreate,
  LLMModelUpdate,
  LLMModelResponse,
} from '../types'

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
  data: LLMModelUpdate,
): Promise<LLMModelResponse> =>
  http.put(`/api/llm/providers/${providerId}/models/${modelId}`, data).then((r) => r.data)

export const deleteModel = (providerId: number, modelId: number) =>
  http.delete(`/api/llm/providers/${providerId}/models/${modelId}`)
