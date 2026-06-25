import { ref, onUnmounted } from 'vue'
import { getJobStatus } from '../services/generation'
import type { GenerationJob } from '../types'

// 200 attempts × 3s = 10 minutes (covers the 300s LLM timeout + retries)
const MAX_ATTEMPTS = 200
const POLL_INTERVAL_MS = 3000

export function useJobPoller() {
  const job      = ref<GenerationJob | null>(null)
  const running  = ref(false)
  const error    = ref('')
  const timedOut = ref(false)

  let stopPoll:  (() => void) | null = null
  let lastJobId: string | null       = null

  function stop() {
    stopPoll?.()
    stopPoll      = null
    running.value = false
  }

  async function _poll(jobId: string, attempts: number, onDone?: (j: GenerationJob) => void) {
    if (!running.value) return
    try {
      const j = await getJobStatus(jobId)
      job.value = j
      if (j.status === 'done') {
        running.value  = false
        timedOut.value = false
        onDone?.(j)
        return
      }
      if (j.status === 'error') {
        running.value = false
        error.value   = j.error_message ?? 'Erro na geração'
        return
      }
      if (attempts >= MAX_ATTEMPTS) {
        running.value  = false
        timedOut.value = true
        return
      }
      const t = setTimeout(() => _poll(jobId, attempts + 1, onDone), POLL_INTERVAL_MS)
      stopPoll = () => clearTimeout(t)
    } catch {
      if (running.value) {
        const t = setTimeout(() => _poll(jobId, attempts + 1, onDone), POLL_INTERVAL_MS)
        stopPoll = () => clearTimeout(t)
      }
    }
  }

  async function start(
    startFn: () => Promise<{ job_id: string; status: string }>,
    onDone?: (j: GenerationJob) => void,
  ) {
    stop()
    running.value  = true
    timedOut.value = false
    job.value      = null
    error.value    = ''

    try {
      const result = await startFn()
      lastJobId     = result.job_id
      job.value     = { id: result.job_id, status: result.status } as GenerationJob
    } catch (e) {
      const r = (e as { response?: { data?: { error?: string } } }).response?.data
      error.value   = r?.error ?? 'Erro ao iniciar geração'
      running.value = false
      return
    }

    const t = setTimeout(() => _poll(lastJobId!, 0, onDone), POLL_INTERVAL_MS)
    stopPoll = () => clearTimeout(t)
  }

  // Reconnects to the last known job — called after a polling timeout
  function resume(onDone?: (j: GenerationJob) => void) {
    if (!lastJobId) return
    stop()
    running.value  = true
    timedOut.value = false
    error.value    = ''
    const t = setTimeout(() => _poll(lastJobId!, 0, onDone), POLL_INTERVAL_MS)
    stopPoll = () => clearTimeout(t)
  }

  onUnmounted(stop)

  return { job, running, error, timedOut, start, stop, resume }
}
