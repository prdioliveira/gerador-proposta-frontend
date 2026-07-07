<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import * as api from '../services/api'
import type { PromptCatalogResponse, PromptDefinitionResponse, PromptTemplateResponse } from '../types'

type ModeCode = 'direct' | 'complete'

// Edição de prompts desabilitada por enquanto — a tela funciona somente leitura.
// Para reabilitar, basta trocar para false.
const READ_ONLY = true

// ── State ──────────────────────────────────────────────
const catalog    = ref<PromptCatalogResponse>({ modes: [], definitions: [] })
const templates  = ref<PromptTemplateResponse[]>([])
const activeMode = ref<ModeCode>('direct')
const selectedDefinitionId = ref<number | null>(null)

const loadingCatalog   = ref(true)
const loadingTemplates = ref(true)
const loadError        = ref('')

// ── Editor do template ativo ─────────────────────────────
const draftContent = ref('')
const saving       = ref(false)
const saveError    = ref('')
const saveSuccess  = ref(false)

// ── Dialog: nova versão ──────────────────────────────────
const versionDialog = reactive({
  show:     false,
  name:     '',
  content:  '',
  activate: false,
  saving:   false,
  error:    '',
})

// ── Dialog: excluir versão ───────────────────────────────
const deleteDialog = reactive({
  show:   false,
  target: null as PromptTemplateResponse | null,
  saving: false,
  error:  '',
})

const activatingId  = ref<number | null>(null)
const activateError = ref('')

// ── Helpers ────────────────────────────────────────────
function apiErr(e: unknown): string {
  const r = (e as { response?: { data?: { detail?: string; error?: string } } }).response?.data
  return r?.detail ?? r?.error ?? 'Ocorreu um erro inesperado'
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// ── Definições do modo ativo ─────────────────────────────
const modeDefinitions = computed<PromptDefinitionResponse[]>(() =>
  catalog.value.definitions
    .filter((d) => d.mode_code === activeMode.value)
    .sort((a, b) => a.sort_order - b.sort_order)
)

const extractionDefinitions = computed(() =>
  modeDefinitions.value.filter((d) => d.kind.startsWith('extraction'))
)

const sectionDefinitions = computed(() =>
  modeDefinitions.value.filter((d) => !d.kind.startsWith('extraction'))
)

// Templates legados (sem generation_mode_id/definition_id) nunca aparecem aqui.
const validTemplates = computed(() =>
  templates.value.filter((t) => t.generation_mode_id != null && t.definition_id != null)
)

function templatesFor(definitionId: number): PromptTemplateResponse[] {
  return validTemplates.value
    .filter((t) => t.definition_id === definitionId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
}

const hasActiveMap = computed(() => {
  const map = new Map<number, boolean>()
  for (const d of modeDefinitions.value) {
    map.set(d.id, templatesFor(d.id).some((t) => t.is_active))
  }
  return map
})

const selectedDefinition = computed(() =>
  modeDefinitions.value.find((d) => d.id === selectedDefinitionId.value) ?? null
)

const selectedTemplates = computed(() =>
  selectedDefinitionId.value != null ? templatesFor(selectedDefinitionId.value) : []
)

const activeTemplate = computed(() => selectedTemplates.value.find((t) => t.is_active) ?? null)

const otherVersions = computed(() => selectedTemplates.value.filter((t) => !t.is_active))

const isDirty = computed(() =>
  activeTemplate.value != null && draftContent.value !== activeTemplate.value.content
)

const isIncomplete = computed(() =>
  selectedDefinition.value?.required === true && activeTemplate.value == null
)

// ── Carregamento ──────────────────────────────────────────
async function loadCatalog() {
  loadingCatalog.value = true
  loadError.value = ''
  try {
    catalog.value = await api.getPromptCatalog()
  } catch (e) {
    loadError.value = apiErr(e)
  } finally {
    loadingCatalog.value = false
  }
}

async function loadTemplates() {
  loadingTemplates.value = true
  loadError.value = ''
  try {
    templates.value = await api.listPromptTemplates({ mode_code: activeMode.value })
  } catch (e) {
    loadError.value = apiErr(e)
  } finally {
    loadingTemplates.value = false
  }
}

onMounted(async () => {
  await loadCatalog()
  await loadTemplates()
  if (modeDefinitions.value.length > 0) {
    selectedDefinitionId.value = modeDefinitions.value[0].id
  }
})

watch(activeMode, async () => {
  selectedDefinitionId.value = null
  await loadTemplates()
  if (modeDefinitions.value.length > 0) {
    selectedDefinitionId.value = modeDefinitions.value[0].id
  }
})

watch(activeTemplate, (t) => {
  draftContent.value = t?.content ?? ''
  saveError.value = ''
  saveSuccess.value = false
}, { immediate: true })

// ── Ações ──────────────────────────────────────────────────
function selectDefinition(id: number) {
  selectedDefinitionId.value = id
}

async function saveContent() {
  if (!activeTemplate.value) return
  saving.value = true
  saveError.value = ''
  saveSuccess.value = false
  try {
    const updated = await api.updatePromptTemplate(activeTemplate.value.id, { content: draftContent.value })
    templates.value = templates.value.map((t) => (t.id === updated.id ? updated : t))
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 2500)
  } catch (e) {
    saveError.value = apiErr(e)
  } finally {
    saving.value = false
  }
}

function openVersionDialog() {
  if (!selectedDefinition.value) return
  versionDialog.name     = ''
  versionDialog.content  = draftContent.value
  versionDialog.activate = false
  versionDialog.error    = ''
  versionDialog.show     = true
}

async function createVersion() {
  const def = selectedDefinition.value
  if (!def) return
  versionDialog.saving = true
  versionDialog.error  = ''
  try {
    await api.createPromptTemplate({
      name:               versionDialog.name,
      content:            versionDialog.content,
      kind:               def.kind,
      generation_mode_id: def.generation_mode_id,
      definition_id:      def.id,
      mode_code:          activeMode.value,
      is_active:          versionDialog.activate,
    })
    versionDialog.show = false
    await loadTemplates()
  } catch (e) {
    versionDialog.error = apiErr(e)
  } finally {
    versionDialog.saving = false
  }
}

async function activateVersion(t: PromptTemplateResponse) {
  activatingId.value = t.id
  activateError.value = ''
  try {
    await api.updatePromptTemplate(t.id, { is_active: true })
    await loadTemplates()
  } catch (e) {
    activateError.value = apiErr(e)
  } finally {
    activatingId.value = null
  }
}

function openDeleteDialog(t: PromptTemplateResponse) {
  deleteDialog.target = t
  deleteDialog.error  = ''
  deleteDialog.show   = true
}

async function confirmDelete() {
  if (!deleteDialog.target) return
  deleteDialog.saving = true
  deleteDialog.error  = ''
  try {
    await api.deletePromptTemplate(deleteDialog.target.id)
    deleteDialog.show = false
    await loadTemplates()
  } catch (e) {
    deleteDialog.error = apiErr(e)
  } finally {
    deleteDialog.saving = false
  }
}
</script>

<template>
  <v-container fluid class="pa-6">
    <div style="max-width: 1400px; margin: 0 auto">

      <!-- ── Cabeçalho ──────────────────────────────── -->
      <div class="mb-4">
        <div class="d-flex align-center ga-2 flex-wrap">
          <h1 class="text-h5 font-weight-bold">Templates de Prompt</h1>
          <v-chip v-if="READ_ONLY" size="small" variant="tonal" color="secondary" prepend-icon="mdi-lock-outline">
            Somente leitura
          </v-chip>
        </div>
        <p class="text-body-2 text-medium-emphasis mt-1">
          Prompts organizados pela estratégia de geração do backend: <strong>Direto</strong> (Clip) ou <strong>Completo</strong> (MapReduce).
        </p>
      </div>

      <v-alert
        v-if="loadError"
        type="error" variant="tonal" closable class="mb-4"
        @click:close="loadError = ''"
      >
        {{ loadError }}
      </v-alert>

      <template v-if="loadingCatalog">
        <v-skeleton-loader type="card" class="rounded-lg" />
      </template>

      <template v-else>
        <!-- ── Abas por modo de geração ─────────────── -->
        <v-tabs v-model="activeMode" color="primary" class="mb-4">
          <v-tab value="direct">
            <v-icon start size="small">mdi-flash-outline</v-icon>
            Direto
          </v-tab>
          <v-tab value="complete">
            <v-icon start size="small">mdi-shield-check-outline</v-icon>
            Completo
          </v-tab>
        </v-tabs>

        <v-row>
          <!-- ── Lista de definições ──────────────────── -->
          <v-col cols="12" md="4" lg="3">
            <v-card elevation="3" rounded="lg">
              <div v-if="loadingTemplates" class="pa-6 d-flex justify-center">
                <v-progress-circular indeterminate color="primary" size="28" />
              </div>

              <v-list v-else density="compact" nav class="py-2">
                <template v-if="activeMode === 'direct'">
                  <v-list-item
                    v-for="d in modeDefinitions"
                    :key="d.id"
                    :active="d.id === selectedDefinitionId"
                    color="primary"
                    rounded="lg"
                    @click="selectDefinition(d.id)"
                  >
                    <template #prepend>
                      <v-icon v-if="d.required && !hasActiveMap.get(d.id)" color="error" size="16">mdi-alert-circle</v-icon>
                      <v-icon v-else color="success" size="16">mdi-check-circle-outline</v-icon>
                    </template>
                    <v-list-item-title class="text-body-2">{{ d.label }}</v-list-item-title>
                  </v-list-item>
                </template>

                <template v-else>
                  <v-list-subheader>Extração</v-list-subheader>
                  <v-list-item
                    v-for="d in extractionDefinitions"
                    :key="d.id"
                    :active="d.id === selectedDefinitionId"
                    color="primary"
                    rounded="lg"
                    @click="selectDefinition(d.id)"
                  >
                    <template #prepend>
                      <v-icon v-if="d.required && !hasActiveMap.get(d.id)" color="error" size="16">mdi-alert-circle</v-icon>
                      <v-icon v-else color="success" size="16">mdi-check-circle-outline</v-icon>
                    </template>
                    <v-list-item-title class="text-body-2">{{ d.label }}</v-list-item-title>
                  </v-list-item>

                  <v-divider class="my-2" />
                  <v-list-subheader>Seções do Documento</v-list-subheader>
                  <v-list-item
                    v-for="d in sectionDefinitions"
                    :key="d.id"
                    :active="d.id === selectedDefinitionId"
                    color="primary"
                    rounded="lg"
                    @click="selectDefinition(d.id)"
                  >
                    <template #prepend>
                      <v-icon v-if="d.required && !hasActiveMap.get(d.id)" color="error" size="16">mdi-alert-circle</v-icon>
                      <v-icon v-else color="success" size="16">mdi-check-circle-outline</v-icon>
                    </template>
                    <v-list-item-title class="text-body-2">{{ d.label }}</v-list-item-title>
                  </v-list-item>
                </template>
              </v-list>
            </v-card>
          </v-col>

          <!-- ── Painel principal ─────────────────────── -->
          <v-col cols="12" md="8" lg="9">
            <template v-if="loadingTemplates">
              <v-skeleton-loader type="card" class="rounded-lg" />
            </template>

            <template v-else-if="!selectedDefinition">
              <v-card
                elevation="3" rounded="lg"
                class="pa-8 d-flex flex-column align-center justify-center"
                style="min-height: 300px"
              >
                <v-icon size="48" color="medium-emphasis" class="mb-3">mdi-cursor-default-click-outline</v-icon>
                <p class="text-body-2 text-medium-emphasis">Selecione uma definição na lista ao lado</p>
              </v-card>
            </template>

            <template v-else>
              <v-card elevation="3" rounded="lg">
                <v-card-text class="pb-2">
                  <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-1">
                    <span class="text-subtitle-1 font-weight-medium">{{ selectedDefinition.label }}</span>
                    <v-chip v-if="selectedDefinition.required" size="x-small" variant="outlined" color="secondary">
                      Obrigatório
                    </v-chip>
                  </div>
                  <p class="text-body-2 text-medium-emphasis mb-0">{{ selectedDefinition.description }}</p>
                </v-card-text>

                <v-card-text class="pt-2">
                  <v-alert
                    v-if="isIncomplete"
                    type="error" variant="tonal" density="compact" class="mb-4"
                    icon="mdi-alert-circle-outline"
                  >
                    Configuração incompleta: nenhum template ativo para esta definição obrigatória.
                  </v-alert>

                  <template v-if="activeTemplate">
                    <div class="d-flex align-center ga-2 mb-3 flex-wrap">
                      <v-chip color="success" variant="flat" size="small" prepend-icon="mdi-check-circle">
                        Ativo
                      </v-chip>
                      <span class="text-body-2 font-weight-medium">{{ activeTemplate.name }}</span>
                      <span class="text-caption text-medium-emphasis">
                        Atualizado em {{ formatDate(activeTemplate.updated_at ?? activeTemplate.created_at) }}
                      </span>
                    </div>

                    <v-alert v-if="saveError" type="error" variant="tonal" density="compact" class="mb-3">
                      {{ saveError }}
                    </v-alert>
                    <v-slide-x-transition>
                      <v-chip v-if="saveSuccess" color="success" variant="tonal" size="small" prepend-icon="mdi-check" class="mb-3">
                        Salvo com sucesso
                      </v-chip>
                    </v-slide-x-transition>

                    <v-textarea
                      v-model="draftContent"
                      variant="outlined"
                      rows="18"
                      auto-grow
                      :readonly="READ_ONLY"
                      :disabled="!READ_ONLY && saving"
                      style="font-family: monospace; font-size: 13px"
                    />

                    <div v-if="!READ_ONLY" class="d-flex flex-wrap ga-2 mt-2">
                      <v-btn
                        color="primary" variant="flat"
                        prepend-icon="mdi-content-save-outline"
                        :loading="saving"
                        :disabled="!isDirty"
                        @click="saveContent"
                      >
                        Salvar
                      </v-btn>
                      <v-btn
                        variant="tonal"
                        prepend-icon="mdi-source-branch-plus"
                        @click="openVersionDialog"
                      >
                        Criar nova versão
                      </v-btn>
                    </div>
                  </template>

                  <template v-else>
                    <v-alert type="warning" variant="tonal" density="compact" class="mb-3">
                      Nenhum template ativo para esta definição.
                    </v-alert>
                    <v-btn v-if="!READ_ONLY" variant="tonal" color="primary" prepend-icon="mdi-plus" @click="openVersionDialog">
                      Criar template
                    </v-btn>
                  </template>
                </v-card-text>

                <!-- ── Outras versões ─────────────────── -->
                <template v-if="otherVersions.length > 0">
                  <v-divider />
                  <v-card-text>
                    <p class="text-subtitle-2 font-weight-medium mb-2">Outras versões</p>
                    <v-alert v-if="activateError" type="error" variant="tonal" density="compact" class="mb-3">
                      {{ activateError }}
                    </v-alert>

                    <v-list density="compact">
                      <v-list-item v-for="t in otherVersions" :key="t.id" class="px-0">
                        <template #title>
                          <span class="text-body-2">{{ t.name }}</span>
                        </template>
                        <template #subtitle>
                          {{ formatDate(t.updated_at ?? t.created_at) }}
                        </template>
                        <template v-if="!READ_ONLY" #append>
                          <v-btn
                            size="small" variant="tonal" color="secondary"
                            prepend-icon="mdi-star-outline"
                            class="mr-2"
                            :loading="activatingId === t.id"
                            @click="activateVersion(t)"
                          >
                            Ativar
                          </v-btn>
                          <v-tooltip text="Excluir versão" location="top">
                            <template #activator="{ props }">
                              <v-btn
                                v-bind="props"
                                icon="mdi-trash-can-outline"
                                variant="text" size="small" color="error"
                                @click="openDeleteDialog(t)"
                              />
                            </template>
                          </v-tooltip>
                        </template>
                      </v-list-item>
                    </v-list>
                  </v-card-text>
                </template>
              </v-card>
            </template>
          </v-col>
        </v-row>
      </template>
    </div>
  </v-container>

  <!-- ────────────────────────────────────────────────── -->
  <!-- Dialog: criar nova versão                          -->
  <!-- ────────────────────────────────────────────────── -->
  <v-dialog v-model="versionDialog.show" max-width="900" persistent>
    <v-card rounded="lg">
      <v-card-title class="pt-5 px-6">Criar nova versão</v-card-title>

      <v-card-text class="px-6 pb-2">
        <v-alert v-if="versionDialog.error" type="error" variant="tonal" density="compact" class="mb-4">
          {{ versionDialog.error }}
        </v-alert>

        <v-row dense>
          <v-col cols="12" sm="8">
            <v-text-field
              v-model="versionDialog.name"
              label="Nome da versão *"
              placeholder="Ex: contexto-dores-v2"
              variant="outlined"
              density="comfortable"
              :disabled="versionDialog.saving"
              autofocus
            />
          </v-col>
          <v-col cols="12" sm="4" class="d-flex align-center">
            <v-switch
              v-model="versionDialog.activate"
              label="Ativar imediatamente"
              color="primary"
              inset
              density="comfortable"
              hide-details
              :disabled="versionDialog.saving"
            />
          </v-col>
          <v-col v-if="versionDialog.activate" cols="12">
            <v-alert type="info" variant="tonal" density="compact">
              Ativar esta versão desativará automaticamente a versão atualmente ativa desta definição.
            </v-alert>
          </v-col>
          <v-col cols="12">
            <v-textarea
              v-model="versionDialog.content"
              label="Conteúdo do prompt *"
              variant="outlined"
              rows="16"
              auto-grow
              :disabled="versionDialog.saving"
              style="font-family: monospace; font-size: 13px"
            />
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions class="px-6 pb-5 justify-end ga-2">
        <v-btn variant="text" :disabled="versionDialog.saving" @click="versionDialog.show = false">
          Cancelar
        </v-btn>
        <v-btn
          color="primary" variant="flat"
          :loading="versionDialog.saving"
          :disabled="!versionDialog.name.trim() || !versionDialog.content.trim()"
          @click="createVersion"
        >
          Criar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ────────────────────────────────────────────────── -->
  <!-- Confirm: excluir versão inativa                    -->
  <!-- ────────────────────────────────────────────────── -->
  <v-dialog v-model="deleteDialog.show" max-width="500">
    <v-card rounded="lg">
      <v-card-title class="pt-5 px-6">Excluir versão</v-card-title>
      <v-card-text class="px-6">
        <v-alert v-if="deleteDialog.error" type="error" variant="tonal" density="compact" class="mb-3">
          {{ deleteDialog.error }}
        </v-alert>
        <p v-else>
          Tem certeza que deseja excluir a versão <strong>{{ deleteDialog.target?.name }}</strong>?
        </p>
      </v-card-text>
      <v-card-actions class="px-6 pb-5 justify-end ga-2">
        <v-btn variant="text" :disabled="deleteDialog.saving" @click="deleteDialog.show = false">
          Cancelar
        </v-btn>
        <v-btn color="error" variant="tonal" :loading="deleteDialog.saving" @click="confirmDelete">
          Excluir
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
