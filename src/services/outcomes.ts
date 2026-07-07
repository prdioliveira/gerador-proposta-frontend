import http from './http'
import type { ProposalOutcome, OutcomeCreate, OutcomeUpdate, OutcomeSummary } from '../types/outcomes'

export const getOutcomeSummary = () =>
  http.get<OutcomeSummary>('/api/outcomes/summary').then((r) => r.data)

export const listOutcomes = (client: string, project: string) =>
  http.get<ProposalOutcome[]>(`/api/outcomes/${encodeURIComponent(client)}/${encodeURIComponent(project)}`).then((r) => r.data)

export const createOutcome = (data: OutcomeCreate) =>
  http.post<ProposalOutcome>('/api/outcomes', data).then((r) => r.data)

export const updateOutcome = (id: number, data: OutcomeUpdate) =>
  http.patch<ProposalOutcome>(`/api/outcomes/${id}`, data).then((r) => r.data)

export const deleteOutcome = (id: number) =>
  http.delete(`/api/outcomes/${id}`)
