# Hike Advisory Cockpit

Fundação de uma aplicação web para advisory financeiro de múltiplos projetos, com foco em governança de premissas, simulação de cenários e comparação entre planejado, projetado e realizado.

## Visão do produto

O **Hike Advisory Cockpit** nasce para apoiar um consultor financeiro que precisa operar projetos com comportamentos econômico-financeiros distintos sem cair em planilhas frágeis.

Princípios centrais:
- cada projeto tem lógica própria de caixa, custos, recebimentos e funding;
- o sistema não assume o plano inicial como verdade absoluta;
- os dados realizados do ERP (Omie) convivem com o planejado, sem mistura indevida;
- hierarquia de premissas: **global default > template > projeto > realizado importado**.

## Stack

- **Next.js 14+ (App Router)**
- **TypeScript**
- **Tailwind CSS**
- **Supabase** (pronto para banco + auth no próximo bloco)
- **ESLint**
- Estrutura pronta para **deploy na Vercel**

## Estrutura principal de pastas

```bash
.
├── app/
│   ├── dashboard/
│   ├── premissas/
│   ├── templates/
│   ├── projetos/
│   ├── fluxo-caixa/
│   ├── funding/
│   ├── cenarios/
│   ├── integracoes/
│   ├── relatorios/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── layout/
│   └── ui/
├── docs/
│   ├── product-foundation.md
│   ├── domain-model.md
│   ├── financial-engine-principles.md
│   ├── integrations-architecture.md
│   └── next-steps.md
├── lib/
│   ├── env.ts
│   ├── supabase.ts
│   └── utils.ts
├── .env.example
├── next.config.mjs
├── tailwind.config.ts
└── package.json
```

## Fluxo futuro dos módulos

1. Premissas globais
2. Templates de projeto
3. Cadastro de projetos com overrides
4. Custos/desembolsos por categoria
5. Fluxo operacional
6. Funding/linhas de crédito
7. Cenários
8. Integrações Omie
9. Relatórios executivos

## Setup local

> Pré-requisitos: Node.js 20+ e npm.

1. Instale dependências:
   ```bash
   npm install
   ```
2. Crie o arquivo de ambiente:
   ```bash
   cp .env.example .env.local
   ```
3. Preencha as variáveis:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OMIE_APP_KEY`
   - `OMIE_APP_SECRET`
4. Rode a aplicação:
   ```bash
   npm run dev
   ```
5. Acesse `http://localhost:3000`.

## Deploy na Vercel

1. Importar repositório no painel da Vercel.
2. Configurar variáveis de ambiente de produção (mesmas do `.env.example`).
3. Manter build padrão:
   - Install command: `npm install`
   - Build command: `npm run build`
   - Output: padrão Next.js
4. Publicar.

## Planejado vs Projetado vs Realizado

- **Planejado (manual):** inputs de modelagem definidos por consultor/equipe.
- **Projetado (simulado):** resultado computado pelo motor financeiro a partir do planejado + cenários + regras.
- **Realizado (importado):** fatos financeiros vindos do ERP (Omie), armazenados em staging e normalizados.

A fundação evita que o realizado sobrescreva silenciosamente o planejado. Comparações devem ocorrer por visão analítica, preservando origem e rastreabilidade do dado.

## Documentação complementar

- [docs/product-foundation.md](docs/product-foundation.md)
- [docs/domain-model.md](docs/domain-model.md)
- [docs/financial-engine-principles.md](docs/financial-engine-principles.md)
- [docs/integrations-architecture.md](docs/integrations-architecture.md)
- [docs/next-steps.md](docs/next-steps.md)
