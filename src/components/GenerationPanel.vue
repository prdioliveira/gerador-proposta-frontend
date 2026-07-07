<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import * as api from '../services/api'
import { fetchFileText } from '../services/files'
import type { JobStep, ProjectFile } from '../types'
import { useJobPoller } from '../composables/useJobPoller'
import JobStatusBadge from './JobStatusBadge.vue'

marked.setOptions({ breaks: true })

const props = defineProps<{
  client: string
  project: string
  hasInput: boolean
  saidaFiles: ProjectFile[]
}>()

const emit = defineEmits<{ filesChanged: [] }>()

const doc      = useJobPoller()
const proposal = useJobPoller()
const snackbar = ref({ show: false, message: '', color: 'success' })

const canCancelDoc = computed(() =>
  doc.job.value ? ['pending', 'running'].includes(doc.job.value.status) : false
)

const canCancelProposal = computed(() =>
  proposal.job.value ? ['pending', 'running'].includes(proposal.job.value.status) : false
)

const hasScopeDocument = computed(() =>
  props.saidaFiles.some(
    (f) => f.name.toLowerCase().startsWith('documento_escopo_') && f.name.toLowerCase().endsWith('.md')
  )
)

function sortDesc(files: ProjectFile[]): ProjectFile[] {
  return [...files].sort((a, b) => {
    const ta = a.modifiedTime ? new Date(a.modifiedTime).getTime() : 0
    const tb = b.modifiedTime ? new Date(b.modifiedTime).getTime() : 0
    return tb !== ta ? tb - ta : b.name.localeCompare(a.name)
  })
}

const docFiles = computed(() =>
  sortDesc(
    props.saidaFiles.filter(
      (f) => f.name.toLowerCase().startsWith('documento_escopo_') && f.name.toLowerCase().endsWith('.md')
    )
  )
)

const proposalFiles = computed(() =>
  sortDesc(
    props.saidaFiles.filter(
      (f) => f.name.toLowerCase().startsWith('proposta_') && f.name.toLowerCase().endsWith('.pptx')
    )
  )
)

function extractVersion(name: string): string {
  const match = name.match(/-V-(\d+)\./i)
  return match ? `v${match[1]}` : ''
}

function formatDate(raw?: string): string {
  if (!raw) return '—'
  const d = new Date(raw)
  if (isNaN(d.getTime())) return raw
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function notify(message: string, color: 'success' | 'error' | 'warning' = 'success') {
  snackbar.value = { show: true, message, color }
}

function downloadFile(filename: string) {
  api.downloadFile(props.client, props.project, filename)
}

function onDocDone(j: { result_filename?: string }) {
  notify(`Documentação gerada com sucesso!${j.result_filename ? ' (' + j.result_filename + ')' : ''}`)
  emit('filesChanged')
}

function onProposalDone(j: { result_filename?: string }) {
  notify(`Proposta gerada com sucesso!${j.result_filename ? ' (' + j.result_filename + ')' : ''}`)
  emit('filesChanged')
}

function onDocCancelled() {
  notify('Geração de documentação interrompida.', 'warning')
}

function onProposalCancelled() {
  notify('Geração de proposta interrompida.', 'warning')
}

function startDoc() {
  doc.start(
    () => api.generateDocumentation(props.client, props.project),
    onDocDone,
    onDocCancelled,
  ).then(() => {
    if (doc.error.value) notify(doc.error.value, 'error')
  })
}

function resumeDoc() {
  doc.resume(onDocDone, onDocCancelled)
}

function stopDoc() {
  doc.cancel()
}

// ── Job steps ──────────────────────────────────────────────────────────────────

const STEP_LABELS: Record<string, string> = {
  extracting_context:          'Analisando fontes',
  generating:                  'Iniciando geração por seção',
  'section:sobre':             'Seção: Sobre o cliente',
  'section:sumario_executivo': 'Seção: Sumário executivo',
  'section:dados_cliente':     'Seção: Dados do cliente',
  'section:contexto_dores':    'Seção: Contexto e dores',
  'section:tipo_proposta':     'Seção: Tipo de proposta',
  'section:objetivo':          'Seção: Objetivo',
  'section:diagrama_as_is':    'Seção: Diagrama AS IS',
  'section:escopo':            'Seção: Escopo e faseamento',
  'section:entregaveis':       'Seção: Entregáveis',
  'section:diagrama_to_be':    'Seção: Diagrama TO BE',
  'section:estimativa':        'Seção: Estimativa de prazo',
  'section:equipe':            'Seção: Equipe proposta',
  'section:investimento':      'Seção: Investimento',
  'section:proximos_passos':   'Seção: Próximos passos',
  'section:premissas':         'Seção: Premissas',
}

function stepLabel(step: string): string {
  if (STEP_LABELS[step]) return STEP_LABELS[step]
  if (step.startsWith('source:transcript:'))
    return `Transcrição: ${step.slice('source:transcript:'.length)}`
  if (step.startsWith('source:document:'))
    return `Documento: ${step.slice('source:document:'.length)}`
  return step
}

function stepIcon(status: JobStep['status']): string {
  if (status === 'done')    return 'mdi-check-circle'
  if (status === 'failed')  return 'mdi-alert-circle'
  if (status === 'running') return 'mdi-loading'
  return 'mdi-circle-outline'
}

function stepColor(status: JobStep['status']): string {
  if (status === 'done')    return 'success'
  if (status === 'failed')  return 'error'
  if (status === 'running') return 'primary'
  return 'medium-emphasis'
}

// ── Markdown Viewer ───────────────────────────────────────────────────────────

const viewer = reactive({
  show: false,
  title: '',
  content: '',
  loading: false,
  error: '',
  truncated: false,
})

async function openViewer(file: ProjectFile) {
  viewer.title = file.name
  viewer.content = ''
  viewer.error = ''
  viewer.truncated = false
  viewer.loading = true
  viewer.show = true
  try {
    const raw = await fetchFileText(props.client, props.project, file.name)
    // Adia o parse para o spinner ter tempo de renderizar antes de bloquear o thread
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    const PREVIEW_LIMIT = 60_000
    const truncated = raw.length > PREVIEW_LIMIT
    const source = truncated ? raw.slice(0, PREVIEW_LIMIT) + '\n\n---\n\n*[Documento truncado para visualização. Baixe o arquivo para ver o conteúdo completo.]*' : raw
    const html = await marked.parse(source)
    viewer.content = DOMPurify.sanitize(html)
    viewer.truncated = truncated
  } catch {
    viewer.error = 'Não foi possível carregar o documento.'
  } finally {
    viewer.loading = false
  }
}

function startProposal() {
  proposal.start(
    () => api.generateProposal(props.client, props.project),
    onProposalDone,
    onProposalCancelled,
  ).then(() => {
    if (proposal.error.value) notify(proposal.error.value, 'error')
  })
}

function resumeProposal() {
  proposal.resume(onProposalDone, onProposalCancelled)
}

function stopProposal() {
  proposal.cancel()
}
</script>

<template>
  <div>
    <!-- Alertas globais -->
    <v-alert v-if="!hasInput" type="warning" variant="tonal" class="mb-4" density="compact">
      Adicione arquivos nas pastas de entrada ou preencha o campo
      <strong>Detalhes / Contexto</strong> nas Informações Complementares antes de gerar.
    </v-alert>

    <!-- Cards de ação -->
    <v-row dense class="mb-6">
      <!-- Documentação -->
      <v-col cols="12" sm="6">
        <v-card variant="outlined" rounded="lg" class="pa-4 h-100">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-subtitle-2 font-weight-medium">
              <v-icon size="16" class="mr-1" color="primary">mdi-language-markdown</v-icon>
              Documentação / Escopo
            </span>
            <JobStatusBadge v-if="doc.job.value" :status="doc.job.value.status" />
          </div>

          <p class="text-body-2 text-medium-emphasis mb-3">
            Gera o documento Markdown com o escopo técnico.
            <strong>Execute antes da proposta.</strong>
          </p>

          <div class="d-flex ga-2">
            <v-btn
              color="primary"
              variant="flat"
              class="flex-grow-1"
              :loading="doc.running.value"
              :disabled="!hasInput || doc.running.value"
              prepend-icon="mdi-play-circle"
              @click="startDoc"
            >
              Gerar Documentação
            </v-btn>
            <v-btn
              v-if="canCancelDoc"
              color="warning"
              variant="tonal"
              :loading="doc.cancelling.value"
              :disabled="doc.cancelling.value"
              prepend-icon="mdi-stop-circle-outline"
              @click="stopDoc"
            >
              Parar
            </v-btn>
          </div>

          <!-- Etapas do job -->
          <div v-if="doc.job.value?.steps?.length" class="mt-3">
            <template
              v-for="step in doc.job.value.steps"
              :key="step.step"
            >
              <div class="d-flex align-center ga-2 mb-1">
                <v-icon
                  :color="stepColor(step.status)"
                  size="16"
                  :class="step.status === 'running' ? 'spin' : ''"
                >
                  {{ stepIcon(step.status) }}
                </v-icon>
                <span class="text-caption" :class="step.status === 'running' ? 'font-weight-medium' : 'text-medium-emphasis'">
                  {{ stepLabel(step.step) }}
                </span>
                <v-chip v-if="step.status === 'failed'" color="error" size="x-small" variant="tonal" class="ml-auto">
                  falhou
                </v-chip>
              </div>
              <div v-if="step.status === 'failed' && step.message" class="d-flex align-start ga-1 mb-2 ml-6">
                <v-icon color="error" size="11" class="mt-1 flex-shrink-0">mdi-alert-circle-outline</v-icon>
                <span class="text-caption text-error" style="word-break: break-word; line-height: 1.4;">{{ step.message }}</span>
              </div>
              <div v-if="step.status === 'done' && step.message" class="d-flex align-start ga-1 mb-2 ml-6">
                <v-icon color="warning" size="11" class="mt-1 flex-shrink-0">mdi-alert-outline</v-icon>
                <span class="text-caption" style="color: rgb(var(--v-theme-warning)); word-break: break-word; line-height: 1.4;">{{ step.message }}</span>
              </div>
            </template>
          </div>

          <v-alert
            v-if="doc.timedOut.value"
            type="warning" variant="tonal" density="compact" class="mt-3"
          >
            <div class="d-flex align-center justify-space-between flex-wrap ga-2">
              <span class="text-body-2">A geração ainda está em andamento no servidor. Aguarde ou verifique novamente.</span>
              <v-btn size="x-small" variant="tonal" color="warning" prepend-icon="mdi-refresh" @click="resumeDoc">
                Verificar
              </v-btn>
            </div>
          </v-alert>

          <template v-if="doc.job.value">
            <v-alert
              v-if="doc.job.value.status === 'error'"
              type="error" variant="tonal" density="compact" class="mt-3"
            >
              <strong>Erro:</strong> {{ doc.job.value.error_message }}
            </v-alert>
            <v-alert
              v-if="doc.job.value.status === 'cancelled'"
              type="warning" variant="tonal" density="compact" class="mt-3"
              icon="mdi-cancel"
            >
              Geração interrompida pelo usuário.
            </v-alert>
            <v-alert
              v-if="doc.job.value.status === 'done'"
              type="success" variant="tonal" density="compact" class="mt-3"
            >
              <div class="d-flex align-center justify-space-between">
                <span>Gerado: <strong>{{ doc.job.value.result_filename }}</strong></span>
                <v-btn
                  v-if="doc.job.value.result_filename"
                  icon="mdi-download" variant="text" size="x-small"
                  @click="downloadFile(doc.job.value!.result_filename!)"
                />
              </div>
            </v-alert>
            <div v-if="doc.job.value.warnings?.length" class="mt-2">
              <v-alert
                v-for="(w, i) in doc.job.value.warnings" :key="i"
                type="warning" variant="tonal" density="compact" class="mb-1 text-body-2"
              >{{ w }}</v-alert>
            </div>
          </template>
        </v-card>
      </v-col>

      <!-- Proposta PPT -->
      <v-col cols="12" sm="6">
        <v-card variant="outlined" rounded="lg" class="pa-4 h-100">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-subtitle-2 font-weight-medium">
              <v-icon size="16" class="mr-1" color="info">mdi-file-powerpoint</v-icon>
              Proposta PPT
            </span>
            <JobStatusBadge v-if="proposal.job.value" :status="proposal.job.value.status" />
          </div>

          <p class="text-body-2 text-medium-emphasis mb-3">
            Gera a apresentação PowerPoint a partir do escopo gerado.
          </p>

          <v-alert
            v-if="!hasScopeDocument"
            type="info" variant="tonal" density="compact" class="mb-3"
            icon="mdi-information-outline"
          >
            Nenhum documento de escopo encontrado. Gere a
            <strong>Documentação/Escopo</strong> primeiro.
          </v-alert>

          <div class="d-flex ga-2">
            <v-btn
              color="info"
              variant="flat"
              class="flex-grow-1"
              :loading="proposal.running.value"
              :disabled="!hasInput || !hasScopeDocument || proposal.running.value"
              prepend-icon="mdi-play-circle"
              @click="startProposal"
            >
              Gerar Proposta
            </v-btn>
            <v-btn
              v-if="canCancelProposal"
              color="warning"
              variant="tonal"
              :loading="proposal.cancelling.value"
              :disabled="proposal.cancelling.value"
              prepend-icon="mdi-stop-circle-outline"
              @click="stopProposal"
            >
              Parar
            </v-btn>
          </div>

          <v-alert
            v-if="proposal.timedOut.value"
            type="warning" variant="tonal" density="compact" class="mt-3"
          >
            <div class="d-flex align-center justify-space-between flex-wrap ga-2">
              <span class="text-body-2">A geração ainda está em andamento no servidor. Aguarde ou verifique novamente.</span>
              <v-btn size="x-small" variant="tonal" color="warning" prepend-icon="mdi-refresh" @click="resumeProposal">
                Verificar
              </v-btn>
            </div>
          </v-alert>

          <template v-if="proposal.job.value">
            <v-alert
              v-if="proposal.job.value.status === 'error'"
              type="error" variant="tonal" density="compact" class="mt-3"
            >
              <strong>Erro:</strong> {{ proposal.job.value.error_message }}
            </v-alert>
            <v-alert
              v-if="proposal.job.value.status === 'cancelled'"
              type="warning" variant="tonal" density="compact" class="mt-3"
              icon="mdi-cancel"
            >
              Geração interrompida pelo usuário.
            </v-alert>
            <v-alert
              v-if="proposal.job.value.status === 'done'"
              type="success" variant="tonal" density="compact" class="mt-3"
            >
              <div class="d-flex align-center justify-space-between">
                <span>Gerado: <strong>{{ proposal.job.value.result_filename }}</strong></span>
                <v-btn
                  v-if="proposal.job.value.result_filename"
                  icon="mdi-download" variant="text" size="x-small"
                  @click="downloadFile(proposal.job.value!.result_filename!)"
                />
              </div>
            </v-alert>
            <div v-if="proposal.job.value.warnings?.length" class="mt-2">
              <v-alert
                v-for="(w, i) in proposal.job.value.warnings" :key="i"
                type="warning" variant="tonal" density="compact" class="mb-1 text-body-2"
              >{{ w }}</v-alert>
            </div>
          </template>
        </v-card>
      </v-col>
    </v-row>

    <!-- Arquivos gerados: duas colunas separadas -->
    <v-row dense>
      <!-- Documentações de Escopo -->
      <v-col cols="12" md="6">
        <v-card variant="outlined" rounded="lg" class="h-100">
          <div class="d-flex align-center ga-2 px-4 pt-4 pb-2">
            <v-icon color="primary" size="18">mdi-language-markdown</v-icon>
            <span class="text-subtitle-2 font-weight-medium">Documentações de Escopo</span>
            <v-chip size="x-small" variant="tonal" color="primary" class="ml-auto">
              {{ docFiles.length }}
            </v-chip>
          </div>
          <v-divider />

          <div v-if="docFiles.length === 0" class="py-8 text-center">
            <v-icon size="40" color="medium-emphasis" class="mb-2">mdi-file-document-outline</v-icon>
            <p class="text-body-2 text-medium-emphasis">Nenhuma documentação gerada ainda</p>
          </div>

          <v-list v-else lines="two" class="py-0">
            <template v-for="(file, i) in docFiles" :key="file.id">
              <v-divider v-if="i > 0" />
              <v-list-item>
                <template #prepend>
                  <v-icon color="primary" size="20" class="mr-1">mdi-language-markdown</v-icon>
                </template>

                <v-list-item-title class="text-body-2 font-weight-medium">
                  <span class="file-name">{{ file.name }}</span>
                </v-list-item-title>
                <v-list-item-subtitle>
                  <div class="d-flex align-center ga-1 mt-1">
                    <v-icon size="11">mdi-clock-outline</v-icon>
                    <span class="text-caption">{{ formatDate(file.modifiedTime) }}</span>
                  </div>
                </v-list-item-subtitle>

                <template #append>
                  <div class="d-flex align-center ga-1 ml-2">
                    <v-chip v-if="i === 0" size="x-small" color="primary" variant="tonal">
                      Mais recente
                    </v-chip>
                    <v-chip v-else-if="extractVersion(file.name)" size="x-small" variant="outlined">
                      {{ extractVersion(file.name) }}
                    </v-chip>
                    <v-btn
                      icon="mdi-eye-outline"
                      variant="text"
                      size="x-small"
                      color="primary"
                      title="Visualizar"
                      @click="openViewer(file)"
                    />
                    <v-btn
                      icon="mdi-download"
                      variant="text"
                      size="x-small"
                      color="primary"
                      @click="downloadFile(file.name)"
                    />
                  </div>
                </template>
              </v-list-item>
            </template>
          </v-list>
        </v-card>
      </v-col>

      <!-- Propostas PPT -->
      <v-col cols="12" md="6">
        <v-card variant="outlined" rounded="lg" class="h-100">
          <div class="d-flex align-center ga-2 px-4 pt-4 pb-2">
            <v-icon color="info" size="18">mdi-file-powerpoint</v-icon>
            <span class="text-subtitle-2 font-weight-medium">Propostas PPT</span>
            <v-chip size="x-small" variant="tonal" color="info" class="ml-auto">
              {{ proposalFiles.length }}
            </v-chip>
          </div>
          <v-divider />

          <div v-if="proposalFiles.length === 0" class="py-8 text-center">
            <v-icon size="40" color="medium-emphasis" class="mb-2">mdi-file-powerpoint-outline</v-icon>
            <p class="text-body-2 text-medium-emphasis">Nenhuma proposta gerada ainda</p>
          </div>

          <v-list v-else lines="two" class="py-0">
            <template v-for="(file, i) in proposalFiles" :key="file.id">
              <v-divider v-if="i > 0" />
              <v-list-item>
                <template #prepend>
                  <v-icon color="info" size="20" class="mr-1">mdi-file-powerpoint</v-icon>
                </template>

                <v-list-item-title class="text-body-2 font-weight-medium">
                  <span class="file-name">{{ file.name }}</span>
                </v-list-item-title>
                <v-list-item-subtitle>
                  <div class="d-flex align-center ga-1 mt-1">
                    <v-icon size="11">mdi-clock-outline</v-icon>
                    <span class="text-caption">{{ formatDate(file.modifiedTime) }}</span>
                  </div>
                </v-list-item-subtitle>

                <template #append>
                  <div class="d-flex align-center ga-1 ml-2">
                    <v-chip v-if="i === 0" size="x-small" color="info" variant="tonal">
                      Mais recente
                    </v-chip>
                    <v-chip v-else-if="extractVersion(file.name)" size="x-small" variant="outlined">
                      {{ extractVersion(file.name) }}
                    </v-chip>
                    <v-btn
                      icon="mdi-download"
                      variant="text"
                      size="x-small"
                      color="info"
                      @click="downloadFile(file.name)"
                    />
                  </div>
                </template>
              </v-list-item>
            </template>
          </v-list>
        </v-card>
      </v-col>
    </v-row>

    <!-- Modal: visualizador de Markdown -->
    <v-dialog v-model="viewer.show" max-width="900" scrollable>
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center ga-2 px-5 pt-5 pb-3">
          <v-icon color="primary" size="20">mdi-language-markdown</v-icon>
          <span class="text-body-1 font-weight-medium text-truncate">{{ viewer.title }}</span>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="viewer.show = false" />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-6" style="max-height: 75vh; overflow-y: auto;">
          <div v-if="viewer.loading" class="d-flex justify-center align-center py-10">
            <v-progress-circular indeterminate color="primary" />
          </div>
          <v-alert v-else-if="viewer.error" type="error" variant="tonal">
            {{ viewer.error }}
          </v-alert>
          <div
            v-else
            class="md-viewer"
            v-html="viewer.content"
          />
        </v-card-text>
        <v-divider />
        <v-card-actions class="px-5 py-3">
          <v-alert
            v-if="viewer.truncated"
            type="info"
            variant="tonal"
            density="compact"
            class="text-caption flex-grow-1 mr-2"
            icon="mdi-information-outline"
          >
            Prévia parcial — baixe o arquivo para ver o documento completo.
          </v-alert>
          <v-spacer v-else />
          <v-btn
            variant="text"
            prepend-icon="mdi-download"
            @click="downloadFile(viewer.title)"
          >
            Baixar
          </v-btn>
          <v-btn variant="flat" color="primary" @click="viewer.show = false">Fechar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar de feedback -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="4000"
      location="bottom right"
    >
      {{ snackbar.message }}
      <template #actions>
        <v-btn variant="text" @click="snackbar.show = false">Fechar</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<style scoped>
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
.spin {
  animation: spin 1s linear infinite;
  display: inline-block;
}

.file-name {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 240px;
}

.md-viewer :deep(h1) { font-size: 1.4em; font-weight: 700; margin: 1.2em 0 0.4em; }
.md-viewer :deep(h2) { font-size: 1.2em; font-weight: 700; margin: 1.1em 0 0.4em; border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12); padding-bottom: 0.2em; }
.md-viewer :deep(h3) { font-size: 1.05em; font-weight: 600; margin: 0.9em 0 0.3em; }
.md-viewer :deep(h4),
.md-viewer :deep(h5),
.md-viewer :deep(h6) { font-size: 0.95em; font-weight: 600; margin: 0.7em 0 0.2em; }
.md-viewer :deep(p) { margin-bottom: 0.7em; line-height: 1.6; }
.md-viewer :deep(ul),
.md-viewer :deep(ol) { padding-left: 1.5em; margin-bottom: 0.7em; }
.md-viewer :deep(li) { margin-bottom: 0.3em; line-height: 1.5; }
.md-viewer :deep(strong) { font-weight: 600; }
.md-viewer :deep(em) { font-style: italic; }
.md-viewer :deep(hr) { border: none; border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12); margin: 1.2em 0; }
.md-viewer :deep(blockquote) {
  border-left: 3px solid rgba(var(--v-theme-primary), 0.5);
  padding: 0.3em 0.8em;
  margin: 0.6em 0;
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-style: italic;
}
.md-viewer :deep(code) {
  background: rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 3px;
  padding: 0.15em 0.35em;
  font-size: 0.88em;
  font-family: monospace;
}
.md-viewer :deep(pre) {
  background: rgba(var(--v-theme-on-surface), 0.06);
  border-radius: 6px;
  padding: 1em;
  overflow-x: auto;
  margin-bottom: 0.8em;
}
.md-viewer :deep(pre code) { background: transparent; padding: 0; }
.md-viewer :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1em;
  font-size: 0.9em;
}
.md-viewer :deep(th) {
  background: rgba(var(--v-theme-primary), 0.08);
  font-weight: 600;
  text-align: left;
  padding: 0.5em 0.75em;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.15);
}
.md-viewer :deep(td) {
  padding: 0.45em 0.75em;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  vertical-align: top;
}
.md-viewer :deep(tr:nth-child(even)) {
  background: rgba(var(--v-theme-on-surface), 0.03);
}
</style>
