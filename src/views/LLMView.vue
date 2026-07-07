<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import * as api from '../services/api'
import type { LLMModelResponse, LLMProviderFull } from '../types'

// ── State ──────────────────────────────────────────────
const providers  = ref<LLMProviderFull[]>([])
const loading    = ref(true)
const loadError  = ref('')
const showApiKey = ref<Record<number, boolean>>({})

// ── Provider dialog ────────────────────────────────────
const provDialog = reactive({
  show:    false,
  editing: null as LLMProviderFull | null,
  form:    { name: '', slug: '', base_url: '', api_key: '' },
  saving:  false,
  error:   '',
  showKey: false,
})

// ── Model dialog ───────────────────────────────────────
const modelDialog = reactive({
  show:       false,
  providerId: 0,
  editing:    null as LLMModelResponse | null,
  form:       { name: '', display_name: '' },
  saving:     false,
  error:      '',
})

// ── Delete dialogs ─────────────────────────────────────
const delProvider = reactive({
  show:   false,
  target: null as LLMProviderFull | null,
  saving: false,
  error:  '',
})
const delModel = reactive({
  show:       false,
  providerId: 0,
  target:     null as LLMModelResponse | null,
  saving:     false,
  error:      '',
})

// ── Helpers ────────────────────────────────────────────
function apiErr(e: unknown): string {
  return (
    (e as { response?: { data?: { detail?: string } } }).response?.data?.detail ??
    'Ocorreu um erro inesperado'
  )
}

function maskKey(key?: string | null): string {
  if (!key) return '—'
  return key.slice(0, 6) + '••••••••'
}

// ── Load ───────────────────────────────────────────────
async function load() {
  loading.value   = true
  loadError.value = ''
  try {
    providers.value = await api.listProviders()
  } catch (e) {
    loadError.value = apiErr(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)

// ── Provider CRUD ──────────────────────────────────────
function openCreateProvider() {
  provDialog.editing = null
  provDialog.form    = { name: '', slug: '', base_url: '', api_key: '' }
  provDialog.error   = ''
  provDialog.showKey = false
  provDialog.show    = true
}

function openEditProvider(p: LLMProviderFull) {
  provDialog.editing = p
  provDialog.form    = { name: p.name, slug: p.slug, base_url: p.base_url, api_key: p.api_key ?? '' }
  provDialog.error   = ''
  provDialog.showKey = false
  provDialog.show    = true
}

async function saveProvider() {
  provDialog.saving = true
  provDialog.error  = ''
  try {
    const { name, slug, base_url, api_key } = provDialog.form
    if (provDialog.editing) {
      const updated = await api.updateProvider(provDialog.editing.id, { name, slug, base_url, api_key: api_key || undefined })
      const idx = providers.value.findIndex((p) => p.id === provDialog.editing!.id)
      if (idx !== -1) providers.value[idx] = { ...providers.value[idx], ...updated }
    } else {
      const created = await api.createProvider({ name, slug, base_url, api_key: api_key || undefined })
      providers.value.push({ ...created, models: [] })
    }
    provDialog.show = false
  } catch (e) {
    provDialog.error = apiErr(e)
  } finally {
    provDialog.saving = false
  }
}

async function confirmDeleteProvider() {
  if (!delProvider.target) return
  delProvider.saving = true
  delProvider.error  = ''
  try {
    await api.deleteProvider(delProvider.target.id)
    providers.value = providers.value.filter((p) => p.id !== delProvider.target!.id)
    delProvider.show = false
  } catch (e) {
    delProvider.error = apiErr(e)
  } finally {
    delProvider.saving = false
  }
}

// ── Model CRUD ─────────────────────────────────────────
function openCreateModel(providerId: number) {
  modelDialog.providerId = providerId
  modelDialog.editing    = null
  modelDialog.form       = { name: '', display_name: '' }
  modelDialog.error      = ''
  modelDialog.show       = true
}

function openEditModel(providerId: number, m: LLMModelResponse) {
  modelDialog.providerId = providerId
  modelDialog.editing    = m
  modelDialog.form       = { name: m.name, display_name: m.display_name }
  modelDialog.error      = ''
  modelDialog.show       = true
}

async function saveModel() {
  modelDialog.saving = true
  modelDialog.error  = ''
  try {
    const provider = providers.value.find((p) => p.id === modelDialog.providerId)
    if (!provider) throw new Error('Provider not found')
    const { name, display_name } = modelDialog.form
    if (modelDialog.editing) {
      const updated = await api.updateModel(modelDialog.providerId, modelDialog.editing.id, { name, display_name })
      const idx = provider.models.findIndex((m) => m.id === modelDialog.editing!.id)
      if (idx !== -1) provider.models[idx] = updated
    } else {
      const created = await api.createModel(modelDialog.providerId, { name, display_name })
      provider.models.push(created)
    }
    modelDialog.show = false
  } catch (e) {
    modelDialog.error = apiErr(e)
  } finally {
    modelDialog.saving = false
  }
}

async function confirmDeleteModel() {
  if (!delModel.target) return
  delModel.saving = true
  delModel.error  = ''
  try {
    await api.deleteModel(delModel.providerId, delModel.target.id)
    const provider = providers.value.find((p) => p.id === delModel.providerId)
    if (provider) provider.models = provider.models.filter((m) => m.id !== delModel.target!.id)
    delModel.show = false
  } catch (e) {
    delModel.error = apiErr(e)
  } finally {
    delModel.saving = false
  }
}
</script>

<template>
  <v-container fluid class="pa-6">

    <!-- ── Cabeçalho ────────────────────────────────── -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h5 font-weight-bold">Provedores de LLM</h1>
        <p class="text-body-2 text-medium-emphasis mt-1">
          Gerencie provedores de IA e seus modelos
        </p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreateProvider">
        Adicionar Provedor
      </v-btn>
    </div>

    <!-- ── Carregamento ──────────────────────────────── -->
    <div v-if="loading" class="d-flex justify-center py-16">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <v-alert v-else-if="loadError" type="error" variant="tonal" class="mb-4">
      {{ loadError }}
    </v-alert>

    <!-- ── Estado vazio ──────────────────────────────── -->
    <div
      v-else-if="providers.length === 0"
      class="d-flex flex-column align-center justify-center"
      style="min-height: 320px"
    >
      <v-icon size="64" color="medium-emphasis" class="mb-4">mdi-brain</v-icon>
      <p class="text-h6 text-medium-emphasis">Nenhum provedor cadastrado</p>
      <p class="text-body-2 text-medium-emphasis mb-6">
        Adicione um provedor de IA (ex: OpenAI, Anthropic, Ollama)
      </p>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreateProvider">
        Adicionar Provedor
      </v-btn>
    </div>

    <!-- ── Lista de provedores ───────────────────────── -->
    <v-expansion-panels v-else variant="accordion" class="border rounded-lg overflow-hidden">
      <v-expansion-panel v-for="provider in providers" :key="provider.id">

        <!-- Título do painel -->
        <v-expansion-panel-title :hide-actions="false">
          <div class="d-flex align-center ga-3 flex-grow-1 mr-2">
            <v-icon color="secondary" size="22">mdi-brain</v-icon>
            <div class="flex-grow-1 min-width-0">
              <div class="d-flex align-center ga-2 flex-wrap">
                <span class="text-subtitle-2 font-weight-bold">{{ provider.name }}</span>
                <v-chip size="x-small" variant="outlined" class="font-monospace">
                  {{ provider.slug }}
                </v-chip>
                <v-chip
                  size="x-small"
                  variant="tonal"
                  :color="provider.is_active ? 'success' : 'default'"
                >
                  {{ provider.is_active ? 'Ativo' : 'Inativo' }}
                </v-chip>
                <v-chip size="x-small" variant="tonal" color="secondary">
                  {{ provider.models.length }}
                  {{ provider.models.length === 1 ? 'modelo' : 'modelos' }}
                </v-chip>
              </div>
            </div>
            <!-- Ações do provedor — @click.stop impede abrir/fechar o painel -->
            <div class="d-flex ga-1 flex-shrink-0" @click.stop>
              <v-tooltip text="Editar provedor" location="top">
                <template #activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon="mdi-pencil-outline"
                    variant="text"
                    size="small"
                    @click="openEditProvider(provider)"
                  />
                </template>
              </v-tooltip>
              <v-tooltip text="Excluir provedor" location="top">
                <template #activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon="mdi-delete-outline"
                    variant="text"
                    size="small"
                    color="error"
                    @click="delProvider.target = provider; delProvider.error = ''; delProvider.show = true"
                  />
                </template>
              </v-tooltip>
            </div>
          </div>
        </v-expansion-panel-title>

        <!-- Corpo do painel -->
        <v-expansion-panel-text>
          <!-- Detalhes do provedor -->
          <v-row dense class="mb-4">
            <v-col cols="12" sm="6">
              <p class="text-caption text-medium-emphasis mb-1">URL Base</p>
              <code class="text-body-2">{{ provider.base_url || '—' }}</code>
            </v-col>
            <v-col cols="12" sm="6">
              <p class="text-caption text-medium-emphasis mb-1">API Key</p>
              <div class="d-flex align-center ga-1">
                <code class="text-body-2">
                  {{ showApiKey[provider.id] ? (provider.api_key || '—') : maskKey(provider.api_key) }}
                </code>
                <v-btn
                  v-if="provider.api_key"
                  :icon="showApiKey[provider.id] ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                  variant="text"
                  size="x-small"
                  @click="showApiKey[provider.id] = !showApiKey[provider.id]"
                />
              </div>
            </v-col>
          </v-row>

          <v-divider class="mb-4" />

          <!-- Seção de modelos -->
          <div class="d-flex align-center justify-space-between mb-3">
            <span class="text-subtitle-2 font-weight-medium d-flex align-center ga-1">
              <v-icon size="16">mdi-cube-outline</v-icon>
              Modelos
            </span>
            <v-btn
              size="small"
              variant="tonal"
              color="primary"
              prepend-icon="mdi-plus"
              @click="openCreateModel(provider.id)"
            >
              Adicionar Modelo
            </v-btn>
          </div>

          <!-- Vazio: sem modelos -->
          <div
            v-if="provider.models.length === 0"
            class="py-5 text-center rounded-lg border"
          >
            <v-icon size="36" color="medium-emphasis" class="mb-1">mdi-cube-off-outline</v-icon>
            <p class="text-body-2 text-medium-emphasis">Nenhum modelo cadastrado</p>
          </div>

          <!-- Lista de modelos -->
          <v-card v-else elevation="3" rounded="lg">
            <v-list density="compact" class="py-0">
              <template v-for="(model, idx) in provider.models" :key="model.id">
                <v-divider v-if="idx > 0" />
                <v-list-item min-height="52">
                  <template #prepend>
                    <v-icon size="16" color="secondary" class="mr-2">mdi-swap-horizontal</v-icon>
                  </template>

                  <v-list-item-title class="text-body-2 font-weight-medium">
                    {{ model.display_name }}
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    <code class="text-caption">{{ model.name }}</code>
                  </v-list-item-subtitle>

                  <template #append>
                    <div class="d-flex align-center ga-2">
                      <v-chip
                        size="x-small"
                        variant="tonal"
                        :color="model.is_active ? 'success' : 'default'"
                      >
                        {{ model.is_active ? 'Ativo' : 'Inativo' }}
                      </v-chip>
                      <v-btn
                        icon="mdi-pencil-outline"
                        variant="text"
                        size="x-small"
                        @click="openEditModel(provider.id, model)"
                      />
                      <v-btn
                        icon="mdi-delete-outline"
                        variant="text"
                        size="x-small"
                        color="error"
                        @click="delModel.providerId = provider.id; delModel.target = model; delModel.error = ''; delModel.show = true"
                      />
                    </div>
                  </template>
                </v-list-item>
              </template>
            </v-list>
          </v-card>
        </v-expansion-panel-text>

      </v-expansion-panel>
    </v-expansion-panels>
  </v-container>

  <!-- ────────────────────────────────────────────────── -->
  <!-- Dialog: criar / editar provedor                   -->
  <!-- ────────────────────────────────────────────────── -->
  <v-dialog v-model="provDialog.show" max-width="600" persistent>
    <v-card rounded="lg">
      <v-card-title class="pt-5 px-6">
        {{ provDialog.editing ? 'Editar Provedor' : 'Novo Provedor' }}
      </v-card-title>

      <v-card-text class="px-6 pb-2">
        <v-alert
          v-if="provDialog.error"
          type="error" variant="tonal" density="compact" class="mb-4"
        >
          {{ provDialog.error }}
        </v-alert>

        <v-row dense>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="provDialog.form.name"
              label="Nome *"
              placeholder="Ex: OpenAI"
              variant="outlined"
              density="comfortable"
              :disabled="provDialog.saving"
              autofocus
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="provDialog.form.slug"
              label="Slug *"
              placeholder="Ex: openai"
              variant="outlined"
              density="comfortable"
              hint="Identificador único sem espaços"
              persistent-hint
              :disabled="provDialog.saving"
            />
          </v-col>
          <v-col cols="12">
            <v-text-field
              v-model="provDialog.form.base_url"
              label="URL Base"
              placeholder="https://api.openai.com/v1"
              variant="outlined"
              density="comfortable"
              :disabled="provDialog.saving"
            />
          </v-col>
          <v-col cols="12">
            <v-text-field
              v-model="provDialog.form.api_key"
              label="API Key"
              placeholder="sk-..."
              variant="outlined"
              density="comfortable"
              :type="provDialog.showKey ? 'text' : 'password'"
              :append-inner-icon="provDialog.showKey ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
              :disabled="provDialog.saving"
              @click:append-inner="provDialog.showKey = !provDialog.showKey"
            />
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions class="px-6 pb-5 justify-end ga-2">
        <v-btn variant="text" :disabled="provDialog.saving" @click="provDialog.show = false">
          Cancelar
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="provDialog.saving"
          :disabled="!provDialog.form.name.trim() || !provDialog.form.slug.trim()"
          @click="saveProvider"
        >
          Salvar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ────────────────────────────────────────────────── -->
  <!-- Dialog: criar / editar modelo                     -->
  <!-- ────────────────────────────────────────────────── -->
  <v-dialog v-model="modelDialog.show" max-width="560" persistent>
    <v-card rounded="lg">
      <v-card-title class="pt-5 px-6">
        {{ modelDialog.editing ? 'Editar Modelo' : 'Novo Modelo' }}
      </v-card-title>

      <v-card-text class="px-6 pb-2">
        <v-alert
          v-if="modelDialog.error"
          type="error" variant="tonal" density="compact" class="mb-4"
        >
          {{ modelDialog.error }}
        </v-alert>

        <v-row dense>
          <v-col cols="12">
            <v-text-field
              v-model="modelDialog.form.display_name"
              label="Nome de exibição *"
              placeholder="Ex: GPT-4o"
              variant="outlined"
              density="comfortable"
              :disabled="modelDialog.saving"
              autofocus
            />
          </v-col>
          <v-col cols="12">
            <v-text-field
              v-model="modelDialog.form.name"
              label="ID do modelo *"
              placeholder="Ex: gpt-4o"
              variant="outlined"
              density="comfortable"
              hint="Identificador exato usado na chamada de API"
              persistent-hint
              :disabled="modelDialog.saving"
            />
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions class="px-6 pb-5 justify-end ga-2">
        <v-btn variant="text" :disabled="modelDialog.saving" @click="modelDialog.show = false">
          Cancelar
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="modelDialog.saving"
          :disabled="!modelDialog.form.name.trim() || !modelDialog.form.display_name.trim()"
          @click="saveModel"
        >
          Salvar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ────────────────────────────────────────────────── -->
  <!-- Confirm: excluir provedor                         -->
  <!-- ────────────────────────────────────────────────── -->
  <v-dialog v-model="delProvider.show" max-width="500">
    <v-card rounded="lg">
      <v-card-title class="pt-5 px-6">Excluir Provedor</v-card-title>
      <v-card-text class="px-6">
        <v-alert
          v-if="delProvider.error"
          type="error" variant="tonal" density="compact" class="mb-3"
        >
          {{ delProvider.error }}
        </v-alert>
        Tem certeza que deseja excluir o provedor
        <strong>{{ delProvider.target?.name }}</strong>?
        Todos os modelos associados também serão removidos.
      </v-card-text>
      <v-card-actions class="px-6 pb-5 justify-end ga-2">
        <v-btn variant="text" :disabled="delProvider.saving" @click="delProvider.show = false">
          Cancelar
        </v-btn>
        <v-btn color="error" variant="tonal" :loading="delProvider.saving" @click="confirmDeleteProvider">
          Excluir
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ────────────────────────────────────────────────── -->
  <!-- Confirm: excluir modelo                           -->
  <!-- ────────────────────────────────────────────────── -->
  <v-dialog v-model="delModel.show" max-width="500">
    <v-card rounded="lg">
      <v-card-title class="pt-5 px-6">Excluir Modelo</v-card-title>
      <v-card-text class="px-6">
        <v-alert
          v-if="delModel.error"
          type="error" variant="tonal" density="compact" class="mb-3"
        >
          {{ delModel.error }}
        </v-alert>
        Tem certeza que deseja excluir o modelo
        <strong>{{ delModel.target?.display_name }}</strong>?
      </v-card-text>
      <v-card-actions class="px-6 pb-5 justify-end ga-2">
        <v-btn variant="text" :disabled="delModel.saving" @click="delModel.show = false">
          Cancelar
        </v-btn>
        <v-btn color="error" variant="tonal" :loading="delModel.saving" @click="confirmDeleteModel">
          Excluir
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.font-monospace {
  font-family: monospace;
}
</style>
