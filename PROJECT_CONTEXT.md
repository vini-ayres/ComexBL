# ComexBL — Contexto do Projeto (Handoff)

> Documento de continuidade gerado em **2026-07-15**.  
> Última atualização: **2026-07-15** — consolidação da persistência (schema completo), Dashboard operacional, persistência Apoio Humano e integrações frontend correspondentes.

---

# Visão Geral

## Objetivo do sistema

**ComexBL** é um sistema corporativo para **consulta, validação e conciliação de Bill of Lading (BL)** no contexto de Comex. Os documentos são processados externamente via **OCR (n8n)** e persistidos em um **banco SQL Server local** (`DB_OCR_FCA`). A aplicação permite revisão humana, comparação com o **GlobalSys** (SQL Server externo) e gestão operacional do fluxo de BLs Master/House.

## Escopo da aplicação

| Área | Descrição |
|------|-----------|
| **Operação** | Dashboard, BL não encontrado, Apoio Humano, Divergências, Processos finalizados |
| **Administração** | Usuários, RBAC, Auditoria, consulta BL Master/House, configurações LDAP/OneDrive/Banco |
| **Integrações** | Banco local (Prisma), GlobalSys (futuro), LDAP (futuro), OneDrive/Microsoft Graph (futuro) |

## Arquitetura adotada

Monorepo com **frontend SPA** e **backend API** separados:

```
┌─────────────────────┐     HTTP (proxy /api)     ┌─────────────────────┐
│  Frontend (Vite)    │ ────────────────────────► │  Backend (Express)  │
│  React + TS         │                           │  Node.js + TS         │
│  Porta 5173 (dev)   │                           │  Porta 3333           │
└─────────────────────┘                           └──────────┬──────────┘
                                                               │
                                                               ▼
                                                    ┌─────────────────────┐
                                                    │  SQL Server         │
                                                    │  DB_OCR_FCA         │
                                                    │  (CAS-N-062...)     │
                                                    └─────────────────────┘
```

**Backend — camadas (SOLID):**

```
Routes → Controllers → Services → Repositories → Prisma Client
                ↓
           Mappers (DTOs)
                ↓
         Middlewares / Errors / Config
```

**Separação de dados:**

- **`BL_Master` / `BL_House`**: alimentados pelo OCR/n8n — somente leitura na app.
- **`BL_Workflow` / `BL_CampoRevisao` / `BL_HistoricoAlteracao`**: fluxo operacional, revisões e histórico por BL (**em uso** via Apoio Humano e Dashboard).
- **`BL_Divergencia` / `BL_DivergenciaCampo` / `BL_ProcessoEtapa` / `BL_ConsultaGlobalSys`**: schema criado, API ainda não implementada.
- **`APP_User` / `APP_Role` / `APP_Permission` / `APP_AdGroup` / `APP_AuditLog` / `APP_IntegrationConfig`**: identidade, RBAC, auditoria e configs (**seed de referência**; API admin ainda não implementada).

---

# Stack

## Tecnologias utilizadas

### Frontend
- React 18 + TypeScript
- Vite 6
- Tailwind CSS 3
- Radix UI (padrão shadcn/ui)
- TanStack Table, Framer Motion, Lucide Icons
- React Router 6, Sonner (toasts)
- Deploy alvo: **Cloudflare Pages** (SPA estática em `dist/`)

### Backend
- Node.js + TypeScript (ESM)
- Express 5
- Prisma ORM 6 (SQL Server)
- dotenv, tsx (dev)

### Banco de dados
- **Microsoft SQL Server**
- Banco: `DB_OCR_FCA`
- Servidor: `CAS-N-062.abainfra.local:1433`

## Principais dependências

| Pacote | Uso |
|--------|-----|
| `express` | API HTTP |
| `@prisma/client` | ORM / acesso ao SQL Server |
| `dotenv` | Variáveis de ambiente |
| `tsx` | Execução TypeScript em dev |
| `react`, `react-router-dom` | UI SPA |
| `vite` | Build e dev server com proxy |
| `wrangler` | Cloudflare Pages dev/deploy |

## Estrutura de pastas

### Raiz
```
ComexBL/
├── src/                    # Frontend React
├── backend/                # API Node.js
├── public/                 # Assets estáticos
├── dist/                   # Build frontend (gerado)
├── package.json            # Scripts raiz (dev, dev:api, build, deploy)
├── vite.config.ts
├── .env.development        # VITE_API_URL=/api
├── .env.sandbox            # VITE_API_URL=http://localhost:3333
└── PROJECT_CONTEXT.md      # Este arquivo
```

### Frontend (`src/`)
```
src/
├── components/
│   ├── layout/             # AppShell, Sidebar, Topbar, ProtectedRoute
│   ├── shared/             # DataTable, DocumentViewer, StatusBadge, KpiCard
│   └── ui/                 # Componentes shadcn (button, card, tabs, etc.)
├── pages/
│   ├── Dashboard.tsx         # ✅ Integrado à API
│   ├── ApoioHumano.tsx       # ✅ Integrado à API (leitura + persistência)
│   ├── Divergencia.tsx     # ❌ Mock
│   ├── BLNaoEncontrado.tsx # ❌ Mock
│   ├── ProcessoFinalizado.tsx
│   └── admin/
│       ├── BLDatabase.tsx      # ✅ Integrado à API
│       ├── DatabaseConfig.tsx  # ✅ Parcial (banco local real)
│       ├── Usuarios.tsx        # ❌ Mock
│       ├── RBAC.tsx            # ❌ Mock
│       ├── Auditoria.tsx       # ❌ Mock
│       ├── LdapConfig.tsx      # ❌ Mock
│       └── OneDriveConfig.tsx  # ❌ Mock
├── lib/
│   ├── api/
│   │   ├── client.ts       # apiGet, apiPost, ApiError, API_BASE
│   │   ├── bl.ts
│   │   ├── dashboard.ts
│   │   ├── health.ts
│   │   ├── apoio-humano.ts
│   │   └── types.ts
│   └── utils.ts
├── hooks/useAuth.tsx       # Auth simulada (localStorage)
├── types/index.ts          # Tipos de domínio do frontend
└── data/mockData.ts        # Dados de demonstração (ainda usado em várias telas)
```

### Backend (`backend/`)
```
backend/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts             # Roles, permissões, AD groups, usuário teste (não altera OCR)
│   └── migrations/
│       ├── 20260708185924_comex_bl/
│       ├── 20260708194500_remove_legacy_tables_and_add_app_tables/
│       └── 20260715120000_consolidate_app_persistence/
├── scripts/
│   ├── run-prisma.ts       # Carrega env.ts antes do Prisma CLI
│   └── test-connection.ts
├── src/
│   ├── config/
│   │   ├── env.ts          # Monta DATABASE_URL dinamicamente
│   │   └── logger.ts
│   ├── prisma/client.ts    # Singleton Prisma + datasource explícita
│   ├── errors/AppError.ts  # AppError, NotFoundError, DatabaseError, BadRequestError
│   ├── types/
│   │   ├── bl.types.ts
│   │   ├── apoio-humano.types.ts
│   │   └── dashboard.types.ts
│   ├── mappers/
│   │   ├── bl.mapper.ts
│   │   ├── apoio-humano.mapper.ts
│   │   └── dashboard.mapper.ts
│   ├── repositories/
│   │   ├── database.repository.ts
│   │   ├── bl.repository.ts
│   │   ├── apoio-humano.repository.ts
│   │   └── dashboard.repository.ts
│   ├── services/
│   │   ├── health.service.ts
│   │   ├── bl.service.ts
│   │   ├── apoio-humano.service.ts
│   │   └── dashboard.service.ts
│   ├── controllers/
│   │   ├── health.controller.ts
│   │   ├── bl.controller.ts
│   │   ├── apoio-humano.controller.ts
│   │   └── dashboard.controller.ts
│   ├── routes/
│   │   ├── index.ts
│   │   ├── health.routes.ts
│   │   └── bl.routes.ts
│   ├── middlewares/
│   │   ├── cors.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── request-logger.middleware.ts
│   ├── utils/
│   │   ├── pagination.ts
│   │   └── dashboard-query.ts
│   ├── app.ts
│   └── server.ts
├── .env                    # Credenciais reais (NÃO commitar)
└── .env.example
```

---

# Configurações

## Variáveis de ambiente

### Backend (`backend/.env`)

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `PORT` | Porta da API | `3333` |
| `NODE_ENV` | Ambiente | `development` |
| `DB_SERVER` | Host SQL Server | `CAS-N-062.abainfra.local` |
| `DB_PORT` | Porta SQL Server | `1433` |
| `DB_USER` | Usuário SQL | `sa` |
| `DB_PASSWORD` | Senha (**usar aspas se tiver `#`, `!`, `@`, `*`)** | `"!@#senha*123"` |
| `DB_NAME` | Nome do banco | `DB_OCR_FCA` |
| `DB_ENCRYPT` | Criptografia TLS | `false` |
| `DB_TRUST_SERVER_CERTIFICATE` | Confiar certificado | `true` |
| `DB_CONNECTION_TIMEOUT` | Timeout conexão (ms) | `30000` |
| `DB_REQUEST_TIMEOUT` | Timeout request (ms) | `30000` |
| `CORS_ORIGIN` | Origem CORS (opcional) | `*` (padrão) |

> `DATABASE_URL` é **montada automaticamente** em `backend/src/config/env.ts`. Não é necessário defini-la manualmente no `.env`.

### Frontend

| Arquivo | Variável | Valor |
|---------|----------|-------|
| `.env.development` | `VITE_API_URL` | `/api` (proxy Vite → `localhost:3333`) |
| `.env.sandbox` | `VITE_API_URL` | `http://localhost:3333` (wrangler pages dev) |

## Configurações realizadas

### Express
- JSON body parser
- CORS habilitado (`cors.middleware.ts`)
- Request logger (método, URL, status, duração)
- Error handler global (`AppError` + erros não tratados)
- 404 handler
- Fail-fast na inicialização se banco indisponível

### Prisma / SQL Server
- Provider: `sqlserver`
- Client singleton com `datasources.db.url` explícita (garante URL montada por `env.ts`)
- Senhas com caracteres especiais: escape com **chaves `{}`** (padrão JDBC/MSSQL), **não** `encodeURIComponent`
- Prisma CLI via `scripts/run-prisma.ts` (carrega `env.ts` antes de executar)

### Vite
- Proxy `/api` → `http://localhost:3333` (rewrite remove prefixo `/api`)
- Alias `@` → `src/`

---

# Banco de Dados

## Estado atual do Prisma

- Schema consolidado com **19 modelos** (OCR + operacional BL + identidade/RBAC + auditoria)
- Migration `20260715120000_consolidate_app_persistence` aplicada
- Seed ativo: popula roles, permissões, grupos AD, usuário `teste` e configs de integração (**não altera** `BL_Master`/`BL_House`)
- Índices únicos filtrados em `BL_CampoRevisao` (`Master+CampoKey` / `House+CampoKey`)
- `BL_Workflow.ResponsavelUserId` substitui coluna legada `Responsavel` (texto)

## Modelos existentes

### Entidades OCR (leitura)

#### `BlMaster` → `BL_Master`
Campos principais: `MasterNumber`, `VesselName`, `Voyage`, portos, embarcador, consignatário, carrier, container, peso, volumes, `Status` (boolean), `ItemId`, `DriveId` (OneDrive).

#### `BlHouse` → `BL_House`
Campos principais: `HouseNumber`, `BLMasterId`, embarcador, consignatário, notify, mercadoria (`ItemName`), portos, container, lacres, peso, `Status` (boolean), `ItemId`, `DriveId`.

> `Status` boolean no OCR: `false` = pendente/processando, `true` = finalizado (mapeado no backend para `processando` / `finalizado`).

### Entidades da aplicação — operacional BL

#### `BlWorkflow` → `BL_Workflow` ✅ **em uso**
Status operacional: `apoio_humano`, `divergencia`, `processando`, `finalizado`, `nao_encontrado`. Vinculado a Master **ou** House. `ResponsavelUserId` → `APP_User`.

#### `BlCampoRevisao` → `BL_CampoRevisao` ✅ **em uso**
Revisões do Apoio Humano: `CampoKey`, `ValorRecebido`, `ValorManual`, `Confianca`, `Status`, `UpdatedByUserId`.

#### `BlHistoricoAlteracao` → `BL_HistoricoAlteracao` ✅ **em uso**
Trilha de alterações por BL: usuário, campo, valor antes/depois, ação, timestamp.

#### `BlDivergencia` / `BlDivergenciaCampo` → `BL_Divergencia` / `BL_DivergenciaCampo`
Comparação BL Final x GlobalSys (schema criado, API pendente).

#### `BlProcessoEtapa` → `BL_ProcessoEtapa`
Timeline do processo (schema criado, API pendente).

#### `BlConsultaGlobalSys` → `BL_ConsultaGlobalSys`
Tentativas de consulta ao GlobalSys / BL não encontrado (schema criado, API pendente).

### Entidades da aplicação — identidade, RBAC e sistema

#### `AppUser` → `APP_User`
Usuários sincronizados (LDAP futuro). Seed: login `teste`.

#### `AppRole` / `AppPermission` / `AppRolePermission` / `AppUserRole`
RBAC: Administrador, Supervisor, Operador, Auditor + 6 permissões.

#### `AppAdGroup` / `AppUserAdGroup`
Grupos AD mapeados a perfis (`GG_COMEX_*`).

#### `AppAuditLog` → `APP_AuditLog`
Auditoria global do sistema (schema criado, API pendente).

#### `AppIntegrationConfig` → `APP_IntegrationConfig`
Configs LDAP, OneDrive e GlobalSys em JSON (schema criado, API pendente).

## Relacionamentos

```
BlMaster (1) ──────< (N) BlHouse
BlMaster (1) ──────  (0..1) BlWorkflow ──> AppUser (ResponsavelUserId)
BlHouse  (1) ──────  (0..1) BlWorkflow ──> AppUser
BlMaster/House (1) ──< (N) BlCampoRevisao ──> AppUser (UpdatedByUserId)
BlMaster/House (1) ──< (N) BlHistoricoAlteracao ──> AppUser (UserId)
BlMaster/House (1) ──< (N) BlDivergencia / BlProcessoEtapa / BlConsultaGlobalSys

AppUser (N) ──< (N) AppRole          [via AppUserRole]
AppRole (N) ──< (N) AppPermission    [via AppRolePermission]
AppAdGroup (N) ──> AppRole           [DefaultRoleId]
AppUser (N) ──< (N) AppAdGroup       [via AppUserAdGroup]
AppUser (1) ──< (N) AppAuditLog
```

## Migrations realizadas

| Migration | Descrição |
|-----------|-----------|
| `20260708185924_comex_bl` | Criação inicial: `BL_Master`, `BL_House` + tabelas legadas TB_* |
| `20260708194500_remove_legacy_tables_and_add_app_tables` | Remove TB_*, FK Master↔House, cria `BL_Workflow`, `BL_CampoRevisao`, `BL_HistoricoAlteracao` |
| `20260715120000_consolidate_app_persistence` | Schema completo: APP_* (User/Role/RBAC/Audit/Integration), BL_Divergencia, BL_ProcessoEtapa, BL_ConsultaGlobalSys; ajustes em BL_Workflow e BL_CampoRevisao |

**Comandos Prisma (executar em `backend/`):**
```bash
npm run prisma:migrate    # dev (cria migration)
npm run prisma:deploy     # produção (aplica migrations)
npm run prisma:generate   # regenera client
npm run prisma:pull       # introspect banco existente
npm run prisma:seed      # dados de referência (roles, usuário teste)
npm run test:db           # testa conexão
```

---

# Funcionalidades Implementadas

> **Atualização 2026-07-15:** consolidação da persistência (19 modelos), Dashboard operacional, Apoio Humano com persistência (`POST`), fila filtrada e primeiro endpoint de escrita.

## Resumo desta sessão

### Consolidação da persistência
- Schema Prisma com **19 modelos**; migration `20260715120000_consolidate_app_persistence` aplicada
- Seed: 4 roles, 6 permissões, 4 grupos AD, usuário `teste`, configs ldap/onedrive/globalsys_db

### Dashboard operacional
- Backend: `DashboardService`, `DashboardRepository` (CTE SQL), mappers e validação de query
- Frontend: `Dashboard.tsx` com KPIs, tabela paginada, filtros server-side
- Status: `BL_Workflow.Status` se existir; senão deriva do OCR

### Apoio Humano — leitura e persistência
- Fila filtrada (1 BL/página); merge OCR + `BL_CampoRevisao` + `BL_HistoricoAlteracao`
- `POST /bl/apoio-humano/:tipo/:id/campos` — upsert revisões, histórico condicional, workflow
- BL concluído sai da fila (`completed: true` → workflow `processando`)

## Backend — Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/health` | Status da API + conexão banco (encrypt, latência) |
| `GET` | `/bl/stats` | Contagem de registros Master/House |
| `GET` | `/bl/masters` | Lista paginada de BL Master (`page`, `pageSize`, `status`, `search`) |
| `GET` | `/bl/masters/:id` | Detalhe Master + houses + container |
| `GET` | `/bl/houses` | Lista paginada de BL House (`masterId`, `status`, `search`) |
| `GET` | `/bl/houses/:id` | Detalhe House + master + containers |
| `GET` | `/bl/dashboard` | KPIs + listagem operacional (`page`, `pageSize`, `status`, `tipo`, `search`) |
| `GET` | `/bl/dashboard/kpis` | Somente KPIs operacionais |
| `GET` | `/bl/dashboard/items` | Somente listagem operacional paginada |
| `GET` | `/bl/apoio-humano` | Fila Apoio Humano filtrada, 1 BL/página (`page`, `pageSize=1`) |
| `POST` | `/bl/apoio-humano/:tipo/:id/campos` | Persiste revisões (`master`/`house`), histórico e workflow |

## Backend — Middlewares

| Middleware | Função |
|------------|--------|
| `corsMiddleware` | CORS para frontend |
| `requestLogger` | Log de requisições |
| `errorHandler` | Tratamento global de erros |
| `notFoundHandler` | 404 padronizado |

## Backend — Services

| Service | Responsabilidade |
|---------|------------------|
| `HealthService` | Health check + validação de conexão |
| `BlService` | CRUD read-only Master/House + stats |
| `DashboardService` | KPIs + listagem operacional via CTE SQL (Master/House + Workflow) |
| `ApoioHumanoService` | Fila filtrada, merge revisões/histórico, persistência de campos |

## Backend — Repositories

| Repository | Responsabilidade |
|------------|------------------|
| `DatabaseRepository` | `SELECT 1` para health |
| `BlMasterRepository` / `BlHouseRepository` | Queries Prisma Master/House |
| `DashboardRepository` | CTE operacional + KPIs via SQL raw |
| `ApoioHumanoRepository` | Fila filtrada, upsert revisões/histórico/workflow (transação) |

## Backend — Mappers

| Mapper | Função |
|--------|--------|
| `bl.mapper.ts` | Prisma `BlMaster`/`BlHouse` → DTOs camelCase para API |
| `dashboard.mapper.ts` | KPIs + itens operacionais; pendência padrão por status |
| `apoio-humano.mapper.ts` | Campos OCR + confiança heurística; merge revisões; histórico |

## Frontend — Integração API (concluída)

| Tela | Rota | Status |
|------|------|--------|
| Dashboard | `/` | ✅ KPIs + tabela via `/bl/dashboard` |
| Apoio Humano | `/apoio-humano` | ✅ Leitura + persistência (`POST` campos); fila filtrada |
| BL Database | `/admin/bl-database` | ✅ Dados reais (`/bl/masters`) |
| Banco de Dados | `/admin/banco-dados` | ✅ Card banco local real (`/health`, `/bl/stats`); GlobalSys mock |

## Frontend — Ainda em mock (`src/data/mockData.ts`)

| Tela | Rota |
|------|------|
| BL Não Encontrado | `/bl-nao-encontrado` |
| Divergência | `/divergencia` |
| Processo Finalizado | `/processo-finalizado` |
| Usuários | `/admin/usuarios` |
| RBAC | `/admin/rbac` |
| Auditoria | `/admin/auditoria` |
| LDAP Config | `/admin/ldap` |
| OneDrive Config | `/admin/onedrive` |
| Login | `/login` (auth simulada em `useAuth.tsx`) |

## Fluxos implementados

1. **Health check**: API valida SQL Server na inicialização → `GET /health`
2. **Consulta BL**: Frontend lista Masters → seleciona → carrega detalhe com Houses
3. **Dashboard operacional**: KPIs + listagem via `BL_Workflow`/`BL_Master`/`BL_House` → filtros server-side
4. **Apoio Humano — consulta**: Fila filtrada (somente BLs com campos `pendente`) → merge OCR + `BL_CampoRevisao` → histórico de `BL_HistoricoAlteracao`
5. **Apoio Humano — persistência**: Editar/confirmar campos → **Salvar correções** → upsert `BL_CampoRevisao` + histórico + `BL_Workflow` (usuário `teste`) → BL concluído sai da fila (`Status: processando`)

---

# Decisões Técnicas

## Arquiteturais

1. **Monorepo com backend separado** em `backend/` — frontend permanece SPA Vite, API Express independente.
2. **Camadas SOLID** no backend: Routes → Controllers → Services → Repositories.
3. **DTOs + Mappers** separam modelo Prisma (PascalCase, schema OCR) da API (camelCase, frontend-friendly).
4. **Duas famílias de tabelas**: OCR (`BL_Master`/`BL_House`) somente leitura na app; tabelas `BL_*` da aplicação para workflow, revisões e histórico (**em uso** via Dashboard e Apoio Humano).
5. **Fail-fast**: API não sobe se banco indisponível.
6. **Módulos ativos**: Health, BL (read), Dashboard, Apoio Humano (read + write).

## Padrões adotados

- **ESM** (`"type": "module"`) em frontend e backend
- **Injeção via construtor** nos services
- **Paginação padronizada**: `{ data, pagination: { page, pageSize, total, totalPages } }`
- **Erros operacionais**: `AppError`, `NotFoundError`, `DatabaseError`, `BadRequestError`
- **Prisma singleton** com cache em dev (`globalThis`)
- **API client** centralizado: `src/lib/api/client.ts` com `apiGet<T>()` e `apiPost<T>()`
- **BadRequestError** para validação de query params (Dashboard)

## Convenções de código

- Backend: arquivos `.ts`, imports com sufixo `.js` (ESM NodeNext)
- Frontend: alias `@/` para `src/`
- Prisma models: PascalCase campos (reflete banco OCR); API responses: camelCase
- Logs: `[timestamp] [LEVEL] message` via `logger.ts`
- Senhas `.env`: aspas duplas obrigatórias quando contêm `#` (comentário dotenv)

## Conexão SQL Server (crítico)

```typescript
// CORRETO para Prisma SQL Server — escape com chaves:
password={!@#senha*0408}

// INCORRETO — encodeURIComponent envia literal %21%40%23...:
password=%21%40%23senha%2A0408
```

Implementado em `backend/src/config/env.ts` → `escapeSqlServerValue()`.

## Decisões desta sessão (2026-07-15)

1. **Schema completo antes das features** — modelar todas as tabelas `BL_*` e `APP_*` em uma migration consolidada (`20260715120000_consolidate_app_persistence`) antes de implementar módulos de negócio.
2. **Seed de referência sem tocar OCR** — `seed.ts` popula roles, permissões, grupos AD, usuário `teste` e configs; não insere nem altera `BL_Master`/`BL_House`.
3. **Dashboard via CTE SQL** — listagem operacional une Master/House com `BL_Workflow` e `APP_User` em query raw (performance + status derivado quando workflow ausente).
4. **Primeiro endpoint de escrita** — `POST /bl/apoio-humano/:tipo/:id/campos` com transação Prisma (revisões + histórico + workflow).
5. **Usuário interim para ações** — `APP_User` login `teste` (seed) como `UpdatedByUserId`/`ResponsavelUserId` até LDAP real.
6. **Fila Apoio Humano filtrada** — candidatos com `BL_Workflow` NULL ou `Status = 'apoio_humano'`; entrada só se houver campos `pendente` após merge OCR + revisões.
7. **Save sempre upserta todos os campos** — histórico registrado apenas quando valor muda vs. banco; BL concluído (`completed: true`) quando nenhum campo pendente → workflow `processando`.
8. **Confiança OCR heurística** — mapper calcula confiança por regra (não vem do banco); campos com confiança ≥ 80% nascem `confirmado` e não entram na fila.

---

# Pendências

## Funcionalidades não implementadas

- [x] ~~**Persistência Apoio Humano**~~ — `BL_CampoRevisao`, `BL_HistoricoAlteracao`, `BL_Workflow`
- [x] ~~**Dashboard**~~ — KPIs e lista operacional via API
- [ ] **Divergência** — comparação BL Final x GlobalSys (`BL_Divergencia`, `BL_DivergenciaCampo`)
- [ ] **BL Não Encontrado** — fila e ações (`BL_ConsultaGlobalSys`)
- [ ] **Processo Finalizado** — timeline e resumo (`BL_ProcessoEtapa`)
- [ ] **Autenticação LDAP** real
- [ ] **RBAC / Usuários / Auditoria** com backend (`APP_*`)
- [ ] **Integração GlobalSys** (SQL Server externo, somente leitura)
- [ ] **Integração OneDrive** (Microsoft Graph)
- [ ] **Job/trigger OCR** — criar `BL_Workflow` automaticamente ao inserir BL
- [ ] **Validação de entrada** (Zod) nos endpoints POST
- [ ] **Testes** (unitários, integração, e2e)

## Melhorias futuras

- Substituir confiança heurística por dados reais de OCR (se disponíveis no banco)
- WebSocket ou polling no Dashboard
- Autenticação JWT/sessão na API (substituir usuário interim `teste`)
- Documentação OpenAPI/Swagger
- CI/CD para backend
- Endpoint dedicado `GET /bl/workflow` (hoje workflow consultado via Dashboard e Apoio Humano)

## Bugs / limitações conhecidas

| Limitação | Detalhe |
|-----------|---------|
| `prisma generate` EPERM | Pode falhar com API rodando (DLL bloqueada) — parar `dev:api` antes de gerar |
| Confiança OCR heurística | Calculada no mapper; não reflete score real do OCR |
| BLs 100% confirmados OCR | Campos com confiança ≥ 80% não entram na fila Apoio Humano, mesmo sem workflow |
| Auth simulada | Login `teste`/`teste123` em `useAuth.tsx`; backend usa `APP_User` login `teste` para ações |
| GlobalSys mock | Tela Banco de Dados mostra card GlobalSys com dados fictícios |
| `Status` boolean vs enum | OCR usa `bit`; app usa enum operacional — mapeamento parcial no Dashboard |
| Containers inline | Container em colunas do Master/House, não em tabela separada |
| `dev:sandbox` (porta 3000) | Requer rebuild com `VITE_API_URL=http://localhost:3333` e API rodando |
| Tabelas schema-only | `BL_Divergencia`, `BL_ProcessoEtapa`, `BL_ConsultaGlobalSys`, `APP_AuditLog`, `APP_IntegrationConfig` sem API |

---

# Próximas Etapas

Lista priorizada para a próxima conversa:

### Prioridade 1 — Divergência
1. Service/repository para `BL_Divergencia` + `BL_DivergenciaCampo`
2. Endpoint de listagem e detalhe de divergências
3. Conectar tela **Divergência** (substituir `mockData.ts`)
4. Integração GlobalSys quando credenciais disponíveis

### Prioridade 2 — BL Não Encontrado
5. Service/repository para `BL_ConsultaGlobalSys`
6. Fila e ações na tela **BL Não Encontrado**

### Prioridade 3 — Processo Finalizado
7. Service/repository para `BL_ProcessoEtapa`
8. Timeline e resumo na tela **Processo Finalizado**

### Prioridade 4 — Workflow automático
9. Job ou trigger para criar `BL_Workflow` ao inserir BL via OCR (status inicial `apoio_humano` quando aplicável)

### Prioridade 5 — Administração e integrações
10. CRUD Usuários + RBAC + Auditoria (`APP_*`)
11. Autenticação LDAP real
12. Endpoints de configuração (LDAP, OneDrive, GlobalSys)
13. Microsoft Graph / OneDrive para `DocumentViewer`

### Prioridade 6 — Qualidade
14. Validação Zod nos endpoints POST
15. Testes unitários e de integração

---

# Estado Atual

## Etapa de desenvolvimento

```
[✅] Etapa 1 — Infraestrutura backend (Express, Prisma, SQL Server, health, logs, erros)
[✅] Etapa 2 — API read-only BL + Dashboard operacional + Apoio Humano (leitura)
[✅] Etapa 3 — Persistência Apoio Humano (primeiro endpoint POST) + schema consolidado
[🔄] Etapa 4 — Módulos operacionais restantes (Divergência, BL Não Encontrado, Processo Finalizado)
[⏳] Etapa 5 — Admin/RBAC/LDAP + integrações externas (GlobalSys, OneDrive)
```

## O que está funcionando hoje

1. API na porta **3333** com conexão validada ao SQL Server `DB_OCR_FCA`
2. Endpoints read-only BL Master/House, stats, health, apoio humano (fila filtrada)
3. **Dashboard operacional** com KPIs e listagem via `/bl/dashboard`
4. **Apoio Humano** com leitura + persistência (`POST` campos, histórico, workflow)
5. Frontend integrado em **4 telas** (Dashboard, Apoio Humano, BL Database, Banco de Dados parcial)
6. Schema Prisma completo (19 modelos) + seed de referência
7. Proxy Vite `/api` para desenvolvimento local

## O que desenvolver primeiro na próxima conversa

> **Módulo Divergência** — usar `BL_Divergencia`/`BL_DivergenciaCampo`, endpoints de listagem/detalhe e integração da tela frontend (depende parcialmente de GlobalSys).

## Como rodar localmente

```bash
# Terminal 1 — API (obrigatório)
npm run dev:api
# → http://localhost:3333

# Terminal 2 — Frontend (recomendado para dev)
npm run dev
# → http://localhost:5173 (proxy /api → 3333)

# Alternativa sandbox (porta 3000)
npm run dev:api          # terminal 1
npm run dev:sandbox      # terminal 2 (rebuild com VITE_API_URL direto)

# Testar conexão banco
cd backend && npm run test:db
```

## Credenciais de teste

- **Frontend (mock)**: login `teste` / senha `teste123` (`useAuth.tsx`)
- **Backend (Apoio Humano)**: `APP_User` login `teste` (seed) como responsável e autor de alterações

## Arquivos-chave para continuidade

| Arquivo | Por quê |
|---------|---------|
| `backend/prisma/schema.prisma` | Modelo de dados completo (19 entidades) |
| `backend/prisma/seed.ts` | Roles, permissões, usuário teste, configs |
| `backend/src/config/env.ts` | Conexão SQL Server (senhas especiais) |
| `backend/src/routes/bl.routes.ts` | Rotas BL, Dashboard e Apoio Humano |
| `backend/src/repositories/apoio-humano.repository.ts` | Transação de persistência Apoio Humano |
| `backend/src/repositories/dashboard.repository.ts` | CTE operacional Dashboard |
| `backend/src/services/apoio-humano.service.ts` | Lógica fila + save |
| `src/lib/api/client.ts` | Cliente HTTP (`apiGet`, `apiPost`) |
| `src/lib/api/dashboard.ts` / `apoio-humano.ts` | Integrações frontend |
| `src/pages/Dashboard.tsx` | Dashboard operacional integrado |
| `src/pages/ApoioHumano.tsx` | Apoio Humano leitura + save |
| `src/data/mockData.ts` | Referência para telas ainda em mock |

---

*Fim do documento de handoff.*
