/**
 * Analyzes metrics and returns a structured diagnostics object defining UI behavior and content keys.
 */
export function runDiagnostics(metrics) {
  const { conversao, ticketMedio, topProduto, growth, idleCount, curr, prev } = metrics;

  // 1. Funnel Health
  let funil = { conversao };
  if (conversao >= 15) {
    funil = { ...funil, status: 'Excelente', classStyle: 'text-green-600', color: 'text-green-500 bg-green-50 border-green-200', icon: 'fa-fire-flame-curved', badge: 'MÁQUINA DE VENDAS' };
  } else if (conversao >= 10) {
    funil = { ...funil, status: 'Saudável', classStyle: 'text-blue-600', color: 'text-blue-500 bg-blue-50 border-blue-200', icon: 'fa-check-double', badge: 'FUNIL SAUDÁVEL' };
  } else if (conversao >= 6) {
    funil = { ...funil, status: 'Atenção', classStyle: 'text-yellow-600', color: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: 'fa-triangle-exclamation', badge: 'ATENÇÃO AO FOLLOW-UP' };
  } else if (conversao >= 4) {
    funil = { ...funil, status: 'Problema', classStyle: 'text-orange-600', color: 'text-orange-500 bg-orange-50 border-orange-200', icon: 'fa-bug', badge: 'GARGALO' };
  } else {
    funil = { ...funil, status: 'Crítico', classStyle: 'text-red-600', color: 'text-red-500 bg-red-50 border-red-200', icon: 'fa-skull-crossbones', badge: 'BAIXA EFICIÊNCIA' };
  }

  // 2. Priority
  let prioridade = {};
  if (curr.pendentes > 0 && curr.fatPendente >= (curr.fatBase * 0.1)) {
    prioridade = { type: 'recuperar-caixa', pendentes: curr.pendentes };
  } else if (curr.cancelados > curr.fechados && curr.fatCancelado > 0) {
    prioridade = { type: 'estancar-sangria' };
  } else if (topProduto) {
    prioridade = { type: 'injetar-trafego', produto: topProduto.nome };
  } else {
    prioridade = { type: 'reativar-vitrine' };
  }

  // 3. Fast Cash
  const dinheiroRapido = {
    pendentes: curr.pendentes,
    valor: curr.fatPendente
  };

  // 4. Financial Overview
  const visaoGeral = {
    lucro: curr.fatBase,
    hasPrevData: prev.totais > 0,
    growth: growth
  };

  // 5. Customer Behavior
  let compTipo = '';
  if (ticketMedio > 2000) compTipo = 'premium';
  else if (ticketMedio > 500) compTipo = 'custo-beneficio';
  else compTipo = 'preco';

  const comportamento = {
    ticketMedio,
    tipo: compTipo
  };

  // 6. Logistics & Inventory Performance
  const desempenho = {
    topProduto,
    idleCount
  };

  // 7. Leak Points (Risks)
  const problemas = [];
  if (conversao < 6 && curr.totais > 0) {
    problemas.push({ type: 'conversao-baixa', leadsPerdidos: curr.totais - curr.fechados });
  }
  if (curr.fatCancelado > 0) {
    problemas.push({ type: 'cancelados', valor: curr.fatCancelado });
  }
  if (problemas.length === 0) {
    problemas.push({ type: 'tudo-ok' });
  }

  // 8. Growth Opportunities
  const oportunidades = [];
  if (topProduto) {
    oportunidades.push({ type: 'escalar-campeao', produto: topProduto.nome });
  }
  if (curr.pendentes > 0) {
    oportunidades.push({ type: 'recuperar-pendentes' });
  }

  // 9. Actions
  const acoes = [];
  if (curr.pendentes > 0) {
    acoes.push({ type: 'recuperar-pendentes', valor: curr.fatPendente });
  }
  if (acoes.length === 0) {
    acoes.push({ type: 'tudo-dia' });
  }

  return {
    funil,
    prioridade,
    dinheiroRapido,
    visaoGeral,
    comportamento,
    desempenho,
    problemas,
    oportunidades,
    acoes
  };
}
