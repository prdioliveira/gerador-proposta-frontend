import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import ProjectListView from '../views/ProjectListView.vue'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: '/',
      component: DashboardView,
      meta: { title: 'Dashboards' },
    },
    {
      path: '/projetos',
      component: ProjectListView,
      meta: { title: 'Projetos' },
    },
    {
      path: '/project/:client/:name',
      component: () => import('../views/ProjectDetailView.vue'),
      meta: { title: 'Detalhes do Projeto' },
    },
    {
      path: '/ratecard',
      component: () => import('../views/RatecardView.vue'),
      meta: { title: 'Tabela de Preços' },
    },
    {
      path: '/margens',
      component: () => import('../views/MargensView.vue'),
      meta: { title: 'Margens de Lucro' },
    },
    {
      path: '/prompts',
      component: () => import('../views/PromptTemplatesView.vue'),
      meta: { title: 'Templates de Prompt' },
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
      path: '/roteiros',
      component: () => import('../views/MeetingScriptsView.vue'),
      meta: { title: 'Roteiros de Reunião' },
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
