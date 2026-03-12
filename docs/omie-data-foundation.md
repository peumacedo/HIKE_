# Omie Data Foundation — Fase Base MVP

## O que foi implementado
- Estrutura de conexão (`omie_connections`).
- Execuções de sincronização (`omie_sync_runs`).
- Tabelas de staging separadas por tipo:
  - `omie_payable_staging`
  - `omie_receivable_staging`
  - `omie_financial_movement_staging`
- Mapeamentos entre projeto interno e códigos externos (`omie_project_mappings`).

## Estratégia de segurança de credenciais
- Campos `app_key_encrypted` e `app_secret_encrypted` foram modelados para armazenar **dados já criptografados**.
- **Não** expor credenciais no frontend.
- Persistência/retrieval de segredo deve ocorrer apenas em backend seguro (Edge Function/API route server-only) usando chave KMS/secret manager.
- Nesta etapa, a criptografia efetiva ficou como placeholder arquitetural para evitar solução insegura improvisada.

## Decisões técnicas
- Separação staging vs domínio operacional para permitir reconciliação, retries e auditoria.
- `sync_run_id` opcional para suportar imports manuais e reprocessamentos.

## Limitações atuais
- Sem sincronização Omie real (apenas fundação de dados).
- Sem rotinas de normalização/deduplicação avançadas além de `unique` por `organization_id + omie_record_id`.

## Como prepara os próximos blocos
- Permite criar pipeline incremental (queue + worker) sem alterar schema base.
- Facilita rastreabilidade de cada importação por execução (`omie_sync_runs`).
