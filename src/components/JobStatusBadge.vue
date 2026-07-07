<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status: string
  label?: string
}>()

const CONFIG: Record<string, { color: string; icon: string; text: string }> = {
  pending:    { color: 'default', icon: 'mdi-clock-outline',    text: 'Aguardando'  },
  running:    { color: 'info',    icon: 'mdi-loading',           text: 'Gerando…'    },
  cancelling: { color: 'warning', icon: 'mdi-loading',           text: 'Parando…'    },
  cancelled:  { color: 'default', icon: 'mdi-cancel',            text: 'Cancelado'   },
  done:       { color: 'success', icon: 'mdi-check-circle',      text: 'Concluído'   },
  error:      { color: 'error',   icon: 'mdi-alert-circle',      text: 'Erro'        },
}

const cfg = computed(() => CONFIG[props.status] ?? { color: 'default', icon: 'mdi-help', text: props.status })
</script>

<template>
  <v-chip :color="cfg.color" variant="tonal" size="small">
    <v-icon
      start
      :icon="cfg.icon"
      :class="{ 'spin': status === 'running' || status === 'cancelling' }"
      size="14"
    />
    {{ label ?? cfg.text }}
  </v-chip>
</template>

<style scoped>
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
