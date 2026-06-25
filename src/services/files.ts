import http from './http'

export const uploadFile = (
  client: string,
  projectName: string,
  folder: string,
  file: File,
  onProgress?: (percent: number) => void,
) => {
  const form = new FormData()
  form.append('client', client)
  form.append('project', projectName)
  form.append('folder', folder)
  form.append('file', file)
  return http.post('/api/upload', form, {
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total))
    },
  })
}

const baseURL: string = import.meta.env.VITE_API_URL ?? ''

function triggerDownload(url: string, filename: string): void {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

export function downloadFile(client: string, projectName: string, filename: string): void {
  const params = new URLSearchParams({ client, project: projectName, filename })
  triggerDownload(`${baseURL}/api/download?${params}`, filename)
}

export async function fetchFileText(client: string, projectName: string, filename: string): Promise<string> {
  const params = new URLSearchParams({ client, project: projectName, filename })
  const response = await http.get<string>(`/api/download?${params}`, { responseType: 'text' })
  return response.data
}

export function downloadProjectZip(client: string, projectName: string): void {
  const params = new URLSearchParams({ client, project: projectName })
  const zipName = `${client}_${projectName}.zip`
  triggerDownload(`${baseURL}/api/download-project?${params}`, zipName)
}
