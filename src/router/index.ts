import { createRouter, createWebHistory } from 'vue-router'
import ProjectListView from '../views/ProjectListView.vue'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: '/',
      component: ProjectListView,
      meta: { title: 'Projetos' },
    },
    {
      path: '/project/:client/:name',
      component: () => import('../views/ProjectDetailView.vue'),
      meta: { title: 'Detalhes do Projeto' },
    },
    {
      path: '/llms',
      component: () => import('../views/LLMView.vue'),
      meta: { title: 'Cadastro de LLMs' },
    },
    {
      path: '/templates',
      component: () => import('../views/TemplatesView.vue'),
      meta: { title: 'Gestão de Templates' },
    },
    {
      path: '/settings',
      component: () => import('../views/SettingsView.vue'),
      meta: { title: 'Configurações' },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

export default router
