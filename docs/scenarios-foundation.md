# Scenarios Foundation

## Princípio
Cenário é uma camada de ajuste sobre a base do projeto, não uma cópia isolada.

## Hierarquia de resolução (obrigatória)
1. `organization_assumptions` (global)
2. `template_assumption_defaults` (template)
3. `project_assumption_overrides` (projeto)
4. `scenario_assumption_overrides` (cenário)

A função `resolveScenarioEffectiveAssumptions(projectId, scenarioId?)` retorna:
- `assumption_key`
- `assumption_label`
- `effective_value`
- `unit`
- `source_layer` (`global`, `template`, `project_override`, `scenario_override`)
- `raw_global_value`
- `raw_template_value`
- `raw_project_override_value`
- `raw_scenario_override_value`

## Fluxo por cenário
- Fluxo base é persistido com `scenario_id = null`.
- Fluxo de cenário persiste com `scenario_id = <id>`.
- A geração usa o mesmo pipeline e permite regeneração isolada por cenário.
- Agregações mensais aceitam filtro por cenário (`null` para base).

## Funding por cenário
- `calculateProjectFundingNeed(projectId, scenarioId?)`.
- `simulateProjectFunding(projectId, fundingLineId, { scenarioId })`.
- `project_funding_simulations` e `project_funding_simulation_months` passam a carregar `scenario_id` para rastreabilidade.

## Limitações atuais
- Sem Monte Carlo.
- Sem otimização probabilística.
- Sem árvore de decisão.
- Um cenário por vez no pipeline (sem linhas combinadas probabilísticas).
