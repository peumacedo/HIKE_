# Hike Advisory Cockpit

Fundação de uma aplicação web para advisory financeiro de múltiplos projetos, com foco em governança de premissas, simulação de cenários e comparação entre planejado, projetado e realizado.

## Stack

- **Next.js 14+ (App Router)**
- **TypeScript**
- **Tailwind CSS**
- **Supabase** (Auth + Postgres + RLS)
- **ESLint**

## Rotas canônicas

```text
/login
/dashboard
/premissas
/templates
/projects
/projects/new
/projects/[id]
/fluxo-caixa
/funding
/cenarios
/integracoes
/relatorios
```

> `/projetos` permanece apenas como redirecionamento para `/projects` por compatibilidade.

## Setup local (Supabase + Next)

### 1) Dependências e ambiente

```bash
npm install
cp .env.example .env.local
```

Preencha no `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `DATABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OMIE_APP_KEY`
- `OMIE_APP_SECRET`


### Configuração de ambiente (produção segura)

- Variáveis `NEXT_PUBLIC_*` podem ser expostas ao frontend por design e devem conter apenas dados públicos.
- `DATABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` devem existir apenas no backend/CI e nunca em código cliente.
- Não commite `.env.local` com segredos.

### 2) Banco e schema

Sincronize o schema remoto com o projeto local usando Supabase CLI:

```bash
supabase login
supabase link --project-ref zwxjsraakrjczrhrcfna
supabase db pull
```

> As migrations versionadas ficam em `supabase/migrations/`.

### 3) Criar usuário auth e vincular organização

1. Crie um usuário em **Supabase Auth** (email/senha).
2. O trigger `on_auth_user_created` cria automaticamente o registro em `public.profiles`.
3. No `supabase/seed.sql`, substitua `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa` pelo `auth.users.id` real.
4. Rode o seed para popular organização, membership, template e projeto base.

### 4) Subir aplicação

```bash
npm run dev
```

Acesse `http://localhost:3000`.

## Documentação complementar

- [docs/product-foundation.md](docs/product-foundation.md)
- [docs/domain-model.md](docs/domain-model.md)
- [docs/financial-engine-principles.md](docs/financial-engine-principles.md)
- [docs/integrations-architecture.md](docs/integrations-architecture.md)
- [docs/auth-and-roles.md](docs/auth-and-roles.md)
