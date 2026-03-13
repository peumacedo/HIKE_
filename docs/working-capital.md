# Working Capital (capital de giro) por projeto

## Conceito adotado
Capital de giro do projeto = exposição máxima de caixa negativa gerada pelo fluxo operacional projetado.

## Fórmula operacional
Para cada mês:
- `projected_net_cash = inflows - outflows`
- `projected_cumulative_cash = cumulative(previous) + projected_net_cash`
- se `projected_cumulative_cash < 0`, então `funding_need_month = abs(projected_cumulative_cash)`.

No horizonte:
- `peak_negative_cash = min(projected_cumulative_cash)`
- `max_funding_need = abs(peak_negative_cash)`

## Leitura executiva entregue
A visão de funding passa a responder:
1. quando o projeto entra em caixa negativo (`first_negative_month`);
2. qual o pico de exposição;
3. quanto funding máximo é necessário;
4. quanto custa financiar com a linha escolhida;
5. impacto no resultado operacional.

## Resultado do projeto (MVP)
- `operational_result_before_funding`: soma do net projetado no horizonte.
- `total_funding_cost`: juros + IOF da simulação.
- `result_after_funding = operational_result_before_funding - total_funding_cost`.

## Observações
É uma base funcional intencionalmente simples para rastreabilidade.
O próximo bloco pode evoluir com estrutura de dívida mais sofisticada.
