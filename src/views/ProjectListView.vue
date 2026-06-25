<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import ProjectCard from '../components/ProjectCard.vue'
import { useProjectsStore } from '../stores/projects'

const store = useProjectsStore()
const router = useRouter()

const showDialog = ref(false)
const submitting = ref(false)
const formError = ref('')

const filterClient = ref('')
const filterProject = ref('')

const form = reactive({
  client: '',
  project: '',
})

const isFormValid = computed(
  () => form.client.trim().length > 0 && form.project.trim().length > 0
)

const filteredProjects = computed(() => {
  const fc = filterClient.value.trim().toLowerCase()
  const fp = filterProject.value.trim().toLowerCase()
  return store.projects.filter(p => {
    const matchClient = !fc || p.client.toLowerCase().includes(fc)
    const matchProject = !fp || p.project.toLowerCase().includes(fp)
    return matchClient && matchProject
  })
})

function clearFilters() {
  filterClient.value = ''
  filterProject.value = ''
}

onMounted(() => {
  store.fetchProjects()
})

function openDialog() {
  form.client = ''
  form.project = ''
  formError.value = ''
  showDialog.value = true
}

async function submitCreate() {
  if (!isFormValid.value) return
  submitting.value = true
  formError.value = ''
  try {
    const created = await store.createProject({
      client: form.client.trim(),
      project: form.project.trim(),
    })
    showDialog.value = false
    router.push(
      `/project/${encodeURIComponent(created.client)}/${encodeURIComponent(created.project)}`
    )
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } }
    formError.value = err.response?.data?.error ?? 'Erro ao criar projeto'
  } finally {
    submitting.value = false
  }
}

async function handleDelete(client: string, project: string) {
  try {
    await store.deleteProject(client, project)
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } }
    console.error('Erro ao excluir projeto:', err.response?.data?.error ?? e)
  }
}
</script>

<template>
  <v-container fluid class="pa-6">
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-4">
      <div>
        <h1 class="text-h5 font-weight-bold">Projetos</h1>
        <p class="text-body-2 text-medium-emphasis mt-1">
          <template v-if="store.loading">Carregando…</template>
          <template v-else-if="filterClient || filterProject">
            {{ filteredProjects.length }} de {{ store.projects.length }} projeto(s)
          </template>
          <template v-else>
            {{ store.projects.length }} projeto(s) encontrado(s)
          </template>
        </p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openDialog">
        Novo Projeto
      </v-btn>
    </div>

    <!-- Filters -->
    <v-row v-if="!store.loading && store.projects.length > 0" dense class="mb-4">
      <v-col cols="12" sm="5" md="4">
        <v-text-field
          v-model="filterClient"
          label="Filtrar por cliente"
          prepend-inner-icon="mdi-domain"
          variant="outlined"
          density="compact"
          clearable
          hide-details
        />
      </v-col>
      <v-col cols="12" sm="5" md="4">
        <v-text-field
          v-model="filterProject"
          label="Filtrar por projeto"
          prepend-inner-icon="mdi-briefcase-outline"
          variant="outlined"
          density="compact"
          clearable
          hide-details
        />
      </v-col>
      <v-col v-if="filterClient || filterProject" cols="12" sm="2" class="d-flex align-center">
        <v-btn variant="text" size="small" prepend-icon="mdi-close-circle-outline" @click="clearFilters">
          Limpar
        </v-btn>
      </v-col>
    </v-row>

    <!-- Error banner -->
    <v-alert
      v-if="store.error"
      type="error"
      variant="tonal"
      closable
      class="mb-4"
    >
      {{ store.error }}
    </v-alert>

    <!-- Skeleton loaders -->
    <v-row v-if="store.loading" dense>
      <v-col v-for="n in 6" :key="n" cols="12" sm="6" md="4" lg="3">
        <v-skeleton-loader type="card" rounded="lg" />
      </v-col>
    </v-row>

    <!-- Empty state: no projects at all -->
    <div
      v-else-if="!store.loading && store.projects.length === 0"
      class="d-flex flex-column align-center justify-center"
      style="min-height: 360px"
    >
      <v-icon size="72" color="medium-emphasis" class="mb-4">mdi-folder-open-outline</v-icon>
      <p class="text-h6 text-medium-emphasis">Nenhum projeto ainda</p>
      <p class="text-body-2 text-medium-emphasis mb-6">Crie o primeiro projeto para começar</p>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openDialog">
        Novo Projeto
      </v-btn>
    </div>

    <!-- Empty state: filter returned nothing -->
    <div
      v-else-if="!store.loading && filteredProjects.length === 0"
      class="d-flex flex-column align-center justify-center"
      style="min-height: 240px"
    >
      <v-icon size="64" color="medium-emphasis" class="mb-4">mdi-magnify-remove-outline</v-icon>
      <p class="text-h6 text-medium-emphasis">Nenhum resultado</p>
      <p class="text-body-2 text-medium-emphasis mb-4">Nenhum projeto corresponde ao filtro aplicado</p>
      <v-btn variant="tonal" prepend-icon="mdi-close-circle-outline" @click="clearFilters">
        Limpar filtros
      </v-btn>
    </div>

    <!-- Projects grid -->
    <v-row v-else dense>
      <v-col
        v-for="p in filteredProjects"
        :key="`${p.client}/${p.project}`"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <ProjectCard
          :project="p"
          @delete="handleDelete(p.client, p.project)"
        />
      </v-col>
    </v-row>
  </v-container>

  <!-- Create dialog -->
  <v-dialog v-model="showDialog" max-width="600" persistent>
    <v-card rounded="lg">
      <v-card-title class="pt-5 px-6">Novo Projeto</v-card-title>

      <v-card-text class="px-6 pb-2">
        <v-alert v-if="formError" type="error" variant="tonal" class="mb-4" density="compact">
          {{ formError }}
        </v-alert>

        <v-row dense>
          <v-col cols="12">
            <v-text-field
              v-model="form.client"
              label="Cliente *"
              placeholder="Ex: Empresa ABC"
              variant="outlined"
              density="comfortable"
              :disabled="submitting"
              autofocus
            />
          </v-col>

          <v-col cols="12">
            <v-text-field
              v-model="form.project"
              label="Nome do Projeto *"
              placeholder="Ex: Sistema de Gestão"
              variant="outlined"
              density="comfortable"
              :disabled="submitting"
            />
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions class="px-6 pb-5 justify-end ga-2">
        <v-btn variant="text" :disabled="submitting" @click="showDialog = false">
          Cancelar
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :disabled="!isFormValid"
          :loading="submitting"
          @click="submitCreate"
        >
          Criar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
