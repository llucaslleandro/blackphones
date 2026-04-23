import { state } from '../store.js';

/**
 * Calculates all derived metrics needed for the strategic analysis.
 */
export function calculateMetrics(curr, prev, calcVar, prodCounts) {
  const conversao = curr.totais > 0 ? (curr.fechados / curr.totais) * 100 : 0;
  const ticketMedio = curr.totais > 0 ? (curr.fatBase + curr.fatPendente + curr.fatCancelado) / curr.totais : 0;

  const prodsObj = Object.keys(prodCounts)
    .map(k => ({ nome: k, val: prodCounts[k] }))
    .sort((a, b) => b.val - a.val);
  const topProduto = prodsObj.length > 0 ? prodsObj[0] : null;

  const growth = prev.totais > 0 ? calcVar(curr.fatBase, prev.fatBase) : null;

  const soldSet = new Set(state.filteredOrders.map(o => o.produto ? o.produto.toLowerCase() : ''));
  const idleList = state.allProducts.filter(p => !soldSet.has(p.nome.toLowerCase()));

  return {
    conversao,
    ticketMedio,
    topProduto,
    growth,
    idleCount: idleList.length,
    curr,
    prev
  };
}
