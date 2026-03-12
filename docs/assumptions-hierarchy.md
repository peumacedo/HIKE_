# Assumptions hierarchy (global > template > project)

## Camadas e fonte canônica
1. **organization_assumptions**: premissas globais por organização.
2. **template_assumption_defaults**: defaults por template.
3. **project_assumption_overrides**: **camada canônica de resolução efetiva no nível de projeto**.
4. **project_cash_profiles** e **project_disbursement_profiles**: formulários estruturados de configuração operacional (caixa e desembolso), que precisam sincronizar os parâmetros equivalentes na camada canônica.

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

## Sincronização obrigatória dos perfis estruturados
Quando o usuário salva **perfil de caixa** (`project_cash_profiles`), também ocorre sincronização para `project_assumption_overrides` via helper dedicado:
- `billing_model`
- `receipt_cycle_days`
- `advance_percentage`
- `final_delivery_percentage`
- `working_capital_buffer_days`

Quando o usuário salva **perfil de desembolso** (`project_disbursement_profiles`), também ocorre sincronização para `project_assumption_overrides`:
- `disbursement_model`
- `supplier_payment_cycle_days`

Dessa forma, a leitura efetiva fica coerente entre formulários e herança.

## Remoção real de override
Regra aplicada na camada de dados:
- se um override for salvo sem `value_numeric`, sem `value_text` e sem `value_json`, o registro é removido de `project_assumption_overrides`;
- não permanece override vazio forçando `source_layer = project_override`.

Também existe helper explícito para remoção:
- `deleteProjectAssumptionOverride(projectId, assumptionKey)`.

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
