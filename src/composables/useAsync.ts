import { ref } from 'vue'

export function useApiError() {
  return (e: unknown): string => {
    const r = (e as { response?: { data?: { detail?: string; error?: string } } }).response?.data
    return r?.detail ?? r?.error ?? 'Ocorreu um erro inesperado'
  }
}

export function useAsync<T>(fn: () => Promise<T>) {
  const data    = ref<T | null>(null)
  const loading = ref(false)
  const error   = ref('')

  const execute = async () => {
    loading.value = true
    error.value   = ''
    try {
      data.value = await fn()
    } catch (e) {
      const r = (e as { response?: { data?: { detail?: string; error?: string } } }).response?.data
      error.value = r?.detail ?? r?.error ?? 'Ocorreu um erro inesperado'
    } finally {
      loading.value = false
    }
  }

  return { data, loading, error, execute }
}
