<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const pageTitle = computed(() => (route.meta.title as string) ?? 'Gerador de Propostas')

const navItems = [
  { title: 'Projetos',      icon: 'mdi-folder-multiple', to: '/'          },
  { title: 'LLMs',          icon: 'mdi-brain',           to: '/llms'      },
  { title: 'Templates',     icon: 'mdi-file-powerpoint', to: '/templates' },
  { title: 'Configurações', icon: 'mdi-cog',             to: '/settings'  },
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
