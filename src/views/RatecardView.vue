<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import * as api from '../services/api'
import type { RatecardProfileResponse, RatecardRateResponse } from '../types'

// ── State ──────────────────────────────────────────────
const profiles  = ref<RatecardProfileResponse[]>([])
const loading   = ref(true)
const loadError = ref('')

// ── Filtros ────────────────────────────────────────────
const filterProfile   = ref('')
const filterSeniority = ref('')

const hasFilter = computed(() => filterProfile.value.trim() || filterSeniority.value.trim())

const filteredProfiles = computed(() => {
  const fp = filterProfile.value.trim().toLowerCase()
  const fs = filterSeniority.value.trim().toLowerCase()

  return profiles.value
    .filter((p) => !fp || p.name.toLowerCase().includes(fp) || p.slug.toLowerCase().includes(fp))
    .map((p) => ({
      ...p,
      rates: fs ? p.rates.filter((r) => r.seniority.toLowerCase().includes(fs)) : p.rates,
    }))
    .filter((p) => !fs || p.rates.length > 0)
})

function clearFilters() {
  filterProfile.value   = ''
  filterSeniority.value = ''
}

// ── Profile dialog ─────────────────────────────────────
const profileDialog = reactive({
  show:    false,
  editing: null as RatecardProfileResponse | null,
  form:    { name: '', slug: '' },
  saving:  false,
  error:   '',
})

// ── Rate dialog ────────────────────────────────────────
const rateDialog = reactive({
  show:      false,
  profileId: 0,
  editing:   null as RatecardRateResponse | null,
  form:      { seniority: '', hourly_rate: '', aliases: '' },
  saving:    false,
  error:     '',
})

// ── Delete dialogs ─────────────────────────────────────
const delProfile = reactive({
  show:   false,
  target: null as RatecardProfileResponse | null,
  saving: false,
  error:  '',
})

const delRate = reactive({
  show:      false,
  profileId: 0,
  target:    null as RatecardRateResponse | null,
  saving:    false,
  error:     '',
})

// ── Helpers ────────────────────────────────────────────
function apiErr(e: unknown): string {
  const r = (e as { response?: { data?: { detail?: string; error?: string } } }).response?.data
  return r?.detail ?? r?.error ?? 'Ocorreu um erro inesperado'
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ── Load ───────────────────────────────────────────────
async function load() {
  loading.value   = true
  loadError.value = ''
  try {
    profiles.value = await api.listRatecardProfiles()
  } catch (e) {
    loadError.value = apiErr(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)

// ── Profile CRUD ───────────────────────────────────────
function openCreateProfile() {
  profileDialog.editing = null
  profileDialog.form    = { name: '', slug: '' }
  profileDialog.error   = ''
  profileDialog.show    = true
}

function openEditProfile(p: RatecardProfileResponse) {
  profileDialog.editing = p
  profileDialog.form    = { name: p.name, slug: p.slug }
  profileDialog.error   = ''
  profileDialog.show    = true
}

async function saveProfile() {
  profileDialog.saving = true
  profileDialog.error  = ''
  try {
    const { name, slug } = profileDialog.form
    if (profileDialog.editing) {
      const updated = await api.updateRatecardProfile(profileDialog.editing.id, { name, slug })
      const idx = profiles.value.findIndex((p) => p.id === profileDialog.editing!.id)
      if (idx !== -1) profiles.value[idx] = { ...profiles.value[idx], ...updated }
    } else {
      const created = await api.createRatecardProfile({ name, slug })
      profiles.value.push({ ...created, rates: [] })
    }
    profileDialog.show = false
  } catch (e) {
    profileDialog.error = apiErr(e)
  } finally {
    profileDialog.saving = false
  }
}

async function confirmDeleteProfile() {
  if (!delProfile.target) return
  delProfile.saving = true
  delProfile.error  = ''
  try {
    await api.deleteRatecardProfile(delProfile.target.id)
    profiles.value = profiles.value.filter((p) => p.id !== delProfile.target!.id)
    delProfile.show = false
  } catch (e) {
    delProfile.error = apiErr(e)
  } finally {
    delProfile.saving = false
  }
}

// ── Rate CRUD ──────────────────────────────────────────
function openCreateRate(profileId: number) {
  rateDialog.profileId = profileId
  rateDialog.editing   = null
  rateDialog.form      = { seniority: '', hourly_rate: '', aliases: '' }
  rateDialog.error     = ''
  rateDialog.show      = true
}

function openEditRate(profileId: number, r: RatecardRateResponse) {
  rateDialog.profileId = profileId
  rateDialog.editing   = r
  rateDialog.form      = {
    seniority:   r.seniority,
    hourly_rate: String(r.hourly_rate),
    aliases:     r.seniority_aliases.join(', '),
  }
  rateDialog.error = ''
  rateDialog.show  = true
}

async function saveRate() {
  rateDialog.saving = true
  rateDialog.error  = ''
  try {
    const { seniority, hourly_rate, aliases } = rateDialog.form
    const seniority_aliases = aliases.split(',').map((s) => s.trim()).filter(Boolean)
    const payload = { seniority, hourly_rate: Number(hourly_rate), seniority_aliases }

    if (rateDialog.editing) {
      const updated = await api.updateRatecardRate(rateDialog.profileId, rateDialog.editing.id, payload)
      const profile = profiles.value.find((p) => p.id === rateDialog.profileId)
      if (profile) {
        const idx = profile.rates.findIndex((r) => r.id === rateDialog.editing!.id)
        if (idx !== -1) profile.rates[idx] = updated
      }
    } else {
      const created = await api.createRatecardRate(rateDialog.profileId, payload)
      const profile = profiles.value.find((p) => p.id === rateDialog.profileId)
      if (profile) profile.rates.push(created)
    }
    rateDialog.show = false
  } catch (e) {
    rateDialog.error = apiErr(e)
  } finally {
    rateDialog.saving = false
  }
}

async function confirmDeleteRate() {
  if (!delRate.target) return
  delRate.saving = true
  delRate.error  = ''
  try {
    await api.deleteRatecardRate(delRate.profileId, delRate.target.id)
    const profile = profiles.value.find((p) => p.id === delRate.profileId)
    if (profile) profile.rates = profile.rates.filter((r) => r.id !== delRate.target!.id)
    delRate.show = false
  } catch (e) {
    delRate.error = apiErr(e)
  } finally {
    delRate.saving = false
  }
}
</script>

<template>
  <v-container fluid class="pa-6">

    <!-- ── Cabeçalho ────────────────────────────────── -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h5 font-weight-bold">Tabela de Preços</h1>
        <p class="text-body-2 text-medium-emphasis mt-1">
          Perfis de ratecard e valores por senioridade
        </p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreateProfile">
        Novo Perfil
      </v-btn>
    </div>

    <!-- ── Carregamento ──────────────────────────────── -->
    <template v-if="loading">
      <v-skeleton-loader v-for="n in 3" :key="n" type="card" class="mb-3 rounded-lg" />
    </template>

    <v-alert v-else-if="loadError" type="error" variant="tonal" class="mb-4">
      {{ loadError }}
    </v-alert>

    <!-- ── Estado vazio ──────────────────────────────── -->
    <div
      v-else-if="profiles.length === 0"
      class="d-flex flex-column align-center justify-center"
      style="min-height: 320px"
    >
      <v-icon size="64" color="medium-emphasis" class="mb-4">mdi-table-off</v-icon>
      <p class="text-h6 text-medium-emphasis">Nenhum perfil de ratecard</p>
      <p class="text-body-2 text-medium-emphasis mb-6">
        Adicione perfis com senioridades e valores por hora
      </p>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreateProfile">
        Adicionar Perfil
      </v-btn>
    </div>

    <template v-else>
      <!-- ── Filtros ─────────────────────────────────── -->
      <v-row dense class="mb-4">
        <v-col cols="12" sm="5">
          <v-text-field
            v-model="filterProfile"
            label="Filtrar por perfil"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="compact"
            clearable
            hide-details
          />
        </v-col>
        <v-col cols="12" sm="5">
          <v-text-field
            v-model="filterSeniority"
            label="Filtrar por senioridade"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="compact"
            clearable
            hide-details
          />
        </v-col>
        <v-col cols="12" sm="2" class="d-flex align-center ga-2">
          <v-btn
            v-if="hasFilter"
            variant="text"
            size="small"
            @click="clearFilters"
          >
            Limpar
          </v-btn>
          <span v-if="hasFilter" class="text-caption text-medium-emphasis">
            {{ filteredProfiles.length }} de {{ profiles.length }}
          </span>
        </v-col>
      </v-row>

      <!-- ── Resultado vazio do filtro ──────────────── -->
      <div
        v-if="filteredProfiles.length === 0"
        class="d-flex flex-column align-center justify-center py-12"
      >
        <v-icon size="48" color="medium-emphasis" class="mb-3">mdi-filter-off-outline</v-icon>
        <p class="text-body-1 text-medium-emphasis">Nenhum perfil corresponde ao filtro</p>
        <v-btn variant="text" size="small" class="mt-2" @click="clearFilters">Limpar filtros</v-btn>
      </div>

      <!-- ── Lista de perfis ─────────────────────────── -->
      <v-expansion-panels v-else variant="accordion" class="border rounded-lg overflow-hidden">
        <v-expansion-panel v-for="profile in filteredProfiles" :key="profile.id">

        <!-- Título do painel -->
        <v-expansion-panel-title>
          <div class="d-flex align-center ga-3 flex-grow-1 mr-2">
            <v-icon color="secondary" size="20">mdi-currency-usd</v-icon>
            <div class="flex-grow-1 min-width-0">
              <div class="d-flex align-center ga-2 flex-wrap">
                <span class="text-subtitle-2 font-weight-bold">{{ profile.name }}</span>
                <v-chip size="x-small" variant="outlined" class="font-monospace">
                  {{ profile.slug }}
                </v-chip>
                <v-chip size="x-small" variant="tonal" color="secondary">
                  {{ profile.rates.length }}
                  {{ profile.rates.length === 1 ? 'senioridade' : 'senioridades' }}
                </v-chip>
              </div>
            </div>
            <div class="d-flex ga-1 flex-shrink-0" @click.stop>
              <v-tooltip text="Editar perfil" location="top">
                <template #activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon="mdi-pencil-outline"
                    variant="text"
                    size="small"
                    @click="openEditProfile(profile)"
                  />
                </template>
              </v-tooltip>
              <v-tooltip text="Excluir perfil" location="top">
                <template #activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon="mdi-trash-can-outline"
                    variant="text"
                    size="small"
                    color="error"
                    @click="delProfile.target = profile; delProfile.error = ''; delProfile.show = true"
                  />
                </template>
              </v-tooltip>
            </div>
          </div>
        </v-expansion-panel-title>

        <!-- Corpo do painel -->
        <v-expansion-panel-text class="pa-0">
          <!-- Vazio: sem senioridades -->
          <div
            v-if="profile.rates.length === 0"
            class="py-6 text-center"
          >
            <v-icon size="36" color="medium-emphasis" class="mb-1">mdi-table-off</v-icon>
            <p class="text-body-2 text-medium-emphasis">Nenhuma senioridade cadastrada</p>
          </div>

          <!-- Tabela de senioridades -->
          <v-table v-else density="compact">
            <thead>
              <tr>
                <th class="text-left">Senioridade</th>
                <th class="text-left">Valor/hora</th>
                <th class="text-left">Aliases</th>
                <th class="text-right" style="width: 80px">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="rate in profile.rates" :key="rate.id">
                <td class="text-body-2 font-weight-medium">{{ rate.seniority }}</td>
                <td class="text-body-2">{{ formatCurrency(rate.hourly_rate) }}</td>
                <td>
                  <span v-if="rate.seniority_aliases.length === 0" class="text-medium-emphasis">—</span>
                  <template v-else>
                    <v-chip
                      v-for="alias in rate.seniority_aliases"
                      :key="alias"
                      size="x-small"
                      variant="outlined"
                      class="mr-1 font-monospace"
                    >
                      {{ alias }}
                    </v-chip>
                  </template>
                </td>
                <td class="text-right">
                  <v-btn
                    icon="mdi-pencil-outline"
                    variant="text"
                    size="x-small"
                    @click="openEditRate(profile.id, rate)"
                  />
                  <v-btn
                    icon="mdi-trash-can-outline"
                    variant="text"
                    size="x-small"
                    color="error"
                    @click="delRate.profileId = profile.id; delRate.target = rate; delRate.error = ''; delRate.show = true"
                  />
                </td>
              </tr>
            </tbody>
          </v-table>

          <!-- Rodapé: adicionar senioridade -->
          <div class="px-4 py-2 border-t">
            <v-btn
              variant="text"
              color="primary"
              prepend-icon="mdi-plus"
              size="small"
              @click="openCreateRate(profile.id)"
            >
              Adicionar Senioridade
            </v-btn>
          </div>
        </v-expansion-panel-text>

        </v-expansion-panel>
      </v-expansion-panels>
    </template>
  </v-container>

  <!-- ────────────────────────────────────────────────── -->
  <!-- Dialog: criar / editar perfil                      -->
  <!-- ────────────────────────────────────────────────── -->
  <v-dialog v-model="profileDialog.show" max-width="560" persistent>
    <v-card rounded="lg">
      <v-card-title class="pt-5 px-6">
        {{ profileDialog.editing ? 'Editar Perfil' : 'Novo Perfil' }}
      </v-card-title>

      <v-card-text class="px-6 pb-2">
        <v-alert
          v-if="profileDialog.error"
          type="error" variant="tonal" density="compact" class="mb-4"
        >
          {{ profileDialog.error }}
        </v-alert>

        <v-row dense>
          <v-col cols="12">
            <v-text-field
              v-model="profileDialog.form.name"
              label="Nome do perfil *"
              placeholder="Ex: Desenvolvedor"
              variant="outlined"
              density="comfortable"
              :disabled="profileDialog.saving"
              autofocus
            />
          </v-col>
          <v-col cols="12">
            <v-text-field
              v-model="profileDialog.form.slug"
              label="Slug único *"
              placeholder="Ex: desenvolvedor"
              variant="outlined"
              density="comfortable"
              hint="Identificador interno sem espaços"
              persistent-hint
              :disabled="profileDialog.saving"
            />
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions class="px-6 pb-5 justify-end ga-2">
        <v-btn variant="text" :disabled="profileDialog.saving" @click="profileDialog.show = false">
          Cancelar
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="profileDialog.saving"
          :disabled="!profileDialog.form.name.trim() || !profileDialog.form.slug.trim()"
          @click="saveProfile"
        >
          {{ profileDialog.editing ? 'Salvar' : 'Criar' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ────────────────────────────────────────────────── -->
  <!-- Dialog: criar / editar senioridade                 -->
  <!-- ────────────────────────────────────────────────── -->
  <v-dialog v-model="rateDialog.show" max-width="560" persistent>
    <v-card rounded="lg">
      <v-card-title class="pt-5 px-6">
        {{ rateDialog.editing ? 'Editar Senioridade' : 'Adicionar Senioridade' }}
      </v-card-title>

      <v-card-text class="px-6 pb-2">
        <v-alert
          v-if="rateDialog.error"
          type="error" variant="tonal" density="compact" class="mb-4"
        >
          {{ rateDialog.error }}
        </v-alert>

        <v-row dense>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="rateDialog.form.seniority"
              label="Senioridade *"
              placeholder="Ex: Junior"
              variant="outlined"
              density="comfortable"
              :disabled="rateDialog.saving"
              autofocus
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="rateDialog.form.hourly_rate"
              label="Valor por hora (R$) *"
              type="number"
              min="0"
              step="0.01"
              variant="outlined"
              density="comfortable"
              prefix="R$"
              :disabled="rateDialog.saving"
            />
          </v-col>
          <v-col cols="12">
            <v-text-field
              v-model="rateDialog.form.aliases"
              label="Aliases (separados por vírgula)"
              placeholder="Ex: Jr, Júnior, Junior Dev"
              variant="outlined"
              density="comfortable"
              hint="Termos alternativos usados para reconhecer esta senioridade"
              persistent-hint
              :disabled="rateDialog.saving"
            />
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions class="px-6 pb-5 justify-end ga-2">
        <v-btn variant="text" :disabled="rateDialog.saving" @click="rateDialog.show = false">
          Cancelar
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="rateDialog.saving"
          :disabled="!rateDialog.form.seniority.trim() || !rateDialog.form.hourly_rate"
          @click="saveRate"
        >
          {{ rateDialog.editing ? 'Salvar' : 'Adicionar' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ────────────────────────────────────────────────── -->
  <!-- Confirm: excluir perfil                            -->
  <!-- ────────────────────────────────────────────────── -->
  <v-dialog v-model="delProfile.show" max-width="500">
    <v-card rounded="lg">
      <v-card-title class="pt-5 px-6">Excluir Perfil</v-card-title>
      <v-card-text class="px-6">
        <v-alert
          v-if="delProfile.error"
          type="error" variant="tonal" density="compact" class="mb-3"
        >
          {{ delProfile.error }}
        </v-alert>
        <template v-else>
          <p>
            Tem certeza que deseja excluir o perfil
            <strong>{{ delProfile.target?.name }}</strong>?
          </p>
          <v-alert
            v-if="(delProfile.target?.rates?.length ?? 0) > 0"
            type="warning" variant="tonal" density="compact" class="mt-3"
          >
            Este perfil possui
            <strong>{{ delProfile.target?.rates?.length }} senioridade(s)</strong> vinculadas.
            Delete-as primeiro antes de remover o perfil.
          </v-alert>
        </template>
      </v-card-text>
      <v-card-actions class="px-6 pb-5 justify-end ga-2">
        <v-btn variant="text" :disabled="delProfile.saving" @click="delProfile.show = false">
          Cancelar
        </v-btn>
        <v-btn
          color="error"
          variant="tonal"
          :loading="delProfile.saving"
          @click="confirmDeleteProfile"
        >
          Excluir
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ────────────────────────────────────────────────── -->
  <!-- Confirm: excluir senioridade                       -->
  <!-- ────────────────────────────────────────────────── -->
  <v-dialog v-model="delRate.show" max-width="500">
    <v-card rounded="lg">
      <v-card-title class="pt-5 px-6">Excluir Senioridade</v-card-title>
      <v-card-text class="px-6">
        <v-alert
          v-if="delRate.error"
          type="error" variant="tonal" density="compact" class="mb-3"
        >
          {{ delRate.error }}
        </v-alert>
        <template v-else>
          Tem certeza que deseja excluir a senioridade
          <strong>{{ delRate.target?.seniority }}</strong>?
        </template>
      </v-card-text>
      <v-card-actions class="px-6 pb-5 justify-end ga-2">
        <v-btn variant="text" :disabled="delRate.saving" @click="delRate.show = false">
          Cancelar
        </v-btn>
        <v-btn
          color="error"
          variant="tonal"
          :loading="delRate.saving"
          @click="confirmDeleteRate"
        >
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
