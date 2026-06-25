<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { getScript, updateScript } from '../services/meetingScripts'
import type { MeetingScript } from '../services/meetingScripts'

const TYPES = [
  { key: 'alocacao',      label: 'Alocação',       icon: 'mdi-account-tie',             color: 'indigo'      },
  { key: 'desenvolvimento', label: 'Desenvolvimento', icon: 'mdi-code-braces',           color: 'primary'     },
  { key: 'assessment',   label: 'Assessment',      icon: 'mdi-clipboard-search-outline', color: 'deep-orange' },
]

const activeType  = ref('alocacao')
const mode        = ref<'view' | 'edit'>('view')
const scripts     = ref<Record<string, MeetingScript>>({})
const editContent = ref('')
const loading     = ref(true)
const saving      = ref(false)
const error       = ref<string | null>(null)

const current     = computed(() => scripts.value[activeType.value])
const currentMeta = computed(() => TYPES.find((t) => t.key === activeType.value)!)

const renderedMd = computed(() => {
  if (!current.value?.content) return ''
  return DOMPurify.sanitize(marked.parse(current.value.content) as string)
})

watch(activeType, () => {
  mode.value = 'view'
})

function startEdit() {
  editContent.value = current.value?.content ?? ''
  mode.value = 'edit'
}

async function save() {
  saving.value = true
  error.value = null
  try {
    const updated = await updateScript(activeType.value, editContent.value.trim())
    scripts.value[activeType.value] = updated
    mode.value = 'view'
  } catch {
    error.value = 'Erro ao salvar o roteiro.'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all(
      TYPES.map(async ({ key }) => {
        scripts.value[key] = await getScript(key)
      }),
    )
  } catch {
    error.value = 'Erro ao carregar os roteiros.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <v-container max-width="1000" class="py-6">
    <!-- Cabeçalho -->
    <div class="mb-5">
      <h1 class="text-h5 font-weight-bold mb-1">Roteiros de Reunião</h1>
      <p class="text-body-2 text-medium-emphasis">
        Guias com perguntas e exemplos de respostas para conduzir reuniões de levantamento por tipo de proposta.
        Use esses roteiros para garantir que a IA receba insumos completos e precisos.
      </p>
    </div>

    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      density="compact"
      class="mb-4"
      closable
      @click:close="error = null"
    >
      {{ error }}
    </v-alert>

    <!-- Barra de abas + botões -->
    <div class="d-flex align-end">
      <v-tabs v-model="activeType" density="comfortable" :color="currentMeta.color">
        <v-tab v-for="t in TYPES" :key="t.key" :value="t.key">
          <v-icon start size="16">{{ t.icon }}</v-icon>
          {{ t.label }}
        </v-tab>
      </v-tabs>

      <v-spacer />

      <div v-if="!loading" class="d-flex ga-2 mb-1">
        <v-btn
          size="small"
          :variant="mode === 'view' ? 'flat' : 'text'"
          :color="mode === 'view' ? currentMeta.color : undefined"
          prepend-icon="mdi-eye-outline"
          @click="mode = 'view'"
        >
          Visualizar
        </v-btn>
        <v-btn
          size="small"
          :variant="mode === 'edit' ? 'flat' : 'tonal'"
          :color="currentMeta.color"
          prepend-icon="mdi-pencil-outline"
          @click="startEdit"
        >
          Editar
        </v-btn>
      </div>
    </div>

    <v-divider />

    <!-- Loading -->
    <div v-if="loading" class="d-flex justify-center py-16">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <template v-if="!loading">
      <!-- Modo Visualizar: markdown renderizado -->
      <div v-if="mode === 'view'" class="roteiro-panel">
        <div class="roteiro-md" v-html="renderedMd" />
      </div>

      <!-- Modo Editar -->
      <div v-else class="roteiro-panel edit-panel">
        <p class="text-caption text-medium-emphasis mb-3">
          Edite o roteiro em Markdown. Use <code>##</code> para seções, <code>**pergunta**</code> em negrito e
          <code>&gt; *Exemplo:*</code> para blocos de exemplo.
        </p>
        <v-textarea
          v-model="editContent"
          variant="outlined"
          auto-grow
          rows="28"
          hide-details
          class="editor-textarea"
        />
        <div class="d-flex justify-end ga-2 mt-3">
          <v-btn variant="text" @click="mode = 'view'">Cancelar</v-btn>
          <v-btn
            variant="flat"
            :color="currentMeta.color"
            :loading="saving"
            prepend-icon="mdi-content-save-outline"
            @click="save"
          >
            Salvar Roteiro
          </v-btn>
        </div>
      </div>
    </template>
  </v-container>
</template>

<style scoped>
.roteiro-panel {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-top: none;
  border-radius: 0 0 8px 8px;
  padding: 2rem 2.5rem;
  min-height: 400px;
  background: rgb(var(--v-theme-surface));
}

.edit-panel {
  padding: 1.5rem 2rem;
}

/* ── Markdown styles ── */
.roteiro-md :deep(h1) {
  font-size: 1.35rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.roteiro-md :deep(h2) {
  font-size: 1rem;
  font-weight: 600;
  margin: 2rem 0 0.75rem;
  padding: 0.4rem 0.75rem;
  border-left: 3px solid rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.05);
  border-radius: 0 4px 4px 0;
}

.roteiro-md :deep(p) {
  font-size: 0.9rem;
  line-height: 1.7;
  margin: 0 0 0.5rem;
  color: rgba(var(--v-theme-on-surface), 0.85);
}

.roteiro-md :deep(strong) {
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.95);
}

.roteiro-md :deep(ul),
.roteiro-md :deep(ol) {
  padding-left: 1.4rem;
  margin: 0.25rem 0 0.75rem;
}

.roteiro-md :deep(li) {
  font-size: 0.875rem;
  line-height: 1.65;
  margin-bottom: 0.2rem;
}

.roteiro-md :deep(blockquote) {
  margin: 0.6rem 0 1rem;
  padding: 0.75rem 1.1rem;
  border-left: 4px solid rgba(var(--v-theme-secondary), 0.7);
  background: rgba(var(--v-theme-secondary), 0.06);
  border-radius: 0 6px 6px 0;
  color: rgba(var(--v-theme-on-surface), 0.72);
}

.roteiro-md :deep(blockquote p) {
  margin: 0;
  font-size: 0.875rem;
  font-style: italic;
  line-height: 1.6;
}

.roteiro-md :deep(em) {
  color: rgba(var(--v-theme-on-surface), 0.65);
  font-style: italic;
}

.roteiro-md :deep(hr) {
  border: none;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  margin: 1.75rem 0;
}

.roteiro-md :deep(code) {
  font-family: 'Courier New', monospace;
  font-size: 0.82rem;
  background: rgba(var(--v-theme-on-surface), 0.07);
  padding: 0.1rem 0.35rem;
  border-radius: 3px;
}

.editor-textarea :deep(textarea) {
  font-family: 'Courier New', Courier, monospace !important;
  font-size: 0.84rem !important;
  line-height: 1.55 !important;
}
</style>
