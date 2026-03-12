# Assumptions hierarchy (global > template > project)

## Camadas
1. **organization_assumptions**: premissas globais por organização.
2. **template_assumption_defaults**: defaults por template.
3. **project_assumption_overrides**: override explícito por projeto.

## Regra de resolução
A função `resolveProjectEffectiveAssumptions(projectId)` aplica:
- se existir valor no `project_assumption_overrides`, usa override;
- senão, se existir default no template, usa template;
- senão, usa premissa global da organização.

A resposta consolidada contém:
- `assumption_key`
- `assumption_label`
- `effective_value`
- `unit`
- `source_layer` (`global` | `template` | `project_override`)
- `raw_global_value`
- `raw_template_value`
- `raw_project_override_value`

## Parâmetros MVP cobertos
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
