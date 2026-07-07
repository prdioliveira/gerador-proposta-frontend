<script setup lang="ts">
import { ref } from 'vue'
import { startGoogleLogin } from '../services/auth'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const loading = ref(false)

function handleLogin() {
  loading.value = true
  startGoogleLogin(window.location.pathname + window.location.search || '/')
}
</script>

<template>
  <v-app>
    <v-main>
      <v-container class="fill-height" fluid>
        <v-row align="center" justify="center" class="fill-height ma-0">
          <v-col cols="12" sm="8" md="5" lg="4" xl="3">
            <v-card elevation="8" rounded="xl" class="pa-8">
              <div class="text-center mb-6">
                <v-icon size="40" color="primary" class="mb-3">mdi-file-document-multiple-outline</v-icon>
                <h1 class="text-h5 font-weight-medium mb-1">Gerador de Propostas</h1>
                <p class="text-body-2 text-medium-emphasis">
                  Acesso restrito a contas <strong>Squadra</strong>.
                </p>
              </div>

              <v-alert
                v-if="authStore.error"
                type="error" variant="tonal" density="compact" class="mb-4"
              >
                {{ authStore.error }}
              </v-alert>

              <v-btn
                color="primary"
                variant="flat"
                size="large"
                block
                :loading="loading"
                prepend-icon="mdi-google"
                @click="handleLogin"
              >
                Entrar com Google
              </v-btn>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>
