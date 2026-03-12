# Project parameterization

## O que já está funcional
- Tela `/premissas` com CRUD de premissas globais por organização.
- Tela `/templates` com listagem e detalhe `/templates/[id]` para defaults financeiros.
- Tela `/projects/new` com criação do projeto (nome, código, cliente, contrato, datas, template, descrição).
- Tela `/projects/[id]` com blocos:
  - Identificação do projeto.
  - Tabela de parâmetros efetivos e origem (global/template/override).
  - Perfil de caixa (`project_cash_profiles`).
  - Perfil de desembolso (`project_disbursement_profiles`).
  - CRUD de categorias de custo (`project_cost_categories`).
  - Overrides explícitos de parâmetros principais.

## Como a herança funciona na prática
1. Organização define base em `/premissas`.
2. Template pode ajustar defaults em `/templates/[id]`.
3. Projeto pode sobrescrever em `/projects/[id]`.
4. O helper de resolução entrega valor efetivo + rastreabilidade de origem.

## O que ainda não está nesta etapa
- Motor financeiro mês a mês completo.
- Funding engine completo.
- Cenários complexos e comparativos avançados.
- Relatórios finais.
- Sincronização/conciliation real com Omie.
- Forecast calculado completo com todos os módulos.
