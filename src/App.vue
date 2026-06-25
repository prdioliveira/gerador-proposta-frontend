<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useTheme } from 'vuetify'

const route = useRoute()
const pageTitle = computed(() => (route.meta.title as string) ?? 'Gerador de Propostas')
const theme = useTheme()

onMounted(() => {
  const saved = localStorage.getItem('app-theme')
  if (saved === 'light' || saved === 'dark') {
    theme.global.name.value = saved
  }
})

const navItems = [
  { title: 'Projetos',         icon: 'mdi-folder-multiple',   to: '/'          },
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
  <v-app>
    <v-navigation-drawer permanent width="220">
      <v-list-item
        title="Gerador de Propostas"
        subtitle="v1.0"
        class="py-4"
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
      </template>
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>
