import axios from 'axios'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  // A sessao de autenticacao vive em cookie HTTP-only; sem isso o cookie
  // nao e enviado quando frontend e backend estao em origens diferentes.
  withCredentials: true,
})

export const AUTH_REQUIRED_EVENT = 'auth:required'

http.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[API Error]', error.response?.status, error.response?.data)
    if (error.response?.status === 401 && error.response?.data?.code === 'AUTH_REQUIRED') {
      // Desacoplado da store via evento global para evitar import circular
      // (store -> services/auth -> http). Quem escuta decide o que fazer.
      window.dispatchEvent(new CustomEvent(AUTH_REQUIRED_EVENT))
    }
    return Promise.reject(error)
  }
)

export default http
