<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { ProjectSummary } from '../types'
import ConfirmDialog from './ConfirmDialog.vue'

const props = defineProps<{ project: ProjectSummary }>()
const emit = defineEmits<{ delete: [] }>()

const router = useRouter()
const showConfirm = ref(false)

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  sem_arquivos: { color: 'default',  label: 'Sem arquivos'  },
  em_andamento: { color: 'warning',  label: 'Em andamento'  },
  concluido:    { color: 'success',  label: 'Concluído'     },
  erro:         { color: 'error',    label: 'Erro'          },
}

const status = computed(() => STATUS_CONFIG[props.project.status] ?? { color: 'default', label: props.project.status })

const totalFiles = computed(() =>
  Object.values(props.project.folders ?? {}).reduce(
    (sum, f) => sum + (f.files?.length ?? 0),
    0
  )
)

function navigate() {
  router.push(
    `/project/${encodeURIComponent(props.project.client)}/${encodeURIComponent(props.project.project)}`
  )
}

function confirmDelete(e: Event) {
  e.stopPropagation()
  showConfirm.value = true
}
</script>

<template>
  <v-card
    class="project-card"
    hover
    rounded="lg"
    @click="navigate"
  >
    <v-card-title class="d-flex align-center justify-space-between pt-4 px-4">
      <span class="text-truncate" style="max-width: 80%">{{ project.project }}</span>
      <v-chip :color="status.color" size="small" variant="tonal" class="ml-2 flex-shrink-0">
        {{ status.label }}
      </v-chip>
    </v-card-title>

    <v-card-subtitle class="px-4 pb-2 text-medium-emphasis">
      {{ project.client }}
    </v-card-subtitle>

    <v-card-text class="px-4 pb-2">
      <div class="d-flex align-center ga-4 text-body-2 text-medium-emphasis">
        <span v-if="project.proposalType">
          <v-icon size="14" class="mr-1">mdi-file-document-outline</v-icon>
          {{ project.proposalTypeLabel ?? (project.proposalType === 'alocacao' ? 'Alocação' : project.proposalType === 'assessment' ? 'Assessment' : 'Desenvolvimento') }}
        </span>
        <span>
          <v-icon size="14" class="mr-1">mdi-paperclip</v-icon>
          {{ totalFiles }} {{ totalFiles === 1 ? 'arquivo' : 'arquivos' }}
        </span>
      </div>
    </v-card-text>

    <v-card-actions class="px-4 pb-3 justify-end">
      <v-btn
        icon="mdi-delete-outline"
        variant="text"
        color="error"
        size="small"
        density="comfortable"
        @click="confirmDelete"
      />
    </v-card-actions>

    <ConfirmDialog
      v-model="showConfirm"
      title="Excluir projeto"
      :message="`Tem certeza que deseja excluir o projeto &quot;${project.project}&quot;? Esta ação não pode ser desfeita.`"
      confirm-label="Excluir"
      confirm-color="error"
      @confirm="() => { showConfirm = false; emit('delete') }"
    />
  </v-card>
</template>

<style scoped>
.project-card {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  cursor: pointer;
}
.project-card:hover {
  transform: translateY(-2px);
}
</style>
