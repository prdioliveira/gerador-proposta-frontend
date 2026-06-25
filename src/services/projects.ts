import http from './http'
import type { ProjectSummary, ProjectDetailResponse, ProjectMeta, SelectedProfile } from '../types'

export const listProjects = () =>
  http.get<ProjectSummary[]>('/api/projects').then((r) => r.data)

export const getProject = (client: string, name: string): Promise<ProjectDetailResponse> =>
  http.get<ProjectDetailResponse>('/api/project', { params: { client, project: name } }).then((r) => r.data)

export const createProject = (data: { client: string; project: string }) =>
  http.post<{ project: ProjectSummary }>('/api/projects', data).then((r) => r.data)

export const deleteProject = (client: string, name: string) =>
  http.delete('/api/project', { params: { client, project: name } })

export const saveProjectDetails = (client: string, name: string, meta: ProjectMeta) =>
  http.post('/api/project-details', { client, project: name, ...meta }).then((r) => r.data)

export const addProfile = (
  client: string,
  name: string,
  perfil: string,
  seniority: string,
  quantity: number = 1,
) =>
  http
    .post<{ selectedProfiles: SelectedProfile[] }>('/api/profiles', {
      client,
      project: name,
      action: 'add',
      perfil,
      seniority,
      quantity,
    })
    .then((r) => r.data)

export const removeProfile = (client: string, name: string, perfil: string, seniority: string) =>
  http
    .post<{ selectedProfiles: SelectedProfile[] }>('/api/profiles', {
      client,
      project: name,
      action: 'remove',
      perfil,
      seniority,
    })
    .then((r) => r.data)
