import { state } from './store.js';
import { formatMoney, formatPercent } from './ui.js';
import { gerarAnaliseEstrategica } from './strategy/index.js';

let revenueChart = null;
let distributionChart = null;

export function calcularKPIsEInsights(callbacks = {}) {
  const calcMetrics = (arr) => {
    let fatBase = 0, fatCancelado = 0, fatPendente = 0, fatCusto = 0;
    const pdFechados = new Set(), pdCancelados = new Set(), pdPendentes = new Set(), pdUnicos = new Set();

    arr.forEach(o => {
      if (o.id_do_pedido) pdUnicos.add(o.id_do_pedido);

      if (o.status === 'Fechado') {
        if (o.id_do_pedido) pdFechados.add(o.id_do_pedido);
        fatBase += (o.final_price || o.total);

        const produtoRef = state.allProducts.find(p =>
          (p.sku && String(p.sku) === String(o.sku)) ||
          (p.id && String(p.id) === String(o.sku)) ||
          (p.id && String(p.id) === String(o.id))
        );
        if (produtoRef) fatCusto += (Number(produtoRef.custo || 0) * o.quantidade);
      } else if (o.status === 'Cancelado') {
        if (o.id_do_pedido) pdCancelados.add(o.id_do_pedido);
        fatCancelado += (o.final_price || o.total);
      } else {
        if (o.id_do_pedido) pdPendentes.add(o.id_do_pedido);
        fatPendente += (o.final_price || o.total);
      }
    });

    return { fatBase, fatCancelado, fatPendente, fatCusto, totais: pdUnicos.size, fechados: pdFechados.size, cancelados: pdCancelados.size, pendentes: pdPendentes.size };
  };

  const curr = calcMetrics(state.filteredOrders);
  const prev = calcMetrics(state.previousOrders);

  const calcVar = (c, p) => (p === 0) ? (c > 0 ? 100 : 0) : ((c - p) / p) * 100;

  // Update Stats DOM
  document.getElementById('kpi-faturamento').textContent = formatMoney(curr.fatBase);
  document.getElementById('kpi-pendentes').textContent = curr.pendentes;
  document.getElementById('kpi-pendentes-valor').textContent = formatMoney(curr.fatPendente);
  document.getElementById('kpi-perdida').textContent = formatMoney(curr.fatCancelado);

  const lucro = curr.fatBase - curr.fatCusto;
  const margem = curr.fatBase > 0 ? (lucro / curr.fatBase) * 100 : 0;
  document.getElementById('kpi-lucro').textContent = formatMoney(lucro);

  const margemEl = document.getElementById('kpi-margem');
  if (margemEl) {
    margemEl.textContent = `📊 Margem: ${margem.toFixed(1).replace('.', ',')}%`;
    margemEl.className = margem < 10 && margem > 0
      ? 'text-xs font-bold text-orange-600 mt-1'
      : margem <= 0 ? 'text-xs font-bold text-red-600 mt-1' : 'text-xs font-bold text-emerald-700 mt-1';
  }

  const tmFechado = curr.fechados > 0 ? curr.fatBase / curr.fechados : 0;
  const tmEl = document.getElementById('kpi-ticket-medio');
  if (tmEl) tmEl.textContent = formatMoney(tmFechado);

  let totalCustoEstoque = 0;
  let totalEstoqueFisico = 0;
  state.allProducts.forEach(p => {
    const estoqueAtual = Number(p.estoque) || 0;
    if (estoqueAtual > 0) {
      const custoUnit = Number(p.custo || p.preco_custo) || 0;
      totalCustoEstoque += (custoUnit * estoqueAtual);
      totalEstoqueFisico += estoqueAtual;
    }
  });
  const estDinEl = document.getElementById('kpi-estoque-dinheiro');
  if (estDinEl) estDinEl.textContent = formatMoney(totalCustoEstoque);

  const estQtdEl = document.getElementById('kpi-estoque-qtd');
  if (estQtdEl) estQtdEl.textContent = totalEstoqueFisico.toString();

  const showVar = state.tablePeriodFilter !== 'all';
  document.getElementById('kpi-faturamento-var').innerHTML = showVar ? formatPercent(calcVar(curr.fatBase, prev.fatBase)) + ' <span class="text-gray-400 text-[10px] font-normal ml-1">vs ant.</span>' : '';
  document.getElementById('kpi-cancelados-qtd').textContent = `${curr.cancelados} pedidos perdidos`;

  // Top Giro Insight
  let topProd = '-', topModel = '-';
  let prodCounts = {};
  if (state.filteredOrders.length > 0) {
    let modelCounts = {};
    const validOrders = state.filteredOrders.filter(o => o.status !== 'Cancelado');
    validOrders.forEach(o => {
      if (!o.produto || o.produto === 'Pedido Vazio') return;
      prodCounts[o.produto] = (prodCounts[o.produto] || 0) + o.quantidade;
      let pMod = o.group_id && o.group_id !== '' ? o.group_id : o.produto;
      modelCounts[pMod] = (modelCounts[pMod] || 0) + o.quantidade;
    });

    if (Object.keys(prodCounts).length > 0) topProd = Object.keys(prodCounts).sort((a, b) => prodCounts[b] - prodCounts[a])[0];
  }

  const topGiroEl = document.getElementById('insight-top-giro');
  if (topGiroEl) topGiroEl.textContent = topProd !== '-' ? topProd.replace(/-/g, ' ') : 'Nenhuma Venda';

  gerarAnaliseEstrategica(curr, prev, calcVar, prodCounts);
}

export function renderRankings() {
  const models = {}, vars = {}, revTick = {};
  const today = new Date();
  const lastSaleMap = {};

  // For model name resolution
  const modelNameMap = {};
  const normalize = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

  state.allOrders.forEach(o => {
    if (o.status === 'Fechado') {
      const sku = String(o.sku || '').trim().toLowerCase();
      const pName = String(o.produto || '').trim().toLowerCase();
      if (sku && (!lastSaleMap[sku] || o.parsedDate > lastSaleMap[sku])) lastSaleMap[sku] = o.parsedDate;
      if (pName && (!lastSaleMap[pName] || o.parsedDate > lastSaleMap[pName])) lastSaleMap[pName] = o.parsedDate;
    }
  });

  state.filteredOrders.forEach(o => {
    if (o.status !== 'Fechado' || !o.produto || o.produto === 'Pedido Vazio') return;

    // Normalizing Model key - Resolve to human name immediately to group effectively
    let modelLabel = o.group_id && String(o.group_id).trim() !== '' ? String(o.group_id).trim() : o.produto;
    
    if (modelLabel.toUpperCase().startsWith('GRP')) {
      const gId = modelLabel.toLowerCase();
      const prod = state.allProducts.find(p => String(p.grupo_id || '').toLowerCase() === gId);
      if (prod) {
        modelLabel = prod.categoria ? `${prod.categoria} ${prod.nome}` : prod.nome;
      } else {
        // If ID lookup fails, fallback to product name to avoid showing "GRP-..."
        modelLabel = o.produto || modelLabel;
      }
    }
    
    // Clean up if it's still a raw variations name (remove - black, - 128gb etc)
    // Actually, user mostly wants the model name. If we fell back to o.produto,
    // let's try to keep only the first part before common separators if it's long.
    if (modelLabel.includes(' - ')) {
       // Optional: modelLabel = modelLabel.split(' - ')[0]; 
       // but we'll stick to full name for now to avoid losing important info.
    }
    
    const nKey = normalize(modelLabel);
    models[nKey] = (models[nKey] || 0) + o.quantidade;
    if (!modelNameMap[nKey]) modelNameMap[nKey] = modelLabel;

    // Variation with Condition
    const varKey = `${o.produto} | ${o.cor || 'Unic'} | ${o.armazenamento || 'Unic'} | ${o.condicao || 'Novo'}`;
    vars[varKey] = (vars[varKey] || 0) + o.quantidade;

    if (!revTick[o.produto]) revTick[o.produto] = { fat: 0, qtd: 0 };
    revTick[o.produto].fat += (o.final_price || o.total);
    revTick[o.produto].qtd += o.quantidade;
  });

  const rankList = (obj, sorterFx, slicer = 5) => Object.keys(obj).map(k => ({ label: k, val: obj[k] })).sort(sorterFx).slice(0, slicer);

  const renderLi = (arr, elId, formatLabel, formatVal) => {
    const el = document.getElementById(elId);
    if (!el) return;
    el.innerHTML = arr.length ? '' : '<li class="text-sm text-gray-500 py-2">Sem dados</li>';
    arr.forEach((item, idx) => {
      el.innerHTML += `
        <li class="flex items-center justify-between group">
          <div class="flex items-center gap-2 min-w-0 pr-2">
            <span class="w-5 h-5 flex items-center justify-center bg-gray-100 text-gray-700 font-bold text-[10px] rounded shrink-0">${idx + 1}</span>
            <span class="text-[13px] font-medium text-gray-800 truncate">${formatLabel(item.label, item.val)}</span>
          </div>
          <span class="text-xs font-bold text-gray-600 bg-white px-2 py-1 rounded border border-gray-100">${formatVal(item.val)}</span>
        </li>`;
    });
  };

  // Render Models (Normalized)
  renderLi(rankList(models, (a, b) => b.val - a.val), 'rank-models', nKey => {
    return modelNameMap[nKey].replace(/-/g, ' ');
  }, v => `${v} unid`);

  // Render Variations with Condition
  renderLi(rankList(vars, (a, b) => b.val - a.val), 'rank-vars', l => {
    const p = l.split('|');
    const cond = (p[3] || '').trim();
    const condBadge = cond ? `<span class="ml-1 px-1 py-0.5 rounded ${cond === 'Novo' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'} text-[8px] font-black uppercase">${cond}</span>` : '';
    return `<span class="font-bold">${p[0]}</span> <span class="text-[10px] block">${p[1]} ${p[2]} ${condBadge}</span>`;
  }, v => `${v} und`);

  renderLi(rankList(revTick, (a, b) => b.val.fat - a.val.fat), 'rank-revenue', l => l, v => `${formatMoney(v.fat)}`);

  // Idle Products
  const idleList = state.allProducts.map(p => {
    const lastDate = lastSaleMap[String(p.sku || '').trim().toLowerCase()] || lastSaleMap[String(p.nome || '').trim().toLowerCase()];
    const days = lastDate ? Math.floor(Math.abs(today - lastDate) / (1000 * 60 * 60 * 24)) : 999;
    return { ...p, daysIdle: days };
  }).filter(p => p.daysIdle > 15 && Number(p.estoque) > 0).sort((a, b) => b.daysIdle - a.daysIdle);

  const elIdle = document.getElementById('rank-idle');
  if (elIdle) {
    elIdle.innerHTML = idleList.length === 0 ? '<li class="text-sm text-green-600 font-medium py-2">Tudo girando!</li>' : '';
    idleList.slice(0, 15).forEach(p => {
      const isCritical = p.daysIdle > 30;
      elIdle.innerHTML += `
        <li class="flex flex-col mb-2 pb-2 border-b last:border-0 pl-2 border-l-4 ${isCritical ? 'border-l-red-500' : 'border-l-orange-400'}">
          <div class="flex justify-between items-start gap-2">
            <span class="text-[13px] font-semibold text-gray-800 truncate">${p.nome}</span>
            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${isCritical ? 'bg-red-100 text-red-800' : 'bg-orange-50 text-orange-700'}">${p.daysIdle === 999 ? 'S/ Vendas' : p.daysIdle + ' d'}</span>
          </div>
        </li>`;
    });
  }
}

export function renderCharts() {
  const ctxL = document.getElementById('revenue-chart')?.getContext('2d');
  const ctxP = document.getElementById('distribution-chart')?.getContext('2d');
  if (!ctxL || !ctxP) return;

  // Revenue Chart
  const dData = {};
  [...state.filteredOrders].sort((a, b) => a.parsedDate - b.parsedDate).forEach(o => {
    if (o.parsedDate.getTime() === 0 || o.status !== 'Fechado') return;
    const k = o.parsedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    dData[k] = (dData[k] || 0) + (o.final_price || o.total);
  });

  if (revenueChart) revenueChart.destroy();
  revenueChart = new Chart(ctxL, {
    type: 'line',
    data: {
      labels: Object.keys(dData).length ? Object.keys(dData) : ['Sem dados'],
      datasets: [{
        label: 'Faturamento', data: Object.values(dData).length ? Object.values(dData) : [0],
        borderColor: '#23be30ff', backgroundColor: 'rgba(35, 190, 48, 0.1)', borderWidth: 2, fill: true, tension: 0.4
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  });

  // Distribution Chart
  const mData = {};
  state.filteredOrders.forEach(o => {
    if (!o.produto || o.status !== 'Fechado') return;
    let gid = String(o.produto || '').trim();
    mData[gid] = (mData[gid] || 0) + o.quantidade;
  });

  let pieArr = Object.keys(mData).map(k => ({ l: k.substring(0, 18), v: mData[k] })).sort((a, b) => b.v - a.v);
  let pieLabels = pieArr.slice(0, 5).map(x => x.l);
  let pieValues = pieArr.slice(0, 5).map(x => x.v);

  if (distributionChart) distributionChart.destroy();
  distributionChart = new Chart(ctxP, {
    type: 'doughnut',
    data: {
      labels: pieLabels.length ? pieLabels : ['Sem Vendas'],
      datasets: [{
        data: pieValues.length ? pieValues : [1],
        backgroundColor: ['#eecf22ff', '#dadadaff', '#da9240ff', '#3b3b3bff', '#000000ff'],
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'right' } } }
  });
}
