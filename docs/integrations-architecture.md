# Integrações — Arquitetura Omie (preparação)

## 1) Visão geral
Integração inicial será **somente leitura** da Omie para trazer fatos financeiros e comparar com o planejado/simulado.

## 2) Fluxos de sincronização (futuro)
1. Disparo (cron/manual).
2. Criação de `omie_sync_run` com status `running`.
3. Leitura paginada da Omie (payables, receivables, movements, titles quando aplicável).
4. Persistência em staging bruto (`*_staging`).
5. Validação mínima estrutural + marca de ingestão.
6. Mapeamento para projetos internos (`omie_project_mapping`).
7. Fechamento do sync com métricas e status.

## 3) Estratégia de staging
- Tabelas de staging armazenam payload bruto e metadados de ingestão.
- Não aplicar regra de negócio complexa na fase de staging.
- Normalização ocorre em camada posterior (curated/import marts).

## 4) Estratégia de mapeamento
- Mapeamento explícito entre dimensões Omie (centro, projeto, conta etc.) e `project.id`.
- Suporte a confiança de mapeamento e revisão manual.
- Itens sem mapeamento vão para fila de pendências.

## 5) Frequência de sync sugerida
- Financeiro crítico: a cada 1 hora (horário comercial).
- Backfill inicial: janelas históricas segmentadas por mês.
- Reprocessamento manual sob demanda em caso de inconsistência.

## 6) Tratamento de erros
- Retry com backoff exponencial para erros transitórios.
- Erros de autenticação invalidam conexão e notificam operação.
- Erros de payload permanecem rastreados por registro no sync run.

## 7) Idempotência
- Chave natural por `omie_external_id + tipo_entidade + organização`.
- UPSERT no staging com versionamento de `ingested_at`.
- Sync run guarda cursor/intervalo para replay controlado.

## 8) Logs e observabilidade
- Log estruturado por execução (`sync_run_id`).
- Métricas: total lido, total persistido, rejeições, latência, erros por tipo.
- Auditoria para investigação de divergências em relatórios.

## 9) Segurança de credenciais
- `OMIE_APP_KEY` e `OMIE_APP_SECRET` nunca no cliente.
- Armazenamento criptografado server-side.
- Rotação periódica de credenciais e segregação por organização.

## 10) Escopo desta fase
- Arquitetura definida.
- Entidades e separações conceituais documentadas.
- Sem escrita no ERP e sem sincronização real implementada.
