import { CONFIG, applyTheme } from '../shared/config.js';
import * as ui from './modules/ui.js';
import * as store from './modules/store.js';
import * as analytics from './modules/analytics.js';
import * as dashboard from './modules/dashboard.js';
import * as inventory from './modules/inventory.js';
import * as notifications from './modules/notifications.js';
import { initOnboarding } from './modules/onboarding.js';
import { renderMetricas, refreshActiveCount } from './modules/metrics.js';

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
      brandSelect.innerHTML = '<option value="all">Todas Marcas</option>';
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

  // Image Upload
  document.getElementById('cad-img-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      document.getElementById('cad-img-loading')?.classList.remove('hidden');
      document.getElementById('cad-img-placeholder')?.classList.add('hidden');
      try {
        const compressed = await ui.compressImage(file);
        const url = await store.uploadImageToDrive(compressed, file.name);
        document.getElementById('cad-imagem').value = url;
        document.getElementById('cad-img-thumb').src = compressed;
        document.getElementById('cad-img-preview')?.classList.remove('hidden');
        ui.showToast('Imagem enviada!', 'green', 'fa-check');
      } catch (err) {
        ui.showToast('Erro no upload', 'red', 'fa-xmark');
      } finally {
        document.getElementById('cad-img-loading')?.classList.add('hidden');
      }
    }
  });
}

// Start
init();
