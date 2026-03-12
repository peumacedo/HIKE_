# Auth e Roles — Fase Base MVP

## O que foi implementado
- Login por email/senha com Supabase Auth (`app/login/page.tsx`).
- Logout server-side no dashboard.
- Middleware para proteção de rotas e redirecionamento automático para `/login` quando não autenticado (`middleware.ts`).
- Helpers de autenticação/autorização:
  - `requireSession`
  - `getUserMemberships`
  - `requireOrgRole`

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

## Limitações atuais
- Seleção de organização ativa usa a primeira membership retornada.
- Não há fluxo de convite/onboarding de usuários nesta etapa.

## Como prepara os próximos blocos
- Permite evoluir para selector de organização e context switching.
- Permite criar gestão de usuários e trilha de auditoria por papel sem quebrar contratos atuais.
