import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as api from '../services/api'
import type { ProjectSummary } from '../types'

export const useProjectsStore = defineStore('projects', () => {
  const projects = ref<ProjectSummary[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchProjects() {
    loading.value = true
    error.value = null
    try {
      // API retorna { projects: [...] }
      const data = (await api.listProjects()) as unknown as { projects: ProjectSummary[] }
      projects.value = data.projects ?? (data as unknown as ProjectSummary[])
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      error.value = err.response?.data?.error ?? 'Erro ao carregar projetos'
    } finally {
      loading.value = false
    }
  }

  async function createProject(payload: {
    client: string
    project: string
  }): Promise<ProjectSummary> {
    // API retorna { project: {...} }
    const data = (await api.createProject(payload)) as unknown as { project: ProjectSummary }
    const project = data.project ?? (data as unknown as ProjectSummary)
    projects.value.unshift(project)
    return project
  }

  async function deleteProject(client: string, name: string) {
    await api.deleteProject(client, name)
    projects.value = projects.value.filter(
      (p) => !(p.client === client && p.project === name)
    )
  }

  return { projects, loading, error, fetchProjects, createProject, deleteProject }
})
