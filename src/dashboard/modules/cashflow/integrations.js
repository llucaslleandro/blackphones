/**
 * Cashflow Module — Automatic Integrations
 * Derives cash flow movements from existing Vendas, Fiado, and Compras data.
 */

import { parseNumber, parseDateBr } from '../ui.js';

/**
 * Helper to parse dates that might be in various formats
 */
function safeParseDate(dateStr) {
  if (!dateStr) return new Date(0);
  if (dateStr instanceof Date) return dateStr;
  
  // Try BR format first
  const br = parseDateBr(dateStr);
  if (br) return new Date(br);
  
  // Fallback to native
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

/**
 * Generate entrada movements from closed orders (Vendas)
 */
export function generateFromOrders(orders) {
  if (!orders || !orders.length) return [];

  return orders
    .filter(o => {
      const s = String(o.status || '').toLowerCase();
      return s === 'fechado' || s === 'concluido';
    })
    .map(o => {
      const parsedDate = safeParseDate(o.data || o.parsedDate);
      return {
        id: `AUTO-VENDA-${o.item_id || o.id_do_pedido}-${o.produto || ''}`.replace(/\s/g, ''),
        tipo: 'entrada',
        data: o.data || parsedDate.toISOString(),
        parsedDate: parsedDate,
        valor: parseNumber(o.final_price || o.total || 0),
        categoria: 'Venda',
        descricao: `Venda ${o.produto || ''}`.trim(),
        subDescricao: `${o.item_id || o.id_do_pedido || 'ID N/A'} • ${o.pagamento || 'Sem Pagamento'}`,
        origem: 'auto',
        origemRef: o.item_id || o.id_do_pedido || '',
        formaPagamento: o.pagamento || '',
        status: 'confirmado'
      };
    });
}

/**
 * Generate entrada movements from Fiado payments (parcelas pagas + entrada dinheiro)
 */
export function generateFromFiados(fiados) {
  if (!fiados || !fiados.length) return [];
  const movements = [];

  fiados.forEach(f => {
    if (f.status === 'cancelado') return;

    // Entrada em dinheiro (initial payment)
    const entradaDinheiro = Number(f.entradadinheiro || f.entrada_dinheiro || 0);
    if (entradaDinheiro > 0) {
      const dataVenda = f.created_at || f.datavenda || f.data_venda || '';
      movements.push({
        id: `AUTO-FIADO-ENT-${f.id}`,
        tipo: 'entrada',
        data: dataVenda,
        parsedDate: dataVenda ? new Date(dataVenda) : new Date(0),
        valor: entradaDinheiro,
        categoria: 'Fiado Recebido',
        descricao: 'Recebimento Fiado',
        subDescricao: `${f.cliente || 'Cliente'} • Entrada em Dinheiro`,
        origem: 'auto',
        origemRef: f.id,
        formaPagamento: 'Dinheiro',
        status: 'confirmado'
      });
    }

    // Paid parcelas
    const parcelas = f.parcelas || [];
    parcelas.forEach(p => {
      if (p.status === 'pago') {
        movements.push({
          id: `AUTO-FIADO-PARC-${f.id}-${p.id}`,
          tipo: 'entrada',
          data: p.dataPagamento || '',
          parsedDate: p.dataPagamento ? new Date(p.dataPagamento) : new Date(0),
          valor: Number(p.valor || 0),
          categoria: 'Fiado Recebido',
          descricao: 'Recebimento Fiado',
          subDescricao: `${f.cliente || 'Cliente'} • Parcela ${p.numero}`,
          origem: 'auto',
          origemRef: f.id,
          formaPagamento: '',
          status: 'confirmado'
        });
      }
    });
  });

  return movements;
}

/**
 * Generate saída movements from received Compras/Encomendas
 */
export function generateFromCompras(encomendas) {
  if (!encomendas || !encomendas.length) return [];

  // Group by lote
  const lotesMap = {};
  encomendas.forEach(e => {
    const lid = e.lote_id || e.id;
    if (!lotesMap[lid]) {
      lotesMap[lid] = {
        id: lid,
        frete: parseNumber(e.custo_frete),
        taxas: parseNumber(e.custo_taxas),
        adicLote: parseNumber(e.custo_adicional_lote),
        fornecedor: e.fornecedor || 'Fornecedor',
        dataCompra: e.data_compra || '',
        status_pagamento: String(e.status_pagamento || '').toLowerCase(),
        data_pagamento: e.data_pagamento || '',
        valor_pago_lote: parseNumber(e.valor_pago_lote),
        items: []
      };
    }
    lotesMap[lid].items.push(e);
  });

  const movements = [];

  Object.values(lotesMap).forEach(lote => {
    let paymentStatus = lote.status_pagamento;
    let paymentDate = lote.data_pagamento;
    let isLegacyPaid = false;

    // Fallback for old data: if no payment status, but items arrived, assume paid
    if (!paymentStatus || paymentStatus === 'pendente') {
      const anyArrived = lote.items.some(i => {
        const s = String(i.status || '').toLowerCase();
        return s === 'chegou' || s === 'recebido' || s === 'entregue';
      });
      if (anyArrived) {
        paymentStatus = 'pago';
        const itemWithDate = lote.items.find(i => i.data_recebimento || i.data_entrada_estoque);
        paymentDate = paymentDate || itemWithDate?.data_recebimento || itemWithDate?.data_entrada_estoque || lote.dataCompra;
        isLegacyPaid = true;
      }
    }

    if (paymentStatus === 'pendente' || !paymentStatus) return;

    if (paymentStatus === 'pago') {
      // Calculate total cost of the lot
      let totalCost = lote.frete + lote.taxas + lote.adicLote;
      lote.items.forEach(i => {
        const cBase = parseNumber(i.custo_compra || i.custo || i.custo_total);
        totalCost += cBase;
      });

      // If calculation resulted in 0 but we have a manual valor_pago_lote, use that
      if (totalCost === 0 && lote.valor_pago_lote > 0) {
        totalCost = lote.valor_pago_lote;
      }

      const parsedDate = safeParseDate(paymentDate || lote.dataCompra);

      movements.push({
        id: `AUTO-LOTE-PAGO-${lote.id}`,
        tipo: 'saida',
        data: paymentDate || lote.dataCompra || '',
        parsedDate: parsedDate,
        valor: totalCost,
        categoria: 'Compra',
        descricao: `Compra Lote • ${lote.fornecedor}`,
        subDescricao: `Lote ${String(lote.id).substring(0, 8)}${isLegacyPaid ? ' • Pago (Auto)' : ' • Pago'}`,
        origem: 'auto',
        origemRef: lote.id,
        formaPagamento: '',
        status: 'confirmado'
      });
    } else if (paymentStatus === 'parcial') {
      const parsedDate = safeParseDate(paymentDate || lote.dataCompra);
      movements.push({
        id: `AUTO-LOTE-PARCIAL-${lote.id}`,
        tipo: 'saida',
        data: paymentDate || lote.dataCompra || '',
        parsedDate: parsedDate,
        valor: lote.valor_pago_lote,
        categoria: 'Compra',
        descricao: `Pgto Parcial Lote • ${lote.fornecedor}`,
        subDescricao: `Lote ${String(lote.id).substring(0, 8)} • Parcial`,
        origem: 'auto',
        origemRef: lote.id,
        formaPagamento: '',
        status: 'confirmado'
      });
    }
  });

  return movements;
}

/**
 * Merge automatic + manual movements, deduplicate by id, sort by date desc
 */
export function mergeMovements(autoMovements, manualMovements) {
  const idSet = new Set();
  const merged = [];

  // Manual first (user override)
  (manualMovements || []).forEach(m => {
    if (!m.parsedDate || !(m.parsedDate instanceof Date) || isNaN(m.parsedDate.getTime())) {
      m.parsedDate = m.data ? new Date(m.data) : new Date(0);
    }
    idSet.add(m.id);
    merged.push(m);
  });

  // Auto (skip if manual override exists)
  (autoMovements || []).forEach(m => {
    if (!idSet.has(m.id)) {
      merged.push(m);
    }
  });

  // Sort by date descending
  merged.sort((a, b) => (b.parsedDate || 0) - (a.parsedDate || 0));
  return merged;
}
