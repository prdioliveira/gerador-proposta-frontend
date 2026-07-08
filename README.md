# gerador-proposta-frontend

Interface web do sistema de geração de propostas comerciais. SPA construída com Vue 3 + Vuetify 3, consumindo a API do backend.

---

## Visão Geral

O frontend oferece uma interface completa para:

- Acompanhar indicadores de propostas em um **Dashboard** (taxa de conversão, cobertura de desfecho, distribuição por status, valor aprovado)
- Gerenciar projetos por cliente
- Enviar documentos de entrada (questionários, transcrições, documentos, imagens)
- Acionar a geração de escopo técnico e proposta PPT via IA, com opção de **interromper** uma geração em andamento
- Registrar o desfecho de cada proposta (aprovada, perdida, em negociação, pendente)
- Conversar com os documentos do projeto em um chat contextualizado
- Consultar roteiros de reunião por tipo de proposta
- Configurar LLMs, templates PPT, ratecard, margens e prompts (prompts atualmente em modo **somente leitura** — ver [Notas](#notas))

---

## Pré-requisitos

- Node.js 18+
- npm 9+

---

## Instalação

```bash
npm install
```

---

## Configuração

Crie um arquivo `.env` na raiz do projeto (opcional):

```env
# URL da API backend (padrão: http://localhost:8000)
VITE_API_URL=http://localhost:8000
```

Em desenvolvimento, o Vite faz proxy automático de `/api` para o backend. Em produção, o frontend é hospedado separadamente do backend, então `VITE_API_URL` deve apontar para a URL pública da API no ambiente de destino.

---

## Como Rodar

**Desenvolvimento** (com hot-reload e proxy automático para o backend):

```bash
npm run dev
```

Acesse em: `http://localhost:5173`

> O backend precisa estar rodando em `http://localhost:8000` (ou no endereço definido em `VITE_API_URL`).

**Build para produção:**

```bash
npm run build
```

Os arquivos estáticos são gerados em `dist/`, prontos para deploy no hosting usado pelo frontend (o backend não serve mais esses arquivos).

> Como a aplicação usa `createWebHistory` (rotas sem `#`), o servidor/host que for servir `dist/` precisa redirecionar qualquer caminho desconhecido para `index.html` (fallback de SPA) — senão, acessar uma rota interna diretamente pela URL (ou dar F5 nela) retorna 404 em vez de carregar o app.

**Preview do build:**

```bash
npm run preview
```

---

## Stack

| Tecnologia | Versão | Uso |
|---|---|---|
| Vue 3 | ^3.5 | Framework principal |
| Vuetify 3 | ^3.12 | Componentes de UI (Material Design) |
| Vite | ^8.0 | Build tool e dev server |
| TypeScript | ~6.0 | Tipagem estática |
| Vue Router | ^4.6 | Roteamento SPA |
| Pinia | ^3.0 | Gerenciamento de estado |
| Axios | ^1.18 | Chamadas HTTP para a API |
| marked | ^18.0 | Renderização de Markdown |
| DOMPurify | ^3.4 | Sanitização de HTML (segurança XSS) |
| @mdi/font | ^7.4 | Ícones Material Design |

---

## Estrutura do Projeto

```
src/
  components/           ← Componentes reutilizáveis
    ChatPanel.vue         Chat com documentos do projeto
    ConfirmDialog.vue     Dialog de confirmação padrão
    FileUploader.vue      Upload/drag-drop de arquivos por pasta
    GenerationPanel.vue   Geração de escopo/proposta (com botão de interromper)
    JobStatusBadge.vue    Badge de status do job de geração (inclui cancelando/cancelado)
    OutcomePanel.vue      Registro de resultado de propostas
    ProfileSelector.vue   Seleção de perfis profissionais
    ProjectCard.vue       Card de projeto na listagem
  composables/          ← Lógica reutilizável
    useJobPoller.ts        Polling de status de job assíncrono + cancelamento
  services/             ← Camada de comunicação com a API (um arquivo por domínio)
    api.ts                 Barrel: reexporta todos os serviços abaixo
    auth.ts                Login Google / sessão (ver Notas)
    chat.ts                Chat com documentos
    config.ts              Configurações gerais da aplicação
    files.ts               Download de arquivos e pacotes .zip
    generation.ts           Geração de documentação/proposta e cancelamento de job
    http.ts                 Instância Axios (withCredentials + interceptor de 401)
    llm.ts                  Provedores e modelos de IA
    margins.ts              Margens de lucro
    meetingScripts.ts       Roteiros de reunião
    outcomes.ts             Desfechos de propostas e resumo agregado (dashboard)
    projects.ts             Projetos e perfis selecionados
    prompts.ts              Catálogo e templates de prompt
    ratecard.ts             Tabela de preços
    templates.ts            Templates PowerPoint
  stores/               ← Estado global (Pinia)
    auth.ts                Sessão do usuário (ver Notas)
    projects.ts             Lista de projetos
  types/                ← Tipos TypeScript, um arquivo por domínio (espelham os services)
  views/                ← Páginas (uma por rota)
    DashboardView.vue      Indicadores de propostas
    LLMView.vue             Configuração de provedores de IA
    LoginView.vue           Tela de login Google (ver Notas)
    MargensView.vue         Configuração de margens
    MeetingScriptsView.vue  Roteiros de reunião
    ProjectDetailView.vue   Detalhes e abas do projeto
    ProjectListView.vue     Lista de projetos
    PromptTemplatesView.vue Templates de prompt (somente leitura)
    RatecardView.vue        Tabela de preços
    SettingsView.vue        Configurações gerais
    TemplatesView.vue       Templates PPT
  router/
    index.ts               Definição de rotas
  plugins/
    vuetify.ts              Tema (light/dark) e ícones
  App.vue                 Layout principal: navegação lateral + gate de autenticação
  main.ts                 Ponto de entrada
```

---

## Rotas

| Rota | View | Descrição |
|---|---|---|
| `/` | DashboardView | Indicadores de propostas (tela inicial) |
| `/projetos` | ProjectListView | Lista de projetos |
| `/project/:client/:name` | ProjectDetailView | Detalhes do projeto com abas |
| `/ratecard` | RatecardView | Tabela de preços (perfis e taxas) |
| `/margens` | MargensView | Margens de lucro |
| `/prompts` | PromptTemplatesView | Templates de prompt de IA (somente leitura) |
| `/llms` | LLMView | Provedores e modelos de IA |
| `/templates` | TemplatesView | Templates PowerPoint |
| `/roteiros` | MeetingScriptsView | Roteiros de reunião |
| `/settings` | SettingsView | Configurações gerais |

---

## Abas do Projeto

A tela de detalhes do projeto (`/project/:client/:name`) contém as abas:

| Aba | Descrição |
|---|---|
| **Arquivos do Projeto** | Upload e listagem de arquivos por pasta de entrada |
| **Informações Complementares** | Metadados, perfis selecionados e contexto do projeto |
| **Gerar Proposta** | Geração de escopo e proposta PPT (com botão de interromper), histórico de arquivos |
| **Desfecho** | Registro de propostas (aprovadas, perdidas, em negociação, pendentes) |
| **Chat** | Conversa contextualizada com os documentos do projeto |

---

## Notas

- **Prompts somente leitura**: a tela `/prompts` está temporariamente travada para edição (constante `READ_ONLY` no topo de `PromptTemplatesView.vue`). A leitura do conteúdo continua disponível; criar/editar/ativar/excluir versões fica oculto até a flag ser desligada.
- **Login Google (`services/auth.ts`, `stores/auth.ts`, `views/LoginView.vue`)**: o frontend tem suporte pronto para autenticação via Google, incluindo o gate em `App.vue` (`GET /api/auth/me` no carregamento, redirecionamento para `LoginView` quando necessário, logout, e reação a respostas `401 AUTH_REQUIRED` de qualquer chamada). Esse fluxo só ativa a tela de login se o backend responder `authEnabled: true`; caso os endpoints `/api/auth/*` não existam na versão atual do backend, a aplicação segue funcionando normalmente sem exigir login.
