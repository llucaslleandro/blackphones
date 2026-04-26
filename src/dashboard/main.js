import { CONFIG, applyTheme } from '../shared/config.js';
import * as ui from './modules/ui.js';
import * as store from './modules/store.js';
import * as analytics from './modules/analytics.js';
import * as dashboard from './modules/dashboard.js';
import * as inventory from './modules/inventory.js';
import * as notifications from './modules/notifications.js';
import { initOnboarding } from './modules/onboarding.js';
import { renderMetricas, refreshActiveCount } from './modules/metrics.js';
import { initReceiptModal } from './modules/receipt.js';

// ---- INITIALIZATION ----
const IS_LOGIN_PAGE = window.location.pathname.includes('login.html');

async function init() {
  ui.checkAuth(IS_LOGIN_PAGE);
  applyTheme();
  ui.updateStoreNames();
  ui.updateGreeting();

  if (IS_LOGIN_PAGE) {
    setupLoginListeners();
  } else {
    document.title = `Painel de Vendas - ${CONFIG.storeName}`;
    setupDashboardListeners();
    initReceiptModal();

    // Initial Load
    await store.loadDashboardData(RENDER_PIPELINE);

    // Seed notifications with catch-up (don't alert on old orders)
    notifications.initSeenOrders(store.state.allOrders);

    // Auto-refresh every 45s
    setInterval(() => {
      // Don't refresh if there are pending stock changes
      if (Object.keys(inventory.pendingEstoqueUpdates || {}).length === 0) {
        store.loadDashboardData(RENDER_PIPELINE, true);
      }
    }, 45000);

    // Initial Onboarding Check
    initOnboarding();
  }
}

// ---- RENDER PIPELINE ----
// This combines multiple module renders into one flow
const RENDER_PIPELINE = {
  onDataLoaded: () => {
    // Check for new orders to notify
    if (!IS_LOGIN_PAGE) {
      notifications.checkNewOrders(store.state.allOrders);
    }
    dashboard.aplicarFiltroPeriodo({ onRender: RENDER_PIPELINE.renderVisuals });
  },
  onBrandsLoaded: (brands) => {
    const brandSelect = document.getElementById('table-brand');
    if (brandSelect) {
      brandSelect.innerHTML = '<option value="all">Todas Categorias</option>';
      brands.forEach(b => brandSelect.innerHTML += `<option value="${b}">${b}</option>`);
    }
  },
  renderVisuals: () => {
    analytics.calcularKPIsEInsights();
    analytics.renderCharts();
    analytics.renderRankings();
    dashboard.renderTable({ onStatusUpdated: RENDER_PIPELINE.onDataLoaded, onRender: RENDER_PIPELINE.renderVisuals, dataCallbacks: RENDER_PIPELINE });

    const tabEstoque = document.getElementById('tab-estoque');
    if (tabEstoque && !tabEstoque.classList.contains('hidden')) {
      inventory.renderEstoque({ onEdit: inventory.abrirModalEdicao, dataCallbacks: RENDER_PIPELINE });
    }
  },
  dataCallbacks: null // Circular ref handled below
};
RENDER_PIPELINE.dataCallbacks = RENDER_PIPELINE;

// ---- EVENT LISTENERS ----
function setupLoginListeners() {
  document.getElementById('login-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const errorMsg = document.getElementById('login-error');

    if (user === CONFIG.dashboard.user && pass === CONFIG.dashboard.pass) {
      localStorage.setItem('vendly_dashboard_auth', 'true');
      window.location.href = 'index.html';
    } else {
      errorMsg?.classList.remove('hidden');
    }
  });
}

function setupDashboardListeners() {
  // Logout
  document.getElementById('btn-logout')?.addEventListener('click', () => {
    localStorage.removeItem('vendly_dashboard_auth');
    window.location.href = 'index.html';
  });

  // Tabs
  const btnTabGeral = document.getElementById('tab-btn-geral');
  const btnTabEstrategia = document.getElementById('tab-btn-estrategia');
  const btnTabEstoque = document.getElementById('tab-btn-estoque');
  const btnTabMetricas = document.getElementById('tab-btn-metricas');
  const tabGeral = document.getElementById('tab-geral');
  const tabEstrategia = document.getElementById('tab-estrategia');
  const tabEstoque = document.getElementById('tab-estoque');
  const tabMetricas = document.getElementById('tab-metricas');

  const tabs = [tabGeral, tabEstrategia, tabEstoque, tabMetricas];
  const btns = [btnTabGeral, btnTabEstrategia, btnTabEstoque, btnTabMetricas];

  const globalFilterWrap = document.getElementById('global-filter-wrap');

  const showGlobalFilters = (show) => {
    globalFilterWrap?.classList.toggle('hidden', !show);
  };

  btnTabGeral?.addEventListener('click', () => {
    ui.setTab(btnTabGeral, tabGeral, btns, tabs);
    showGlobalFilters(true);
  });
  btnTabEstrategia?.addEventListener('click', () => {
    ui.setTab(btnTabEstrategia, tabEstrategia, btns, tabs);
    showGlobalFilters(true);
  });
  btnTabEstoque?.addEventListener('click', () => {
    ui.setTab(btnTabEstoque, tabEstoque, btns, tabs);
    showGlobalFilters(false);
    inventory.renderEstoque({ onEdit: inventory.abrirModalEdicao, dataCallbacks: RENDER_PIPELINE });
  });
  btnTabMetricas?.addEventListener('click', () => {
    ui.setTab(btnTabMetricas, tabMetricas, btns, tabs);
    showGlobalFilters(false);
    renderMetricas();
  });

  // Métricas: Period filter
  document.getElementById('metricas-period')?.addEventListener('change', () => renderMetricas());
  document.getElementById('btn-refresh-metricas')?.addEventListener('click', () => renderMetricas());

  // Métricas: Auto-refresh active visitors every 15s while tab is visible
  setInterval(() => {
    if (tabMetricas && !tabMetricas.classList.contains('hidden')) {
      refreshActiveCount();
    }
  }, 15000);

  // Setup Image Drag and Drop
  setupImageDragAndDrop();

  // Global Refresh
  document.getElementById('btn-refresh')?.addEventListener('click', () => store.loadDashboardData(RENDER_PIPELINE));
  document.getElementById('btn-retry')?.addEventListener('click', () => store.loadDashboardData(RENDER_PIPELINE));

  // Period Filter (with auto-refresh)
  const periodFilter = document.getElementById('period-filter');
  periodFilter?.addEventListener('change', async () => {
    document.getElementById('custom-date-wrap')?.classList.toggle('hidden', periodFilter.value !== 'custom');
    // Only auto-refresh for non-custom (custom waits for date inputs)
    if (periodFilter.value !== 'custom') {
      await store.loadDashboardData(RENDER_PIPELINE, true);
    }
    dashboard.aplicarFiltroPeriodo({ onRender: RENDER_PIPELINE.renderVisuals });
  });

  document.getElementById('date-start')?.addEventListener('change', async () => {
    await store.loadDashboardData(RENDER_PIPELINE, true);
    dashboard.aplicarFiltroPeriodo({ onRender: RENDER_PIPELINE.renderVisuals });
  });
  document.getElementById('date-end')?.addEventListener('change', async () => {
    await store.loadDashboardData(RENDER_PIPELINE, true);
    dashboard.aplicarFiltroPeriodo({ onRender: RENDER_PIPELINE.renderVisuals });
  });

  // Novo Pedido Manual
  document.getElementById('btn-novo-pedido')?.addEventListener('click', dashboard.abrirModalNovoPedido);
  document.getElementById('novo-pedido-close')?.addEventListener('click', dashboard.fecharModalNovoPedido);
  document.getElementById('novo-pedido-cancel')?.addEventListener('click', dashboard.fecharModalNovoPedido);
  document.getElementById('novo-pedido-submit')?.addEventListener('click', () => dashboard.salvarPedidoManual({ dataCallbacks: RENDER_PIPELINE, onRender: RENDER_PIPELINE.renderVisuals }));

  // Table Filters
  document.getElementById('table-search')?.addEventListener('input', (e) => {
    store.state.tableSearchTerm = e.target.value.toLowerCase();
    dashboard.renderTable({ onStatusUpdated: RENDER_PIPELINE.onDataLoaded, onRender: RENDER_PIPELINE.renderVisuals, dataCallbacks: RENDER_PIPELINE });
  });

  document.getElementById('table-brand')?.addEventListener('change', (e) => {
    store.state.tableBrandFilter = e.target.value;
    dashboard.renderTable({ onStatusUpdated: RENDER_PIPELINE.onDataLoaded, onRender: RENDER_PIPELINE.renderVisuals, dataCallbacks: RENDER_PIPELINE });
  });

  document.getElementById('table-status')?.addEventListener('change', (e) => {
    store.state.tableStatusFilter = e.target.value;
    dashboard.renderTable({ onStatusUpdated: RENDER_PIPELINE.onDataLoaded, onRender: RENDER_PIPELINE.renderVisuals, dataCallbacks: RENDER_PIPELINE });
  });

  document.getElementById('table-period')?.addEventListener('change', (e) => {
    store.state.tablePeriodFilter = e.target.value;
    document.getElementById('table-custom-wrap')?.classList.toggle('hidden', e.target.value !== 'custom');
    dashboard.renderTable({ onStatusUpdated: RENDER_PIPELINE.onDataLoaded, onRender: RENDER_PIPELINE.renderVisuals, dataCallbacks: RENDER_PIPELINE });
  });

  document.getElementById('table-date-start')?.addEventListener('change', () => {
    dashboard.renderTable({ onStatusUpdated: RENDER_PIPELINE.onDataLoaded, onRender: RENDER_PIPELINE.renderVisuals, dataCallbacks: RENDER_PIPELINE });
  });

  // Negotiation Modal
  dashboard.initNegotiationModal();

  // Inventory Specific
  document.getElementById('estoque-search')?.addEventListener('input', () => {
    inventory.renderEstoque({ onEdit: inventory.abrirModalEdicao, dataCallbacks: RENDER_PIPELINE });
  });

  document.getElementById('estoque-filter')?.addEventListener('change', () => {
    inventory.renderEstoque({ onEdit: inventory.abrirModalEdicao, dataCallbacks: RENDER_PIPELINE });
  });

  document.getElementById('btn-salvar-estoque')?.addEventListener('click', () => {
    inventory.salvarEstoqueManualmente({ onEdit: inventory.abrirModalEdicao, dataCallbacks: RENDER_PIPELINE });
  });

  document.getElementById('btn-add-produto')?.addEventListener('click', inventory.abrirModalCadastro);
  document.getElementById('cadastro-close')?.addEventListener('click', inventory.fecharModalCadastro);
  document.getElementById('cadastro-cancel')?.addEventListener('click', inventory.fecharModalCadastro);
  document.getElementById('cadastro-submit')?.addEventListener('click', () => inventory.salvarNovoProduto({ dataCallbacks: RENDER_PIPELINE, onEdit: inventory.abrirModalEdicao }));
  inventory.setupCategoriaHandler();
  
  // Unit Toggles (GB/TB)
  ['cad-armaz-unit', 'cad-ram-unit'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', (e) => {
      const btn = e.currentTarget;
      const current = btn.dataset.unit || 'GB';
      const next = current === 'GB' ? 'TB' : 'GB';
      btn.dataset.unit = next;
      btn.textContent = next;
    });
  });

  document.querySelectorAll('.cadastro-tipo-btn').forEach(btn => {
    btn.addEventListener('click', () => inventory.updateTipoButtons(btn.dataset.tipo));
  });

  document.getElementById('cad-var-sim')?.addEventListener('click', () => {
    inventory.updateVarButtons(true);
    inventory.adicionarLinhaVariacao();
  });
  document.getElementById('cad-var-nao')?.addEventListener('click', () => inventory.updateVarButtons(false));
  document.getElementById('cad-var-add')?.addEventListener('click', inventory.adicionarLinhaVariacao);

  // Modal Deletion
  document.getElementById('exclusao-cancelar')?.addEventListener('click', inventory.cancelarExclusao);
  document.getElementById('exclusao-confirmar')?.addEventListener('click', () => inventory.executarExclusao({ dataCallbacks: RENDER_PIPELINE }));

  // Unified Multi-Upload
  const multiUploadInput = document.getElementById('multi-upload-input');
  const dropZone = document.getElementById('unified-drop-zone');

  if (multiUploadInput) {
    multiUploadInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;
      handleFiles(files);
      e.target.value = ''; // Reset
    });
  }

  if (dropZone) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, false);
    });

    dropZone.addEventListener('dragenter', () => dropZone.classList.add('border-indigo-500', 'bg-indigo-50'));
    dropZone.addEventListener('dragover', () => dropZone.classList.add('border-indigo-500', 'bg-indigo-50'));
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-indigo-500', 'bg-indigo-50'));
    dropZone.addEventListener('drop', (e) => {
      dropZone.classList.remove('border-indigo-500', 'bg-indigo-50');
      const files = Array.from(e.dataTransfer.files);
      handleFiles(files);
    });
  }

  // Remove Image Button
  document.getElementById('modal-cadastro-produto')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-remove-img');
    if (btn) {
      const idx = btn.dataset.idx;
      const urlInput = document.getElementById(`cad-imagem-${idx}`);
      const thumb = document.getElementById(`cad-img-thumb-${idx}`);
      const placeholder = document.getElementById(`cad-img-placeholder-${idx}`);

      if (urlInput) urlInput.value = '';
      if (thumb) {
        thumb.src = '';
        thumb.classList.add('hidden');
      }
      if (placeholder) placeholder.classList.remove('hidden');

      ui.showToast(`Imagem ${idx} removida`, 'blue', 'fa-trash-can');
    }
  });

  async function handleFiles(files) {
    // Find next available slots
    let slotsToFill = [];
    for (let i = 1; i <= 5; i++) {
      const urlVal = document.getElementById(`cad-imagem-${i}`)?.value;
      if (!urlVal) slotsToFill.push(i);
    }

    // If no slots are empty, use the first N slots
    if (slotsToFill.length === 0) slotsToFill = [1, 2, 3, 4, 5];

    for (let i = 0; i < Math.min(files.length, slotsToFill.length); i++) {
      const slotIdx = slotsToFill[i];
      const file = files[i];

      const loading = document.getElementById(`cad-img-loading-${slotIdx}`);
      const placeholder = document.getElementById(`cad-img-placeholder-${slotIdx}`);
      const thumb = document.getElementById(`cad-img-thumb-${slotIdx}`);
      const urlInput = document.getElementById(`cad-imagem-${slotIdx}`);

      loading?.classList.remove('hidden');
      placeholder?.classList.add('hidden');

      try {
        const compressed = await ui.compressImage(file);
        const url = await store.uploadImageToDrive(compressed, file.name);
        if (urlInput) urlInput.value = url;
        if (thumb) {
          thumb.src = compressed;
          thumb.classList.remove('hidden');
        }
        ui.showToast(`Imagem ${slotIdx} enviada!`, 'green', 'fa-check');
      } catch (err) {
        console.error(err);
        ui.showToast(`Erro no slot ${slotIdx}`, 'red', 'fa-xmark');
        if (!thumb || thumb.classList.contains('hidden')) placeholder?.classList.remove('hidden');
      } finally {
        loading?.classList.add('hidden');
      }
    }
  }
}

function setupImageDragAndDrop() {
  let draggedIdx = null;

  const container = document.getElementById('modal-cadastro-produto');
  if (!container) return;

  container.addEventListener('dragstart', (e) => {
    const slot = e.target.closest('.img-slot');
    if (slot) {
      draggedIdx = slot.dataset.idx;
      e.dataTransfer.effectAllowed = 'move';
      slot.classList.add('opacity-40', 'scale-95');
    }
  });

  container.addEventListener('dragend', (e) => {
    const slot = e.target.closest('.img-slot');
    if (slot) {
      slot.classList.remove('opacity-40', 'scale-95');
      document.querySelectorAll('.img-slot').forEach(s => s.classList.remove('bg-indigo-50', 'border-indigo-400'));
    }
  });

  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    const slot = e.target.closest('.img-slot');
    if (slot && slot.dataset.idx !== draggedIdx) {
      slot.classList.add('bg-indigo-50', 'border-indigo-400', 'border-solid');
    }
  });

  container.addEventListener('dragleave', (e) => {
    const slot = e.target.closest('.img-slot');
    if (slot) {
      slot.classList.remove('bg-indigo-50', 'border-indigo-400', 'border-solid');
    }
  });

  container.addEventListener('drop', (e) => {
    e.preventDefault();
    const slot = e.target.closest('.img-slot');
    if (slot && draggedIdx && slot.dataset.idx !== draggedIdx) {
      swapImages(draggedIdx, slot.dataset.idx);
    }
    document.querySelectorAll('.img-slot').forEach(s => s.classList.remove('bg-indigo-50', 'border-indigo-400', 'border-solid'));
  });
}

function swapImages(idx1, idx2) {
  const urlInput1 = document.getElementById(`cad-imagem-${idx1}`);
  const urlInput2 = document.getElementById(`cad-imagem-${idx2}`);
  const thumb1 = document.getElementById(`cad-img-thumb-${idx1}`);
  const thumb2 = document.getElementById(`cad-img-thumb-${idx2}`);
  const placeholder1 = document.getElementById(`cad-img-placeholder-${idx1}`);
  const placeholder2 = document.getElementById(`cad-img-placeholder-${idx2}`);

  if (!urlInput1 || !urlInput2) return;

  // Swap values
  const tempUrl = urlInput1.value;
  urlInput1.value = urlInput2.value;
  urlInput2.value = tempUrl;

  // Swap thumbnails
  const tempSrc = thumb1.src;
  const tempHidden = thumb1.classList.contains('hidden');

  thumb1.src = thumb2.src;
  if (thumb2.classList.contains('hidden')) thumb1.classList.add('hidden');
  else thumb1.classList.remove('hidden');

  thumb2.src = tempSrc;
  if (tempHidden) thumb2.classList.add('hidden');
  else thumb2.classList.remove('hidden');

  // Update placeholders
  if (thumb1.classList.contains('hidden')) placeholder1?.classList.remove('hidden');
  else placeholder1?.classList.add('hidden');

  if (thumb2.classList.contains('hidden')) placeholder2?.classList.remove('hidden');
  else placeholder2?.classList.add('hidden');

  ui.showToast('Ordem alterada!', 'blue', 'fa-arrows-rotate');
}

// Start
init();
