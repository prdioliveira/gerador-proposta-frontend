import http from './http'

export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export const listMessages = (client: string, project: string): Promise<ChatMessage[]> =>
  http.get(`/api/projects/${encodeURIComponent(client)}/${encodeURIComponent(project)}/chat/messages`).then((r) => r.data)

export const sendMessage = (client: string, project: string, message: string): Promise<ChatMessage> =>
  http
    .post(`/api/projects/${encodeURIComponent(client)}/${encodeURIComponent(project)}/chat/messages`, { message })
    .then((r) => r.data)

export const clearMessages = (client: string, project: string): Promise<void> =>
  http.delete(`/api/projects/${encodeURIComponent(client)}/${encodeURIComponent(project)}/chat/messages`)
