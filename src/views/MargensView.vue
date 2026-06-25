<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import * as api from '../services/api'
import type { MarginAdminResponse } from '../types'

// ── State ──────────────────────────────────────────────
const margins   = ref<MarginAdminResponse[]>([])
const loading   = ref(true)
const loadError = ref('')

// ── Margin dialog ──────────────────────────────────────
const marginDialog = reactive({
  show:    false,
  editing: null as MarginAdminResponse | null,
  form:    { key: '', label: '', percent: '' },
  saving:  false,
  error:   '',
})

// ── Delete dialog ──────────────────────────────────────
const delMargin = reactive({
  show:   false,
  target: null as MarginAdminResponse | null,
  saving: false,
  error:  '',
})

// ── Helpers ────────────────────────────────────────────
function apiErr(e: unknown): string {
  const r = (e as { response?: { data?: { detail?: string; error?: string } } }).response?.data
  return r?.detail ?? r?.error ?? 'Ocorreu um erro inesperado'
}

// ── Load ───────────────────────────────────────────────
async function load() {
  loading.value   = true
  loadError.value = ''
  try {
    margins.value = await api.listMarginsAdmin()
  } catch (e) {
    loadError.value = apiErr(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)

// ── CRUD ───────────────────────────────────────────────
function openCreate() {
  marginDialog.editing = null
  marginDialog.form    = { key: '', label: '', percent: '' }
  marginDialog.error   = ''
  marginDialog.show    = true
}

function openEdit(m: MarginAdminResponse) {
  marginDialog.editing = m
  marginDialog.form    = { key: m.key, label: m.label, percent: String(m.percent) }
  marginDialog.error   = ''
  marginDialog.show    = true
}

function sanitizeKey(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

async function save() {
  marginDialog.saving = true
  marginDialog.error  = ''
  try {
    const { key, label, percent } = marginDialog.form
    if (marginDialog.editing) {
      const updated = await api.updateMargin(marginDialog.editing.id, {
        label,
        percent: Number(percent),
      })
      const idx = margins.value.findIndex((m) => m.id === marginDialog.editing!.id)
      if (idx !== -1) margins.value[idx] = updated
    } else {
      const created = await api.createMargin({ key, label, percent: Number(percent) })
      margins.value.push(created)
    }
    marginDialog.show = false
  } catch (e) {
    marginDialog.error = apiErr(e)
  } finally {
    marginDialog.saving = false
  }
}

async function confirmDelete() {
  if (!delMargin.target) return
  delMargin.saving = true
  delMargin.error  = ''
  try {
    await api.deleteMargin(delMargin.target.id)
    margins.value = margins.value.filter((m) => m.id !== delMargin.target!.id)
    delMargin.show = false
  } catch (e) {
    delMargin.error = apiErr(e)
  } finally {
    delMargin.saving = false
  }
}
</script>

<template>
  <v-container fluid class="pa-6">
    <div style="max-width: 600px; margin: 0 auto">

      <!-- ── Cabeçalho ──────────────────────────────── -->
      <div class="d-flex align-center justify-space-between mb-6">
        <div>
          <h1 class="text-h5 font-weight-bold">Margens de Lucro</h1>
          <p class="text-body-2 text-medium-emphasis mt-1">
            Percentuais aplicados ao custo total na geração de propostas
          </p>
        </div>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">
          Nova Margem
        </v-btn>
      </div>

      <!-- ── Carregamento ────────────────────────────── -->
      <template v-if="loading">
        <v-skeleton-loader v-for="n in 3" :key="n" type="list-item-two-line" class="mb-3 rounded-lg" />
      </template>

      <v-alert v-else-if="loadError" type="error" variant="tonal" class="mb-4">
        {{ loadError }}
      </v-alert>

      <!-- ── Estado vazio ────────────────────────────── -->
      <div
        v-else-if="margins.length === 0"
        class="d-flex flex-column align-center justify-center"
        style="min-height: 280px"
      >
        <v-icon size="64" color="medium-emphasis" class="mb-4">mdi-percent-outline</v-icon>
        <p class="text-h6 text-medium-emphasis">Nenhuma margem configurada</p>
        <p class="text-body-2 text-medium-emphasis mb-6">
          Adicione percentuais de margem para uso na geração de propostas
        </p>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">
          Nova Margem
        </v-btn>
      </div>

      <!-- ── Lista de margens ────────────────────────── -->
      <template v-else>
        <v-card
          v-for="margin in margins"
          :key="margin.id"
          variant="outlined"
          rounded="lg"
          class="mb-3"
        >
          <v-card-text class="pa-4">
            <div class="d-flex align-center justify-space-between">
              <div class="d-flex align-center ga-3 flex-wrap">
                <v-chip
                  variant="tonal"
                  color="primary"
                  size="small"
                  class="font-monospace"
                >
                  {{ margin.key }}
                </v-chip>
                <span class="text-body-1 font-weight-medium">{{ margin.label }}</span>
                <v-chip color="success" variant="flat" size="small">
                  {{ margin.percent }}%
                </v-chip>
              </div>
              <div class="d-flex ga-1 flex-shrink-0">
                <v-tooltip text="Editar" location="top">
                  <template #activator="{ props }">
                    <v-btn
                      v-bind="props"
                      icon="mdi-pencil-outline"
                      variant="text"
                      size="small"
                      @click="openEdit(margin)"
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
                      @click="delMargin.target = margin; delMargin.error = ''; delMargin.show = true"
                    />
                  </template>
                </v-tooltip>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </template>

    </div>
  </v-container>

  <!-- ────────────────────────────────────────────────── -->
  <!-- Dialog: criar margem                               -->
  <!-- ────────────────────────────────────────────────── -->
  <v-dialog v-model="marginDialog.show" max-width="560" persistent>
    <v-card rounded="lg">
      <v-card-title class="pt-5 px-6">
        {{ marginDialog.editing ? 'Editar Margem' : 'Nova Margem' }}
      </v-card-title>

      <v-card-text class="px-6 pb-2">
        <v-alert
          v-if="marginDialog.error"
          type="error" variant="tonal" density="compact" class="mb-4"
        >
          {{ marginDialog.error }}
        </v-alert>

        <v-row dense>
          <!-- Chave — somente na criação -->
          <v-col v-if="!marginDialog.editing" cols="12">
            <v-text-field
              :model-value="marginDialog.form.key"
              label="Chave (key) *"
              placeholder="Ex: alta"
              variant="outlined"
              density="comfortable"
              hint="Identificador único — apenas letras minúsculas e hífens"
              persistent-hint
              :disabled="marginDialog.saving"
              autofocus
              @update:model-value="marginDialog.form.key = sanitizeKey($event)"
            />
          </v-col>
          <!-- Chave em modo edição — somente leitura -->
          <v-col v-else cols="12">
            <v-chip variant="tonal" color="primary" class="font-monospace mb-2">
              {{ marginDialog.form.key }}
            </v-chip>
            <p class="text-caption text-medium-emphasis">
              A chave não pode ser alterada após a criação.
            </p>
          </v-col>

          <v-col cols="12">
            <v-text-field
              v-model="marginDialog.form.label"
              label="Rótulo *"
              placeholder="Ex: Alta"
              variant="outlined"
              density="comfortable"
              :disabled="marginDialog.saving"
              :autofocus="!!marginDialog.editing"
            />
          </v-col>
          <v-col cols="12">
            <v-text-field
              v-model="marginDialog.form.percent"
              label="Percentual (%) *"
              type="number"
              min="0"
              max="100"
              step="0.01"
              suffix="%"
              variant="outlined"
              density="comfortable"
              :disabled="marginDialog.saving"
            />
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions class="px-6 pb-5 justify-end ga-2">
        <v-btn variant="text" :disabled="marginDialog.saving" @click="marginDialog.show = false">
          Cancelar
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="marginDialog.saving"
          :disabled="
            (!marginDialog.editing && !marginDialog.form.key.trim()) ||
            !marginDialog.form.label.trim() ||
            !marginDialog.form.percent
          "
          @click="save"
        >
          {{ marginDialog.editing ? 'Salvar' : 'Criar' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ────────────────────────────────────────────────── -->
  <!-- Confirm: excluir margem                            -->
  <!-- ────────────────────────────────────────────────── -->
  <v-dialog v-model="delMargin.show" max-width="500">
    <v-card rounded="lg">
      <v-card-title class="pt-5 px-6">Excluir Margem</v-card-title>
      <v-card-text class="px-6">
        <v-alert
          v-if="delMargin.error"
          type="error" variant="tonal" density="compact" class="mb-3"
        >
          {{ delMargin.error }}
        </v-alert>
        <template v-else>
          Tem certeza que deseja excluir a margem
          <strong>{{ delMargin.target?.label }}</strong>
          ({{ delMargin.target?.percent }}%)?
        </template>
      </v-card-text>
      <v-card-actions class="px-6 pb-5 justify-end ga-2">
        <v-btn variant="text" :disabled="delMargin.saving" @click="delMargin.show = false">
          Cancelar
        </v-btn>
        <v-btn color="error" variant="tonal" :loading="delMargin.saving" @click="confirmDelete">
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
