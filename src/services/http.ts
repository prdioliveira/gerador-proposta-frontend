import axios from 'axios'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[API Error]', error.response?.status, error.response?.data)
    return Promise.reject(error)
  }
)

export default http
