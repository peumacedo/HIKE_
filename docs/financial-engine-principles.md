# Financial Engine Principles

## 1) Fluxo de caixa por projeto
- Cada projeto possui **motor de caixa independente**.
- Consolidação corporativa ocorre depois da projeção individual.
- Regras de recebimento, desembolso, administração, folha e contingência são parametrizáveis por projeto.

## 2) Recebimento previsto vs realizado
- Previsto: derivado de premissas + regras de recebíveis.
- Realizado: lido do ERP e armazenado em staging/import layer.
- Comparação deve preservar granularidade por período e projeto mapeado.

## 3) Desembolso previsto vs realizado
- Previsto: cronograma por categoria de custo e lógica operacional.
- Realizado: contas pagas/movimentações financeiras importadas.
- Divergências devem gerar sinal analítico (não auto-correção silenciosa).

## 4) Taxa de administração por projeto
- Taxa é regra parametrizável (base de incidência + percentual + vigência).
- Pode vir de default global, template ou override explícito.
- Sempre armazenar origem da premissa aplicada para auditoria.

## 5) Peso de equipe interna / folha
- Deve permitir múltiplas estratégias de alocação (percentual fixo, headcount, híbrido).
- Alocação de folha é custo operacional do projeto e deve ser rastreável por competência.

## 6) Contingência
- Contingência é colchão de risco, não custo fixo inevitável.
- Aplicação deve ser configurável por categoria, fase ou projeto.
- Uso de contingência precisa ser comparável ao realizado posteriormente.

## 7) Funding
- Funding deve modelar captação, custo financeiro e impacto de caixa.
- Linha de crédito é entidade própria; simulação de uso é outra entidade.
- Custos financeiros projetados não podem contaminar custo operacional base.

## 8) Evitar dupla contagem (manual vs importado)
- Input manual e importado devem ter **camadas separadas**.
- Reconciliação ocorre via mapeamento e regras de matching.
- Painéis devem indicar origem dos valores (manual/calculado/importado).
- Nunca somar automaticamente previsto e realizado para o mesmo evento econômico.

## 9) Comparar planejado vs realizado
- Comparação por período, projeto e categoria.
- Métricas mínimas: variação absoluta, variação percentual, tendência acumulada.
- Explicabilidade obrigatória: qual premissa/regra gerou o valor planejado.
