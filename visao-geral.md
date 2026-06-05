# Visão Geral do Dashboard Vendly MVP

Documento técnico-funcional da aba de visão geral do MVP atual do Vendly.

Fontes principais:

- Estrutura visual: `src/dashboard/index.html`, seção `tab-geral`.
- Cálculos, gráficos e rankings: `src/dashboard/modules/analytics.js`.
- Filtro global, carregamento e renderização: `src/dashboard/main.js`, `src/dashboard/modules/dashboard.js`, `src/dashboard/modules/store.js`.
- Tooltips globais: `src/dashboard/modules/ui.js`.

Observação: no menu lateral, a aba é exibida como **Painel Geral** (`tab-btn-geral`). Dentro do conteúdo, ela funciona como a visão geral executiva do dashboard, reunindo performance, saúde do negócio, investimentos, alertas, gráficos e rankings.

## 1. Localização e Papel da Aba

A aba é o elemento:

```html
<div id="tab-geral" class="tab-content space-y-6">
```

Ela é o conteúdo inicial do dashboard e aparece no menu lateral como:

```html
<button id="tab-btn-geral" data-tooltip="Painel Geral">
```

Função da aba:

- Mostrar um resumo financeiro e operacional da loja.
- Consolidar vendas fechadas, canceladas e pendentes.
- Mostrar estoque atual e capital preso no negócio.
- Exibir investimento recuperado, capital imobilizado, resultado real e ROI.
- Apontar produto de maior giro.
- Exibir gráficos históricos e distribuição de vendas.
- Exibir rankings de modelos, variações, receita/ticket e produtos parados.

## 2. Como a Aba é Renderizada

O fluxo de carregamento é:

1. `main.js` inicializa o dashboard.
2. `store.loadDashboardData(RENDER_PIPELINE)` busca dados da API:
   - pedidos (`action=pedidos`);
   - produtos (`action=produtos`);
   - fiados (`action=fiados`);
   - encomendados (`action=encomendados`).
3. `dashboard.aplicarFiltroPeriodo()` define:
   - `state.filteredOrders`;
   - `state.previousOrders`;
   - `state.currentPeriodStart`;
   - `state.currentPeriodEnd`.
4. `RENDER_PIPELINE.renderVisuals()` chama sempre:
   - `analytics.calcularKPIsEInsights()`;
   - `analytics.renderCharts()`;
   - `analytics.renderRankings()`.

Mesmo quando outra aba está ativa, o núcleo de analytics é recalculado globalmente. Quando a aba ativa é `tab-geral`, não há render especial adicional, pois os elementos da visão geral já são atualizados pelas funções globais.

## 3. Filtro Global de Período

A Visão Geral usa o filtro global do topo:

- Desktop: `period-filter`.
- Mobile: `period-filter-mobile`.

Opções padrão:

- `today`: Hoje.
- `yesterday`: Ontem.
- `7`: Últimos 7 dias.
- `14`: Últimos 14 dias.
- `30`: Últimos 30 dias.
- `all`: Máximo.
- `custom`: Personalizado.
- Opções mensais dinâmicas: `month:YYYY-MM`.

Comportamento:

- No primeiro carregamento, o filtro é forçado para `all`.
- Em recarregamentos posteriores, o valor salvo em `localStorage` (`vendly_last_period`) é restaurado.
- Ao mudar o filtro, o app sincroniza desktop e mobile.
- Se o filtro não for `custom`, os dados são recarregados silenciosamente e depois filtrados.
- Se for `custom`, a filtragem só roda quando as datas têm 10 caracteres (`DD/MM/YYYY`).

Como o período é aplicado:

- `all`: todos os pedidos entram em `filteredOrders`, `previousOrders` fica vazio, `currentPeriodEnd` vira a data atual.
- `today`: considera o dia atual e compara com o dia anterior.
- `yesterday`: considera ontem e compara com o dia anterior a ontem.
- `7`, `14`, `30`: considera janela de dias retroativa e compara com janela anterior de mesmo tamanho.
- `custom`: considera intervalo informado e compara com intervalo anterior de mesma duração.
- `month:YYYY-MM`: considera o mês selecionado e compara com o mês anterior.

## 4. Estrutura Visual Geral

A aba tem um wrapper interno:

```html
<div class="space-y-8 mb-8 mt-2">
```

Ordem visual:

1. Top Giro.
2. Grupo A: Performance de Vendas.
3. Grupo B: Saúde do Negócio.
4. Grupo D: Análise de Investimentos.
5. Grupo C: Focos de Alerta.
6. Gráficos principais.
7. Rankings.

Os grupos usam:

- `glass-card`;
- `rounded-xl` ou `rounded-2xl`;
- `shadow-sm`;
- bordas suaves;
- labels pequenos em uppercase;
- cores semânticas por tipo de métrica.

## 5. Top Giro

Elemento:

- `insight-top-giro`.

Visual:

- Badge pequeno antes dos grupos principais.
- Fundo em gradiente claro `from-red-50 to-orange-50`.
- Texto vermelho (`text-red-600`), borda `border-red-100`, ícone de fogo.

Texto:

```text
Top Giro: {produto}
```

Cálculo:

- Usa `state.filteredOrders`.
- Ignora pedidos com `status === "Cancelado"`.
- Ignora pedidos sem produto ou com produto `"Pedido Vazio"`.
- Soma `quantidade` por `produto`.
- Mostra o produto com maior quantidade vendida no período filtrado.
- Se não houver venda válida: `Nenhuma Venda`.

## 6. Grupo A: Performance de Vendas

Título visual:

```text
🥇 Performance de Vendas
```

Contém:

1. Faturamento Real.
2. Resultado Operacional.
3. Ticket Médio.

### 6.1 Faturamento Real

Elemento:

- `kpi-faturamento`.
- Variação: `kpi-faturamento-var`.

Visual:

- Card grande, `glass-card`, `p-6`, `rounded-2xl`.
- Borda verde (`border-green-200`).
- Fundo `bg-gradient-to-br from-green-50 to-white`.
- Ícone decorativo `fa-sack-dollar` grande no canto inferior direito com baixa opacidade.
- Valor em `text-3xl font-black text-green-700`.

Tooltip:

```text
Soma de todas as vendas concluídas (fechadas). Não subtrai custos, representa a entrada bruta.
```

Cálculo:

- Percorre `state.filteredOrders`.
- Considera apenas pedidos com `status === "Fechado"`.
- Soma `o.final_price || o.total`.

Fórmula:

```text
Faturamento Real = soma(final_price ou total) dos pedidos Fechados no período
```

Variação:

- Só aparece se `state.tablePeriodFilter !== "all"`.
- Usa `formatPercent(calcVar(curr.fatBase, prev.fatBase))`.
- Texto adicional: `vs ant.`

Importante:

- O código verifica `state.tablePeriodFilter`, que pertence ao filtro da tabela de vendas, não diretamente ao `period-filter` global. Isso significa que a variação do card pode ficar vazia quando a visão geral está no período global `all` ou quando o filtro da tabela não foi alterado.

### 6.2 Resultado Operacional

Elemento:

- `kpi-lucro`.
- Margem: `kpi-margem`.

Visual:

- Card grande, `glass-card`, `p-6`, `rounded-2xl`.
- Borda esmeralda (`border-emerald-200`).
- Fundo `bg-gradient-to-br from-emerald-50 to-white`.
- Ícone decorativo `fa-chart-line`.
- Valor em `text-3xl font-black text-emerald-700`.

Tooltip do Resultado Operacional:

```text
Faturamento menos o custo dos produtos vendidos. Mostra o ganho sobre as vendas realizadas, sem considerar capital ainda preso em estoque ou trânsito.
```

Tooltip da Margem Operacional:

```text
Percentual do faturamento que sobrou como resultado operacional (Resultado Operacional ÷ Faturamento).
```

Cálculo:

- Para cada pedido fechado em `state.filteredOrders`, soma o faturamento.
- Para custo, tenta localizar o produto em `state.allProducts` por:
  - `p.sku === o.sku`;
  - `p.id === o.sku`;
  - `p.id === o.id`.
- Se encontrar produto, soma `parseNumber(produtoRef.custo || 0) * o.quantidade`.

Fórmulas:

```text
Custo dos Produtos Vendidos = soma(custo do produto * quantidade) dos pedidos Fechados
Resultado Operacional = Faturamento Real - Custo dos Produtos Vendidos
Margem Operacional = Resultado Operacional / Faturamento Real * 100
```

Estados visuais da margem:

- Margem maior que zero e menor que 10%: `text-orange-600`.
- Margem menor ou igual a zero: `text-red-600`.
- Margem maior ou igual a 10%: `text-emerald-700`.

Texto renderizado:

```text
📊 Margem Operacional: {percentual}%
```

### 6.3 Ticket Médio

Elemento:

- `kpi-ticket-medio`.

Visual:

- Card horizontal menor, `glass-card p-4 rounded-xl`.
- Borda `border-indigo-100`.
- Fundo `bg-indigo-50/30`.
- Ícone circular `fa-bullseye`, fundo `bg-indigo-100`, texto `text-indigo-600`.
- Valor em `text-xl font-bold text-gray-800`.

Tooltip:

```text
Valor médio gasto por cliente em vendas concluídas.
```

Cálculo:

- Usa o número de pedidos únicos fechados (`id_do_pedido`) no período.
- Divide faturamento real pelo total de pedidos fechados.

Fórmula:

```text
Ticket Médio = Faturamento Real / quantidade de pedidos fechados
```

Se não houver pedidos fechados:

```text
R$ 0,00
```

## 7. Grupo B: Saúde do Negócio

Título visual:

```text
🥈 Saúde do Negócio
```

Contém:

1. Patrimônio em Estoque.
2. Quantidade de Aparelhos.

### 7.1 Patrimônio em Estoque

Elemento:

- `kpi-estoque-dinheiro`.

Visual:

- Card `glass-card p-4 rounded-xl`.
- Fundo `bg-gray-50/80`.
- Borda `border-gray-200`.
- Ícone `fa-boxes-packing`.
- Valor `text-xl font-bold text-gray-700`.

Tooltip:

```text
Soma do custo real dos produtos atualmente disponíveis no estoque.
```

Cálculo:

- Percorre `state.allProducts`.
- Considera produtos com `estoque > 0`.
- Respeita a data de entrada em estoque (`data_entrada_estoque`) se existir:
  - se `data_entrada_estoque` for posterior ao `state.currentPeriodEnd`, o produto não entra no cálculo.
- Usa custo unitário `parseNumber(p.custo || p.preco_custo)`.
- Multiplica pelo estoque atual.

Fórmula:

```text
Patrimônio em Estoque = soma(custo unitário * estoque atual) dos produtos existentes até o fim do período
```

### 7.2 Quantidade de Aparelhos

Elemento:

- `kpi-estoque-qtd`.

Visual:

- Card `glass-card p-4 rounded-xl`.
- Fundo `bg-blue-50/50`.
- Borda `border-blue-100`.
- Ícone `fa-mobile-screen-button`.
- Valor `text-xl font-bold text-blue-800`.

Tooltip:

```text
Número total de unidades físicas atualmente em estoque.
```

Cálculo:

- Usa a mesma regra de inclusão do Patrimônio em Estoque.
- Soma `estoqueAtual` dos produtos com estoque positivo e existentes até `currentPeriodEnd`.

Fórmula:

```text
Quantidade de Aparelhos = soma(estoque atual) dos produtos disponíveis
```

## 8. Grupo D: Análise de Investimentos

Título visual:

```text
💰 Análise de Investimentos
```

Grid:

- `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`.

Contém:

1. Em Estoque.
2. Em Trânsito.
3. Investimento Recuperado.
4. Capital Imobilizado.
5. Resultado Real.
6. ROI.

### 8.1 Em Estoque

Elemento:

- `kpi-invest-estoque`.

Visual:

- Card `glass-card p-4 rounded-xl`.
- Fundo `bg-indigo-50/30`.
- Borda `border-indigo-100`.
- Ícone `fa-boxes-stacked`.
- Valor `text-lg sm:text-xl font-bold text-indigo-900`.

Tooltip:

```text
Valor investido nos produtos disponíveis atualmente no estoque.
```

Cálculo:

- Mesmo valor de `kpi-estoque-dinheiro`.
- No código, `capitalEstoque = totalCustoEstoque`.

Fórmula:

```text
Em Estoque = Patrimônio em Estoque
```

### 8.2 Em Trânsito

Elemento:

- `kpi-invest-transito`.

Visual:

- Card `glass-card p-4 rounded-xl`.
- Fundo `bg-blue-50/30`.
- Borda `border-blue-100`.
- Ícone `fa-truck-fast`.
- Valor `text-lg sm:text-xl font-bold text-blue-900`.

Tooltip:

```text
Valor investido em produtos comprados/encomendados que ainda não chegaram. Não conta como estoque disponível.
```

Cálculo:

- Percorre `state.allEncomendas`.
- Agrupa por `lote_id || id`.
- Para cada lote, guarda:
  - frete (`custo_frete`);
  - taxas (`custo_taxas`);
  - custo adicional do lote (`custo_adicional_lote`);
  - itens do lote.
- Calcula rateio dos custos extras:

```text
rateio = (frete + taxas + custo adicional do lote) / quantidade de itens do lote
```

- Considera itens com `status === "encomendado"` ou `status === "pendente"`.
- Para cada item:
  - se `custo_total` existe, usa `parseNumber(custo_total)`;
  - caso contrário, usa `parseNumber(custo_compra) + rateio`.

Fórmula:

```text
Em Trânsito = soma(custo_total do item ou custo_compra + rateio) dos itens pendentes/encomendados
```

### 8.3 Investimento Recuperado

Elemento:

- `kpi-invest-recuperado`.
- Subtexto percentual: `kpi-recuperado-percent-subtext`.

Visual:

- Card `glass-card p-4 rounded-xl`.
- Fundo `bg-emerald-50/30`.
- Borda `border-emerald-100`.
- Ícone `fa-hand-holding-dollar`.
- Valor `text-lg sm:text-xl font-bold text-emerald-900`.
- Subtexto `text-[10px] font-bold text-emerald-600`.

Tooltip:

```text
Custo dos produtos já vendidos. Representa capital que já girou, não faturamento.
```

Cálculo:

- Percorre `state.allOrders`.
- Considera pedidos com:
  - `status === "Fechado"`;
  - `o.parsedDate <= state.currentPeriodEnd` quando há fim de período.
- Localiza produto em `state.allProducts` por:
  - `p.sku === o.sku`;
  - `p.id === o.sku`;
  - `p.id === o.id`.
- Soma `parseNumber(produtoRef.custo || produtoRef.preco_custo || 0) * o.quantidade`.

Fórmula:

```text
Investimento Recuperado = soma(custo do produto * quantidade) dos pedidos fechados até o fim do período
```

Percentual recuperado:

```text
Total Investido Geral = Capital em Estoque + Capital em Trânsito + Investimento Recuperado
% Recuperado = Investimento Recuperado / Total Investido Geral * 100
```

Texto:

```text
{percentual}% recuperado
```

### 8.4 Capital Imobilizado

Elemento:

- `kpi-invest-total`.

Visual:

- Card `glass-card p-4 rounded-xl`.
- Fundo branco.
- Borda `border-gray-200`.
- Ícone `fa-lock`.
- Valor `text-lg sm:text-xl font-black text-gray-800`.

Tooltip:

```text
Valor do capital atualmente preso em estoque e produtos em trânsito.
```

Cálculo:

```text
Capital Imobilizado = Capital em Estoque + Capital em Trânsito
```

### 8.5 Resultado Real

Elemento:

- `kpi-resultado-real`.
- Container: `card-resultado-real`.

Visual:

- Card `glass-card p-4 rounded-xl`.
- Fundo branco.
- Borda `border-gray-200`.
- Ícone `fa-scale-balanced`.
- Valor `font-black`.
- Cor dinâmica:
  - positivo ou zero: `text-emerald-600`;
  - negativo: `text-red-600`.

Tooltip:

```text
Resultado financeiro considerando todo o capital ainda imobilizado no negócio. Mostra se o negócio já recuperou o investimento aplicado.
```

Cálculo:

- Primeiro calcula `globalFaturamento`:
  - percorre todos os pedidos (`state.allOrders`);
  - considera apenas `status === "Fechado"`;
  - respeita `parsedDate <= currentPeriodEnd`;
  - soma `final_price || total`.
- Depois subtrai capital imobilizado.

Fórmula:

```text
Resultado Real = Faturamento Global até o fim do período - Capital Imobilizado
```

Importante:

- Esta métrica não usa apenas `state.filteredOrders`; ela olha o acumulado até o fim do período (`allOrders` com cutoff).
- Por isso pode representar uma leitura acumulada do negócio, não apenas do intervalo atual.

### 8.6 ROI

Elemento:

- `kpi-roi`.

Visual:

- Card `glass-card p-4 rounded-xl`.
- Fundo branco.
- Borda `border-gray-200`.
- Ícone `fa-chart-line`.
- Valor `text-lg sm:text-xl font-black`.
- Cor dinâmica:
  - positivo ou zero: `text-emerald-600`;
  - negativo: `text-red-600`.

Tooltip:

```text
Retorno sobre o capital atualmente investido no negócio.
```

Cálculo:

```text
ROI = Resultado Real / Capital Imobilizado * 100
```

Se `capitalImobilizado <= 0`, ROI é `0`.

## 9. Grupo C: Focos de Alerta

Título visual:

```text
🥉 Focos de Alerta
```

Contém:

1. Cancelados (Perda).
2. Pendentes (Pausados).

### 9.1 Cancelados (Perda)

Elementos:

- Valor: `kpi-perdida`.
- Quantidade: `kpi-cancelados-qtd`.

Visual:

- Card `glass-card p-4 rounded-xl`.
- Fundo `bg-red-50`.
- Borda `border-red-200`.
- Ícone `fa-xmark`.
- Valor `text-xl font-bold text-red-700`.
- Quantidade `text-[10px] text-red-500 font-bold`.

Tooltip:

```text
Soma do valor final dos pedidos que foram cancelados. Representa o faturamento que deixou de entrar.
```

Cálculo:

- Em `state.filteredOrders`, considera pedidos com `status === "Cancelado"`.
- Soma `o.final_price || o.total`.
- Conta pedidos únicos cancelados por `id_do_pedido`.

Fórmula:

```text
Cancelados (Perda) = soma(final_price ou total) dos pedidos Cancelados no período
```

Texto da quantidade:

```text
{quantidade} pedidos perdidos
```

### 9.2 Pendentes (Pausados)

Elementos:

- Valor: `kpi-pendentes-valor`.
- Quantidade: `kpi-pendentes`.

Visual:

- Card `glass-card p-4 rounded-xl`.
- Fundo `bg-yellow-50`.
- Borda `border-yellow-200`.
- Ícone `fa-clock`.
- Valor `text-xl font-bold text-yellow-700`.
- Quantidade `text-[10px] text-yellow-600 font-bold`.

Tooltip:

```text
Pedidos aguardando pagamento ou negociação. Não contabilizam como venda fechada até mudarem de status.
```

Cálculo:

- Em `state.filteredOrders`, qualquer pedido que não seja `Fechado` nem `Cancelado` entra como pendente.
- Soma `o.final_price || o.total`.
- Conta pedidos únicos pendentes por `id_do_pedido`.

Fórmula:

```text
Pendentes = soma(final_price ou total) dos pedidos com status diferente de Fechado e Cancelado
```

Texto:

```text
{quantidade} em espera
```

## 10. Gráficos Principais

Os gráficos usam Chart.js.

### 10.1 Faturamento Histórico

Elemento:

- Canvas `revenue-chart`.

Visual:

- Card `glass-card p-6 rounded-2xl shadow-sm`.
- Ocupa `lg:col-span-2`.
- Altura `280px`.
- Título: `Faturamento Histórico`.

Tipo:

```text
line
```

Cálculo:

- Usa `state.filteredOrders`.
- Ordena por `parsedDate`.
- Considera apenas pedidos `Fechado`.
- Agrupa por dia no formato `DD/MêsAbreviado`, exemplo `03/Mai`.
- Soma `final_price || total` por dia.

Configuração visual:

- Linha verde: `#23be30ff`.
- Área preenchida: `rgba(35, 190, 48, 0.1)`.
- `borderWidth: 2`.
- `fill: true`.
- `tension: 0.4`.
- Sem legenda.
- Responsivo.
- `maintainAspectRatio: false`.
- Animação desativada quando `state.isSilentRefresh` é verdadeiro; caso contrário, duração `1000ms`.

Fallback:

- Se não houver dados, label `Sem dados` e valor `[0]`.

### 10.2 Fatias de Venda (Pie)

Elemento:

- Canvas `distribution-chart`.

Visual:

- Card `glass-card p-6 rounded-2xl shadow-sm`.
- Centralizado.
- Altura `250px`.
- Título: `Fatias de Venda (Pie)`.

Tipo:

```text
doughnut
```

Cálculo:

- Usa `state.filteredOrders`.
- Considera apenas pedidos `Fechado`.
- Agrupa por `produto`.
- Soma `quantidade`.
- Ordena do maior para o menor.
- Exibe os 5 maiores produtos.
- Trunca labels para 18 caracteres.

Configuração visual:

- `cutout: 70%`.
- Legenda à direita.
- Cores:
  - `#eecf22ff`;
  - `#dadadaff`;
  - `#da9240ff`;
  - `#3b3b3bff`;
  - `#000000ff`.
- Animação igual ao gráfico de faturamento.

Fallback:

- Label `Sem Vendas`.
- Valor `[1]`.

## 11. Rankings

Os rankings ficam em grid:

```html
grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6
```

Cada card:

- `glass-card p-5 rounded-2xl shadow-sm flex flex-col`.
- Título em `text-sm font-bold uppercase tracking-wide`.
- Lista com altura fixa `h-48`, scroll interno e scrollbar escondida.

### 11.1 Populares (Modelo)

Elemento:

- Lista `rank-models`.

Título:

```text
Populares (Modelo)
```

Ícone:

- `fa-fire`, cor laranja.

Cálculo:

- Usa `state.filteredOrders`.
- Considera apenas pedidos `Fechado`.
- Ignora pedido sem produto ou `"Pedido Vazio"`.
- Define `modelLabel` por:
  - `group_id`, se existir;
  - caso contrário, `produto`.
- Se `modelLabel` parece ID (`GRP...` ou `PROD...`), tenta resolver nome humano em `state.allProducts` por `grupo_id`, `id` ou `sku`.
- Normaliza texto removendo acentos, minúsculas e espaços extras.
- Soma `quantidade` por modelo normalizado.
- Renderiza top 5.

Valor exibido:

```text
{quantidade} unid
```

Fallback:

```text
Sem dados
```

### 11.2 Top Variações

Elemento:

- Lista `rank-vars`.

Título:

```text
Top Variações
```

Ícone:

- `fa-layer-group`, azul.

Cálculo:

- Usa `state.filteredOrders`.
- Considera apenas pedidos `Fechado`.
- Monta chave:

```text
produto | cor ou Unic | armazenamento ou Unic | condicao ou Novo
```

- Soma `quantidade`.
- Renderiza top 5.

Visual da linha:

- Nome do produto em bold.
- Cor e armazenamento abaixo em `text-[10px]`.
- Badge de condição:
  - `Novo`: fundo verde claro, texto verde.
  - Outros: fundo laranja claro, texto laranja.

Valor exibido:

```text
{quantidade} und
```

### 11.3 Top Receita & Ticket

Elemento:

- Lista `rank-revenue`.

Título:

```text
Top Receita & Ticket
```

Ícone:

- `fa-money-bill-trend-up`, verde.

Cálculo:

- Usa `state.filteredOrders`.
- Considera apenas pedidos `Fechado`.
- Agrupa por `produto`.
- Para cada produto guarda:
  - `fat`: soma de `final_price || total`;
  - `qtd`: soma de quantidade.
- Ordena por maior `fat`.
- Renderiza top 5.

Valor exibido:

```text
R$ {faturamento}
```

Observação:

- Apesar do título mencionar ticket, o valor exibido na lista é faturamento total por produto. O objeto guarda `qtd`, mas o render atual não mostra ticket médio por item.

### 11.4 Produtos Parados

Elemento:

- Lista `rank-idle`.

Título:

```text
⚠️ Produtos Parados
```

Ícone:

- `fa-triangle-exclamation`, vermelho.

Visual:

- Card com `border border-red-100` e `bg-red-50/20`.
- Cada item tem borda esquerda:
  - vermelho se crítico;
  - laranja se atenção.

Cálculo:

1. Monta um mapa de última venda (`lastSaleMap`) a partir de `state.allOrders` fechados:
   - por `sku`;
   - por nome composto normalizado (`produto + armazenamento + cor`).
2. Percorre `state.allProducts`.
3. Considera produtos com:
   - `p.ativo !== false`;
   - `estoque > 0`.
4. Para cada produto, tenta encontrar última venda por SKU ou nome composto.
5. Calcula dias parados:
   - se há venda: diferença em dias entre hoje e última venda;
   - se nunca vendeu: `999`.
6. Filtra produtos com `daysIdle > 10`.
7. Ordena por maior tempo parado.
8. Exibe até 10 produtos.

Estados:

- `daysIdle > 30`: crítico, borda vermelha e badge vermelho.
- `daysIdle <= 30`: atenção, borda laranja e badge laranja.
- `daysIdle === 999`: mostra `SEM VENDAS`.
- Caso não existam produtos parados: `Tudo girando!`.

Badges por produto:

- Condição: `Novo` verde, outros laranja.
- Armazenamento: azul claro.
- Cor: roxo claro.

## 12. Tooltips

Os tooltips da aba usam:

```html
class="js-tooltip-trigger"
data-tooltip-content="..."
```

Inicialização:

- `ui.initTooltips()` é chamado em `main.js` ao iniciar o dashboard.

Comportamento:

- Desktop: aparece em `mouseover`.
- Mobile: alterna em `touchstart`.
- Esconde ao sair/tocar fora.
- Se não houver espaço acima, o tooltip aparece abaixo do ícone.
- Ajusta lateral para não sair da tela.

Visual:

- `fixed`.
- `z-[9999]`.
- Fundo `bg-gray-900`.
- Texto branco.
- `text-xs font-medium`.
- Padding `p-3`.
- `rounded-xl`.
- `shadow-2xl`.
- Largura máxima `280px`.
- Borda `border-gray-700/50`.
- Fade com `opacity-0`/`opacity-100` em `200ms`.

Tooltips existentes na Visão Geral:

- Faturamento Real: soma de vendas concluídas, sem subtrair custos.
- Resultado Operacional: faturamento menos custo dos produtos vendidos, sem considerar capital preso.
- Margem Operacional: resultado operacional dividido por faturamento.
- Ticket Médio: valor médio por cliente em vendas concluídas.
- Patrimônio em Estoque: custo real dos produtos disponíveis no estoque.
- Quantidade de Aparelhos: total de unidades físicas em estoque.
- Em Estoque: valor investido nos produtos disponíveis.
- Em Trânsito: valor investido em encomendas que ainda não chegaram.
- Investimento Recuperado: custo dos produtos vendidos.
- Capital Imobilizado: capital preso em estoque e trânsito.
- Resultado Real: resultado considerando capital ainda imobilizado.
- ROI: retorno sobre capital atualmente investido.
- Cancelados: valor final dos pedidos cancelados.
- Pendentes: pedidos aguardando pagamento ou negociação.

## 13. Estados de Loading, Empty e Refresh

Estados gerais do dashboard:

- Loading inicial:
  - `dashboard-loading`;
  - spinner circular indigo;
  - texto `Sincronizando...`.
- Empty:
  - `dashboard-empty`;
  - ícone de inbox;
  - texto `Nenhum dado encontrado`.
- Error:
  - `dashboard-error`;
  - ícone de alerta vermelho;
  - botão `Tentar Novamente`.

Refresh:

- Botão desktop: `btn-refresh`.
- Botão mobile: `btn-refresh-mobile`.
- Ambos chamam `store.loadDashboardData(RENDER_PIPELINE)`.
- Auto-refresh a cada 45 segundos.
- O auto-refresh é bloqueado se:
  - há alterações pendentes no estoque;
  - modal de Compras está aberto;
  - modal de Cashflow está aberto.
- Quando `silent = true`, gráficos não animam e loading principal não aparece.

## 14. Interação com Outras Áreas

A aba Visão Geral também alimenta a aba de Análise Estratégica:

- Ao final de `calcularKPIsEInsights()`, o código chama:

```js
gerarAnaliseEstrategica(curr, prev, calcVar, prodCounts);
```

Isso significa que os mesmos dados de faturamento, lucro, cancelados, pendentes e produtos vendidos servem de base para diagnósticos estratégicos.

Notificações:

- Ao receber novo pedido, `showNotification()` pode clicar em `tab-btn-geral`, mas tenta rolar para `section-historico-pedidos`, que pertence à aba de Vendas/Histórico. Esse comportamento existe no código atual e deve ser revisado com cuidado se a navegação for migrada.

## 15. Regras de Formatação

Valores financeiros:

- Usam `formatMoney()`.
- Exibição no padrão brasileiro: `R$ 0,00`.

Percentuais:

- Usam uma casa decimal.
- Decimal com vírgula.
- Exemplo: `12,5%`.

Datas:

- Pedidos têm `parsedDate`.
- Datas vindas como `DD/MM/YYYY` são interpretadas manualmente em `store.js`.
- Datas customizadas são digitadas como `DD/MM/YYYY`.

Números de estoque:

- Estoque é convertido com `Number(p.estoque) || 0`.
- Custos usam `parseNumber()`, para suportar formatos monetários brasileiros.

## 16. Resumo dos IDs Importantes

Navegação:

- `tab-btn-geral`: botão da sidebar.
- `tab-geral`: conteúdo da aba.
- `period-filter`: filtro global desktop.
- `period-filter-mobile`: filtro global mobile.

KPIs:

- `insight-top-giro`.
- `kpi-faturamento`.
- `kpi-faturamento-var`.
- `kpi-lucro`.
- `kpi-margem`.
- `kpi-ticket-medio`.
- `kpi-estoque-dinheiro`.
- `kpi-estoque-qtd`.
- `kpi-invest-estoque`.
- `kpi-invest-transito`.
- `kpi-invest-recuperado`.
- `kpi-recuperado-percent-subtext`.
- `kpi-invest-total`.
- `kpi-resultado-real`.
- `kpi-roi`.
- `kpi-perdida`.
- `kpi-cancelados-qtd`.
- `kpi-pendentes-valor`.
- `kpi-pendentes`.

Gráficos:

- `revenue-chart`.
- `distribution-chart`.

Rankings:

- `rank-models`.
- `rank-vars`.
- `rank-revenue`.
- `rank-idle`.

## 17. Checklist de Validação da Aba

- [ ] O botão lateral `Painel Geral` abre `tab-geral`.
- [ ] O filtro global de período altera todos os KPIs da visão geral.
- [ ] O primeiro carregamento começa com período `Máximo`.
- [ ] Faturamento Real soma apenas pedidos `Fechado`.
- [ ] Resultado Operacional subtrai custo dos produtos vendidos.
- [ ] Margem Operacional muda de cor conforme o percentual.
- [ ] Ticket Médio divide faturamento por pedidos fechados únicos.
- [ ] Patrimônio em Estoque soma custo vezes estoque dos produtos disponíveis.
- [ ] Quantidade de Aparelhos soma unidades físicas em estoque.
- [ ] Em Trânsito soma encomendas `encomendado` ou `pendente`.
- [ ] Investimento Recuperado considera custo de produtos já vendidos.
- [ ] Capital Imobilizado soma estoque e trânsito.
- [ ] Resultado Real usa faturamento acumulado até o fim do período menos capital imobilizado.
- [ ] ROI usa resultado real dividido por capital imobilizado.
- [ ] Cancelados e Pendentes usam status corretamente.
- [ ] Gráfico de Faturamento Histórico é linha verde com preenchimento.
- [ ] Gráfico de Fatias é doughnut com cutout de 70%.
- [ ] Rankings mostram top 5, exceto produtos parados que mostram até 10.
- [ ] Tooltips aparecem no hover/touch e não saem da tela.
- [ ] Auto-refresh não interrompe modais de compras/cashflow nem estoque pendente.

