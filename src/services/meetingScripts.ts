import http from './http'

export interface MeetingScript {
  proposal_type: string
  content: string
  updated_at: string
}

export const getScript = (proposalType: string): Promise<MeetingScript> =>
  http.get(`/api/meeting-scripts/${proposalType}`).then((r) => r.data)

export const updateScript = (proposalType: string, content: string): Promise<MeetingScript> =>
  http.put(`/api/meeting-scripts/${proposalType}`, { content }).then((r) => r.data)

export const listScripts = (): Promise<MeetingScript[]> =>
  http.get('/api/meeting-scripts').then((r) => r.data)
