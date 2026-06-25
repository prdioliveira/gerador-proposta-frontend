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
}

// ── Computed selects ──────────────────────────────────────────────────────────

interface ModelItem {
  value: number
  title: string
  subtitle: string
  group: string
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
      })
    }
  }
  return items
})

const allTemplates = computed(() => templates.value)

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

// Clear google_shared_drive_id when switching away from google_drive
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
  <v-container fluid class="pa-6" style="max-width: 860px">

    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h5 font-weight-bold">Configurações da Aplicação</h1>
        <p class="text-body-2 text-medium-emphasis mt-1">
          LLM ativo, templates PPT e configurações de armazenamento
        </p>
      </div>
      <v-btn
        variant="tonal"
        prepend-icon="mdi-refresh"
        size="small"
        :loading="reloading"
        @click="reloadBackend"
      >
        Recarregar Backend
      </v-btn>
    </div>

    <!-- Alerts -->
    <v-alert v-if="globalError" type="error" variant="tonal" closable class="mb-5" @click:close="globalError = ''">
      {{ globalError }}
    </v-alert>
    <v-alert v-if="saveSuccess" type="success" variant="tonal" class="mb-5">
      Configurações salvas com sucesso!
    </v-alert>

    <!-- Skeleton -->
    <template v-if="loading">
      <v-skeleton-loader v-for="n in 4" :key="n" type="card" rounded="lg" class="mb-4" />
    </template>

    <!-- Content -->
    <template v-else>

      <!-- ── Inteligência Artificial ──────────────────────────────────────── -->
      <v-card variant="outlined" rounded="lg" class="mb-4">
        <v-card-title class="px-5 pt-5 pb-0 d-flex align-center ga-2">
          <v-icon color="secondary" size="20">mdi-robot-outline</v-icon>
          Inteligência Artificial
        </v-card-title>
        <v-card-text class="px-5 pb-5 pt-3">
          <p class="text-body-2 text-medium-emphasis mb-4">
            Modelo usado para gerar documentação e propostas. Cadastre provedores e modelos em
            <strong>Cadastro de LLMs</strong>.
          </p>

          <v-autocomplete
            v-model="form.active_llm_model_id"
            label="Modelo LLM ativo"
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
          <p v-else class="text-caption text-warning mt-n2">
            Nenhum LLM configurado — geração usará modo offline.
          </p>
        </v-card-text>
      </v-card>

      <!-- ── Templates PPT ─────────────────────────────────────────────────── -->
      <v-card variant="outlined" rounded="lg" class="mb-4">
        <v-card-title class="px-5 pt-5 pb-0 d-flex align-center ga-2">
          <v-icon color="primary" size="20">mdi-file-powerpoint-outline</v-icon>
          Templates PPT
        </v-card-title>
        <v-card-text class="px-5 pb-5 pt-3">
          <p class="text-body-2 text-medium-emphasis mb-4">
            Arquivos .pptx usados como base na geração de propostas. Faça upload dos arquivos em
            <strong>Templates PPT</strong>.
          </p>

          <v-row dense>
            <v-col cols="12" sm="6">
              <v-autocomplete
                v-model="form.active_alloc_template_id"
                label="Template de Alocação"
                :items="allTemplates"
                item-value="id"
                item-title="name"
                variant="outlined"
                density="comfortable"
                clearable
                prepend-inner-icon="mdi-account-group-outline"
                :no-data-text="'Nenhum template cadastrado'"
              >
                <template #item="{ item, props: itemProps }">
                  <v-list-item v-bind="itemProps">
                    <template #append>
                      <div class="d-flex align-center ga-1">
                        <v-chip size="x-small" :color="typeChipColor(item.raw.proposal_type)" variant="tonal">
                          {{ typeName(item.raw.proposal_type) }}
                        </v-chip>
                        <v-icon v-if="!item.raw.file_path" size="14" color="error" title="Sem arquivo">
                          mdi-alert-outline
                        </v-icon>
                      </div>
                    </template>
                  </v-list-item>
                </template>
              </v-autocomplete>
              <p class="text-caption text-medium-emphasis mt-n2 mb-3">
                Atual: <strong>{{ templateLabel(config?.active_alloc_template_id ?? null) }}</strong>
              </p>
            </v-col>

            <v-col cols="12" sm="6">
              <v-autocomplete
                v-model="form.active_dev_template_id"
                label="Template de Desenvolvimento"
                :items="allTemplates"
                item-value="id"
                item-title="name"
                variant="outlined"
                density="comfortable"
                clearable
                prepend-inner-icon="mdi-code-braces"
                :no-data-text="'Nenhum template cadastrado'"
              >
                <template #item="{ item, props: itemProps }">
                  <v-list-item v-bind="itemProps">
                    <template #append>
                      <div class="d-flex align-center ga-1">
                        <v-chip size="x-small" :color="typeChipColor(item.raw.proposal_type)" variant="tonal">
                          {{ typeName(item.raw.proposal_type) }}
                        </v-chip>
                        <v-icon v-if="!item.raw.file_path" size="14" color="error" title="Sem arquivo">
                          mdi-alert-outline
                        </v-icon>
                      </div>
                    </template>
                  </v-list-item>
                </template>
              </v-autocomplete>
              <p class="text-caption text-medium-emphasis mt-n2 mb-3">
                Atual: <strong>{{ templateLabel(config?.active_dev_template_id ?? null) }}</strong>
              </p>
            </v-col>

            <v-col cols="12" sm="6">
              <v-autocomplete
                v-model="form.active_assessment_template_id"
                label="Template de Assessment"
                :items="allTemplates"
                item-value="id"
                item-title="name"
                variant="outlined"
                density="comfortable"
                clearable
                prepend-inner-icon="mdi-clipboard-search-outline"
                :no-data-text="'Nenhum template cadastrado'"
              >
                <template #item="{ item, props: itemProps }">
                  <v-list-item v-bind="itemProps">
                    <template #append>
                      <div class="d-flex align-center ga-1">
                        <v-chip size="x-small" :color="typeChipColor(item.raw.proposal_type)" variant="tonal">
                          {{ typeName(item.raw.proposal_type) }}
                        </v-chip>
                        <v-icon v-if="!item.raw.file_path" size="14" color="error" title="Sem arquivo">
                          mdi-alert-outline
                        </v-icon>
                      </div>
                    </template>
                  </v-list-item>
                </template>
              </v-autocomplete>
              <p class="text-caption text-medium-emphasis mt-n2 mb-3">
                Atual: <strong>{{ templateLabel(config?.active_assessment_template_id ?? null) }}</strong>
              </p>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- ── Armazenamento ─────────────────────────────────────────────────── -->
      <v-card variant="outlined" rounded="lg" class="mb-4">
        <v-card-title class="px-5 pt-5 pb-0 d-flex align-center ga-2">
          <v-icon color="info" size="20">mdi-database-outline</v-icon>
          Armazenamento
        </v-card-title>
        <v-card-text class="px-5 pb-5 pt-3">

          <!-- Backend selector -->
          <p class="text-body-2 font-weight-medium mb-2">Backend</p>
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

          <!-- Local fields -->
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

          <!-- Google Drive fields -->
          <template v-else>
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

            <!-- OAuth status -->
            <v-card v-if="isOAuth" variant="tonal" :color="oauthAuthorized ? 'success' : 'warning'" rounded="lg" class="mt-4 pa-4">
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
          </template>

        </v-card-text>
      </v-card>

      <!-- ── Rede ──────────────────────────────────────────────────────────── -->
      <v-card variant="outlined" rounded="lg" class="mb-6">
        <v-card-title class="px-5 pt-5 pb-0 d-flex align-center ga-2">
          <v-icon color="default" size="20">mdi-lan</v-icon>
          Rede
        </v-card-title>
        <v-card-text class="px-5 pb-4 pt-3">
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
                  Quando ativado, as requisições para a IA e o Google Drive usam as variáveis
                  <code>HTTP_PROXY</code> / <code>HTTPS_PROXY</code> do sistema.
                </p>
              </div>
            </template>
          </v-switch>
        </v-card-text>
      </v-card>

      <!-- ── Aparência ─────────────────────────────────────────────────────── -->
      <v-card variant="outlined" rounded="lg" class="mb-6">
        <v-card-title class="px-5 pt-5 pb-0 d-flex align-center ga-2">
          <v-icon color="default" size="20">mdi-palette-outline</v-icon>
          Aparência
        </v-card-title>
        <v-card-text class="px-5 pb-4 pt-3">
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
        </v-card-text>
      </v-card>

      <!-- ── Salvar ─────────────────────────────────────────────────────────── -->
      <div class="d-flex justify-end">
        <v-btn
          color="primary"
          variant="flat"
          size="large"
          prepend-icon="mdi-content-save-outline"
          :loading="saving"
          @click="save"
        >
          Salvar Configurações
        </v-btn>
      </div>

    </template>
  </v-container>
</template>
