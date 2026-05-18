/**
 * Cashflow Module — Filters
 * Period resolution, search, type/status filtering
 */

import { cashflowState } from './state.js';
import { isConfirmedMovement, isAberturaCaixa } from './calculations.js';

/**
 * Get start/end Date for a named period filter
 */
export function getPeriodRange(filterValue) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (filterValue) {
    case 'today':
      return { start: today, end: new Date(today.getTime() + 86400000 - 1) };

    case 'week': {
      const dayOfWeek = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      return { start: monday, end: new Date(today.getTime() + 86400000 - 1) };
    }

    case 'month': {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
      return { start: firstDay, end: lastDay };
    }

    case 'max':
      return { start: new Date(2020, 0, 1), end: new Date(2100, 0, 1) };

    case 'custom': {
      const s = cashflowState.customDateStart;
      const e = cashflowState.customDateEnd;
      return {
        start: s ? safeParseDate(s) : new Date(2020, 0, 1),
        end: e ? new Date(safeParseDate(e).getTime() + 86400000 - 1) : new Date(2100, 0, 1)
      };
    }

    default: // 'all'
      return { start: new Date(2020, 0, 1), end: new Date(2100, 0, 1) };
  }
}

function safeParseDate(val) {
  if (!val) return new Date();
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Filter movements based on current state
 */
export function getFilteredMovements(allMovements) {
  const { periodFilter, typeFilter, statusFilter, searchTerm } = cashflowState;
  const { start, end } = getPeriodRange(periodFilter);

  return allMovements.filter(m => {
    // Period filter
    const d = m.parsedDate instanceof Date ? m.parsedDate : new Date(m.data || 0);
    if (d < start || d > end) return false;

    // Type filter
    if (typeFilter !== 'all' && m.tipo !== typeFilter) return false;

    // Status filter
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchDesc = (m.descricao || '').toLowerCase().includes(term);
      const matchCat = (m.categoria || '').toLowerCase().includes(term);
      const matchObs = (m.observacao || '').toLowerCase().includes(term);
      if (!matchDesc && !matchCat && !matchObs) return false;
    }

    return true;
  });
}

/**
 * Filter ALL movements (ignoring period) — for Caixa Disponível calculation.
 * Only confirmed/paid movements count as real money.
 * The opening balance is always included so calcSaldoAtual can detect and use it.
 */
export function getAllTimeMovements(allMovements) {
  return allMovements.filter(m => isConfirmedMovement(m) || isAberturaCaixa(m));
}
