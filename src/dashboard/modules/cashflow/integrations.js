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
  
  const str = String(dateStr).trim();
  
  // Try ISO Date (YYYY-MM-DD) - use local time construction to avoid UTC shifts
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }
  
  // Try BR Date (DD/MM/YYYY)
  const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    return new Date(Number(brMatch[3]), Number(brMatch[2]) - 1, Number(brMatch[1]));
  }

  // Fallback to native (caution: ISO strings without time will shift to UTC)
  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

function parsePaymentHistory(rawHist) {
  if (!rawHist) return [];
  try {
    return typeof rawHist === 'string' ? JSON.parse(rawHist) : (Array.isArray(rawHist) ? rawHist : []);
  } catch (e) {
    return [];
  }
}

function getLotPaymentHistory(items) {
  const payments = new Map();

  (items || []).forEach(item => {
    const history = [
      ...parsePaymentHistory(item.historico_pagamentos),
      ...parsePaymentHistory(item.historico_pagamentos_lote)
    ];

    history.forEach((payment, idx) => {
      const signature = [
        payment.data || '',
        parseNumber(payment.valor) || 0,
        payment.forma_pagamento || payment.formaPagamento || '',
        payment.observacao || payment.obs || ''
      ].join('|');
      const id = signature || payment.id || `EMPTY-${idx}`;
      if (!payments.has(id)) payments.set(id, payment);
    });
  });

  return [...payments.values()];
}

function calcLotTotalCost(lote) {
  const items = lote.items || [];
  const allHaveRealItemCost = items.length > 0 && items.every(i =>
    i.custo_total !== undefined &&
    i.custo_total !== null &&
    String(i.custo_total) !== ''
  );

  if (allHaveRealItemCost) {
    return items.reduce((sum, i) => sum + (parseNumber(i.custo_total) || 0), 0);
  }

  return items.reduce((sum, i) => {
    return sum + (parseNumber(i.custo_compra || i.custo) || 0);
  }, 0) + lote.frete + lote.taxas + lote.adicLote;
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
    .flatMap(o => {
      const parsedDate = safeParseDate(o.data || o.parsedDate);
      
      // Robust property access
      const getVal = (keys) => {
        for (const k of keys) {
          if (o[k] !== undefined && o[k] !== null && o[k] !== '') return o[k];
        }
        return null;
      };

      const valorVenda = parseNumber(getVal(['preço_final', 'preco_final', 'final_price', 'total', 'valor_venda']) || 0);
      let aparelhoTroca = getVal(['aparelho_troca', 'aparelho_troca_nome', 'aparelho_troca']);
      let valorTroca = parseNumber(getVal(['valor_troca', 'valor_troca_aparelho']) || 0);
      
      // Fallback: Parse from pagamento string if columns are missing/empty
      const pagamento = String(o.pagamento || '');
      if (valorTroca === 0 && pagamento.includes('Troca:')) {
        const match = pagamento.match(/Troca:\s*([^()]+)\s*\(R\$\s*([0-9.,]+)\)/);
        if (match) {
          aparelhoTroca = match[1].trim();
          valorTroca = parseNumber(match[2]);
        }
      }

      const temTroca = (aparelhoTroca && String(aparelhoTroca).trim().length > 0) || (valorTroca > 0);

      const movements = [];
      const baseId = `AUTO-VENDA-${o.item_id || o.id_do_pedido}-${o.produto || ''}`.replace(/\s/g, '');

      if (temTroca && valorTroca > 0) {
        const diff = valorVenda - valorTroca;
        
        // 1. Movimento financeiro da diferença
        if (Math.abs(diff) > 0.01) {
          const isUpgrade = diff > 0;
          movements.push({
            id: `${baseId}-${isUpgrade ? 'UPGRADE' : 'DOWNGRADE'}`,
            tipo: isUpgrade ? 'entrada' : 'saida',
            data: o.data || parsedDate.toISOString(),
            parsedDate: parsedDate,
            valor: Math.abs(diff),
            categoria: isUpgrade ? 'Venda' : 'Compra',
            descricao: isUpgrade ? `Diferença recebida em troca` : `Diferença paga em troca`,
            subDescricao: `${o.item_id || o.id_do_pedido || 'ID N/A'} • ${o.produto || ''}`.trim(),
            origem: 'auto',
            origemRef: o.item_id || o.id_do_pedido || '',
            formaPagamento: o.pagamento || '',
            status: 'confirmado'
          });
        }

        // 2. Registro patrimonial do aparelho recebido (sempre gera, mesmo se diff for 0)
        movements.push({
          id: `${baseId}-PATRIMONIO`,
          tipo: 'registro',
          data: o.data || parsedDate.toISOString(),
          parsedDate: parsedDate,
          valor: valorTroca,
          categoria: 'Patrimônio',
          descricao: `Aparelho recebido em troca`,
          subDescricao: `${aparelhoTroca || 'Aparelho na Troca'}`,
          origem: 'auto',
          origemRef: o.item_id || o.id_do_pedido || '',
          formaPagamento: '-',
          status: 'confirmado'
        });

      } else {
        // Venda Normal
        movements.push({
          id: baseId,
          tipo: 'entrada',
          data: o.data || parsedDate.toISOString(),
          parsedDate: parsedDate,
          valor: valorVenda,
          categoria: 'Venda',
          descricao: `Venda ${o.produto || ''}`.trim(),
          subDescricao: `${o.item_id || o.id_do_pedido || 'ID N/A'}`,
          origem: 'auto',
          origemRef: o.item_id || o.id_do_pedido || '',
          formaPagamento: o.pagamento || '',
          status: 'confirmado'
        });
      }

      return movements;
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
          valor: parseNumber(p.valor) || 0,
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
    // Prioritize lote_id. If missing, fallback to id but prefix it to avoid confusion with valid lote_ids
    const lid = e.lote_id || e.id_lote || e.loteid || (e.id ? `SINGLE-${e.id}` : 'UNKN');
    
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

    // Fallback for old data: if NO payment status at all, but items arrived, assume paid
    if (!paymentStatus) {
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

    // Check for payment history (new format)
    const history = getLotPaymentHistory(lote.items);

    if (history && Array.isArray(history) && history.length > 0) {
      // Generate one movement per history entry
      history.forEach((p, idx) => {
        const parsedDate = safeParseDate(p.data);
        const pId = p.id || `LEGACY-${idx}-${parsedDate.getTime()}`;
        
        movements.push({
          id: `AUTO-LOTE-PGTO-${lote.id}-${pId}`,
          tipo: 'saida',
          data: p.data || '',
          parsedDate: parsedDate,
          valor: parseNumber(p.valor) || 0,
          categoria: 'Compra',
          descricao: `Pgto Lote • ${lote.fornecedor}`,
          subDescricao: `Lote ${String(lote.id)} • Parcela ${idx + 1}`,
          origem: 'auto',
          origemRef: lote.id,
          formaPagamento: p.forma_pagamento || '',
          status: 'confirmado'
        });
      });
    } else {
      // Legacy Fallback (Single movement)
      if (paymentStatus === 'pago') {
        let totalCost = calcLotTotalCost(lote);

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
          subDescricao: `Lote ${String(lote.id)}${isLegacyPaid ? ' • Pago (Auto)' : ' • Pago'}`,
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
          subDescricao: `Lote ${String(lote.id)} • Parcial`,
          origem: 'auto',
          origemRef: lote.id,
          formaPagamento: '',
          status: 'confirmado'
        });
      }
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
