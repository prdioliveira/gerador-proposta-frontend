<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { TemplateResponse } from '../types'
import * as api from '../services/api'

// ── State ────────────────────────────────────────────────────────────────────

const templates = ref<TemplateResponse[]>([])
const loading = ref(false)
const globalError = ref('')

// IDs configurados como ativos (lidos do AppConfig)
const activeAllocId = ref<number | null>(null)
const activeDevId = ref<number | null>(null)
const activeAssessmentId = ref<number | null>(null)

// Separated by type
const allocTemplates = computed(() =>
  templates.value.filter((t) => t.proposal_type === 'alocacao')
)
const devTemplates = computed(() =>
  templates.value.filter((t) => t.proposal_type === 'desenvolvimento')
)
const assessmentTemplates = computed(() =>
  templates.value.filter((t) => t.proposal_type === 'assessment')
)

// ── Create dialog ─────────────────────────────────────────────────────────────

const showCreate = ref(false)
const createForm = ref({ name: '', proposal_type: 'alocacao' as 'alocacao' | 'desenvolvimento' | 'assessment' })
const createError = ref('')
const createLoading = ref(false)

function openCreate(type: 'alocacao' | 'desenvolvimento' | 'assessment') {
  createForm.value = { name: '', proposal_type: type }
  createError.value = ''
  showCreate.value = true
}

async function submitCreate() {
  if (!createForm.value.name.trim()) return
  createLoading.value = true
  createError.value = ''
  try {
    const created = await api.createTemplate({
      name: createForm.value.name.trim(),
      proposal_type: createForm.value.proposal_type,
    })
    templates.value.push(created)
    showCreate.value = false
  } catch (e: unknown) {
    createError.value = apiErr(e)
  } finally {
    createLoading.value = false
  }
}

// ── Rename dialog ─────────────────────────────────────────────────────────────

const showRename = ref(false)
const renameTarget = ref<TemplateResponse | null>(null)
const renameName = ref('')
const renameError = ref('')
const renameLoading = ref(false)

function openRename(t: TemplateResponse) {
  renameTarget.value = t
  renameName.value = t.name
  renameError.value = ''
  showRename.value = true
}

async function submitRename() {
  if (!renameTarget.value || !renameName.value.trim()) return
  renameLoading.value = true
  renameError.value = ''
  try {
    const updated = await api.updateTemplate(renameTarget.value.id, {
      name: renameName.value.trim(),
    })
    replaceInList(updated)
    showRename.value = false
  } catch (e: unknown) {
    renameError.value = apiErr(e)
  } finally {
    renameLoading.value = false
  }
}

// ── Delete dialog ─────────────────────────────────────────────────────────────

const showDelete = ref(false)
const deleteTarget = ref<TemplateResponse | null>(null)
const deleteError = ref('')
const deleteLoading = ref(false)

function openDelete(t: TemplateResponse) {
  deleteTarget.value = t
  deleteError.value = ''
  showDelete.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  deleteError.value = ''
  try {
    await api.deleteTemplate(deleteTarget.value.id)
    templates.value = templates.value.filter((t) => t.id !== deleteTarget.value!.id)
    showDelete.value = false
  } catch (e: unknown) {
    deleteError.value = apiErr(e)
  } finally {
    deleteLoading.value = false
  }
}

// ── Upload ────────────────────────────────────────────────────────────────────

const uploadProgress = ref<Record<number, number>>({})
const uploadError = ref<Record<number, string>>({})
const fileInputRefs = ref<Record<number, HTMLInputElement>>({})

async function handleFileChange(t: TemplateResponse, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!file.name.toLowerCase().endsWith('.pptx')) {
    uploadError.value = { ...uploadError.value, [t.id]: 'Apenas arquivos .pptx são aceitos' }
    input.value = ''
    return
  }
  uploadError.value = { ...uploadError.value, [t.id]: '' }
  uploadProgress.value = { ...uploadProgress.value, [t.id]: 0 }
  try {
    const result = await api.uploadTemplateFile(t.id, file, (pct) => {
      uploadProgress.value = { ...uploadProgress.value, [t.id]: pct }
    })
    replaceInList(result.data as TemplateResponse)
  } catch (e: unknown) {
    uploadError.value = { ...uploadError.value, [t.id]: apiErr(e) }
  } finally {
    uploadProgress.value = { ...uploadProgress.value, [t.id]: -1 }
    input.value = ''
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function replaceInList(updated: TemplateResponse) {
  const idx = templates.value.findIndex((t) => t.id === updated.id)
  if (idx !== -1) templates.value[idx] = updated
}

function apiErr(e: unknown): string {
  const err = e as { response?: { data?: { detail?: string; error?: string } } }
  return err.response?.data?.detail ?? err.response?.data?.error ?? 'Erro desconhecido'
}

function formatDate(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function basename(path?: string): string {
  if (!path) return ''
  return path.split(/[\\/]/).pop() ?? path
}

function downloadTemplate(t: TemplateResponse) {
  const url = api.downloadTemplateUrl(t.id)
  const a = document.createElement('a')
  a.href = url
  a.download = `${t.name}.pptx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

function isActiveInConfig(t: TemplateResponse): boolean {
  if (t.proposal_type === 'alocacao') return activeAllocId.value === t.id
  if (t.proposal_type === 'assessment') return activeAssessmentId.value === t.id
  return activeDevId.value === t.id
}

function typeLabel(type: string): string {
  if (type === 'alocacao') return 'Alocação'
  if (type === 'assessment') return 'Assessment'
  return 'Desenvolvimento'
}

// ── Load ──────────────────────────────────────────────────────────────────────

onMounted(async () => {
  loading.value = true
  globalError.value = ''
  try {
    const [tpls, cfg] = await Promise.all([api.listTemplates(), api.getAppConfig()])
    templates.value = tpls
    activeAllocId.value = cfg.active_alloc_template_id ?? null
    activeDevId.value = cfg.active_dev_template_id ?? null
    activeAssessmentId.value = cfg.active_assessment_template_id ?? null
  } catch (e: unknown) {
    globalError.value = apiErr(e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <v-container fluid class="pa-6">

    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h5 font-weight-bold">Templates PPT</h1>
        <p class="text-body-2 text-medium-emphasis mt-1">
          Gerencie os arquivos .pptx usados na geração de propostas
        </p>
      </div>
    </div>

    <!-- Error banner -->
    <v-alert v-if="globalError" type="error" variant="tonal" closable class="mb-5">
      {{ globalError }}
    </v-alert>

    <!-- Skeleton -->
    <v-row v-if="loading" dense>
      <v-col v-for="n in 3" :key="n" cols="12" md="4">
        <v-skeleton-loader type="card" rounded="lg" />
      </v-col>
    </v-row>

    <!-- Content -->
    <v-row v-else dense class="align-start">

      <!-- ── Alocação ──────────────────────────────────────────────────────── -->
      <v-col cols="12" md="4">
        <div class="d-flex align-center justify-space-between mb-3">
          <div class="d-flex align-center ga-2">
            <v-icon color="primary">mdi-account-group-outline</v-icon>
            <span class="text-subtitle-1 font-weight-semibold">Alocação</span>
            <v-chip size="x-small" variant="tonal" color="primary">
              {{ allocTemplates.length }}
            </v-chip>
          </div>
          <v-btn
            size="small"
            variant="tonal"
            color="primary"
            prepend-icon="mdi-plus"
            @click="openCreate('alocacao')"
          >
            Novo
          </v-btn>
        </div>

        <!-- Empty -->
        <v-card
          v-if="allocTemplates.length === 0"
          elevation="3"
          rounded="lg"
          class="pa-6 text-center"
        >
          <v-icon size="40" color="medium-emphasis" class="mb-2">mdi-file-powerpoint-outline</v-icon>
          <p class="text-body-2 text-medium-emphasis">Nenhum template de Alocação</p>
          <v-btn
            size="small"
            variant="text"
            color="primary"
            class="mt-2"
            prepend-icon="mdi-plus"
            @click="openCreate('alocacao')"
          >
            Adicionar
          </v-btn>
        </v-card>

        <!-- Cards -->
        <v-card
          v-for="t in allocTemplates"
          :key="t.id"
          elevation="3"
          rounded="lg"
          class="mb-3"
        >
          <v-card-text class="pa-4">
            <div class="d-flex align-center justify-space-between ga-2 mb-1">
              <span class="text-body-1 font-weight-medium text-truncate">{{ t.name }}</span>
              <v-chip
                v-if="isActiveInConfig(t)"
                size="x-small"
                color="success"
                variant="tonal"
                prepend-icon="mdi-check-circle-outline"
              >
                Ativo
              </v-chip>
            </div>

            <div class="d-flex align-center ga-3 text-body-2 text-medium-emphasis mb-3">
              <span v-if="t.file_path" class="d-flex align-center ga-1">
                <v-icon size="14">mdi-file-powerpoint</v-icon>
                <code style="font-size:11px">{{ basename(t.file_path) }}</code>
              </span>
              <span v-else class="text-error d-flex align-center ga-1">
                <v-icon size="14">mdi-alert-outline</v-icon>
                Sem arquivo
              </span>
              <v-divider vertical class="mx-1" style="height:14px;align-self:center" />
              <span>{{ formatDate(t.uploaded_at) }}</span>
            </div>

            <v-progress-linear
              v-if="(uploadProgress[t.id] ?? -1) >= 0"
              :model-value="uploadProgress[t.id]"
              color="primary"
              rounded
              class="mb-2"
            />
            <v-alert
              v-if="uploadError[t.id]"
              type="error"
              variant="tonal"
              density="compact"
              class="mb-2 text-body-2"
            >
              {{ uploadError[t.id] }}
            </v-alert>

            <div class="d-flex align-center ga-2 flex-wrap">
              <v-btn
                size="small"
                variant="tonal"
                color="primary"
                prepend-icon="mdi-upload"
                :disabled="(uploadProgress[t.id] ?? -1) >= 0"
                @click="fileInputRefs[t.id]?.click()"
              >
                {{ t.file_path ? 'Substituir' : 'Upload' }} .pptx
              </v-btn>
              <input
                :ref="(el) => { if (el) fileInputRefs[t.id] = el as HTMLInputElement }"
                type="file"
                accept=".pptx"
                class="d-none"
                @change="handleFileChange(t, $event)"
              />
              <v-tooltip v-if="t.file_path" text="Baixar template" location="top">
                <template #activator="{ props }">
                  <v-btn v-bind="props" size="small" variant="text" color="primary" icon="mdi-download-outline" @click="downloadTemplate(t)" />
                </template>
              </v-tooltip>
              <v-tooltip text="Renomear" location="top">
                <template #activator="{ props }">
                  <v-btn v-bind="props" size="small" variant="text" icon="mdi-pencil-outline" @click="openRename(t)" />
                </template>
              </v-tooltip>
              <v-tooltip text="Excluir" location="top">
                <template #activator="{ props }">
                  <v-btn v-bind="props" size="small" variant="text" color="error" icon="mdi-trash-can-outline" @click="openDelete(t)" />
                </template>
              </v-tooltip>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- ── Desenvolvimento ────────────────────────────────────────────────── -->
      <v-col cols="12" md="4">
        <div class="d-flex align-center justify-space-between mb-3">
          <div class="d-flex align-center ga-2">
            <v-icon color="secondary">mdi-code-braces</v-icon>
            <span class="text-subtitle-1 font-weight-semibold">Desenvolvimento</span>
            <v-chip size="x-small" variant="tonal" color="secondary">
              {{ devTemplates.length }}
            </v-chip>
          </div>
          <v-btn
            size="small"
            variant="tonal"
            color="secondary"
            prepend-icon="mdi-plus"
            @click="openCreate('desenvolvimento')"
          >
            Novo
          </v-btn>
        </div>

        <!-- Empty -->
        <v-card
          v-if="devTemplates.length === 0"
          elevation="3"
          rounded="lg"
          class="pa-6 text-center"
        >
          <v-icon size="40" color="medium-emphasis" class="mb-2">mdi-file-powerpoint-outline</v-icon>
          <p class="text-body-2 text-medium-emphasis">Nenhum template de Desenvolvimento</p>
          <v-btn
            size="small"
            variant="text"
            color="secondary"
            class="mt-2"
            prepend-icon="mdi-plus"
            @click="openCreate('desenvolvimento')"
          >
            Adicionar
          </v-btn>
        </v-card>

        <!-- Cards -->
        <v-card
          v-for="t in devTemplates"
          :key="t.id"
          elevation="3"
          rounded="lg"
          class="mb-3"
        >
          <v-card-text class="pa-4">
            <div class="d-flex align-center justify-space-between ga-2 mb-1">
              <span class="text-body-1 font-weight-medium text-truncate">{{ t.name }}</span>
              <v-chip
                v-if="isActiveInConfig(t)"
                size="x-small"
                color="success"
                variant="tonal"
                prepend-icon="mdi-check-circle-outline"
              >
                Ativo
              </v-chip>
            </div>

            <div class="d-flex align-center ga-3 text-body-2 text-medium-emphasis mb-3">
              <span v-if="t.file_path" class="d-flex align-center ga-1">
                <v-icon size="14">mdi-file-powerpoint</v-icon>
                <code style="font-size:11px">{{ basename(t.file_path) }}</code>
              </span>
              <span v-else class="text-error d-flex align-center ga-1">
                <v-icon size="14">mdi-alert-outline</v-icon>
                Sem arquivo
              </span>
              <v-divider vertical class="mx-1" style="height:14px;align-self:center" />
              <span>{{ formatDate(t.uploaded_at) }}</span>
            </div>

            <v-progress-linear
              v-if="(uploadProgress[t.id] ?? -1) >= 0"
              :model-value="uploadProgress[t.id]"
              color="secondary"
              rounded
              class="mb-2"
            />
            <v-alert
              v-if="uploadError[t.id]"
              type="error"
              variant="tonal"
              density="compact"
              class="mb-2 text-body-2"
            >
              {{ uploadError[t.id] }}
            </v-alert>

            <div class="d-flex align-center ga-2 flex-wrap">
              <v-btn
                size="small"
                variant="tonal"
                color="secondary"
                prepend-icon="mdi-upload"
                :disabled="(uploadProgress[t.id] ?? -1) >= 0"
                @click="fileInputRefs[t.id]?.click()"
              >
                {{ t.file_path ? 'Substituir' : 'Upload' }} .pptx
              </v-btn>
              <input
                :ref="(el) => { if (el) fileInputRefs[t.id] = el as HTMLInputElement }"
                type="file"
                accept=".pptx"
                class="d-none"
                @change="handleFileChange(t, $event)"
              />
              <v-tooltip v-if="t.file_path" text="Baixar template" location="top">
                <template #activator="{ props }">
                  <v-btn v-bind="props" size="small" variant="text" color="secondary" icon="mdi-download-outline" @click="downloadTemplate(t)" />
                </template>
              </v-tooltip>
              <v-tooltip text="Renomear" location="top">
                <template #activator="{ props }">
                  <v-btn v-bind="props" size="small" variant="text" icon="mdi-pencil-outline" @click="openRename(t)" />
                </template>
              </v-tooltip>
              <v-tooltip text="Excluir" location="top">
                <template #activator="{ props }">
                  <v-btn v-bind="props" size="small" variant="text" color="error" icon="mdi-trash-can-outline" @click="openDelete(t)" />
                </template>
              </v-tooltip>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- ── Assessment ─────────────────────────────────────────────────────── -->
      <v-col cols="12" md="4">
        <div class="d-flex align-center justify-space-between mb-3">
          <div class="d-flex align-center ga-2">
            <v-icon color="warning">mdi-clipboard-search-outline</v-icon>
            <span class="text-subtitle-1 font-weight-semibold">Assessment</span>
            <v-chip size="x-small" variant="tonal" color="warning">
              {{ assessmentTemplates.length }}
            </v-chip>
          </div>
          <v-btn
            size="small"
            variant="tonal"
            color="warning"
            prepend-icon="mdi-plus"
            @click="openCreate('assessment')"
          >
            Novo
          </v-btn>
        </div>

        <!-- Empty -->
        <v-card
          v-if="assessmentTemplates.length === 0"
          elevation="3"
          rounded="lg"
          class="pa-6 text-center"
        >
          <v-icon size="40" color="medium-emphasis" class="mb-2">mdi-file-powerpoint-outline</v-icon>
          <p class="text-body-2 text-medium-emphasis">Nenhum template de Assessment</p>
          <v-btn
            size="small"
            variant="text"
            color="warning"
            class="mt-2"
            prepend-icon="mdi-plus"
            @click="openCreate('assessment')"
          >
            Adicionar
          </v-btn>
        </v-card>

        <!-- Cards -->
        <v-card
          v-for="t in assessmentTemplates"
          :key="t.id"
          elevation="3"
          rounded="lg"
          class="mb-3"
        >
          <v-card-text class="pa-4">
            <div class="d-flex align-center justify-space-between ga-2 mb-1">
              <span class="text-body-1 font-weight-medium text-truncate">{{ t.name }}</span>
              <v-chip
                v-if="isActiveInConfig(t)"
                size="x-small"
                color="success"
                variant="tonal"
                prepend-icon="mdi-check-circle-outline"
              >
                Ativo
              </v-chip>
            </div>

            <div class="d-flex align-center ga-3 text-body-2 text-medium-emphasis mb-3">
              <span v-if="t.file_path" class="d-flex align-center ga-1">
                <v-icon size="14">mdi-file-powerpoint</v-icon>
                <code style="font-size:11px">{{ basename(t.file_path) }}</code>
              </span>
              <span v-else class="text-error d-flex align-center ga-1">
                <v-icon size="14">mdi-alert-outline</v-icon>
                Sem arquivo
              </span>
              <v-divider vertical class="mx-1" style="height:14px;align-self:center" />
              <span>{{ formatDate(t.uploaded_at) }}</span>
            </div>

            <v-progress-linear
              v-if="(uploadProgress[t.id] ?? -1) >= 0"
              :model-value="uploadProgress[t.id]"
              color="warning"
              rounded
              class="mb-2"
            />
            <v-alert
              v-if="uploadError[t.id]"
              type="error"
              variant="tonal"
              density="compact"
              class="mb-2 text-body-2"
            >
              {{ uploadError[t.id] }}
            </v-alert>

            <div class="d-flex align-center ga-2 flex-wrap">
              <v-btn
                size="small"
                variant="tonal"
                color="warning"
                prepend-icon="mdi-upload"
                :disabled="(uploadProgress[t.id] ?? -1) >= 0"
                @click="fileInputRefs[t.id]?.click()"
              >
                {{ t.file_path ? 'Substituir' : 'Upload' }} .pptx
              </v-btn>
              <input
                :ref="(el) => { if (el) fileInputRefs[t.id] = el as HTMLInputElement }"
                type="file"
                accept=".pptx"
                class="d-none"
                @change="handleFileChange(t, $event)"
              />
              <v-tooltip v-if="t.file_path" text="Baixar template" location="top">
                <template #activator="{ props }">
                  <v-btn v-bind="props" size="small" variant="text" color="warning" icon="mdi-download-outline" @click="downloadTemplate(t)" />
                </template>
              </v-tooltip>
              <v-tooltip text="Renomear" location="top">
                <template #activator="{ props }">
                  <v-btn v-bind="props" size="small" variant="text" icon="mdi-pencil-outline" @click="openRename(t)" />
                </template>
              </v-tooltip>
              <v-tooltip text="Excluir" location="top">
                <template #activator="{ props }">
                  <v-btn v-bind="props" size="small" variant="text" color="error" icon="mdi-trash-can-outline" @click="openDelete(t)" />
                </template>
              </v-tooltip>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

    </v-row>
  </v-container>

  <!-- ── Create dialog ───────────────────────────────────────────────────────── -->
  <v-dialog v-model="showCreate" max-width="560" persistent>
    <v-card rounded="lg">
      <v-card-title class="pt-5 px-6">
        Novo Template — {{ typeLabel(createForm.proposal_type) }}
      </v-card-title>
      <v-card-text class="px-6 pb-2">
        <v-alert v-if="createError" type="error" variant="tonal" density="compact" class="mb-4">
          {{ createError }}
        </v-alert>
        <v-text-field
          v-model="createForm.name"
          label="Nome do template *"
          placeholder="Ex: Template Padrão 2025"
          variant="outlined"
          density="comfortable"
          autofocus
          :disabled="createLoading"
        />
        <p class="text-body-2 text-medium-emphasis mt-1">
          Após criar, faça o upload do arquivo .pptx no card.
        </p>
      </v-card-text>
      <v-card-actions class="px-6 pb-5 justify-end ga-2">
        <v-btn variant="text" :disabled="createLoading" @click="showCreate = false">Cancelar</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="createLoading"
          :disabled="!createForm.name.trim()"
          @click="submitCreate"
        >
          Criar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ── Rename dialog ───────────────────────────────────────────────────────── -->
  <v-dialog v-model="showRename" max-width="560" persistent>
    <v-card rounded="lg">
      <v-card-title class="pt-5 px-6">Renomear Template</v-card-title>
      <v-card-text class="px-6 pb-2">
        <v-alert v-if="renameError" type="error" variant="tonal" density="compact" class="mb-4">
          {{ renameError }}
        </v-alert>
        <v-text-field
          v-model="renameName"
          label="Novo nome *"
          variant="outlined"
          density="comfortable"
          autofocus
          :disabled="renameLoading"
        />
      </v-card-text>
      <v-card-actions class="px-6 pb-5 justify-end ga-2">
        <v-btn variant="text" :disabled="renameLoading" @click="showRename = false">Cancelar</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="renameLoading"
          :disabled="!renameName.trim()"
          @click="submitRename"
        >
          Salvar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ── Delete dialog ───────────────────────────────────────────────────────── -->
  <v-dialog v-model="showDelete" max-width="500" persistent>
    <v-card rounded="lg">
      <v-card-title class="pt-5 px-6">Excluir Template</v-card-title>
      <v-card-text class="px-6 pb-2">
        <v-alert v-if="deleteError" type="error" variant="tonal" density="compact" class="mb-4">
          {{ deleteError }}
        </v-alert>
        <p class="text-body-1">
          Tem certeza que deseja excluir
          <strong>{{ deleteTarget?.name }}</strong>?
        </p>
        <p v-if="deleteTarget?.file_path" class="text-body-2 text-medium-emphasis mt-1">
          O arquivo .pptx também será removido do servidor.
        </p>
        <v-alert
          v-if="deleteTarget && isActiveInConfig(deleteTarget)"
          type="warning"
          variant="tonal"
          density="compact"
          class="mt-3"
        >
          Este template está configurado como ativo. Remova-o das Configurações antes de excluir.
        </v-alert>
      </v-card-text>
      <v-card-actions class="px-6 pb-5 justify-end ga-2">
        <v-btn variant="text" :disabled="deleteLoading" @click="showDelete = false">Cancelar</v-btn>
        <v-btn
          color="error"
          variant="flat"
          :loading="deleteLoading"
          @click="confirmDelete"
        >
          Excluir
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
