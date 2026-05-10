import { CONFIG, applyTheme } from '../shared/config.js';
import * as ui from './modules/ui.js';
import * as store from './modules/store.js';
import * as analytics from './modules/analytics.js';
import * as dashboard from './modules/dashboard.js';
import * as inventory from './modules/inventory.js';
import * as notifications from './modules/notifications.js';
import * as compras from './modules/compras.js';
import * as fiado from './modules/fiado.js';
import { initOnboarding } from './modules/onboarding.js';
import { renderMetricas, refreshActiveCount } from './modules/metrics.js';
import { initReceiptModal } from './modules/receipt.js';

// ---- INITIALIZATION ----
const IS_LOGIN_PAGE = window.location.pathname.includes('login.html');
let isAppInitializing = false;
let isFirstLoad = true;

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
    ui.initTooltips();

    // Initial Load
    await store.loadDashboardData(RENDER_PIPELINE);

    // Seed notifications with catch-up (don't alert on old orders)
    notifications.initSeenOrders(store.state.allOrders);

    // Auto-refresh every 45s
    setInterval(() => {
      // Don't refresh if there are pending stock changes OR if a Compras modal is open
      const isInventoryPending = Object.keys(inventory.pendingEstoqueUpdates || {}).length > 0;
      const isComprasModalOpen = compras.isModalOpen && compras.isModalOpen();
      
      if (!isInventoryPending && !isComprasModalOpen) {
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
  onLoadingStarted: () => {
    const activeTabId = ui.getActiveTabId();
    if (activeTabId === 'tab-vendas-historico' && ui.getViewPreference() === 'grid') {
      dashboard.renderOrderSkeletons();
    }
  },
  onDataLoaded: () => {
    // Check for new orders to notify
    if (!IS_LOGIN_PAGE) {
      notifications.checkNewOrders(store.state.allOrders);
    }
    isAppInitializing = true;
    dashboard.syncPeriodFilterOptions();

    // Set period to 'all' only on the very first load
    if (isFirstLoad) {
      const pFilter = document.getElementById('period-filter');
      const pFilterMob = document.getElementById('period-filter-mobile');
      if (pFilter) pFilter.value = 'all';
      if (pFilterMob) pFilterMob.value = 'all';
      isFirstLoad = false;
    } else {
      // For subsequent loads (refreshes), keep the current user choice
      const lastPeriod = localStorage.getItem('vendly_last_period');
      if (lastPeriod) {
        const pFilter = document.getElementById('period-filter');
        const pFilterMob = document.getElementById('period-filter-mobile');
        if (pFilter) pFilter.value = lastPeriod;
        if (pFilterMob) pFilterMob.value = lastPeriod;
      }
    }

    dashboard.aplicarFiltroPeriodo({ onRender: RENDER_PIPELINE.renderVisuals });
    isAppInitializing = false;
  },
  onBrandsLoaded: (data) => {
    const brandSelect = document.getElementById('table-brand');
    if (brandSelect) {
      brandSelect.innerHTML = '<option value="all">Todas Categorias</option>';
      data.categories.forEach(b => brandSelect.innerHTML += `<option value="${b}">${b}</option>`);
    }

    const condSelect = document.getElementById('table-condition');
    if (condSelect) {
      condSelect.innerHTML = '<option value="all">Todas Condições</option>';
      data.conditions.forEach(c => condSelect.innerHTML += `<option value="${c}">${c}</option>`);
    }

    const storageSelect = document.getElementById('table-storage');
    if (storageSelect) {
      storageSelect.innerHTML = '<option value="all">Todos Armaz.</option>';
      data.storage.forEach(s => storageSelect.innerHTML += `<option value="${s}">${s}</option>`);
    }
  },
  renderVisuals: () => {
    try {
      // 1. Core Analytics (Global)
      analytics.calcularKPIsEInsights();
      analytics.renderCharts();
      analytics.renderRankings();
      
      // 2. Specialized Tab Rendering
      const activeTabId = ui.getActiveTabId();
      if (!activeTabId) return;

      if (activeTabId === 'tab-geral') {
         // Default views already handled by global analytics
      }
      
      if (activeTabId === 'tab-metricas') {
        renderMetricas();
      }
      
      if (activeTabId === 'tab-vendas-historico') {
        dashboard.renderTable({ 
          onStatusUpdated: RENDER_PIPELINE.onDataLoaded, 
          onRender: RENDER_PIPELINE.renderVisuals, 
          dataCallbacks: RENDER_PIPELINE 
        });
      }
      
      if (activeTabId === 'tab-fiado') {
        fiado.initAndRender();
      }
      
      if (activeTabId === 'tab-estoque') {
        inventory.renderEstoque({ 
          onEdit: inventory.abrirModalEdicao, 
          dataCallbacks: RENDER_PIPELINE 
        });
      }
      
      if (activeTabId === 'tab-encomendados') {
        compras.initAndRender();
      }

      refreshActiveCount();
    } catch (err) {
      console.error('Erro ao renderizar visuais:', err);
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
  const btnTabMetricas = document.getElementById('tab-btn-metricas');
  const btnTabVendasHistorico = document.getElementById('tab-btn-vendas-historico');
  const btnTabFiado = document.getElementById('tab-btn-fiado');
  const btnTabEstoque = document.getElementById('tab-btn-estoque');
  const btnTabEncomendados = document.getElementById('tab-btn-encomendados');

  const tabGeral = document.getElementById('tab-geral');
  const tabEstrategia = document.getElementById('tab-estrategia');
  const tabMetricas = document.getElementById('tab-metricas');
  const tabVendasHistorico = document.getElementById('tab-vendas-historico');
  const tabFiado = document.getElementById('tab-fiado');
  const tabEstoque = document.getElementById('tab-estoque');
  const tabEncomendados = document.getElementById('tab-encomendados');

  const tabs = [tabGeral, tabEstrategia, tabMetricas, tabVendasHistorico, tabFiado, tabEstoque, tabEncomendados];
  const btns = [btnTabGeral, btnTabEstrategia, btnTabMetricas, btnTabVendasHistorico, btnTabFiado, btnTabEstoque, btnTabEncomendados];

  const globalFilterWrap = document.getElementById('global-filter-wrap');
  const globalFilterWrapMobile = document.getElementById('global-filter-wrap-mobile');

  const showGlobalFilters = (show) => {
    // Desktop: toggle visibility via style (the element has hidden lg:flex by default)
    if (globalFilterWrap) {
      if (show) {
        globalFilterWrap.classList.remove('!hidden');
      } else {
        globalFilterWrap.classList.add('!hidden');
      }
    }
    // Mobile: toggle the separate filter row
    if (globalFilterWrapMobile) {
      globalFilterWrapMobile.style.display = show ? '' : 'none';
    }
  };

  // Helper: close mobile sidebar
  const sidebar = document.getElementById('app-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const mainWrapper = document.getElementById('main-wrapper');

  const closeMobileSidebar = () => {
    sidebar?.classList.remove('mobile-open');
    overlay?.classList.remove('active');
    document.body.classList.remove('sidebar-open');
  };

  btnTabGeral?.addEventListener('click', () => {
    ui.setTab(btnTabGeral, tabGeral, btns, tabs);
    showGlobalFilters(true);
    closeMobileSidebar();
  });
  btnTabEstrategia?.addEventListener('click', () => {
    ui.setTab(btnTabEstrategia, tabEstrategia, btns, tabs);
    showGlobalFilters(true);
    closeMobileSidebar();
  });
  btnTabMetricas?.addEventListener('click', () => {
    ui.setTab(btnTabMetricas, tabMetricas, btns, tabs);
    showGlobalFilters(false);
    renderMetricas();
    closeMobileSidebar();
  });

  // Operação Listeners
  btnTabVendasHistorico?.addEventListener('click', () => {
    ui.setTab(btnTabVendasHistorico, tabVendasHistorico, btns, tabs);
    showGlobalFilters(false);
    dashboard.renderTable({
      onStatusUpdated: RENDER_PIPELINE.onDataLoaded,
      onRender: RENDER_PIPELINE.renderVisuals,
      dataCallbacks: RENDER_PIPELINE
    });
    closeMobileSidebar();
  });
  btnTabFiado?.addEventListener('click', () => {
    ui.setTab(btnTabFiado, tabFiado, btns, tabs);
    showGlobalFilters(false);
    fiado.initAndRender();
    closeMobileSidebar();
  });
  btnTabEstoque?.addEventListener('click', () => {
    ui.setTab(btnTabEstoque, tabEstoque, btns, tabs);
    showGlobalFilters(false);
    inventory.renderEstoque({ onEdit: inventory.abrirModalEdicao, dataCallbacks: RENDER_PIPELINE });
    closeMobileSidebar();
  });
  btnTabEncomendados?.addEventListener('click', () => {
    ui.setTab(btnTabEncomendados, tabEncomendados, btns, tabs);
    showGlobalFilters(false);
    compras.initAndRender();
    closeMobileSidebar();
  });

  // Submenu Toggle
  const btnVendasParent = document.getElementById('btn-vendas-parent');
  const submenuVendas = document.getElementById('submenu-vendas');

  btnVendasParent?.addEventListener('click', () => {
    const isExpanded = btnVendasParent.classList.contains('expanded');

    // Toggle classes
    btnVendasParent.classList.toggle('expanded');
    submenuVendas?.classList.toggle('expanded');

    // Rotate chevron is handled by CSS on .expanded
  });

  // ---- SIDEBAR COLLAPSE / MOBILE DRAWER ----
  const toggleBtn = document.getElementById('btn-sidebar-toggle');
  const mobileBtn = document.getElementById('btn-sidebar-mobile');
  const SIDEBAR_KEY = 'vendly_sidebar_collapsed';

  const updateSidebarState = (collapsed) => {
    if (!sidebar) return;
    sidebar.classList.toggle('collapsed', collapsed);
    // Only apply margin on desktop (lg = 1024px+)
    if (window.innerWidth >= 1024 && mainWrapper) {
      mainWrapper.style.marginLeft = collapsed ? 'var(--sidebar-collapsed-w)' : '';
    }

    if (toggleBtn) {
      const ico = toggleBtn.querySelector('i');
      if (ico) ico.style.transform = collapsed ? 'rotate(180deg)' : '';
      toggleBtn.title = collapsed ? 'Expandir Sidebar' : 'Recolher Sidebar';
    }
  };

  // Restore saved state (desktop only - lg breakpoint = 1024px)
  if (sidebar && window.innerWidth >= 1024 && localStorage.getItem(SIDEBAR_KEY) === '1') {
    updateSidebarState(true);
  }

  toggleBtn?.addEventListener('click', () => {
    const isNowCollapsed = !sidebar.classList.contains('collapsed');
    updateSidebarState(isNowCollapsed);
    localStorage.setItem(SIDEBAR_KEY, isNowCollapsed ? '1' : '0');
  });

  mobileBtn?.addEventListener('click', () => {
    sidebar?.classList.add('mobile-open');
    overlay?.classList.add('active');
    document.body.classList.add('sidebar-open');
  });

  overlay?.addEventListener('click', closeMobileSidebar);

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
  document.getElementById('btn-refresh-mobile')?.addEventListener('click', () => store.loadDashboardData(RENDER_PIPELINE));
  document.getElementById('btn-retry')?.addEventListener('click', () => store.loadDashboardData(RENDER_PIPELINE));

  // Period Filter (with auto-refresh) - Desktop
  const periodFilter = document.getElementById('period-filter');
  const periodFilterMobile = document.getElementById('period-filter-mobile');
  let isSyncingFilters = false;

  // Sync helper: when one filter changes, mirror to the other and trigger refresh
  const handlePeriodChange = async (sourceFilter, otherFilter) => {
    if (isSyncingFilters || isAppInitializing) return;
    isSyncingFilters = true;

    const val = sourceFilter.value;
    if (otherFilter) otherFilter.value = val;
    localStorage.setItem('vendly_last_period', val);

    // Toggle custom date wraps
    document.getElementById('custom-date-wrap')?.classList.toggle('hidden', val !== 'custom');
    const mobileWrap = document.getElementById('custom-date-wrap-mobile');
    if (mobileWrap) mobileWrap.classList.toggle('hidden', val !== 'custom');

    if (val !== 'custom') {
      await store.loadDashboardData(RENDER_PIPELINE, true);
    }
    dashboard.aplicarFiltroPeriodo({ onRender: RENDER_PIPELINE.renderVisuals });
    isSyncingFilters = false;
  };

  periodFilter?.addEventListener('change', () => handlePeriodChange(periodFilter, periodFilterMobile));
  periodFilterMobile?.addEventListener('change', () => handlePeriodChange(periodFilterMobile, periodFilter));
  // Custom date inputs - Desktop
  const dateInputs = ['date-start', 'date-end', 'date-start-mobile', 'date-end-mobile', 'table-date-start', 'table-date-end', 'table-date-start-quick', 'table-date-end-quick'];
  dateInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', ui.applyDateMask);
  });

  // Helper for hidden native date pickers (Delegated to handle dynamic modals)
  document.body.addEventListener('change', (e) => {
    if (e.target.classList.contains('js-date-picker-helper')) {
      const targetId = e.target.dataset.target;
      const targetInput = document.getElementById(targetId);
      if (targetInput && e.target.value) {
        const [y, m, d] = e.target.value.split('-');
        targetInput.value = `${d}/${m}/${y}`;
        // Trigger the original input's change event to refresh any bound logic
        targetInput.dispatchEvent(new Event('change', { bubbles: true }));
        targetInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  });

  const handleCustomDateChange = async (val, otherId) => {
    const other = document.getElementById(otherId);
    if (other) other.value = val;
    if (val.length === 10) {
      await store.loadDashboardData(RENDER_PIPELINE, true);
      dashboard.aplicarFiltroPeriodo({ onRender: RENDER_PIPELINE.renderVisuals });
    }
  };

  document.getElementById('date-start')?.addEventListener('change', (e) => handleCustomDateChange(e.target.value, 'date-start-mobile'));
  document.getElementById('date-end')?.addEventListener('change', (e) => handleCustomDateChange(e.target.value, 'date-end-mobile'));
  document.getElementById('date-start-mobile')?.addEventListener('change', (e) => handleCustomDateChange(e.target.value, 'date-start'));
  document.getElementById('date-end-mobile')?.addEventListener('change', (e) => handleCustomDateChange(e.target.value, 'date-end'));

  document.getElementById('table-date-start')?.addEventListener('change', () => {
    dashboard.renderTable({ onStatusUpdated: RENDER_PIPELINE.onDataLoaded, onRender: RENDER_PIPELINE.renderVisuals, dataCallbacks: RENDER_PIPELINE });
  });
  document.getElementById('table-date-end')?.addEventListener('change', () => {
    dashboard.renderTable({ onStatusUpdated: RENDER_PIPELINE.onDataLoaded, onRender: RENDER_PIPELINE.renderVisuals, dataCallbacks: RENDER_PIPELINE });
  });

  // Novo Pedido Manual
  document.getElementById('btn-novo-pedido')?.addEventListener('click', dashboard.abrirModalNovoPedido);
  document.getElementById('btn-novo-pedido-vendas')?.addEventListener('click', dashboard.abrirModalNovoPedido);
  document.getElementById('novo-pedido-close')?.addEventListener('click', dashboard.fecharModalNovoPedido);
  document.getElementById('novo-pedido-cancel')?.addEventListener('click', dashboard.fecharModalNovoPedido);
  document.getElementById('novo-pedido-submit')?.addEventListener('click', () => dashboard.salvarPedidoManual({ dataCallbacks: RENDER_PIPELINE, onRender: RENDER_PIPELINE.renderVisuals }));







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

  // View Toggle Estoque
  ui.setupViewToggle('view-estoque-list', 'view-estoque-grid', 'vendly_estoque_view', () => {
    inventory.renderEstoque({ onEdit: inventory.abrirModalEdicao, dataCallbacks: RENDER_PIPELINE });
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

  fiado.setupListeners();

  // Initialize new Sales Filter system
  dashboard.initDashboardListeners(RENDER_PIPELINE);
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
