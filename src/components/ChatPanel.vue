<script setup lang="ts">
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { nextTick, onMounted, ref } from 'vue'
import * as chatApi from '../services/chat'
import type { ChatMessage } from '../services/chat'
import ConfirmDialog from './ConfirmDialog.vue'

const props = defineProps<{
  client: string
  project: string
}>()

const messages      = ref<ChatMessage[]>([])
const input         = ref('')
const sending       = ref(false)
const clearing      = ref(false)
const loadError     = ref('')
const sendError     = ref('')
const messagesEl    = ref<HTMLElement | null>(null)
const confirmDialog = ref(false)
const inputRef      = ref<{ focus: () => void } | null>(null)

async function focusInput() {
  await nextTick()
  inputRef.value?.focus()
}

marked.setOptions({ breaks: true })

function renderMarkdown(text: string): string {
  return DOMPurify.sanitize(marked.parse(text) as string)
}

async function load() {
  loadError.value = ''
  try {
    messages.value = await chatApi.listMessages(props.client, props.project)
    await scrollToBottom()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } }
    loadError.value = err.response?.data?.error ?? 'Erro ao carregar mensagens'
  }
}

async function scrollToBottom() {
  await nextTick()
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight
  }
}

async function send() {
  const text = input.value.trim()
  if (!text || sending.value) return
  sendError.value = ''
  sending.value   = true
  input.value     = ''

  const optimistic: ChatMessage = {
    id: Date.now(),
    role: 'user',
    content: text,
    created_at: new Date().toISOString(),
  }
  messages.value.push(optimistic)
  await scrollToBottom()

  try {
    await chatApi.sendMessage(props.client, props.project, text)
    messages.value = await chatApi.listMessages(props.client, props.project)
    await scrollToBottom()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } }
    sendError.value = err.response?.data?.error ?? 'Erro ao enviar mensagem'
    messages.value = messages.value.filter((m) => m.id !== optimistic.id)
  } finally {
    sending.value = false
    await focusInput()
  }
}

async function confirmClear() {
  confirmDialog.value = false
  clearing.value = true
  try {
    await chatApi.clearMessages(props.client, props.project)
    messages.value = []
  } catch {
    // silently ignore
  } finally {
    clearing.value = false
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

onMounted(load)
</script>

<template>
  <v-card variant="outlined" rounded="lg" class="d-flex flex-column" style="height: 620px">

    <!-- Header -->
    <v-toolbar density="compact" color="transparent">
      <v-icon class="ml-1" color="primary">mdi-message-text-outline</v-icon>
      <v-toolbar-title class="text-subtitle-2 ml-2">Consultor de Proposta</v-toolbar-title>
      <v-spacer />
      <v-tooltip text="Limpar histórico" location="top">
        <template #activator="{ props: p }">
          <v-btn
            v-bind="p"
            icon="mdi-delete-sweep-outline"
            variant="text"
            size="small"
            :loading="clearing"
            :disabled="messages.length === 0"
            @click="confirmDialog = true"
          />
        </template>
      </v-tooltip>
    </v-toolbar>

    <v-divider />

    <!-- Message list -->
    <div
      ref="messagesEl"
      class="flex-grow-1 overflow-y-auto pa-3"
      style="min-height: 0"
    >
      <v-alert v-if="loadError" type="error" variant="tonal" density="compact" class="mb-2">
        {{ loadError }}
      </v-alert>

      <div
        v-if="messages.length === 0 && !loadError"
        class="d-flex flex-column align-center justify-center h-100 text-medium-emphasis"
      >
        <v-icon size="48" class="mb-3">mdi-chat-question-outline</v-icon>
        <p class="text-body-2 text-center">
          Pergunte sobre escopo, prazos, perfis, regras de negócio<br>ou qualquer aspecto dos documentos carregados.
        </p>
      </div>

      <template v-for="msg in messages" :key="msg.id">
        <!-- User bubble -->
        <div v-if="msg.role === 'user'" class="d-flex justify-end mb-3">
          <v-sheet
            color="primary"
            rounded="lg"
            class="pa-3"
            style="max-width: 75%"
          >
            <p class="text-body-2 text-white mb-0" style="white-space: pre-wrap; word-break: break-word">{{ msg.content }}</p>
          </v-sheet>
        </div>

        <!-- Assistant bubble -->
        <div v-else class="d-flex justify-start mb-3">
          <v-sheet
            color="surface-variant"
            rounded="lg"
            class="pa-3 chat-assistant-bubble"
            style="max-width: 90%"
          >
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div class="text-body-2 chat-markdown" v-html="renderMarkdown(msg.content)" />
          </v-sheet>
        </div>
      </template>

      <!-- Thinking indicator -->
      <div v-if="sending" class="d-flex justify-start mb-3">
        <v-sheet color="surface-variant" rounded="lg" class="pa-3">
          <div class="d-flex align-center ga-2">
            <v-progress-circular size="16" width="2" indeterminate color="primary" />
            <span class="text-body-2 text-medium-emphasis">Analisando documentos...</span>
          </div>
        </v-sheet>
      </div>
    </div>

    <v-divider />

    <!-- Send error -->
    <v-alert
      v-if="sendError"
      type="error"
      variant="tonal"
      density="compact"
      closable
      class="mx-3 mt-2"
      @click:close="sendError = ''"
    >
      {{ sendError }}
    </v-alert>

    <!-- Input area -->
    <div class="pa-3 pt-2">
      <div class="d-flex ga-2 align-end">
        <v-textarea
          ref="inputRef"
          v-model="input"
          placeholder="Pergunte sobre escopo, prazos, perfis, regras..."
          variant="outlined"
          density="compact"
          rows="2"
          max-rows="5"
          auto-grow
          hide-details
          class="flex-grow-1"
          :disabled="sending"
          @keydown="onKeydown"
        />
        <v-btn
          icon="mdi-send"
          color="primary"
          variant="flat"
          size="large"
          :loading="sending"
          :disabled="!input.trim()"
          @click="send"
        />
      </div>
      <p class="text-caption text-medium-emphasis mt-1">
        Enter para enviar · Shift+Enter para nova linha
      </p>
    </div>

  </v-card>

  <ConfirmDialog
    v-model="confirmDialog"
    title="Limpar histórico"
    message="Todas as mensagens desta conversa serão removidas permanentemente."
    confirm-label="Limpar"
    @confirm="confirmClear"
  />
</template>

<style scoped>
.chat-markdown :deep(p) {
  margin-bottom: 0.5em;
}
.chat-markdown :deep(p:last-child) {
  margin-bottom: 0;
}
.chat-markdown :deep(ul),
.chat-markdown :deep(ol) {
  padding-left: 1.4em;
  margin-bottom: 0.5em;
}
.chat-markdown :deep(li) {
  margin-bottom: 0.2em;
}
.chat-markdown :deep(strong) {
  font-weight: 600;
}
.chat-markdown :deep(blockquote) {
  border-left: 3px solid rgba(var(--v-theme-primary), 0.5);
  padding: 0.25em 0.75em;
  margin: 0.5em 0;
  color: rgba(var(--v-theme-on-surface), 0.75);
  font-style: italic;
}
.chat-markdown :deep(code) {
  background: rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 3px;
  padding: 0.1em 0.3em;
  font-size: 0.9em;
}
.chat-markdown :deep(h1),
.chat-markdown :deep(h2),
.chat-markdown :deep(h3) {
  font-size: 0.95em;
  font-weight: 600;
  margin: 0.6em 0 0.3em;
}
</style>
