# Vendly MVP - Documento Detalhado de Modais

Este documento descreve os modais, drawers, painéis sobrepostos e confirmações existentes no MVP atual do Vendly. O objetivo é explicar onde cada modal aparece, em qual aba/fluxo ele existe, para que serve, quem usa, quais dados carrega, quais dados grava e quais módulos ele alimenta.

> Fonte principal: `index.html`, `src/vitrine`, `src/shared`, `src/dashboard/index.html`, `src/dashboard/modules/*` e `Code.gs`.
> Observação: neste documento, "modal" inclui janelas centrais, drawers laterais, painéis sobrepostos, confirmações customizadas e overlays de onboarding.

---

## 1. Resumo Geral

O MVP usa modais para manter o usuário dentro da mesma tela enquanto executa ações importantes. A maior parte das operações críticas acontece sem troca de página.

Principais áreas com modais:

- **Vitrine pública**
  - Detalhes do produto.
  - Comparação de produtos.
  - Carrinho lateral.
  - Simulador de parcelamento.
  - Onboarding/tour guiado.

- **Dashboard > Vendas > Histórico**
  - Fechar venda/negociação.
  - Pedido manual.
  - Edição de venda em drawer lateral.
  - Recibo e garantia.

- **Dashboard > Vendas > Fiado**
  - Registrar venda fiada.
  - Detalhes do fiado.
  - Confirmar cancelamento.
  - Confirmação nativa de recebimento de parcela.

- **Dashboard > Estoque**
  - Cadastro/edição de produto.
  - Confirmação de exclusão de produto.

- **Dashboard > Compras**
  - Cadastro/edição de lote.
  - Pagamento de lote.
  - Confirmação de chegada/integração ao estoque.
  - Confirmação de exclusão de lote/item.

- **Dashboard > Fluxo de Caixa**
  - Nova entrada/saída.
  - Edição de movimento manual.
  - Abertura de caixa.
  - Confirmação customizada.
  - Extrato financeiro.

- **Dashboard geral**
  - Onboarding/tour guiado.
  - Welcome overlay.

Abas sem modal operacional próprio:

- **Painel Geral**
  - Não possui modal de cadastro/edição específico.
  - Usa tooltips e componentes informativos.

- **Estratégia**
  - Não possui modal operacional específico.
  - Exibe análise em cards/blocos.

- **Métricas**
  - Não possui modal operacional específico.
  - Exibe loading, empty state e listas, mas não abre modal próprio.

---

## 2. Padrões de Comportamento dos Modais

### 2.1 Modal Central

Uso:

- Produto da vitrine.
- Comparador.
- Negociação.
- Cadastro de produto.
- Pedido manual.
- Recibo.
- Confirmações.
- Compras.

Comportamento:

- Aparece sobre overlay escuro.
- Mantém o contexto da tela anterior.
- Pode ter corpo com rolagem interna.
- Em mobile, vários modais ficam alinhados ao rodapé com borda arredondada superior.

### 2.2 Drawer Lateral

Uso:

- Carrinho da vitrine.
- Edição de pedido.
- Nova dívida/fiado.
- Detalhes do fiado.
- Fluxo de caixa.
- Abertura de caixa.

Comportamento:

- Entra pela lateral direita.
- Usa overlay/backdrop para separar da tela de origem.
- Fecha por botão, cancelar ou clique no overlay, dependendo do módulo.
- Mantém sensação de edição contextual.

### 2.3 Modal de Confirmação

Uso:

- Excluir produto.
- Excluir lote/item.
- Cancelar fiado.
- Confirmar edição/exclusão no fluxo de caixa.
- Receber parcela de fiado usa `confirm()` nativo do navegador.

Comportamento:

- Pede confirmação explícita antes de ação destrutiva ou sensível.
- Normalmente usa ícone vermelho/alerta.
- Só executa a ação depois do clique final.

### 2.4 Overlay de Onboarding

Uso:

- Vitrine.
- Dashboard.

Comportamento:

- Usa Driver.js e/ou overlay customizado.
- Destaca partes da interface.
- Não grava dados operacionais; grava apenas se o tutorial já foi visto.

---

## 3. Vitrine Pública

### 3.1 Modal de Detalhes do Produto

Identificador:

- `product-modal`

Onde existe:

- Vitrine pública.
- Aberto a partir dos cards do catálogo.

Quem usa:

- Cliente final.

Para que serve:

- Mostrar detalhes completos de um produto e suas variações.
- Permitir escolher cor, armazenamento e condição.
- Adicionar o item correto ao carrinho.
- Adicionar produto ao comparador.

O que abre o modal:

- Clique no card de produto.
- Clique no botão `VER OPÇÕES`.

Dados que carrega:

- Produtos carregados da API.
- Variações do mesmo `grupo_id`.
- Imagens do produto.
- Estoque.
- Preço.
- Descrição.
- Cor.
- Armazenamento.
- Condição.
- Status `ativo`.

Elementos internos:

- Cabeçalho fixo com título `Detalhes do Produto`.
- Botão de fechar.
- Galeria de imagem.
- Miniaturas/setas quando há várias imagens.
- Nome do produto.
- Descrição.
- Preço.
- Preço antigo, quando existir.
- Badge de status.
- Seletores de cor.
- Seletores de armazenamento.
- Seletores de condição.
- Mensagem de indisponibilidade.
- Botão `Eu Quero`.
- Botão `Comparar`.

Como funciona:

- O módulo filtra variações ativas pelo mesmo `grupo_id`.
- A variação clicada vira seleção inicial quando possível.
- Ao trocar cor, armazenamento ou condição, o script procura uma variação compatível.
- Opções indisponíveis aparecem desabilitadas ou visualmente marcadas.
- Se a combinação não existe ou está sem estoque, o CTA de compra fica bloqueado/indisponível.
- O botão `Eu Quero` adiciona a variação selecionada ao carrinho.
- O botão `Comparar` adiciona o produto ao comparador.

O que alimenta:

- Carrinho (`catalogo_cart_v2` no localStorage).
- Comparador.
- Métricas de clique/visualização de produto.

Impacto no sistema:

- Não grava venda diretamente.
- Ajuda a selecionar exatamente o SKU/variação que será enviado ao carrinho e depois ao pedido.

---

### 3.2 Modal de Comparação

Identificador:

- `compare-modal`

Onde existe:

- Vitrine pública.
- Aberto pelo botão de comparação ou pela barra/toast de comparação.

Quem usa:

- Cliente final que está indeciso entre aparelhos.

Para que serve:

- Comparar até 3 produtos lado a lado.
- Mostrar diferenças técnicas e comerciais.
- Destacar melhores opções por critério.

O que abre o modal:

- Botão `Comparar` no card ou modal de produto.
- Botão `Comparar` no header quando há itens selecionados.
- Barra/toast de comparação.

Dados que carrega:

- Produtos selecionados para comparação.
- Preço.
- Condição.
- Armazenamento.
- RAM.
- Câmeras.
- Bateria.
- Tela.
- Estoque.
- Imagens.
- Métricas como popularidade/clicks, quando usadas.

Elementos internos:

- Título `Comparar Celulares`.
- Botão de fechar.
- Conteúdo dinâmico com colunas de produtos.
- Tabela/comparativo de atributos.
- Destaques inteligentes.
- Botões para remover/limpar itens, conforme implementação do comparador.

Como funciona:

- O comparador mantém uma lista de produtos selecionados.
- O limite é de 3 produtos.
- O conteúdo é refeito dinamicamente quando itens são adicionados ou removidos.
- O sistema aponta vencedores em critérios como câmera, selfie, bateria, RAM, armazenamento e preço.

O que alimenta:

- Não grava no backend.
- Alimenta apenas o estado visual/local do comparador.

Impacto no sistema:

- Ajuda na decisão de compra.
- Pode aumentar cliques e conversão para WhatsApp/carrinho.

---

### 3.3 Carrinho Lateral

Identificadores:

- `overlay`
- `cart-panel`

Onde existe:

- Vitrine pública.

Quem usa:

- Cliente final.

Para que serve:

- Mostrar os itens escolhidos.
- Ajustar quantidades.
- Limpar carrinho.
- Ver total.
- Ver resumo de parcelamento.
- Enviar pedido para WhatsApp.

O que abre:

- Botão do carrinho no header.
- Ação de adicionar produto ao carrinho.

Dados que carrega:

- Itens salvos no localStorage `catalogo_cart_v2`.
- Produtos atuais da vitrine para validar estoque e status.
- Configurações de parcelamento.
- Configurações de WhatsApp.

Elementos internos:

- Lista de itens.
- Quantidade por item.
- Botões de aumentar/diminuir/remover.
- Total.
- Valor de parcelamento selecionado.
- Botão `Limpar`.
- Botão `Enviar para WhatsApp`.
- Mensagem de checkout.

Como funciona:

- Abre como painel fixo pela direita.
- Usa overlay escuro para bloquear a tela principal.
- Recalcula total quando quantidade muda.
- Impede quantidade acima do estoque.
- Ao finalizar, monta pedido, salva via API e abre WhatsApp com mensagem pronta.

O que alimenta:

- Backend de pedidos via API.
- Planilha `Pedidos`.
- WhatsApp com mensagem de venda.
- Métricas de WhatsApp/mensagem.

Impacto no sistema:

- É o principal ponto de conversão da vitrine.
- Um pedido criado aqui aparece no dashboard em **Vendas > Histórico**.

---

### 3.4 Modal de Simulação de Parcelamento

Identificador:

- `installment-simulator`

Onde existe:

- Vitrine pública.
- Criado dinamicamente por `src/shared/modules/cart.js`.

Quem usa:

- Cliente final.

Para que serve:

- Simular pagamento à vista ou parcelado.
- Considerar entrada opcional.
- Aplicar taxa da maquininha por parcela/modalidade.

O que abre:

- Ação de simular/alterar parcelamento dentro do carrinho.

Dados que carrega:

- Total atual do carrinho.
- Taxas configuradas.
- Entrada digitada pelo cliente.
- Número de parcelas selecionado.

Elementos internos:

- Total do carrinho.
- Campo `Dar entrada?`.
- Lista de opções de parcelamento.
- Opção à vista.
- Botão de fechar.

Como funciona:

- É criado via `document.createElement`.
- Se já existir, reaproveita o modal.
- Calcula opções de 2x até o limite configurado.
- Ao selecionar uma opção, salva o parcelamento escolhido, atualiza o carrinho e remove o modal.

O que alimenta:

- Estado de parcelamento do carrinho.
- Texto/resumo enviado no checkout.

Impacto no sistema:

- Não grava no backend sozinho.
- Influencia a mensagem enviada ao WhatsApp.

---

### 3.5 Onboarding da Vitrine

Identificadores:

- Driver.js cria overlays próprios.
- Botão: `btn-help-tour`.

Onde existe:

- Vitrine pública.

Quem usa:

- Cliente final.

Para que serve:

- Explicar como navegar, comparar e comprar.

O que abre:

- Botão de ajuda no header.
- Primeira visita, dependendo da lógica de onboarding.

Dados que carrega:

- Elementos existentes na tela.
- Estado local indicando se o tour já foi visto.

O que alimenta:

- LocalStorage de controle do tutorial.

Impacto no sistema:

- Não altera pedidos, estoque ou métricas operacionais.
- Melhora entendimento da interface.

---

## 4. Dashboard > Vendas > Histórico

### 4.1 Modal de Negociação / Fechar Venda

Identificador:

- `modal-negociacao`

Onde existe:

- Dashboard.
- Aba **Vendas > Histórico**.

Quem usa:

- Lojista/operador.

Para que serve:

- Finalizar um pedido.
- Registrar cliente e telefone.
- Definir se houve negociação de preço.
- Registrar múltiplas formas de pagamento.
- Registrar aparelho recebido como parte do pagamento.
- Opcionalmente adicionar aparelho recebido ao estoque.

O que abre:

- Alteração de status de um pedido para `Fechado`.

Dados que carrega:

- Pedido selecionado.
- Valor total atual.
- ID do pedido/item.
- Estado atual de pagamento.

Elementos internos:

- Seção `Informações do Cliente`.
- Nome completo.
- WhatsApp/telefone com máscara.
- Seção `Negociação`.
- Botões `Não` e `Sim` para preço negociado.
- Campo de novo valor final.
- Seção `Aparelho na Troca`.
- Checkbox `Recebi um aparelho como parte do pagamento`.
- Modelo recebido.
- Memória.
- Condição.
- Valor avaliado.
- Checkbox `Adicionar aparelho recebido ao estoque`.
- Preço de revenda.
- Aviso de que o aparelho entra como inativo.
- Seção `Pagamento`.
- Botão `Adicionar Método`.
- Linhas de pagamento.
- Resumo de saldo restante/excedente.
- Área de erros.
- Botão `Confirmar e Fechar`.

Como funciona:

- Ao abrir, preenche uma linha de pagamento com o total atual.
- Se `Sim` em negociação, habilita o campo de preço final.
- Se aparelho recebido estiver marcado, o valor do aparelho entra no balanço da venda.
- O sistema calcula se falta valor, se excedeu ou se está quitado.
- O botão só prossegue quando os valores fecham corretamente.
- Ao confirmar, chama a atualização de status no backend.

O que grava:

- Status do pedido.
- Preço final.
- Cliente.
- Telefone.
- Pagamento.
- Dados de aparelho na troca.
- Valor de troca.
- Baixa/processamento de estoque.
- Produto recebido, quando marcado para estoque.

API relacionada:

- `atualizarstatus`

Planilhas alimentadas:

- `Pedidos`.
- `Produtos`, quando aparelho recebido entra no estoque.

O que alimenta depois:

- Painel Geral.
- Histórico de vendas.
- Estoque.
- Fluxo de Caixa.
- Estratégia.

Impacto no sistema:

- É um dos modais mais críticos do MVP.
- Transforma pedido pendente em venda fechada.
- Afeta estoque, faturamento, lucro, caixa e patrimônio.

---

### 4.2 Modal de Pedido Manual

Identificador:

- `modal-novo-pedido`

Onde existe:

- Dashboard.
- Aba **Vendas > Histórico**.

Quem usa:

- Lojista/operador.

Para que serve:

- Registrar uma venda feita fora da vitrine.
- Criar pedido manualmente a partir de produto existente.

O que abre:

- Botão de novo pedido/manual na aba de vendas.

Dados que carrega:

- Lista de produtos do estoque.
- Preço do produto.
- Estoque atual.
- SKU ou ID do produto.

Elementos internos:

- Título de novo pedido manual.
- Select de produto.
- Quantidade.
- Preço customizado.
- Campos de cliente/pagamento, conforme formulário.
- Área de erros.
- Botões de cancelar/salvar.

Como funciona:

- Ao abrir, popula o select com produtos ordenados.
- Produtos sem estoque aparecem desabilitados.
- O formulário é resetado.
- Valida produto e quantidade.
- Permite preço customizado quando preenchido.
- Salva pedido via API.

O que grava:

- Novo registro de pedido.
- Dados do produto vendido.
- Quantidade.
- Total/preço.
- Status conforme fluxo.

API relacionada:

- `salvar_pedido`

Planilhas alimentadas:

- `Pedidos`.

O que alimenta depois:

- Histórico de vendas.
- Painel Geral.
- Fluxo de Caixa, se fechado/confirmado conforme regra.
- Estoque, quando houver baixa.

Impacto no sistema:

- Permite que vendas presenciais ou feitas por fora entrem nos indicadores.

---

### 4.3 Drawer de Edição de Venda

Identificadores:

- `edit-order-drawer-overlay`
- `edit-order-drawer`

Onde existe:

- Dashboard.
- Aba **Vendas > Histórico**.

Quem usa:

- Lojista/operador.

Para que serve:

- Corrigir ou complementar uma venda já registrada.
- Ajustar cliente, telefone, status, valores, pagamento, observações e data.

O que abre:

- Ação de editar em uma venda/pedido.

Dados que carrega:

- Pedido selecionado.
- Cliente.
- Telefone.
- Status.
- Total.
- Preço final.
- Observações.
- Data.
- Pagamento salvo.

Elementos internos:

- Título `Editar Venda`.
- Label do pedido.
- Campos de cliente e telefone.
- Status da venda.
- Total.
- Preço final.
- Observações.
- Data da venda.
- Linhas de pagamento.
- Botão de adicionar pagamento.
- Resumo de pagamento.
- Área de erros.
- Botões de cancelar/salvar.

Como funciona:

- Abre como drawer pela direita.
- Preenche dados do pedido.
- Interpreta pagamento único ou múltiplos métodos salvos em string.
- Recria linhas de pagamento.
- Valida se soma dos pagamentos fecha com o preço final.
- Converte data BR para formato aceito antes de salvar.

O que grava:

- Dados editados do pedido.
- Pagamento consolidado.
- Data ajustada.
- Status.
- Total/preço final.

API relacionada:

- `salvar_edicao_pedido`

Planilhas alimentadas:

- `Pedidos`.

O que alimenta depois:

- Histórico de vendas.
- Painel Geral.
- Fluxo de Caixa.
- Estratégia.

Impacto no sistema:

- Corrige dados que impactam indicadores financeiros e operacionais.

---

### 4.4 Modal de Recibo e Garantia

Identificador:

- `modal-recibo`

Onde existe:

- Dashboard.
- Aba **Vendas > Histórico**.

Quem usa:

- Lojista/operador.
- Documento final serve ao cliente.

Para que serve:

- Gerar recibo/garantia em PDF a partir de uma venda.

O que abre:

- Botão de recibo em uma venda (`btn-gerar-recibo`).

Dados que carrega:

- Pedido selecionado.
- Produto.
- Condição do produto.
- IMEI.
- Saúde da bateria.
- Valor.
- Cliente, quando já preenchido.
- Data.

Elementos internos:

- Título `Gerar Recibo e Garantia`.
- Campos de dados do comprador.
- CPF/CNPJ.
- Telefone.
- Produto/descrição.
- Valor.
- Data.
- Vencimento/garantia.
- Botões cancelar/gerar.

Como funciona:

- Busca o pedido pelo ID.
- Preenche campos com dados disponíveis.
- Valida CPF/CNPJ:
  - 11 dígitos para CPF.
  - 14 dígitos para CNPJ.
- Valida telefone com 10 ou 11 dígitos.
- Usa template diferente para produto novo ou seminovo.
- Gera PDF via jsPDF.

O que grava:

- Não grava dados operacionais no backend.
- Gera arquivo PDF localmente no navegador.

Recursos usados:

- `assets/images/recibo-template-novo.png`.
- `assets/images/recibo-template-seminovo.png`.
- `jsPDF`.

O que alimenta:

- Documento entregue ao cliente.

Impacto no sistema:

- Formaliza venda/garantia sem alterar estoque ou caixa.

---

## 5. Dashboard > Vendas > Fiado

### 5.1 Drawer Registrar Venda Fiada

Identificadores:

- `modal-nova-divida`
- `overlay-nova-divida`
- `drawer-nova-divida`

Onde existe:

- Dashboard.
- Aba **Vendas > Fiado**.

Quem usa:

- Lojista/operador.

Para que serve:

- Criar uma venda fiada.
- Registrar cliente, produto, entrada, aparelho recebido e parcelas.

O que abre:

- Botão de nova dívida/nova venda fiada.

Dados que carrega:

- Produtos ativos com estoque positivo.
- Preço, custo, IMEI e variação do produto selecionado.

Elementos internos:

- Cliente.
- Telefone.
- CPF/CNPJ.
- Select de produto disponível.
- Bloco de detalhes do produto selecionado.
- Valor de venda.
- Entrada em dinheiro.
- Checkbox de aparelho recebido.
- Modelo/memória/condição/valor do aparelho recebido.
- Opção de adicionar aparelho recebido ao estoque.
- Imagem e preço de revenda do aparelho recebido.
- Quantidade de parcelas.
- Frequência das parcelas.
- Data do primeiro vencimento.
- Resumo financeiro:
  - valor da venda;
  - entrada em dinheiro;
  - entrada em aparelho;
  - saldo a parcelar;
  - quantidade e valor das parcelas.

Como funciona:

- Ao abrir, popula o select com produtos vendáveis.
- Ao escolher produto, mostra detalhes e preenche valor de venda com o preço do produto.
- O saldo é recalculado conforme entrada em dinheiro, aparelho recebido e parcelas.
- Gera array de parcelas com ID, número, valor, vencimento e status `pendente`.
- Se aparelho recebido for adicionado ao estoque, monta dados de produto recebido.

O que grava:

- Dívida/fiado.
- Snapshot do produto vendido.
- Parcelas.
- Entrada.
- Dados do cliente.
- Produto recebido, se houver.

API relacionada:

- `salvar_fiado`

Planilhas alimentadas:

- `Fiados`.
- `Produtos`, quando há produto recebido adicionado ao estoque.

O que alimenta depois:

- Aba Fiado.
- Fluxo de Caixa, quando parcelas/entradas forem recebidas.
- Painel Geral/indicadores, indiretamente.
- Estoque, se adicionar aparelho recebido.

Impacto no sistema:

- Cria contas a receber e acompanha risco financeiro.

---

### 5.2 Drawer Detalhes do Fiado

Identificadores:

- `modal-detalhes-fiado`
- `overlay-detalhes-fiado`
- `drawer-detalhes-fiado`

Onde existe:

- Dashboard.
- Aba **Vendas > Fiado**.

Quem usa:

- Lojista/operador.

Para que serve:

- Consultar detalhes de uma dívida.
- Ver parcelas.
- Receber parcela.
- Cancelar dívida, quando aplicável.

O que abre:

- Botão/ver detalhes em uma dívida.

Dados que carrega:

- Registro do fiado.
- Parcelas.
- Produto vendido.
- Cliente.
- Valores.
- Status.

Elementos internos:

- Cliente.
- Telefone.
- Produto vendido.
- Valor total.
- Entrada.
- Aparelho recebido como referência.
- Status.
- Botão `Cancelar e Reverter Venda`, quando dívida não está quitada/cancelada.
- Lista de parcelas.
- Valor e vencimento por parcela.
- Badge de parcela paga.
- Botão `Receber` para parcela pendente.

Como funciona:

- O conteúdo é montado dinamicamente.
- Parcelas pagas aparecem destacadas.
- Parcelas pendentes exibem botão para receber.
- Cancelamento abre confirmação própria.

O que grava:

- O drawer em si não grava ao abrir.
- Ações internas podem gravar:
  - receber parcela;
  - cancelar fiado.

APIs relacionadas:

- `pagar_parcela_fiado`.
- `cancelar_fiado`.

Planilhas alimentadas:

- `Fiados`.

O que alimenta depois:

- Métricas de fiado.
- Fluxo de Caixa.
- Pendentes a receber.

Impacto no sistema:

- É o centro operacional de cobrança do fiado.

---

### 5.3 Confirmação de Cancelamento do Fiado

Identificadores:

- `modal-confirmar-cancelamento`
- `overlay-confirmar-cancelamento`
- `box-confirmar-cancelamento`

Onde existe:

- Dashboard.
- Aba **Vendas > Fiado**.

Quem usa:

- Lojista/operador.

Para que serve:

- Confirmar cancelamento de uma dívida fiada.

O que abre:

- Botão `Cancelar e Reverter Venda` dentro dos detalhes do fiado.

Dados que carrega:

- ID do fiado a cancelar.

Elementos internos:

- Ícone de alerta.
- Texto de confirmação.
- Botão cancelar.
- Botão confirmar cancelamento.

Como funciona:

- Guarda o ID em variável temporária.
- Abre modal com animação de escala/opacidade.
- Ao confirmar, chama backend e marca fiado como cancelado.
- Fecha modal de confirmação e detalhes.

O que grava:

- Status do fiado como `cancelado`.

API relacionada:

- `cancelar_fiado`

Planilhas alimentadas:

- `Fiados`.

Impacto no sistema:

- Remove a dívida dos recebíveis ativos.
- Pode impactar pendentes a receber e relatórios.

---

### 5.4 Confirmação Nativa de Recebimento de Parcela

Tipo:

- `confirm()` nativo do navegador.

Onde existe:

- Dashboard.
- Aba **Vendas > Fiado**.

Quem usa:

- Lojista/operador.

Para que serve:

- Confirmar o recebimento de uma parcela antes de gravar.

O que abre:

- Botão `Receber` em uma parcela pendente.

Como funciona:

- Mostra mensagem nativa: `Confirmar o recebimento desta parcela?`.
- Se o usuário confirma, chama API.
- Se cancela, não faz nada.

O que grava:

- Status da parcela como paga.
- Data de pagamento.
- Status geral do fiado se todas parcelas forem pagas.

API relacionada:

- `pagar_parcela_fiado`

Planilhas alimentadas:

- `Fiados`.

O que alimenta depois:

- Fluxo de Caixa como entrada automática.
- Card de recebido/pendente na aba Fiado.

---

## 6. Dashboard > Estoque

### 6.1 Modal Cadastro/Edição de Produto

Identificador:

- `modal-cadastro-produto`

Onde existe:

- Dashboard.
- Aba **Estoque**.

Quem usa:

- Lojista/operador.

Para que serve:

- Cadastrar produto novo.
- Editar produto existente.
- Criar variações agrupadas.
- Subir imagens.
- Definir se produto aparece na vitrine.

O que abre:

- Botão de cadastrar produto.
- Botão de editar produto na listagem de estoque.

Dados que carrega:

- Em modo cadastro: formulário vazio com padrões.
- Em modo edição: dados do produto selecionado.
- Categorias existentes.
- Produto/variações, quando aplicável.

Elementos internos:

- Tipo do produto:
  - Novo.
  - Seminovo.
- Nome.
- Descrição.
- Categoria.
- Preço.
- Custo.
- Cor.
- Armazenamento.
- RAM.
- Câmeras.
- Tela.
- Bateria.
- IMEI.
- Saúde da bateria.
- Estoque.
- Estoque mínimo.
- Data de entrada.
- Imagens.
- Bloco de variações.
- Botão para adicionar variação.
- Toggle `Publicar na Vitrine`.
- Área de erros.
- Botões cancelar/salvar.

Como funciona:

- `abrirModalCadastro()` reseta o formulário e prepara modo cadastro.
- `abrirModalEdicao(id)` abre o mesmo modal, mas preenche com dados existentes.
- O título muda para `Cadastrar Produto` ou `Editar Produto`.
- Imagens podem ser enviadas e associadas ao produto.
- Variações são salvas como produtos separados, agrupados por `grupo_id`.
- Se `Publicar na Vitrine` estiver desligado, o produto fica interno/inativo.

O que grava:

- Produto.
- Variações.
- Imagens/URLs.
- Estoque.
- Preço/custo.
- Status ativo/inativo.

APIs relacionadas:

- `salvar_produto`.
- `editar_produto`.
- `upload_imagem`.

Planilhas alimentadas:

- `Produtos`.

O que alimenta depois:

- Vitrine.
- Estoque.
- Vendas.
- Pedido manual.
- Fiado.
- Painel Geral.
- Fluxo de Caixa via capital imobilizado.

Impacto no sistema:

- É o modal principal para criar a base comercial do Vendly.

---

### 6.2 Modal Confirmar Exclusão de Produto

Identificador:

- `modal-confirmar-exclusao`

Onde existe:

- Dashboard.
- Aba **Estoque**.

Quem usa:

- Lojista/operador.

Para que serve:

- Confirmar exclusão permanente de um produto.

O que abre:

- Botão de excluir produto na listagem de estoque.

Dados que carrega:

- ID do produto.
- Nome do produto.

Elementos internos:

- Ícone de lixeira.
- Título `Excluir Produto?`.
- Nome do produto.
- Aviso de ação permanente.
- Botão cancelar.
- Botão confirmar exclusão.

Como funciona:

- Ao clicar em excluir, guarda o ID do produto.
- Mostra o nome no modal.
- Se confirmar, chama backend para remover.
- Depois recarrega/renderiza estoque.

O que grava/remove:

- Remove linha do produto na planilha.

API relacionada:

- `remover_produto`

Planilhas afetadas:

- `Produtos`.

Impacto no sistema:

- Produto sai do estoque e da vitrine definitivamente.
- É ação destrutiva.

---

## 7. Dashboard > Compras

### 7.1 Modal Cadastro/Edição de Lote de Encomenda

Identificador:

- `modal-add-enc`

Onde existe:

- Dashboard.
- Aba **Compras**.

Quem usa:

- Lojista/operador.

Para que serve:

- Cadastrar lote de compra/encomenda.
- Editar lote existente.
- Registrar vários aparelhos em uma mesma compra.
- Calcular custo real com rateio.
- Estimar lucro e ROI antes da mercadoria chegar.

O que abre:

- Botão de adicionar lote.
- Botão de editar lote.

Dados que carrega:

- Em cadastro: campos vazios e um item inicial.
- Em edição: dados do lote e itens existentes.
- Histórico financeiro preservado quando já existe.

Elementos internos:

- Informações do lote/fornecedor:
  - fornecedor;
  - data da compra;
  - previsão de chegada;
  - frete;
  - taxas;
  - outros custos;
  - observações.
- Lista de aparelhos no lote:
  - quantidade;
  - modelo;
  - categoria;
  - versão;
  - cor;
  - memória;
  - condição;
  - custo unitário;
  - venda prevista.
- Botão `Adicionar Aparelho`.
- Botão de duplicar item.
- Botão de remover item.
- Resumo financeiro:
  - total de unidades;
  - custos gerais;
  - rateio por unidade;
  - custo real do lote;
  - venda prevista total;
  - lucro estimado;
  - ROI estimado.

Como funciona:

- Custos gerais são distribuídos por unidade.
- Cada item mostra custo base, rateio e custo real.
- O resumo recalcula em tempo real.
- No modo edição, o título muda para `Editar Lote & Produtos`.
- Ao salvar, monta payload com dados do lote e itens.

O que grava:

- Lote.
- Itens do lote.
- Custos.
- Previsão de chegada.
- Preço previsto.
- Observações.

API relacionada:

- `salvar_lote_encomendado`

Planilhas alimentadas:

- `Produtos_Encomendados` ou aba equivalente de encomendados usada pelo backend.

O que alimenta depois:

- Aba Compras.
- Painel Geral como capital em trânsito.
- Fluxo de Caixa como pendente a pagar/pagamento futuro.
- Estoque, quando chegar.

Impacto no sistema:

- Registra mercadoria ainda não disponível para venda.
- Alimenta planejamento de caixa e estoque futuro.

---

### 7.2 Modal Pagamento do Lote

Identificador:

- `modal-pagamento-lote`

Onde existe:

- Dashboard.
- Aba **Compras**.

Quem usa:

- Lojista/operador.

Para que serve:

- Registrar pagamento total ou parcial de um lote.
- Controlar saldo pendente com fornecedor.
- Manter histórico de pagamentos.

O que abre:

- Botão `Pagar` em um lote.

Dados que carrega:

- ID do lote.
- Status financeiro atual.
- Histórico de pagamentos.
- Valor total do lote.
- Total já pago.
- Saldo pendente.

Elementos internos:

- Status financeiro:
  - pendente;
  - pago total;
  - pagamento parcial.
- Data do pagamento.
- Valor desta parcela.
- Saldo devedor.
- Histórico de pagamentos.
- Mensagem de erro.
- Botão confirmar pagamento.

Como funciona:

- Ao abrir, calcula total do lote e total já pago.
- Se status for parcial, mostra campos de valor pago e saldo.
- O saldo devedor é recalculado ao digitar valor.
- Valida data e valor.
- Salva histórico consolidado no backend.

O que grava:

- Status de pagamento.
- Data de pagamento.
- Valor pago.
- Valor pendente.
- Histórico de pagamentos.

API relacionada:

- `marcar_pagamento_lote`

Planilhas alimentadas:

- `Produtos_Encomendados`/encomendados.

O que alimenta depois:

- Fluxo de Caixa como saída automática.
- Cards de pendente a pagar.
- Métricas de Compras.
- Painel Geral/Patrimônio operacional indiretamente.

Impacto no sistema:

- Controla contas a pagar e caixa.
- Pagamentos devem ser deduplicados no fluxo para não inflar saídas.

---

### 7.3 Modal Confirmar Chegada / Integração ao Estoque

Identificador:

- `modal-chegou`

Onde existe:

- Dashboard.
- Aba **Compras**.

Quem usa:

- Lojista/operador.

Para que serve:

- Marcar aparelho comprado como recebido.
- Completar dados finais.
- Enviar imagens.
- Publicar ou não na vitrine.
- Transformar encomenda em produto de estoque.

O que abre:

- Botão `Receber` em um lote.
- Fluxo individual de chegada.
- Fluxo em lote via `abrirLoteChegou`.

Dados que carrega:

- Item encomendado.
- Fila de itens pendentes do lote, se o recebimento for em lote.
- Modelo.
- Categoria.
- Versão/memória.
- Cor.
- Custo.
- Preço previsto.

Elementos internos:

- Título `Confirmar Chegada`.
- Badge de progresso `Item 1/5`, quando em fluxo de lote.
- Aviso de que o aparelho será movido para estoque.
- Info do item.
- IMEI 1.
- Número de série.
- Saúde da bateria.
- Preço final de venda.
- Upload/dropzone de fotos.
- 5 slots de imagem.
- Badge `Capa` na primeira imagem.
- Reordenação por drag/drop.
- Remoção de foto.
- Warning se faltar condição/memória para vitrine.
- Toggle `Publicar na Vitrine`.
- Botão anterior, quando em lote.
- Botão finalizar/confirmar.

Como funciona:

- Pode receber item único ou fila de itens do lote.
- No fluxo de lote, avança item por item.
- Imagens são enviadas e as URLs são guardadas nos campos ocultos.
- A primeira imagem vira capa.
- Valida dados mínimos quando publicar na vitrine.
- Ao confirmar, chama backend para marcar chegada e criar produto no estoque.

O que grava:

- Status do item como recebido/chegou.
- Dados finais do produto.
- Imagens.
- Preço final.
- IMEI/série.
- Status ativo/inativo na vitrine.

API relacionada:

- `marcar_chegou`
- `upload_imagem`, quando há upload.

Planilhas alimentadas:

- `Produtos_Encomendados`/encomendados.
- `Produtos`.

O que alimenta depois:

- Estoque.
- Vitrine, se publicado.
- Painel Geral como capital em estoque.
- Compras, removendo/reclassificando capital em trânsito.

Impacto no sistema:

- É o modal que converte compra em mercadoria vendável.

---

### 7.4 Modal Confirmar Exclusão de Lote/Item

Identificador:

- `modal-confirm-delete`

Onde existe:

- Dashboard.
- Aba **Compras**.

Quem usa:

- Lojista/operador.

Para que serve:

- Confirmar exclusão de lote inteiro ou item específico.

O que abre:

- Ação de excluir no menu de compras.

Dados que carrega:

- Tipo do alvo:
  - lote;
  - item.
- ID do alvo.
- Mensagem contextual.

Elementos internos:

- Ícone de alerta.
- Título `Confirmar Exclusão`.
- Mensagem dinâmica.
- Botão cancelar.
- Botão `Sim, Excluir`.

Como funciona:

- Define `deleteTarget`.
- Mostra mensagem contextual.
- Recria o listener do botão para evitar múltiplos handlers.
- Ao confirmar, chama backend e atualiza a tabela.

O que remove:

- Item de compra.
- Ou todos os itens de um lote.

API relacionada:

- `remover_encomendado`

Planilhas afetadas:

- `Produtos_Encomendados`/encomendados.

Impacto no sistema:

- Remove capital em trânsito e pendências associadas ao item/lote.

---

## 8. Dashboard > Fluxo de Caixa

### 8.1 Drawer Nova Entrada/Saída

Identificadores:

- `cf-modal`
- `cf-modal-drawer`

Onde existe:

- Dashboard.
- Aba **Fluxo de Caixa**.

Quem usa:

- Lojista/operador.

Para que serve:

- Criar movimento manual de entrada.
- Criar movimento manual de saída.

O que abre:

- Botão `Entrada`.
- Botão `Saída`.

Dados que carrega:

- Tipo selecionado:
  - entrada;
  - saída.
- Categorias compatíveis com o tipo.
- Data atual como padrão.

Elementos internos:

- Tipo oculto.
- Data.
- Valor.
- Categoria.
- Descrição.
- Forma de pagamento.
- Status.
- Observação.
- Botões cancelar/salvar.

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

Como funciona:

- Abre como drawer pela direita.
- Muda título e categorias conforme tipo.
- Valida campos obrigatórios.
- Salva movimento manual.

O que grava:

- Movimento manual de caixa.

API relacionada:

- `salvar_movimento_caixa`

Planilhas alimentadas:

- `Fluxo_Caixa`.

O que alimenta depois:

- Cards do Fluxo de Caixa.
- Caixa disponível.
- Extrato.
- Patrimônio operacional.

Impacto no sistema:

- Permite registrar eventos financeiros que não vêm automaticamente de venda, fiado ou compras.

---

### 8.2 Drawer Edição de Movimento Manual

Identificadores:

- `cf-modal`
- `cf-modal-drawer`

Onde existe:

- Dashboard.
- Aba **Fluxo de Caixa**.

Quem usa:

- Lojista/operador.

Para que serve:

- Editar movimento manual já criado.

O que abre:

- Ação de editar em uma linha manual do fluxo.

Dados que carrega:

- Movimento selecionado.
- Tipo.
- Data.
- Valor.
- Categoria.
- Descrição.
- Forma de pagamento.
- Status.
- Observação.

Como funciona:

- Usa o mesmo drawer de nova movimentação.
- Preenche campos com dados existentes.
- Ajusta título para edição.
- Ao salvar, abre confirmação customizada antes de gravar.

O que grava:

- Alterações do movimento manual.

API relacionada:

- `editar_movimento_caixa`

Planilhas alimentadas:

- `Fluxo_Caixa`.

Impacto no sistema:

- Recalcula entradas, saídas, caixa disponível e extrato.

---

### 8.3 Drawer Abertura de Caixa

Identificadores:

- `cf-abertura-modal`
- `cf-abertura-drawer`

Onde existe:

- Dashboard.
- Aba **Fluxo de Caixa**.

Quem usa:

- Lojista/operador.

Para que serve:

- Definir saldo inicial do controle financeiro.
- Criar ponto de corte para cálculo do caixa disponível.

O que abre:

- Botão `Caixa Inicial`.
- Banner `Defina o caixa inicial`, quando não há abertura configurada.

Dados que carrega:

- Abertura existente, se houver.
- Data atual ou data previamente salva.
- Valor previamente salvo.
- Observação.

Elementos internos:

- Aviso explicando o efeito da abertura.
- Warning quando está editando abertura existente.
- Data de início do controle.
- Valor disponível em caixa/banco.
- Observação.
- Botões cancelar/salvar.

Como funciona:

- Abre como drawer pela direita.
- Ao salvar, cria/atualiza movimento especial `ABERTURA-CAIXA`.
- Movimentações anteriores à data da abertura deixam de contar no saldo atual.
- Alterar abertura recalcula o caixa disponível.

O que grava:

- Data de abertura.
- Valor inicial.
- Observação.
- Movimento especial de abertura.

API relacionada:

- `salvar_abertura_caixa`

Planilhas alimentadas:

- `Fluxo_Caixa`.

O que alimenta depois:

- Caixa disponível.
- Patrimônio operacional.
- Extrato.

Impacto no sistema:

- Define a base do caixa atual.
- É essencial para conciliar saldo real com o sistema.

---

### 8.4 Modal de Confirmação do Fluxo de Caixa

Identificadores:

- `cf-confirm-modal`
- `cf-confirm-box`

Onde existe:

- Dashboard.
- Aba **Fluxo de Caixa**.

Quem usa:

- Lojista/operador.

Para que serve:

- Confirmar alterações ou exclusões sensíveis.

O que abre:

- Edição de movimento manual.
- Exclusão de movimento manual.
- Outras ações que chamem `openConfirmModal`.

Dados que carrega:

- Mensagem dinâmica.
- Título dinâmico.
- Ícone dinâmico.
- Texto do botão de confirmação.
- Callback a executar.

Elementos internos:

- Ícone.
- Título.
- Mensagem.
- Botão cancelar.
- Botão confirmar.

Como funciona:

- Guarda callback em variável temporária.
- Abre com animação.
- Se confirmar, fecha e executa callback.
- Se cancelar, limpa callback.

O que grava/remove:

- Depende da ação confirmada.
- Normalmente edita ou remove movimento de caixa.

APIs relacionadas:

- `editar_movimento_caixa`.
- `remover_movimento_caixa`.

Planilhas afetadas:

- `Fluxo_Caixa`.

Impacto no sistema:

- Evita alterações acidentais no controle financeiro.

---

### 8.5 Modal/Visão de Extrato Financeiro

Identificação:

- Implementado no módulo de Fluxo de Caixa como visualização/modal de extrato.
- Aberto pelo botão `Extrato`.

Onde existe:

- Dashboard.
- Aba **Fluxo de Caixa**.

Quem usa:

- Lojista/operador.

Para que serve:

- Visualizar movimentos agrupados por dia.
- Auditar entradas e saídas em formato de extrato.

O que abre:

- Botão `Extrato`.

Dados que carrega:

- Movimentos manuais.
- Movimentos automáticos de vendas.
- Movimentos automáticos de fiado.
- Movimentos automáticos de compras.
- Abertura de caixa.
- Filtro de período atual.

Como funciona:

- Agrupa movimentos por data.
- Mostra linhas de entrada e saída.
- Ajuda a entender composição do caixa.

O que grava:

- Não grava.

O que alimenta:

- Não alimenta dados novos; é leitura/auditoria.

Impacto no sistema:

- Facilita conferência financeira.

---

## 9. Dashboard Geral

### 9.1 Welcome Overlay do Onboarding

Identificador:

- `onboarding-welcome`

Onde existe:

- Dashboard.

Quem usa:

- Lojista/operador.

Para que serve:

- Receber o usuário e iniciar tutorial guiado.

O que abre:

- Primeira visita ao dashboard, quando onboarding ainda não foi concluído.

Dados que carrega:

- Estado local `dashboard_onboarding_done`.

Como funciona:

- Cria elemento via JavaScript.
- Exibe overlay de boas-vindas.
- Remove com transição.
- Inicia fluxo do Driver.js.

O que grava:

- Estado local de tutorial visto.

Impacto no sistema:

- Não altera dados operacionais.

---

### 9.2 Tour Guiado do Dashboard

Tipo:

- Overlay/steps do Driver.js.

Onde existe:

- Dashboard.

Quem usa:

- Lojista/operador.

Para que serve:

- Ensinar navegação e principais áreas.

O que abre:

- Welcome overlay.
- Botão `Ver tutorial` na sidebar.

Dados que carrega:

- Elementos da UI:
  - Painel Geral.
  - Histórico de Pedidos.
  - Estratégia.
  - Estoque.
  - Cards/áreas explicadas pelo tour.

O que grava:

- LocalStorage indicando conclusão.

Impacto no sistema:

- Não altera pedidos, estoque, caixa ou compras.

---

## 10. Modais, Dados e Dependências por Aba

### 10.1 Vitrine

Modais/painéis:

- `product-modal`.
- `compare-modal`.
- `cart-panel`.
- `installment-simulator`.
- Onboarding Driver.js.

Alimentam:

- Carrinho.
- Comparador.
- Pedidos.
- WhatsApp.
- Métricas de vitrine.

Usuário:

- Cliente final.

### 10.2 Vendas > Histórico

Modais/drawers:

- `modal-negociacao`.
- `modal-novo-pedido`.
- `edit-order-drawer`.
- `modal-recibo`.

Alimentam:

- `Pedidos`.
- `Produtos`, quando há aparelho recebido.
- Fluxo de Caixa.
- Painel Geral.
- Estratégia.

Usuário:

- Lojista/operador.

### 10.3 Vendas > Fiado

Modais/drawers:

- `modal-nova-divida`.
- `modal-detalhes-fiado`.
- `modal-confirmar-cancelamento`.
- `confirm()` nativo para receber parcela.

Alimentam:

- `Fiados`.
- `Produtos`, quando aparelho recebido entra no estoque.
- Fluxo de Caixa.
- Pendentes a receber.

Usuário:

- Lojista/operador.

### 10.4 Estoque

Modais:

- `modal-cadastro-produto`.
- `modal-confirmar-exclusao`.

Alimentam:

- `Produtos`.
- Vitrine.
- Pedido manual.
- Fiado.
- Painel Geral.
- Fluxo de Caixa, via capital imobilizado.

Usuário:

- Lojista/operador.

### 10.5 Compras

Modais:

- `modal-add-enc`.
- `modal-pagamento-lote`.
- `modal-chegou`.
- `modal-confirm-delete`.

Alimentam:

- Encomendados/Produtos encomendados.
- `Produtos`.
- Fluxo de Caixa.
- Painel Geral.
- Capital em trânsito.
- Pendentes a pagar.

Usuário:

- Lojista/operador.

### 10.6 Fluxo de Caixa

Modais/drawers:

- `cf-modal`.
- `cf-abertura-modal`.
- `cf-confirm-modal`.
- Extrato financeiro.

Alimentam:

- `Fluxo_Caixa`.
- Caixa disponível.
- Patrimônio operacional.
- Extrato.
- Cards financeiros.

Usuário:

- Lojista/operador.

---

## 11. Regras Importantes para a Migração SaaS

1. **Não transformar drawers em páginas completas sem necessidade**
   - O MVP mantém o usuário na aba original enquanto executa a ação.

2. **Preservar o vínculo modal -> aba**
   - Cada modal nasce de uma aba específica e deve voltar para ela após salvar/cancelar.

3. **Preservar recálculos em tempo real**
   - Negociação, fiado, compras e parcelamento dependem de cálculo instantâneo dentro do modal.

4. **Preservar validações antes de gravar**
   - Pagamentos precisam fechar com valor final.
   - Fiado precisa de cliente/produto/valor.
   - Compra precisa de fornecedor/data/previsão/item.
   - Produto precisa de campos obrigatórios.
   - Recibo precisa validar documento e telefone.

5. **Preservar confirmações para ações destrutivas**
   - Excluir produto.
   - Excluir lote/item.
   - Cancelar fiado.
   - Remover/editar movimento financeiro.

6. **Preservar a origem dos dados**
   - Modais de vendas alimentam `Pedidos`.
   - Modais de estoque alimentam `Produtos`.
   - Modais de fiado alimentam `Fiados`.
   - Modais de compras alimentam encomendados e depois `Produtos`.
   - Modais de caixa alimentam `Fluxo_Caixa`.

7. **Preservar efeitos indiretos**
   - Fechar venda afeta estoque, caixa e métricas.
   - Receber fiado afeta caixa.
   - Pagar lote afeta saídas.
   - Receber compra afeta estoque e capital imobilizado.
   - Caixa inicial recalcula caixa disponível.

8. **Preservar responsividade**
   - Modais grandes devem ter rolagem interna.
   - Drawers devem funcionar em mobile.
   - Produto/carrinho usam padrão bottom sheet ou lateral conforme contexto.

---

## 12. Checklist de Cobertura

- [ ] Vitrine possui modal de produto.
- [ ] Vitrine possui modal de comparação.
- [ ] Vitrine possui carrinho lateral.
- [ ] Vitrine possui simulador de parcelamento.
- [ ] Vitrine possui onboarding.
- [ ] Histórico possui modal de negociação/fechamento.
- [ ] Histórico possui pedido manual.
- [ ] Histórico possui drawer de edição.
- [ ] Histórico possui recibo.
- [ ] Fiado possui drawer de nova dívida.
- [ ] Fiado possui drawer de detalhes.
- [ ] Fiado possui confirmação de cancelamento.
- [ ] Fiado possui confirmação de recebimento de parcela.
- [ ] Estoque possui cadastro/edição de produto.
- [ ] Estoque possui confirmação de exclusão.
- [ ] Compras possui cadastro/edição de lote.
- [ ] Compras possui pagamento de lote.
- [ ] Compras possui confirmação de chegada.
- [ ] Compras possui confirmação de exclusão.
- [ ] Fluxo de Caixa possui nova entrada/saída.
- [ ] Fluxo de Caixa possui edição de movimento.
- [ ] Fluxo de Caixa possui abertura de caixa.
- [ ] Fluxo de Caixa possui confirmação customizada.
- [ ] Fluxo de Caixa possui extrato.
- [ ] Dashboard possui onboarding/welcome overlay.

---

## 13. Resumo Executivo

Os modais do MVP não são apenas elementos visuais. Eles concentram os principais fluxos de negócio do Vendly:

- O cliente escolhe, compara, parcela e envia pedido pela vitrine.
- O lojista fecha venda, negocia preço, registra pagamento e gera recibo.
- O lojista controla fiado, parcelas e cancelamentos.
- O estoque nasce ou é alterado por cadastro direto, chegada de compra ou aparelho recebido.
- Compras passam de lote pendente para produto em estoque.
- O fluxo de caixa recebe movimentos manuais, abertura de caixa e impactos automáticos de vendas, fiado e compras.

Na migração para a versão SaaS, cada modal deve ser tratado como um fluxo funcional completo, com origem, validação, gravação, atualização da tela e efeitos indiretos preservados.
