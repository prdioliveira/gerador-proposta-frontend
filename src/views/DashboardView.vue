<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import * as api from '../services/api'
import type { OutcomeSummary } from '../types/outcomes'
import type { ProjectSummary } from '../types'

const loading = ref(false)
const error = ref('')
const summary = ref<OutcomeSummary | null>(null)
const projects = ref<ProjectSummary[]>([])

// Distribuição de propostas COM desfecho registrado (unidade: proposta)
const DECISION_SEGMENTS = [
  { value: 'approved',    label: 'Aprovadas',      color: 'success' },
  { value: 'negotiating', label: 'Em negociação',  color: 'warning' },
  { value: 'lost',        label: 'Perdidas',       color: 'error' },
] as const

const decisionTotal = computed(() => {
  if (!summary.value) return 0
  const s = summary.value.by_status
  return s.approved + s.negotiating + s.lost
})

const decisionSegments = computed(() => {
  const total = decisionTotal.value
  if (!summary.value || total === 0) return []
  return DECISION_SEGMENTS.map((seg) => ({
    ...seg,
    count: summary.value!.by_status[seg.value],
    pct: (summary.value!.by_status[seg.value] / total) * 100,
  }))
})

// Cobertura: quantos projetos ja tem ao menos uma proposta com desfecho registrado
const totalProjects = computed(() => summary.value?.total ?? 0)
const pendingProjects = computed(() => summary.value?.by_status.pending ?? 0)
const coveredProjects = computed(() => Math.max(totalProjects.value - pendingProjects.value, 0))
const coveragePct = computed(() =>
  totalProjects.value > 0 ? (coveredProjects.value / totalProjects.value) * 100 : 0
)

const conversionPct = computed(() => summary.value?.conversion_rate ? summary.value.conversion_rate * 100 : 0)
const conversionLabel = computed(() => {
  if (!summary.value || summary.value.conversion_rate === null) return '—'
  return Math.round(conversionPct.value) + '%'
})

const conversionCaption = computed(() => {
  if (!summary.value || summary.value.decided === 0) {
    return 'Nenhuma proposta com desfecho de ganha/perdida registrado ainda.'
  }
  const approved = summary.value.by_status.approved
  return `${approved} de ${summary.value.decided} propostas decididas`
})

function currency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [summaryData, projectsData] = await Promise.all([
      api.getOutcomeSummary(),
      api.listProjects(),
    ])
    summary.value = summaryData
    // A API retorna { projects: [...] }, nao um array direto (ver stores/projects.ts)
    const wrapped = projectsData as unknown as { projects?: ProjectSummary[] }
    projects.value = wrapped.projects ?? (projectsData as unknown as ProjectSummary[])
  } catch {
    error.value = 'Não foi possível carregar os indicadores.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <v-container fluid class="pa-6">
    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-4">{{ error }}</v-alert>

    <div v-if="loading" class="d-flex justify-center py-10">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <template v-else-if="summary">
      <!-- Anéis: conversão + cobertura de desfecho -->
      <v-row dense class="mb-2">
        <v-col cols="12" sm="6">
          <v-card elevation="3" rounded="xl" class="pa-6 h-100">
            <v-row align="center" no-gutters>
              <v-col cols="auto">
                <v-progress-circular
                  :model-value="conversionPct"
                  :size="112"
                  :width="12"
                  color="primary"
                  bg-color="surface-variant"
                >
                  <span class="text-h5 font-weight-bold">{{ conversionLabel }}</span>
                </v-progress-circular>
              </v-col>
              <v-col class="pl-6">
                <div class="text-subtitle-1 font-weight-medium mb-1">Taxa de conversão de propostas</div>
                <div class="text-body-2 text-medium-emphasis">{{ conversionCaption }}</div>
              </v-col>
            </v-row>
          </v-card>
        </v-col>

        <v-col cols="12" sm="6">
          <v-card elevation="3" rounded="xl" class="pa-6 h-100">
            <v-row align="center" no-gutters>
              <v-col cols="auto">
                <v-progress-circular
                  :model-value="coveragePct"
                  :size="112"
                  :width="12"
                  color="info"
                  bg-color="surface-variant"
                >
                  <span class="text-h6 font-weight-bold">{{ coveredProjects }}/{{ totalProjects }}</span>
                </v-progress-circular>
              </v-col>
              <v-col class="pl-6">
                <div class="text-subtitle-1 font-weight-medium mb-1">Cobertura de desfecho</div>
                <div class="text-body-2 text-medium-emphasis">
                  Projetos com ao menos uma proposta decidida
                </div>
              </v-col>
            </v-row>
          </v-card>
        </v-col>
      </v-row>

      <!-- Distribuição das propostas decididas -->
      <v-card elevation="3" rounded="xl" class="pa-6 mb-2">
        <v-card-title class="px-0 pt-0 text-subtitle-1">Distribuição das propostas com desfecho</v-card-title>

        <v-alert
          v-if="decisionSegments.length === 0"
          type="info" variant="tonal" density="compact"
        >
          Nenhuma proposta aprovada, perdida ou em negociação registrada ainda.
        </v-alert>

        <div v-else>
          <div v-for="seg in decisionSegments" :key="seg.value" class="mb-3">
            <div class="d-flex justify-space-between mb-1">
              <span class="text-body-2">{{ seg.label }}</span>
              <span class="text-body-2 font-weight-medium">{{ seg.count }}</span>
            </div>
            <v-progress-linear
              :model-value="seg.pct"
              :color="seg.color"
              height="10"
              rounded
              bg-color="surface-variant"
            />
          </div>
        </div>
      </v-card>

      <!-- KPIs de apoio -->
      <v-row dense>
        <v-col cols="12" sm="4">
          <v-card variant="tonal" color="warning" elevation="3" rounded="lg" class="pa-4 h-100">
            <div class="d-flex align-center ga-2 mb-2">
              <v-icon size="20">mdi-clock-outline</v-icon>
              <span class="text-caption">Aguardando desfecho</span>
            </div>
            <div class="text-h4 font-weight-bold">{{ pendingProjects }}</div>
            <div class="text-caption text-medium-emphasis mt-1">projetos sem nenhuma proposta decidida</div>
          </v-card>
        </v-col>
        <v-col cols="12" sm="4">
          <v-card variant="tonal" color="success" elevation="3" rounded="lg" class="pa-4 h-100">
            <div class="d-flex align-center ga-2 mb-2">
              <v-icon size="20">mdi-cash-multiple</v-icon>
              <span class="text-caption">Valor aprovado</span>
            </div>
            <div class="text-h4 font-weight-bold">{{ currency(summary.approved_contract_value) }}</div>
          </v-card>
        </v-col>
        <v-col cols="12" sm="4">
          <v-card variant="tonal" color="primary" elevation="3" rounded="lg" class="pa-4 h-100">
            <div class="d-flex align-center ga-2 mb-2">
              <v-icon size="20">mdi-folder-multiple-outline</v-icon>
              <span class="text-caption">Projetos cadastrados</span>
            </div>
            <div class="text-h4 font-weight-bold">{{ projects.length }}</div>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>
