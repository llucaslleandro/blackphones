/**
 * Cashflow Module — Pure Calculation Functions
 * No DOM access, no side effects — just math.
 */

import { parseNumber } from '../ui.js';

/**
 * Well-known ID for the opening balance movement
 */
export const ABERTURA_CAIXA_ID = 'ABERTURA-CAIXA';
export const ABERTURA_CAIXA_CATEGORIA = 'Abertura de Caixa';

/**
 * Statuses that represent confirmed/real money movement.
 * Only these impact Caixa Disponível and confirmed totals.
 */
const CONFIRMED_STATUSES = ['confirmado', 'pago'];

/**
 * Check if a movement represents confirmed (real) money.
 * Pending, projected, awaiting, or cancelled movements return false.
 */
export function isConfirmedMovement(movement) {
  return CONFIRMED_STATUSES.includes(String(movement.status || '').toLowerCase());
}

/**
 * Check if a movement is the opening balance entry
 */
export function isAberturaCaixa(movement) {
  return movement.id === ABERTURA_CAIXA_ID ||
    String(movement.categoria || '').toLowerCase() === ABERTURA_CAIXA_CATEGORIA.toLowerCase();
}

/**
 * Find the opening balance movement from a list, if it exists
 */
export function findAberturaCaixa(allMovements) {
  return allMovements.find(m => isAberturaCaixa(m)) || null;
}

/**
 * Sum all entradas confirmadas in a set of movements
 */
export function calcEntradas(movements) {
  return movements
    .filter(m => m.tipo === 'entrada' && isConfirmedMovement(m) && !isAberturaCaixa(m))
    .reduce((sum, m) => sum + (Number(m.valor) || 0), 0);
}

/**
 * Sum all saídas confirmadas in a set of movements
 */
export function calcSaidas(movements) {
  return movements
    .filter(m => m.tipo === 'saida' && isConfirmedMovement(m))
    .reduce((sum, m) => sum + (Number(m.valor) || 0), 0);
}

/**
 * Saldo do período = entradas confirmadas - saídas confirmadas (filtered)
 * Excludes opening balance from the period calculation.
 */
export function calcSaldoPeriodo(movements) {
  return calcEntradas(movements) - calcSaidas(movements);
}

/**
 * Caixa Disponível = abertura + entradas confirmadas (após cutoff) - saídas confirmadas (após cutoff)
 *
 * If an opening balance exists, only movements on or after its date are counted.
 * The opening balance value itself is added as the starting point.
 * If no opening balance, behaves as before (all-time sum from zero).
 */
export function calcSaldoAtual(allMovements) {
  const abertura = findAberturaCaixa(allMovements);

  let movimentsToSum = allMovements;
  let aberturaValor = 0;

  if (abertura) {
    aberturaValor = Number(abertura.valor) || 0;
    const cutoffDate = abertura.parsedDate instanceof Date ? abertura.parsedDate : new Date(abertura.data || 0);

    // Only count movements on or after the cutoff date, excluding the opening itself
    movimentsToSum = allMovements.filter(m => {
      if (isAberturaCaixa(m)) return false;
      const d = m.parsedDate instanceof Date ? m.parsedDate : new Date(m.data || 0);
      return d >= cutoffDate;
    });
  }

  const entradas = movimentsToSum
    .filter(m => m.tipo === 'entrada' && isConfirmedMovement(m))
    .reduce((sum, m) => sum + (Number(m.valor) || 0), 0);
  const saidas = movimentsToSum
    .filter(m => m.tipo === 'saida' && isConfirmedMovement(m))
    .reduce((sum, m) => sum + (Number(m.valor) || 0), 0);

  return aberturaValor + entradas - saidas;
}

/**
 * Pendente a receber = fiados pendentes + parcelas não pagas
 */
export function calcPendenteReceber(fiados) {
  let total = 0;
  (fiados || []).forEach(f => {
    if (f.status === 'cancelado' || f.status === 'quitado') return;
    const parcelas = f.parcelas || [];
    parcelas.forEach(p => {
      if (p.status !== 'pago') {
        total += Number(p.valor || 0);
      }
    });
  });
  return total;
}

/**
 * Pendente a pagar = compras não pagas (pendente) + restos de pagamentos parciais
 */
export function calcPendentePagar(encomendas) {
  let total = 0;
  const lotesMap = {};
  
  (encomendas || []).forEach(e => {
    const lid = e.lote_id || e.id;
    if (!lotesMap[lid]) {
      lotesMap[lid] = {
        status_pagamento: String(e.status_pagamento || '').toLowerCase(),
        valor_pendente: Number(e.valor_pendente_lote) || 0,
        frete: Number(e.custo_frete) || 0,
        taxas: Number(e.custo_taxas) || 0,
        adicLote: Number(e.custo_adicional_lote) || 0,
        items: []
      };
    }
    lotesMap[lid].items.push(e);
  });

  Object.values(lotesMap).forEach(lote => {
    if (lote.status_pagamento === 'pago') return;
    
    if (lote.status_pagamento === 'parcial') {
      total += lote.valor_pendente;
    } else {
      // pendente ou vazio -> custo total do lote
      let totalLote = lote.frete + lote.taxas + lote.adicLote;
      lote.items.forEach(i => {
        totalLote += Number(i.custo_compra || i.custo || i.custo_total || 0);
      });
      total += totalLote;
    }
  });

  return total;
}

/**
 * Group entradas by origem (categoria) — excludes opening balance
 */
export function calcEntradasPorOrigem(movements) {
  const map = {};
  movements
    .filter(m => m.tipo === 'entrada' && isConfirmedMovement(m) && !isAberturaCaixa(m))
    .forEach(m => {
      const cat = m.categoria || 'Outros';
      map[cat] = (map[cat] || 0) + (Number(m.valor) || 0);
    });
  return Object.entries(map)
    .map(([label, valor]) => ({ label, valor }))
    .sort((a, b) => b.valor - a.valor);
}

/**
 * Group saídas by categoria
 */
export function calcSaidasPorCategoria(movements) {
  const map = {};
  movements
    .filter(m => m.tipo === 'saida' && isConfirmedMovement(m))
    .forEach(m => {
      const cat = m.categoria || 'Outros';
      map[cat] = (map[cat] || 0) + (Number(m.valor) || 0);
    });
  return Object.entries(map)
    .map(([label, valor]) => ({ label, valor }))
    .sort((a, b) => b.valor - a.valor);
}

/**
 * Capital Imobilizado = Capital em Estoque + Capital em Trânsito (Encomendas Pendentes)
 */
export function calcCapitalImobilizado(allProducts, allEncomendas) {
  let capitalEstoque = 0;
  (allProducts || []).forEach(p => {
    if (String(p.ativo) === 'true' && parseNumber(p.estoque) > 0) {
      capitalEstoque += ((parseNumber(p.custo) || parseNumber(p.preco_custo) || 0) * parseNumber(p.estoque));
    }
  });

  let capitalTransito = 0;
  const lotesMap = {};
  (allEncomendas || []).forEach(e => {
    const lid = e.lote_id || e.id;
    if (!lotesMap[lid]) {
      lotesMap[lid] = {
        frete: parseNumber(e.custo_frete) || 0,
        taxas: parseNumber(e.custo_taxas) || 0,
        adicLote: parseNumber(e.custo_adicional_lote) || 0,
        items: []
      };
    }
    lotesMap[lid].items.push(e);
  });
  
  Object.values(lotesMap).forEach(lote => {
    const loteTotalCustosExtra = lote.frete + lote.taxas + lote.adicLote;
    const rateio = lote.items.length > 0 ? loteTotalCustosExtra / lote.items.length : 0;

    lote.items.forEach(i => {
      if (i.status === 'encomendado' || i.status === 'pendente') {
        let custoItemReal = 0;
        if (i.custo_total !== undefined && i.custo_total !== null && String(i.custo_total) !== '') {
          custoItemReal = parseNumber(i.custo_total) || 0;
        } else {
          custoItemReal = (parseNumber(i.custo_compra) || 0) + rateio;
        }
        capitalTransito += custoItemReal;
      }
    });
  });

  return capitalEstoque + capitalTransito;
}

