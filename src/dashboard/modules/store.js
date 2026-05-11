import { CONFIG } from '../../shared/config.js';
import { toggleLoading, parseNumber } from './ui.js';

export const state = {
  allOrders: [],
  allProducts: [],
  filteredOrders: [],
  previousOrders: [],
  tableSearchTerm: "",
  tableBrandFilter: "all",
  tableStatusFilter: "all",
  tableConditionFilter: "all",
  tableStorageFilter: "all",
  tablePeriodFilter: "all",
  tablePaymentFilter: "all",
  tableMarginFilter: "all",
  tableNegotiatedOnly: false,
  tableLossOnly: false,
  viewPreference: "list",
  currentPeriodStart: null,
  currentPeriodEnd: null,
  allFiados: [],
  allEncomendas: [],
  isFetching: false,
  isSilentRefresh: false
};

export async function fetchJSON(url) {
  const urlComCacheBuster = url.includes('?') ? `${url}&_t=${new Date().getTime()}` : `${url}?_t=${new Date().getTime()}`;
  const res = await fetch(urlComCacheBuster, { cache: 'no-store' });
  if (!res.ok) throw new Error('Erro na rede.');
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Erro da API.');
  return json.data || [];
}

export async function fetchPedidosEProdutos() {
  return Promise.all([
    fetchJSON(`${CONFIG.apiBaseUrl}?action=pedidos`),
    fetchJSON(`${CONFIG.apiBaseUrl}?action=produtos`),
    fetchJSON(`${CONFIG.apiBaseUrl}?action=fiados`),
    fetchJSON(`${CONFIG.apiBaseUrl}?action=encomendados`)
  ]);
}

export async function uploadImageToDrive(base64, filename) {
  const resp = await fetch(`${CONFIG.apiBaseUrl}?action=upload_imagem`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ base64, filename })
  });
  const json = await resp.json();
  if (!json.ok) throw new Error(json.error || 'Erro no upload');
  return json.url;
}

export async function loadDashboardData(callbacks, silent = false) {
  state.isSilentRefresh = silent;
  if (!silent) toggleLoading(true);
  state.isFetching = true;
  
  // Trigger immediate render if possible to show skeletons
  if (callbacks.onLoadingStarted) callbacks.onLoadingStarted();

  try {
    const [rawPedidos, rawProdutos, rawFiados, rawEncomendas] = await fetchPedidosEProdutos();

    state.allProducts = rawProdutos;
    state.allFiados = rawFiados;
    state.allEncomendas = rawEncomendas || [];

    // Trigger callback to populate brand select
    if (callbacks.onBrandsLoaded) {
      const categories = Array.from(new Set(rawProdutos.map(p => p.categoria).filter(Boolean))).sort();
      const conditions = Array.from(new Set(rawProdutos.map(p => p.condição || p.condicao).filter(Boolean))).sort();
      const storage = Array.from(new Set(rawProdutos.map(p => p.armazenamento).filter(Boolean))).sort();
      
      callbacks.onBrandsLoaded({ categories, conditions, storage });
    }

    state.allOrders = rawPedidos.map(order => ({
      ...order,
      item_id: order.id_do_item || null,
      parsedDate: (() => {
        if (!order.data) return new Date(0);
        
        // INTERCEPT BR format strings first!
        // If it starts with DD/MM/YYYY, new Date() might incorrectly parse it as MM/DD/YYYY
        if (typeof order.data === 'string' && /^\d{2}\/\d{2}\/\d{4}/.test(order.data)) {
          const parts = order.data.split(/[\/\s-:]/);
          const day = parts[0];
          const month = parts[1];
          const year = parts[2];
          const hr = parts[3] || '12';
          const mn = parts[4] || '00';
          const sc = parts[5] || '00';
          return new Date(`${year}-${month}-${day}T${hr}:${mn}:${sc}`);
        }
        
        const d = new Date(order.data);
        if (!isNaN(d.getTime())) return d;
        
        return new Date(0);
      })(),
      quantidade: parseInt(order.quantidade) || 1,
      total: parseNumber(order.total),
      final_price: order.preço_final ? parseNumber(order.preço_final) : null,
      status: order.status || 'Pendente',
      condicao: order.condição || order.condicao || 'Novo'
    })).sort((a, b) => b.parsedDate - a.parsedDate);

    state.isFetching = false;
    // Trigger render pipeline
    if (callbacks.onDataLoaded) callbacks.onDataLoaded();
    
    state.isSilentRefresh = false;

    if (!silent) toggleLoading(false, true, state.allOrders.length > 0);
  } catch (error) {
    state.isFetching = false;
    console.error(error);
    if (!silent) toggleLoading(false, false);
  }
}
