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


## Coerência de leitura (simulação salva vs. preview)
A página de funding do projeto passa a usar uma única fonte por contexto:
- quando existe `selectedSimulation` (simulação salva selecionada), a leitura executiva usa exclusivamente os dados persistidos dessa simulação;
- o `preview` temporário (recalculado no estado atual) só é usado quando não há simulação salva selecionada.

Regra aplicada:
- `selectedSimulation` tem prioridade total sobre `preview`.

Com isso, seção D (tabela mensal) e seção E (leitura executiva) permanecem coerentes entre si, e a seção A mostra os mesmos indicadores da fonte em foco.

## Elegibilidade básica de linha (etapa MVP)
Foi adicionada uma avaliação objetiva de elegibilidade com base em `maxFundingNeed` e metadados da linha (`funding_lines`):
1. `active === false` => inelegível (`linha inativa`);
2. `maximum_amount` definido e `< maxFundingNeed` => inelegível (`teto insuficiente`);
3. `minimum_amount` definido e `> maxFundingNeed` com `maxFundingNeed > 0` => inelegível (`mínimo acima da necessidade`);
4. `requires_guarantee === true` => sinalização (`exige garantia`), sem bloqueio automático por si só.

Na UI, linhas inelegíveis ainda podem ser simuladas para análise, mas ficam explicitamente marcadas como inelegíveis e não são tratadas como recomendação implícita.
