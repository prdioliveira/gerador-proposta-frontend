import { ref } from 'vue'

interface ConfirmState {
  show: boolean
  title: string
  message: string
  loading: boolean
  error: string
  resolve: ((confirmed: boolean) => void) | null
}

export function useConfirm() {
  const state = ref<ConfirmState>({
    show:    false,
    title:   '',
    message: '',
    loading: false,
    error:   '',
    resolve: null,
  })

  function confirm(title: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
      state.value = { show: true, title, message, loading: false, error: '', resolve }
    })
  }

  function accept() {
    state.value.resolve?.(true)
    state.value.show = false
  }

  function cancel() {
    state.value.resolve?.(false)
    state.value.show = false
  }

  return { state, confirm, accept, cancel }
}
