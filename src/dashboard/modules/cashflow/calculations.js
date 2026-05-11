/**
 * Cashflow Module — Pure Calculation Functions
 * No DOM access, no side effects — just math.
 */

/**
 * Sum all entradas in a set of movements
 */
export function calcEntradas(movements) {
  return movements
    .filter(m => m.tipo === 'entrada' && m.status !== 'cancelado')
    .reduce((sum, m) => sum + (Number(m.valor) || 0), 0);
}

/**
 * Sum all saídas in a set of movements
 */
export function calcSaidas(movements) {
  return movements
    .filter(m => m.tipo === 'saida' && m.status !== 'cancelado')
    .reduce((sum, m) => sum + (Number(m.valor) || 0), 0);
}

/**
 * Saldo do período = entradas - saídas (filtered)
 */
export function calcSaldoPeriodo(movements) {
  return calcEntradas(movements) - calcSaidas(movements);
}

/**
 * Saldo atual = all-time entradas - saídas (no period filter)
 */
export function calcSaldoAtual(allMovements) {
  const entradas = allMovements
    .filter(m => m.tipo === 'entrada' && m.status !== 'cancelado')
    .reduce((sum, m) => sum + (Number(m.valor) || 0), 0);
  const saidas = allMovements
    .filter(m => m.tipo === 'saida' && m.status !== 'cancelado')
    .reduce((sum, m) => sum + (Number(m.valor) || 0), 0);
  return entradas - saidas;
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
 * Group entradas by origem (categoria)
 */
export function calcEntradasPorOrigem(movements) {
  const map = {};
  movements
    .filter(m => m.tipo === 'entrada' && m.status !== 'cancelado')
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
    .filter(m => m.tipo === 'saida' && m.status !== 'cancelado')
    .forEach(m => {
      const cat = m.categoria || 'Outros';
      map[cat] = (map[cat] || 0) + (Number(m.valor) || 0);
    });
  return Object.entries(map)
    .map(([label, valor]) => ({ label, valor }))
    .sort((a, b) => b.valor - a.valor);
}
