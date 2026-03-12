# Product Foundation — Hike Advisory Cockpit

## 1) Objetivo do produto
Construir um cockpit financeiro para gestão de múltiplos projetos com comportamento heterogêneo, permitindo modelagem estruturada, simulação de cenários e reconciliação com dados realizados do ERP.

## 2) Problema de negócio
Consultorias e áreas financeiras de empresas criativas costumam operar projetos com:
- regimes de recebimento distintos;
- estruturas de custo direto variáveis;
- diferentes pressões de folha interna;
- funding específico por projeto.

Sem uma fundação correta, ocorre mistura entre premissa e fato, gerando decisões com baixa confiabilidade.

## 3) Escopo do MVP (fundação deste bloco)
- Estrutura técnica base em Next.js + TypeScript + Tailwind + Supabase.
- Navegação principal com módulos placeholders.
- Documentação de produto, domínio, motor financeiro e integração Omie.
- Preparação para separar dados de planejamento, simulação e realizado.

## 4) Fora de escopo neste bloco
- Cálculo financeiro avançado.
- Persistência real com schema SQL final.
- Autenticação e autorização completas.
- Sincronização real com Omie.
- Relatórios executivos com dados reais.

## 5) Perfis de usuário
- **Consultor financeiro:** modela premissas e compara cenários.
- **Gestor de projetos:** acompanha variações por projeto.
- **Liderança executiva (C-level):** consome visão consolidada e snapshots.
- **Operação financeira:** valida divergências entre planejado e realizado.

## 6) Arquitetura funcional macro

Camadas previstas:
1. **Input manual de modelagem** (premissas globais, templates, overrides por projeto).
2. **Motor de simulação** (projeções, cenários, comparativos).
3. **Ingestão ERP** (Omie staging + normalização + vinculação a projeto).
4. **Apresentação executiva** (dashboards, snapshots, relatórios).

## 7) Mapa de módulos
- Premissas globais
- Templates de projeto
- Projetos + overrides
- Desembolsos por categoria
- Fluxo operacional
- Funding
- Cenários
- Integrações Omie
- Relatórios executivos

## 8) Princípios de modelagem financeira
- Projeto é unidade de comportamento econômico, não apenas cadastro.
- Modelagem deve aceitar parametrização desigual entre projetos.
- Premissas têm hierarquia explícita e auditável.
- Dado importado do ERP não substitui automaticamente input manual.
- Simulação e realizado são visões paralelas comparáveis.

## 9) Hierarquia de premissas

Ordem de precedência:
1. **Global default** — baseline organizacional.
2. **Template por tipo de projeto** — especialização setorial.
3. **Override por projeto** — ajuste fino para a realidade específica.
4. **Realizado importado (Omie)** — fatos observados que alimentam comparativos e reconciliação.

Regra de ouro: quanto mais específico o nível, maior precedência dentro da sua natureza. Realizado não “edita” premissa; ele informa a comparação.
