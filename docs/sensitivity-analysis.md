# Sensitivity Analysis (MVP)

## Escopo MVP
Sensibilidade simples com **1 driver por vez** em torno de um cenário selecionado.

Drivers variáveis no MVP:
- `direct_cost_pct` (+5 p.p.)
- `receipt_cycle_days` (+10 dias)
- `payroll_weight_pct` (+5 p.p.)
- `contingency_pct` (+5 p.p.)
- `advance_percentage` (-10 p.p.)

## Novo método (sandbox, sem mutação persistida)
Para cada variação:
1. parte da base do cenário selecionado (`resolveScenarioEffectiveAssumptions`)
2. aplica override temporário em memória (`resolveScenarioEffectiveAssumptionsWithTransientOverrides`)
3. gera projeção mensal em memória (`buildCashFlowProjectionFromResolvedAssumptions`)
4. recalcula funding need em memória (`calculateFundingNeedFromMonthlyProjection`)
5. se houver funding line selecionada, simula custo financeiro em memória (`simulateFundingFromMonthlyProjection`)
6. registra resultado apenas no payload retornado da análise

## Garantias de integridade
A sensibilidade **não**:
- grava em `scenario_assumption_overrides`
- regenera `project_cash_flow_items` persistidos
- altera o estado real do cenário

## Funding line na sensibilidade
- A linha usada é explícita via `fundingLineId` da página de cenários.
- Sem funding line selecionada, a sensibilidade permanece útil para métricas operacionais e funding need, mas custo financeiro fica **“Não simulado”**.

## Métricas reportadas
- resultado operacional
- pico negativo de caixa
- necessidade máxima de funding
- custo financeiro total (quando houver funding line)

## Limitações atuais
- Não mede efeitos combinados entre drivers.
- Não inclui distribuição probabilística.
- Custo computacional cresce linearmente com número de drivers testados.
