/**
 * Cashflow Module — Main Orchestrator (index.js)
 * Entry point following the strategy/ module pattern.
 */

import { CONFIG } from '../../../shared/config.js';
import { cashflowState } from './state.js';
import { state, fetchJSON } from '../store.js';
import { applyDateMask, formatMoney } from '../ui.js';
import { generateFromOrders, generateFromFiados, generateFromCompras, mergeMovements } from './integrations.js';
import { shellTemplate, modalTemplate, aberturaModalTemplate, confirmModalTemplate } from './templates.js';
import { renderAll } from './render.js';
import { openModal, closeModal, setupModalListeners, deleteMovement, isModalOpen as checkModalOpen, openAberturaCaixaModal, setupAberturaCaixaListeners, openEditModal, setupConfirmModalListeners, openConfirmModal } from './modal.js';
import { ABERTURA_CAIXA_ID } from './calculations.js';
import { extratoModalTemplate, openExtratoModal, setupExtratoListeners } from './extrato.js';

let isShellRendered = false;

/**
 * Main entry point — called when tab is activated
 */
export async function initAndRender() {
  const container = document.getElementById('tab-cashflow');
  if (!container) return;

  // Render shell only once
  if (!isShellRendered) {
    container.innerHTML = shellTemplate();
    renderModalsToBody();
    setupListeners();
    isShellRendered = true;
  }

  // Set default period to 'month' if first load
  if (!cashflowState.isInitialized) {
    cashflowState.periodFilter = 'month';
    updatePeriodChips();
    cashflowState.isInitialized = true;
  }

  // Load and merge data
  await refreshData();
}

/**
 * Check if modal is currently open
 */
export function isModalOpen() {
  return checkModalOpen();
}

/**
 * Refresh all data and re-render
 */
async function refreshData() {
  // 1. Generate automatic movements from existing store data
  const autoFromOrders = generateFromOrders(state.allOrders);
  const autoFromFiados = generateFromFiados(state.allFiados);
  const autoFromCompras = generateFromCompras(state.allEncomendas);
  const allAuto = [...autoFromOrders, ...autoFromFiados, ...autoFromCompras];

  // 2. Load manual movements from API
  let manualMovements = [];
  try {
    const rawData = await fetchJSON(`${CONFIG.apiBaseUrl}?action=movimentos_caixa`);
    manualMovements = (rawData || []).map(m => ({
      ...m,
      parsedDate: m.data ? new Date(m.data) : new Date(0),
      origem: 'manual'
    }));
    cashflowState.manualMovements = manualMovements;
  } catch (err) {
    // If the sheet doesn't exist yet, that's fine — use empty array
    console.warn('Movimentos caixa not available yet:', err.message);
    manualMovements = cashflowState.manualMovements || [];
  }

  // 3. Merge
  cashflowState.allMovements = mergeMovements(allAuto, manualMovements);

  // 4. Render
  renderAll();
}

/**
 * Render modal HTML to body (once) — standard + abertura
 */
function renderModalsToBody() {
  let modalContainer = document.getElementById('cf-modal-container');
  if (!modalContainer) {
    modalContainer = document.createElement('div');
    modalContainer.id = 'cf-modal-container';
    document.body.appendChild(modalContainer);
  }
  modalContainer.innerHTML = modalTemplate() + aberturaModalTemplate() + extratoModalTemplate() + confirmModalTemplate();
}

/**
 * Setup all event listeners
 */
function setupListeners() {
  // Action buttons
  document.getElementById('cf-btn-entrada')?.addEventListener('click', () => openModal('entrada'));
  document.getElementById('cf-btn-saida')?.addEventListener('click', () => openModal('saida'));
  document.getElementById('cf-btn-abertura')?.addEventListener('click', () => openAberturaCaixaModal());
  document.getElementById('cf-btn-extrato')?.addEventListener('click', () => openExtratoModal());

  // Period chips
  document.getElementById('cf-period-chips')?.addEventListener('click', (e) => {
    const chip = e.target.closest('.cf-chip');
    if (!chip) return;
    const period = chip.dataset.period;
    cashflowState.periodFilter = period;
    updatePeriodChips();

    // Toggle custom dates
    document.getElementById('cf-custom-dates')?.classList.toggle('hidden', period !== 'custom');

    renderAll();
  });

  // Custom date inputs
  document.getElementById('cf-date-start')?.addEventListener('input', applyDateMask);
  document.getElementById('cf-date-end')?.addEventListener('input', applyDateMask);

  document.getElementById('cf-date-start')?.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val.length === 10) {
      const [d, m, y] = val.split('/');
      cashflowState.customDateStart = `${y}-${m}-${d}`;
      renderAll();
    }
  });

  document.getElementById('cf-date-end')?.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val.length === 10) {
      const [d, m, y] = val.split('/');
      cashflowState.customDateEnd = `${y}-${m}-${d}`;
      renderAll();
    }
  });

  // Search
  let searchTimeout;
  document.getElementById('cf-search')?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      cashflowState.searchTerm = e.target.value;
      renderAll();
    }, 250);
  });

  // Type filter chips
  document.getElementById('cf-type-filters')?.addEventListener('click', (e) => {
    const chip = e.target.closest('.cf-type-chip');
    if (!chip) return;
    const type = chip.dataset.type;

    if (type === 'pendente') {
      cashflowState.typeFilter = 'all';
      cashflowState.statusFilter = 'pendente';
    } else {
      cashflowState.typeFilter = type;
      cashflowState.statusFilter = 'all';
    }

    updateTypeChips(type);
    renderAll();
  });

  // Modal listeners
  setupModalListeners(() => refreshData());
  setupAberturaCaixaListeners(() => refreshData());
  setupExtratoListeners();
  setupConfirmModalListeners();

  // Delete event (custom event from render.js) — uses UI confirm modal
  window.addEventListener('cf:delete-movement', (e) => {
    const { id, desc, valor, tipo } = e.detail;
    const tipoLabel = tipo === 'entrada' ? 'Entrada' : 'Saída';
    const isAbertura = id === ABERTURA_CAIXA_ID;

    const msg = isAbertura
      ? '⚠️ Excluir a Abertura de Caixa fará o sistema voltar a calcular o caixa a partir de zero.\n\nTem certeza que deseja remover o caixa inicial?'
      : `Tem certeza que deseja excluir esta movimentação?\n\nTipo: ${tipoLabel}\nValor: ${formatMoney(valor)}\nDescrição: ${desc || 'Sem descrição'}`;

    openConfirmModal(msg, async () => {
      await deleteMovement(id, () => refreshData());
    }, {
      variant: 'delete',
      title: isAbertura ? 'Excluir Caixa Inicial?' : 'Excluir Movimentação?'
    });
  });

  // Edit event (custom event from render.js)
  window.addEventListener('cf:edit-movement', (e) => {
    const { id } = e.detail;
    const movement = cashflowState.allMovements.find(m => m.id === id);
    if (movement) {
      openEditModal(movement);
    }
  });

  // Open abertura event (from banner CTA or edit button)
  window.addEventListener('cf:open-abertura', () => {
    openAberturaCaixaModal();
  });
}

/**
 * Update period chip active states
 */
function updatePeriodChips() {
  const chips = document.querySelectorAll('#cf-period-chips .cf-chip');
  chips.forEach(chip => {
    chip.classList.toggle('active', chip.dataset.period === cashflowState.periodFilter);
  });
}

/**
 * Update type filter chip active states
 */
function updateTypeChips(activeType) {
  const chips = document.querySelectorAll('#cf-type-filters .cf-type-chip');
  chips.forEach(chip => {
    chip.classList.toggle('active', chip.dataset.type === activeType);
  });
}
