<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import * as api from '../services/api'
import type { ProposalOutcome, OutcomeStatus } from '../types/outcomes'

const props = defineProps<{
  client: string
  project: string
  saidaFiles: { name: string }[]
}>()

const outcomes  = ref<ProposalOutcome[]>([])
const loading   = ref(false)
const error     = ref('')
const showForm  = ref(false)
const saving    = ref(false)
const deleting  = ref<number | null>(null)

const STATUS_OPTIONS: { value: OutcomeStatus; title: string; color: string; icon: string }[] = [
  { value: 'pending',      title: 'Pendente',        color: 'default',  icon: 'mdi-clock-outline'         },
  { value: 'negotiating',  title: 'Em negociação',   color: 'warning',  icon: 'mdi-handshake-outline'      },
  { value: 'approved',     title: 'Aprovada',        color: 'success',  icon: 'mdi-check-circle-outline'   },
  { value: 'lost',         title: 'Perdida',         color: 'error',    icon: 'mdi-close-circle-outline'   },
]

const statusMap = Object.fromEntries(STATUS_OPTIONS.map((s) => [s.value, s]))

const proposalFiles = computed(() =>
  props.saidaFiles
    .filter((f) => f.name.toLowerCase().startsWith('proposta_') && f.name.toLowerCase().endsWith('.pptx'))
    .map((f) => f.name)
)

// Form state
const form = ref({
  proposal_filename: '',
  status: 'pending' as OutcomeStatus,
  estimated_hours: null as number | null,
  actual_hours: null as number | null,
  contract_value: null as number | null,
  external_project_id: null as string | null,
  notes: null as string | null,
})
const editingId = ref<number | null>(null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    outcomes.value = await api.listOutcomes(props.client, props.project)
  } catch {
    error.value = 'Erro ao carregar desfechos.'
  } finally {
    loading.value = false
  }
}

function openNew() {
  editingId.value = null
  form.value = {
    proposal_filename: proposalFiles.value[0] ?? '',
    status: 'pending',
    estimated_hours: null,
    actual_hours: null,
    contract_value: null,
    external_project_id: null,
    notes: null,
  }
  showForm.value = true
}

function openEdit(o: ProposalOutcome) {
  editingId.value = o.id
  form.value = {
    proposal_filename: o.proposal_filename,
    status: o.status,
    estimated_hours: o.estimated_hours,
    actual_hours: o.actual_hours,
    contract_value: o.contract_value,
    external_project_id: o.external_project_id,
    notes: o.notes,
  }
  showForm.value = true
}

async function save() {
  if (!form.value.proposal_filename) return
  saving.value = true
  error.value = ''
  try {
    if (editingId.value !== null) {
      await api.updateOutcome(editingId.value, {
        status: form.value.status,
        estimated_hours: form.value.estimated_hours,
        actual_hours: form.value.actual_hours,
        contract_value: form.value.contract_value,
        external_project_id: form.value.external_project_id || null,
        notes: form.value.notes || null,
      })
    } else {
      await api.createOutcome({
        client: props.client,
        project: props.project,
        proposal_filename: form.value.proposal_filename,
        status: form.value.status,
        estimated_hours: form.value.estimated_hours,
        actual_hours: form.value.actual_hours,
        contract_value: form.value.contract_value,
        external_project_id: form.value.external_project_id || null,
        notes: form.value.notes || null,
      })
    }
    showForm.value = false
    await load()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } }
    error.value = err.response?.data?.error ?? 'Erro ao salvar.'
  } finally {
    saving.value = false
  }
}

async function remove(id: number) {
  deleting.value = id
  try {
    await api.deleteOutcome(id)
    await load()
  } finally {
    deleting.value = null
  }
}

function fmt(val: number | null, prefix = '') {
  if (val === null) return '—'
  return prefix + val.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

onMounted(load)
</script>

<template>
  <div>
    <!-- Cabeçalho -->
    <div class="d-flex align-center justify-space-between mb-4">
      <div>
        <div class="text-subtitle-1 font-weight-medium">Desfecho das Propostas</div>
        <div class="text-caption text-medium-emphasis">Registre o resultado de cada proposta gerada.</div>
      </div>
      <v-btn
        color="primary"
        variant="tonal"
        prepend-icon="mdi-plus"
        size="small"
        :disabled="proposalFiles.length === 0"
        @click="openNew"
      >
        Registrar
      </v-btn>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-3">{{ error }}</v-alert>

    <!-- Sem propostas geradas -->
    <v-alert
      v-if="proposalFiles.length === 0 && !loading"
      type="info"
      variant="tonal"
      density="compact"
      class="mb-3"
    >
      Nenhuma proposta (.pptx) gerada ainda. Gere uma proposta primeiro.
    </v-alert>

    <!-- Loading -->
    <div v-if="loading" class="d-flex justify-center py-6">
      <v-progress-circular indeterminate color="primary" size="24" />
    </div>

    <!-- Lista vazia -->
    <v-card v-else-if="outcomes.length === 0 && proposalFiles.length > 0" variant="outlined" rounded="lg" class="pa-6 text-center text-medium-emphasis">
      <v-icon size="32" class="mb-2">mdi-chart-timeline-variant</v-icon>
      <div class="text-body-2">Nenhum desfecho registrado.</div>
    </v-card>

    <!-- Lista de desfechos -->
    <v-card v-for="o in outcomes" :key="o.id" variant="outlined" rounded="lg" class="mb-3 pa-4">
      <div class="d-flex align-start justify-space-between ga-2 flex-wrap">
        <div class="flex-grow-1">
          <!-- Arquivo + status -->
          <div class="d-flex align-center ga-2 flex-wrap mb-2">
            <v-chip
              :color="statusMap[o.status]?.color"
              :prepend-icon="statusMap[o.status]?.icon"
              size="small"
              variant="tonal"
            >
              {{ statusMap[o.status]?.title ?? o.status }}
            </v-chip>
            <span class="text-body-2 text-medium-emphasis font-weight-medium">{{ o.proposal_filename }}</span>
          </div>

          <!-- Métricas -->
          <div class="d-flex ga-4 flex-wrap">
            <div v-if="o.estimated_hours !== null" class="text-caption">
              <span class="text-medium-emphasis">Horas estimadas:</span>
              <strong class="ml-1">{{ fmt(o.estimated_hours) }}h</strong>
            </div>
            <div v-if="o.actual_hours !== null" class="text-caption">
              <span class="text-medium-emphasis">Horas reais:</span>
              <strong class="ml-1">{{ fmt(o.actual_hours) }}h</strong>
            </div>
            <div v-if="o.contract_value !== null" class="text-caption">
              <span class="text-medium-emphasis">Valor:</span>
              <strong class="ml-1">R$ {{ fmt(o.contract_value) }}</strong>
            </div>
            <div v-if="o.external_project_id" class="text-caption">
              <span class="text-medium-emphasis">ID externo:</span>
              <strong class="ml-1">{{ o.external_project_id }}</strong>
            </div>
          </div>

          <div v-if="o.notes" class="text-caption text-medium-emphasis mt-1">{{ o.notes }}</div>
        </div>

        <!-- Ações -->
        <div class="d-flex ga-1">
          <v-btn icon="mdi-pencil-outline" variant="text" size="small" @click="openEdit(o)" />
          <v-btn
            icon="mdi-trash-can-outline"
            variant="text"
            size="small"
            color="error"
            :loading="deleting === o.id"
            @click="remove(o.id)"
          />
        </div>
      </div>
    </v-card>

    <!-- Diálogo de formulário -->
    <v-dialog v-model="showForm" max-width="600" persistent>
      <v-card rounded="lg">
        <v-card-title class="pa-4 pb-0">
          {{ editingId !== null ? 'Editar desfecho' : 'Registrar desfecho' }}
        </v-card-title>

        <v-card-text class="pa-4">
          <v-autocomplete
            v-model="form.proposal_filename"
            label="Proposta"
            :items="proposalFiles"
            variant="outlined"
            density="comfortable"
            :disabled="editingId !== null"
            auto-select-first
            class="mb-2"
          />

          <v-autocomplete
            v-model="form.status"
            label="Status"
            :items="STATUS_OPTIONS"
            item-value="value"
            item-title="title"
            variant="outlined"
            density="comfortable"
            auto-select-first
            class="mb-2"
          />

          <v-row dense class="mb-2">
            <v-col cols="6">
              <v-text-field
                v-model.number="form.estimated_hours"
                label="Horas estimadas"
                type="number"
                variant="outlined"
                density="comfortable"
                suffix="h"
                clearable
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model.number="form.actual_hours"
                label="Horas reais"
                type="number"
                variant="outlined"
                density="comfortable"
                suffix="h"
                clearable
              />
            </v-col>
          </v-row>

          <v-text-field
            v-model.number="form.contract_value"
            label="Valor contratado"
            type="number"
            variant="outlined"
            density="comfortable"
            prefix="R$"
            clearable
            class="mb-2"
          />

          <v-text-field
            v-model="form.external_project_id"
            label="ID no sistema interno (opcional)"
            variant="outlined"
            density="comfortable"
            class="mb-2"
          />

          <v-textarea
            v-model="form.notes"
            label="Observações (opcional)"
            variant="outlined"
            density="comfortable"
            rows="3"
            hide-details
          />
        </v-card-text>

        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" :disabled="saving" @click="showForm = false">Cancelar</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="saving"
            :disabled="!form.proposal_filename"
            @click="save"
          >
            Salvar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
