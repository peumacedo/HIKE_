# Omie Bridge (Estrutural)

## Objetivo desta etapa

Criar a ponte entre staging importado da Omie e a visão financeira por projeto, sem sync real e sem matching mágico.

## Estrutura

Tabela: `omie_reconciliation_links`

Campos-chave:
- `project_id`
- `cash_flow_item_id` (opcional)
- `omie_source_table` (`payables`, `receivables`, `financial_movements`)
- `omie_staging_record_id`
- `reconciliation_status` (`pending`, `matched`, `ignored`)
- `inferred_line_type`

## Fluxo funcional implementado

1. Buscar mapeamentos em `omie_project_mappings`.
2. Listar candidatos de staging relevantes (pagáveis/recebíveis/movimentos).
3. Permitir marcação rastreável de status `pending` / `matched` / `ignored`.

## Resultado no produto

Na página de fluxo do projeto existe seção “Ponte Omie” com:
- contagem de candidatos staging;
- contagem por status de reconciliação;
- formulário simples para registrar/atualizar vínculo.

## Não implementado ainda

- sincronização real com API Omie;
- conciliação automática inteligente;
- transformação completa e automática de staging em realizado final conciliado.
