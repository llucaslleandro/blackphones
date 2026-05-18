/**
 * Cashflow Module — Extrato do Caixa (Audit Trail)
 * Self-contained module: data processing, template, open/close, filters.
 */

import { cashflowState } from './state.js';
import { isConfirmedMovement, isAberturaCaixa, findAberturaCaixa } from './calculations.js';
import { formatMoney, formatDateBr } from '../ui.js';

// =============================================
// Local state for extrato filters
// =============================================
const extratoState = {
  typeFilter: 'all',    // all | entrada | saida
  searchTerm: '',
  isOpen: false
};

// =============================================
// Data Processing
// =============================================

/**
 * Build chronological extrato data with running balance.
 * Returns { days: [...], movements: [...] }
 */
function buildExtratoData() {
  const all = cashflowState.allMovements || [];

  // 1. Find abertura
  const abertura = findAberturaCaixa(all);
  let aberturaValor = 0;
  let cutoffDate = null;

  if (abertura) {
    aberturaValor = Number(abertura.valor) || 0;
    cutoffDate = abertura.parsedDate instanceof Date ? abertura.parsedDate : new Date(abertura.data || 0);
  }

  // 2. Filter confirmed movements (+ abertura itself) and apply cutoff
  let movements = all.filter(m => {
    if (isAberturaCaixa(m)) return true;
    if (!isConfirmedMovement(m)) return false;
    if (cutoffDate) {
      const d = m.parsedDate instanceof Date ? m.parsedDate : new Date(m.data || 0);
      if (d < cutoffDate) return false;
    }
    return true;
  });

  // 3. Sort chronologically (ascending)
  movements.sort((a, b) => {
    const dA = a.parsedDate instanceof Date ? a.parsedDate : new Date(a.data || 0);
    const dB = b.parsedDate instanceof Date ? b.parsedDate : new Date(b.data || 0);
    // Abertura always comes first on the same day
    if (isAberturaCaixa(a)) return -1;
    if (isAberturaCaixa(b)) return 1;
    return dA - dB;
  });

  // 4. Apply local filters
  if (extratoState.typeFilter !== 'all') {
    movements = movements.filter(m => {
      if (isAberturaCaixa(m)) return true; // always show abertura
      return m.tipo === extratoState.typeFilter;
    });
  }

  if (extratoState.searchTerm) {
    const term = extratoState.searchTerm.toLowerCase();
    movements = movements.filter(m => {
      if (isAberturaCaixa(m)) return true;
      const desc = (m.descricao || '').toLowerCase();
      const cat = (m.categoria || '').toLowerCase();
      const obs = (m.observacao || '').toLowerCase();
      return desc.includes(term) || cat.includes(term) || obs.includes(term);
    });
  }

  // 5. Calculate running balance + group by day
  let runningBalance = 0;
  const enriched = [];
  const dayMap = new Map(); // dateKey -> { movements, entradas, saidas, saldoInicial, saldoFinal }

  movements.forEach(m => {
    const isAb = isAberturaCaixa(m);
    const d = m.parsedDate instanceof Date ? m.parsedDate : new Date(m.data || 0);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    // Init day group
    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, {
        dateKey,
        dateLabel: formatDateBr(dateKey),
        saldoInicial: runningBalance,
        entradas: 0,
        saidas: 0,
        saldoFinal: runningBalance,
        movements: []
      });
    }

    const dayGroup = dayMap.get(dateKey);
    const valor = Number(m.valor) || 0;

    if (isAb) {
      runningBalance = aberturaValor;
      dayGroup.saldoInicial = 0; // before abertura, nothing
      dayGroup.entradas += aberturaValor;
    } else if (m.tipo === 'entrada') {
      runningBalance += valor;
      dayGroup.entradas += valor;
    } else if (m.tipo === 'saida') {
      runningBalance -= valor;
      dayGroup.saidas += valor;
    }
    // registro patrimonial -> no change

    dayGroup.saldoFinal = runningBalance;

    enriched.push({
      ...m,
      isAbertura: isAb,
      saldoApos: runningBalance
    });
    dayGroup.movements.push(enriched[enriched.length - 1]);
  });

  return {
    movements: enriched,
    days: Array.from(dayMap.values()),
    saldoFinal: runningBalance
  };
}

// =============================================
// Template
// =============================================

function originBadge(m) {
  if (m.isAbertura) {
    return '<span class="ext-badge ext-badge-abertura"><i class="fa-solid fa-vault mr-0.5"></i>Abertura</span>';
  }
  if (m.origem === 'auto') {
    return '<span class="ext-badge ext-badge-auto"><i class="fa-solid fa-link mr-0.5"></i>Auto</span>';
  }
  return '<span class="ext-badge ext-badge-manual"><i class="fa-solid fa-pen mr-0.5"></i>Manual</span>';
}

function statusBadge(m) {
  if (m.isAbertura) return '<span class="cf-status-badge cf-status-confirmado">Sistema</span>';
  const s = String(m.status || '').toLowerCase();
  if (s === 'confirmado' || s === 'pago') return `<span class="cf-status-badge cf-status-confirmado">${s === 'pago' ? 'Pago' : 'Confirmado'}</span>`;
  if (s === 'pendente') return '<span class="cf-status-badge cf-status-pendente">Pendente</span>';
  if (s === 'cancelado') return '<span class="cf-status-badge cf-status-cancelado">Cancelado</span>';
  return `<span class="cf-status-badge" style="background:#f3f4f6;color:#6b7280">${s || '-'}</span>`;
}

function renderExtratoContent() {
  const { days, saldoFinal } = buildExtratoData();

  if (days.length === 0) {
    return `
      <div class="flex flex-col items-center justify-center py-20 text-gray-400">
        <i class="fa-solid fa-receipt text-4xl mb-3 text-gray-300"></i>
        <p class="text-sm font-semibold">Nenhuma movimentação confirmada encontrada</p>
        <p class="text-xs mt-1">Ajuste os filtros ou registre movimentações no fluxo de caixa.</p>
      </div>
    `;
  }

  let html = '';

  // Summary header
  html += `
    <div class="flex items-center justify-between px-1 mb-5">
      <div class="flex items-center gap-2">
        <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">${days.length} dia(s) com movimentação</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs font-bold text-gray-500">Saldo atual:</span>
        <span class="text-sm font-black ${saldoFinal >= 0 ? 'text-emerald-600' : 'text-red-600'}">${formatMoney(saldoFinal)}</span>
      </div>
    </div>
  `;

  // Day-by-day
  days.forEach(day => {
    html += `
      <div class="ext-day-group mb-4">
        <!-- Day Header -->
        <div class="ext-day-header">
          <div class="flex items-center gap-2.5">
            <span class="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center text-xs flex-shrink-0">
              <i class="fa-regular fa-calendar-day"></i>
            </span>
            <span class="text-sm font-bold text-gray-800">${day.dateLabel}</span>
          </div>
          <div class="ext-day-summary">
            <span class="ext-day-stat">
              <span class="text-[9px] font-bold text-gray-400 uppercase">Início</span>
              <span class="text-xs font-bold text-gray-700">${formatMoney(day.saldoInicial)}</span>
            </span>
            <span class="ext-day-stat">
              <span class="text-[9px] font-bold text-emerald-500 uppercase">Entradas</span>
              <span class="text-xs font-bold text-emerald-600">+${formatMoney(day.entradas)}</span>
            </span>
            <span class="ext-day-stat">
              <span class="text-[9px] font-bold text-red-400 uppercase">Saídas</span>
              <span class="text-xs font-bold text-red-600">-${formatMoney(day.saidas)}</span>
            </span>
            <span class="ext-day-stat">
              <span class="text-[9px] font-bold text-gray-400 uppercase">Final</span>
              <span class="text-xs font-black ${day.saldoFinal >= 0 ? 'text-gray-900' : 'text-red-600'}">${formatMoney(day.saldoFinal)}</span>
            </span>
          </div>
        </div>

        <!-- Desktop Table -->
        <table class="ext-table w-full hidden md:table">
          <thead>
            <tr>
              <th class="text-left p-2.5 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Descrição</th>
              <th class="text-center p-2.5 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Origem</th>
              <th class="text-right p-2.5 text-[9px] font-bold text-emerald-500 uppercase tracking-wider">Entrada</th>
              <th class="text-right p-2.5 text-[9px] font-bold text-red-400 uppercase tracking-wider">Saída</th>
              <th class="text-right p-2.5 text-[9px] font-bold text-gray-500 uppercase tracking-wider">Saldo</th>
              <th class="text-center p-2.5 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            ${day.movements.map(m => {
              const isEntrada = m.tipo === 'entrada' || m.isAbertura;
              const isSaida = m.tipo === 'saida';
              return `
                <tr class="ext-row group ${m.isAbertura ? 'ext-row-abertura' : ''}">
                  <td class="p-2.5">
                    <div class="text-xs font-semibold text-gray-800">${m.descricao || m.categoria || '-'}</div>
                    ${m.subDescricao ? `<div class="text-[10px] text-gray-400 mt-0.5">${m.subDescricao}</div>` : ''}
                    ${m.categoria && m.categoria !== m.descricao ? `<div class="text-[10px] text-gray-400 mt-0.5">${m.categoria}</div>` : ''}
                  </td>
                  <td class="p-2.5 text-center">${originBadge(m)}</td>
                  <td class="p-2.5 text-right">
                    ${isEntrada ? `<span class="text-xs font-bold text-emerald-600 whitespace-nowrap">+${formatMoney(m.valor)}</span>` : '<span class="text-gray-300">—</span>'}
                  </td>
                  <td class="p-2.5 text-right">
                    ${isSaida ? `<span class="text-xs font-bold text-red-600 whitespace-nowrap">-${formatMoney(m.valor)}</span>` : '<span class="text-gray-300">—</span>'}
                  </td>
                  <td class="p-2.5 text-right">
                    <span class="text-xs font-black whitespace-nowrap ${m.saldoApos >= 0 ? 'text-gray-900' : 'text-red-600'}">
                      ${formatMoney(m.saldoApos)}
                    </span>
                    ${m.saldoApos < 0 ? '<i class="fa-solid fa-triangle-exclamation text-[9px] text-red-400 ml-1"></i>' : ''}
                  </td>
                  <td class="p-2.5 text-center">${statusBadge(m)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <!-- Mobile Cards -->
        <div class="md:hidden flex flex-col gap-2 mt-2">
          ${day.movements.map(m => {
            const isEntrada = m.tipo === 'entrada' || m.isAbertura;
            const isSaida = m.tipo === 'saida';
            return `
              <div class="ext-mobile-card ${m.isAbertura ? 'ext-mobile-card-abertura' : ''}">
                <div class="flex items-start justify-between gap-2 mb-2">
                  <div class="flex-1 min-w-0">
                    <div class="text-xs font-semibold text-gray-800 truncate">${m.descricao || m.categoria || '-'}</div>
                    ${m.categoria && m.categoria !== m.descricao ? `<div class="text-[10px] text-gray-400 mt-0.5">${m.categoria}</div>` : ''}
                  </div>
                  <div class="flex items-center gap-1.5 flex-shrink-0">
                    ${originBadge(m)}
                    ${statusBadge(m)}
                  </div>
                </div>
                <div class="flex items-center justify-between">
                  <div>
                    ${isEntrada ? `<span class="text-sm font-bold text-emerald-600">+${formatMoney(m.valor)}</span>` : ''}
                    ${isSaida ? `<span class="text-sm font-bold text-red-600">-${formatMoney(m.valor)}</span>` : ''}
                  </div>
                  <div class="flex items-center gap-1">
                    <span class="text-[9px] font-bold text-gray-400 uppercase">Saldo:</span>
                    <span class="text-sm font-black ${m.saldoApos >= 0 ? 'text-gray-900' : 'text-red-600'}">${formatMoney(m.saldoApos)}</span>
                    ${m.saldoApos < 0 ? '<i class="fa-solid fa-triangle-exclamation text-[9px] text-red-400 ml-0.5"></i>' : ''}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  });

  return html;
}

// =============================================
// Modal Template (rendered once to body)
// =============================================

export function extratoModalTemplate() {
  return `
    <div id="cf-extrato-modal" class="fixed inset-0 bg-black/60 backdrop-blur-sm hidden items-center justify-center z-[100]" style="display:none;">
      <div id="cf-extrato-panel" class="ext-panel transform scale-95 opacity-0 transition-all duration-300 ease-out">
        <!-- Header -->
        <div class="ext-header">
          <div class="flex items-center gap-3">
            <span class="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm flex-shrink-0">
              <i class="fa-solid fa-receipt"></i>
            </span>
            <div>
              <h3 class="text-lg font-bold text-gray-900">Extrato do Caixa</h3>
              <p class="text-xs text-gray-500 mt-0.5">Veja a evolução diária do caixa com saldo acumulado.</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button id="cf-extrato-export" class="ext-export-btn" title="Exportar (em breve)" disabled>
              <i class="fa-solid fa-file-arrow-down text-xs"></i>
              <span class="hidden sm:inline">Exportar</span>
            </button>
            <button id="cf-extrato-close" class="text-gray-400 hover:text-gray-600 transition w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
              <i class="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>
        </div>

        <!-- Filters -->
        <div class="ext-filters">
          <div class="flex items-center gap-2 flex-wrap flex-1">
            <button class="ext-filter-chip active" data-ext-type="all">Todos</button>
            <button class="ext-filter-chip" data-ext-type="entrada">
              <i class="fa-solid fa-arrow-up text-[8px] text-emerald-500"></i> Entradas
            </button>
            <button class="ext-filter-chip" data-ext-type="saida">
              <i class="fa-solid fa-arrow-down text-[8px] text-red-500"></i> Saídas
            </button>
          </div>
          <div class="relative flex-shrink-0 w-full sm:w-56">
            <i class="fa-solid fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]"></i>
            <input type="text" id="cf-extrato-search" class="ext-search-input" placeholder="Buscar descrição...">
          </div>
        </div>

        <!-- Content -->
        <div id="cf-extrato-content" class="ext-content custom-scrollbar">
          <!-- Rendered dynamically -->
        </div>
      </div>
    </div>
  `;
}

// =============================================
// Open / Close / Render
// =============================================

export function openExtratoModal() {
  const modal = document.getElementById('cf-extrato-modal');
  const panel = document.getElementById('cf-extrato-panel');
  if (!modal || !panel) return;

  // Reset filters
  extratoState.typeFilter = 'all';
  extratoState.searchTerm = '';

  // Reset filter UI
  modal.querySelectorAll('.ext-filter-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.extType === 'all');
  });
  const searchInput = document.getElementById('cf-extrato-search');
  if (searchInput) searchInput.value = '';

  // Show modal
  modal.style.display = 'flex';
  modal.classList.remove('hidden');
  extratoState.isOpen = true;

  // Animate in
  requestAnimationFrame(() => {
    panel.classList.remove('scale-95', 'opacity-0');
    panel.classList.add('scale-100', 'opacity-100');
  });

  // Render content
  refreshExtratoContent();
}

export function closeExtratoModal() {
  const modal = document.getElementById('cf-extrato-modal');
  const panel = document.getElementById('cf-extrato-panel');
  if (!modal || !panel) return;

  panel.classList.remove('scale-100', 'opacity-100');
  panel.classList.add('scale-95', 'opacity-0');
  extratoState.isOpen = false;

  setTimeout(() => {
    modal.style.display = 'none';
    modal.classList.add('hidden');
  }, 300);
}

function refreshExtratoContent() {
  const container = document.getElementById('cf-extrato-content');
  if (!container) return;
  container.innerHTML = renderExtratoContent();
}

// =============================================
// Event Listeners
// =============================================

export function setupExtratoListeners() {
  // Close
  document.getElementById('cf-extrato-close')?.addEventListener('click', closeExtratoModal);
  document.getElementById('cf-extrato-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'cf-extrato-modal') closeExtratoModal();
  });

  // Type filter chips
  document.getElementById('cf-extrato-modal')?.addEventListener('click', (e) => {
    const chip = e.target.closest('.ext-filter-chip');
    if (!chip) return;

    const type = chip.dataset.extType;
    if (!type) return;

    extratoState.typeFilter = type;

    // Update chip UI
    document.querySelectorAll('#cf-extrato-modal .ext-filter-chip').forEach(c => {
      c.classList.toggle('active', c.dataset.extType === type);
    });

    refreshExtratoContent();
  });

  // Search
  let searchTimeout;
  document.getElementById('cf-extrato-search')?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      extratoState.searchTerm = e.target.value;
      refreshExtratoContent();
    }, 250);
  });

  // ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && extratoState.isOpen) {
      closeExtratoModal();
    }
  });
}
