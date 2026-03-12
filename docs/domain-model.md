# Domain Model (Conceitual Inicial)

Legenda de classificação:
- **Origem:** manual | calculado | importado
- **Domínio:** planejamento | simulação | realizado

---

## organization
- **Finalidade:** entidade raiz multi-tenant.
- **Principais campos:** id, name, legal_name, timezone, created_at.
- **Relacionamentos:** 1:N user, 1:N project, 1:N project_template, 1:N omie_connection.
- **Origem:** manual.
- **Domínio:** planejamento.

## user
- **Finalidade:** representar usuários internos do cockpit.
- **Principais campos:** id, organization_id, email, role, status, created_at.
- **Relacionamentos:** N:1 organization.
- **Origem:** manual (com futura integração auth Supabase).
- **Domínio:** planejamento.

## project
- **Finalidade:** unidade central de análise financeira com comportamento próprio.
- **Principais campos:** id, organization_id, name, code, template_id, status, start_date, end_date.
- **Relacionamentos:** N:1 organization, N:1 project_template, 1:N project_assumption_override, 1:N scenario.
- **Origem:** manual.
- **Domínio:** planejamento.

## project_template
- **Finalidade:** padronizar parâmetros por tipologia de projeto.
- **Principais campos:** id, organization_id, name, template_type, default_receivable_days, default_admin_rate.
- **Relacionamentos:** N:1 organization, 1:N project.
- **Origem:** manual.
- **Domínio:** planejamento.

## project_assumption_override
- **Finalidade:** sobrescrever premissas para projeto específico.
- **Principais campos:** id, project_id, key, value_json, reason, effective_from.
- **Relacionamentos:** N:1 project.
- **Origem:** manual.
- **Domínio:** planejamento.

## project_cash_profile
- **Finalidade:** consolidar perfil de caixa do projeto (recebimento/desembolso esperado).
- **Principais campos:** id, project_id, scenario_id, period, projected_inflow, projected_outflow, net_cash.
- **Relacionamentos:** N:1 project, N:1 scenario.
- **Origem:** calculado.
- **Domínio:** simulação.

## project_cost_category
- **Finalidade:** categorizar custos relevantes por projeto.
- **Principais campos:** id, project_id, name, category_type, weight, controllable_flag.
- **Relacionamentos:** N:1 project.
- **Origem:** manual.
- **Domínio:** planejamento.

## project_receivable_rule
- **Finalidade:** definir lógica de recebimento (prazo/parcelamento).
- **Principais campos:** id, project_id, rule_name, dso_days, installment_policy, validity_start.
- **Relacionamentos:** N:1 project.
- **Origem:** manual.
- **Domínio:** planejamento.

## project_admin_rule
- **Finalidade:** parametrizar taxa de administração por projeto.
- **Principais campos:** id, project_id, admin_rate, base_type, cap_value, validity_start.
- **Relacionamentos:** N:1 project.
- **Origem:** manual.
- **Domínio:** planejamento.

## project_payroll_allocation_rule
- **Finalidade:** alocar peso de equipe interna/folha no projeto.
- **Principais campos:** id, project_id, allocation_method, payroll_weight, monthly_cap, validity_start.
- **Relacionamentos:** N:1 project.
- **Origem:** manual.
- **Domínio:** planejamento.

## funding_line
- **Finalidade:** representar linhas/instrumentos de funding.
- **Principais campos:** id, organization_id, provider_name, line_name, interest_index, max_amount, tenor_days.
- **Relacionamentos:** N:1 organization, 1:N funding_simulation.
- **Origem:** manual.
- **Domínio:** planejamento.

## funding_simulation
- **Finalidade:** simular impacto de funding sobre caixa e custo financeiro.
- **Principais campos:** id, project_id, funding_line_id, scenario_id, drawdown_plan_json, projected_financial_cost.
- **Relacionamentos:** N:1 project, N:1 funding_line, N:1 scenario.
- **Origem:** calculado.
- **Domínio:** simulação.

## scenario
- **Finalidade:** encapsular cenários (base, conservador, estresse).
- **Principais campos:** id, project_id, name, scenario_type, assumptions_delta_json, created_at.
- **Relacionamentos:** N:1 project, 1:N project_cash_profile, 1:N funding_simulation.
- **Origem:** manual + calculado.
- **Domínio:** simulação.

## omie_connection
- **Finalidade:** armazenar vínculo técnico com ERP Omie.
- **Principais campos:** id, organization_id, label, encrypted_app_key, encrypted_app_secret, status, last_test_at.
- **Relacionamentos:** N:1 organization, 1:N omie_sync_run.
- **Origem:** manual (credencial).
- **Domínio:** realizado (integração).

## omie_sync_run
- **Finalidade:** registrar cada execução de sincronização.
- **Principais campos:** id, omie_connection_id, sync_type, started_at, finished_at, status, cursor_ref, error_summary.
- **Relacionamentos:** N:1 omie_connection, 1:N staging records.
- **Origem:** importado/sistema.
- **Domínio:** realizado.

## omie_payable_staging
- **Finalidade:** staging bruto de contas a pagar da Omie.
- **Principais campos:** id, sync_run_id, omie_external_id, issue_date, due_date, amount, raw_payload_json.
- **Relacionamentos:** N:1 omie_sync_run.
- **Origem:** importado.
- **Domínio:** realizado.

## omie_receivable_staging
- **Finalidade:** staging bruto de contas a receber da Omie.
- **Principais campos:** id, sync_run_id, omie_external_id, issue_date, due_date, amount, raw_payload_json.
- **Relacionamentos:** N:1 omie_sync_run.
- **Origem:** importado.
- **Domínio:** realizado.

## omie_financial_movement_staging
- **Finalidade:** staging bruto de movimentações financeiras.
- **Principais campos:** id, sync_run_id, omie_external_id, movement_date, amount, direction, raw_payload_json.
- **Relacionamentos:** N:1 omie_sync_run.
- **Origem:** importado.
- **Domínio:** realizado.

## omie_project_mapping
- **Finalidade:** mapear centro/código Omie para projeto interno.
- **Principais campos:** id, organization_id, project_id, omie_dimension_type, omie_dimension_code, confidence_level.
- **Relacionamentos:** N:1 organization, N:1 project.
- **Origem:** manual assistido.
- **Domínio:** ponte planejamento ↔ realizado.

## dashboard_snapshot
- **Finalidade:** congelar visão executiva para governança e histórico.
- **Principais campos:** id, organization_id, reference_date, scenario_type, kpis_json, created_at.
- **Relacionamentos:** N:1 organization.
- **Origem:** calculado.
- **Domínio:** simulação + realizado (comparativo).
