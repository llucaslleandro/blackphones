/**
 * Cashflow Module — Local State
 * Isolated state for the cash flow tab
 */

export const cashflowState = {
  // Movimentações manuais (from API)
  manualMovements: [],

  // All merged movements (auto + manual)
  allMovements: [],

  // Abertura de Caixa (opening balance movement, or null)
  aberturaCaixa: null,

  // Filters
  periodFilter: 'month',   // today | week | month | custom
  typeFilter: 'all',        // all | entrada | saida
  statusFilter: 'all',      // all | confirmado | pendente | cancelado
  searchTerm: '',
  customDateStart: null,
  customDateEnd: null,

  // UI state
  isModalOpen: false,
  isAberturaCaixaModalOpen: false,
  isLoading: false,
  isInitialized: false
};
