import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getAuthStatus, logout as logoutRequest } from '../services/auth'
import type { AuthUser } from '../types'

export const useAuthStore = defineStore('auth', () => {
  const authEnabled = ref(false)
  const authenticated = ref(false)
  const user = ref<AuthUser | null>(null)
  const allowedDomains = ref<string[]>([])
  const ready = ref(false)
  const checking = ref(false)
  const error = ref('')

  async function fetchStatus() {
    checking.value = true
    try {
      const status = await getAuthStatus()
      authEnabled.value = status.authEnabled
      authenticated.value = status.authenticated
      user.value = status.user
      allowedDomains.value = status.allowedDomains
      error.value = ''
    } catch {
      error.value = 'Não foi possível verificar a sessão. Tente novamente.'
    } finally {
      checking.value = false
      ready.value = true
    }
  }

  function markUnauthenticated() {
    authenticated.value = false
    user.value = null
  }

  async function logout() {
    try {
      await logoutRequest()
    } finally {
      markUnauthenticated()
    }
  }

  return {
    authEnabled,
    authenticated,
    user,
    allowedDomains,
    ready,
    checking,
    error,
    fetchStatus,
    markUnauthenticated,
    logout,
  }
})
