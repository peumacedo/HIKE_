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

Para análises sandbox, `resolveScenarioEffectiveAssumptionsWithTransientOverrides(projectId, scenarioId, transientOverrides)` aplica overrides **temporários em memória** e marca `source_layer = scenario_transient_override`, sem escrever em banco.

## Fluxo por cenário
- Fluxo base é persistido com `scenario_id = null`.
- Fluxo de cenário persiste com `scenario_id = <id>`.
- A geração persistida usa o mesmo pipeline e permite regeneração isolada por cenário.
- Agregações mensais persistidas aceitam filtro por cenário (`null` para base).

## Funding por cenário e seleção explícita
Na página `/projects/[id]/scenarios`, a funding line usada para análise passou a ser **explícita** via `fundingLineId` (query string/form GET).

- Sem `fundingLineId`: o comparativo executivo mostra métricas operacionais e funding need; custo financeiro e resultado após funding ficam como **“Não simulado”**.
- Com `fundingLineId`: comparativo e sensibilidade simulam custo financeiro com a linha escolhida, inclusive para a linha **Base (sem cenário)** (`scenarioId = null`).

Não existe mais seleção silenciosa por “primeira linha ativa/primeira disponível”.

## Persistido x temporário
Persistido:
- `scenario_assumption_overrides` quando o usuário salva override de cenário.
- `project_cash_flow_items` quando o usuário gera/regenera fluxo persistido.

Temporário (sandbox):
- Sensibilidade: resolução de assumptions, projeção mensal, funding need e simulação de funding são calculadas em memória e retornadas apenas na resposta.
