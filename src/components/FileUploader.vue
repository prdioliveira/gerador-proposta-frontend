<script setup lang="ts">
import { ref } from 'vue'
import * as api from '../services/api'
import type { ProjectFile } from '../types'

const props = defineProps<{
  client: string
  project: string
  folder: string
  files: ProjectFile[]
  readonly?: boolean
}>()

const emit = defineEmits<{ uploaded: [] }>()

const dragging = ref(false)
const uploading = ref(false)
const progress = ref(0)
const errorMsg = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

function formatSize(bytes?: number) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`
}

async function handleFileList(list: FileList | null | undefined) {
  if (!list || list.length === 0 || props.readonly) return
  uploading.value = true
  errorMsg.value = ''
  try {
    for (const file of Array.from(list)) {
      await api.uploadFile(props.client, props.project, props.folder, file, (p) => {
        progress.value = p
      })
    }
    emit('uploaded')
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } }
    errorMsg.value = err.response?.data?.error ?? 'Erro ao enviar arquivo'
  } finally {
    uploading.value = false
    progress.value = 0
    if (fileInput.value) fileInput.value.value = ''
  }
}

function onDrop(e: DragEvent) {
  dragging.value = false
  handleFileList(e.dataTransfer?.files)
}

function downloadOutput(filename: string) {
  api.downloadFile(props.client, props.project, filename).then((blob) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  })
}
</script>

<template>
  <div>
    <!-- File list -->
    <v-list v-if="files.length > 0" density="compact" class="mb-2">
      <v-list-item
        v-for="file in files"
        :key="file.id"
        :title="file.name"
        :subtitle="formatSize(file.size)"
        density="compact"
      >
        <template #prepend>
          <v-icon size="18" class="mr-2">mdi-file-outline</v-icon>
        </template>
        <template v-if="folder === 'SAIDA'" #append>
          <v-btn
            icon="mdi-download"
            variant="text"
            size="x-small"
            @click="downloadOutput(file.name)"
          />
        </template>
      </v-list-item>
    </v-list>

    <p v-else class="text-body-2 text-medium-emphasis mb-2">Nenhum arquivo</p>

    <!-- Upload zone (only for input folders) -->
    <template v-if="!readonly">
      <v-alert v-if="errorMsg" type="error" variant="tonal" density="compact" class="mb-2">
        {{ errorMsg }}
      </v-alert>

      <div
        class="upload-zone"
        :class="{ 'upload-zone--active': dragging }"
        @dragover.prevent="dragging = true"
        @dragleave="dragging = false"
        @drop.prevent="onDrop"
        @click="fileInput?.click()"
      >
        <v-progress-linear v-if="uploading" :model-value="progress" color="primary" class="mb-2" />
        <template v-else>
          <v-icon size="24" color="medium-emphasis">mdi-cloud-upload-outline</v-icon>
          <span class="text-body-2 text-medium-emphasis ml-2">
            Arraste arquivos ou <strong>clique</strong> para selecionar
          </span>
        </template>
      </div>

      <input
        ref="fileInput"
        type="file"
        multiple
        style="display: none"
        @change="handleFileList(($event.target as HTMLInputElement).files)"
      />
    </template>
  </div>
</template>

<style scoped>
.upload-zone {
  border: 2px dashed rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.upload-zone:hover,
.upload-zone--active {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.05);
}
</style>
