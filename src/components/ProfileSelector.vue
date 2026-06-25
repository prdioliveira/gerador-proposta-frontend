<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import * as api from '../services/api'
import type { RatecardOption, SelectedProfile } from '../types'

const props = defineProps<{
  client: string
  project: string
  profiles: SelectedProfile[]
}>()

const emit = defineEmits<{ update: [profiles: SelectedProfile[]] }>()

const ratecard = ref<RatecardOption[]>([])
const loadingRatecard = ref(false)
const busy = ref(false)
const showAddMenu = ref(false)
const selectedKey = ref('')
const quantity = ref(1)

onMounted(async () => {
  loadingRatecard.value = true
  try {
    const res = await api.getRatecard()
    ratecard.value = res.options
  } finally {
    loadingRatecard.value = false
  }
})

const selectedKeys = computed(() =>
  new Set(props.profiles.map((p) => `${p.perfil.toLowerCase()}::${p.seniority.toLowerCase()}`))
)

const availableOptions = computed(() =>
  ratecard.value
    .filter((r) => !selectedKeys.value.has(`${r.perfil.toLowerCase()}::${r.seniority.toLowerCase()}`))
    .map((r) => ({
      value: `${r.perfil}::${r.seniority}`,
      title: r.label ?? `${r.perfil} - ${r.seniority}`,
    }))
)

async function handleAdd() {
  if (!selectedKey.value) return
  const [perfil, seniority] = selectedKey.value.split('::')
  busy.value = true
  try {
    const res = await api.addProfile(props.client, props.project, perfil, seniority, Math.max(1, quantity.value))
    emit('update', res.selectedProfiles)
    showAddMenu.value = false
    selectedKey.value = ''
    quantity.value = 1
  } finally {
    busy.value = false
  }
}

async function handleRemove(perfil: string, seniority: string) {
  busy.value = true
  try {
    const res = await api.removeProfile(props.client, props.project, perfil, seniority)
    emit('update', res.selectedProfiles)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div>
    <div class="d-flex flex-wrap ga-2 mb-3">
      <v-chip
        v-for="p in profiles"
        :key="`${p.perfil}::${p.seniority}`"
        closable
        :disabled="busy"
        @click:close="handleRemove(p.perfil, p.seniority)"
      >
        {{ p.perfil }} — {{ p.seniority }}
        <span v-if="(p.quantity ?? 1) > 1" class="ml-1 text-caption font-weight-bold">
          ×{{ p.quantity }}
        </span>
      </v-chip>

      <v-chip
        v-if="profiles.length === 0"
        variant="outlined"
        color="medium-emphasis"
        size="small"
      >
        Nenhum perfil selecionado
      </v-chip>
    </div>

    <v-dialog v-model="showAddMenu" max-width="520">
      <template #activator="{ props: aProps }">
        <v-btn
          v-bind="aProps"
          size="small"
          variant="tonal"
          prepend-icon="mdi-plus"
          :disabled="busy || loadingRatecard || availableOptions.length === 0"
        >
          Adicionar Perfil
        </v-btn>
      </template>

      <v-card rounded="lg">
        <v-card-title class="pt-4 px-5">Adicionar Perfil</v-card-title>
        <v-card-text class="px-5">
          <v-autocomplete
            v-model="selectedKey"
            :items="availableOptions"
            item-value="value"
            item-title="title"
            label="Perfil / Senioridade"
            variant="outlined"
            density="comfortable"
            auto-select-first
            class="mb-3"
          />
          <v-text-field
            v-model.number="quantity"
            label="Quantidade *"
            type="number"
            min="1"
            variant="outlined"
            density="comfortable"
            hint="Número de profissionais deste perfil"
            persistent-hint
          />
        </v-card-text>
        <v-card-actions class="px-5 pb-4 justify-end ga-2">
          <v-btn variant="text" @click="showAddMenu = false; selectedKey = ''; quantity = 1">Cancelar</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :disabled="!selectedKey || quantity < 1"
            :loading="busy"
            @click="handleAdd"
          >
            Adicionar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
