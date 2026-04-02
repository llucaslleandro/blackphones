/*
  Catálogo com carrinho, WhatsApp e Google Sheets via Google Apps Script
  Requisitos:
  - itens em localStorage
  - busca e filtro por categoria
  - subtotal e total
  - finaliza checkout e envia para WhatsApp
  - grava pedido em aba Pedidos via endpoint POST
*/

const STORE_NAME = 'Loja Exemplo'; // Nome da loja para exibir no topo e mensagens
const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbxZGu5Vq5rXtPZNMYj_mu3sUp43-jVs64m2QuW3Yy_93vo-LLjyugbGH_J8H-xE6SF5/exec'; // Substitua pelo URL do novo deployment
const WHATSAPP_NUMBER = '5579996063423'; // sem +
const CARRINHO_KEY = 'catalogo_cart_v1';

const elements = {
  storeName: document.getElementById('store-name'),
  searchInput: document.getElementById('search-input'),
  categorySelect: document.getElementById('category-select'),
  productsGrid: document.getElementById('products-grid'),
  cartBadge: document.getElementById('cart-badge'),
  cartPanel: document.getElementById('cart-panel'),
  cartItems: document.getElementById('cart-items'),
  totalValue: document.getElementById('total-value'),
  btnOpenCart: document.getElementById('btn-open-cart'),
  btnCloseCart: document.getElementById('close-cart'),
  overlay: document.getElementById('overlay'),
  loading: document.getElementById('loading'),
  errorMessage: document.getElementById('error-message'),
  emptyMessage: document.getElementById('empty-message'),
  checkoutArea: document.getElementById('checkout-area'),
  nameField: document.getElementById('customer-name'),
  phoneField: document.getElementById('customer-phone'),
  deliveryType: document.getElementById('delivery-type'),
  addressField: document.getElementById('address'),
  notesField: document.getElementById('notes'),
  finalizeButton: document.getElementById('finalize-order'),
  clearCartButton: document.getElementById('clear-cart'),
  checkoutMsg: document.getElementById('checkout-msg')
};

elements.storeName.textContent = STORE_NAME;

let produtos = [];
let carrinho = [];

function formatarMoedaBRL(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

function showElement(el) { el.classList.remove('hidden'); }
function hideElement(el) { if (!el.classList.contains('hidden')) el.classList.add('hidden'); }

function openCart() {
  elements.cartPanel.classList.remove('translate-x-full');
  elements.overlay.classList.remove('hidden');
}

function closeCart() {
  elements.cartPanel.classList.add('translate-x-full');
  elements.overlay.classList.add('hidden');
}

function setError(message) {
  elements.errorMessage.textContent = message;
  showElement(elements.errorMessage);
}

function setMessage(type, message) {
  const styles = {
    success: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
    warning: 'bg-yellow-100 text-yellow-900'
  };

  elements.checkoutMsg.textContent = message;
  elements.checkoutMsg.className = `mt-3 text-sm p-2 rounded ${styles[type] || ''}`;
}

function aplicarAnimacaoAdicao(button) {
  button.classList.add('animate-pulse');
  setTimeout(() => button.classList.remove('animate-pulse'), 400);
}

function renderCategorias() {
  const categorias = ['all', ...new Set(produtos.map(p => p.categoria).filter(Boolean))];
  elements.categorySelect.innerHTML = categorias
    .map(cat => `<option value="${cat}">${cat === 'all' ? 'Todas as categorias' : cat}</option>`)
    .join('');
}

function renderProdutos(lista) {
  if (!lista.length) {
    elements.productsGrid.innerHTML = '<div class="col-span-full py-10 text-center text-slate-600">Nenhum produto encontrado.</div>';
    return;
  }

  elements.productsGrid.innerHTML = lista.map(produto => {
    const disabled = !produto.ativo;
    return `
      <div class="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200 relative">
        ${disabled ? '<span class="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">Indisponível</span>' : ''}
        <img src="${produto.imagem}" alt="${produto.nome}" class="w-full h-48 object-contain bg-slate-100" loading="lazy">
        <div class="p-4 flex flex-col gap-2">
          <h3 class="font-semibold text-lg">${produto.nome}</h3>
          <p class="text-sm text-slate-600 line-clamp-2">${produto.descricao}</p>
          <p class="text-primary font-bold text-xl">${formatarMoedaBRL(Number(produto.preco))}</p>
          <button ${disabled ? 'disabled' : ''} class="add-cart-btn mt-auto bg-secondary text-white py-2 rounded-lg hover:bg-orange-500 transition ${disabled ? 'opacity-50 cursor-not-allowed' : ''}" data-id="${produto.id}">Adicionar ao carrinho</button>
        </div>
      </div>
    `;
  }).join('');

  document.querySelectorAll('.add-cart-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      adicionarAoCarrinho(id);
      aplicarAnimacaoAdicao(btn);
    });
  });
}

function filtrarProdutos() {
  const query = elements.searchInput.value.trim().toLowerCase();
  const categoria = elements.categorySelect.value;

  const filtrados = produtos.filter(p => {
    const byCat = categoria === 'all' || p.categoria === categoria;
    const byText = p.nome.toLowerCase().includes(query) || p.descricao.toLowerCase().includes(query);
    return byCat && byText;
  });

  renderProdutos(filtrados);
}

function atualizarBadge() {
  const quantidadeTotal = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
  elements.cartBadge.textContent = quantidadeTotal;
}

function salvarCarrinhoLocalStorage() {
  localStorage.setItem(CARRINHO_KEY, JSON.stringify(carrinho));
}

function carregarCarrinhoLocalStorage() {
  const json = localStorage.getItem(CARRINHO_KEY);
  if (json) {
    try { carrinho = JSON.parse(json); } catch (e) { carrinho = []; }
  } else {
    carrinho = [];
  }
  atualizarBadge();
}

function calcularTotal() {
  return carrinho.reduce((acc, item) => acc + item.preco * item.quantidade, 0);
}

function renderCarrinho() {
  elements.cartItems.innerHTML = '';
  if (!carrinho.length) {
    elements.cartItems.innerHTML = '<li class="text-slate-500">Carrinho vazio. Adicione produtos.</li>';
    elements.totalValue.textContent = formatarMoedaBRL(0);
    return;
  }

  carrinho.forEach(item => {
    const subtotal = item.preco * item.quantidade;
    const li = document.createElement('li');
    li.className = 'bg-slate-50 border border-slate-200 rounded-lg p-3';
    li.innerHTML = `
      <div class="flex justify-between items-start gap-2">
        <div>
          <h4 class="font-semibold">${item.nome}</h4>
          <p class="text-slate-600 text-sm">${formatarMoedaBRL(item.preco)} x ${item.quantidade} = <strong>${formatarMoedaBRL(subtotal)}</strong></p>
        </div>
        <button class="text-red-500 text-sm font-semibold remove-item" data-id="${item.id}">Remover</button>
      </div>
      <div class="mt-2 flex gap-2 items-center">
        <button class="px-2 py-1 border border-slate-300 rounded hover:bg-slate-100 quantity-minus" data-id="${item.id}">-</button>
        <span class="font-semibold" id="qtd-${item.id}">${item.quantidade}</span>
        <button class="px-2 py-1 border border-slate-300 rounded hover:bg-slate-100 quantity-plus" data-id="${item.id}">+</button>
      </div>
    `;

    elements.cartItems.appendChild(li);
  });

  document.querySelectorAll('.remove-item').forEach(btn => {
    btn.addEventListener('click', () => {
      removerDoCarrinho(btn.getAttribute('data-id'));
    });
  });

  document.querySelectorAll('.quantity-plus').forEach(btn => {
    btn.addEventListener('click', () => {
      ajustarQuantidade(btn.getAttribute('data-id'), 1);
    });
  });

  document.querySelectorAll('.quantity-minus').forEach(btn => {
    btn.addEventListener('click', () => {
      ajustarQuantidade(btn.getAttribute('data-id'), -1);
    });
  });

  elements.totalValue.textContent = formatarMoedaBRL(calcularTotal());
  elements.checkoutArea.classList.remove('hidden');
}

function adicionarAoCarrinho(produtoId) {
  const produto = produtos.find(p => p.id === produtoId);
  if (!produto || !produto.ativo) return;

  const item = carrinho.find(i => i.id === produto.id);
  if (item) {
    item.quantidade += 1;
  } else {
    carrinho.push({ id: produto.id, nome: produto.nome, preco: Number(produto.preco), quantidade: 1 });
  }

  salvarCarrinhoLocalStorage();
  renderCarrinho();
  atualizarBadge();
  setMessage('success', `Produto "${produto.nome}" adicionado ao carrinho.`);
}

function removerDoCarrinho(produtoId) {
  carrinho = carrinho.filter(i => i.id !== produtoId);
  salvarCarrinhoLocalStorage();
  renderCarrinho();
  atualizarBadge();
}

function ajustarQuantidade(produtoId, delta) {
  const item = carrinho.find(i => i.id === produtoId);
  if (!item) return;
  item.quantidade += delta;
  if (item.quantidade <= 0) {
    removerDoCarrinho(produtoId);
    return;
  }
  salvarCarrinhoLocalStorage();
  renderCarrinho();
  atualizarBadge();
}

function limparCarrinho() {
  carrinho = [];
  salvarCarrinhoLocalStorage();
  renderCarrinho();
  atualizarBadge();
  setMessage('warning', 'Carrinho limpo.');
}

function montarMensagemWhatsApp(pedido) {
  const linhas = [];
  linhas.push('*Novo Pedido*');
  linhas.push(`Cliente: ${pedido.cliente}`);
  linhas.push(`Telefone: ${pedido.telefone}`);
  linhas.push(`Tipo: ${pedido.tipo_entrega}`);
  if (pedido.tipo_entrega === 'Entrega') {
    linhas.push(`Endereço: ${pedido.endereco}`);
  }
  if (pedido.observacoes) linhas.push(`Observações: ${pedido.observacoes}`);
  linhas.push('');
  linhas.push('*Itens do pedido*');

  pedido.itens.forEach(item => {
    linhas.push(`* ${item.nome} x${item.quantidade} = ${formatarMoedaBRL(item.preco * item.quantidade)}`);
  });

  linhas.push('');
  linhas.push(`*Total: ${formatarMoedaBRL(pedido.total)}*`);
  linhas.push('');
  linhas.push('Obrigado!');

  return linhas.join('\n');
}

async function enviarPedidoApi(pedido) {
  try {
    const url = `${API_BASE_URL}?action=pedido`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pedido)
    });

    if (!response.ok) throw new Error('Erro ao enviar pedido para a API.');

    const result = await response.json();
    if (!result.ok) throw new Error(result.error || 'Serviço retornou erro.');

    return result;
  } catch (err) {
    throw new Error(err.message || 'Falha na API de pedidos.');
  }
}

async function finalizarPedido() {
  if (!carrinho.length) {
    setMessage('error', 'Carrinho vazio. Adicione produtos antes de finalizar.');
    return;
  }

  const nome = elements.nameField.value.trim();
  const telefone = elements.phoneField.value.trim();
  const tipoEntrega = elements.deliveryType.value;
  const endereco = elements.addressField.value.trim();
  const observacoes = elements.notesField.value.trim();

  if (!nome || !telefone) {
    setMessage('error', 'Nome e telefone são obrigatórios.');
    return;
  }

  if (tipoEntrega === 'Entrega' && !endereco) {
    setMessage('error', 'Informe o endereço para entrega.');
    return;
  }

  const total = calcularTotal();
  const pedido = {
    cliente: nome,
    telefone: telefone,
    tipo_entrega: tipoEntrega,
    endereco: tipoEntrega === 'Entrega' ? endereco : '- N/A -',
    observacoes,
    itens: carrinho.map(i => ({ ...i })),
    total
  };

  setMessage('success', 'Enviando pedido... aguarde.');

  try {
    await enviarPedidoApi(pedido);
    const mensagem = montarMensagemWhatsApp(pedido);
    const urlWhatsApp = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensagem)}`;
    window.open(urlWhatsApp, '_blank');
    limparCarrinho();
    elements.nameField.value = '';
    elements.phoneField.value = '';
    elements.notesField.value = '';
    elements.addressField.value = '';
    elements.deliveryType.value = 'Entrega';
    setMessage('success', 'Pedido registrado e mensagem aberta no WhatsApp.');
  } catch (err) {
    setMessage('error', `Erro: ${err.message}`);
  }
}

async function fetchProdutos() {
  try {
    showElement(elements.loading);
    hideElement(elements.errorMessage);
    hideElement(elements.emptyMessage);
    hideElement(elements.productsGrid);

    const response = await fetch(`${API_BASE_URL}?action=produtos`);
    if (!response.ok) throw new Error('Falha ao buscar produtos do servidor.');

    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Formato de dados inesperado.');

    produtos = data.map(item => ({
      id: String(item.id),
      nome: String(item.nome || ''),
      descricao: String(item.descricao || ''),
      categoria: String(item.categoria || 'Sem categoria'),
      preco: Number(item.preco || 0),
      imagem: String(item.imagem || 'https://via.placeholder.com/400x250?text=Imagem'),
      ativo: item.ativo === true || String(item.ativo).toLowerCase() === 'true'
    }));

    const ativos = produtos.filter(p => p.ativo);
    if (!ativos.length) {
      hideElement(elements.loading);
      showElement(elements.emptyMessage);
      hideElement(elements.checkoutArea);
      return;
    }

    hideElement(elements.loading);
    showElement(elements.productsGrid);
    renderCategorias();
    renderProdutos(ativos);
    aplicarEventos();
  } catch (err) {
    hideElement(elements.loading);
    setError(err.message || 'Erro desconhecido ao carregar os produtos.');
  }
}

function aplicarEventos() {
  elements.searchInput.addEventListener('input', filtrarProdutos);
  elements.categorySelect.addEventListener('change', filtrarProdutos);
  elements.btnOpenCart.addEventListener('click', openCart);
  elements.btnCloseCart.addEventListener('click', closeCart);
  elements.overlay.addEventListener('click', closeCart);
  elements.clearCartButton.addEventListener('click', limparCarrinho);
  elements.finalizeButton.addEventListener('click', finalizarPedido);

  const addressWrapper = document.getElementById('address-wrapper');

  elements.deliveryType.addEventListener('change', () => {
    if (elements.deliveryType.value === 'Entrega') {
      elements.addressField.disabled = false;
      addressWrapper.classList.remove('hidden');
    } else {
      elements.addressField.disabled = true;
      elements.addressField.value = '';
      addressWrapper.classList.add('hidden');
    }
  });

  if (elements.deliveryType.value === 'Retirada') {
    elements.addressField.disabled = true;
    addressWrapper.classList.add('hidden');
  }
}

function init() {
  carregarCarrinhoLocalStorage();
  renderCarrinho();
  fetchProdutos();
}

init();
