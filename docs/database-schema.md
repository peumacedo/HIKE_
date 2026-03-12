# Database Schema — Fase Base MVP

## O que foi implementado
- Migration SQL inicial em `supabase/migrations/001_initial_schema.sql` com 17 tabelas principais, enums, índices, triggers de `updated_at` e constraints.
- Chaves primárias UUID em todas as entidades.
- Separação de domínios de dados em quatro grupos:
  1. **Estrutural:** `organizations`, `profiles`, `organization_members`
  2. **Planejamento manual:** `project_templates`, `projects`, `project_assumption_overrides`, `project_cash_profiles`, `project_cost_categories`, `funding_lines`, `scenarios`
  3. **Importação ERP (staging):** `omie_*_staging`, `omie_sync_runs`, `omie_connections`
  4. **Derivados/auditoria:** `omie_project_mappings`, `audit_logs`

## Decisões técnicas
- Supabase Postgres como banco principal.
- Sem Prisma nesta etapa (somente SQL migrations).
- Uso de enums em campos de alta consistência (roles, status, tipos).
- Colunas `organization_id` em entidades multi-tenant para suporte a multi-organização com RLS.
- Índices em colunas de junção e filtros organizacionais.

## Limitações atuais
- Sem motor de cálculo/derivação financeira completo.
- Sem versionamento de premissas globais ainda.
- Seeds dependem de um usuário real no `auth.users` (UUID placeholder precisa ser substituído).

## Como prepara os próximos blocos
- Base pronta para premissas globais e herança por template/projeto.
- Estrutura de staging pronta para sincronização Omie incremental.
- Modelo de organização+membro+papel já habilita expansão para múltiplas empresas e times.
