/**
 * Cashflow Module — DOM Rendering
 * Reads from state, writes to DOM.
 */

import { cashflowState } from './state.js';
import { calcEntradas, calcSaidas, calcSaldoPeriodo, calcSaldoAtual, calcPendenteReceber, calcPendentePagar, calcEntradasPorOrigem, calcSaidasPorCategoria, findAberturaCaixa, calcCapitalImobilizado } from './calculations.js';
import { getFilteredMovements, getAllTimeMovements } from './filters.js';
import { cardsTemplate, resumoTemplate, tableRowsTemplate, insightsTemplate, aberturaBannerTemplate } from './templates.js';
import { formatMoney } from '../ui.js';
import { state } from '../store.js';

/**
 * Render all visuals (cards, resumo, table, banner)
 */
export function renderAll() {
  const filtered = getFilteredMovements(cashflowState.allMovements);
  const allTime = getAllTimeMovements(cashflowState.allMovements);

  // Detect opening balance
  cashflowState.aberturaCaixa = findAberturaCaixa(cashflowState.allMovements);

  renderAberturaBanner();
  renderCards(filtered, allTime);
  renderResumo(filtered);
  renderTable(filtered);
}

/**
 * Render the abertura de caixa banner (only if no opening balance exists)
 */
function renderAberturaBanner() {
  const container = document.getElementById('cf-abertura-banner-container');
  if (!container) return;

  container.innerHTML = aberturaBannerTemplate(!!cashflowState.aberturaCaixa);

  // Bind the banner CTA button
  document.getElementById('cf-banner-abertura-btn')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('cf:open-abertura'));
  });
}

/**
 * Render the 5 metric cards
 */
function renderCards(filtered, allTime) {
  const container = document.getElementById('cf-cards');
  if (!container) return;

  container.innerHTML = cardsTemplate({
    saldoPeriodo: calcSaldoPeriodo(filtered),
    entradas: calcEntradas(filtered),
    saidas: calcSaidas(filtered),
    caixaDisponivel: calcSaldoAtual(allTime),
    pendenteReceber: calcPendenteReceber(state.allFiados),
    pendentePagar: calcPendentePagar(state.allEncomendas),
    patrimonioOperacional: calcSaldoAtual(allTime) + calcCapitalImobilizado(state.allProducts, state.allEncomendas)
  });

  // Animate cards in only if NOT a silent refresh
  if (!state.isSilentRefresh) {
    container.querySelectorAll('.cf-card').forEach((card, i) => {
      card.style.animationDelay = `${i * 60}ms`;
      card.classList.add('cf-card-animate');
    });
  }
}

/**
 * Render the resumo visual section
 */
function renderResumo(filtered) {
  const containerResumo = document.getElementById('cf-resumo');
  if (containerResumo) {
    const origens = calcEntradasPorOrigem(filtered);
    const categorias = calcSaidasPorCategoria(filtered);
    containerResumo.innerHTML = resumoTemplate(origens, categorias);
  }

  // Generate Insights
  const containerInsights = document.getElementById('cf-insights-container');
  if (containerInsights) {
    const insights = [];
    const totalEntradas = calcEntradas(filtered);
    const totalSaidas = calcSaidas(filtered);

    if (totalEntradas > 0 || totalSaidas > 0) {
      if (totalEntradas > 0) {
        // Encontrar a maior origem
        const origens = calcEntradasPorOrigem(filtered);
        if (origens.length > 0) {
          const maior = origens[0];
          const pct = Math.round((maior.valor / totalEntradas) * 100);
          insights.push({ icon: 'fa-solid fa-arrow-trend-up', text: `${maior.label} representa ${pct}% das entradas` });
        }
      }

      if (totalSaidas > 0) {
        // Encontrar a maior categoria de saída
        const categorias = calcSaidasPorCategoria(filtered);
        if (categorias.length > 0) {
          const maior = categorias[0];
          const pct = Math.round((maior.valor / totalSaidas) * 100);
          insights.push({ icon: 'fa-solid fa-arrow-trend-down', text: `${maior.label} representa ${pct}% das saídas` });
        }
      }

      const pendentePagar = calcPendentePagar(state.allEncomendas);
      if (pendentePagar > 0) {
        insights.push({ icon: 'fa-solid fa-file-invoice-dollar', text: `${formatMoney(pendentePagar)} pendentes de pagamento em compras.` });
      }
    }

    containerInsights.innerHTML = insightsTemplate(insights);
  }
}

/**
 * Render the movements table
 */
function renderTable(filtered) {
  const tbody = document.getElementById('cf-tbody');
  if (!tbody) return;

  tbody.innerHTML = tableRowsTemplate(filtered);

  // Bind delete buttons
  tbody.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const desc = btn.dataset.desc || 'Sem descrição';
      const valor = btn.dataset.valor || '0';
      const tipo = btn.dataset.tipo || '';

      if (id) {
        window.dispatchEvent(new CustomEvent('cf:delete-movement', {
          detail: { id, desc, valor, tipo }
        }));
      }
    });
  });

  // Bind edit buttons (manual movements only)
  tbody.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (id) {
        window.dispatchEvent(new CustomEvent('cf:edit-movement', { detail: { id } }));
      }
    });
  });

  // Bind edit-abertura buttons
  tbody.querySelectorAll('[data-action="edit-abertura"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.dispatchEvent(new CustomEvent('cf:open-abertura'));
    });
  });
}
