# Project parameterization

## O que já está funcional
- Tela `/premissas` com CRUD de premissas globais por organização.
- Tela `/templates` com listagem e detalhe `/templates/[id]` para defaults financeiros.
- Tela `/projects/new` com criação do projeto (nome, código, cliente, contrato, datas, template, descrição).
- Tela `/projects/[id]` com blocos:
  - Identificação do projeto.
  - Tabela de parâmetros efetivos e origem (global/template/override), com visibilidade dos valores bruto global/template/override.
  - Perfil de caixa (`project_cash_profiles`).
  - Perfil de desembolso (`project_disbursement_profiles`).
  - CRUD de categorias de custo (`project_cost_categories`).
  - Overrides explícitos de parâmetros principais (incluindo limpeza de override).

## Fonte de verdade e eliminação da ambiguidade
Para parâmetros efetivos de projeto, a fonte canônica é:
- `project_assumption_overrides` (na camada de projeto),
- combinada com `template_assumption_defaults` e `organization_assumptions` via resolução de herança.

Os perfis estruturados continuam existindo para UX e modelagem operacional:
- `project_cash_profiles`
- `project_disbursement_profiles`

Mas ao salvar esses formulários, os campos equivalentes são **sincronizados automaticamente** para `project_assumption_overrides`, evitando dupla fonte de verdade.

## Mapeamento de sincronização
### Perfil de caixa -> overrides canônicos
- `billing_model`
- `receipt_cycle_days`
- `advance_percentage`
- `final_delivery_percentage`
- `working_capital_buffer_days`

### Perfil de desembolso -> overrides canônicos
- `disbursement_model`
- `supplier_payment_cycle_days`

## Remoção de override
A remoção ocorre de duas formas complementares:
1. **Limpeza explícita** no bloco de overrides da tela do projeto (botão “Limpar override”).
2. **Limpeza implícita** na camada de dados: se salvar override sem valor numérico/texto/json, o registro é deletado.

Resultado: não ficam registros vazios presos como `project_override`.

## Tratamento de JSON inválido
Nos campos JSON de `/projects/[id]`:
- `expectedCollectionCurveJson`
- `productionCostDistributionJson`
- `manualScheduleJson`

A action faz parse com tratamento seguro:
- valida com `try/catch`;
- em caso de JSON inválido, retorna mensagem amigável na própria tela;
- evita quebra silenciosa da action por `JSON.parse`.

## O que ainda não está nesta etapa
- Motor financeiro mês a mês completo.
- Funding engine completo.
- Cenários complexos e comparativos avançados.
- Relatórios finais.
- Sincronização/conciliation real com Omie.
- Forecast calculado completo com todos os módulos.
