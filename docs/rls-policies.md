# RLS Policies — Fase Base MVP

## O que foi implementado
- RLS habilitado em todas as tabelas de negócio.
- Funções auxiliares SQL:
  - `is_org_member(org_id)`
  - `has_org_role(org_id, roles[])`
- Policies de leitura por membership e policies de escrita por papel.

## Regras aplicadas
- Usuário só vê dados de organizações onde é membro.
- `viewer`: somente `select`.
- `analyst`: leitura + escrita em planejamento e staging.
- `admin`: acesso total, incluindo gestão de membership e credenciais Omie.
- `audit_logs` e tabelas `omie_*_staging` seguem escopo organizacional.

## Decisões técnicas
- Predicados centralizados em funções SQL para evitar duplicação de lógica.
- Tabelas ligadas indiretamente à organização (`project_*`) usam `exists` sobre `projects`.

## Limitações atuais
- Não foram implementadas políticas granulares por coluna.
- Não há política de retenção/arquivamento para logs.

## Como prepara os próximos blocos
- Segurança pronta para operações server-side com service role controlado.
- Facilita adicionar workflows de aprovação sem reestruturar políticas base.
