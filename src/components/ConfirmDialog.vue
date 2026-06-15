<script setup lang="ts">
defineProps<{
  modelValue: boolean
  title: string
  message: string
  confirmLabel?: string
  confirmColor?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
}>()
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="420"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card :title="title">
      <v-card-text>{{ message }}</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="emit('update:modelValue', false)">
          Cancelar
        </v-btn>
        <v-btn
          :color="confirmColor ?? 'error'"
          variant="tonal"
          @click="emit('confirm')"
        >
          {{ confirmLabel ?? 'Confirmar' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
