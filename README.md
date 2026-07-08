# ComexBL — Gestão e Validação de BL (Comex)

## Visão Geral do Projeto
- **Nome**: ComexBL
- **Objetivo**: Frontend corporativo para consulta, validação e conciliação de Bill of Lading (BL), processados externamente via OCR (n8n) e integrados ao GlobalSys (SQL Server externo) e a um banco local (SQL Server da aplicação).
- **Importante**: Esta é uma aplicação **somente frontend** (protótipo de UI/UX realista). Não implementa OCR nem conexões reais de banco de dados/LDAP/OneDrive — os dados exibidos são mockados para demonstrar o fluxo funcional completo. A integração real (LDAP, Microsoft Graph/OneDrive, SQL Server GlobalSys e banco local via Prisma/TypeORM) deve ser implementada em uma camada de backend/API separada.

## Identidade Visual
- Cor primária: `#1B3153` | Cor de destaque: `#EA8022`
- Estilo SaaS enterprise/logístico, inspirado em SAP Fiori, Monday e Jira Service Management.
- Stack: React + TypeScript + Tailwind CSS + Radix UI (base do padrão shadcn/ui) + TanStack Table + Framer Motion + Lucide Icons.

## Funcionalidades Implementadas
### Operação
- **Login (LDAP simulado)**: tela de autenticação corporativa (usuário/senha de rede).
- **Dashboard Operacional**: KPIs (pendentes, divergências, apoio humano, processados hoje, tempo médio), tabela avançada com busca, filtros por status/tipo, ordenação e paginação.
- **BL Não Encontrado no GlobalSys**: fila de pendências, preview do documento OneDrive, ações de consultar novamente / associar manualmente / abrir cadastro GlobalSys / ignorar.
- **Apoio Humano**: layout 2 colunas (visualizador de documento + tabela de campos extraídos), edição inline, indicador de confiança (OCR), histórico de alterações.
- **Divergência BL Final x GlobalSys**: comparação lado a lado (Master/House), badges verde/vermelho, histórico, ações (aceitar, manter GlobalSys, editar, encaminhar).
- **Processo Finalizado**: resumo + timeline visual (Recebimento → Consulta GlobalSys → Comparação → Validação → Finalização).

### Administração
- **Usuários**: listagem de usuários sincronizados via AD, status, último acesso.
- **Perfis & Permissões (RBAC)**: matriz de permissões por perfil (Administrador, Supervisor, Operador, Auditor) e mapeamento de Grupos AD → Perfis.
- **Auditoria**: trilha completa de ações (usuário, data/hora, ação, registro, valores antes/depois).
- **BL Master / House**: consulta às entidades do banco local (navio, viagem, portos, containers, houses, documentos).

### Integrações (telas de configuração)
- **LDAP / Active Directory**: servidor, base DN, grupo AD, SSL, status de conexão, sincronização de usuários e grupos.
- **OneDrive**: configuração Microsoft Graph (tenant/client), preview de documentos com zoom, rotação e navegação de páginas (componente `DocumentViewer`).
- **Banco de Dados**: status de conexão GlobalSys (externo) e banco local, variáveis de ambiente (.env) e tabelas principais.

## Estrutura de Dados (referência para integração futura)
- **BL_Master**: número BL, navio, viagem, portos, embarcador, consignatário, containers, peso/volumes, houses vinculados.
- **BL_House**: HBL, embarcador, consignatário, notify, mercadoria, containers, documentos.
- Tipos completos em `src/types/index.ts`; dados de demonstração em `src/data/mockData.ts`.

## Não Implementado (fora do escopo deste frontend)
- OCR (executado externamente via n8n).
- Conexões reais de banco de dados (GlobalSys / banco local) — recomenda-se camada de API (Hono) + ORM (Prisma/TypeORM).
- Autenticação LDAP real (hoje simulada em `src/hooks/useAuth.tsx`).
- Integração real com Microsoft Graph API (OneDrive) para leitura de arquivos.

## Próximos Passos Recomendados
1. Criar uma API backend (Hono + Cloudflare Workers ou serviço dedicado) para: autenticação LDAP, consulta GlobalSys (SQL Server), CRUD do banco local (Prisma/TypeORM) e proxy seguro para Microsoft Graph (OneDrive).
2. Substituir os dados mockados (`src/data/mockData.ts`) por chamadas `fetch` para os endpoints reais.
3. Implementar WebSocket ou polling para atualização dinâmica do Dashboard (status em tempo real).
4. Adicionar testes end-to-end (Playwright) para os principais fluxos (login, apoio humano, divergência).

## Guia de Uso (protótipo)
1. Acesse a tela de login e utilize o **usuário de teste**:
   - **Login**: `teste`
   - **Senha**: `teste123`
   - A tela de login exibe essas credenciais com um botão "Preencher" para agilizar o acesso.
2. Navegue pelo menu lateral entre Dashboard, BL Não Encontrado, Apoio Humano, Divergências e Processos Finalizados.
3. No módulo **Administração**, explore Usuários, Perfis & Permissões, Auditoria e as configurações de integração (LDAP, OneDrive, Banco de Dados).

## Deploy
- **Plataforma alvo**: Cloudflare Pages (SPA estática — build gerado pelo Vite em `dist/`).
- **Tech Stack**: React 18 + TypeScript + Tailwind CSS + Radix UI + TanStack Table + Framer Motion + React Router.
- **Comandos**:
  ```bash
  npm install
  npm run build
  npm run deploy   # wrangler pages deploy dist
  ```
- **Status**: Protótipo funcional rodando localmente via PM2 + Wrangler Pages Dev (porta 3000).
- **Última atualização**: 2026-07-08
