<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { AppConfigFull, LLMProviderFull, TemplateResponse } from '../types'
import * as api from '../services/api'
import { useTheme } from 'vuetify'

// ── State ─────────────────────────────────────────────────────────────────────

const config = ref<AppConfigFull | null>(null)
const providers = ref<LLMProviderFull[]>([])
const templates = ref<TemplateResponse[]>([])
const oauthAuthorized = ref(false)

const loading = ref(false)
const saving = ref(false)
const reloading = ref(false)
const globalError = ref('')
const saveSuccess = ref(false)

const activeTab = ref('ia')

// ── Form state (mirrors AppConfigFull, edited locally) ────────────────────────

const form = ref({
  active_llm_model_id: null as number | null,
  active_alloc_template_id: null as number | null,
  active_dev_template_id: null as number | null,
  active_assessment_template_id: null as number | null,
  storage_backend: 'local',
  local_drive_root: 'data/drive',
  google_auth_mode: 'service_account',
  google_drive_root_folder_id: '' as string,
  google_shared_drive_id: '' as string,
  use_env_proxy: false,
  transcript_strategy: 'clip' as string,
  transcript_chunk_size: 15000 as number,
})

function populateForm(cfg: AppConfigFull) {
  form.value.active_llm_model_id              = cfg.active_llm_model_id ?? null
  form.value.active_alloc_template_id         = cfg.active_alloc_template_id ?? null
  form.value.active_dev_template_id           = cfg.active_dev_template_id ?? null
  form.value.active_assessment_template_id    = cfg.active_assessment_template_id ?? null
  form.value.storage_backend           = cfg.storage_backend ?? 'local'
  form.value.local_drive_root          = cfg.local_drive_root ?? 'data/drive'
  form.value.google_auth_mode          = cfg.google_auth_mode ?? 'service_account'
  form.value.google_drive_root_folder_id = cfg.google_drive_root_folder_id ?? ''
  form.value.google_shared_drive_id    = cfg.google_shared_drive_id ?? ''
  form.value.use_env_proxy             = cfg.use_env_proxy ?? false
  form.value.transcript_strategy       = cfg.transcript_strategy ?? 'clip'
  form.value.transcript_chunk_size     = cfg.transcript_chunk_size ?? 15000
}

// ── Computed selects ──────────────────────────────────────────────────────────

interface ModelItem {
  value: number
  title: string
  subtitle: string
  group: string
  modelName: string
}

const CHUNK_RECOMMENDATIONS: Record<string, number> = {
  'gemini-2.5-pro':        30_000,
  'gemini-2.5-flash':      25_000,
  'gemini-2.0-flash':      20_000,
  'gemini-2.0-flash-lite': 15_000,
  'gpt-4o':                25_000,
  'gpt-4o-mini':           15_000,
  'gpt-4-turbo':           20_000,
  'claude-opus':           25_000,
  'claude-sonnet':         20_000,
  'claude-haiku':          15_000,
  'local-model':            5_000,
}

function getChunkRecommendation(modelName: string): number | null {
  const name = modelName.toLowerCase()
  if (CHUNK_RECOMMENDATIONS[name]) return CHUNK_RECOMMENDATIONS[name]
  for (const [key, size] of Object.entries(CHUNK_RECOMMENDATIONS)) {
    if (name.includes(key)) return size
  }
  return null
}

const modelItems = computed<ModelItem[]>(() => {
  const items: ModelItem[] = []
  for (const p of providers.value) {
    for (const m of p.models) {
      items.push({
        value: m.id,
        title: m.display_name,
        subtitle: p.name,
        group: p.name,
        modelName: m.name,
      })
    }
  }
  return items
})

const allTemplates = computed(() => templates.value)

const activeModelItem = computed(() =>
  modelItems.value.find(m => m.value === form.value.active_llm_model_id) ?? null
)

const recommendedChunkSize = computed(() => {
  if (!activeModelItem.value) return null
  return getChunkRecommendation(activeModelItem.value.modelName)
})

watch(() => form.value.active_llm_model_id, () => {
  if (form.value.transcript_strategy === 'map_reduce' && recommendedChunkSize.value) {
    form.value.transcript_chunk_size = recommendedChunkSize.value
  }
})

const isGoogleDrive = computed(() => form.value.storage_backend === 'google_drive')
const isOAuth = computed(() => form.value.google_auth_mode === 'oauth')

// ── Load ──────────────────────────────────────────────────────────────────────

onMounted(async () => {
  loading.value = true
  globalError.value = ''
  try {
    const [cfg, prvs, tpls, sysCfg] = await Promise.all([
      api.getAppConfig(),
      api.listProviders(),
      api.listTemplates(),
      api.getConfig(),
    ])
    config.value = cfg
    providers.value = prvs
    templates.value = tpls
    oauthAuthorized.value = (sysCfg as { googleOAuthAuthorized?: boolean }).googleOAuthAuthorized ?? false
    populateForm(cfg)
  } catch (e: unknown) {
    globalError.value = apiErr(e)
  } finally {
    loading.value = false
  }
})

watch(() => form.value.storage_backend, (val) => {
  if (val !== 'google_drive') {
    form.value.google_drive_root_folder_id = ''
    form.value.google_shared_drive_id = ''
  }
})

// ── Save ──────────────────────────────────────────────────────────────────────

async function save() {
  saving.value = true
  saveSuccess.value = false
  globalError.value = ''
  try {
    const updated = await api.saveAppConfig({
      active_llm_model_id:              form.value.active_llm_model_id,
      active_alloc_template_id:         form.value.active_alloc_template_id,
      active_dev_template_id:           form.value.active_dev_template_id,
      active_assessment_template_id:    form.value.active_assessment_template_id,
      storage_backend:                  form.value.storage_backend,
      local_drive_root:           form.value.local_drive_root,
      google_auth_mode:           form.value.google_auth_mode,
      google_drive_root_folder_id: form.value.google_drive_root_folder_id || null,
      google_shared_drive_id:     form.value.google_shared_drive_id || null,
      use_env_proxy:              form.value.use_env_proxy,
      transcript_strategy:        form.value.transcript_strategy,
      transcript_chunk_size:      form.value.transcript_chunk_size,
      generation_mode:            'completo', // legado: mantido fixo por compatibilidade com o backend
    })
    config.value = updated
    populateForm(updated)
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 3000)
  } catch (e: unknown) {
    globalError.value = apiErr(e)
  } finally {
    saving.value = false
  }
}

async function reloadBackend() {
  reloading.value = true
  globalError.value = ''
  try {
    await api.reloadConfig()
  } catch (e: unknown) {
    globalError.value = apiErr(e)
  } finally {
    reloading.value = false
  }
}

// ── Google OAuth ──────────────────────────────────────────────────────────────

const authUrlLoading = ref(false)

async function openGoogleAuth() {
  authUrlLoading.value = true
  try {
    const { url } = await api.getGoogleAuthUrl()
    window.open(url, '_blank', 'noopener,noreferrer')
  } catch (e: unknown) {
    globalError.value = apiErr(e)
  } finally {
    authUrlLoading.value = false
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function apiErr(e: unknown): string {
  const err = e as { response?: { data?: { detail?: string; error?: string } } }
  return err.response?.data?.detail ?? err.response?.data?.error ?? 'Erro desconhecido'
}

function modelLabel(id: number | null): string {
  if (!id) return '—'
  const item = modelItems.value.find((m) => m.value === id)
  return item ? `${item.subtitle} · ${item.title}` : `#${id}`
}

function templateLabel(id: number | null): string {
  if (!id) return '—'
  return allTemplates.value.find((t) => t.id === id)?.name ?? `#${id}`
}

function typeChipColor(type: string): string {
  if (type === 'alocacao') return 'primary'
  if (type === 'assessment') return 'warning'
  return 'secondary'
}

function typeName(type: string): string {
  if (type === 'alocacao') return 'Alocação'
  if (type === 'assessment') return 'Assessment'
  return 'Dev'
}

// ── Tema ──────────────────────────────────────────────────────────────────────

const vuetifyTheme = useTheme()
const isDark = computed(() => vuetifyTheme.global.name.value === 'dark')

function toggleTheme(val: boolean | null) {
  const next = val ? 'dark' : 'light'
  vuetifyTheme.global.name.value = next
  localStorage.setItem('app-theme', next)
}
</script>

<template>
  <v-container fluid class="pa-6" style="max-width: 1100px">

    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h5 font-weight-bold">Configurações</h1>
        <p class="text-body-2 text-medium-emphasis mt-1">
          Gerencie modelo de IA, templates, armazenamento e preferências do sistema
        </p>
      </div>
      <div class="d-flex align-center ga-2">
        <v-slide-x-transition>
          <v-chip v-if="saveSuccess" color="success" variant="tonal" prepend-icon="mdi-check">
            Salvo com sucesso
          </v-chip>
        </v-slide-x-transition>
        <v-btn
          color="primary"
          variant="flat"
          prepend-icon="mdi-content-save-outline"
          :loading="saving"
          @click="save"
        >
          Salvar
        </v-btn>
      </div>
    </div>

    <!-- Alerts -->
    <v-alert
      v-if="globalError"
      type="error"
      variant="tonal"
      closable
      class="mb-5"
      @click:close="globalError = ''"
    >
      {{ globalError }}
    </v-alert>

    <!-- Skeleton -->
    <template v-if="loading">
      <v-skeleton-loader type="card" rounded="lg" class="mb-4" />
      <v-skeleton-loader type="card" rounded="lg" class="mb-4" />
    </template>

    <!-- Content -->
    <template v-else>
      <v-card variant="outlined" rounded="lg">

        <!-- Tabs -->
        <v-tabs v-model="activeTab" color="primary" align-tabs="start" class="border-b">
          <v-tab value="ia" prepend-icon="mdi-robot-outline">
            Inteligência Artificial
          </v-tab>
          <v-tab value="templates" prepend-icon="mdi-file-powerpoint-outline">
            Templates PPT
          </v-tab>
          <v-tab value="armazenamento" prepend-icon="mdi-database-outline">
            Armazenamento
          </v-tab>
          <v-tab value="sistema" prepend-icon="mdi-tune-variant">
            Sistema
          </v-tab>
        </v-tabs>

        <v-window v-model="activeTab">

          <!-- ── Aba: Inteligência Artificial ──────────────────────────────── -->
          <v-window-item value="ia">
            <div class="pa-6">
              <v-row>

                <!-- Coluna esquerda: modelo LLM -->
                <v-col cols="12" md="6">
                  <p class="text-subtitle-1 font-weight-medium mb-1 d-flex align-center ga-2">
                    <v-icon size="18" color="secondary">mdi-chip</v-icon>
                    Modelo LLM Ativo
                  </p>
                  <p class="text-body-2 text-medium-emphasis mb-4">
                    Modelo usado para gerar propostas e documentos. Cadastre provedores em
                    <strong>Cadastro de LLMs</strong>.
                  </p>

                  <v-autocomplete
                    v-model="form.active_llm_model_id"
                    label="Modelo ativo"
                    :items="modelItems"
                    item-value="value"
                    item-title="title"
                    variant="outlined"
                    density="comfortable"
                    clearable
                    auto-select-first
                    :no-data-text="providers.length === 0 ? 'Nenhum provedor cadastrado' : 'Nenhum modelo disponível'"
                  >
                    <template #item="{ item, props: itemProps }">
                      <v-list-item v-bind="itemProps" :subtitle="item.raw.subtitle">
                        <template #prepend>
                          <v-icon size="16" color="secondary" class="mr-1">mdi-chip</v-icon>
                        </template>
                      </v-list-item>
                    </template>
                    <template #selection="{ item }">
                      <span>{{ item.raw.subtitle }} · {{ item.raw.title }}</span>
                    </template>
                  </v-autocomplete>

                  <p v-if="config?.active_llm_model" class="text-caption text-medium-emphasis mt-n2">
                    Atual: <strong>{{ modelLabel(config.active_llm_model_id ?? null) }}</strong>
                  </p>
                  <v-alert
                    v-else
                    type="warning"
                    variant="tonal"
                    density="compact"
                    class="mt-1"
                    icon="mdi-alert-outline"
                  >
                    Nenhum LLM configurado — geração usará modo offline.
                  </v-alert>
                </v-col>

                <!-- Coluna direita: estratégia de geração -->
                <v-col cols="12" md="6">
                  <p class="text-subtitle-1 font-weight-medium mb-1 d-flex align-center ga-2">
                    <v-icon size="18" color="secondary">mdi-text-search</v-icon>
                    Estratégia de Geração
                  </p>
                  <p class="text-body-2 text-medium-emphasis mb-4">
                    Como os insumos da reunião são processados para gerar o documento.
                  </p>

                  <v-radio-group
                    v-model="form.transcript_strategy"
                    hide-details
                    density="comfortable"
                    class="mt-0"
                  >
                    <v-radio value="clip" color="secondary">
                      <template #label>
                        <div class="py-1">
                          <span class="text-body-2 font-weight-medium">Direto (Clip)</span>
                          <p class="text-caption text-medium-emphasis mb-0">
                            Mais rápido. Gera o documento direto a partir dos insumos empacotados, sem pipeline intermediário.
                          </p>
                        </div>
                      </template>
                    </v-radio>
                    <v-radio value="map_reduce" color="secondary">
                      <template #label>
                        <div class="py-1">
                          <span class="text-body-2 font-weight-medium">Completo (MapReduce)</span>
                          <p class="text-caption text-medium-emphasis mb-0">
                            Mais robusto. Usa extração estruturada, chunks, consolidação e geração por seção.
                          </p>
                        </div>
                      </template>
                    </v-radio>
                  </v-radio-group>

                  <v-expand-transition>
                    <div v-if="form.transcript_strategy === 'map_reduce'">
                      <v-text-field
                        v-model.number="form.transcript_chunk_size"
                        label="Tamanho do Chunk (chars)"
                        type="number"
                        variant="outlined"
                        density="comfortable"
                        :min="2000"
                        :max="100000"
                        class="mt-3"
                      >
                        <template #append-inner>
                          <v-tooltip location="top" max-width="340">
                            <template #activator="{ props: tip }">
                              <v-icon v-bind="tip" size="16" color="medium-emphasis">mdi-information-outline</v-icon>
                            </template>
                            <div>
                              <strong>Tamanho do Chunk</strong><br>
                              Quantidade de caracteres da transcrição analisada por chamada à IA.<br><br>
                              Valores menores: mais chamadas, cada uma mais focada.<br>
                              Valores maiores: menos chamadas, mais contexto por vez.<br><br>
                              Referência por modelo:<br>
                              • Modelos pequenos (2K–8K ctx): 3.000–8.000<br>
                              • Modelos médios (32K ctx): 15.000–25.000<br>
                              • Gemini / GPT-4 (1M ctx): 20.000–50.000
                            </div>
                          </v-tooltip>
                        </template>
                      </v-text-field>
                      <p v-if="recommendedChunkSize" class="text-caption text-medium-emphasis mt-n2">
                        <v-icon size="12" color="warning">mdi-lightning-bolt</v-icon>
                        Recomendado para <strong>{{ activeModelItem?.title }}</strong>:
                        {{ recommendedChunkSize.toLocaleString('pt-BR') }} chars
                      </p>
                      <p v-else class="text-caption text-medium-emphasis mt-n2">
                        Modelo não reconhecido — ajuste conforme o contexto máximo suportado.
                      </p>
                    </div>
                    <p v-else class="text-caption text-medium-emphasis mt-3 mb-0">
                      Se os insumos forem grandes demais para uma chamada única, use o modo Completo.
                    </p>
                  </v-expand-transition>
                </v-col>

              </v-row>
            </div>
          </v-window-item>

          <!-- ── Aba: Templates PPT ─────────────────────────────────────────── -->
          <v-window-item value="templates">
            <div class="pa-6">
              <p class="text-body-2 text-medium-emphasis mb-5">
                Arquivos <strong>.pptx</strong> usados como base na geração de propostas.
                Faça upload em <strong>Templates PPT</strong>.
              </p>

              <v-row>
                <v-col cols="12" md="4">
                  <p class="text-subtitle-2 mb-2 d-flex align-center ga-1">
                    <v-icon size="16" color="primary">mdi-account-group-outline</v-icon>
                    Alocação
                  </p>
                  <v-autocomplete
                    v-model="form.active_alloc_template_id"
                    label="Template ativo"
                    :items="allTemplates"
                    item-value="id"
                    item-title="name"
                    variant="outlined"
                    density="comfortable"
                    clearable
                    :no-data-text="'Nenhum template cadastrado'"
                  >
                    <template #item="{ item, props: itemProps }">
                      <v-list-item v-bind="itemProps">
                        <template #append>
                          <v-chip size="x-small" :color="typeChipColor(item.raw.proposal_type)" variant="tonal">
                            {{ typeName(item.raw.proposal_type) }}
                          </v-chip>
                        </template>
                      </v-list-item>
                    </template>
                  </v-autocomplete>
                  <p class="text-caption text-medium-emphasis mt-n2">
                    Atual: <strong>{{ templateLabel(config?.active_alloc_template_id ?? null) }}</strong>
                  </p>
                </v-col>

                <v-col cols="12" md="4">
                  <p class="text-subtitle-2 mb-2 d-flex align-center ga-1">
                    <v-icon size="16" color="secondary">mdi-code-braces</v-icon>
                    Desenvolvimento
                  </p>
                  <v-autocomplete
                    v-model="form.active_dev_template_id"
                    label="Template ativo"
                    :items="allTemplates"
                    item-value="id"
                    item-title="name"
                    variant="outlined"
                    density="comfortable"
                    clearable
                    :no-data-text="'Nenhum template cadastrado'"
                  >
                    <template #item="{ item, props: itemProps }">
                      <v-list-item v-bind="itemProps">
                        <template #append>
                          <v-chip size="x-small" :color="typeChipColor(item.raw.proposal_type)" variant="tonal">
                            {{ typeName(item.raw.proposal_type) }}
                          </v-chip>
                        </template>
                      </v-list-item>
                    </template>
                  </v-autocomplete>
                  <p class="text-caption text-medium-emphasis mt-n2">
                    Atual: <strong>{{ templateLabel(config?.active_dev_template_id ?? null) }}</strong>
                  </p>
                </v-col>

                <v-col cols="12" md="4">
                  <p class="text-subtitle-2 mb-2 d-flex align-center ga-1">
                    <v-icon size="16" color="warning">mdi-clipboard-search-outline</v-icon>
                    Assessment
                  </p>
                  <v-autocomplete
                    v-model="form.active_assessment_template_id"
                    label="Template ativo"
                    :items="allTemplates"
                    item-value="id"
                    item-title="name"
                    variant="outlined"
                    density="comfortable"
                    clearable
                    :no-data-text="'Nenhum template cadastrado'"
                  >
                    <template #item="{ item, props: itemProps }">
                      <v-list-item v-bind="itemProps">
                        <template #append>
                          <v-chip size="x-small" :color="typeChipColor(item.raw.proposal_type)" variant="tonal">
                            {{ typeName(item.raw.proposal_type) }}
                          </v-chip>
                        </template>
                      </v-list-item>
                    </template>
                  </v-autocomplete>
                  <p class="text-caption text-medium-emphasis mt-n2">
                    Atual: <strong>{{ templateLabel(config?.active_assessment_template_id ?? null) }}</strong>
                  </p>
                </v-col>
              </v-row>
            </div>
          </v-window-item>

          <!-- ── Aba: Armazenamento ─────────────────────────────────────────── -->
          <v-window-item value="armazenamento">
            <div class="pa-6">
              <v-row>
                <v-col cols="12" md="5">
                  <p class="text-subtitle-1 font-weight-medium mb-1">Backend de armazenamento</p>
                  <p class="text-body-2 text-medium-emphasis mb-4">
                    Define onde os arquivos de projetos e documentos são salvos.
                  </p>

                  <v-btn-toggle
                    v-model="form.storage_backend"
                    mandatory
                    density="compact"
                    variant="outlined"
                    divided
                    class="mb-5"
                  >
                    <v-btn value="local" prepend-icon="mdi-folder-outline">
                      Local
                    </v-btn>
                    <v-btn value="google_drive" prepend-icon="mdi-google-drive">
                      Google Drive
                    </v-btn>
                  </v-btn-toggle>

                  <template v-if="!isGoogleDrive">
                    <v-text-field
                      v-model="form.local_drive_root"
                      label="Caminho raiz local"
                      placeholder="data/drive"
                      variant="outlined"
                      density="comfortable"
                      prepend-inner-icon="mdi-folder-outline"
                      hint="Caminho relativo à raiz do servidor"
                      persistent-hint
                    />
                  </template>
                </v-col>

                <v-col v-if="isGoogleDrive" cols="12" md="7">
                  <p class="text-subtitle-1 font-weight-medium mb-1">Configuração do Google Drive</p>
                  <p class="text-body-2 text-medium-emphasis mb-4">
                    Credenciais e localização da pasta raiz no Drive.
                  </p>

                  <v-autocomplete
                    v-model="form.google_auth_mode"
                    label="Modo de autenticação"
                    :items="[
                      { value: 'service_account', title: 'Conta de Serviço (recomendado)' },
                      { value: 'oauth', title: 'OAuth 2.0 (usuário)' },
                    ]"
                    item-value="value"
                    item-title="title"
                    variant="outlined"
                    density="comfortable"
                    class="mb-3"
                  />

                  <v-text-field
                    v-model="form.google_drive_root_folder_id"
                    label="ID da pasta raiz no Google Drive"
                    placeholder="1a2b3c4d..."
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-folder-google-drive"
                    hint="ID da pasta pai onde os projetos serão criados"
                    persistent-hint
                    class="mb-4"
                  />

                  <v-text-field
                    v-model="form.google_shared_drive_id"
                    label="ID do Shared Drive (opcional)"
                    placeholder="Deixe em branco para usar My Drive"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-google-drive"
                    clearable
                    class="mb-2"
                  />

                  <v-card
                    v-if="isOAuth"
                    variant="tonal"
                    :color="oauthAuthorized ? 'success' : 'warning'"
                    rounded="lg"
                    class="mt-2 pa-4"
                  >
                    <div class="d-flex align-center justify-space-between flex-wrap ga-3">
                      <div class="d-flex align-center ga-2">
                        <v-icon :color="oauthAuthorized ? 'success' : 'warning'">
                          {{ oauthAuthorized ? 'mdi-check-circle' : 'mdi-alert-circle-outline' }}
                        </v-icon>
                        <div>
                          <p class="text-body-2 font-weight-medium">
                            {{ oauthAuthorized ? 'Google Drive autorizado' : 'Autorização pendente' }}
                          </p>
                          <p class="text-caption">
                            {{ oauthAuthorized
                              ? 'Credenciais OAuth salvas no servidor.'
                              : 'Clique em Autorizar para conceder acesso ao Google Drive.' }}
                          </p>
                        </div>
                      </div>
                      <v-btn
                        color="primary"
                        variant="flat"
                        size="small"
                        prepend-icon="mdi-open-in-new"
                        :loading="authUrlLoading"
                        @click="openGoogleAuth"
                      >
                        {{ oauthAuthorized ? 'Reautorizar' : 'Autorizar' }}
                      </v-btn>
                    </div>
                  </v-card>
                </v-col>
              </v-row>
            </div>
          </v-window-item>

          <!-- ── Aba: Sistema ───────────────────────────────────────────────── -->
          <v-window-item value="sistema">
            <div class="pa-6">
              <v-row>

                <v-col cols="12" md="6">
                  <p class="text-subtitle-1 font-weight-medium mb-1 d-flex align-center ga-2">
                    <v-icon size="18">mdi-lan</v-icon>
                    Rede
                  </p>
                  <p class="text-body-2 text-medium-emphasis mb-4">
                    Configurações de conectividade para requisições externas.
                  </p>

                  <v-switch
                    v-model="form.use_env_proxy"
                    color="primary"
                    hide-details
                    inset
                  >
                    <template #label>
                      <div>
                        <span class="text-body-2 font-weight-medium">Usar proxy do ambiente</span>
                        <p class="text-caption text-medium-emphasis">
                          Quando ativado, requisições para IA e Google Drive usam
                          <code>HTTP_PROXY</code> / <code>HTTPS_PROXY</code> do sistema.
                        </p>
                      </div>
                    </template>
                  </v-switch>
                </v-col>

                <v-col cols="12" md="6">
                  <p class="text-subtitle-1 font-weight-medium mb-1 d-flex align-center ga-2">
                    <v-icon size="18">mdi-palette-outline</v-icon>
                    Aparência
                  </p>
                  <p class="text-body-2 text-medium-emphasis mb-4">
                    Preferências visuais da interface.
                  </p>

                  <v-switch
                    :model-value="isDark"
                    color="primary"
                    hide-details
                    inset
                    @update:model-value="toggleTheme"
                  >
                    <template #label>
                      <div class="d-flex align-center ga-2">
                        <v-icon size="18">{{ isDark ? 'mdi-weather-night' : 'mdi-weather-sunny' }}</v-icon>
                        <div>
                          <span class="text-body-2 font-weight-medium">Tema {{ isDark ? 'Escuro' : 'Claro' }}</span>
                          <p class="text-caption text-medium-emphasis">
                            A preferência é salva automaticamente no navegador.
                          </p>
                        </div>
                      </div>
                    </template>
                  </v-switch>

                  <v-divider class="my-5" />

                  <p class="text-subtitle-1 font-weight-medium mb-1 d-flex align-center ga-2">
                    <v-icon size="18">mdi-refresh</v-icon>
                    Backend
                  </p>
                  <p class="text-body-2 text-medium-emphasis mb-4">
                    Recarrega as configurações do servidor sem reiniciar o processo.
                  </p>
                  <v-btn
                    variant="tonal"
                    prepend-icon="mdi-refresh"
                    :loading="reloading"
                    @click="reloadBackend"
                  >
                    Recarregar Backend
                  </v-btn>
                </v-col>

              </v-row>
            </div>
          </v-window-item>

        </v-window>
      </v-card>
    </template>

  </v-container>
</template>
