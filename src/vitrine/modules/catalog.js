import { store } from '../../shared/modules/store.js';
import { salvarClicksLocalStorage, formatarMoedaBRL, extrairNumero, getUniqueValues } from '../../shared/modules/utils.js';
import { elements, showElement, hideElement, openCart, closeCart, setError, setMessage, aplicarAnimacaoAdicao } from './ui.js';
import { adicionarAoCarrinho, renderCarrinho } from '../../shared/modules/cart.js';
import { trackProductView } from './tracker.js';

function renderCategorias() {
  const categorias = ['all', ...new Set(store.produtos.map(p => p.categoria).filter(Boolean))];
  elements.categorySelect.innerHTML = categorias
    .map(cat => `<option value="${cat}">${cat === 'all' ? 'Todas as categorias' : cat}</option>`)
    .join('');
}

function mapearProduto(item) {
  return {
    id: String(item.id),
    sku: String(item.sku || ''),
    estoque: Number(item.estoque || 0),
    estoque_minimo: Number(item.estoque_minimo || 2),
    grupo_id: String(item.grupo_id || item.id || ''),
    cor: String(item.cor || ''),
    nome: String(item.nome || ''),
    descricao: String(item.descricao || ''),
    categoria: String(item.categoria || 'Sem categoria'),
    preco: Number(item.preco || 0),
    imagem: String(item.imagem || 'https://via.placeholder.com/400x250?text=Imagem'),
    armazenamento: String(item.armazenamento || ''),
    ram: String(item.ram || ''),
    camera_frontal: String(item.camera_frontal || ''),
    camera_traseira: String(item.camera_traseira || ''),
    bateria: String(item.bateria || ''),
    tela: String(item.tela || ''),
    condicao: String(item.condicao || '').trim(),
    ativo: item.ativo === true || String(item.ativo).toLowerCase() === 'true',
    custo: Number(item.custo || 0),
    clicks: Number(item.clicks || 0)
  };
}

export function aplicarProdutos(data, isFromCache = false) {
  store.produtos = data.map(mapearProduto);

  // Carregar contagem de cliques da API (fonte de verdade)
  store.produtos.forEach(p => {
    if (p.clicks > (store.produtoClicks[p.id] || 0)) {
      store.produtoClicks[p.id] = p.clicks;
    }
  });
  salvarClicksLocalStorage();

  if (!store.produtos.length) {
    hideElement(elements.loading);
    showElement(elements.emptyMessage);
    return;
  }

  hideElement(elements.loading);
  showElement(elements.productsGrid);
  renderCategorias();
  filtrarProdutos(!isFromCache); // Garante que a primeira carga também passe pela mesma inteligência de UX/Ordenação
  renderCarrinho(); // Atualizar o carrinho para mostrar imagens carregadas
}

function renderProdutos(lista, useAnimation = false) {
  if (!lista.length) {
    elements.productsGrid.innerHTML = '<div class="col-span-full py-10 text-center text-gray-600">Nenhum celular encontrado.</div>';
    return;
  }

  const fragment = document.createDocumentFragment();
  let index = 0;

  lista.forEach(produto => {
    // Para renderização de vitrine, se for grupo, vamos calcular estoque agregado do grupo?
    // Caso a lista aqui já seja filtrada/agrupada visualmente ou a pessoa use master row, o `produto.estoque` representará aquela linha.
    // O pedido do usuário diz "produto indisponível deve ficar claro... se possível manter o produto visível com compra bloqueada".
    // Calcula estoque exclusivo da variação atual que está estampada no card
    const estoqueProduto = Number(produto.estoque) || 0;
    const minCalculado = Number(produto.estoque_minimo) || 2;

    const semEstoque = estoqueProduto <= 0;
    const disabled = !produto.ativo || semEstoque;
    const isPopular = store.produtoClicks[produto.id] > 5;
    const specs = {
      cor: produto.cor || 'Azul',
      armazenamento: produto.armazenamento || '128GB',
      ram: produto.ram || '4GB',
      cameraFrontal: produto.camera_frontal || '',
      cameraTraseira: produto.camera_traseira || '—',
      bateria: produto.bateria || '4000mAh',
      tela: produto.tela || '6.5"'
    };

    const fullName = produto.categoria ? `${produto.nome} | ${produto.cor} - ${produto.armazenamento}` : produto.nome;

    const salesKey = `${produto.nome}|${produto.cor}|${produto.armazenamento}`.toLowerCase();
    const realSales = store.vendasProduto[salesKey] || 0;

    // Calcular o máximo de vendas entre todos os produtos para dar o selo aos vencedores
    const allSalesValues = Object.values(store.vendasProduto);
    const maxSales = allSalesValues.length > 0 ? Math.max(...allSalesValues) : 0;
    const isBestSeller = realSales > 0 && realSales === maxSales;

    const variantLabel = realSales > 0 ? `🔥 ${realSales} vendidos` : '';

    let badge = '';
    if (semEstoque || !produto.ativo) {
      badge = '<span class="absolute top-3 left-3 z-20 bg-gray-800 text-white text-xs px-3 py-1 rounded-full font-semibold"><i class="fa-solid fa-ban"></i> Indisponível</span>';
    } else if (isBestSeller) {
      badge = '<span class="absolute top-3 left-3 z-20 bg-gradient-to-r from-gray-600 to-gray-900 text-white text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wider shadow-lg border border-gray-900 animate-pulse"><i class="fa-solid fa-crown mr-1"></i> Mais Vendido</span>';
    } else if (estoqueProduto === 1) {
      badge = '<span class="absolute top-3 left-3 z-20 bg-orange-100 text-orange-800 border border-orange-200 text-xs px-3 py-1 rounded-full font-bold shadow-sm"><i class="fa-solid fa-fire text-orange-500"></i> Apenas 1 unidade!</span>';
    } else if (estoqueProduto > 1 && estoqueProduto <= minCalculado) {
      badge = '<span class="absolute top-3 left-3 z-20 bg-yellow-100 text-yellow-800 border border-yellow-200 text-xs px-3 py-1 rounded-full font-semibold shadow-sm"><i class="fa-solid fa-clock text-yellow-600"></i> Poucas unidades</span>';
    } else if (isPopular) {
      badge = '<span class="absolute top-3 left-3 z-20 bg-yellow-400 text-gray-900 text-xs px-3 py-1 rounded-full font-semibold">★ Popular</span>';
    } else if (Number(produto.preco) < 2500) {
      badge = '<span class="absolute top-3 left-3 z-20 bg-green-400 text-gray-900 text-xs px-3 py-1 rounded-full font-semibold">✓ Melhor Preço</span>';
    } else if (produto.categoria === 'Apple') {
      badge = '<span class="absolute top-3 left-3 z-20 bg-blue-600 text-white text-xs px-3 py-1 rounded-full font-semibold">Premium</span>';
    }

    const card = document.createElement('div');
    if (useAnimation) {
      card.style.opacity = '0';
      card.style.animationDelay = `${index * 60}ms`;
      card.classList.add('product-fade-in');
    }
    card.className += ' product-card bg-white rounded-2xl overflow-hidden border border-gray-100 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer open-modal-wrap';
    card.setAttribute('data-id', produto.grupo_id);
    card.setAttribute('data-product-id', produto.id);

    let conditionBadge = '';
    if (produto.condicao && produto.condicao.toLowerCase() === 'novo') {
      conditionBadge = '<span class="absolute bottom-3 right-3 z-20 bg-green-100 text-green-800 border border-green-200 text-[10px] uppercase font-bold px-2 py-0.5 rounded-md tracking-wider shadow-sm">Novo</span>';
    } else if (produto.condicao && produto.condicao.toLowerCase() === 'seminovo') {
      conditionBadge = '<span class="absolute bottom-3 right-3 z-20 bg-purple-100 text-purple-800 border border-purple-200 text-[10px] uppercase font-bold px-2 py-0.5 rounded-md tracking-wider shadow-sm">Seminovo</span>';
    }

    card.innerHTML = `
      <div class="relative">
        <div class="aspect-square overflow-hidden bg-gray-50 flex items-center justify-center">
          <img src="${produto.imagem}" alt="${fullName}" class="w-4/5 h-4/5 object-contain" loading="lazy" decoding="async">
        </div>
        ${badge}
        ${conditionBadge}
        ${(semEstoque || !produto.ativo) ? '<div class="absolute inset-0 bg-white/50 backdrop-blur-[2px] flex items-center justify-center pointer-events-none"><span class="bg-gray-900/80 text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide">Indisponível</span></div>' : ''}
      </div>
      <div class="p-6 space-y-4">
        <div>
          <h3 class="font-medium text-base text-gray-900 leading-snug">${fullName}</h3>
          ${variantLabel ? `<p class="text-xs text-gray-400 mt-1">${variantLabel}</p>` : ''}
          <div class="text-xs text-gray-500 space-y-1 mt-2">
            <p>💾 ${specs.armazenamento} • 🧠 ${specs.ram}</p>
            <p>🤳 ${specs.cameraFrontal ? specs.cameraFrontal : '—'} • 📷 ${specs.cameraTraseira} • 🔋 ${specs.bateria}</p>
          </div>
        </div>
        <div class="border-t border-gray-100 pt-4">
          <p class="text-sm text-gray-400 line-through mb-1">${formatarMoedaBRL(Number(produto.preco) + 250)}</p>
          <p class="text-2xl font-bold text-gray-900 mb-4">${formatarMoedaBRL(Number(produto.preco))}</p>
          <div class="flex flex-col gap-2">
            <button ${disabled ? 'disabled' : ''} class="w-full btn-solid py-3 rounded-lg font-semibold text-sm ${disabled ? 'opacity-50 cursor-not-allowed' : ''}">
              VER OPÇÕES
            </button>
            <button ${disabled ? 'disabled' : ''} class="compare-card-btn w-full py-2.5 rounded-lg transition text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}" data-grupo-id="${produto.grupo_id}" data-product-id="${produto.id}">
              ${store.comparacao.some(c => c.id === produto.id) ? '✓ Adicionado' : 'Comparar'}
            </button>
          </div>
        </div>
      </div>
    `;
    fragment.appendChild(card);
    index++;
  });

  elements.productsGrid.innerHTML = '';
  elements.productsGrid.appendChild(fragment);

  document.querySelectorAll('.open-modal-wrap').forEach(wrap => {
    wrap.addEventListener('click', (e) => {
      if (e.target.closest('.compare-card-btn')) return;
      const gId = wrap.getAttribute('data-id');
      const pId = wrap.getAttribute('data-product-id');
      openProductModal(gId, pId);
    });
  });

  document.querySelectorAll('.compare-card-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pId = btn.getAttribute('data-product-id');
      toggleComparacao(pId);
    });
  });
}

export function filtrarProdutos(useAnimation = false) {
  const query = elements.searchInput.value.trim().toLowerCase();
  const categoria = elements.categorySelect.value;
  const condition = elements.conditionSelect ? elements.conditionSelect.value : 'all';
  const sort = elements.sortSelect.value;

  let filtrados = store.produtos.filter(p => {
    const byCat = categoria === 'all' || p.categoria === categoria;
    const byCond = condition === 'all' || (p.condicao && p.condicao.toLowerCase() === condition.toLowerCase());
    const byText = p.nome.toLowerCase().includes(query) || p.descricao.toLowerCase().includes(query);
    return byCat && byCond && byText;
  });

  filtrados.sort((a, b) => {
    const estA = Number(a.estoque) || 0;
    const estB = Number(b.estoque) || 0;

    // 1. Indisponíveis (esgotados ou inativos) sempre no final da lista
    const dispA = (estA > 0 && a.ativo) ? 1 : 0;
    const dispB = (estB > 0 && b.ativo) ? 1 : 0;
    if (dispA !== dispB) return dispB - dispA;

    // 2. Se o usuário ativou a ordenação por preço ou vendas, respeitamos ela para os disponíveis
    if (sort === 'price-low') return Number(a.preco) - Number(b.preco);
    if (sort === 'price-high') return Number(b.preco) - Number(a.preco);
    if (sort === 'best-sellers') {
      const vA = store.vendasProduto[`${a.nome}|${a.cor}|${a.armazenamento}`.toLowerCase()] || 0;
      const vB = store.vendasProduto[`${b.nome}|${b.cor}|${b.armazenamento}`.toLowerCase()] || 0;
      if (vA !== vB) return vB - vA;
    }

    // 3. Ordenação Inteligente UX (Hierarquia Clara)
    const clicksA = store.produtoClicks[a.id] || 0;
    const clicksB = store.produtoClicks[b.id] || 0;

    const minA = Number(a.estoque_minimo) || 2;
    const minB = Number(b.estoque_minimo) || 2;

    // Definindo "Tiers" ou "Score" de relevância:
    // Nível 3: Populares (> 5 cliques)
    // Nível 2: Apenas 1 Unidade
    // Nível 1: Poucas Unidades (<= mínimo)
    // Nível 0: Restante
    let scoreA = 0, scoreB = 0;

    if (clicksA > 5) scoreA = 3;
    else if (estA === 1) scoreA = 2;
    else if (estA <= minA) scoreA = 1;

    if (clicksB > 5) scoreB = 3;
    else if (estB === 1) scoreB = 2;
    else if (estB <= minB) scoreB = 1;

    // Ordena do maior score para o menor
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }

    // Critérios de desempate se tiverem no mesmo score:

    // a) Número de cliques exato 
    if (clicksA !== clicksB) {
      return clicksB - clicksA;
    }

    // b) Nível de urgência e escassez de estoque (menor estoque na frente)
    if (estA !== estB) {
      return estA - estB;
    }

    // c) Ordem alfabética se empatar tudo
    return a.nome.localeCompare(b.nome);
  });

  renderProdutos(filtrados, useAnimation);
}

// ===== Compare Logic =====
let compareToastTimer = null;

function toggleComparacao(produtoId) {
  const produto = store.produtos.find(p => p.id === produtoId);
  if (!produto) return;

  const index = store.comparacao.findIndex(c => c.id === produtoId);
  let wasAdded = false;
  if (index > -1) {
    store.comparacao.splice(index, 1);
  } else if (store.comparacao.length < 3) {
    store.comparacao.push(produto);
    wasAdded = true;
  } else {
    alert('Máximo 3 store.produtos para comparação.');
    return;
  }

  atualizarCompareButton();
  filtrarProdutos();

  if (wasAdded && store.comparacao.length > 0) {
    showCompareToast(produto);
  } else if (store.comparacao.length === 0) {
    hideCompareToast();
  } else {
    updateCompareToast();
  }
}

function showCompareToast(produto) {
  clearTimeout(compareToastTimer);
  let toast = document.getElementById('compare-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'compare-toast';
    document.body.appendChild(toast);
  }

  const thumbs = store.comparacao.map(p => `
    <div style="width:36px;height:36px;border-radius:8px;background:#f3f4f6;border:1px solid #e5e7eb;overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;">
      <img src="${p.imagem}" style="width:100%;height:100%;object-fit:contain;" alt="${p.nome}">
    </div>
  `).join('');

  const slotsLeft = 3 - store.comparacao.length;
  const slotsText = slotsLeft > 0 ? `<span style="font-size:12px;color:#9ca3af;">${slotsLeft === 1 ? '+ 1 vaga' : `+ ${slotsLeft} vagas`}</span>` : '';

  toast.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0;">
      <div style="display:flex;gap:6px;align-items:center;">
        ${thumbs}
        ${slotsLeft > 0 ? `<div style="width:36px;height:36px;border-radius:8px;border:2px dashed #d1d5db;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><span style="color:#9ca3af;font-size:16px;">+</span></div>` : ''}
      </div>
      <div style="min-width:0;">
        <p style="font-size:13px;font-weight:600;color:#111827;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${store.comparacao.length} de 3 selecionados</p>
        ${slotsText}
      </div>
    </div>
    <button id="compare-toast-btn" style="background:#111827;color:white;border:none;border-radius:10px;padding:10px 20px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;transition:background 0.2s;font-family:Inter,system-ui,sans-serif;">
      ${store.comparacao.length >= 2 ? 'Comparar Agora' : 'Comparar'}
    </button>
  `;

  toast.style.cssText = `
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 900;
    background: white;
    border-top: 1px solid #e5e7eb;
    box-shadow: 0 -4px 20px rgba(0,0,0,0.1);
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    transform: translateY(100%);
    transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  `;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.transform = 'translateY(0)';
    });
  });

  document.getElementById('compare-toast-btn').addEventListener('click', () => {
    if (store.comparacao.length >= 2) {
      renderComparacao();
      elements.compareModal.classList.remove('hidden');
      hideCompareToast();
    } else {
      const pModal = document.getElementById('product-modal');
      if (pModal && !pModal.classList.contains('hidden')) {
        pModal.classList.add('hidden');
        document.body.style.overflow = '';
      }
    }
  });

  compareToastTimer = setTimeout(() => {
    hideCompareToast();
  }, 8000);
}

function updateCompareToast() {
  if (store.comparacao.length > 0 && document.getElementById('compare-toast')) {
    showCompareToast(null);
  }
}

function hideCompareToast() {
  const toast = document.getElementById('compare-toast');
  if (!toast) return;
  toast.style.transform = 'translateY(100%)';
  setTimeout(() => toast.remove(), 350);
}

function atualizarCompareButton() {
  elements.compareCount.textContent = store.comparacao.length;
  if (store.comparacao.length > 0) {
    elements.btnCompare.classList.remove('hidden');
  } else {
    elements.btnCompare.classList.add('hidden');
  }
}

function gerarInsightsComparacao() {
  if (store.comparacao.length < 2) return '';

  const insights = [];

  function encontrarMelhor(campo) {
    const valores = store.comparacao.map(p => extrairNumero(p[campo]));
    const maxVal = Math.max(...valores);
    if (maxVal <= 0) return null;
    const comMax = store.comparacao.filter((p, i) => valores[i] === maxVal);
    if (comMax.length === store.comparacao.length) return { empate: true, detail: comMax[0][campo] || '' };
    if (comMax.length > 1) return { empate: true, detail: comMax[0][campo] || '' };
    const idx = valores.indexOf(maxVal);
    return { produto: store.comparacao[idx], detail: store.comparacao[idx][campo] || '' };
  }

  function encontrarMelhorPreco() {
    const valores = store.comparacao.map(p => Number(p.preco)).filter(v => v > 0);
    if (!valores.length) return null;
    const minVal = Math.min(...valores);
    const comMin = store.comparacao.filter(p => Number(p.preco) === minVal);
    if (comMin.length === store.comparacao.length) return { empate: true, detail: formatarMoedaBRL(minVal) };
    if (comMin.length > 1) return { empate: true, detail: formatarMoedaBRL(minVal) };
    return { produto: comMin[0], detail: formatarMoedaBRL(minVal) };
  }

  const cameraFrontal = encontrarMelhor('camera_frontal');
  if (cameraFrontal) {
    if (cameraFrontal.empate) {
      insights.push({ icon: '🤳', label: 'Selfies', nome: 'Equivalente', detail: cameraFrontal.detail, isEmpate: true });
    } else {
      insights.push({ icon: '🤳', label: 'Melhor para selfies', nome: cameraFrontal.produto.nome, detail: cameraFrontal.detail });
    }
  }

  const cameraTraseira = encontrarMelhor('camera_traseira');
  if (cameraTraseira) {
    if (cameraTraseira.empate) {
      insights.push({ icon: '📸', label: 'Fotografias', nome: 'Equivalente', detail: cameraTraseira.detail, isEmpate: true });
    } else {
      insights.push({ icon: '📸', label: 'Melhor para fotografias', nome: cameraTraseira.produto.nome, detail: cameraTraseira.detail });
    }
  }

  const bateria = encontrarMelhor('bateria');
  if (bateria) {
    if (bateria.empate) {
      insights.push({ icon: '🔋', label: 'Bateria', nome: 'Equivalente', detail: bateria.detail, isEmpate: true });
    } else {
      insights.push({ icon: '🔋', label: 'Melhor bateria', nome: bateria.produto.nome, detail: bateria.detail });
    }
  }

  const ram = encontrarMelhor('ram');
  if (ram) {
    if (ram.empate) {
      insights.push({ icon: '⚡', label: 'Desempenho', nome: 'Equivalente', detail: ram.detail, isEmpate: true });
    } else {
      insights.push({ icon: '⚡', label: 'Melhor desempenho', nome: ram.produto.nome, detail: ram.detail });
    }
  }

  const storage = encontrarMelhor('armazenamento');
  if (storage) {
    if (storage.empate) {
      insights.push({ icon: '💾', label: 'Armazenamento', nome: 'Equivalente', detail: storage.detail, isEmpate: true });
    } else {
      insights.push({ icon: '💾', label: 'Maior armazenamento', nome: storage.produto.nome, detail: storage.detail });
    }
  }

  const preco = encontrarMelhorPreco();
  if (preco) {
    if (preco.empate) {
      insights.push({ icon: '💰', label: 'Preço', nome: 'Equivalente', detail: preco.detail, isEmpate: true });
    } else {
      insights.push({ icon: '💰', label: 'Melhor preço', nome: preco.produto.nome, detail: preco.detail });
    }
  }

  if (!insights.length) return '';

  let html = '<div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:12px; padding:20px; margin-bottom:24px;">';
  html += '<h4 style="font-size:16px; font-weight:700; color:#111827; margin:0 0 16px 0; display:flex; align-items:center; gap:8px;">🏆 Resumo Inteligente</h4>';
  html += '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px;">';

  insights.forEach(item => {
    const nameColor = item.isEmpate ? '#6b7280' : '#111827';
    const nameWeight = item.isEmpate ? '600' : '700';
    html += `<div style="background:white; border:1px solid #e5e7eb; border-radius:10px; padding:14px 16px; transition:box-shadow 0.2s ease;">
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
        <span style="font-size:20px; line-height:1;">${item.icon}</span>
        <span style="font-size:12px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:0.05em;">${item.label}</span>
      </div>
      <p style="font-size:14px; font-weight:${nameWeight}; color:${nameColor}; margin:0; line-height:1.4;">${item.nome}</p>
      <p style="font-size:12px; color:#9ca3af; margin:4px 0 0 0;">${item.detail}</p>
    </div>`;
  });

  html += '</div></div>';
  return html;
}

export function renderComparacao() {
  if (!store.comparacao.length) {
    elements.compareContent.innerHTML = `
      <div style="text-align:center;padding:40px 20px;">
        <p style="font-size:48px;margin-bottom:16px;">📊</p>
        <p style="color:#6b7280;font-size:15px;margin-bottom:24px;">Nenhum produto selecionado para comparação.</p>
        <button onclick="fecharCompareEVoltar()" style="background:#111827;color:white;border:none;border-radius:10px;padding:12px 28px;font-size:14px;font-weight:600;cursor:pointer;font-family:Inter,system-ui,sans-serif;transition:background 0.2s;"
          onmouseover="this.style.background='#374151'" onmouseout="this.style.background='#111827'">Escolher store.produtos</button>
      </div>`;
    return;
  }

  const slotsLeft = 3 - store.comparacao.length;
  let html = gerarInsightsComparacao();

  const specLabels = {
    nome: 'Nome',
    preco: 'Preço',
    armazenamento: 'Armazenamento',
    ram: 'RAM',
    camera_frontal: 'Câmera Frontal',
    camera_traseira: 'Câmera Traseira',
    bateria: 'Bateria',
    tela: 'Tela'
  };
  const specs = Object.keys(specLabels);

  const winners = {};
  specs.forEach(spec => {
    if (spec === 'nome') return;
    const valores = store.comparacao.map(p => {
      if (spec === 'preco') return Number(p.preco);
      return extrairNumero(p[spec]);
    });

    let bestVal, bestIdx;
    if (spec === 'preco') {
      bestVal = Math.min(...valores.filter(v => v > 0));
      if (!isFinite(bestVal)) return;
    } else {
      bestVal = Math.max(...valores);
      if (bestVal <= 0) return;
    }

    const comMelhor = valores.filter(v => v === bestVal);
    if (comMelhor.length > 1) return;

    bestIdx = valores.indexOf(bestVal);
    if (bestIdx >= 0) winners[spec] = bestIdx;
  });

  html += `
    <div style="display:flex; justify-content:flex-end; margin-bottom: 16px;">
      <button onclick="limparComparacao()" style="background:#fee2e2; color:#ef4444; padding:8px 16px; border-radius:8px; font-size:13px; font-weight:600; border:none; cursor:pointer; transition:all 0.2s; font-family:Inter,system-ui,sans-serif;" 
        onmouseover="this.style.background='#f87171';this.style.color='white';" onmouseout="this.style.background='#fee2e2';this.style.color='#ef4444';">
        <i class="fa-solid fa-trash-can" style="margin-right: 6px;"></i> Limpar Comparação
      </button>
    </div>
  `;

  html += '<div class="overflow-x-auto"><table style="width:100%; font-size:14px; border-collapse:separate; border-spacing:0; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden;">';
  html += '<thead><tr style="background:#f9fafb;">';
  html += '<th style="padding:12px 16px; text-align:left; font-size:12px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:0.05em; border-bottom:1px solid #e5e7eb;">Spec</th>';
  store.comparacao.forEach(p => {
    html += `<th style="padding:12px 16px; text-align:center; border-bottom:1px solid #e5e7eb; position:relative;">
      <button onclick="removerDaComparacao('${p.id}')" style="position:absolute;top:8px;right:8px;background:none;border:none;cursor:pointer;color:#9ca3af;font-size:16px;transition:color 0.2s;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#9ca3af'" title="Remover produto">✕</button>
      <img src="${p.imagem}" style="width:56px; height:56px; object-fit:contain; margin:0 auto 6px;" alt="${p.nome}">
      <div style="font-size:13px; font-weight:600; color:#111827;">${p.nome}</div>
    </th>`;
  });
  for (let s = 0; s < slotsLeft; s++) {
    html += `<th style="padding:12px 16px; text-align:center; border-bottom:1px solid #e5e7eb; vertical-align:middle;">
      <div onclick="fecharCompareEVoltar()" style="cursor:pointer;margin:0 auto;width:56px;height:56px;border-radius:12px;border:2px dashed #d1d5db;display:flex;align-items:center;justify-content:center;margin-bottom:6px;transition:border-color 0.2s;" onmouseover="this.style.borderColor='#9ca3af'" onmouseout="this.style.borderColor='#d1d5db'">
        <span style="font-size:24px;color:#9ca3af;">+</span>
      </div>
      <div style="font-size:12px;color:#9ca3af;font-weight:500;">Adicionar</div>
    </th>`;
  }
  html += '</tr></thead><tbody>';

  let rowIndex = 0;
  specs.forEach(spec => {
    if (spec === 'nome') return;
    const rowBg = rowIndex % 2 === 0 ? 'background:white;' : 'background:#fafafa;';
    html += `<tr style="${rowBg}">`;
    html += `<td style="padding:10px 16px; font-weight:600; color:#374151; font-size:13px; border-bottom:1px solid #f3f4f6;">${specLabels[spec]}</td>`;
    store.comparacao.forEach((produto, i) => {
      let value = produto[spec] || 'N/A';
      if (spec === 'preco') value = formatarMoedaBRL(Number(value));
      const isWinner = winners[spec] === i;
      const winnerStyle = isWinner ? 'color:#059669; font-weight:700;' : 'color:#374151;';
      const badge = isWinner ? ' <span style="display:inline-block; background:#ecfdf5; color:#059669; font-size:10px; font-weight:700; padding:1px 6px; border-radius:4px; margin-left:4px;">✓</span>' : '';
      html += `<td style="padding:10px 16px; text-align:center; border-bottom:1px solid #f3f4f6; font-size:13px; ${winnerStyle}">${value}${badge}</td>`;
    });
    for (let s = 0; s < slotsLeft; s++) {
      html += `<td style="padding:10px 16px; text-align:center; border-bottom:1px solid #f3f4f6; color:#d1d5db; font-size:13px;">—</td>`;
    }
    html += '</tr>';
    rowIndex++;
  });

  html += '<tr style="background:#f9fafb;">';
  html += '<td style="padding:14px 16px; font-weight:600; color:#374151; font-size:13px;">Ação</td>';
  store.comparacao.forEach(produto => {
    html += `<td style="padding:14px 16px; text-align:center;">
      <button style="background:#111827; color:white; padding:8px 20px; border-radius:8px; font-size:13px; font-weight:600; border:none; cursor:pointer; transition:background 0.2s;" 
        onmouseover="this.style.background='#374151'" onmouseout="this.style.background='#111827'"
        onclick="adicionarAoCarrinho('${produto.id}')">Eu Quero</button>
    </td>`;
  });
  for (let s = 0; s < slotsLeft; s++) {
    html += `<td style="padding:14px 16px; text-align:center;">
      <button onclick="fecharCompareEVoltar()" style="background:transparent; color:#6b7280; padding:8px 20px; border-radius:8px; font-size:13px; font-weight:600; border:1px solid #e5e7eb; cursor:pointer; transition:all 0.2s; font-family:Inter,system-ui,sans-serif;"
        onmouseover="this.style.background='#f3f4f6';this.style.borderColor='#d1d5db'" onmouseout="this.style.background='transparent';this.style.borderColor='#e5e7eb'">+ Adicionar</button>
    </td>`;
  }
  html += '</tr>';

  html += '</tbody></table></div>';
  elements.compareContent.innerHTML = html;
}

export function fecharCompareEVoltar() {
  elements.compareModal.classList.add('hidden');
  const pModal = document.getElementById('product-modal');
  if (pModal && !pModal.classList.contains('hidden')) {
    pModal.classList.add('hidden');
    document.body.style.overflow = '';
  }
  const grid = document.getElementById('products-grid');
  if (grid) {
    const headerOffset = 80;
    const pos = grid.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: pos - headerOffset, behavior: 'smooth' });
  }
}

function limparComparacao() {
  store.comparacao = [];
  atualizarCompareButton();
  filtrarProdutos();
  hideCompareToast();
  fecharCompareEVoltar();
}

function removerDaComparacao(produtoId) {
  const index = store.comparacao.findIndex(c => c.id === produtoId);
  if (index > -1) {
    store.comparacao.splice(index, 1);
    atualizarCompareButton();
    filtrarProdutos();

    if (store.comparacao.length > 0) {
      renderComparacao();
      updateCompareToast();
    } else {
      fecharCompareEVoltar();
      hideCompareToast();
    }
  }
}

// ===== Lógica do Modal de Produto =====
export function openProductModal(grupoId, productId) {
  store.modalVariacoes = store.produtos.filter(p => p.grupo_id === grupoId);
  if (!store.modalVariacoes.length) return;

  const mModal = document.getElementById('product-modal');
  mModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  const scrollArea = mModal.querySelector('.overflow-y-auto');
  if (scrollArea) scrollArea.scrollTop = 0;

  let baseVar = store.modalVariacoes[0];
  if (productId) {
    const clicked = store.modalVariacoes.find(v => v.id === productId);
    if (clicked) baseVar = clicked;
  }

  // Track product view event
  trackProductView(baseVar);

  store.selColor = baseVar.cor;
  store.selStorage = baseVar.armazenamento;
  store.selCondition = baseVar.condicao;

  const uColors = getUniqueValues(store.modalVariacoes, 'cor');
  const uStorages = getUniqueValues(store.modalVariacoes, 'armazenamento');
  const uConditions = getUniqueValues(store.modalVariacoes, 'condicao');

  const cDiv = document.getElementById('pm-color-section');
  const sDiv = document.getElementById('pm-storage-section');
  const condDiv = document.getElementById('pm-condition-section');

  cDiv.classList.toggle('hidden', uColors.length < 1);
  sDiv.classList.toggle('hidden', uStorages.length < 1);
  condDiv.classList.toggle('hidden', uConditions.length < 1);

  renderModalOptions('pm-colors', uColors, store.selColor, (val) => { store.selColor = val; updateModalSelection(); });
  renderModalOptions('pm-storages', uStorages, store.selStorage, (val) => { store.selStorage = val; updateModalSelection(); });
  renderModalOptions('pm-conditions', uConditions, store.selCondition, (val) => { store.selCondition = val; updateModalSelection(); });

  updateModalSelection();

  const oldBuy = document.getElementById('pm-buy-btn');
  const newBuy = oldBuy.cloneNode(true);
  oldBuy.parentNode.replaceChild(newBuy, oldBuy);
  newBuy.addEventListener('click', () => {
    if (store.currentTargetId) {
      adicionarAoCarrinho(store.currentTargetId);
      aplicarAnimacaoAdicao(newBuy);
    }
  });

  const oldCompare = document.getElementById('pm-compare-btn');
  const newCompare = oldCompare.cloneNode(true);
  oldCompare.parentNode.replaceChild(newCompare, oldCompare);
  newCompare.addEventListener('click', () => {
    if (store.currentTargetId) {
      toggleComparacao(store.currentTargetId);
      const isComp = store.comparacao.some(c => c.id === store.currentTargetId);
      newCompare.textContent = isComp ? '✓ Adicionado' : 'Comparar';
    }
  });

  const closeBtn = document.getElementById('close-product');
  closeBtn.onclick = () => {
    mModal.classList.add('hidden');
    document.body.style.overflow = '';
  };
}

function renderModalOptions(containerId, optionsList, selectedValue, onSelect, availableSet) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  optionsList.forEach(opt => {
    const btn = document.createElement('button');
    const isAvailable = !availableSet || availableSet.has(opt);
    const isSelected = opt === selectedValue;

    if (isAvailable) {
      btn.textContent = opt;
      btn.className = `px-4 py-2 border rounded-md text-sm font-medium transition ${isSelected ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'}`;
    } else {
      btn.innerHTML = `<span class="opacity-60">${opt}</span> <span class="text-[10px] ml-0.5 opacity-40">✕</span>`;
      btn.className = 'px-4 py-2 border border-dashed border-gray-200 rounded-md text-sm font-medium bg-gray-50 text-gray-400 hover:border-gray-300 hover:bg-gray-100 transition';
      btn.title = `${opt} — clique para trocar`;
    }
    btn.onclick = () => onSelect(opt);
    container.appendChild(btn);
  });
}

function getAvailableForKey(key, otherFilters) {
  const available = new Set();
  store.modalVariacoes.forEach(v => {
    let matches = true;
    for (const [fKey, fVal] of Object.entries(otherFilters)) {
      if (fVal && v[fKey] !== fVal) {
        matches = false;
        break;
      }
    }
    if (matches && v[key]) available.add(v[key]);
  });
  return available;
}

function updateModalSelection() {
  const uColors = getUniqueValues(store.modalVariacoes, 'cor');
  const uStorages = getUniqueValues(store.modalVariacoes, 'armazenamento');
  const uConditions = getUniqueValues(store.modalVariacoes, 'condicao');

  const availColors = new Set(uColors);
  const availStorages = getAvailableForKey('armazenamento', { cor: store.selColor });

  if (store.selStorage && availStorages.size > 0 && !availStorages.has(store.selStorage)) {
    store.selStorage = [...availStorages][0];
  }

  const availConditions = getAvailableForKey('condicao', { cor: store.selColor, armazenamento: store.selStorage });

  if (store.selCondition && availConditions.size > 0 && !availConditions.has(store.selCondition)) {
    store.selCondition = [...availConditions][0];
  }

  const match = store.modalVariacoes.find(v =>
    (v.cor === store.selColor || (!v.cor && !store.selColor)) &&
    (v.armazenamento === store.selStorage || (!v.armazenamento && !store.selStorage)) &&
    (v.condicao === store.selCondition || (!v.condicao && !store.selCondition))
  );

  document.getElementById('pm-color-lbl').textContent = store.selColor || '';

  renderModalOptions('pm-colors', uColors, store.selColor, (val) => { store.selColor = val; updateModalSelection(); }, availColors);
  renderModalOptions('pm-storages', uStorages, store.selStorage, (val) => { store.selStorage = val; updateModalSelection(); }, availStorages);
  renderModalOptions('pm-conditions', uConditions, store.selCondition, (val) => { store.selCondition = val; updateModalSelection(); }, availConditions);

  document.getElementById('pm-color-section').classList.toggle('hidden', uColors.length < 1);
  document.getElementById('pm-storage-section').classList.toggle('hidden', uStorages.length < 1);
  document.getElementById('pm-condition-section').classList.toggle('hidden', uConditions.length < 1);

  const btnBuy = document.getElementById('pm-buy-btn');
  const btnComp = document.getElementById('pm-compare-btn');
  const statusMsg = document.getElementById('pm-status-msg');

  if (match) {
    const isActive = match.ativo === true || String(match.ativo).toLowerCase() === 'true';
    const emEstoque = Number(match.estoque) > 0 && isActive;
    const isOnlyOne = emEstoque && Number(match.estoque) === 1;
    const minMatch = Number(match.estoque_minimo) || 2;
    const isPoucas = emEstoque && Number(match.estoque) > 1 && Number(match.estoque) <= minMatch;

    store.currentTargetId = match.id;
    document.getElementById('pm-image').src = match.imagem;
    document.getElementById('pm-name').textContent = match.categoria ? `${match.categoria} - ${match.nome}` : match.nome;
    document.getElementById('pm-desc').textContent = match.descricao || '';
    document.getElementById('pm-price').textContent = formatarMoedaBRL(Number(match.preco));
    document.getElementById('pm-old-price').textContent = formatarMoedaBRL(Number(match.preco) + 250);

    if (emEstoque) {
      btnBuy.disabled = false;
      btnBuy.classList.remove('opacity-50', 'cursor-not-allowed');
      btnComp.disabled = false;
      btnComp.classList.remove('opacity-50', 'cursor-not-allowed');

      if (isOnlyOne) {
        statusMsg.innerHTML = '<span class="inline-block bg-orange-100 text-orange-800 px-3 py-1 rounded-md text-sm font-bold border border-orange-200"><i class="fa-solid fa-fire text-orange-500 mr-1"></i> Apenas 1 unidade! Corra!</span>';
        statusMsg.classList.remove('hidden');
      } else if (isPoucas) {
        statusMsg.innerHTML = '<span class="inline-block bg-yellow-100 text-yellow-800 px-3 py-1 rounded-md text-sm font-bold border border-yellow-200"><i class="fa-solid fa-clock text-yellow-600 mr-1"></i> Poucas unidades restantes</span>';
        statusMsg.classList.remove('hidden');
      } else {
        statusMsg.classList.add('hidden');
      }

      const isComp = store.comparacao.some(c => c.id === store.currentTargetId);
      btnComp.textContent = isComp ? '✓ Adicionado' : 'Comparar';
    } else {
      btnBuy.disabled = true;
      btnBuy.classList.add('opacity-50', 'cursor-not-allowed');
      btnComp.disabled = true;
      btnComp.classList.add('opacity-50', 'cursor-not-allowed');
      if (!isActive) {
        statusMsg.innerHTML = '<span class="inline-block bg-gray-100 text-gray-700 px-3 py-1 rounded-md text-sm font-bold border border-gray-200"><i class="fa-solid fa-ban mr-1"></i> Indisponível</span>';
      } else {
        statusMsg.innerHTML = '<span class="inline-block bg-red-100 text-red-800 px-3 py-1 rounded-md text-sm font-bold border border-red-200"><i class="fa-solid fa-xmark mr-1"></i> Esgotado</span>';
      }
      statusMsg.classList.remove('hidden');
      btnComp.textContent = 'Indisponível';
    }
  } else {
    store.currentTargetId = '';
    btnBuy.disabled = true;
    btnBuy.classList.add('opacity-50', 'cursor-not-allowed');
    btnComp.disabled = true;
    btnComp.classList.add('opacity-50', 'cursor-not-allowed');
    statusMsg.innerHTML = 'Opção não disponível';
    statusMsg.classList.remove('hidden');
    btnComp.textContent = 'Comparar';

    if (store.modalVariacoes[0]) {
      document.getElementById('pm-image').src = store.modalVariacoes[0].imagem;
      document.getElementById('pm-name').textContent = store.modalVariacoes[0].nome;
      document.getElementById('pm-price').textContent = '----------';
      document.getElementById('pm-old-price').textContent = '';
    }
  }
}

// Expor globalmente p/ botões <button onclick="...">
window.toggleComparacao = toggleComparacao;
window.renderComparacao = renderComparacao;
window.fecharCompareEVoltar = fecharCompareEVoltar;
window.limparComparacao = limparComparacao;
window.removerDaComparacao = removerDaComparacao;
window.adicionarAoCarrinho = adicionarAoCarrinho;

