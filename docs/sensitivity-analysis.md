# Sensitivity Analysis (MVP)

## Escopo MVP
Sensibilidade simples com **1 driver por vez** em torno de um cenário selecionado.

Drivers variáveis no MVP:
- `direct_cost_pct` (+5 p.p.)
- `receipt_cycle_days` (+10 dias)
- `payroll_weight_pct` (+5 p.p.)
- `contingency_pct` (+5 p.p.)
- `advance_percentage` (-10 p.p.)

## Método
Para cada variação:
1. aplica override temporário em `scenario_assumption_overrides`
2. regenera fluxo do cenário
3. recalcula funding need
4. simula custo financeiro (com a linha de funding selecionada)
5. registra resultado
6. restaura override original

Ao final, regenera o cenário com a configuração original.

## Métricas reportadas
- resultado operacional
- pico negativo de caixa
- necessidade máxima de funding
- custo financeiro total

## Limitações atuais
- Não mede efeitos combinados entre drivers.
- Não inclui distribuição probabilística.
- Custo computacional cresce linearmente com número de drivers testados.
