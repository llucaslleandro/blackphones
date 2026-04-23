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
  tablePeriodFilter: "all"
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
    fetchJSON(`${CONFIG.apiBaseUrl}?action=produtos`)
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
  if (!silent) toggleLoading(true);
  try {
    const [rawPedidos, rawProdutos] = await fetchPedidosEProdutos();

    state.allProducts = rawProdutos;

    // Trigger callback to populate brand select
    if (callbacks.onBrandsLoaded) {
      const brands = new Set(rawProdutos.map(p => p.categoria || 'N/A').filter(b => b !== 'N/A'));
      callbacks.onBrandsLoaded(Array.from(brands));
    }

    state.allOrders = rawPedidos.map(order => ({
      ...order,
      item_id: order.id_do_item || null,
      parsedDate: order.data ? new Date(order.data) : new Date(0),
      quantidade: parseInt(order.quantidade) || 1,
      total: parseNumber(order.total),
      final_price: order.preço_final ? parseNumber(order.preço_final) : null,
      status: order.status || 'Pendente',
      condicao: order.condição || order.condicao || 'Novo'
    })).sort((a, b) => b.parsedDate - a.parsedDate);

    // Trigger render pipeline
    if (callbacks.onDataLoaded) callbacks.onDataLoaded();

    if (!silent) toggleLoading(false, true, state.allOrders.length > 0);
  } catch (error) {
    console.error(error);
    if (!silent) toggleLoading(false, false);
  }
}
