# Project Cash Schedule

## Como o cronograma base é gerado

Serviço: `generateBaseProjectCashFlow(projectId, options)`.

Pré-condições mínimas:
- `contract_value`
- `start_date`
- `end_date`

Sem esses campos, o serviço retorna erro claro.

## Resolução de parâmetros

A geração usa hierarquia já existente (global/template/project override) e perfis de projeto para:
- `admin_rate_pct`
- `direct_cost_pct`
- `payroll_weight_pct`
- `contingency_pct`
- `receipt_cycle_days`
- `advance_percentage`
- `final_delivery_percentage`
- `supplier_payment_cycle_days`
- `working_capital_buffer_days`
- `billing_model`
- `disbursement_model`

Também utiliza:
- `expected_collection_curve_json`
- `production_cost_distribution_json`
- `upfront_cost_percentage`

## Regras de inflow

1. Entrada inicial (`advance_percentage`) no mês inicial.
2. Entrada final (`final_delivery_percentage`) no mês final.
3. Receita residual distribuída entre meses:
   - usa curva se válida;
   - caso contrário, distribuição uniforme.
4. Aplica `receipt_cycle_days` em `expected_cash_date`.

## Regras de outflow

1. Custo direto:
   - base = `contract_value * direct_cost_pct`
   - parcela upfront se `upfront_cost_percentage`
   - restante por curva de produção (se válida) ou uniforme
   - aplica `supplier_payment_cycle_days`
2. Folha:
   - base = `contract_value * payroll_weight_pct`
   - distribuição uniforme mensal
3. Administração:
   - base = `contract_value * admin_rate_pct`
   - distribuição uniforme mensal
4. Contingência:
   - base = `contract_value * contingency_pct`
   - distribuição uniforme mensal

## Transparência da origem

Toda linha gerada grava `origin_reference_json` com:
- parâmetro usado;
- regra aplicada;
- mês de geração;
- tipo de distribuição.

## Regeneração controlada

Quando `regenerate=true`:
- remove **apenas** `source_layer='generated'` e `is_locked=false`;
- preserva `manual`, `adjustment`, `imported_omie`;
- preserva linhas travadas (`is_locked=true`).

Cada execução registra `project_cash_flow_generation_runs` com status e resumo.
