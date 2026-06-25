<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import * as api from '../services/api'
import type { PromptTemplateResponse } from '../types'

// ── State ──────────────────────────────────────────────
const templates = ref<PromptTemplateResponse[]>([])
const loading   = ref(true)
const loadError = ref('')

// ── Template dialog ────────────────────────────────────
const templateDialog = reactive({
  show:    false,
  editing: null as PromptTemplateResponse | null,
  form:    { name: '', content: '', is_active: false },
  saving:  false,
  error:   '',
})

// ── Delete dialog ──────────────────────────────────────
const delTemplate = reactive({
  show:   false,
  target: null as PromptTemplateResponse | null,
  saving: false,
  error:  '',
})

const PLACEHOLDERS = [
  '{client}',
  '{project}',
  '{proposal_kind}',
  '{partial}',
  '{selected_profiles}',
  '{classification}',
  '{context}',
]

// ── Helpers ────────────────────────────────────────────
function apiErr(e: unknown): string {
  const r = (e as { response?: { data?: { detail?: string; error?: string } } }).response?.data
  return r?.detail ?? r?.error ?? 'Ocorreu um erro inesperado'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function preview(content: string): string {
  return content.length > 300 ? content.slice(0, 300) + '…' : content
}

// ── Load ───────────────────────────────────────────────
async function load() {
  loading.value   = true
  loadError.value = ''
  try {
    templates.value = await api.listPromptTemplates()
  } catch (e) {
    loadError.value = apiErr(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)

// ── CRUD ───────────────────────────────────────────────
function openCreate() {
  templateDialog.editing = null
  templateDialog.form    = { name: '', content: '', is_active: false }
  templateDialog.error   = ''
  templateDialog.show    = true
}

function openEdit(t: PromptTemplateResponse) {
  templateDialog.editing = t
  templateDialog.form    = { name: t.name, content: t.content, is_active: t.is_active }
  templateDialog.error   = ''
  templateDialog.show    = true
}

async function save() {
  templateDialog.saving = true
  templateDialog.error  = ''
  try {
    const { name, content, is_active } = templateDialog.form
    if (templateDialog.editing) {
      const updated = await api.updatePromptTemplate(templateDialog.editing.id, { name, content, is_active })
      const idx = templates.value.findIndex((t) => t.id === templateDialog.editing!.id)
      if (idx !== -1) templates.value[idx] = updated
      // se ativou este, desativa os outros na lista local
      if (is_active) {
        templates.value = templates.value.map((t) =>
          t.id === updated.id ? updated : { ...t, is_active: false }
        )
      }
    } else {
      const created = await api.createPromptTemplate({ name, content, is_active })
      if (is_active) {
        templates.value = templates.value.map((t) => ({ ...t, is_active: false }))
      }
      templates.value.unshift(created)
    }
    templateDialog.show = false
  } catch (e) {
    templateDialog.error = apiErr(e)
  } finally {
    templateDialog.saving = false
  }
}

async function activate(t: PromptTemplateResponse) {
  try {
    const updated = await api.updatePromptTemplate(t.id, { is_active: true })
    templates.value = templates.value.map((item) =>
      item.id === updated.id ? updated : { ...item, is_active: false }
    )
  } catch (e) {
    loadError.value = apiErr(e)
  }
}

async function confirmDelete() {
  if (!delTemplate.target) return
  delTemplate.saving = true
  delTemplate.error  = ''
  try {
    await api.deletePromptTemplate(delTemplate.target.id)
    templates.value = templates.value.filter((t) => t.id !== delTemplate.target!.id)
    delTemplate.show = false
  } catch (e) {
    delTemplate.error = apiErr(e)
  } finally {
    delTemplate.saving = false
  }
}
</script>

<template>
  <v-container fluid class="pa-6">
    <div style="max-width: 900px; margin: 0 auto">

      <!-- ── Cabeçalho ──────────────────────────────── -->
      <div class="d-flex align-center justify-space-between mb-6">
        <div>
          <h1 class="text-h5 font-weight-bold">Templates de Prompt</h1>
          <p class="text-body-2 text-medium-emphasis mt-1">
            Prompts enviados ao LLM para geração da documentação de escopo
          </p>
        </div>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">
          Novo Template
        </v-btn>
      </div>

      <!-- ── Carregamento ────────────────────────────── -->
      <template v-if="loading">
        <v-skeleton-loader v-for="n in 2" :key="n" type="card" class="mb-4 rounded-lg" />
      </template>

      <v-alert v-else-if="loadError" type="error" variant="tonal" class="mb-4">
        {{ loadError }}
      </v-alert>

      <!-- ── Estado vazio ────────────────────────────── -->
      <div
        v-else-if="templates.length === 0"
        class="d-flex flex-column align-center justify-center"
        style="min-height: 320px"
      >
        <v-icon size="64" color="medium-emphasis" class="mb-4">mdi-text-box-outline</v-icon>
        <p class="text-h6 text-medium-emphasis">Nenhum template de prompt</p>
        <p class="text-body-2 text-medium-emphasis mb-6">
          Crie templates de prompt para guiar a geração da documentação
        </p>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">
          Novo Template
        </v-btn>
      </div>

      <!-- ── Lista de templates ──────────────────────── -->
      <v-card
        v-else
        v-for="t in templates"
        :key="t.id"
        variant="outlined"
        rounded="lg"
        class="mb-4"
      >
        <!-- Cabeçalho do card -->
        <v-card-text class="pb-2">
          <div class="d-flex align-center justify-space-between flex-wrap ga-2">
            <div class="d-flex align-center ga-2 flex-wrap">
              <span class="text-subtitle-1 font-weight-medium">{{ t.name }}</span>
              <v-chip
                v-if="t.is_active"
                color="success"
                variant="flat"
                size="small"
                prepend-icon="mdi-check-circle"
              >
                Ativo
              </v-chip>
              <span class="text-caption text-medium-emphasis">{{ formatDate(t.created_at) }}</span>
            </div>
            <div class="d-flex align-center ga-1 flex-shrink-0">
              <v-btn
                v-if="!t.is_active"
                size="small"
                variant="tonal"
                color="warning"
                prepend-icon="mdi-star-outline"
                @click="activate(t)"
              >
                Ativar
              </v-btn>
              <v-tooltip text="Editar" location="top">
                <template #activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon="mdi-pencil-outline"
                    variant="text"
                    size="small"
                    @click="openEdit(t)"
                  />
                </template>
              </v-tooltip>
              <v-tooltip text="Excluir" location="top">
                <template #activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon="mdi-trash-can-outline"
                    variant="text"
                    size="small"
                    color="error"
                    @click="delTemplate.target = t; delTemplate.error = ''; delTemplate.show = true"
                  />
                </template>
              </v-tooltip>
            </div>
          </div>
        </v-card-text>

        <!-- Preview do conteúdo -->
        <v-card-text class="pt-0">
          <div class="prompt-preview pa-3 rounded">
            <pre class="prompt-pre">{{ preview(t.content) }}</pre>
          </div>
          <p class="text-caption text-right text-medium-emphasis mt-1">
            {{ t.content.length.toLocaleString('pt-BR') }} caracteres
          </p>
        </v-card-text>
      </v-card>

    </div>
  </v-container>

  <!-- ────────────────────────────────────────────────── -->
  <!-- Dialog: criar / editar template                    -->
  <!-- ────────────────────────────────────────────────── -->
  <v-dialog v-model="templateDialog.show" max-width="900" persistent>
    <v-card rounded="lg">
      <v-card-title class="pt-5 px-6">
        {{ templateDialog.editing ? 'Editar Template' : 'Novo Template' }}
      </v-card-title>

      <v-card-text class="px-6 pb-2">
        <v-alert
          v-if="templateDialog.error"
          type="error" variant="tonal" density="compact" class="mb-4"
        >
          {{ templateDialog.error }}
        </v-alert>

        <v-row dense>
          <v-col cols="12" sm="8">
            <v-text-field
              v-model="templateDialog.form.name"
              label="Nome *"
              placeholder="Ex: padrao-v2"
              variant="outlined"
              density="comfortable"
              :disabled="templateDialog.saving"
              autofocus
            />
          </v-col>
          <v-col cols="12" sm="4" class="d-flex align-center">
            <v-switch
              v-model="templateDialog.form.is_active"
              label="Ativar imediatamente"
              color="primary"
              inset
              density="comfortable"
              hide-details
              :disabled="templateDialog.saving"
            />
          </v-col>
          <v-col v-if="templateDialog.form.is_active" cols="12">
            <v-alert type="info" variant="tonal" density="compact">
              Ativar este template desativará automaticamente o template ativo atual.
            </v-alert>
          </v-col>
          <v-col cols="12">
            <v-textarea
              v-model="templateDialog.form.content"
              label="Conteúdo do prompt *"
              variant="outlined"
              rows="16"
              auto-grow
              :disabled="templateDialog.saving"
              style="font-family: monospace; font-size: 13px"
            />
          </v-col>
          <v-col cols="12">
            <p class="text-caption text-medium-emphasis mb-1">Placeholders disponíveis:</p>
            <v-chip
              v-for="p in PLACEHOLDERS"
              :key="p"
              size="x-small"
              variant="outlined"
              class="mr-1 mb-1 font-monospace"
            >
              {{ p }}
            </v-chip>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions class="px-6 pb-5 justify-end ga-2">
        <v-btn variant="text" :disabled="templateDialog.saving" @click="templateDialog.show = false">
          Cancelar
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="templateDialog.saving"
          :disabled="!templateDialog.form.name.trim() || !templateDialog.form.content.trim()"
          @click="save"
        >
          {{ templateDialog.editing ? 'Salvar' : 'Criar' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ────────────────────────────────────────────────── -->
  <!-- Confirm: excluir template                          -->
  <!-- ────────────────────────────────────────────────── -->
  <v-dialog v-model="delTemplate.show" max-width="500">
    <v-card rounded="lg">
      <v-card-title class="pt-5 px-6">Excluir Template</v-card-title>
      <v-card-text class="px-6">
        <v-alert
          v-if="delTemplate.error"
          type="error" variant="tonal" density="compact" class="mb-3"
        >
          {{ delTemplate.error }}
        </v-alert>
        <template v-else>
          <p>
            Tem certeza que deseja excluir o template
            <strong>{{ delTemplate.target?.name }}</strong>?
          </p>
          <v-alert
            v-if="delTemplate.target?.is_active"
            type="warning" variant="tonal" density="compact" class="mt-3"
          >
            Este é o template ativo. Ative outro template antes de excluí-lo.
          </v-alert>
        </template>
      </v-card-text>
      <v-card-actions class="px-6 pb-5 justify-end ga-2">
        <v-btn variant="text" :disabled="delTemplate.saving" @click="delTemplate.show = false">
          Cancelar
        </v-btn>
        <v-btn
          color="error"
          variant="tonal"
          :loading="delTemplate.saving"
          @click="confirmDelete"
        >
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

.prompt-preview {
  background: rgba(0, 0, 0, 0.04);
  max-height: 120px;
  overflow: hidden;
}

.prompt-pre {
  font-family: monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
  line-height: 1.5;
}
</style>
