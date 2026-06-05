# Vendly MVP - Documento Detalhado de Features Existentes

Este documento descreve fielmente as features existentes no MVP atual do Vendly, com foco em funcionamento, finalidade, elementos de tela, navegação, sidebar, modais, fluxos e integrações. O objetivo é servir como briefing funcional para o agente que está construindo a versão SaaS/produção, preservando a lógica e a experiência já validadas no MVP.

> Fonte principal: código atual do MVP (`index.html`, `src/vitrine`, `src/shared`, `src/dashboard`, `Code.gs`, `config.js`).
> Importante: este documento descreve o que existe hoje. Não propõe redesign, não troca hierarquia visual e não inventa features ausentes.

---

## 1. Visão Geral do Produto

O Vendly MVP é composto por duas grandes áreas:

1. **Vitrine pública**
   - Página acessada pelo cliente final.
   - Exibe banner, produtos, busca, filtros, modal de produto, comparação, carrinho e checkout por WhatsApp.
   - Registra eventos de comportamento para alimentar a aba **Métricas** do dashboard.

2. **Dashboard administrativo**
   - Painel usado pelo lojista.
   - Controla vendas, estoque, compras/encomendas, fiado, fluxo de caixa, métricas de vitrine e análise estratégica.
   - Consome e atualiza dados via Google Apps Script.

O MVP é uma aplicação web estática, sem bundler obrigatório, usando scripts de navegador, Tailwind via CDN, Chart.js, Font Awesome, Driver.js e jsPDF.

---

## 2. Arquitetura Funcional Atual

### 2.1 Frontend da Vitrine

Arquivos principais:

- `index.html`
- `src/vitrine/modules/catalog.js`
- `src/vitrine/modules/banner.js`
- `src/vitrine/modules/modal.js`
- `src/vitrine/modules/compare.js`
- `src/vitrine/modules/socialProof.js`
- `src/vitrine/modules/tracker.js`
- `src/vitrine/modules/onboarding.js`
- `src/shared/modules/cart.js`
- `config.js`

Responsabilidades:

- Carregar produtos publicados.
- Renderizar catálogo.
- Permitir busca, filtros e ordenação.
- Agrupar variações de produto.
- Abrir modal de detalhes.
- Montar carrinho.
- Simular parcelamento.
- Enviar pedido para backend.
- Enviar pedido para a aba de Vendas da Dashboard e fica com status 'Pendente'
- Abrir conversa no WhatsApp.
- Registrar métricas de comportamento.

### 2.2 Frontend do Dashboard

Arquivos principais:

- `src/dashboard/index.html`
- `src/dashboard/main.js`
- `src/dashboard/modules/store.js`
- `src/dashboard/modules/ui.js`
- `src/dashboard/modules/analytics.js`
- `src/dashboard/modules/dashboard.js`
- `src/dashboard/modules/inventory.js`
- `src/dashboard/modules/compras.js`
- `src/dashboard/modules/fiado.js`
- `src/dashboard/modules/metrics.js`
- `src/dashboard/modules/notifications.js`
- `src/dashboard/modules/onboarding.js`
- `src/dashboard/modules/receipt.js`
- `src/dashboard/modules/cashflow/*`
- `src/dashboard/modules/strategy/*`

Responsabilidades:

- Autenticação simples do lojista.
- Buscar dados do backend.
- Manter estado global do dashboard.
- Renderizar abas.
- Aplicar filtros globais e filtros internos.
- Atualizar estoque, vendas, compras, fiados e fluxo de caixa.
- Gerar indicadores financeiros e operacionais.
- Emitir notificações de novos pedidos.
- Gerar recibos em PDF.

### 2.3 Backend Google Apps Script

Arquivo principal:

- `Code.gs`

Responsabilidades:

- Expor API JSON.
- Ler e escrever nas planilhas.
- Manter formato de resposta:

```json
{ "ok": true, "data": [] }
```

ou:

```json
{ "ok": false, "error": "mensagem" }
```

Planilhas/abas usadas:

- `Produtos`
- `Pedidos`
- `Fiados`
- `Encomendados`
- `Fluxo_Caixa`
- `Métricas`

---

## 3. Vitrine Pública

### 3.1 Header da Vitrine

O header é a área superior da vitrine pública.

Elementos existentes:

- Logo/nome da loja, vindo da configuração.
- Botão de comparação.
- Botão de tutorial/ajuda.
- Botão do carrinho.
- Badge com quantidade de itens no carrinho.

Como funciona:

- O header permanece como ponto fixo de acesso ao carrinho e comparação.
- O badge do carrinho reflete os itens salvos no estado/localStorage.
- O botão de comparação abre ou evidencia a área de produtos comparados quando há itens selecionados.
- O botão de tutorial aciona o onboarding da vitrine.

Finalidade:

- Dar acesso rápido aos fluxos principais da vitrine: comprar, comparar e aprender a usar.

### 3.2 Banner/Carousel

Feature: **Banner rotativo da vitrine**.

Como funciona:

- Usa a lista `CONFIG.banners`.
- Suporta imagem desktop e imagem mobile.
- Possui autoplay com intervalo configurável por `CONFIG.bannerInterval` ou padrão de 5 segundos.
- Usa clones para efeito de loop infinito.
- Possui setas de navegação, dots e suporte a gesto de arrastar/deslizar.
- Se não houver banners configurados, a área é ocultada.

Finalidade:

- Destacar campanhas, ofertas, avisos ou chamadas comerciais no topo da vitrine.

### 3.3 Hero Comercial

Feature: **Hero da vitrine**.

Elementos:

- Headline comercial com destaque em "Black".
- Efeito de digitação/typewriter no termo principal.
- Texto de apoio.
- CTA para rolar até o catálogo.
- CTA de WhatsApp no hero.

Como funciona:

- O CTA principal leva o usuário ao catálogo.
- O CTA de WhatsApp usa os contatos configurados em `CONFIG.whatsappContacts`.
- Cliques no WhatsApp do hero são registrados como evento de métrica.

Finalidade:

- Dar contexto comercial imediato e conduzir o visitante para produtos ou atendimento.

### 3.4 Catálogo de Produtos

Feature: **Listagem pública de produtos**.

Dados usados por produto:

- `id`
- `sku`
- `grupo_id`
- `nome`
- `descricao`
- `categoria`
- `preco`
- `custo`
- `imagem`
- `imagens`
- `estoque`
- `estoque_minimo`
- `cor`
- `armazenamento`
- `ram`
- `cameras`
- `bateria`
- `tela`
- `condicao`
- `ativo`
- `clicks`
- `imei1`
- `saude_bateria`

Como funciona:

- Apenas produtos ativos aparecem na vitrine como compráveis.
- Produtos sem estoque ou inativos são tratados visualmente como indisponíveis.
- Variações podem ser agrupadas por `grupo_id`.
- O catálogo é re-renderizado quando filtros, busca ou ordenação mudam.

Finalidade:

- Mostrar ao cliente final o estoque disponível e conduzir para compra via carrinho/WhatsApp.

### 3.5 Busca e Filtros do Catálogo

Campos existentes:

- Busca por texto.
- Filtro de categoria.
- Filtro de condição:
  - Todos.
  - Novo.
  - Seminovo.
- Ordenação:
  - Padrão.
  - Menor preço.
  - Maior preço.
  - Popular.
  - Mais vendidos.

Como funciona:

- A busca filtra produtos pelo conteúdo textual relevante.
- A categoria limita a listagem a uma família.
- A condição separa novos e seminovos.
- A ordenação considera preço, popularidade, vendas e uma priorização inteligente.

Priorização inteligente existente:

- Produtos em estoque ficam acima dos indisponíveis.
- Produtos com selo de mais vendido ganham destaque.
- Produtos populares por cliques ganham destaque.
- Produtos com última unidade ou baixo estoque recebem destaque.
- Depois são considerados quantidade de cliques, menor estoque e ordem alfabética.

Finalidade:

- Ajudar o cliente a encontrar rapidamente produtos relevantes.
- Dar mais visibilidade a itens com maior potencial de venda.

### 3.6 Card de Produto

Feature: **Card individual no catálogo**.

Elementos:

- Imagem principal.
- Nome do produto.
- Variação principal.
- Preço.
- Badges.
- Botão "VER OPÇÕES".
- Botão "Comparar".
- Overlay de indisponível quando aplicável.

Badges existentes:

- `Indisponível`.
- `Mais vendido`.
- `Apenas 1 unidade`.
- `Poucas unidades`.
- `Popular`.
- `Melhor preço`.
- `Premium`.
- `Novo`.
- `Seminovo`.

Como funciona:

- "VER OPÇÕES" abre o modal de produto/variações.
- "Comparar" adiciona o produto ao comparador.
- Cliques relevantes podem ser registrados como eventos de métrica.

Finalidade:

- Exibir produto de forma resumida, com sinais rápidos de urgência, popularidade e disponibilidade.

### 3.7 Modal de Produto

Feature: **Detalhamento e seleção de variações**.

Elementos:

- Galeria de imagens.
- Miniaturas.
- Setas de navegação.
- Nome do produto.
- Preço.
- Estado de estoque.
- Seletores de cor.
- Seletores de armazenamento.
- Seletores de condição.
- Mensagens de urgência/estoque.
- Botão "Eu Quero".
- Botão de comparação.

Como funciona:

- O modal agrupa variações do mesmo `grupo_id`.
- Só variações ativas e coerentes ficam selecionáveis.
- Opções indisponíveis aparecem como indisponíveis/desabilitadas.
- Ao trocar cor, armazenamento ou condição, o produto selecionado é recalculado.
- O botão "Eu Quero" adiciona o item selecionado ao carrinho e fecha o modal.
- O botão de comparação adiciona a variação ao comparador.

Finalidade:

- Permitir que o cliente escolha exatamente a variação desejada antes de comprar.

### 3.8 Comparador de Produtos

Feature: **Comparação de até 3 produtos**.

Elementos:

- Barra/toast de comparação.
- Slots com produtos selecionados.
- Miniaturas.
- Botão para abrir comparação completa.
- Botão de remover item.
- Botão de limpar comparação.
- Modal de comparação.

Limite:

- Máximo de 3 produtos comparados.

Como funciona:

- Produtos adicionados aparecem em uma barra de comparação.
- O modal compara atributos técnicos e comerciais.
- O sistema gera destaques inteligentes, como:
  - Melhor selfie.
  - Melhor câmera.
  - Melhor bateria.
  - Melhor RAM.
  - Maior armazenamento.
  - Melhor preço.
- Produtos vencedores em critérios recebem badges visuais.

Finalidade:

- Ajudar o cliente indeciso a comparar aparelhos e escolher com mais segurança.

### 3.9 Carrinho

Feature: **Carrinho de compras da vitrine**.

Persistência:

- Usa localStorage com chave `catalogo_cart_v2`.

Elementos:

- Lista de itens.
- Quantidade por item.
- Botão de aumentar quantidade.
- Botão de diminuir quantidade.
- Botão de remover item.
- Total.
- Simulador de parcelamento.
- Botão de checkout/WhatsApp.

Como funciona:

- O produto é adicionado por `sku` ou `id`.
- O carrinho bloqueia quantidade maior que o estoque.
- Produtos inativos ou sem estoque não devem ser compráveis.
- O total é recalculado a cada alteração.
- O carrinho mantém estado no navegador.

Finalidade:

- Permitir compra de um ou mais itens antes de iniciar atendimento no WhatsApp.

### 3.10 Simulador de Parcelamento

Feature: **Cálculo de pagamento no carrinho**.

Opções:

- À vista.
- Parcelado.
- Entrada.
- Número de parcelas.

Como funciona:

- Usa taxas configuradas em `CONFIG.installment.taxas`.
- Calcula o valor ajustado para cobrir taxa da maquininha.
- Considera entrada quando informada.
- Exibe o valor final compatível com o modo de pagamento.

Finalidade:

- Mostrar ao cliente uma referência de pagamento antes da conversa de venda.

### 3.11 Checkout por WhatsApp

Feature: **Envio do pedido e abertura de conversa**.

Como funciona:

- O carrinho monta o objeto de pedido.
- O pedido é enviado para o backend.
- Após o envio, a vitrine abre uma URL do WhatsApp com mensagem pronta.
- Eventos de clique e mensagem enviada são registrados para métricas.

Finalidade:

- Transformar intenção de compra em atendimento direto com o lojista.

### 3.12 Social Proof

Feature: **Popups de prova social**.

Como funciona:

- Exibe notificações simuladas de interesse/compra usando nomes e cidades fictícias.
- Só funciona quando há produtos carregados.

Finalidade:

- Criar sensação de movimento comercial na vitrine.

### 3.13 Tracking da Vitrine

Feature: **Registro de métricas comportamentais**.

Eventos registrados:

- `visita_vitrine`.
- `visualizacao_produto`.
- `clique_produto`.
- `whatsapp_click`.
- `mensagem_enviada`.
- `hero_whatsapp_click`.
- `heartbeat`.

Como funciona:

- Cada visitante recebe um `session_id` salvo em localStorage.
- O heartbeat é enviado periodicamente para medir visitantes ativos.
- Os eventos são enviados ao backend pela action `registrar_evento`.

Finalidade:

- Alimentar a aba **Métricas** do dashboard.
- Medir visitas, cliques, WhatsApp, conversão e atividade recente.

### 3.14 Onboarding da Vitrine

Feature: **Tutorial guiado da vitrine**.

Como funciona:

- Usa Driver.js.
- Pode aparecer na primeira visita.
- Pode ser acionado manualmente pelo botão de ajuda.
- Explica pontos principais da vitrine.

Finalidade:

- Ensinar rapidamente o cliente a navegar, comparar e comprar.

---

## 4. Dashboard Administrativo

### 4.1 Autenticação e Inicialização

Feature: **Acesso ao painel**.

Como funciona:

- O dashboard verifica autenticação/local state antes de exibir a aplicação.
- Após autenticar, busca pedidos, produtos, fiados e encomendas.
- O estado global fica centralizado em `store.state`.
- A primeira renderização carrega o Painel Geral.

Dados principais em estado:

- `allOrders`.
- `allProducts`.
- `filteredOrders`.
- `previousOrders`.
- `allFiados`.
- `allEncomendas`.
- Filtros da tabela de vendas.

Finalidade:

- Centralizar os dados usados por todas as abas administrativas.

### 4.2 Atualização Automática

Feature: **Auto-refresh do dashboard**.

Como funciona:

- O dashboard atualiza dados automaticamente a cada 45 segundos.
- O refresh é evitado quando:
  - existem alterações pendentes no estoque;
  - modal de compras está aberto;
  - modal de fluxo de caixa está aberto.

Finalidade:

- Manter o painel atualizado sem sobrescrever edições em andamento.

### 4.3 Topbar do Dashboard

Elementos:

- Botão mobile para abrir sidebar.
- Saudação dinâmica.
- Nome do lojista.
- Filtro global de período.
- Inputs de data personalizada.
- Botão de atualizar.

Saudação:

- "Bom dia" com ícone de sol.
- "Boa tarde" com ícone de nuvem/sol.
- "Boa noite" com ícone de lua.
- Nome vem de `CONFIG.nome_lojista`; fallback: `Lojista`.

Filtro global:

- Hoje.
- Ontem.
- Últimos 7 dias.
- Últimos 14 dias.
- Últimos 30 dias.
- Máximo.
- Personalizado.
- Meses dinâmicos adicionados conforme dados.

Como funciona:

- O filtro global afeta principalmente Painel Geral e Estratégia.
- Algumas abas têm filtros internos próprios.
- A versão mobile possui seletor próprio sincronizado.

Finalidade:

- Controlar o período analisado nos indicadores globais.

---

## 5. Sidebar do Dashboard

### 5.1 Estrutura Geral

A sidebar é a navegação principal do dashboard.

Elementos superiores:

- Logo da loja.
- Nome da loja.
- Texto/label "Painel".
- Botão circular para recolher/expandir no desktop.

Grupos:

- **Gestão**.
- **Operação**.

Rodapé:

- Link "Ver Vitrine".
- Botão "Ver tutorial".
- Botão "Sair".

### 5.2 Grupo Gestão

#### Item: Painel Geral

- ID: `tab-btn-geral`.
- Ícone: gráfico/pizza.
- Tooltip: `Painel Geral`.
- Aba aberta: `tab-geral`.

Finalidade:

- Exibir visão executiva do negócio: faturamento, lucro, margem, estoque, investimento, rankings e gráficos.

#### Item: Fluxo de Caixa

- ID: `tab-btn-cashflow`.
- Ícone: dinheiro/transferência.
- Tooltip: `Fluxo de Caixa`.
- Aba aberta: `tab-cashflow`.

Finalidade:

- Controlar entradas, saídas, caixa disponível, pendências, patrimônio operacional e extrato financeiro.

#### Item: Estratégia

- ID: `tab-btn-estrategia`.
- Ícone: cérebro.
- Tooltip: `Análise Estratégica`.
- Badge: `IA`.
- Aba aberta: `tab-estrategia`.

Finalidade:

- Gerar análise consultiva baseada nos números do período.

#### Item: Métricas

- ID: `tab-btn-metricas`.
- Ícone: gráfico de barras.
- Tooltip: `Métricas`.
- Badge: `LIVE`.
- Aba aberta: `tab-metricas`.

Finalidade:

- Mostrar comportamento da vitrine em tempo real: visitas, cliques, WhatsApp, ativos agora e conversões.

### 5.3 Grupo Operação

#### Item Pai: Vendas

- ID: `btn-vendas-parent`.
- Ícone: etiqueta.
- Possui submenu expansível.

Subitens:

1. **Histórico**
   - ID: `tab-btn-vendas-historico`.
   - Ícone: histórico/relógio.
   - Aba aberta: `tab-vendas-historico`.
   - Finalidade: gerenciar pedidos e vendas.

2. **Fiado**
   - ID: `tab-btn-fiado`.
   - Ícone: mão com dinheiro.
   - Aba aberta: `tab-fiado`.
   - Finalidade: controlar vendas fiadas e parcelas.

#### Item: Estoque

- ID: `tab-btn-estoque`.
- Ícone: caixas.
- Tooltip: `Controle de Estoque`.
- Aba aberta: `tab-estoque`.

Finalidade:

- Gerenciar produtos, variações, estoque, custos, preços, status ativo/inativo e cadastro.

#### Item: Compras

- ID: `tab-btn-encomendados`.
- Ícone: caminhão rápido.
- Tooltip: `Gestão de Compras`.
- Aba aberta: `tab-encomendados`.

Finalidade:

- Controlar lotes comprados, encomendas, chegada ao estoque e pagamento de fornecedores.

### 5.4 Rodapé da Sidebar

#### Link: Ver Vitrine

- Abre a vitrine pública (`index.html`).
- Serve para o lojista conferir a experiência do cliente final.

#### Botão: Ver tutorial

- Aciona o onboarding do dashboard.

#### Botão: Sair

- Encerra a sessão/autenticação local.

### 5.5 Comportamento da Sidebar

Desktop:

- Largura normal: `230px`.
- Largura recolhida: `68px`.
- Estado salvo em localStorage com chave `vendly_sidebar_collapsed`.
- Ao recolher:
  - Esconde textos.
  - Esconde badges.
  - Centraliza ícones.
  - Mostra tooltip ao passar o mouse.

Mobile:

- Sidebar vira drawer lateral.
- Abre pelo botão mobile da topbar.
- Usa overlay escuro com blur.
- Bloqueia scroll do body enquanto aberta.
- Largura: `80vw`, máximo `300px`.
- Mesmo se estiver recolhida no desktop, no mobile mostra labels completos.

---

## 6. Aba Painel Geral

Existe documentação específica em `visao-geral.md`. Esta seção resume a feature para o documento geral.

Finalidade:

- Dar ao lojista uma visão executiva do negócio em um período filtrado.

Principais blocos:

- Cards de faturamento.
- Pedidos pendentes.
- Vendas perdidas/canceladas.
- Lucro.
- Margem.
- Ticket médio.
- Estoque em dinheiro.
- Quantidade em estoque.
- Investimentos.
- Resultado real.
- ROI.
- Gráficos.
- Rankings.

Métricas principais:

- Faturamento base.
- Faturamento pendente.
- Faturamento cancelado/perdido.
- Lucro bruto.
- Margem.
- Ticket médio.
- Capital em estoque.
- Capital em trânsito.
- Capital recuperado.
- Total investido.
- Resultado real.
- ROI.

Como funciona:

- Usa pedidos filtrados pelo período.
- Calcula dados atuais e comparação com período anterior.
- Usa produtos para calcular estoque e custo imobilizado.
- Usa encomendas para calcular capital em trânsito.
- Usa pedidos com aparelho recebido para capital recuperado.
- Renderiza gráficos com Chart.js.
- Atualiza rankings de produtos.

Finalidade:

- Responder rapidamente: quanto vendeu, quanto lucrou, quanto tem parado, quanto há em estoque e onde agir.

---

## 7. Aba Fluxo de Caixa

### 7.1 Objetivo

A aba **Fluxo de Caixa** controla a saúde financeira operacional do negócio, consolidando:

- Entradas automáticas.
- Saídas automáticas.
- Movimentos manuais.
- Caixa inicial.
- Pendências a receber.
- Pendências a pagar.
- Capital imobilizado.
- Patrimônio operacional.

### 7.2 Header e Ações

Botões principais:

- `Extrato`.
- `Caixa Inicial`.
- `Entrada`.
- `Saída`.

Finalidade de cada botão:

- **Extrato**: abre visão detalhada dos movimentos por dia.
- **Caixa Inicial**: define o saldo inicial do caixa a partir de uma data.
- **Entrada**: adiciona movimento manual positivo.
- **Saída**: adiciona movimento manual negativo.

### 7.3 Filtros

Filtros de período:

- Hoje.
- Semana.
- Mês.
- Máximo.
- Personalizado.

Filtros de tipo:

- Todos.
- Entradas.
- Saídas.
- Pendentes.

Busca:

- Campo textual para localizar movimentos por descrição, categoria, origem ou observação.

Como funciona:

- O filtro de período define quais movimentos entram nos cards e tabela.
- O filtro de tipo limita o tipo de movimento exibido.
- O filtro personalizado usa datas inicial e final.

### 7.4 Cards Financeiros

Cards existentes:

1. **Saldo do Período**
   - Resultado de entradas menos saídas no período filtrado.

2. **Entradas**
   - Soma de movimentos positivos.

3. **Saídas**
   - Soma de movimentos negativos.

4. **Caixa Disponível**
   - Saldo atual em dinheiro, considerando caixa inicial e movimentos posteriores.

5. **Patrimônio Operacional**
   - Soma do caixa disponível com capital imobilizado.
   - Tooltip atual: soma do Caixa Disponível atual com Capital Imobilizado, incluindo estoque e lotes pendentes.

6. **Pendente a Receber**
   - Valores de fiado ainda não pagos.

7. **Pendente a Pagar**
   - Valores de compras/lotes ainda não pagos.

### 7.5 Movimentos Automáticos

Origem: **Vendas**

- Pedidos fechados geram entradas automáticas.
- Quando há aparelho usado como parte do pagamento, o sistema distingue dinheiro recebido e patrimônio recuperado.
- Pode representar upgrade/downgrade conforme valores envolvidos.

Origem: **Fiado**

- Parcelas pagas geram entradas.
- Entrada em dinheiro no fiado também pode gerar entrada.
- Categoria usada: `Fiado Recebido`.

Origem: **Compras**

- Pagamentos de lotes/encomendas geram saídas.
- Histórico de pagamentos de compras é considerado.
- Pagamentos duplicados dentro do mesmo lote devem ser deduplicados pela assinatura do pagamento.

### 7.6 Movimentos Manuais

Categorias de entrada:

- Venda.
- Fiado Recebido.
- Aporte.
- Ajuste Positivo.
- Outros.

Categorias de saída:

- Compra.
- Frete.
- Taxa.
- Despesa Fixa.
- Despesa Variável.
- Retirada.
- Ajuste Negativo.
- Outros.

Campos do modal:

- Tipo.
- Data.
- Valor.
- Categoria.
- Descrição.
- Forma de pagamento.
- Status.
- Observação.

Como funciona:

- Movimento manual é salvo na planilha de fluxo.
- Pode ser editado ou removido.
- Movimentos automáticos não são tratados como edição manual comum.

### 7.7 Caixa Inicial

Feature: **Abertura de caixa**.

Como funciona:

- Cria um movimento especial `ABERTURA-CAIXA`.
- Define valor inicial e data de corte.
- O caixa disponível considera esse valor como ponto de partida.
- Movimentos anteriores à abertura não entram no saldo atual depois da abertura.

Finalidade:

- Permitir iniciar controle financeiro mesmo com histórico anterior incompleto.

### 7.8 Resumo Visual e Insights

Resumo visual:

- Agrupa entradas por origem/categoria.
- Agrupa saídas por categoria.
- Usa barras proporcionais.

Insights:

- Maior entrada.
- Maior saída.
- Alertas de pendências.
- Indicações rápidas de atenção financeira.

### 7.9 Tabela e Extrato

Tabela:

- Lista movimentos filtrados.
- Mostra tipo, data, descrição, categoria, valor, origem/status.
- Ações aparecem quando o movimento é manual/editável.

Extrato:

- Modal que agrupa movimentos por dia.
- Exibe saldo/linha do tempo financeira.

Finalidade:

- Permitir auditoria do caixa.

---

## 8. Aba Estratégia

### 8.1 Objetivo

A aba **Estratégia** funciona como consultor gerencial do lojista, transformando os números do período em diagnósticos e recomendações.

### 8.2 Base de Dados

Usa:

- Métricas do período atual.
- Métricas do período anterior.
- Pedidos.
- Produtos.
- Contagem/ranking de produtos.
- Indicadores calculados pelo Painel Geral.

### 8.3 Blocos Existentes

Blocos principais:

- Consultor Estratégico.
- Prioridade do Dia.
- Dinheiro Rápido.
- Visão Geral Financeira.
- Qualidade do Funil.
- Perfil e Comportamento Recente.
- Focos de Sangria.
- O Que Fazer Agora.
- Logística & Estoque.
- Radar de Crescimento.

### 8.4 Diagnósticos

O diagnóstico considera:

- Conversão.
- Ticket médio.
- Produto mais forte.
- Crescimento ou queda.
- Produtos parados.
- Vendas pendentes.
- Cancelamentos.
- Vendas perdidas.

Estados possíveis do funil:

- Excelente.
- Saudável.
- Atenção.
- Problema.
- Crítico.

Como funciona:

- O módulo calcula métricas derivadas.
- Classifica o cenário.
- Escolhe textos e recomendações por templates.
- Renderiza cards e seções consultivas.

Finalidade:

- Dizer ao lojista onde agir primeiro, o que tentar vender, onde há perda e onde há oportunidade.

---

## 9. Aba Métricas

### 9.1 Objetivo

A aba **Métricas** mede comportamento dos visitantes da vitrine em tempo real.

### 9.2 Header

Elementos:

- Título: `Métricas da Vitrine`.
- Subtítulo: acompanhamento de visitas, engajamento e conversões.
- Filtro de período.
- Botão de atualizar.

Períodos:

- Hoje.
- Ontem.
- Últimos 7 dias.
- Últimos 14 dias.
- Últimos 30 dias.
- Máximo.

### 9.3 Estados da Tela

Estados existentes:

- Loading.
- Conteúdo carregado.
- Empty state.

Loading:

- Spinner roxo.
- Texto: `Carregando métricas...`.

Empty:

- Ícone de gráfico.
- Título: `Nenhuma métrica registrada`.
- Texto: `As métricas aparecerão conforme visitantes acessam a vitrine.`

### 9.4 Seção Visão Geral

Cards:

1. **Visitas Totais**
   - ID: `met-visitas`.
   - Conta eventos de visita.

2. **Visitantes Únicos**
   - ID: `met-unicos`.
   - Conta sessões únicas.

3. **Ativos Agora**
   - ID: `met-ativos`.
   - Calcula visitantes ativos por heartbeat recente.
   - Possui indicador pulsante verde.

4. **Mensagens Enviadas**
   - ID: `met-mensagens`.
   - Conta eventos de mensagem enviada.

### 9.5 Seção Engajamento

Contadores:

- **Cliques em Produtos**
  - ID: `met-cliques-produto`.

- **Cliques WhatsApp**
  - ID: `met-cliques-whatsapp`.

Rankings:

- Produtos Mais Vistos.
- Produtos Mais Clicados.
- WhatsApp por Produto.
- WhatsApp por Atendente.

Como funciona:

- Rankings agrupam eventos por produto ou atendente.
- Cada lista mostra os itens mais relevantes por volume.

### 9.6 Seção Funil de Conversão

Cards:

1. **Taxa Visita -> Clique**
   - ID: `met-taxa-clique`.
   - Fórmula: visitantes/interações que clicaram em produto em relação às visitas.
   - Texto auxiliar: `Visitantes que clicaram em um produto`.

2. **Taxa Clique -> Mensagem**
   - ID: `met-taxa-mensagem`.
   - Fórmula: mensagens/WhatsApp em relação a cliques.
   - Texto auxiliar: `Cliques que resultaram em mensagem WhatsApp`.

### 9.7 Atividade Recente

Feature: **Log de eventos recentes**.

Como funciona:

- Lista eventos mais recentes.
- Usa ícones diferentes por tipo de evento.
- Mostra comportamento em ordem cronológica.

### 9.8 Atualização em Tempo Real

Como funciona:

- Quando a aba está ativa, a contagem de visitantes ativos é atualizada a cada 15 segundos.
- O botão de atualizar refaz a busca completa.

Finalidade:

- Dar ao lojista noção viva de tráfego e intenção de compra.

---

## 10. Aba Vendas > Histórico

### 10.1 Objetivo

A aba **Histórico** gerencia pedidos vindos da vitrine e pedidos criados manualmente.

### 10.2 KPIs Operacionais

Indicadores existentes:

- Quantidade de vendas/pedidos.
- Faturamento.
- Ticket médio.
- Margem.
- Negociações.
- Desconto médio.
- Lucro médio.

Finalidade:

- Dar visão operacional rápida sobre o período e os pedidos filtrados.

### 10.3 Visualizações

Modos:

- Lista/tabela.
- Grid/cards.

Como funciona:

- O modo selecionado é salvo em localStorage com chave `vendly_orders_view`.
- A tabela é melhor para leitura densa.
- O grid é melhor para leitura visual em telas menores ou análise rápida.

### 10.4 Filtros

Busca:

- Cliente.
- Produto.
- ID do pedido.
- IMEI.

Filtros rápidos/premium:

- Período.
- Status.
- Financeiro.
- Pagamento.

Filtros avançados:

- Período.
- Status.
- Categoria/marca.
- Condição.
- Armazenamento.
- Forma de pagamento.
- Margem.
- Apenas negociados.
- Apenas vendas com perda.

Persistência:

- Os últimos filtros podem ser salvos em localStorage com chave `vendly_last_filters`.

### 10.5 Tabela/Listagem de Pedidos

Dados exibidos:

- Data.
- Produto.
- Variação.
- Cliente.
- Telefone.
- Quantidade.
- Total.
- Preço final quando negociado.
- Status.
- Pagamento.
- Margem/lucro quando possível.
- Ações.

Estados:

- Skeleton/loading.
- Lista vazia.
- Contador de resultados.

### 10.6 Status de Pedido

Status usados:

- Pendente.
- Fechado.
- Cancelado.
- Outros status existentes no dado, quando retornados.

Como funciona:

- Alterar status para `Fechado` pode abrir modal de negociação.
- Ao fechar venda, o sistema pode:
  - registrar preço final;
  - registrar cliente;
  - registrar telefone;
  - registrar forma(s) de pagamento;
  - registrar aparelho recebido na troca;
  - adicionar aparelho recebido ao estoque;
  - baixar estoque do produto vendido.

### 10.7 Modal de Negociação/Fechamento

Campos e recursos:

- Preço final negociado.
- Nome do cliente.
- Telefone.
- Múltiplas formas de pagamento.
- Valores por forma de pagamento.
- Aparelho recebido como parte do pagamento.
- Dados do aparelho recebido.
- Opção de adicionar aparelho recebido ao estoque.

Validações:

- O valor pago deve bater com o preço final.
- Dados essenciais do cliente/pagamento devem ser preenchidos conforme fluxo.
- Se adicionar aparelho ao estoque, dados mínimos do produto recebido são necessários.

Finalidade:

- Registrar a realidade da venda, inclusive negociação e troca.

### 10.8 Edição de Pedido

Feature: **Drawer/modal de edição de pedido**.

Campos:

- Data.
- Cliente.
- Telefone.
- Preço final.
- Status.
- Linhas de pagamento.

Como funciona:

- Valida balanceamento de pagamentos.
- Salva via action `salvar_edicao_pedido`.
- Atualiza dashboard após salvar.

Finalidade:

- Corrigir ou complementar dados de pedidos já existentes.

### 10.9 Pedido Manual

Feature: **Cadastrar venda manualmente**.

Campos:

- Produto.
- Quantidade.
- Preço customizado opcional.
- Cliente.
- Telefone.
- Forma de pagamento/status, conforme modal.

Como funciona:

- Lista produtos ordenados e com estoque.
- Bloqueia seleção incompatível com estoque.
- Salva via action `salvar_pedido`.

Finalidade:

- Registrar vendas feitas fora da vitrine.

### 10.10 Exclusão de Pedido

Feature: **Excluir pedido**.

Como funciona:

- Abre confirmação antes de excluir.
- Chama action `excluir_pedido`.

Finalidade:

- Remover pedido incorreto ou inválido.

### 10.11 Recibo

Feature: **Geração de recibo em PDF**.

Como funciona:

- Botão de recibo abre modal.
- Preenche dados do pedido/produto.
- Valida CPF/CNPJ:
  - CPF com 11 dígitos.
  - CNPJ com 14 dígitos.
- Valida telefone:
  - 10 ou 11 dígitos.
- Usa jsPDF.
- Usa template visual:
  - `recibo-template-novo.png`.
  - `recibo-template-seminovo.png`.
- Gera PDF com dados posicionados por coordenadas.

Finalidade:

- Emitir comprovante de venda para o cliente.

---

## 11. Aba Vendas > Fiado

### 11.1 Objetivo

A aba **Fiado** controla vendas parceladas/informais, valores pendentes, recebimentos e atrasos.

### 11.2 Métricas

Cards existentes:

- Total pendente a receber.
- Recebido no mês.
- Clientes devedores.
- Valor em atraso.
- Total recebido.

Finalidade:

- Mostrar risco e caixa futuro de vendas fiadas.

### 11.3 Listagem

Visualizações:

- Lista.
- Grid.

Dados exibidos:

- Cliente.
- Produto.
- Valor.
- Entrada.
- Parcelas.
- Status.
- Atrasos.
- Ações.

### 11.4 Novo Fiado

Feature: **Criar venda fiada**.

Campos:

- Cliente.
- Telefone.
- Produto.
- Quantidade.
- Valor de venda.
- Entrada.
- Número de parcelas.
- Datas de vencimento.
- Produto recebido na negociação, quando aplicável.
- Opção de adicionar produto recebido ao estoque.

Como funciona:

- Seleciona produto existente.
- Monta cronograma de parcelas.
- Salva via action `salvar_fiado`.
- Se houver produto recebido e a opção estiver marcada, ele pode entrar no estoque.

Finalidade:

- Formalizar venda fiada e acompanhar recebimento por parcelas.

### 11.5 Detalhes do Fiado

Feature: **Drawer/modal de detalhes**.

Mostra:

- Dados do cliente.
- Dados do produto.
- Valor total.
- Valor pendente.
- Entrada.
- Parcelas.
- Status de cada parcela.
- Botões de pagamento.
- Botão de cancelar fiado.

### 11.6 Pagamento de Parcela

Como funciona:

- O usuário clica para pagar uma parcela.
- Chama action `pagar_parcela_fiado`.
- Atualiza status da parcela.
- Atualiza métricas e fluxo de caixa automático.

Finalidade:

- Controlar recebimentos reais do fiado.

### 11.7 Cancelar Fiado

Como funciona:

- Exige confirmação.
- Chama action `cancelar_fiado`.
- Marca o fiado como cancelado.

Finalidade:

- Encerrar uma dívida inválida ou desistida.

---

## 12. Aba Estoque

### 12.1 Objetivo

A aba **Estoque** controla os produtos vendidos na vitrine e usados nos fluxos internos.

### 12.2 Métricas do Estoque

Cards existentes:

- Patrimônio em estoque.
- Quantidade total.
- Esgotados.
- Poucas unidades.
- Disponíveis.

Como funciona:

- Patrimônio soma custo unitário multiplicado por estoque atual.
- Produtos com estoque zero entram em esgotados.
- Produtos com estoque igual a 1 entram em poucas unidades.
- Produtos ativos e com estoque positivo entram como disponíveis.

### 12.3 Busca e Filtros

Busca:

- Nome.
- SKU.
- IMEI 1.
- IMEI 2.

Filtros:

- Todos.
- Em estoque.
- Esgotados.
- Baixo estoque.
- Parados.
- Vendidos.

Como funciona:

- "Baixo estoque" considera estoque igual a 1.
- "Parados" considera produtos sem giro por determinado período.
- "Vendidos" considera produtos com data de venda/giro.

### 12.4 Ordenação da Listagem

Prioridade:

1. Produtos ativos com estoque.
2. Produtos ativos sem estoque.
3. Produtos inativos.

Finalidade:

- Deixar itens vendáveis e críticos mais visíveis.

### 12.5 Visualizações

Modos:

- Tabela/lista.
- Grid/cards.

Persistência:

- Modo salvo em localStorage com chave `vendly_estoque_view`.

### 12.6 Tabela de Estoque

Colunas:

- Produto / Variação.
- Custo unitário.
- Preço de venda.
- Resultado.
- Giro.
- Estoque atual/mínimo.
- Ações.

Dados por linha/card:

- Imagem.
- Nome.
- SKU.
- Cor.
- Armazenamento.
- Condição.
- IMEI.
- Custo.
- Preço.
- Lucro/margem estimada.
- Status de estoque.
- Status ativo/inativo.

### 12.7 Edição Inline de Estoque

Feature: **Ajustar estoque sem abrir modal**.

Campos editáveis:

- Estoque atual.
- Estoque mínimo.

Como funciona:

- Alterações ficam em `pendingEstoqueUpdates`.
- Botão de salvar aparece quando há alteração pendente.
- Ao salvar, chama action `salvar_estoque`.
- Após sucesso, atualiza estado local e re-renderiza.

Finalidade:

- Permitir ajuste rápido de estoque.

### 12.8 Ativar/Desativar Produto

Feature: **Publicar ou ocultar produto da vitrine**.

Como funciona:

- Botão altera o campo ativo/inativo.
- Chama action `toggle_ativo`.
- Produto inativo não deve ser comprável na vitrine.

Finalidade:

- Tirar produto da vitrine sem apagar cadastro.

### 12.9 Excluir Produto

Feature: **Remover produto**.

Como funciona:

- Abre confirmação.
- Chama action `remover_produto`.

Finalidade:

- Remover produto cadastrado incorretamente ou que não deve mais existir.

### 12.10 Cadastro e Edição de Produto

Feature: **Modal de cadastro/edição de produto**.

Tipos:

- Novo.
- Seminovo.

Campos principais:

- Nome do produto.
- Descrição.
- Categoria.
- Preço.
- Custo.
- Cor.
- Armazenamento.
- RAM.
- Câmeras.
- Bateria.
- Tela.
- Condição.
- IMEI.
- Saúde da bateria.
- Estoque.
- Estoque mínimo.
- Data de entrada.
- Imagens.
- Publicar na vitrine/ativo.

Recursos:

- Upload de imagem.
- Compressão de imagem.
- Envio para Drive via action `upload_imagem`.
- Múltiplas imagens por produto.
- Variações do mesmo produto.
- Alternância de unidade GB/TB.
- Geração de ID/SKU.

Como funciona:

- Cadastro novo chama action `salvar_produto`.
- Edição chama action `editar_produto`.
- Variações podem ser cadastradas em lote.
- Produto pode nascer ativo ou inativo.

Finalidade:

- Alimentar vitrine, estoque, vendas e compras com produtos consistentes.

---

## 13. Aba Compras

### 13.1 Objetivo

A aba **Compras** controla encomendas/lotes comprados para revenda, antes e depois de chegarem ao estoque.

### 13.2 Header e Ações

Elementos:

- Título da área.
- Busca.
- Filtro de status.
- Filtro de prazo.
- Botão para adicionar lote.

Filtros de status:

- Todos.
- Pendentes.
- Atrasados.

Filtros de prazo:

- Todos.
- Hoje.
- Próximos 3 dias.
- Próximos 7 dias.
- Próximos 15 dias.
- Atrasados.

### 13.3 Métricas

Cards existentes:

- Patrimônio em trânsito.
- Aparelhos pendentes.
- Ticket médio esperado.
- Lucro estimado total.
- ROI estimado.

Como funciona:

- Considera principalmente itens pendentes e compatíveis com filtros.
- Usa custo, preço previsto, quantidade e custos gerais do lote.

Finalidade:

- Mostrar quanto dinheiro está comprometido em mercadoria ainda não disponível.

### 13.4 Resumo de Chegada

Feature: **Resumo de prazos**.

Mostra:

- Próxima chegada.
- Lotes atrasados.
- Alertas por prazo.

Finalidade:

- Ajudar o lojista a cobrar fornecedor e planejar venda.

### 13.5 Agrupamento por Lote

Como funciona:

- Encomendas são agrupadas por `lote_id`.
- Cada lote pode conter vários itens.
- Lotes/cards podem ser expandidos.

Dados do lote:

- Fornecedor.
- Data da compra.
- Previsão de chegada.
- Custos gerais.
- Observações.
- Status financeiro.
- Histórico de pagamentos.
- Itens.

Status visual:

- Pendente.
- Chegou/recebido.
- Pago.
- Parcial.
- Pendente financeiro.

### 13.6 Cadastro/Edição de Lote

Feature: **Modal de lote de compra**.

Campos do lote:

- Fornecedor.
- Data da compra.
- Previsão de chegada.
- Frete.
- Taxas.
- Custo adicional.
- Observação.

Campos dos itens:

- Modelo.
- Memória.
- Cor.
- Condição.
- Custo.
- Preço previsto.
- Quantidade.
- Status.
- Imagens.

Rateio:

- Custos gerais são distribuídos entre os itens por quantidade.
- O sistema mostra custo real, lucro esperado e ROI estimado.

Como funciona:

- Salva via action `salvar_lote_encomendado`.
- Edição mantém dados financeiros/histórico quando existentes.

Finalidade:

- Registrar compra antes de ela virar estoque disponível.

### 13.7 Marcar Chegada

Feature: **Transformar encomenda em estoque**.

Fluxos:

- Marcar item individual como chegou.
- Marcar lote como chegou.

Como funciona:

- Abre modal de confirmação/integração com estoque.
- Permite preencher dados finais do produto.
- Permite imagens, drag/drop, reordenação e remoção.
- Chama action `marcar_chegou`.
- Ao concluir, o item entra no estoque.

Finalidade:

- Converter mercadoria em trânsito em produto disponível para venda.

### 13.8 Pagamento de Lote

Feature: **Controle financeiro da compra**.

Campos:

- Status do pagamento.
- Data do pagamento.
- Valor pago.
- Forma de pagamento.
- Histórico de pagamentos.

Status:

- Pendente.
- Parcial.
- Pago.

Como funciona:

- Permite registrar pagamento total ou parcial.
- Mantém histórico de pagamentos.
- Chama action `marcar_pagamento_lote`.
- Pagamentos alimentam o Fluxo de Caixa como saídas automáticas.

Finalidade:

- Controlar contas a pagar de fornecedores e impacto no caixa.

### 13.9 Remover Lote ou Item

Como funciona:

- Abre confirmação.
- Chama action `remover_encomendado`.

Finalidade:

- Corrigir compras cadastradas por engano ou remover itens cancelados.

---

## 14. Notificações

### 14.1 Notificação de Novo Pedido

Feature: **Alerta visual/sonoro no dashboard**.

Como funciona:

- Compara pedidos já conhecidos com novos pedidos.
- Usa localStorage `vendly_notified_orders`.
- Mantém histórico limitado aos últimos 500 IDs notificados.
- Toca som `assets/sounds/neworder_notification.mp3`.
- Mostra notificação com ID/produto.
- Possui ação "Ver Detalhes".

Finalidade:

- Avisar o lojista rapidamente quando chegar pedido novo da vitrine.

---

## 15. Onboarding do Dashboard

### 15.1 Tutorial Guiado

Feature: **Guia inicial do painel**.

Como funciona:

- Usa Driver.js.
- Primeira execução controlada por localStorage `dashboard_onboarding_done`.
- Pode ser acionado manualmente pelo botão "Ver tutorial" da sidebar.

Conteúdo geral:

- Explica o Painel Geral.
- Explica Histórico de Pedidos.
- Explica Estratégia.
- Explica Estoque.
- Explica áreas importantes do painel.

Finalidade:

- Ensinar o lojista a usar o dashboard sem treinamento externo.

---

## 16. Backend/API

### 16.1 GET Actions

Actions existentes:

- `produtos`
  - Retorna produtos cadastrados.

- `pedidos`
  - Retorna pedidos/vendas.

- `fiados`
  - Retorna vendas fiadas.

- `encomendados`
  - Retorna compras/encomendas.

- `metricas`
  - Retorna eventos de comportamento da vitrine.

- `movimentos_caixa`
  - Retorna movimentos manuais e abertura de caixa.

- `click`
  - Registra/incrementa clique de produto.

### 16.2 POST Actions

Actions existentes:

- `atualizarstatus`
  - Atualiza status de pedido.
  - Pode fechar venda, registrar negociação, pagamento e troca.

- `salvar_estoque`
  - Salva ajustes manuais de estoque e estoque mínimo.

- `salvar_edicao_pedido`
  - Salva edição manual de pedido.

- `salvar_produto`
  - Cadastra produto novo.

- `editar_produto`
  - Edita produto existente.

- `toggle_ativo`
  - Ativa/desativa produto na vitrine.

- `remover_produto`
  - Remove produto.

- `upload_imagem`
  - Recebe imagem e salva/retorna URL.

- `excluir_pedido`
  - Exclui pedido.

- `salvar_pedido`
  - Cria pedido manual.

- `registrar_evento`
  - Salva métrica/evento da vitrine.

- `salvar_encomendado`
  - Salva encomenda individual.

- `salvar_lote_encomendado`
  - Salva lote com vários itens.

- `marcar_chegou`
  - Marca encomenda como recebida e integra ao estoque.

- `remover_encomendado`
  - Remove compra/encomenda.

- `salvar_fiado`
  - Cria venda fiada.

- `pagar_parcela_fiado`
  - Marca parcela de fiado como paga.

- `cancelar_fiado`
  - Cancela fiado.

- `salvar_movimento_caixa`
  - Cria movimento manual no fluxo de caixa.

- `editar_movimento_caixa`
  - Edita movimento manual.

- `remover_movimento_caixa`
  - Remove movimento manual.

- `salvar_abertura_caixa`
  - Define caixa inicial.

- `marcar_pagamento_lote`
  - Registra pagamento total/parcial de lote de compra.

### 16.3 Regras Importantes do Backend

- A API sempre deve responder JSON.
- Formato obrigatório:

```json
{ "ok": true, "data": "..." }
```

ou:

```json
{ "ok": false, "error": "..." }
```

- O frontend depende dos nomes atuais de campos.
- A migração SaaS deve mapear os dados com cuidado para não quebrar:
  - produtos;
  - pedidos;
  - estoque;
  - fiados;
  - encomendas;
  - métricas;
  - movimentos de caixa.

---

## 17. Componentes e Padrões Reutilizáveis

### 17.1 Cards de Métrica

Usados em:

- Painel Geral.
- Fluxo de Caixa.
- Compras.
- Fiado.
- Métricas.
- Estoque.

Características:

- Título curto.
- Valor principal forte.
- Subtexto/variação quando necessário.
- Ícone contextual.
- Cores por categoria/estado.

Finalidade:

- Permitir leitura rápida de indicadores.

### 17.2 Tabelas/Listagens

Usadas em:

- Vendas.
- Estoque.
- Fluxo de Caixa.
- Compras.
- Fiado.

Características:

- Cabeçalhos em caixa alta pequena.
- Linhas com divisórias leves.
- Ações no fim da linha.
- Estados vazios.
- Alternância para cards/grid em alguns módulos.

Finalidade:

- Dar controle operacional denso sem sair da tela.

### 17.3 Modais e Drawers

Usados em:

- Produto da vitrine.
- Carrinho.
- Comparador.
- Cadastro de produto.
- Edição de produto.
- Negociação de venda.
- Edição de pedido.
- Pedido manual.
- Recibo.
- Novo fiado.
- Detalhes do fiado.
- Cadastro de lote.
- Chegada de compra.
- Pagamento de lote.
- Fluxo de caixa.
- Extrato.

Características:

- Fundo com overlay.
- Conteúdo branco.
- Cabeçalho com título e botão de fechar.
- Corpo rolável quando necessário.
- Rodapé com ações principais.

Finalidade:

- Permitir fluxos complexos sem trocar de página.

### 17.4 Toasts/Feedback

Usados para:

- Sucesso.
- Erro.
- Aviso.
- Confirmações rápidas.

Finalidade:

- Dar retorno imediato após ações sem interromper o usuário.

### 17.5 Badges

Usados para:

- Status de produto.
- Status de pedido.
- Status financeiro.
- Estoque.
- Popularidade.
- Condição.
- Labels de sidebar.

Finalidade:

- Comunicar estado em pouco espaço.

---

## 18. Regras de Responsividade Existentes

### 18.1 Vitrine

Comportamentos:

- Banner troca imagem desktop/mobile.
- Catálogo reorganiza cards conforme largura.
- Modal ocupa melhor o espaço disponível.
- Carrinho e comparação continuam acessíveis.
- Gestos de swipe funcionam no banner.

### 18.2 Dashboard

Comportamentos:

- Sidebar desktop fixa.
- Sidebar mobile como drawer.
- Topbar mobile possui botão de menu.
- Filtros possuem versões desktop/mobile.
- Cards reorganizam de múltiplas colunas para uma/duas colunas.
- Tabelas podem ter scroll horizontal.
- Algumas áreas usam cards no mobile para melhorar leitura.
- Modais em mobile tendem a ocupar base/tela com altura máxima e rolagem interna.

### 18.3 Regra Geral para Migração

A versão SaaS deve preservar:

- Mesma hierarquia de navegação.
- Mesmos nomes de abas.
- Mesmos fluxos em modais.
- Mesma lógica de filtros.
- Mesma separação entre Gestão e Operação.
- Mesma experiência mobile de sidebar/drawer.

---

## 19. O Que Existe Hoje por Área

### 19.1 Gestão

Existe:

- Painel Geral.
- Fluxo de Caixa.
- Estratégia.
- Métricas da Vitrine.

Não inferir como existente:

- Multi-loja avançado.
- Gestão de usuários/equipe.
- Permissões por perfil.
- Assinatura/planos SaaS.
- Emissão fiscal.
- Integração com gateway de pagamento.
- Integração nativa com transportadora.

### 19.2 Operação

Existe:

- Histórico de vendas.
- Fechamento de pedido.
- Negociação.
- Pedido manual.
- Recibo.
- Fiado.
- Estoque.
- Cadastro de produto.
- Compras/encomendas.
- Chegada ao estoque.
- Pagamento de lote.

Não inferir como existente:

- PDV completo com leitor fiscal.
- Controle de comissão por vendedor.
- Código de barras completo.
- Relatórios contábeis formais.
- Controle de assistência técnica.

### 19.3 Vitrine

Existe:

- Banner.
- Hero.
- Catálogo.
- Busca.
- Filtros.
- Ordenação.
- Produto com variações.
- Modal de produto.
- Comparador.
- Carrinho.
- Parcelamento.
- Checkout WhatsApp.
- Social proof.
- Tracking.
- Tutorial.

Não inferir como existente:

- Pagamento online direto.
- Login de cliente.
- Área de pedidos do cliente.
- Frete calculado automaticamente.
- Cupom de desconto completo.

---

## 20. Checklist para o Agente da Versão SaaS

### 20.1 Navegação

- [ ] Sidebar mantém grupo **Gestão**.
- [ ] Sidebar mantém grupo **Operação**.
- [ ] Painel Geral continua sendo primeira aba.
- [ ] Vendas continua sendo item pai com submenu.
- [ ] Histórico e Fiado continuam dentro de Vendas.
- [ ] Estoque e Compras continuam no grupo Operação.
- [ ] Estratégia mantém badge `IA`.
- [ ] Métricas mantém badge `LIVE`.
- [ ] Link "Ver Vitrine" continua disponível.
- [ ] Tutorial continua acionável.
- [ ] Sair continua no rodapé.

### 20.2 Vitrine

- [ ] Banner aceita desktop/mobile.
- [ ] Catálogo filtra por busca, categoria e condição.
- [ ] Ordenação mantém opções atuais.
- [ ] Produtos inativos não ficam compráveis.
- [ ] Produtos sem estoque exibem indisponibilidade.
- [ ] Modal de produto agrupa variações.
- [ ] Seletores de cor/armazenamento/condição funcionam.
- [ ] Comparador aceita até 3 produtos.
- [ ] Carrinho respeita estoque.
- [ ] Parcelamento usa taxas configuradas.
- [ ] Checkout envia pedido e abre WhatsApp.
- [ ] Eventos de métrica continuam registrados.

### 20.3 Painel Geral

- [ ] KPIs principais continuam presentes.
- [ ] Filtro global de período funciona.
- [ ] Comparação com período anterior continua.
- [ ] Capital em estoque considera custo x estoque.
- [ ] Capital em trânsito considera compras pendentes.
- [ ] Rankings e gráficos continuam presentes.

### 20.4 Fluxo de Caixa

- [ ] Entradas automáticas de vendas continuam.
- [ ] Entradas automáticas de fiado continuam.
- [ ] Saídas automáticas de compras continuam.
- [ ] Movimentos manuais continuam editáveis/removíveis.
- [ ] Caixa inicial continua funcionando como corte.
- [ ] Caixa disponível usa caixa inicial + movimentos posteriores.
- [ ] Patrimônio operacional soma caixa disponível + capital imobilizado.
- [ ] Pendentes a receber vêm de fiados.
- [ ] Pendentes a pagar vêm de compras.
- [ ] Extrato continua agrupado por dia.

### 20.5 Vendas

- [ ] Histórico mostra pedidos da vitrine e manuais.
- [ ] Filtros operacionais continuam.
- [ ] Lista/grid continuam.
- [ ] Fechamento de pedido mantém negociação.
- [ ] Múltiplos pagamentos continuam.
- [ ] Troca com aparelho recebido continua.
- [ ] Baixa de estoque ao fechar venda continua.
- [ ] Pedido manual continua.
- [ ] Edição de pedido continua.
- [ ] Exclusão de pedido continua.
- [ ] Recibo em PDF continua.

### 20.6 Fiado

- [ ] Métricas de pendente, recebido, clientes e atraso continuam.
- [ ] Criação de fiado continua com parcelas.
- [ ] Pagamento de parcela continua.
- [ ] Cancelamento de fiado continua.
- [ ] Produto recebido em fiado pode entrar no estoque quando marcado.
- [ ] Fiado alimenta fluxo de caixa quando pago.

### 20.7 Estoque

- [ ] Cadastro de produto mantém campos atuais.
- [ ] Edição de produto mantém campos atuais.
- [ ] Variações continuam.
- [ ] Upload de imagens continua.
- [ ] Produto pode ser ativo/inativo.
- [ ] Edição inline de estoque continua.
- [ ] Estoque mínimo continua.
- [ ] Filtros continuam.
- [ ] Exclusão continua.

### 20.8 Compras

- [ ] Cadastro de lote continua.
- [ ] Itens múltiplos por lote continuam.
- [ ] Rateio de custos continua.
- [ ] Métricas de trânsito, lucro e ROI continuam.
- [ ] Marcar chegada continua integrando ao estoque.
- [ ] Pagamento parcial/total de lote continua.
- [ ] Histórico de pagamentos continua.
- [ ] Compras pagas alimentam fluxo de caixa como saída.

### 20.9 Métricas

- [ ] Eventos da vitrine continuam.
- [ ] Visitantes únicos continuam por sessão.
- [ ] Ativos agora continuam por heartbeat recente.
- [ ] Rankings por produto continuam.
- [ ] WhatsApp por atendente continua.
- [ ] Funil visita -> clique e clique -> mensagem continua.
- [ ] Atividade recente continua.

---

## 21. Observações para Migração SaaS

1. **Não mudar nomes funcionais sem mapear**
   - Muitos fluxos dependem de campos como `sku`, `grupo_id`, `estoque`, `ativo`, `status`, `pagamento`, `historico_pagamentos`.

2. **Separar dado operacional de dado financeiro**
   - Vendas, fiados e compras geram impacto no caixa, mas nem todo registro deve virar movimento manual.

3. **Preservar movimentos automáticos**
   - A versão SaaS deve continuar derivando movimentos de vendas/fiado/compras, ou criar eventos financeiros equivalentes no backend.

4. **Preservar a lógica de produto ativo**
   - Produto inativo pode existir no estoque/admin, mas não deve aparecer como opção comprável na vitrine.

5. **Preservar histórico financeiro de compras**
   - Pagamentos parciais de lotes precisam continuar deduplicados e auditáveis.

6. **Preservar o conceito de caixa inicial**
   - Abertura de caixa é fundamental para iniciar o controle sem importar todo histórico passado.

7. **Preservar tracking da vitrine**
   - Métricas e Estratégia dependem da coleta de eventos.

8. **Preservar fluxo por WhatsApp**
   - No MVP, a venda não é checkout online; ela vira atendimento.

9. **Preservar a experiência de modais**
   - A maior parte das operações acontece sem sair da aba atual.

10. **Não transformar o MVP em outro produto**
    - A versão de mercado pode melhorar arquitetura, segurança e persistência, mas deve replicar as features e fluxos atuais antes de redesenhar.

---

## 22. Resumo Executivo das Features Existentes

O Vendly MVP já possui:

- Vitrine pública com catálogo, filtros, produto com variações, comparador, carrinho e WhatsApp.
- Tracking completo de comportamento da vitrine.
- Dashboard com sidebar organizada em Gestão e Operação.
- Painel Geral com indicadores financeiros e operacionais.
- Estratégia com análise consultiva.
- Métricas em tempo real da vitrine.
- Histórico de vendas com negociação, fechamento, edição, pedido manual e recibo.
- Controle de fiado com parcelas, recebimentos e atraso.
- Controle de estoque com cadastro, edição, variações, imagens, estoque mínimo e ativação.
- Controle de compras/lotes com previsão de chegada, rateio, chegada ao estoque e pagamentos.
- Fluxo de caixa com entradas/saídas automáticas, movimentos manuais, caixa inicial, extrato e patrimônio operacional.
- Notificações de novos pedidos.
- Onboarding/tutorial no dashboard e vitrine.

Este conjunto deve ser tratado como a base funcional mínima da versão real do Vendly.
