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
    max-width="500"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card rounded="lg">
      <v-card-title class="pa-5 pb-2">{{ title }}</v-card-title>
      <v-card-text class="pa-5 pt-0 text-body-2">{{ message }}</v-card-text>
      <v-card-actions class="pa-5 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="emit('update:modelValue', false)">
          Cancelar
        </v-btn>
        <v-btn
          :color="confirmColor ?? 'error'"
          variant="flat"
          @click="emit('confirm')"
        >
          {{ confirmLabel ?? 'Confirmar' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
