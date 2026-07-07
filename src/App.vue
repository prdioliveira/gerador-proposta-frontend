<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useTheme } from 'vuetify'
import { AUTH_REQUIRED_EVENT } from './services/http'
import { useAuthStore } from './stores/auth'
import LoginView from './views/LoginView.vue'

const route = useRoute()
const pageTitle = computed(() => (route.meta.title as string) ?? 'Gerador de Propostas')
const theme = useTheme()
const authStore = useAuthStore()

const showLogin = computed(() => authStore.authEnabled && !authStore.authenticated)

function handleAuthRequired() {
  authStore.markUnauthenticated()
}

async function handleLogout() {
  await authStore.logout()
}

onMounted(() => {
  const saved = localStorage.getItem('app-theme')
  if (saved === 'light' || saved === 'dark') {
    theme.global.name.value = saved
  }
  authStore.fetchStatus()
  window.addEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired)
})

onUnmounted(() => {
  window.removeEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired)
})

const navItems = [
  { title: 'Dashboards',       icon: 'mdi-view-dashboard-outline', to: '/'     },
  { title: 'Projetos',         icon: 'mdi-folder-multiple',   to: '/projetos'  },
  { title: 'Tabela de Preços', icon: 'mdi-currency-usd',      to: '/ratecard'  },
  { title: 'Margens',          icon: 'mdi-percent',            to: '/margens'   },
  { title: 'Prompts',          icon: 'mdi-text-box-edit-outline', to: '/prompts' },
  { title: 'LLMs',             icon: 'mdi-brain',              to: '/llms'      },
  { title: 'Templates',        icon: 'mdi-file-powerpoint',    to: '/templates' },
  { title: 'Roteiros',         icon: 'mdi-clipboard-list-outline', to: '/roteiros' },
  { title: 'Configurações',    icon: 'mdi-cog',                to: '/settings'  },
]
</script>

<template>
  <v-app v-if="!authStore.ready">
    <v-main>
      <div class="d-flex align-center justify-center" style="min-height: 100vh;">
        <v-progress-circular indeterminate color="primary" size="40" />
      </div>
    </v-main>
  </v-app>

  <LoginView v-else-if="showLogin" />

  <v-app v-else>
    <v-navigation-drawer permanent width="220">
      <v-list-item
        title="Gerador de Propostas"
        subtitle="v1.0"
        height="64"
        class="d-flex align-center"
      />
      <v-divider />
      <v-list density="compact" nav class="mt-2">
        <v-list-item
          v-for="item in navItems"
          :key="item.to"
          :prepend-icon="item.icon"
          :title="item.title"
          :to="item.to"
          rounded="lg"
        />
      </v-list>
    </v-navigation-drawer>

    <v-app-bar elevation="0" border="b">
      <v-app-bar-title>{{ pageTitle }}</v-app-bar-title>
      <template #append>
        <slot name="app-bar-actions" />
        <v-menu v-if="authStore.user">
          <template #activator="{ props }">
            <v-btn variant="text" v-bind="props" class="text-none">
              <v-avatar size="28" class="mr-2">
                <v-img v-if="authStore.user.picture" :src="authStore.user.picture" :alt="authStore.user.name" />
                <v-icon v-else>mdi-account-circle</v-icon>
              </v-avatar>
              {{ authStore.user.name }}
            </v-btn>
          </template>
          <v-card min-width="220">
            <v-list-item :title="authStore.user.name" :subtitle="authStore.user.email" />
            <v-divider />
            <v-list-item
              prepend-icon="mdi-logout"
              title="Sair"
              @click="handleLogout"
            />
          </v-card>
        </v-menu>
      </template>
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>
