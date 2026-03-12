# Auth e Roles — Fase Base MVP

## O que foi implementado
- Login por email/senha com Supabase Auth (`app/login/page.tsx`).
- Logout server-side no dashboard (`app/dashboard/page.tsx`).
- Middleware para proteção de rotas e redirecionamento automático para `/login` quando não autenticado (`middleware.ts`).
- Helpers de autenticação/autorização:
  - `requireSession`
  - `getUserMemberships`
  - `requireOrgRole`
- Trigger no banco para criar/atualizar `public.profiles` automaticamente ao criar usuário em `auth.users` (`supabase/migrations/002_auth_profile_trigger.sql`).

## Papéis e permissões
- `admin`: gestão completa da organização e integrações.
- `analyst`: criação/edição de dados operacionais e de modelagem.
- `viewer`: somente leitura.

## Decisões técnicas
- Sessão validada no servidor para cada rota sensível.
- Autorização por organização baseada em `organization_members`.
- Papel validado em dois níveis:
  1. aplicação (helpers)
  2. banco (RLS)

## Fluxo operacional mínimo (dev)
1. Criar usuário no Supabase Auth (Dashboard ou SQL admin).
2. Confirmar que o trigger criou `public.profiles` automaticamente.
3. Inserir vínculo na tabela `organization_members` para liberar acesso às rotas protegidas.
4. Executar seed ajustando `AUTH_USER_ID` para o UUID real.

## Limitações atuais
- Seleção de organização ativa usa a primeira membership retornada.
- Não há fluxo de convite/onboarding de usuários nesta etapa.
