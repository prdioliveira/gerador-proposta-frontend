<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as api from '../services/api'
import type { AppConfigFull, MarginOption, ProjectSummary, SelectedProfile } from '../types'
import ChatPanel from '../components/ChatPanel.vue'
import FileUploader from '../components/FileUploader.vue'
import GenerationPanel from '../components/GenerationPanel.vue'
import OutcomePanel from '../components/OutcomePanel.vue'
import ProfileSelector from '../components/ProfileSelector.vue'

const route  = useRoute()
const router = useRouter()

const client      = computed(() => decodeURIComponent(String(route.params.client)))
const projectName = computed(() => decodeURIComponent(String(route.params.name)))

const project   = ref<ProjectSummary | null>(null)
const loading   = ref(true)
const loadError = ref('')
const tab       = ref('files')

// Meta form
const meta = reactive({ site: '', margin: '', proposalType: 'desenvolvimento', details: '' })
const savingMeta = ref(false)
const metaSaved  = ref(false)
const metaError  = ref('')
const margins    = ref<MarginOption[]>([])

const PROPOSAL_TYPES = [
  { value: 'alocacao',        title: 'Alocação'        },
  { value: 'desenvolvimento', title: 'Desenvolvimento' },
  { value: 'assessment',      title: 'Assessment'      },
]

// ── Contexto do sistema ────────────────────────────────
const appConfig = ref<AppConfigFull | null>(null)
const sysConfig = ref<Record<string, unknown>>({})

const storageInfo = computed(() => {
  const backend = String(sysConfig.value.storageBackend ?? '')
  if (backend === 'google_drive') return { icon: 'mdi-google-drive',    label: 'Google Drive', color: 'info'    }
  if (backend === 'local')        return { icon: 'mdi-folder-outline',   label: 'Local',        color: 'default' }
  return null
})

const llmInfo = computed(() => {
  const m = appConfig.value?.active_llm_model
  if (!m) return null
  return { label: m.provider_name ? `${m.provider_name} · ${m.display_name}` : m.display_name }
})

// ── Pastas ────────────────────────────────────────────
const FOLDER_META: Record<string, { label: string; icon: string }> = {
  'QUESTIONARIO':          { label: 'Questionário',             icon: 'mdi-help-circle-outline'    },
  'TRANSCRICAO-REUNIOES':  { label: 'Transcrições de Reuniões', icon: 'mdi-microphone-outline'     },
  'DOCUMENTOS-DO-PROJETO': { label: 'Documentos do Projeto',    icon: 'mdi-file-multiple-outline'  },
  'IMAGE':                 { label: 'Imagens',                  icon: 'mdi-image-outline'          },
  'SAIDA':                 { label: 'Saída',                    icon: 'mdi-archive-arrow-down'     },
}

const INPUT_FOLDERS = ['QUESTIONARIO', 'TRANSCRICAO-REUNIOES', 'DOCUMENTOS-DO-PROJETO', 'IMAGE']

// ── Status ────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  sem_arquivos: { color: 'default', label: 'Sem arquivos' },
  em_andamento: { color: 'warning', label: 'Em andamento' },
  concluido:    { color: 'success', label: 'Concluído'    },
  erro:         { color: 'error',   label: 'Erro'         },
}
const statusCfg = computed(() =>
  STATUS_CONFIG[project.value?.status ?? ''] ??
  { color: 'default', label: project.value?.status ?? '' }
)

// ── Carregamento ──────────────────────────────────────
async function load() {
  loading.value   = true
  loadError.value = ''
  try {
    const res = await api.getProject(client.value, projectName.value)
    project.value        = res.project
    meta.site            = res.project.site        ?? ''
    meta.margin          = res.project.margin      ?? ''
    meta.proposalType    = res.project.proposalType ?? 'desenvolvimento'
    meta.details         = res.details             ?? ''
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } }
    loadError.value = err.response?.data?.error ?? 'Erro ao carregar projeto'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  load()
  // Carrega dados auxiliares em paralelo (falha silenciosa)
  Promise.allSettled([
    api.getMargins().then((r) => { margins.value = r.options }),
    api.getConfig().then((r)  => { sysConfig.value = r as Record<string, unknown> }),
    api.getAppConfig().then((r) => { appConfig.value = r }),
  ])
})

// ── Ações ─────────────────────────────────────────────
async function saveMeta() {
  savingMeta.value = true
  metaError.value  = ''
  metaSaved.value  = false
  try {
    await api.saveProjectDetails(client.value, projectName.value, { ...meta })
    metaSaved.value = true
    setTimeout(() => { metaSaved.value = false }, 2500)
    if (project.value) {
      project.value.site         = meta.site
      project.value.margin       = meta.margin
      project.value.proposalType = meta.proposalType
    }
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } }
    metaError.value = err.response?.data?.error ?? 'Erro ao salvar'
  } finally {
    savingMeta.value = false
  }
}

function onProfilesUpdate(updated: SelectedProfile[]) {
  if (project.value) project.value.selectedProfiles = updated
}

function onFilesUploaded() { load() }

function downloadZip() {
  api.downloadProjectZip(client.value, projectName.value)
}

function folderFiles(name: string) {
  return project.value?.folders?.[name]?.files ?? []
}
</script>

<template>
  <v-container fluid class="pa-6">

    <!-- ── Cabeçalho ───────────────────────────────── -->
    <div class="d-flex align-start mb-4 ga-2">
      <v-btn icon="mdi-arrow-left" variant="text" size="small" class="mt-1" @click="router.push('/')" />

      <div class="flex-grow-1">
        <!-- Título + status -->
        <div class="d-flex align-center ga-2 flex-wrap">
          <h1 class="text-h5 font-weight-bold">{{ projectName }}</h1>
          <v-chip v-if="project" :color="statusCfg.color" variant="tonal" size="small">
            {{ statusCfg.label }}
          </v-chip>
        </div>

        <!-- Cliente -->
        <p class="text-body-2 text-medium-emphasis mb-2">{{ client }}</p>

        <!-- Contexto do sistema -->
        <div class="d-flex align-center ga-2 flex-wrap">
          <v-chip
            v-if="storageInfo"
            :prepend-icon="storageInfo.icon"
            size="small"
            variant="tonal"
            :color="storageInfo.color"
          >
            {{ storageInfo.label }}
          </v-chip>

          <v-chip
            v-if="llmInfo"
            prepend-icon="mdi-robot-outline"
            size="small"
            variant="tonal"
            color="secondary"
          >
            {{ llmInfo.label }}
          </v-chip>
        </div>
      </div>

      <v-btn
        v-if="project"
        variant="tonal"
        prepend-icon="mdi-download-box"
        size="small"
        class="mt-1"
        @click="downloadZip"
      >
        Download ZIP
      </v-btn>
    </div>

    <!-- ── Estados ─────────────────────────────────── -->
    <div v-if="loading" class="d-flex justify-center py-12">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <v-alert v-else-if="loadError" type="error" variant="tonal">
      {{ loadError }}
    </v-alert>

    <!-- ── Conteúdo ─────────────────────────────────── -->
    <template v-else-if="project">
      <v-tabs v-model="tab" class="mb-4">
        <v-tab value="files">
          <v-icon start size="16">mdi-paperclip</v-icon>
          Arquivos do Projeto
        </v-tab>
        <v-tab value="config">
          <v-icon start size="16">mdi-information-outline</v-icon>
          Informações Complementares
        </v-tab>
        <v-tab value="generation">
          <v-icon start size="16">mdi-file-powerpoint</v-icon>
          Gerar Proposta
        </v-tab>
        <v-tab value="outcome">
          <v-icon start size="16">mdi-chart-timeline-variant</v-icon>
          Desfecho
        </v-tab>
        <v-tab value="chat">
          <v-icon start size="16">mdi-message-text-outline</v-icon>
          Chat
        </v-tab>
      </v-tabs>

      <v-tabs-window v-model="tab">

        <!-- ─── ARQUIVOS ──────────────────────────── -->
        <v-tabs-window-item value="files">
          <v-row dense>
            <!-- Pastas de entrada -->
            <v-col v-for="folder in INPUT_FOLDERS" :key="folder" cols="12" md="6">
              <v-card variant="outlined" rounded="lg" class="pa-4 h-100">
                <div class="d-flex align-center justify-space-between mb-3">
                  <div class="d-flex align-center ga-2">
                    <v-icon size="18" :icon="FOLDER_META[folder]?.icon ?? 'mdi-folder-outline'" color="medium-emphasis" />
                    <div>
                      <div class="text-subtitle-2 font-weight-medium">
                        {{ FOLDER_META[folder]?.label ?? folder }}
                      </div>
                      <code class="text-caption text-medium-emphasis" style="font-size: 10px">{{ folder }}</code>
                    </div>
                  </div>
                  <v-chip size="x-small" variant="tonal">
                    {{ folderFiles(folder).length }}
                  </v-chip>
                </div>
                <FileUploader
                  :client="client"
                  :project="projectName"
                  :folder="folder"
                  :files="folderFiles(folder)"
                  @uploaded="onFilesUploaded"
                />
              </v-card>
            </v-col>

          </v-row>
        </v-tabs-window-item>

        <!-- ─── CONFIGURAÇÃO ─────────────────────── -->
        <v-tabs-window-item value="config">
          <v-card variant="outlined" rounded="lg" class="pa-4 mb-4">
            <v-card-title class="pa-0 mb-4 text-subtitle-1">Metadados do Projeto</v-card-title>

            <v-alert v-if="metaError" type="error"   variant="tonal" density="compact" class="mb-3">{{ metaError }}</v-alert>
            <v-alert v-if="metaSaved" type="success" variant="tonal" density="compact" class="mb-3">Salvo com sucesso!</v-alert>

            <v-row dense>
              <v-col cols="12">
                <v-text-field
                  v-model="meta.site"
                  label="URL do Site"
                  placeholder="https://..."
                  variant="outlined"
                  density="comfortable"
                  :disabled="savingMeta"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-autocomplete
                  v-model="meta.proposalType"
                  label="Tipo de Proposta"
                  :items="PROPOSAL_TYPES"
                  item-value="value"
                  item-title="title"
                  variant="outlined"
                  density="comfortable"
                  auto-select-first
                  :disabled="savingMeta"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-autocomplete
                  v-model="meta.margin"
                  label="Margem"
                  :items="margins"
                  item-value="key"
                  item-title="label"
                  variant="outlined"
                  density="comfortable"
                  clearable
                  auto-select-first
                  :disabled="savingMeta || margins.length === 0"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="meta.details"
                  label="Detalhes / Contexto"
                  placeholder="Informações adicionais sobre o projeto..."
                  variant="outlined"
                  density="comfortable"
                  rows="5"
                  :disabled="savingMeta"
                />
              </v-col>
            </v-row>

            <div class="d-flex justify-end">
              <v-btn color="primary" variant="flat" :loading="savingMeta" @click="saveMeta">
                Salvar
              </v-btn>
            </div>
          </v-card>

          <!-- Perfis de atuação -->
          <v-card variant="outlined" rounded="lg" class="pa-4">
            <v-card-title class="pa-0 mb-3 text-subtitle-1">Perfis Selecionados</v-card-title>
            <ProfileSelector
              :client="client"
              :project="projectName"
              :profiles="project.selectedProfiles ?? []"
              @update="onProfilesUpdate"
            />
          </v-card>
        </v-tabs-window-item>

        <!-- ─── GERAÇÃO ───────────────────────────── -->
        <v-tabs-window-item value="generation">
          <GenerationPanel
            :client="client"
            :project="projectName"
            :has-input="(project.hasInput ?? false) || meta.details.trim().length > 0"
            :saida-files="folderFiles('SAIDA')"
            @files-changed="onFilesUploaded"
          />
        </v-tabs-window-item>

        <!-- ─── DESFECHO ──────────────────────────── -->
        <v-tabs-window-item value="outcome">
          <v-card variant="outlined" rounded="lg" class="pa-4">
            <OutcomePanel
              :client="client"
              :project="projectName"
              :saida-files="folderFiles('SAIDA')"
            />
          </v-card>
        </v-tabs-window-item>

        <!-- ─── CHAT ──────────────────────────────── -->
        <v-tabs-window-item value="chat">
          <ChatPanel :client="client" :project="projectName" />
        </v-tabs-window-item>

      </v-tabs-window>
    </template>
  </v-container>
</template>
