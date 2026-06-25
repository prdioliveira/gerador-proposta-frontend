# gerador-proposta-frontend

Interface web do sistema de geração de propostas comerciais. SPA construída com Vue 3 + Vuetify 3, consumindo a API do backend.

---

## Visão Geral

O frontend oferece uma interface completa para:

- Gerenciar projetos por cliente
- Enviar documentos de entrada (questionários, transcrições, documentos, imagens)
- Acionar a geração de escopo técnico e proposta PPT via IA
- Conversar com os documentos do projeto em um chat contextualizado
- Consultar e editar roteiros de reunião por tipo de proposta
- Configurar LLMs, templates PPT, ratecard, margens e prompts

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

Em desenvolvimento, o Vite faz proxy automático de `/api` para o backend. Em produção, o build é servido pelo próprio backend, então essa variável não é necessária.

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

Os arquivos estáticos são gerados em `dist/`. Copie o conteúdo para o diretório `frontend/` do backend para que ele os sirva diretamente.

**Preview do build:**

```bash
npm run preview
```

---

## Deploy em Homologação

O frontend é servido como arquivos estáticos pelo backend FastAPI. O fluxo de deploy é:

1. Configure `VITE_API_URL` se necessário (geralmente não é necessário quando servido pelo backend)
2. Execute o build:
   ```bash
   npm run build
   ```
3. Copie o conteúdo de `dist/` para `frontend/` no diretório do backend:
   ```bash
   # Windows
   xcopy /E /Y dist\ ..\Criação de Agente\frontend\
   
   # Linux / macOS
   cp -r dist/* ../backend/frontend/
   ```
4. Inicie o backend — ele serve o frontend automaticamente na raiz `/`

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
  components/         ← Componentes reutilizáveis
    ChatPanel.vue       Chat com documentos do projeto
    ConfirmDialog.vue   Dialog de confirmação padrão
    GenerationPanel.vue Painel de geração de escopo e proposta
    JobStatusBadge.vue  Badge de status do job de geração
    OutcomePanel.vue    Registro de resultado de propostas
    ProfileSelector.vue Seleção de perfis profissionais
  composables/        ← Lógica reutilizável
    useJobPoller.ts     Polling de status de jobs assíncronos
  services/           ← Camada de comunicação com a API
    api.ts              Chamadas gerais de projetos e arquivos
    chat.ts             Chat com documentos
    http.ts             Instância Axios configurada
    meetingScripts.ts   Roteiros de reunião
  views/              ← Páginas (uma por rota)
    LLMView.vue         Configuração de provedores de IA
    MargensView.vue     Configuração de margens
    MeetingScriptsView.vue Roteiros de reunião
    ProfileSelector.vue Seleção de perfis
    ProjectDetailView.vue Detalhes e abas do projeto
    ProjectListView.vue Lista de projetos
    PromptTemplatesView.vue Editor de prompts
    RatecardView.vue    Tabela de preços
    SettingsView.vue    Configurações gerais
    TemplatesView.vue   Templates PPT
  router/
    index.ts            Definição de rotas
  App.vue             Layout principal com navegação lateral
  main.ts             Ponto de entrada
```

---

## Rotas

| Rota | View | Descrição |
|---|---|---|
| `/` | ProjectListView | Lista de projetos |
| `/project/:client/:name` | ProjectDetailView | Detalhes do projeto com abas |
| `/ratecard` | RatecardView | Tabela de preços (perfis e taxas) |
| `/margens` | MargensView | Margens de lucro |
| `/prompts` | PromptTemplatesView | Templates de prompt de IA |
| `/llms` | LLMView | Provedores e modelos de IA |
| `/templates` | TemplatesView | Templates PowerPoint |
| `/roteiros` | MeetingScriptsView | Roteiros de reunião |
| `/settings` | SettingsView | Configurações gerais |

---

## Abas do Projeto

A tela de detalhes do projeto (`/project/:client/:name`) contém as abas:

| Aba | Descrição |
|---|---|
| **Informações** | Metadados, contexto e detalhes do projeto |
| **Arquivos** | Upload e listagem de arquivos por pasta de entrada |
| **Perfis** | Seleção de perfis profissionais para a proposta |
| **Gerar Proposta** | Geração de escopo e proposta PPT, histórico de arquivos |
| **Resultados** | Registro de propostas (aprovadas, perdidas, em negociação) |
| **Chat** | Conversa contextualizada com os documentos do projeto |
