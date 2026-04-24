import { store, CARRINHO_KEY } from './store.js';
import { CONFIG } from '../config.js';
import { formatarMoedaBRL, salvarClicksLocalStorage } from './utils.js';
import { elements, hideElement, showElement, openCart, setMessage } from '../../vitrine/modules/ui.js';
import { registrarClickApi, enviarPedidoApi } from './api.js';
import { trackProductClick, trackWhatsAppClick, trackMessageSent } from '../../vitrine/modules/tracker.js';

export function atualizarBadge() {
  const quantidadeTotal = store.carrinho.reduce((acc, item) => acc + item.quantidade, 0);
  elements.cartBadge.textContent = quantidadeTotal;

  if (quantidadeTotal > 0) {
    elements.cartBadge.classList.remove('hidden');
  } else {
    elements.cartBadge.classList.add('hidden');
  }
}

export function salvarCarrinhoLocalStorage() {
  localStorage.setItem(CARRINHO_KEY, JSON.stringify(store.carrinho));
}

export function carregarCarrinhoLocalStorage() {
  const json = localStorage.getItem(CARRINHO_KEY);
  if (json) {
    try { store.carrinho = JSON.parse(json); } catch (e) { store.carrinho = []; }
  } else {
    store.carrinho = [];
  }
  atualizarBadge();
}

function calcularTotal() {
  return store.carrinho.reduce((acc, item) => acc + item.preco * item.quantidade, 0);
}

function calcularTotalAncorado() {
  return store.carrinho.reduce((acc, item) => acc + (item.preco + 250) * item.quantidade, 0);
}

// ===== Parcelamento (Frontend only) =====
const PARCELAMENTO_KEY = 'catalogo_parcelamento_v1';
const PARCELAMENTO_JUROS = Number(CONFIG?.installment?.interestRatePerInstallment ?? 0.025);
const PARCELAMENTO_MAX = Number(CONFIG?.installment?.maxInstallments ?? 12);
const PARCELAMENTO_DEFAULT = Number(CONFIG?.installment?.defaultInstallments ?? 10);

let parcelamentoSelecionado = (() => {
  try {
    const json = localStorage.getItem(PARCELAMENTO_KEY);
    if (!json) return { modo: 'none', parcelas: null, entrada: 0 };
    const parsed = JSON.parse(json);
    return {
      modo: parsed?.modo || 'none',
      parcelas: parsed?.parcelas ? Number(parsed.parcelas) : null,
      entrada: Number(parsed?.entrada ?? 0)
    };
  } catch {
    return { modo: 'none', parcelas: null, entrada: 0 };
  }
})();

function salvarParcelamentoSelecionado() {
  try { localStorage.setItem(PARCELAMENTO_KEY, JSON.stringify(parcelamentoSelecionado)); } catch { }
}

function calcularParcelamento(preco, parcelas, entrada = 0, modo = 'parcelado') {
  const base = Math.max(0, Number(preco) || 0);
  const ent = Math.min(Math.max(0, Number(entrada) || 0), base);
  const p = Math.min(Math.max(1, Number(parcelas) || 1), PARCELAMENTO_MAX);

  if (modo === 'avista') {
    return {
      modo: 'avista',
      parcelas: 1,
      entrada: 0,
      restante: base,
      totalFinanciado: base,
      valorParcela: base,
      totalFinal: base
    };
  }

  const restante = Math.max(0, base - ent);
  const totalFinanciado = restante * (1 + (PARCELAMENTO_JUROS * p)); // juros simples por parcela
  const valorParcela = p > 0 ? (totalFinanciado / p) : 0;
  const totalFinal = ent + totalFinanciado;

  return { modo: 'parcelado', parcelas: p, entrada: ent, restante, totalFinanciado, valorParcela, totalFinal };
}

function formatarLinhaParcelamento(calc, opts = {}) {
  const showTotal = opts.showTotal === true;
  const skipOu = opts.skipOu === true;
  const prefix = skipOu ? '' : 'ou ';
  const base = `${prefix}${calc.parcelas}x de ${formatarMoedaBRL(calc.valorParcela)}`;
  return showTotal ? `${base} (total ${formatarMoedaBRL(calc.totalFinal)})` : base;
}

function obterResumoParcelamentoParaCheckout(totalAtual) {
  if (parcelamentoSelecionado.modo !== 'parcelado') return 'Pagamento: à vista';
  const calc = calcularParcelamento(totalAtual, parcelamentoSelecionado.parcelas, parcelamentoSelecionado.entrada, 'parcelado');
  const entradaTxt = calc.entrada > 0 ? `\nEntrada: ${formatarMoedaBRL(calc.entrada)}` : '';
  return `Parcelamento: ${formatarLinhaParcelamento(calc, { showTotal: false, skipOu: true })}${entradaTxt}`;
}

export function abrirSimuladorParcelamento() {
  const totalAtual = calcularTotal();
  if (!totalAtual) return;

  const id = 'installment-simulator';
  let modal = document.getElementById(id);
  if (!modal) {
    modal = document.createElement('div');
    modal.id = id;
    modal.className = 'fixed inset-0 z-[1001] flex items-end sm:items-center justify-center';
    modal.innerHTML = `
      <div id="installment-backdrop" class="absolute inset-0 bg-black/50"></div>
      <div class="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-100">
        <div class="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 class="text-base font-bold text-gray-900">Simular Parcelamento</h3>
            <p class="text-xs text-gray-500 mt-0.5">Juros: ${(PARCELAMENTO_JUROS * 100).toFixed(2).replace('.', ',')}% por parcela (simples)</p>
          </div>
          <button id="installment-close" class="w-9 h-9 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition text-lg font-bold">✕</button>
        </div>
        <div class="p-4 sm:p-5 space-y-4">
          <div class="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
            <span class="text-sm text-gray-600 font-medium">Total do Carrinho</span>
            <span id="installment-cart-total" class="text-sm font-bold text-gray-900"></span>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-semibold text-gray-800">Dar entrada? (opcional)</label>
            <input id="installment-entrada" type="number" min="0" step="0.01"
              class="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition text-sm"
              placeholder="0,00" />
            <p class="text-xs text-gray-500">A entrada é abatida do total e o restante é parcelado com a mesma regra.</p>
          </div>

          <div class="space-y-2">
            <p class="text-sm font-semibold text-gray-800">Escolha as parcelas</p>
            <div id="installment-options" class="grid grid-cols-1 gap-2 max-h-[45vh] overflow-y-auto pr-1"></div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#installment-backdrop').addEventListener('click', () => modal.remove());
    modal.querySelector('#installment-close').addEventListener('click', () => modal.remove());
  }

  const elTotal = modal.querySelector('#installment-cart-total');
  const inpEntrada = modal.querySelector('#installment-entrada');
  const elOptions = modal.querySelector('#installment-options');

  elTotal.textContent = formatarMoedaBRL(totalAtual);
  inpEntrada.value = String(Number(parcelamentoSelecionado.entrada || 0));

  const renderOptions = () => {
    const entradaAtual = Number(inpEntrada.value || 0);
    elOptions.innerHTML = '';

    // À vista (sem juros)
    {
      const isSelected = parcelamentoSelecionado.modo !== 'parcelado';
      const btn = document.createElement('button');
      btn.className = `w-full text-left px-4 py-3 rounded-xl border transition ${isSelected ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50'}`;
      btn.innerHTML = `
        <div class="flex items-center justify-between gap-3">
          <span class="text-sm font-semibold">À vista — ${formatarMoedaBRL(totalAtual)}</span>
          <span class="text-xs font-bold ${isSelected ? 'text-white' : 'text-gray-400'}">${isSelected ? 'Selecionado' : ''}</span>
        </div>
      `;
      btn.addEventListener('click', () => {
        parcelamentoSelecionado = { modo: 'avista', parcelas: PARCELAMENTO_DEFAULT, entrada: 0 };
        salvarParcelamentoSelecionado();
        renderCarrinho();
        modal.remove();
      });
      elOptions.appendChild(btn);
    }

    // Parcelado (2x..max)
    for (let p = 2; p <= PARCELAMENTO_MAX; p++) {
      const calc = calcularParcelamento(totalAtual, p, entradaAtual, 'parcelado');
      const isSelected =
        parcelamentoSelecionado.modo === 'parcelado' &&
        p === parcelamentoSelecionado.parcelas &&
        calc.entrada === Number(parcelamentoSelecionado.entrada || 0);

      const btn = document.createElement('button');
      btn.className = `w-full text-left px-4 py-3 rounded-xl border transition ${isSelected ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50'}`;
      btn.innerHTML = `
        <div class="flex items-center justify-between gap-3">
          <span class="text-sm font-semibold">${formatarLinhaParcelamento(calc, { showTotal: true })}</span>
          <span class="text-xs font-bold ${isSelected ? 'text-white' : 'text-gray-400'}">${isSelected ? 'Selecionado' : ''}</span>
        </div>
      `;
      btn.addEventListener('click', () => {
        parcelamentoSelecionado = { modo: 'parcelado', parcelas: p, entrada: Number(entradaAtual || 0) };
        salvarParcelamentoSelecionado();
        renderCarrinho();
        modal.remove();
      });
      elOptions.appendChild(btn);
    }
  };

  inpEntrada.addEventListener('input', () => renderOptions(), { passive: true });
  renderOptions();
}

export function renderCarrinho() {
  elements.cartItems.innerHTML = '';
  if (!store.carrinho.length) {
    elements.cartItems.innerHTML = '<li class="text-slate-500">Seu carrinho está vazio. Adicione produtos na loja.</li>';
    elements.totalValue.textContent = formatarMoedaBRL(0);
    if (elements.installmentValue) elements.installmentValue.textContent = '';
    hideElement(elements.checkoutForm);
    return;
  }

  store.carrinho.forEach(item => {
    const subtotal = item.preco * item.quantidade;
    const imageSrc = item.imagem || (store.produtos.find(p => String(p.id) === String(item.id))?.imagem) || 'https://via.placeholder.com/150';
    const li = document.createElement('li');
    li.className = 'bg-gray-50 border border-gray-100 rounded-lg p-3 space-y-3';
    li.innerHTML = `
      <div class="flex gap-3">
        <div class="w-16 h-16 bg-white border border-gray-100 rounded-md flex items-center justify-center shrink-0 overflow-hidden">
          <img src="${imageSrc}" alt="${item.nome}" class="w-full h-full object-contain">
        </div>
        <div class="flex flex-col flex-1 min-w-0">
          <div class="flex justify-between items-start gap-2">
            <h4 class="font-semibold text-gray-900 text-sm line-clamp-2 leading-snug">${item.nome}</h4>
            <button class="text-red-500 text-xs font-semibold hover:text-red-700 remove-item shrink-0" data-id="${item.id}">Remover</button>
          </div>
          <p class="text-gray-500 text-xs mt-1 mb-2">${formatarMoedaBRL(item.preco)}</p>
          
          <div class="flex items-center justify-between mt-auto">
            <div class="flex items-center gap-2">
              <button class="px-2 py-1 min-w-[28px] border border-gray-300 rounded hover:bg-gray-100 text-sm font-medium quantity-minus" data-id="${item.id}">−</button>
              <span class="font-semibold text-sm w-6 text-center" id="qtd-${item.id}">${item.quantidade}</span>
              <button 
                class="px-2 py-1 min-w-[28px] border border-gray-300 rounded hover:bg-gray-100 text-sm font-medium quantity-plus ${(store.produtos.find(p => String(p.id) === String(item.id))?.estoque === 1) ? 'opacity-50 cursor-not-allowed' : ''}" 
                data-id="${item.id}"
                ${(store.produtos.find(p => String(p.id) === String(item.id))?.estoque === 1) ? 'disabled' : ''}
              >+</button>
            </div>
            <p class="text-right font-semibold text-gray-900">${formatarMoedaBRL(subtotal)}</p>
          </div>
        </div>
      </div>
    `;
    elements.cartItems.appendChild(li);
  });

  const totalAtual = calcularTotal();
  elements.totalValue.innerHTML = `
    <span>${formatarMoedaBRL(totalAtual)}</span>
    <span class="ml-2 text-xs font-semibold text-gray-400 align-middle">à vista</span>
  `;
  if (elements.installmentValue) {
    if (store.carrinho.length > 0) {
      const resumo = (parcelamentoSelecionado.modo === 'parcelado')
        ? (() => {
          const calc = calcularParcelamento(totalAtual, parcelamentoSelecionado.parcelas, parcelamentoSelecionado.entrada, 'parcelado');
          return formatarLinhaParcelamento(calc, { showTotal: false });
        })()
        : (() => {
          const calc = calcularParcelamento(totalAtual, PARCELAMENTO_DEFAULT, 0, 'parcelado');
          return `<span class="opacity-70 font-normal">${formatarLinhaParcelamento(calc, { showTotal: false })}</span>`;
        })();

      elements.installmentValue.innerHTML = `
        <div class="flex flex-col w-full">
          <span class="text-xs font-medium text-gray-500 leading-tight">${resumo}</span>
          <span class="text-sm font-semibold text-gray-800 flex items-center justify-between leading-tight mt-0.5">
            <span>💳 Simular parcelas</span>
            <span class="text-gray-400">▸</span>
          </span>
        </div>
      `;
      // "Pseudo botão leve" (mobile-first)
      elements.installmentValue.className = [
        'w-full',
        'min-h-[40px]',
        'flex',
        'items-center',
        'justify-between',
        'gap-2',
        'px-3.5',
        'py-2.5',
        'rounded-xl',
        'bg-gray-50',
        'border',
        'border-gray-200',
        'text-sm',
        'text-gray-700',
        'font-semibold',
        'select-none',
        'cursor-pointer',
        'transition',
        'hover:bg-gray-100',
        'active:bg-gray-200',
        'active:scale-[0.99]'
      ].join(' ');
      elements.installmentValue.setAttribute('role', 'button');
      elements.installmentValue.setAttribute('tabindex', '0');
      elements.installmentValue.setAttribute('aria-label', 'Simular parcelamento');
      elements.installmentValue.title = 'Ver parcelas';
    } else {
      elements.installmentValue.textContent = '';
    }
  }

  showElement(elements.checkoutForm);
}

export function adicionarAoCarrinho(produtoId) {
  const produto = store.produtos.find(p => p.id === produtoId);
  if (!produto || !produto.ativo) return;

  // Contar cliques e persistir
  store.produtoClicks[produtoId] = (store.produtoClicks[produtoId] || 0) + 1;
  salvarClicksLocalStorage();
  registrarClickApi(produtoId);

  // Track product click for metrics
  trackProductClick(produto);

  const itemEmCarrinho = store.carrinho.find(i => i.id === produto.id);

  // Se já está no carrinho, apenas abrimos o modal sem adicionar mais (conforme pedido do usuário)
  if (itemEmCarrinho) {
    if (typeof openCart === 'function') openCart();
    return;
  }

  // Se não está no carrinho, adicionamos
  store.carrinho.push({ id: produto.id, nome: produto.nome, preco: Number(produto.preco), quantidade: 1, imagem: produto.imagem });

  salvarCarrinhoLocalStorage();
  renderCarrinho();
  atualizarBadge();
  setMessage('success', `Produto "${produto.nome}" adicionado ao carrinho.`);
  
  if (typeof openCart === 'function') openCart();
}

export function removerDoCarrinho(produtoId) {
  store.carrinho = store.carrinho.filter(i => i.id !== produtoId);
  salvarCarrinhoLocalStorage();
  renderCarrinho();
  atualizarBadge();
}

export function ajustarQuantidade(produtoId, delta) {
  const item = store.carrinho.find(i => i.id === produtoId);
  if (!item) return;

  if (delta > 0) {
    const produto = store.produtos.find(p => String(p.id) === String(produtoId));
    // Regra de privacidade: só restringir se o estoque for EXATAMENTE 1
    if (produto && produto.estoque === 1 && item.quantidade >= 1) {
      if (typeof setMessage === 'function') {
        setMessage('error', 'Apenas 1 unidade disponível deste produto.');
      }
      return;
    }
  }

  item.quantidade += delta;
  if (item.quantidade <= 0) {
    removerDoCarrinho(produtoId);
    return;
  }
  salvarCarrinhoLocalStorage();
  renderCarrinho();
  atualizarBadge();
}

export function limparCarrinho() {
  store.carrinho = [];
  salvarCarrinhoLocalStorage();
  renderCarrinho();
  atualizarBadge();
  setMessage('warning', 'Carrinho limpo.');
}

export async function finalizarPedido() {
  if (!store.carrinho.length) {
    setMessage('error', 'Carrinho vazio. Adicione produtos antes de finalizar.');
    return;
  }

  const pedidoObj = {
    itens: store.carrinho.map(item => {
      const produto = store.produtos.find(p => String(p.id) === String(item.id)) || item;
      return {
        id: produto.id || item.id,
        sku: produto.sku || '',
        nome: produto.nome || item.nome,
        group_id: produto.grupo_id || '',
        marca: produto.categoria || 'N/A',
        armazenamento: produto.armazenamento || 'N/A',
        cor: produto.cor || 'N/A',
        condicao: produto.condicao || 'N/A',
        imei1: produto.imei1 || '',
        saude_bateria: produto.saude_bateria || '',
        quantidade: item.quantidade,
        preco: item.preco
      };
    }),
    total: calcularTotal()
  };

  // Registrar pedido no backend sem bloquear a UI
  enviarPedidoApi(pedidoObj).catch(err => console.error('Erro ao registrar pedido:', err));

  const itensFormatados = store.carrinho.map(item => {
    const produto = store.produtos.find(p => String(p.id) === String(item.id)) || item;
    const nome = produto.nome || item.nome;
    const cor = produto.cor ? ` - ${produto.cor}` : '';
    const armaz = produto.armazenamento || 'N/A';
    const cond = produto.condicao || 'N/A';
    return `*${nome}${cor}*\n* *${armaz}*\n* *${cond}*`;
  }).join('\n\n');

  let mensagem;
  const parcelamentoMsg = obterResumoParcelamentoParaCheckout(calcularTotal());
  if (store.carrinho.length === 1) {
    mensagem = `Olá! Tenho interesse no produto:\n\n${itensFormatados}\n\n${parcelamentoMsg}\n\nPodemos conversar sobre preço e disponibilidade?`;
  } else {
    mensagem = `Olá! Tenho interesse nos seguintes produtos:\n\n${itensFormatados}\n\n${parcelamentoMsg}\n\nPodemos conversar sobre preço e disponibilidade?`;
  }

  const urlWhatsApp = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(mensagem)}`;
  window.open(urlWhatsApp, '_blank');

  // Track WhatsApp metrics
  trackWhatsAppClick(store.carrinho);
  trackMessageSent(store.carrinho);

  setMessage('success', 'A mensagem do pedido foi aberta no WhatsApp.');
}

export function comprarViaWhatsApp(produtoId) {
  const produto = store.produtos.find(p => p.id === produtoId);
  if (!produto || !produto.ativo) return;

  // Adicionar ao store.carrinho
  adicionarAoCarrinho(produtoId);

  const pedidoObj = {
    itens: [{
      id: produto.id,
      sku: produto.sku || '',
      nome: produto.nome,
      group_id: produto.grupo_id || '',
      marca: produto.categoria || 'N/A',
      armazenamento: produto.armazenamento || 'N/A',
      cor: produto.cor || 'N/A',
      condicao: produto.condicao || 'N/A',
      imei1: produto.imei1 || '',
      saude_bateria: produto.saude_bateria || '',
      quantidade: 1,
      preco: Number(produto.preco)
    }],
    total: Number(produto.preco)
  };

  // Registrar pedido no backend sem bloquear a UI
  enviarPedidoApi(pedidoObj).catch(err => console.error('Erro ao registrar pedido:', err));


}
