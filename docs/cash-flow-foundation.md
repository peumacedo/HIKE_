# Cash Flow Foundation (MVP)

## Decisão de granularidade canônica

A granularidade canônica do fluxo de caixa operacional é **mensal**.

Motivos:
- leitura executiva mais rápida;
- menor complexidade de operação no MVP;
- menor risco de erro na geração inicial;
- aderência com comparações ERP sem conciliação avançada;
- base pronta para evolução futura para semanal/diária.

## Camadas de origem (source_layer)

Cada linha em `project_cash_flow_items` pertence a uma camada:

- `generated`: criada pelo gerador base;
- `manual`: criada/ajustada manualmente pelo time;
- `imported_omie`: realizada, originada de dados importados;
- `adjustment`: ajuste operacional deliberado.

Essas camadas **não são misturadas** em cálculos de projetado vs realizado.

## Entidades centrais

- `project_cash_flow_items`: item canônico do fluxo por projeto.
- `project_cash_flow_generation_runs`: execução de geração/regeneração com status e resumo.
- `omie_reconciliation_links`: ponte de rastreabilidade entre staging Omie e projeto/linha de fluxo.

## O que já existe nesta etapa

- geração inicial do cronograma base por projeto;
- regeneração controlada (preserva manual, adjustment, imported_omie e generated travado);
- CRUD manual de linhas;
- agregação mensal por projeto e organização;
- página `/projects/[id]/cash-flow` e visão global `/fluxo-caixa`.

## O que ainda não está nesta etapa

- engine completo de funding;
- sync real com Omie;
- conciliação automática sofisticada;
- forecast inteligente;
- dashboards avançados com gráficos.
