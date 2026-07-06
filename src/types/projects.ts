export interface SelectedProfile {
  perfil: string
  seniority: string
  quantity?: number
}

export interface ProjectFile {
  id: string
  name: string
  size?: number
  modifiedTime?: string
  mimeType?: string
}

export interface FolderSummary {
  name: string
  files: ProjectFile[]
}

export interface ProjectSummary {
  client: string
  project: string
  status: string
  folders: Record<string, FolderSummary>
  site?: string
  margin?: string
  proposalType?: string
  proposalTypeLabel?: string
  hasInput?: boolean
  rootLabel?: string
  selectedProfiles?: SelectedProfile[]
}

export interface ProjectDetailResponse {
  project: ProjectSummary
  details: string
}

export interface ProjectMeta {
  site: string
  margin: string
  proposalType: string
  details: string
}
