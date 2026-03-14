# Deploy na Vercel (readiness final)

## Pré-requisitos
- Projeto Supabase criado e acessível.
- Banco remoto com `DATABASE_URL` válido.
- Node.js 20+ e npm.
- Vercel conectada ao repositório GitHub.

## Variáveis de ambiente obrigatórias
Defina em `.env.local` (dev) e no painel da Vercel (Production/Preview):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `OMIE_APP_KEY`
- `OMIE_APP_SECRET`

## Ordem recomendada de publicação
1. **Supabase**: criar projeto e coletar URL/chaves.
2. **Migrations**: aplicar `supabase/migrations/*.sql` no banco alvo.
3. **Seed**: preparar e executar `supabase/seed.sql`.
4. **GitHub**: subir branch/main com build verde.
5. **Vercel**: conectar repo, cadastrar variáveis e fazer deploy.

## Passo a passo
1. Preencha variáveis locais e valide build:
   - `npm ci`
   - `npm run lint`
   - `npm run build`
2. No Supabase SQL Editor, rode migrations em ordem numérica (`001` -> `006`).
3. Ajuste `supabase/seed.sql` com o UUID real do usuário auth e execute.
4. Faça push para GitHub.
5. Na Vercel:
   - Import Project
   - Configure as 6 variáveis obrigatórias
   - Build command: `npm run build`
   - Output: padrão Next.js
6. Publique em Production e valide login/dashboard.

## Seed: usuário auth e membership
1. Criar usuário em **Supabase Auth > Users** (email/senha).
2. Copiar o `id` (UUID) do usuário criado.
3. Substituir no `supabase/seed.sql` os placeholders `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa` por esse UUID.
4. Garantir existência de vínculo em `organization_members`:
   - `organization_id` da org seed
   - `profile_id` igual ao UUID do auth user
   - `role` (`admin`, `analyst` ou `viewer`)
5. Executar seed e confirmar com:
   - `select * from public.organization_members where profile_id = '<UUID>';`

## Troubleshooting básico
- **Erro de autenticação / redirect para login**: confira `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- **Falha no acesso de servidor**: confira `SUPABASE_SERVICE_ROLE_KEY` e `DATABASE_URL` na Vercel.
- **Build falha por lint/typescript**: rodar localmente `npm run lint` e `npm run build` antes do deploy.
- **Sem organização no dashboard**: faltou registro em `organization_members` no seed.
