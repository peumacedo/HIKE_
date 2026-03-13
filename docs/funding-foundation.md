# Funding Foundation (MVP)

## Princípio
Funding nasce do fluxo do projeto, em três camadas:
1. calcular o fluxo mensal e o acumulado;
2. identificar a exposição negativa e a necessidade máxima;
3. simular uma linha de crédito cobrindo a exposição.

## Estruturas implementadas
- `project_funding_simulations`: cabeçalho da simulação por projeto/linha.
- `project_funding_simulation_months`: trilha mensal com drawdown, saldo, juros, IOF e amortização.
- `funding_lines` com campos adicionais de apoio de elegibilidade (`minimum_amount`, `maximum_amount`, `requires_guarantee`) e `iof_tax_pct`.

## Cálculo de necessidade de funding
Função: `calculateProjectFundingNeed(projectId)`
- usa a agregação mensal já existente (`aggregateProjectCashFlowByMonth`);
- calcula `projected_cumulative_cash` mês a mês;
- quando acumulado < 0, `funding_need = abs(acumulado)`;
- `peak_negative_cash` = menor valor do acumulado;
- `max_funding_need = abs(peak_negative_cash)`.

## Simulação mensal simplificada
Função: `simulateProjectFunding(projectId, fundingLineId)`

Regras MVP:
- granularidade mensal;
- drawdown cobre o caixa negativo do mês;
- juros simples mensais sobre saldo financiado;
- IOF simplificado no drawdown (`drawdown * iof_tax_pct`);
- carência simples (sem amortização de principal durante carência);
- amortização com sobra de caixa do mês;
- uma linha por simulação.

Saídas:
- pico negativo e funding need máximo;
- série mensal de saldo financiado;
- juros, IOF e amortização por mês;
- custo total de funding;
- resultado operacional antes vs. após funding.

## Persistência
- `saveProjectFundingSimulation(...)` grava cabeçalho + meses da simulação.
- `setActiveFundingSimulation(simulationId)` mantém apenas uma ativa por projeto.
- listagem e consulta ativa disponíveis no data layer.

## Limitações atuais
- sem amortização avançada;
- sem composição de múltiplas linhas;
- sem rolagem complexa;
- sem otimização matemática/covenants;
- sem integração real com funding bancário externo.
