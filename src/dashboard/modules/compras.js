import { CONFIG } from '../../shared/config.js';
import { formatMoney, showToast, compressImage } from './ui.js';
import { uploadImageToDrive, loadDashboardData } from './store.js';

let comprasData = [];
let loading = false;

// Estado do modal Chegou
let selectedEncomendadoId = null;
let loteChegouQueue = [];
let loteChegouIndex = 0;
let isLoteFlow = false;

export async function initAndRender() {
  const container = document.getElementById('tab-encomendados');
  if (!container) return;

  // Renderiza esqueleto inicial
  container.innerHTML = `
      <div id="encomendados-header" class="flex flex-col gap-4 mb-6">
        <div class="flex items-center justify-between w-full">
          <h2 class="text-xl font-bold text-gray-800"><i class="fa-solid fa-truck-fast text-indigo-500 mr-2"></i> Lotes & Encomendas</h2>
          <button id="btn-add-encomendado-mobile" class="md:hidden px-3 py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs hover:bg-indigo-700 transition shrink-0 flex items-center gap-1">
            <i class="fa-solid fa-plus"></i> Novo Lote
          </button>
        </div>
        
        <div class="flex flex-col sm:flex-row items-center gap-3 w-full">
          <div class="relative w-full sm:flex-1 md:w-64">
            <i class="fa-solid fa-search absolute left-3 top-2.5 text-gray-400"></i>
            <input type="text" id="enc-search-input" class="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Buscar modelo ou fornecedor...">
          </div>
          <div class="flex items-center gap-2 w-full sm:w-auto">
            <select id="enc-status-filter" class="flex-1 sm:w-40 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
              <option value="todos">Status: Todos</option>
              <option value="pendentes" selected>Pendentes</option>
              <option value="atrasados">Atrasados</option>
            </select>
            <select id="enc-prazo-filter" class="flex-1 sm:w-40 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
              <option value="todos" selected>Prazo: Todos</option>
              <option value="hoje">Hoje</option>
              <option value="dias3">Próximos 3 dias</option>
              <option value="dias7">Próximos 7 dias</option>
              <option value="dias15">Próximos 15 dias</option>
              <option value="atrasados">Atrasados</option>
            </select>
          </div>
          <button id="btn-add-encomendado" class="hidden md:flex px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition shrink-0 items-center gap-1">
            <i class="fa-solid fa-plus mr-1"></i> Novo Lote
          </button>
        </div>
      </div>
      
      <!-- Active Filter Indicator -->
      <div id="enc-active-filter-indicator" class="hidden mb-4 flex flex-wrap items-center justify-between bg-indigo-50 text-indigo-700 px-4 py-2.5 rounded-xl text-xs font-medium border border-indigo-100">
        <div class="flex items-center gap-2"><i class="fa-solid fa-filter"></i> <span id="enc-active-filter-text"></span></div>
        <button id="btn-clear-prazo-filter" class="font-bold hover:underline text-indigo-800">Limpar filtro</button>
      </div>
      
      <!-- Metrics Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6" id="enc-metrics">
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 animate-pulse h-24"></div>
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 animate-pulse h-24"></div>
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 animate-pulse h-24"></div>
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 animate-pulse h-24"></div>
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 animate-pulse h-24"></div>
      </div>

      <!-- Arrival Summary -->
      <div id="enc-arrival-summary" class="mb-6 hidden"></div>

      <!-- Table -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse" id="enc-table">
            <thead class="hidden md:table-header-group">
              <tr class="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th class="p-4">Lote / Fornecedor</th>
                <th class="p-4">Datas</th>
                <th class="p-4">Itens Totais</th>
                <th class="p-4">Valor do lote</th>
                <th class="p-4">Status do Lote</th>
                <th class="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody class="text-sm divide-y divide-gray-100" id="enc-tbody">
              <tr><td colspan="6" class="p-8 text-center text-gray-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Carregando encomendas...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modals Container -->
      <div id="enc-modals-container"></div>
    `;

  const btnAdd = document.getElementById('btn-add-encomendado');
  const btnAddMob = document.getElementById('btn-add-encomendado-mobile');
  if (btnAdd) btnAdd.addEventListener('click', abrirModalCadastroCompra);
  if (btnAddMob) btnAddMob.addEventListener('click', abrirModalCadastroCompra);
  document.getElementById('enc-search-input').addEventListener('input', renderTable);
  document.getElementById('enc-status-filter').addEventListener('change', renderTable);
  document.getElementById('enc-prazo-filter').addEventListener('change', () => {
    renderMetrics();
    renderTable();
  });
  document.getElementById('btn-clear-prazo-filter').addEventListener('click', () => {
    document.getElementById('enc-prazo-filter').value = 'todos';
    renderMetrics();
    renderTable();
  });
  renderModals();

  await fetchData();
}

async function fetchData() {
  try {
    loading = true;
    updateLoadingState();

    const response = await fetch(`${CONFIG.apiBaseUrl}?action=encomendados`);
    const result = await response.json();

    if (result.ok) {
      comprasData = result.data || [];
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Erro ao buscar encomendas:', error);
    showToast('Erro ao carregar encomendas', 'red', 'fa-xmark');
  } finally {
    loading = false;
    renderMetrics();
    renderTable();
  }
}

function updateLoadingState() {
  if (loading) {
    const tbody = document.getElementById('enc-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-gray-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Carregando encomendas...</td></tr>';
  }
}

function renderMetrics() {
  const container = document.getElementById('enc-metrics');
  if (!container) return;

  let totalCustoReal = 0;
  let lucroEstimado = 0;
  let countAparelhos = 0;
  let somaPrecoVenda = 0;

  const lotesUnique = new Set();

  const lotesMap = {};
  comprasData.forEach(e => {
    const lid = e.lote_id || e.id;
    if (!lotesMap[lid]) {
      lotesMap[lid] = {
        frete: Number(e.custo_frete) || 0,
        taxas: Number(e.custo_taxas) || 0,
        adicLote: Number(e.custo_adicional_lote) || 0,
        items: []
      };
    }
    lotesMap[lid].items.push(e);
  });

  Object.values(lotesMap).forEach(lote => {
    const loteTotalCustosExtra = lote.frete + lote.taxas + lote.adicLote;
    const rateio = lote.items.length > 0 ? loteTotalCustosExtra / lote.items.length : 0;

    lote.items.forEach(i => {
      // ONLY CONSIDER pending items that match the prazo filter for metrics
      if (i.status !== 'encomendado') return;
      if (!itemMatchesPrazoFilter(i)) return;

      const lid = i.lote_id || `SINGLE-${i.id}`;
      lotesUnique.add(lid);

      const custoItem = Number(i.custo_compra) || 0;
      const custoAdicItem = Number(i.custo_adicional) || 0;
      const itemFallback = Number(i.custo_total) || 0;

      const custoBase = (custoItem === 0 && itemFallback > 0) ? itemFallback : (custoItem + custoAdicItem);
      const custoReal = custoBase + rateio;

      totalCustoReal += custoReal;

      const precoVenda = Number(i.preco_venda_previsto) || 0;
      if (precoVenda > 0) {
        somaPrecoVenda += precoVenda;
        lucroEstimado += (precoVenda - custoReal);
      }
      countAparelhos++;
    });
  });

  const qtdAparelhos = countAparelhos;
  const qtdLotes = lotesUnique.size;

  const roi = totalCustoReal > 0 ? (lucroEstimado / totalCustoReal) * 100 : 0;
  const ticketMedio = somaPrecoVenda > 0 && countAparelhos > 0 ? somaPrecoVenda / countAparelhos : 0;

  container.innerHTML = `
    <div class="bg-gradient-to-br from-indigo-50 to-white p-4 rounded-xl shadow-sm border border-indigo-100 flex flex-col justify-center">
      <span class="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Patrimônio em Trânsito</span>
      <span class="text-xl font-black text-indigo-700">${formatMoney(totalCustoReal)}</span>
    </div>
    <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
      <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Aparelhos Pendentes</span>
      <div class="flex items-end gap-2">
        <span class="text-xl font-black text-gray-800">${qtdAparelhos}</span>
        <span class="text-xs font-bold text-gray-400 mb-1">aparelhos (${qtdLotes} lotes)</span>
      </div>
    </div>
    <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
      <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Ticket Médio Esperado</span>
      <span class="text-xl font-black text-gray-800">${formatMoney(ticketMedio)}</span>
    </div>
    <div class="bg-emerald-50 p-4 rounded-xl shadow-sm border border-emerald-100 flex flex-col justify-center">
      <span class="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1">Lucro Estimado Total</span>
      <span class="text-xl font-black text-emerald-700">${formatMoney(lucroEstimado)}</span>
    </div>
    <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
      <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">ROI Estimado</span>
      <span class="text-xl font-black text-gray-800">${roi.toFixed(1)}%</span>
    </div>
  `;
}

function formatDateBr(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
  return d.toLocaleDateString('pt-BR');
}

function getRelativeDateBadge(dateString, isFullyReceived) {
  if (!dateString || isFullyReceived) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
  d.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = d.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `<span class="px-1.5 py-0.5 bg-red-50 text-red-600 rounded text-[9px] font-bold tracking-wider uppercase whitespace-nowrap border border-red-100">Atrasado ${Math.abs(diffDays)}d</span>`;
  } else if (diffDays === 0) {
    return `<span class="px-1.5 py-0.5 bg-green-50 text-green-700 rounded text-[9px] font-bold tracking-wider uppercase whitespace-nowrap border border-green-100">Chega hoje</span>`;
  } else if (diffDays <= 7) {
    return `<span class="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[9px] font-bold tracking-wider uppercase whitespace-nowrap border border-blue-100">Em ${diffDays}d</span>`;
  } else {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `<span class="px-1.5 py-0.5 bg-gray-50 text-gray-500 rounded text-[9px] font-bold tracking-wider uppercase whitespace-nowrap border border-gray-200">${dd}/${mm}</span>`;
  }
}

function itemMatchesPrazoFilter(item) {
  const prazoFilter = document.getElementById('enc-prazo-filter');
  const prazoValue = prazoFilter ? prazoFilter.value : 'todos';
  if (prazoValue === 'todos') return true;

  if (item.status === 'recebido' || item.status === 'chegou') return false;

  const pDateStr = item.previsao_chegada;
  if (!pDateStr) return false;

  const d = new Date(pDateStr);
  if (isNaN(d.getTime())) return false;
  d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
  d.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = d.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (prazoValue === 'hoje') return diffDays === 0;
  if (prazoValue === 'dias3') return diffDays >= 0 && diffDays <= 3;
  if (prazoValue === 'dias7') return diffDays >= 0 && diffDays <= 7;
  if (prazoValue === 'dias15') return diffDays >= 0 && diffDays <= 15;
  if (prazoValue === 'atrasados') return diffDays < 0;

  return true;
}

function renderTable() {
  const tbody = document.getElementById('enc-tbody');
  if (!tbody) return;

  const searchInput = document.getElementById('enc-search-input');
  const search = searchInput ? searchInput.value.toLowerCase() : '';
  const statusFilter = document.getElementById('enc-status-filter');
  const filter = statusFilter ? statusFilter.value : 'pendentes';

  // Prazo filter active indicator
  const prazoFilter = document.getElementById('enc-prazo-filter');
  const prazoValue = prazoFilter ? prazoFilter.value : 'todos';
  const indicator = document.getElementById('enc-active-filter-indicator');
  const indicatorText = document.getElementById('enc-active-filter-text');

  if (prazoValue !== 'todos' && indicator) {
    const labels = {
      'hoje': 'Hoje',
      'dias3': 'Próximos 3 dias',
      'dias7': 'Próximos 7 dias',
      'dias15': 'Próximos 15 dias',
      'atrasados': 'Atrasados'
    };
    indicatorText.textContent = `Filtrando prazo por: ${labels[prazoValue]}`;
    indicator.classList.remove('hidden');
    indicator.classList.add('flex');
  } else if (indicator) {
    indicator.classList.add('hidden');
    indicator.classList.remove('flex');
  }

  const lotesMap = {};
  comprasData.forEach(e => {
    const lid = e.lote_id || `SINGLE-${e.id}`;
    if (!lotesMap[lid]) lotesMap[lid] = { items: [], loteData: e, totalItemsInLote: 0 };
    lotesMap[lid].totalItemsInLote++;

    if (itemMatchesPrazoFilter(e)) {
      lotesMap[lid].items.push(e);
    }
  });

  const activeLotes = Object.values(lotesMap).filter(lote => {
    if (lote.items.length === 0) return false;

    const hasPendente = lote.items.some(i => i.status === 'encomendado');
    const isAtrasado = lote.loteData.previsao_chegada && new Date(lote.loteData.previsao_chegada) < new Date(new Date().setHours(0, 0, 0, 0));

    if (filter === 'pendentes' && !hasPendente) return false;
    if (filter === 'atrasados' && (!hasPendente || !isAtrasado)) return false;

    if (search) {
      const matchFornecedor = String(lote.loteData.fornecedor || '').toLowerCase().includes(search);
      const matchModelo = lote.items.some(i => String(i.modelo || '').toLowerCase().includes(search));
      if (!matchFornecedor && !matchModelo) return false;
    }
    return true;
  });

  // Calculate next arrival summary
  const pendingLotes = Object.values(lotesMap).filter(l => l.items.some(i => i.status === 'encomendado'));

  let nextArrivalLotes = [];
  let minDate = null;
  let overdueLotesCount = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  pendingLotes.forEach(loteGroup => {
    const pDateStr = loteGroup.loteData.previsao_chegada;
    if (!pDateStr) return;

    const pDate = new Date(pDateStr);
    pDate.setMinutes(pDate.getMinutes() + pDate.getTimezoneOffset());
    pDate.setHours(0, 0, 0, 0);

    if (pDate < today) {
      overdueLotesCount++;
    } else {
      if (!minDate || pDate < minDate) {
        minDate = pDate;
        nextArrivalLotes = [loteGroup];
      } else if (pDate.getTime() === minDate.getTime()) {
        nextArrivalLotes.push(loteGroup);
      }
    }
  });

  const summaryContainer = document.getElementById('enc-arrival-summary');
  if (summaryContainer) {
    if (nextArrivalLotes.length > 0 || overdueLotesCount > 0) {
      let nextStr = '';
      if (nextArrivalLotes.length > 0) {
        const totalItems = nextArrivalLotes.reduce((sum, l) => sum + l.items.filter(i => i.status === 'encomendado').length, 0);
        const fornecedores = Array.from(new Set(nextArrivalLotes.map(l => l.loteData.fornecedor || 'Desconhecido'))).join(', ');

        let fornecedorText = nextArrivalLotes.length === 1 ? fornecedores : `${nextArrivalLotes.length} lotes`;

        nextStr = `Próxima chegada: <span class="font-bold text-gray-800">${formatDateBr(nextArrivalLotes[0].loteData.previsao_chegada)}</span> &middot; ${totalItems} aparelho${totalItems !== 1 ? 's' : ''} &middot; <span class="font-medium text-gray-700">${fornecedorText}</span>`;
      }

      let overdueStr = '';
      if (overdueLotesCount > 0) {
        overdueStr = `<span class="text-red-500 font-bold md:ml-auto flex items-center gap-1.5"><i class="fa-solid fa-circle-exclamation"></i> ${overdueLotesCount} atrasado${overdueLotesCount !== 1 ? 's' : ''}</span>`;
      }

      summaryContainer.innerHTML = `
        <div class="flex flex-wrap md:flex-nowrap items-center gap-3 px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs text-gray-500 shadow-sm">
          ${nextStr ? `<i class="fa-solid fa-truck-fast text-indigo-400 text-sm"></i> <div>${nextStr}</div>` : ''}
          ${overdueStr}
        </div>
      `;
      summaryContainer.classList.remove('hidden');
    } else {
      summaryContainer.classList.add('hidden');
    }
  }

  if (activeLotes.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="p-12 text-center">
          <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <i class="fa-solid fa-box-open text-2xl text-gray-300"></i>
          </div>
          <p class="text-gray-500 font-medium">Nenhum lote ou encomenda em andamento.</p>
        </td>
      </tr>
    `;
    return;
  }

  window.toggleLote = function (loteId) {
    const el = document.getElementById(`lote-items-${loteId}`);
    const icon = document.getElementById(`lote-icon-${loteId}`);
    const iconInline = document.getElementById(`lote-icon-inline-${loteId}`);
    const text = document.getElementById(`toggle-text-${loteId}`);

    if (el) {
      el.classList.toggle('hidden');
      const isHidden = el.classList.contains('hidden');

      if (isHidden) {
        if (icon) { icon.classList.remove('fa-chevron-up'); icon.classList.add('fa-chevron-down'); }
        if (iconInline) { iconInline.classList.remove('fa-chevron-up'); iconInline.classList.add('fa-chevron-down'); }
        if (text) text.textContent = 'Ver itens';
      } else {
        if (icon) { icon.classList.remove('fa-chevron-down'); icon.classList.add('fa-chevron-up'); }
        if (iconInline) { iconInline.classList.remove('fa-chevron-down'); iconInline.classList.add('fa-chevron-up'); }
        if (text) text.textContent = 'Recolher';
      }
    }
  };

  window.toggleActionMenu = function (event, lid) {
    event.stopPropagation();
    const btn = event.currentTarget;

    let menu = document.getElementById('global-action-menu');
    if (!menu) {
      menu = document.createElement('div');
      menu.id = 'global-action-menu';
      menu.className = 'fixed hidden w-40 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-[9999] text-left animate-in fade-in zoom-in duration-100';
      document.body.appendChild(menu);
    }

    const isSame = menu.dataset.currentLid === lid;
    const isHidden = menu.classList.contains('hidden');

    if (isSame && !isHidden) {
      menu.classList.add('hidden');
      return;
    }

    menu.innerHTML = `
      <button onclick="window.abrirModalEdicaoLote('${lid}')" class="w-full px-4 py-2.5 text-[11px] font-bold text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2 transition">
        <i class="fa-solid fa-pen-to-square text-indigo-400"></i> Editar Lote
      </button>
      <div class="h-px bg-gray-100 my-1 mx-2"></div>
      <button onclick="window.excluirEncomendado('${lid}', true)" class="w-full px-4 py-2.5 text-[11px] font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 transition">
        <i class="fa-solid fa-trash-can opacity-70"></i> Excluir Lote
      </button>
    `;
    menu.dataset.currentLid = lid;

    const rect = btn.getBoundingClientRect();
    const menuWidth = 160; // w-40
    menu.style.top = `${rect.bottom + 8}px`;
    menu.style.left = `${rect.right - menuWidth}px`;

    menu.classList.remove('hidden');
  };

  if (!window.actionMenuHandlerAdded) {
    document.addEventListener('click', () => {
      const menu = document.getElementById('global-action-menu');
      if (menu) menu.classList.add('hidden');
    });
    window.addEventListener('scroll', () => {
      const menu = document.getElementById('global-action-menu');
      if (menu) menu.classList.add('hidden');
    }, true);
    window.actionMenuHandlerAdded = true;
  }

  tbody.innerHTML = activeLotes.map(loteGroup => {
    const lote = loteGroup.loteData;
    const items = loteGroup.items;
    const lid = lote.lote_id || lote.id;
    const isAtrasado = lote.previsao_chegada && new Date(lote.previsao_chegada) < new Date(new Date().setHours(0, 0, 0, 0));

    const loteTotalCustosExtra = (Number(lote.custo_frete) || 0) + (Number(lote.custo_taxas) || 0) + (Number(lote.custo_adicional_lote) || 0);
    const rateio = lote.totalItemsInLote > 0 ? loteTotalCustosExtra / lote.totalItemsInLote : 0;

    let pendingCount = 0;
    let arrivedCount = 0;
    let totalLoteValue = 0;

    items.forEach(i => {
      if (i.status === 'chegou' || i.status === 'recebido') arrivedCount++;
      else pendingCount++;

      const custoItemBase = (Number(i.custo_compra) || 0) + (Number(i.custo_adicional) || 0) || Number(i.custo_total) || 0;
      totalLoteValue += (custoItemBase + rateio);
    });

    let statusBadge = '';
    if (arrivedCount === 0) statusBadge = `<span class="px-2 py-1 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded uppercase tracking-wider">A Caminho</span>`;
    else if (arrivedCount < items.length) statusBadge = `<span class="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase tracking-wider">Parcial (${arrivedCount}/${items.length})</span>`;
    else statusBadge = `<span class="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase tracking-wider">Recebido</span>`;

    let html = `
      <tr class="flex flex-col md:table-row hover:bg-gray-50/80 transition cursor-pointer border-t-[3px] border-gray-200 p-4 md:p-0" onclick="window.toggleLote('${lid}')">
        <td class="p-0 md:p-4 block md:table-cell">
          <div class="text-base font-black text-gray-900 flex items-center gap-2">
            <i id="lote-icon-${lid}" class="fa-solid fa-chevron-down text-gray-400 text-xs"></i> 
            ${lote.fornecedor || 'Desconhecido'}
          </div>
          <div class="text-[10px] text-gray-400 font-medium uppercase mt-1 tracking-wider">ID: ${String(lid).substring(0, 8)} • Compra: ${formatDateBr(lote.data_compra)}</div>
        </td>
        <td class="pt-2 md:p-4 block md:table-cell">
          <span class="md:hidden text-[10px] font-bold text-gray-400 uppercase mr-1">Datas:</span>
          <div class="inline-block md:block text-xs text-gray-500 mb-0.5">
            <span class="font-medium text-gray-400">Compra:</span> ${formatDateBr(lote.data_compra)}
          </div>
          <div class="inline-flex md:flex items-center gap-1.5 text-xs text-gray-700 mt-1 md:mt-0">
            <span class="font-medium text-gray-400">Chegada:</span> ${formatDateBr(lote.previsao_chegada)}
            ${getRelativeDateBadge(lote.previsao_chegada, arrivedCount === items.length)}
          </div>
        </td>
        <td class="py-1 md:p-4 block md:table-cell">
          <span class="md:hidden text-[10px] font-bold text-gray-400 uppercase mr-1">Itens:</span>
          <div class="inline-block md:block text-sm font-bold text-gray-800">${items.length}</div>
          <div class="hidden md:block text-xs text-gray-500">${pendingCount} pendentes</div>
        </td>
        <td class="py-1 md:p-4 block md:table-cell">
          <span class="md:hidden text-[10px] font-bold text-gray-400 uppercase mr-1">Custo Total:</span>
          <div class="inline-block md:block text-sm font-bold text-gray-900">${formatMoney(totalLoteValue)}</div>
        </td>
        <td class="py-1 md:p-4 block md:table-cell">
          <span class="md:hidden text-[10px] font-bold text-gray-400 uppercase mr-1">Status:</span>
          <div class="inline-block md:block">${statusBadge}</div>
        </td>
        <td class="py-2 md:py-4 px-4 block md:table-cell" onclick="event.stopPropagation()">
          <div class="flex flex-wrap md:flex-nowrap justify-start md:justify-center items-center gap-4 md:gap-6">
            <!-- Primary Action -->
            <button onclick="window.abrirLoteChegou('${lid}')" class="flex-1 md:flex-none px-4 py-2.5 bg-gray-700 hover:bg-gray-800 text-white text-[11px] font-bold rounded-lg shadow-sm transition flex items-center justify-center gap-2 whitespace-nowrap">
              <i class="fa-solid fa-boxes-stacked"></i> <span>Receber</span>
            </button>

            <!-- Secondary Navigation -->
            <button onclick="window.toggleLote('${lid}')" class="flex-1 md:flex-none text-indigo-600 hover:text-indigo-800 text-[11px] font-bold flex items-center justify-center gap-1 transition whitespace-nowrap">
              <span id="toggle-text-${lid}">Ver itens</span>
              <i id="lote-icon-inline-${lid}" class="fa-solid fa-chevron-down text-[10px]"></i>
            </button>

            <!-- Contextual Menu -->
            <div class="relative ml-auto md:ml-0">
              <button class="w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 md:bg-transparent hover:bg-gray-100 text-gray-400 transition border border-gray-100 md:border-none" onclick="window.toggleActionMenu(event, '${lid}')">
                <i class="fa-solid fa-ellipsis-vertical"></i>
              </button>
            </div>
          </div>
        </td>
      </tr>
      <tr id="lote-items-${lid}" class="hidden bg-gray-50 border-b border-gray-200">
        <td colspan="6" class="p-0 md:p-4">
          <div class="p-2 md:pl-8 border-l-4 border-indigo-500">
            <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
              <table class="w-full text-left">
                <thead class="hidden md:table-header-group bg-gray-100 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase">
                  <tr>
                    <th class="p-2 pl-4">Aparelho</th>
                    <th class="p-2">Características</th>
                    <th class="p-2">Custo Unitário</th>
                    <th class="p-2">Status</th>
                    <th class="p-2 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 text-xs">
    `;

    items.forEach(i => {
      const custoItemBase = (Number(i.custo_compra) || 0) + (Number(i.custo_adicional) || 0) || Number(i.custo_total) || 0;
      const custoItemReal = custoItemBase + rateio;
      const isChegou = i.status === 'chegou' || i.status === 'recebido';

      // Hide received items if filter is 'pendentes'
      if (isChegou && filter === 'pendentes') return;

      html += `
        <tr class="flex flex-col md:table-row ${isChegou ? 'opacity-60 bg-gray-50' : ''} p-3 md:p-0">
          <td class="p-0 md:p-2 md:pl-4 block md:table-cell">
            <div class="font-bold text-gray-900">${i.modelo || '-'}</div>
            <div class="text-[10px] text-gray-500">${i.versao || ''} - ${i.condicao || ''}</div>
          </td>
          <td class="py-1 md:p-2 block md:table-cell">
            <span class="md:hidden text-[9px] font-bold text-gray-400 uppercase mr-1">Config:</span>
            <span class="font-medium">${i.memoria || '-'}</span>, ${i.cor || '-'}
          </td>
          <td class="py-1 md:p-2 block md:table-cell">
            <span class="md:hidden text-[9px] font-bold text-gray-400 uppercase mr-1">Custo:</span>
            <div class="inline-block md:block font-bold text-gray-900">${formatMoney(custoItemReal)}</div>
            <div class="hidden md:block text-[9px] text-gray-400 font-medium">Base: ${formatMoney(custoItemBase)}</div>
          </td>
          <td class="py-1 md:p-2 block md:table-cell">
            <span class="md:hidden text-[9px] font-bold text-gray-400 uppercase mr-1">Status:</span>
             <div class="inline-block md:block">${isChegou ? '<span class="text-green-600 font-bold"><i class="fa-solid fa-check mr-1"></i>Recebido</span>' : '<span class="text-yellow-600 font-bold"><i class="fa-solid fa-clock mr-1"></i>Pendente</span>'}</div>
          </td>
          <td class="py-2 px-4 block md:table-cell text-center">
            <div class="flex flex-wrap md:flex-nowrap justify-start md:justify-center gap-2">
              ${isChegou ? '-' : `
                <button onclick="window.encomendadosChegou('${i.id}')" class="px-3 py-2 md:px-2 md:py-1 bg-green-500 hover:bg-green-600 text-white text-[10px] font-bold rounded-lg shadow-sm transition flex items-center gap-1>
                  <i class="fa-solid fa-check"></i> <span class="md:hidden">Chegou</span>
                </button>
                <button onclick="window.abrirModalEdicaoLote('${lid}', '${i.id}')" class="px-3 py-2 md:px-2 md:py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg shadow-sm transition flex items-center gap-1 border border-indigo-100 md:border-none" title="Editar Aparelho">
                  <i class="fa-solid fa-pen-to-square"></i> <span class="md:hidden">Editar</span>
                </button>
                <button onclick="window.excluirEncomendado('${i.id}', false)" class="w-10 h-10 md:w-6 md:h-6 flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition shadow-sm md:shadow-none" title="Excluir Item">
                  <i class="fa-solid fa-trash-can text-[10px]"></i>
                </button>
              `}
            </div>
          </td>
        </tr>
      `;
    });

    html += `
              </tbody>
            </table>
          </div>
        </td>
      </tr>
    `;

    return html;
  }).join('');
}

// ==========================================
// MODALS HTML & LOGIC
// ==========================================

let itemCounter = 0;

function renderModals() {
  const container = document.getElementById('enc-modals-container');
  if (!container) return;

  container.innerHTML = `
    <!-- Modal Cadastro Lote Encomenda -->
    <div id="modal-add-enc" class="fixed inset-0 bg-gray-900/50 backdrop-blur-sm hidden items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden">
        <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl shrink-0">
          <h3 class="text-lg font-bold text-gray-900"><i class="fa-solid fa-truck-fast text-indigo-500 mr-2"></i>Novo Lote de Encomenda</h3>
          <button type="button" class="text-gray-400 hover:text-gray-600 transition enc-close-modal"><i class="fa-solid fa-xmark text-xl"></i></button>
        </div>
        
        <div class="p-6 overflow-y-auto flex-1 custom-scrollbar">
          
          <!-- Lote Info -->
          <div class="mb-8">
            <h4 class="text-sm font-bold text-gray-800 mb-4 border-b pb-2"><i class="fa-solid fa-boxes-stacked text-gray-400 mr-2"></i>Informações do Lote / Fornecedor</h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label class="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Fornecedor *</label>
                <input type="text" id="lote-fornecedor" class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Nome do Fornecedor">
              </div>
              <div>
                <label class="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Data Compra *</label>
                <input type="date" id="lote-data-compra" class="w-full px-3 py-2 border rounded-lg text-sm outline-none text-gray-700">
              </div>
              <div>
                <label class="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Previsão Chegada *</label>
                <input type="date" id="lote-previsao" class="w-full px-3 py-2 border rounded-lg text-sm outline-none text-gray-700">
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div>
                <label class="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Custo Frete Total (R$)</label>
                <input type="number" id="lote-frete" class="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-white" placeholder="0.00">
              </div>
              <div>
                <label class="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Custo Taxas Totais (R$)</label>
                <input type="number" id="lote-taxas" class="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-white" placeholder="0.00">
              </div>
              <div>
                <label class="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Outros Custos Lote (R$)</label>
                <input type="number" id="lote-adic" class="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-white" placeholder="0.00">
              </div>
            </div>
            <div>
              <label class="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Observações do Lote</label>
              <input type="text" id="lote-obs" class="w-full px-3 py-2 border rounded-lg text-sm outline-none" placeholder="Detalhes extras da compra...">
            </div>
          </div>

          <!-- Items List -->
          <div>
            <div class="flex justify-between items-center mb-4 border-b pb-2">
              <h4 class="text-sm font-bold text-gray-800"><i class="fa-solid fa-mobile-screen-button text-gray-400 mr-2"></i>Aparelhos no Lote</h4>
              <button type="button" id="btn-add-item" class="px-3 py-1.5 bg-gray-800 text-white text-xs font-bold rounded-lg hover:bg-gray-900 transition flex items-center gap-1">
                <i class="fa-solid fa-plus"></i> Adicionar Aparelho
              </button>
            </div>
            
            <div id="lote-items-container" class="space-y-4">
              <!-- JS Injects items here -->
            </div>
          </div>

        </div>
        
        <div class="p-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50 rounded-b-2xl">
          <button type="button" class="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition enc-close-modal">Cancelar</button>
          <button type="button" id="btn-save-lote" class="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition flex items-center gap-2">
            <i class="fa-solid fa-check"></i> Salvar Lote
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Confirmação Chegada (Integração Estoque) -->
    <div id="modal-chegou" class="fixed inset-0 bg-gray-900/50 backdrop-blur-sm hidden items-center justify-center z-[60] p-4">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div class="p-6 border-b border-green-100 flex justify-between items-center bg-green-50/50">
          <h3 class="text-lg font-bold text-green-800" id="chegou-modal-title"><i class="fa-solid fa-box-open text-green-500 mr-2"></i>Confirmar Chegada</h3>
          <div class="flex items-center gap-3">
             <span id="lote-progress-badge" class="hidden px-2 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full uppercase">Item 1/5</span>
             <button type="button" class="text-gray-400 hover:text-gray-600 transition enc-close-chegou"><i class="fa-solid fa-xmark text-xl"></i></button>
          </div>
        </div>
        <div class="p-6 overflow-y-auto space-y-5">
          
          <div class="bg-yellow-50 text-yellow-800 p-3 rounded-lg text-sm border border-yellow-100 flex items-start gap-3">
            <i class="fa-solid fa-circle-info mt-0.5 text-yellow-500"></i>
            <p>Ao confirmar, este aparelho será movido para o estoque principal.</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="sm:col-span-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
               <div id="chegou-item-info" class="text-sm font-bold text-gray-800">Modelo do Aparelho</div>
               <div id="chegou-item-sub" class="text-[10px] text-gray-500 uppercase">Categoria - Versão</div>
            </div>
            <div>
              <label class="text-[10px] font-bold text-gray-400 uppercase mb-1 block">IMEI 1</label>
              <input type="text" id="chegou-imei" class="w-full px-3 py-2 border rounded-lg text-sm outline-none" placeholder="Opcional">
            </div>
            <div>
              <label class="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Nº Série</label>
              <input type="text" id="chegou-serial" class="w-full px-3 py-2 border rounded-lg text-sm outline-none" placeholder="Opcional">
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Saúde Bateria</label>
              <div class="relative">
                <input type="number" id="chegou-bateria" class="w-full px-3 py-2 border rounded-lg text-sm outline-none pr-8" placeholder="100">
                <span class="absolute right-3 top-2.5 text-gray-400 text-sm font-bold">%</span>
              </div>
            </div>
            <div>
              <label class="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Preço Final de Venda</label>
              <input type="number" id="chegou-preco" class="w-full px-3 py-2 border rounded-lg text-sm outline-none font-bold" placeholder="0.00">
            </div>
          </div>

          <div>
            <div class="flex justify-between items-center mb-2">
              <label class="text-[10px] font-bold text-gray-400 uppercase block">Fotos do Produto (Máx 5)</label>
              <span class="text-[9px] text-gray-400 italic font-medium">Dica: Arraste para reordenar</span>
            </div>
            
            <!-- Bulk Dropzone -->
            <div id="chegou-dropzone" 
                 class="mb-4 p-6 border-2 border-dashed border-indigo-200 bg-indigo-50/30 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-indigo-50 transition-all group"
                 onclick="document.getElementById('chegou-bulk-input').click()">
              <div class="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <i class="fa-solid fa-cloud-arrow-up text-lg"></i>
              </div>
              <div class="text-center">
                <p class="text-xs font-bold text-gray-800">Clique ou arraste até 5 fotos aqui</p>
                <p class="text-[10px] text-gray-500 mt-0.5">A primeira foto será usada como capa automaticamente</p>
              </div>
              <input type="file" id="chegou-bulk-input" class="hidden" accept="image/*" multiple onchange="window.handleChegouBulkImages(event)">
            </div>

            <!-- Slots Grid -->
            <div class="grid grid-cols-5 gap-2">
              ${[1, 2, 3, 4, 5].map(i => `
                <div id="chegou-slot-${i}" 
                     class="group relative aspect-square bg-gray-50 border border-gray-100 rounded-xl overflow-hidden transition-all cursor-pointer" 
                     draggable="true"
                     ondragstart="window.handleChegouDragStart(event, ${i})"
                     ondragover="window.handleChegouDragOver(event)"
                     ondrop="window.handleChegouDrop(event, ${i})"
                     onclick="document.getElementById('chegou-input-${i}').click()">
                  <img id="chegou-thumb-${i}" src="" class="w-full h-full object-cover hidden relative z-10">
                  
                  <!-- Placeholder -->
                  <div id="chegou-placeholder-${i}" class="absolute inset-0 flex items-center justify-center text-gray-200">
                    <span class="text-lg font-black opacity-30">${i}</span>
                  </div>

                  <!-- Capa Badge -->
                  ${i === 1 ? `<div id="chegou-capa-badge" class="hidden absolute top-1 left-1 bg-gray-900 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase z-20">Capa</div>` : ''}

                  <!-- Loading Overlay -->
                  <div id="chegou-loading-${i}" class="hidden absolute inset-0 bg-white/90 flex items-center justify-center z-30">
                    <i class="fa-solid fa-circle-notch fa-spin text-indigo-500 text-sm"></i>
                  </div>

                  <!-- Delete Button -->
                  <button type="button" id="chegou-btn-del-${i}" onclick="event.stopPropagation(); window.removerFotoChegou(${i})" class="hidden absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-all z-40 active:scale-90 opacity-0 group-hover:opacity-100">
                    <i class="fa-solid fa-xmark text-[9px]"></i>
                  </button>
                </div>
                <input type="file" id="chegou-input-${i}" class="hidden" accept="image/*" onchange="window.handleChegouImage(event, ${i})">
                <input type="hidden" id="chegou-url-${i}">
              `).join('')}
            </div>
          </div>

          <div id="chegou-vitrine-warning" class="hidden text-orange-600 text-[10px] font-bold p-2 bg-orange-50 border border-orange-100 rounded-lg flex items-center gap-2 mb-2 animate-pulse">
             <i class="fa-solid fa-triangle-exclamation"></i>
             <span>Preencha Condição/Memória no lote para Vitrine</span>
          </div>

          <label class="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition">
            <div class="relative flex items-center">
              <input type="checkbox" id="chegou-vitrine" class="sr-only peer" checked>
              <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
            </div>
            <div>
              <p class="text-sm font-bold text-gray-800">Publicar na Vitrine</p>
              <p class="text-[10px] text-gray-500">O produto ficará visível imediatamente para clientes.</p>
            </div>
          </label>
          
          <div id="chegou-error-msg" class="hidden text-red-600 text-xs font-bold p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 mt-2">
             <i class="fa-solid fa-triangle-exclamation"></i>
             <span>Erro</span>
          </div>

        </div>
        <div class="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50 rounded-b-2xl">
          <div class="flex gap-2">
             <button type="button" id="btn-prev-lote" class="hidden px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition flex items-center gap-1">
               <i class="fa-solid fa-arrow-left"></i> Anterior
             </button>
          </div>
          <div class="flex gap-2">
            <button type="button" class="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition enc-close-chegou">Cancelar</button>
            <button type="button" id="btn-confirm-chegou" class="px-6 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition flex items-center gap-2">
              <i class="fa-solid fa-check"></i> <span id="btn-chegou-text">Finalizar</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Confirmação Exclusão -->
    <div id="modal-confirm-delete" class="fixed inset-0 bg-gray-900/50 backdrop-blur-sm hidden items-center justify-center z-[70] p-4">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col p-6 text-center">
        <div class="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <i class="fa-solid fa-triangle-exclamation text-2xl"></i>
        </div>
        <h3 class="text-lg font-bold text-gray-900 mb-2">Confirmar Exclusão</h3>
        <p id="confirm-delete-msg" class="text-sm text-gray-500 mb-6">Deseja realmente excluir este item?</p>
        <div class="flex gap-3">
          <button type="button" class="flex-1 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition enc-close-delete">Cancelar</button>
          <button type="button" id="btn-do-delete" class="flex-1 px-4 py-2 bg-red-500 text-white text-sm font-bold rounded-lg hover:bg-red-600 transition">Sim, Excluir</button>
        </div>
      </div>
    </div>
  `;

  // Listeners Modal Cadastro
  document.querySelectorAll('.enc-close-modal').forEach(b => b.addEventListener('click', fecharModalCadastroCompra));
  document.getElementById('btn-add-item').addEventListener('click', appendItemForm);
  document.getElementById('btn-save-lote').addEventListener('click', salvarLoteEncomenda);

  // Listeners Modal Chegou
  document.querySelectorAll('.enc-close-chegou').forEach(b => b.addEventListener('click', () => {
    document.getElementById('modal-chegou').classList.add('hidden');
    document.getElementById('modal-chegou').classList.remove('flex');
    selectedEncomendadoId = null;
  }));

  document.getElementById('btn-confirm-chegou').addEventListener('click', confirmarChegada);

  // Listeners Modal Deleção
  document.querySelectorAll('.enc-close-delete').forEach(b => b.addEventListener('click', () => {
    document.getElementById('modal-confirm-delete').classList.add('hidden');
    document.getElementById('modal-confirm-delete').classList.remove('flex');
    deleteTarget = null;
  }));

  // Clear errors on input for static lote fields
  ['lote-fornecedor', 'lote-data-compra', 'lote-previsao'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        el.classList.remove('border-red-500', 'ring-1', 'ring-red-200');
      });
    }
  });
}

function clearLoteErrors() {
  const modal = document.getElementById('modal-add-enc');
  if (!modal) return;
  modal.querySelectorAll('.border-red-500').forEach(el => {
    el.classList.remove('border-red-500', 'ring-1', 'ring-red-200');
  });
}

let deleteTarget = null;

function appendItemForm(itemData = null) {
  itemCounter++;
  const container = document.getElementById('lote-items-container');
  const div = document.createElement('div');
  div.className = 'item-enc-form relative border border-gray-200 rounded-xl p-4 bg-white shadow-sm';
  div.id = `item-enc-${itemCounter}`;

  if (itemData && itemData.id) {
    div.dataset.itemId = itemData.id;
    div.dataset.status = itemData.status || 'encomendado';
  }

  const isChegou = itemData && (itemData.status === 'chegou' || itemData.status === 'recebido');

  div.innerHTML = `
    <button type="button" onclick="document.getElementById('item-enc-${itemCounter}').remove()" class="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-200 transition" title="Remover">
      <i class="fa-solid fa-xmark text-xs"></i>
    </button>
    <button type="button" onclick="window.duplicarItemForm('${itemCounter}')" class="absolute top-2 right-10 w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition" title="Duplicar">
      <i class="fa-solid fa-copy text-xs"></i>
    </button>
    
    ${isChegou ? '<div class="absolute top-2 right-20 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded">No Estoque</div>' : ''}
    
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 mb-3">
      <div>
        <label class="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Qtd</label>
        <input type="number" class="i-qtd w-full px-2 py-1.5 border rounded-lg text-sm outline-none font-bold" value="1" min="1">
      </div>
      <div>
        <label class="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Modelo *</label>
        <input type="text" class="i-modelo w-full px-2 py-1.5 border rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="Ex: iPhone 13">
      </div>
      <div>
        <label class="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Categoria</label>
        <input type="text" class="i-categoria w-full px-2 py-1.5 border rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="Ex: Apple">
      </div>
      <div>
        <label class="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Versão</label>
        <input type="text" class="i-versao w-full px-2 py-1.5 border rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="Ex: Nacional">
      </div>
      <div>
        <label class="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Cor</label>
        <input type="text" class="i-cor w-full px-2 py-1.5 border rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="Ex: Preto">
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
      <div>
        <label class="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Memória</label>
        <input type="text" class="i-memoria w-full px-2 py-1.5 border rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="Ex: 128GB">
      </div>
      <div>
        <label class="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Condição</label>
        <select class="i-condicao w-full px-2 py-1.5 border rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 outline-none bg-white">
          <option value="Novo">Novo</option>
          <option value="Seminovo">Seminovo</option>
          <option value="Usado">Usado</option>
          <option value="Vitrine">Vitrine</option>
          <option value="Recondicionado">Recondicionado</option>
        </select>
      </div>
      <div>
        <label class="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Custo Unitário (R$)</label>
        <input type="number" class="i-custo w-full px-2 py-1.5 border rounded-lg text-sm outline-none" placeholder="0.00">
      </div>
      <div>
        <label class="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Venda Prevista (R$)</label>
        <input type="number" class="i-venda w-full px-2 py-1.5 border rounded-lg text-sm outline-none" placeholder="0.00">
      </div>
    </div>
  `;
  container.appendChild(div);

  // Clear error on input
  div.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', () => {
      input.classList.remove('border-red-500', 'ring-1', 'ring-red-200');
    });
  });

  if (itemData) {
    div.querySelector('.i-modelo').value = itemData.modelo || '';
    div.querySelector('.i-categoria').value = itemData.categoria || '';
    div.querySelector('.i-versao').value = itemData.versao || '';
    div.querySelector('.i-memoria').value = itemData.memoria || '';
    div.querySelector('.i-cor').value = itemData.cor || '';
    div.querySelector('.i-condicao').value = itemData.condicao || 'Novo';
    div.querySelector('.i-custo').value = (Number(itemData.custo_compra) || 0) + (Number(itemData.custo_adicional) || 0) || Number(itemData.custo_total) || '';
    div.querySelector('.i-venda').value = itemData.preco_venda_previsto || '';
  }
}

window.duplicarItemForm = function (counterId) {
  const original = document.getElementById(`item-enc-${counterId}`);
  if (!original) return;

  appendItemForm();

  const newItem = document.getElementById(`item-enc-${itemCounter}`);
  newItem.querySelector('.i-modelo').value = original.querySelector('.i-modelo').value;
  newItem.querySelector('.i-categoria').value = original.querySelector('.i-categoria').value;
  newItem.querySelector('.i-versao').value = original.querySelector('.i-versao').value;
  newItem.querySelector('.i-memoria').value = original.querySelector('.i-memoria').value;
  newItem.querySelector('.i-cor').value = original.querySelector('.i-cor').value;
  newItem.querySelector('.i-condicao').value = original.querySelector('.i-condicao').value;
  newItem.querySelector('.i-custo').value = original.querySelector('.i-custo').value;
  newItem.querySelector('.i-venda').value = original.querySelector('.i-venda').value;
  newItem.querySelector('.i-qtd').value = original.querySelector('.i-qtd').value;
}

// ==========================================
// ACTIONS E LÓGICA
// ==========================================

function abrirModalCadastroCompra() {
  document.getElementById('lote-fornecedor').value = '';
  document.getElementById('lote-previsao').value = '';
  document.getElementById('lote-frete').value = '';
  document.getElementById('lote-taxas').value = '';
  document.getElementById('lote-adic').value = '';
  document.getElementById('lote-obs').value = '';

  const hoje = new Date().toISOString().split('T')[0];
  document.getElementById('lote-data-compra').value = hoje;

  document.getElementById('lote-items-container').innerHTML = '';
  itemCounter = 0;
  appendItemForm(); // Mínimo de 1 item

  document.querySelector('#modal-add-enc h3').innerHTML = `<i class="fa-solid fa-truck-fast text-indigo-500 mr-2"></i>Novo Lote de Encomenda`;
  editingLoteId = null;
  clearLoteErrors();
  document.getElementById('modal-add-enc').classList.remove('hidden');
  document.getElementById('modal-add-enc').classList.add('flex');
}

function fecharModalCadastroCompra() {
  document.getElementById('modal-add-enc').classList.add('hidden');
  document.getElementById('modal-add-enc').classList.remove('flex');
  editingLoteId = null;
}

let editingLoteId = null;

window.abrirModalEdicaoLote = function (loteId, highlightItemId = null) {
  const loteItems = comprasData.filter(e => (e.lote_id || e.id) === loteId);
  const loteGroup = loteItems[0];
  if (!loteGroup) return;

  editingLoteId = loteId;

  // Preenche dados do lote (somente leitura ou editáveis, aqui vamos permitir editar se quiser)
  document.getElementById('lote-fornecedor').value = loteGroup.fornecedor || '';
  document.getElementById('lote-data-compra').value = (loteGroup.data_compra || '').split('T')[0];
  document.getElementById('lote-previsao').value = (loteGroup.previsao_chegada || '').split('T')[0];
  document.getElementById('lote-frete').value = loteGroup.custo_frete || '';
  document.getElementById('lote-taxas').value = loteGroup.custo_taxas || '';
  document.getElementById('lote-adic').value = loteGroup.custo_adicional_lote || '';
  document.getElementById('lote-obs').value = loteGroup.observacoes_lote || '';

  // Limpa containers de itens e adiciona os itens existentes
  document.getElementById('lote-items-container').innerHTML = '';
  itemCounter = 0;

  if (loteItems.length > 0) {
    loteItems.forEach(item => appendItemForm(item));
  } else {
    appendItemForm();
  }

  // Muda título do modal
  document.querySelector('#modal-add-enc h3').innerHTML = `<i class="fa-solid fa-pen-to-square text-indigo-500 mr-2"></i>Editar Lote & Produtos`;

  clearLoteErrors();
  document.getElementById('modal-add-enc').classList.remove('hidden');
  document.getElementById('modal-add-enc').classList.add('flex');
}

async function salvarLoteEncomenda() {
  clearLoteErrors();
  const elFornecedor = document.getElementById('lote-fornecedor');
  const elDataCompra = document.getElementById('lote-data-compra');
  const elPrevisao = document.getElementById('lote-previsao');

  const fornecedor = elFornecedor.value.trim();
  const dataCompra = elDataCompra.value;
  const previsao = elPrevisao.value;

  let hasError = false;
  if (!fornecedor) { elFornecedor.classList.add('border-red-500', 'ring-1', 'ring-red-200'); hasError = true; }
  if (!dataCompra) { elDataCompra.classList.add('border-red-500', 'ring-1', 'ring-red-200'); hasError = true; }
  if (!previsao) { elPrevisao.classList.add('border-red-500', 'ring-1', 'ring-red-200'); hasError = true; }

  if (hasError) {
    showToast('Fornecedor, Data de Compra e Previsão são obrigatórios.', 'red', 'fa-xmark');
    return;
  }

  const loteData = {
    id: editingLoteId, // Mantém o ID se estiver editando
    fornecedor: fornecedor,
    data_compra: dataCompra,
    previsao_chegada: previsao,
    custo_frete: Number(document.getElementById('lote-frete').value) || 0,
    custo_taxas: Number(document.getElementById('lote-taxas').value) || 0,
    custo_adicional_lote: Number(document.getElementById('lote-adic').value) || 0,
    observacoes_lote: document.getElementById('lote-obs').value.trim()
  };

  const itemForms = document.querySelectorAll('.item-enc-form');
  if (itemForms.length === 0) {
    showToast('Adicione pelo menos 1 aparelho.', 'red', 'fa-xmark');
    return;
  }

  const itens = [];
  let valid = true;

  itemForms.forEach(form => {
    const elModelo = form.querySelector('.i-modelo');
    const modelo = elModelo.value.trim();
    const custo = Number(form.querySelector('.i-custo').value) || 0;
    const qtd = parseInt(form.querySelector('.i-qtd').value) || 1;

    if (!modelo) {
      elModelo.classList.add('border-red-500', 'ring-1', 'ring-red-200');
      valid = false;
    }

    for (let i = 0; i < qtd; i++) {
      const payloadItem = {
        modelo: modelo,
        categoria: form.querySelector('.i-categoria').value.trim(),
        versao: form.querySelector('.i-versao').value.trim(),
        memoria: form.querySelector('.i-memoria').value.trim(),
        cor: form.querySelector('.i-cor').value.trim(),
        condicao: form.querySelector('.i-condicao').value,
        custo_compra: custo,
        preco_venda_previsto: Number(form.querySelector('.i-venda').value) || 0
      };

      if (i === 0 && form.dataset.itemId) {
        payloadItem.id = form.dataset.itemId;
        payloadItem.status = form.dataset.status;
      }

      itens.push(payloadItem);
    }
  });

  if (!valid) {
    showToast('O Modelo do aparelho é obrigatório.', 'red', 'fa-xmark');
    return;
  }

  const payload = {
    lote: loteData,
    itens: itens
  };

  const btn = document.getElementById('btn-save-lote');
  const oldText = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando Lote...';
  btn.disabled = true;

  try {
    const response = await fetch(`${CONFIG.apiBaseUrl}?action=salvar_lote_encomendado`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (result.ok) {
      showToast('Lote salvo com sucesso!', 'green', 'fa-check');
      fecharModalCadastroCompra();
      await fetchData(); // Refresh table
    } else {
      throw new Error(result.error);
    }
  } catch (err) {
    console.error(err);
    showToast('Erro ao salvar', 'red', 'fa-xmark');
  } finally {
    btn.innerHTML = oldText;
    btn.disabled = false;
  }
}

// Global hook for table button
window.encomendadosChegou = function (id) {
  const enc = comprasData.find(e => e.id === id);
  if (!enc) return;

  isLoteFlow = false;
  loteChegouQueue = [enc];
  loteChegouIndex = 0;

  renderChegouItem();
}

window.abrirLoteChegou = function (loteId) {
  const loteItems = comprasData.filter(e => (e.lote_id === loteId || e.id === loteId) && e.status === 'encomendado');
  if (loteItems.length === 0) {
    showToast('Não há itens pendentes neste lote.', 'yellow', 'fa-circle-info');
    return;
  }

  isLoteFlow = true;
  loteChegouQueue = loteItems;
  loteChegouIndex = 0;

  renderChegouItem();
}

function renderChegouItem() {
  const enc = loteChegouQueue[loteChegouIndex];
  if (!enc) return;

  selectedEncomendadoId = enc.id;

  // Atualiza UI do Modal
  const title = document.getElementById('chegou-modal-title');
  const badge = document.getElementById('lote-progress-badge');
  const info = document.getElementById('chegou-item-info');
  const sub = document.getElementById('chegou-item-sub');
  const btnText = document.getElementById('btn-chegou-text');
  const btnPrev = document.getElementById('btn-prev-lote');

  info.textContent = `${enc.modelo}`;
  sub.textContent = `${enc.categoria || ''} - ${enc.versao || ''} | ${enc.memoria || ''}`;

  if (isLoteFlow) {
    badge.classList.remove('hidden');
    badge.textContent = `Item ${loteChegouIndex + 1}/${loteChegouQueue.length}`;
    btnText.textContent = loteChegouIndex === loteChegouQueue.length - 1 ? 'Salvar e finalizar' : 'Salvar e próximo';
    btnPrev.classList.toggle('hidden', loteChegouIndex === 0);
  } else {
    badge.classList.add('hidden');
    btnText.textContent = 'Salvar e finalizar';
    btnPrev.classList.add('hidden');
  }

  // Hide any previous errors
  const errorMsg = document.getElementById('chegou-error-msg');
  if (errorMsg) errorMsg.classList.add('hidden');

  // Pre-fill fields
  document.getElementById('chegou-preco').value = enc.preco_venda_previsto || '';
  document.getElementById('chegou-imei').value = enc.imei || '';
  document.getElementById('chegou-serial').value = enc.serial || '';

  // Vitrine Logic (Mandatory fields check)
  const hasMemoria = enc.memoria && String(enc.memoria).trim() !== '';
  const hasCondicao = enc.condicao && String(enc.condicao).trim() !== '';
  const vitrineToggle = document.getElementById('chegou-vitrine');
  const vitrineWarning = document.getElementById('chegou-vitrine-warning');

  if (!hasMemoria || !hasCondicao) {
    vitrineToggle.checked = false;
    if (vitrineWarning) vitrineWarning.classList.remove('hidden');
  } else {
    vitrineToggle.checked = true;
    if (vitrineWarning) vitrineWarning.classList.add('hidden');
  }

  const bateriaRaw = String(enc.bateria || '').replace(/\D/g, '');
  document.getElementById('chegou-bateria').value = bateriaRaw;

  // Reset images
  for (let i = 1; i <= 5; i++) {
    document.getElementById(`chegou-url-${i}`).value = '';
    const thumb = document.getElementById(`chegou-thumb-${i}`);
    const placeholder = document.getElementById(`chegou-placeholder-${i}`);
    const delBtn = document.getElementById(`chegou-btn-del-${i}`);
    const capaBadge = document.getElementById('chegou-capa-badge');

    if (thumb) { thumb.src = ''; thumb.classList.add('hidden'); }
    if (placeholder) placeholder.classList.remove('hidden');
    if (delBtn) delBtn.classList.add('hidden');
    if (i === 1 && capaBadge) capaBadge.classList.add('hidden');

    document.getElementById(`chegou-input-${i}`).value = '';
  }
  document.getElementById('chegou-bulk-input').value = '';

  document.getElementById('modal-chegou').classList.remove('hidden');
  document.getElementById('modal-chegou').classList.add('flex');
}

// Handler para botão Anterior
document.addEventListener('click', e => {
  if (e.target.closest('#btn-prev-lote')) {
    if (loteChegouIndex > 0) {
      loteChegouIndex--;
      renderChegouItem();
    }
  }
});

window.handleChegouBulkImages = async function (event) {
  const files = Array.from(event.target.files).slice(0, 5);
  if (files.length === 0) return;

  // Encontra slots vazios
  let slotsToUse = [];
  for (let i = 1; i <= 5; i++) {
    const urlInput = document.getElementById(`chegou-url-${i}`);
    if (urlInput && !urlInput.value) {
      slotsToUse.push(i);
    }
  }

  // Sobe cada arquivo para um slot vazio
  for (let i = 0; i < files.length; i++) {
    const slotIdx = slotsToUse[i];
    if (!slotIdx) break; // Sem mais slots livres
    await processSingleChegouImage(files[i], slotIdx);
  }

  event.target.value = '';
};

// --- DRAG AND DROP LOGIC ---
let draggedSlotIdx = null;

window.handleChegouDragStart = function (event, idx) {
  const url = document.getElementById(`chegou-url-${idx}`).value;
  if (!url) {
    event.preventDefault();
    return;
  }
  draggedSlotIdx = idx;
  event.dataTransfer.effectAllowed = 'move';
  event.currentTarget.classList.add('opacity-40');
};

window.handleChegouDragOver = function (event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
};

window.handleChegouDrop = function (event, targetIdx) {
  event.preventDefault();

  // Clear source opacity
  const sourceSlot = document.getElementById(`chegou-slot-${draggedSlotIdx}`);
  if (sourceSlot) sourceSlot.classList.remove('opacity-40');

  const sourceIdx = draggedSlotIdx;
  if (sourceIdx === null || sourceIdx === targetIdx) return;

  // Swap URLs
  const sourceUrlInput = document.getElementById(`chegou-url-${sourceIdx}`);
  const targetUrlInput = document.getElementById(`chegou-url-${targetIdx}`);

  const sourceUrl = sourceUrlInput.value;
  const targetUrl = targetUrlInput.value;

  sourceUrlInput.value = targetUrl;
  targetUrlInput.value = sourceUrl;

  // Update UI for both
  updateChegouSlotUI(sourceIdx);
  updateChegouSlotUI(targetIdx);

  draggedSlotIdx = null;
};

function updateChegouSlotUI(idx) {
  const url = document.getElementById(`chegou-url-${idx}`).value;
  const thumb = document.getElementById(`chegou-thumb-${idx}`);
  const placeholder = document.getElementById(`chegou-placeholder-${idx}`);
  const delBtn = document.getElementById(`chegou-btn-del-${idx}`);
  const capaBadge = document.getElementById('chegou-capa-badge');

  if (url) {
    thumb.src = url;
    thumb.classList.remove('hidden');
    if (placeholder) placeholder.classList.add('hidden');
    if (delBtn) delBtn.classList.remove('hidden');
    if (idx === 1 && capaBadge) capaBadge.classList.remove('hidden');
  } else {
    thumb.src = '';
    thumb.classList.add('hidden');
    if (placeholder) placeholder.classList.remove('hidden');
    if (delBtn) delBtn.classList.add('hidden');
    if (idx === 1 && capaBadge) capaBadge.classList.add('hidden');
  }
}
// ----------------------------

window.handleChegouImage = async function (event, idx) {
  const file = event.target.files[0];
  if (!file) return;
  await processSingleChegouImage(file, idx);
  event.target.value = '';
};

async function processSingleChegouImage(file, idx) {
  const loading = document.getElementById(`chegou-loading-${idx}`);
  const thumb = document.getElementById(`chegou-thumb-${idx}`);
  const placeholder = document.getElementById(`chegou-placeholder-${idx}`);
  const delBtn = document.getElementById(`chegou-btn-del-${idx}`);
  const inputUrl = document.getElementById(`chegou-url-${idx}`);
  const capaBadge = document.getElementById('chegou-capa-badge');

  loading.classList.remove('hidden');

  try {
    const compressed = await compressImage(file);
    const url = await uploadImageToDrive(compressed, file.name);

    inputUrl.value = url;
    thumb.src = compressed;
    thumb.classList.remove('hidden');
    if (placeholder) placeholder.classList.add('hidden');
    if (delBtn) delBtn.classList.remove('hidden');
    if (idx === 1 && capaBadge) capaBadge.classList.remove('hidden');

  } catch (e) {
    console.error(e);
    showToast(`Erro na imagem ${idx}`, 'red', 'fa-xmark');
  } finally {
    loading.classList.add('hidden');
  }
}

window.removerFotoChegou = function (idx) {
  const inputUrl = document.getElementById(`chegou-url-${idx}`);
  const inputFile = document.getElementById(`chegou-input-${idx}`);
  const thumb = document.getElementById(`chegou-thumb-${idx}`);
  const placeholder = document.getElementById(`chegou-placeholder-${idx}`);
  const delBtn = document.getElementById(`chegou-btn-del-${idx}`);
  const capaBadge = document.getElementById('chegou-capa-badge');

  if (inputUrl) inputUrl.value = '';
  if (inputFile) inputFile.value = '';
  if (thumb) { thumb.src = ''; thumb.classList.add('hidden'); }
  if (placeholder) placeholder.classList.remove('hidden');
  if (delBtn) delBtn.classList.add('hidden');
  if (idx === 1 && capaBadge) capaBadge.classList.add('hidden');
}

async function confirmarChegada() {
  if (!selectedEncomendadoId) return;
  const enc = loteChegouQueue[loteChegouIndex];

  const errorMsg = document.getElementById('chegou-error-msg');
  if (errorMsg) errorMsg.classList.add('hidden');

  const publicar = document.getElementById('chegou-vitrine').checked;
  const img1 = document.getElementById('chegou-url-1').value;
  const precoVenda = Number(document.getElementById('chegou-preco').value) || 0;

  if (publicar) {
    const hasMemoria = enc && enc.memoria && String(enc.memoria).trim() !== '';
    const hasCondicao = enc && enc.condicao && String(enc.condicao).trim() !== '';

    if (!img1 || precoVenda <= 0 || !hasMemoria || !hasCondicao) {
      if (errorMsg) {
        let missing = [];
        if (!img1) missing.push('Foto Principal');
        if (precoVenda <= 0) missing.push('Preço de Venda');
        if (!hasMemoria) missing.push('Armazenamento (Memória)');
        if (!hasCondicao) missing.push('Condição');

        errorMsg.querySelector('span').textContent = `Vitrine exige: ${missing.join(', ')}.`;
        errorMsg.classList.remove('hidden');
      } else {
        showToast('Dados incompletos para Vitrine.', 'red', 'fa-triangle-exclamation');
      }
      return;
    }
  }

  const payload = {
    id: selectedEncomendadoId,
    imei: document.getElementById('chegou-imei').value.trim(),
    serial: document.getElementById('chegou-serial').value.trim(),
    bateria: document.getElementById('chegou-bateria').value.trim() ? document.getElementById('chegou-bateria').value.trim() + '%' : '',
    precoVenda: precoVenda,
    publicarNaVitrine: publicar,
    imagem_1: img1,
    imagem_2: document.getElementById('chegou-url-2').value,
    imagem_3: document.getElementById('chegou-url-3').value,
    imagem_4: document.getElementById('chegou-url-4').value,
    imagem_5: document.getElementById('chegou-url-5').value
  };

  const btn = document.getElementById('btn-confirm-chegou');
  const btnText = document.getElementById('btn-chegou-text');
  const btnIcon = btn.querySelector('i');

  const oldText = btnText.textContent;
  btnText.textContent = 'Finalizando...';
  if (btnIcon) btnIcon.className = 'fa-solid fa-spinner fa-spin';

  btn.disabled = true;

  try {
    const response = await fetch(`${CONFIG.apiBaseUrl}?action=marcar_chegou`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const result = await response.json();

    if (result.ok) {
      const itemName = loteChegouQueue[loteChegouIndex].modelo || 'Aparelho';

      if (isLoteFlow && loteChegouIndex < loteChegouQueue.length - 1) {
        showToast(`${itemName} adicionado ao estoque!`, 'green', 'fa-check');
        loteChegouIndex++;
        renderChegouItem();
      } else {
        showToast(isLoteFlow ? `Lote finalizado! ${itemName} adicionado ao estoque.` : `${itemName} adicionado ao estoque!`, 'green', 'fa-box-open');
        document.getElementById('modal-chegou').classList.add('hidden');
        document.getElementById('modal-chegou').classList.remove('flex');

        // Force refresh
        await loadDashboardData({
          onStatusUpdated: () => { },
          onRender: () => { }
        }, true);
        await fetchData(); // Refresh encomendas
      }
    } else {
      throw new Error(result.error);
    }
  } catch (err) {
    console.error(err);
    showToast('Erro ao processar', 'red', 'fa-xmark');
  } finally {
    if (btnIcon) btnIcon.className = 'fa-solid fa-check';

    // Se o modal ainda estiver visível, podemos restaurar o texto se houve erro
    // Caso tenha tido sucesso no fluxo de lote, renderChegouItem já definiu o texto correto.
    if (btnText && document.getElementById('modal-chegou').classList.contains('flex')) {
      if (btnText.textContent === 'Finalizando...') {
        btnText.textContent = oldText;
      }
    }
    btn.disabled = false;
  }
}

window.excluirEncomendado = function (id, isLote) {
  deleteTarget = id;
  const msg = isLote
    ? 'Tem certeza que deseja excluir todo este LOTE? Todos os aparelhos vinculados serão removidos.'
    : 'Deseja remover este aparelho da encomenda?';

  document.getElementById('confirm-delete-msg').textContent = msg;
  document.getElementById('modal-confirm-delete').classList.remove('hidden');
  document.getElementById('modal-confirm-delete').classList.add('flex');

  // Rebind the delete action to avoid multiple listeners
  const btnDelete = document.getElementById('btn-do-delete');
  const newBtn = btnDelete.cloneNode(true);
  btnDelete.parentNode.replaceChild(newBtn, btnDelete);

  newBtn.onclick = async () => {
    if (!deleteTarget) return;

    newBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Excluindo...';
    newBtn.disabled = true;

    try {
      const response = await fetch(`${CONFIG.apiBaseUrl}?action=remover_encomendado`, {
        method: 'POST',
        body: JSON.stringify({ id: deleteTarget })
      });
      const result = await response.json();

      if (result.ok) {
        showToast(isLote ? 'Lote removido!' : 'Item removido!', 'green', 'fa-trash-can');
        document.getElementById('modal-confirm-delete').classList.add('hidden');
        await fetchData();
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao excluir', 'red', 'fa-xmark');
    } finally {
      newBtn.innerHTML = 'Sim, Excluir';
      newBtn.disabled = false;
      deleteTarget = null;
    }
  };
}

