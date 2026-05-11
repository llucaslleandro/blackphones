import { CONFIG } from '../../shared/config.js';
import { state, loadDashboardData } from './store.js';
import { formatMoney, formatText, showToast, parseDateBr, formatDateBr, formatDateForInput, getViewPreference, formatPhone } from './ui.js';

export function aplicarFiltroPeriodo(callbacks = {}) {
  const periodFilter = document.getElementById('period-filter');
  const dateStart = document.getElementById('date-start');
  const dateEnd = document.getElementById('date-end');

  if (!periodFilter || state.allOrders.length === 0) return;

  const mode = periodFilter.value;
  let startDate = new Date();
  let endDate = new Date();
  let prevStartDate = new Date();
  let prevEndDate = new Date();

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  if (mode === 'today') {
    prevStartDate.setDate(startDate.getDate() - 1);
    prevEndDate.setDate(endDate.getDate() - 1);
  } else if (mode === 'yesterday') {
    startDate.setDate(startDate.getDate() - 1);
    endDate.setDate(endDate.getDate() - 1);
    prevStartDate.setDate(startDate.getDate() - 1);
    prevEndDate.setDate(endDate.getDate() - 1);
  } else if (mode === '7' || mode === '14' || mode === '30') {
    const days = parseInt(mode);
    startDate.setDate(startDate.getDate() - days);
    prevStartDate.setDate(startDate.getDate() - days);
    prevEndDate.setDate(endDate.getDate() - days);
  } else if (mode === 'custom') {
    if (dateStart?.value && dateEnd?.value) {
      const isoStart = parseDateBr(dateStart.value);
      const isoEnd = parseDateBr(dateEnd.value);
      if (isoStart && isoEnd) {
        startDate = new Date(isoStart + 'T00:00:00');
        endDate = new Date(isoEnd + 'T23:59:59');
        const diffDays = Math.ceil(Math.abs(endDate - startDate) / (1000 * 60 * 60 * 24));
        prevEndDate = new Date(startDate);
        prevEndDate.setDate(prevEndDate.getDate() - 1);
        prevStartDate = new Date(prevEndDate);
        prevStartDate.setDate(prevStartDate.getDate() - diffDays);
      }
    }
  } else if (mode.startsWith('month:')) {
    const val = mode.split(':')[1];
    const [year, month] = val.split('-').map(n => parseInt(n, 10));
    startDate = new Date(year, month - 1, 1, 0, 0, 0);
    endDate = new Date(year, month, 0, 23, 59, 59);

    // Previous period is the previous month
    prevStartDate = new Date(year, month - 2, 1, 0, 0, 0);
    prevEndDate = new Date(year, month - 1, 0, 23, 59, 59);
  } else {
    startDate = new Date(0); // all
  }

  if (mode === 'all') {
    state.filteredOrders = [...state.allOrders];
    state.previousOrders = [];
    state.currentPeriodStart = new Date(0);
    state.currentPeriodEnd = new Date(); // Até agora
  } else {
    state.filteredOrders = state.allOrders.filter(o => o.parsedDate >= startDate && o.parsedDate <= endDate);
    state.previousOrders = state.allOrders.filter(o => o.parsedDate >= prevStartDate && o.parsedDate <= prevEndDate);
    state.currentPeriodStart = startDate;
    state.currentPeriodEnd = endDate;
  }

  if (callbacks.onRender) callbacks.onRender();
}

export function renderTable(callbacks = {}) {
  const tbody = document.getElementById('orders-table-body');
  const tableContainer = tbody?.closest('.overflow-x-auto');
  const cardContainer = document.getElementById('orders-cards-container');
  if (!tbody || !tableContainer || !cardContainer) return;

  const viewMode = getViewPreference('vendly_orders_view', 'list');

  // ---- Unified Filtering Engine ----
  let displayOrders = filterOrders();

  // Pre-render cleanup and KPI update
  tbody.innerHTML = '';
  cardContainer.innerHTML = '';
  
  // Update Results Count UI
  const resultsCountEl = document.getElementById('results-count');
  if (resultsCountEl) resultsCountEl.textContent = displayOrders.length;

  if (displayOrders.length === 0 && state.isFetching) {
    renderOrderSkeletons();
    return;
  }

  renderOperationalKPIs(displayOrders);
  renderActiveFilters();

  if (displayOrders.length === 0) {
    const emptyHtml = `
      <div class="col-span-full py-20 text-center bg-white rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center">
         <div class="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 mb-4">
            <i class="fa-solid fa-magnifying-glass text-2xl"></i>
         </div>
         <p class="text-sm font-black text-gray-900 mb-1">Nenhuma venda encontrada</p>
         <p class="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-6">Tente ajustar seus filtros ou busca.</p>
         <button id="btn-empty-clear-filters" class="px-6 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100">
           Limpar Filtros
         </button>
      </div>`;
    if (viewMode === 'list') {
      tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-12 text-center text-gray-500 text-sm italic">Nenhum pedido encontrado.</td></tr>`;
    } else {
      cardContainer.innerHTML = emptyHtml;
      // Bind clear filters button in empty state
      setTimeout(() => {
        const btn = document.getElementById('btn-empty-clear-filters');
        if (btn) btn.onclick = () => resetAllFilters(callbacks);
      }, 0);
    }
    tableContainer.classList.toggle('hidden', viewMode !== 'list');
    cardContainer.classList.toggle('hidden', viewMode === 'list');
    renderActiveFilters();
    return;
  }

  tableContainer.classList.toggle('hidden', viewMode !== 'list');
  cardContainer.classList.toggle('hidden', viewMode === 'list');

  const getStatusColorLocal = (s) => {
    if (s === 'Fechado') return 'bg-emerald-50 border-emerald-200 text-emerald-700';
    if (s === 'Cancelado') return 'bg-rose-50 border-rose-200 text-rose-700';
    if (s === 'Pendente') return 'bg-amber-50 border-amber-200 text-amber-700';
    return 'bg-indigo-50 border-indigo-200 text-indigo-700';
  };

  displayOrders.forEach(o => {
    const isDateValid = o.parsedDate && !isNaN(o.parsedDate.getTime()) && o.parsedDate.getTime() !== 0;
    const dataFormatada = isDateValid 
      ? formatDateBr(o.parsedDate) + ' ' + o.parsedDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : formatDateBr(o.data);

    // Financial logic
    let prodRef = state.allProducts.find(p =>
      (p.sku && String(p.sku) === String(o.sku)) ||
      (p.id && String(p.id) === String(o.sku)) ||
      (p.id && String(p.id) === String(o.id))
    );
    if (!prodRef) {
      prodRef = state.allProducts.find(p => p.nome && String(p.nome).trim().toLowerCase() === String(o.produto).trim().toLowerCase());
    }
    const custoUnit = prodRef ? parseFloat(prodRef.custo || prodRef.preco_custo) || 0 : 0;
    const rev = parseFloat(o.final_price || o.total) || 0;
    const lucro = rev - (custoUnit * (o.quantidade || 1));

    if (viewMode === 'list') {
      const badgeVariacao = (o.armazenamento || o.cor || o.condicao) ? `
        <div class="flex flex-wrap gap-1 mt-1 opacity-70 group-hover:opacity-100 transition-opacity">
          ${o.condicao ? `<span class="px-1 py-0.5 rounded-md bg-gray-100 text-gray-500 text-[9px] uppercase font-bold tracking-wider border border-gray-200/50">${o.condicao}</span>` : ''}
          ${o.armazenamento ? `<span class="px-1 py-0.5 rounded-md bg-indigo-50 text-indigo-600 text-[9px] font-bold border border-indigo-100/50">${o.armazenamento}</span>` : ''}
          ${o.cor ? `<span class="px-1 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[9px] font-bold border border-purple-100/50">${o.cor}</span>` : ''}
        </div>` : '';

      const rev = parseFloat(o.final_price || o.total) || 0;
      const isNegotiated = o.final_price && parseFloat(o.final_price) !== parseFloat(o.total);
      const margemOp = rev > 0 ? (lucro / rev) * 100 : 0;

      const metodosPagamento = (o.pagamento || 'Pix/Cartão').split(' + ').map(m => m.trim());
      const pagamentosHtml = metodosPagamento.map(m => `
        <div class="flex items-center gap-1.5 px-2 py-0.5 bg-gray-100/50 rounded-md border border-gray-200/30 w-fit whitespace-nowrap">
          <i class="fa-solid ${m.toLowerCase().includes('fiado') ? 'fa-hand-holding-dollar' : 'fa-credit-card'} text-[7px] text-indigo-400"></i>
          <span class="text-[8px] font-black uppercase tracking-wider text-gray-500">${m}</span>
        </div>
      `).join('');

      tbody.innerHTML += `
        <tr id="order-row-${o.item_id || o.id_do_pedido}" class="group hover:bg-gray-50/80 transition-all duration-300 border-b border-gray-50 last:border-0">
          <!-- Data / Pedido -->
          <td class="px-6 py-5 whitespace-nowrap">
            <div class="flex flex-col">
              <span class="text-[9px] font-black text-gray-900 uppercase tracking-[0.1em] mb-1">#${o.id_do_pedido}</span>
              <span class="text-[10px] font-bold text-gray-400 whitespace-nowrap">${dataFormatada}</span>
            </div>
          </td>

          <!-- Produto -->
          <td class="px-6 py-5">
            <div class="min-w-0">
              <div class="text-xs font-black text-gray-900 leading-tight truncate group-hover:text-indigo-600 transition-colors">${formatText(o.produto)}</div>
              ${badgeVariacao}
            </div>
          </td>

          <!-- Cliente -->
          <td class="px-6 py-5">
            <div class="flex flex-col gap-1.5">
              <div class="flex items-center gap-1.5 mb-1">
                <i class="fa-solid fa-user text-[8px] text-gray-300"></i>
                <span class="text-[11px] font-bold text-gray-700 truncate max-w-[150px]">${o.cliente || 'Consumidor Final'}</span>
              </div>
              <div class="flex flex-col gap-1">
                ${pagamentosHtml}
              </div>
            </div>
          </td>

          <!-- Financeiro -->
          <td class="px-6 py-5 text-right">
            <div class="flex flex-col items-end space-y-1">
              ${isNegotiated ? `
                <div class="flex items-center gap-2 mb-0.5">
                  <span class="text-[10px] text-gray-400 line-through font-medium leading-none">${formatMoney(o.total)}</span>
                  <div class="w-5 h-5 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-sm" title="Valor Negociado">
                    <i class="fa-solid fa-handshake text-[8px]"></i>
                  </div>
                </div>
              ` : ''}
              <span class="text-sm font-black text-gray-900 leading-tight">${formatMoney(rev)}</span>
              <span class="text-[10px] font-black ${lucro >= 0 ? 'text-emerald-500' : 'text-rose-500'} leading-none">
                ${lucro >= 0 ? '+' : '-'}${formatMoney(Math.abs(lucro))}
              </span>
              <span class="text-[9px] font-bold text-gray-400 uppercase tracking-tighter italic leading-none">
                ${margemOp.toFixed(1).replace('.', ',')}% marg
              </span>
            </div>
          </td>

          <!-- Status -->
          <td class="px-6 py-5 whitespace-nowrap text-center">
            <div class="relative inline-block group/status">
              <select data-id="${o.item_id || o.id_do_pedido}" data-type="${o.item_id ? 'item' : 'order'}" 
                class="status-select w-28 pl-3 pr-7 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-full border appearance-none text-center cursor-pointer focus:outline-none transition-all duration-300 hover:shadow-sm ${getStatusColorLocal(o.status)}">
                <option value="Pendente" ${o.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
                <option value="Fechado" ${o.status === 'Fechado' ? 'selected' : ''}>Fechado</option>
                <option value="Cancelado" ${o.status === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-current opacity-40">
                <i class="fa-solid fa-chevron-down text-[7px]"></i>
              </div>
            </div>
          </td>

          <!-- Ações -->
          <td class="px-6 py-5 whitespace-nowrap text-center">
            <div class="flex gap-1.5 justify-center opacity-40 group-hover:opacity-100 transition-opacity">
              <button data-id="${o.item_id || o.id_do_pedido}" class="btn-editar-pedido w-7 h-7 rounded-lg bg-white border border-gray-100 text-gray-400 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-100 transition-all shadow-sm flex items-center justify-center" title="Editar">
                <i class="fa-solid fa-pen-to-square text-[10px]"></i>
              </button>
              <button data-id="${o.item_id || o.id_do_pedido}" class="btn-gerar-recibo w-7 h-7 rounded-lg bg-white border border-gray-100 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm flex items-center justify-center" title="Recibo">
                <i class="fa-solid fa-file-invoice-dollar text-[10px]"></i>
              </button>
              <button data-id="${o.item_id || o.id_do_pedido}" class="btn-excluir-pedido w-7 h-7 rounded-lg bg-white border border-gray-100 text-gray-400 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 transition-all shadow-sm flex items-center justify-center" title="Excluir">
                <i class="fa-solid fa-trash-can text-[10px]"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    } else {
      // Grid/Card View Premium - Refined
      const rev = parseFloat(o.final_price || o.total) || 0;
      const isNegotiated = o.final_price && parseFloat(o.final_price) !== parseFloat(o.total);
      const margemOp = rev > 0 ? (lucro / rev) * 100 : 0;

      const imgSrc = prodRef ? (
        (prodRef.images && prodRef.images[0]) ||
        (prodRef.imagens && prodRef.imagens[0]) ||
        prodRef.imagem ||
        prodRef.Imagem ||
        ''
      ) : '';
      const hasImage = !!imgSrc;

      const imgContent = hasImage
        ? `<img src="${imgSrc}" class="w-full h-full object-cover" onerror="this.onerror=null; this.parentElement.innerHTML='<i class=\'fa-solid fa-mobile-screen-button text-2xl text-gray-300\'></i>'; this.parentElement.classList.add('bg-gray-50')">`
        : `<div class="w-full h-full bg-gray-50 flex items-center justify-center text-gray-300"><i class="fa-solid fa-mobile-screen-button text-2xl"></i></div>`;

      const variations = [o.armazenamento, o.condicao, o.cor].filter(Boolean).join(' • ');

      cardContainer.innerHTML += `
        <div class="bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden flex flex-col group p-6 gap-y-5">
          <!-- Header: ID + Status -->
          <div class="flex justify-between items-start">
             <div class="flex flex-col">
                <span class="text-[9px] font-bold text-gray-400 uppercase tracking-widest">${o.id_do_pedido}</span>
                <span class="text-[10px] font-medium text-gray-400 mt-0.5 whitespace-nowrap">${dataFormatada}</span>
             </div>
             <div class="relative group/status">
               <select data-id="${o.item_id || o.id_do_pedido}" data-type="${o.item_id ? 'item' : 'order'}" 
                 class="status-select pl-3 pr-7 py-1 text-[9px] font-black uppercase tracking-widest rounded-full border appearance-none text-center cursor-pointer transition-all duration-300 ${getStatusColorLocal(o.status)}">
                 <option value="Pendente" ${o.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
                 <option value="Fechado" ${o.status === 'Fechado' ? 'selected' : ''}>Fechado</option>
                 <option value="Cancelado" ${o.status === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
               </select>
               <i class="fa-solid fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-[7px] opacity-40 pointer-events-none transition-transform group-hover/status:translate-y-[-40%]"></i>
             </div>
          </div>

          <!-- Product Info -->
          <div class="flex gap-4">
            <div class="w-20 h-20 rounded-2xl bg-gray-50 flex-shrink-0 overflow-hidden border border-gray-100 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
              ${imgContent}
            </div>
            <div class="min-w-0 flex-1 flex flex-col justify-center">
              <h4 class="text-base font-black text-gray-900 leading-tight mb-1 group-hover:text-indigo-600 transition-colors line-clamp-2">${o.produto}</h4>
              <p class="text-[11px] text-gray-500 font-bold truncate">${variations || 'Aparelho'}</p>
            </div>
          </div>

          <!-- Finance + Client Integrated -->
          <div class="bg-gray-50/50 rounded-3xl p-5 border border-gray-100/50">
             <div class="flex justify-between items-start mb-4">
                <div class="flex-1">
                   <p class="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Faturamento</p>
                   <div class="flex flex-col gap-1">
                      ${isNegotiated ? `<span class="text-xs text-gray-400 line-through font-medium leading-none mb-0.5">${formatMoney(o.total)}</span>` : ''}
                      <div class="flex items-baseline gap-2">
                         <span class="text-2xl font-black text-gray-900">${formatMoney(rev)}</span>
                      </div>
                      <div class="flex items-center gap-3 mt-1">
                         <span class="text-[13px] font-black ${lucro >= 0 ? 'text-emerald-500' : 'text-rose-500'} flex items-center gap-1 whitespace-nowrap">
                            <i class="fa-solid ${lucro >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'} text-[8px]"></i>${lucro >= 0 ? '+' : '-'}${formatMoney(Math.abs(lucro))}
                         </span>
                         <span class="text-[10px] font-bold text-gray-500 bg-white/80 px-2 py-0.5 rounded-lg border border-gray-100 whitespace-nowrap shadow-sm">
                            ${margemOp.toFixed(1).replace('.', ',')}% margem
                         </span>
                      </div>
                   </div>
                </div>
                ${isNegotiated ? `
                   <div class="flex items-center gap-1.5 text-amber-600 bg-white p-2 rounded-xl border border-amber-100 shadow-sm" title="Negociado">
                      <i class="fa-solid fa-handshake text-xs"></i>
                   </div>
                ` : ''}
             </div>
             
             <!-- Compact Client Row -->
             <div class="flex items-center gap-2.5 pt-4 border-t border-gray-200/50 min-w-0">
                <i class="fa-solid fa-user text-[9px] text-gray-400"></i>
                <p class="text-xs font-bold text-gray-700 truncate">${o.cliente || 'Consumidor Final'}</p>
             </div>
          </div>

          <!-- Footer Actions -->
          <div class="flex justify-between items-center mt-auto pt-2">
             <div class="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-gray-500 px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-100">
                <i class="fa-solid ${o.pagamento?.includes('Fiado') ? 'fa-hand-holding-dollar' : 'fa-credit-card'} text-indigo-400"></i>
                <span>${o.pagamento || 'Pix/Cartão'}</span>
             </div>
              <div class="flex gap-2">
                <button data-id="${o.item_id || o.id_do_pedido}" class="btn-editar-pedido w-9 h-9 rounded-xl bg-white text-gray-400 hover:text-amber-600 hover:bg-amber-50 border border-gray-100 shadow-sm transition-all flex items-center justify-center" title="Editar">
                  <i class="fa-solid fa-pen-to-square text-xs"></i>
                </button>
                <button data-id="${o.item_id || o.id_do_pedido}" class="btn-gerar-recibo w-9 h-9 rounded-xl bg-white text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 border border-gray-100 shadow-sm transition-all flex items-center justify-center" title="Recibo">
                  <i class="fa-solid fa-receipt text-xs"></i>
                </button>
                <button data-id="${o.item_id || o.id_do_pedido}" class="btn-excluir-pedido w-9 h-9 rounded-xl bg-white text-gray-400 hover:text-rose-500 hover:bg-rose-50 border border-gray-100 shadow-sm transition-all flex items-center justify-center">
                  <i class="fa-solid fa-trash-can text-xs"></i>
                </button>
              </div>
          </div>
        </div>
      `;
    }
  });

  document.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', (e) => handleStatusChange(e, callbacks));
  });

  document.querySelectorAll('.btn-excluir-pedido').forEach(btn => {
    btn.addEventListener('click', () => confirmarExclusao(btn.getAttribute('data-id'), callbacks));
  });

  document.querySelectorAll('.btn-editar-pedido').forEach(btn => {
    btn.addEventListener('click', () => abrirModalEdicaoPedido(btn.getAttribute('data-id'), callbacks));
  });




  renderOperationalKPIs(displayOrders);
  renderActiveFilters();
}

function renderOperationalKPIs(orders) {
  const kpiCount = document.getElementById('op-kpi-vendas-count');
  const kpiRevenue = document.getElementById('op-kpi-faturamento');
  const kpiTicket = document.getElementById('op-kpi-ticket');
  const kpiMargin = document.getElementById('op-kpi-margem');
  const kpiNegoc = document.getElementById('op-kpi-negociacoes');
  const kpiDiscount = document.getElementById('op-kpi-desconto');
  const kpiProfitMedio = document.getElementById('op-kpi-lucro-medio');

  if (!kpiCount) return;

  const closedOrders = orders.filter(o => o.status === 'Fechado');

  let totalRevenue = 0;
  let totalCost = 0;
  let countNegociados = 0;
  let totalDesconto = 0;

  closedOrders.forEach(o => {
    const rev = parseFloat(o.final_price || o.total) || 0;
    totalRevenue += rev;

    // Lookup product for cost (same logic as analytics.js)
    let prodRef = state.allProducts.find(p =>
      (p.sku && String(p.sku) === String(o.sku)) ||
      (p.id && String(p.id) === String(o.sku)) ||
      (p.id && String(p.id) === String(o.id))
    );
    if (!prodRef) {
      prodRef = state.allProducts.find(p => p.nome && String(p.nome).trim().toLowerCase() === String(o.produto).trim().toLowerCase());
    }

    if (prodRef) {
      const custoUnit = parseFloat(prodRef.custo || prodRef.preco_custo) || 0;
      totalCost += (custoUnit * (o.quantidade || 1));
    }

    if (o.final_price && parseFloat(o.final_price) !== parseFloat(o.total)) {
      countNegociados++;
      totalDesconto += (parseFloat(o.total) - parseFloat(o.final_price));
    }
  });

  const totalProfit = totalRevenue - totalCost;
  const ticketMedio = closedOrders.length > 0 ? totalRevenue / closedOrders.length : 0;
  const margemOp = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const descontoMedio = countNegociados > 0 ? totalDesconto / countNegociados : 0;
  const lucroMedio = closedOrders.length > 0 ? totalProfit / closedOrders.length : 0;

  kpiCount.textContent = closedOrders.length;
  kpiRevenue.textContent = formatMoney(totalRevenue);
  kpiTicket.textContent = formatMoney(ticketMedio);
  kpiMargin.textContent = `${margemOp.toFixed(1).replace('.', ',')}%`;
  kpiNegoc.textContent = countNegociados;
  kpiDiscount.textContent = formatMoney(totalDesconto);
  kpiProfitMedio.textContent = formatMoney(lucroMedio);
}

export async function handleStatusChange(e, callbacks = {}) {
  const sel = e.target;
  const itemId = sel.getAttribute('data-id');
  const isItemLevel = sel.getAttribute('data-type') === 'item';
  const newStatus = sel.value;
  const oldStatus = state.allOrders.find(o => (o.item_id === itemId || o.id_do_pedido === itemId))?.status || 'Pendente';

  if (!isItemLevel) {
    // Agora permitimos pedidos legados através da edição completa, mas vamos permitir status rápido também se possível
    // No entanto, para segurança, vamos focar no modal de edição para legados
    showToast('Use o botão de Editar (lápis) para pedidos legados.', 'blue', 'fa-info-circle');
    sel.value = oldStatus;
    return;
  }

  if (newStatus === 'Fechado') {
    const item = state.allOrders.find(o => o.item_id === itemId);
    showNegotiationModal(itemId, item.total, async (finalPrice, extraData) => {
      await updateStatusAPI(sel, itemId, newStatus, finalPrice, callbacks, extraData);
    }, () => {
      // Revert select if cancelled
      sel.value = oldStatus;
    });
    return;
  }

  await updateStatusAPI(sel, itemId, newStatus, null, callbacks);
}

async function updateStatusAPI(sel, itemId, newStatus, finalPrice, callbacks, extraData = {}) {

  sel.disabled = true;
  sel.classList.add('opacity-50', 'cursor-wait');
  showToast('Atualizando item...', 'blue', 'fa-spinner', true);

  try {
    const resp = await fetch(`${CONFIG.apiBaseUrl}?action=atualizarStatus`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        item_id: itemId,
        status: newStatus,
        final_price: finalPrice,
        cliente: extraData.cliente,
        telefone: extraData.telefone,
        pagamento: extraData.pagamento
      })
    });

    const json = await resp.json();
    if (!json.ok) throw new Error(json.error || 'Erro na API');

    state.allOrders.forEach(o => {
      if (o.item_id === itemId) {
        o.status = newStatus;
        if (extraData.cliente) o.cliente = extraData.cliente;
        if (extraData.telefone) o.telefone = extraData.telefone;
        if (extraData.pagamento) o.pagamento = extraData.pagamento;
        if (finalPrice !== null) o.final_price = finalPrice;
      }
    });

    if (callbacks.onStatusUpdated) callbacks.onStatusUpdated();

    showToast('Status modificado! Atualizando estoque...', 'green', 'fa-check', true);
    await loadDashboardData(callbacks.dataCallbacks || {}, true);
    showToast('Estoque e Dashboard sincronizados!', 'green', 'fa-check');

  } catch (err) {
    console.error(err);
    showToast('Erro ao atualizar. Tente novamente.', 'red', 'fa-xmark');
    sel.disabled = false;
    sel.classList.remove('opacity-50', 'cursor-wait');
    if (callbacks.onRender) callbacks.onRender();
  }
}

let currentNegotiation = null;

export function initNegotiationModal() {
  const modal = document.getElementById('modal-negociacao');
  const btnNao = document.getElementById('btn-negoc-nao');
  const btnSim = document.getElementById('btn-negoc-sim');
  const inputWrap = document.getElementById('input-negoc-wrap');
  const inputFinal = document.getElementById('input-final-price');
  const btnConfirm = document.getElementById('btn-negoc-confirm');
  const btnCancel = document.getElementById('btn-negoc-cancel');
  const btnClose = document.getElementById('negociacao-close');
  const inputTel = document.getElementById('input-negoc-telefone');
  const btnAddPay = document.getElementById('btn-add-pagamento');

  if (!modal) return;

  if (inputTel) {
    inputTel.oninput = (e) => {
      e.target.value = formatPhone(e.target.value);
    };
  }

  if (btnAddPay) {
    btnAddPay.onclick = () => {
      const currentTotal = currentNegotiation.useCustom ? parseFloat(inputFinal.value) : currentNegotiation.currentTotal;
      const values = Array.from(document.querySelectorAll('.pay-value')).map(el => parseFloat(el.value) || 0);
      const totalPaid = values.reduce((a, b) => a + b, 0);
      const remaining = currentTotal - totalPaid;
      addPaymentRow(remaining > 0 ? remaining : '');
    };
  }

  inputFinal.oninput = () => {
    checkConfirm();
    updatePaymentBalance();
  };

  btnNao.onclick = () => {
    btnNao.classList.add('bg-indigo-600', 'text-white', 'shadow-sm');
    btnNao.classList.remove('text-indigo-400');
    btnSim.classList.remove('bg-indigo-600', 'text-white', 'shadow-sm');
    btnSim.classList.add('text-indigo-400');
    inputWrap.classList.add('hidden');
    currentNegotiation.useCustom = false;
    btnConfirm.disabled = false;
  };

  btnSim.onclick = () => {
    btnSim.classList.add('bg-indigo-600', 'text-white', 'shadow-sm');
    btnSim.classList.remove('text-indigo-400');
    btnNao.classList.remove('bg-indigo-600', 'text-white', 'shadow-sm');
    btnNao.classList.add('text-indigo-400');
    inputWrap.classList.remove('hidden');
    currentNegotiation.useCustom = true;
    checkConfirm();
  };

  const checkConfirm = () => {
    if (currentNegotiation.useCustom) {
      const val = parseFloat(inputFinal.value);
      btnConfirm.disabled = isNaN(val) || val <= 0;
    } else {
      btnConfirm.disabled = false;
    }
  };

  inputFinal.oninput = () => {
    checkConfirm();
    updatePaymentBalance();
  };

  const close = () => {
    modal.classList.add('hidden');
    if (currentNegotiation && currentNegotiation.onCancel) currentNegotiation.onCancel();
  };

  btnCancel.onclick = close;
  btnClose.onclick = close;

  btnConfirm.onclick = async () => {
    const finalPrice = currentNegotiation.useCustom ? parseFloat(inputFinal.value) : null;

    // Aggregate payments
    const paymentRows = Array.from(document.querySelectorAll('.payment-row'));
    let pagamentoStr = '';
    if (paymentRows.length === 1) {
      pagamentoStr = paymentRows[0].querySelector('.pay-method').value;
    } else {
      pagamentoStr = paymentRows.map(row => {
        const method = row.querySelector('.pay-method').value;
        const val = parseFloat(row.querySelector('.pay-value').value) || 0;
        return `${method} (${formatMoney(val)})`;
      }).join(' + ');
    }

    // Validation
    const inputFinal = document.getElementById('input-final-price');
    const currentTotal = currentNegotiation.useCustom ? (parseFloat(inputFinal.value) || 0) : currentNegotiation.currentTotal;
    const values = Array.from(document.querySelectorAll('.pay-value')).map(el => parseFloat(el.value) || 0);
    const totalPaid = values.reduce((a, b) => a + b, 0);
    const remaining = currentTotal - totalPaid;

    const errorContainer = document.getElementById('negoc-errors');
    const errorMsg = document.getElementById('negoc-errors-msg');

    if (Math.abs(remaining) > 0.01) {
      if (errorContainer && errorMsg) {
        errorMsg.textContent = remaining > 0 
          ? `Ainda resta um saldo pendente de ${formatMoney(remaining)}.`
          : `O valor dos pagamentos excede o total em ${formatMoney(Math.abs(remaining))}.`;
        errorContainer.classList.remove('hidden');
      }
      return;
    }

    if (totalPaid <= 0 && currentTotal > 0) {
      if (errorContainer && errorMsg) {
        errorMsg.textContent = 'Adicione pelo menos um meio de pagamento.';
        errorContainer.classList.remove('hidden');
      }
      return;
    }

    const extraData = {
      cliente: document.getElementById('input-negoc-cliente')?.value || '',
      telefone: document.getElementById('input-negoc-telefone')?.value || '',
      pagamento: pagamentoStr || 'Pix'
    };

    modal.classList.add('hidden');
    if (currentNegotiation.onConfirm) await currentNegotiation.onConfirm(finalPrice, extraData);
  };
}

export function showNegotiationModal(pedidoId, currentTotal, onConfirm, onCancel) {
  currentNegotiation = { pedidoId, currentTotal, onConfirm, onCancel, useCustom: false };
  const modal = document.getElementById('modal-negociacao');
  const inputFinal = document.getElementById('input-final-price');
  const inputWrap = document.getElementById('input-negoc-wrap');

  const inputCliente = document.getElementById('input-negoc-cliente');
  const inputTelefone = document.getElementById('input-negoc-telefone');
  const payContainer = document.getElementById('payment-methods-container');

  if (!modal) return;

  // Reset fields
  inputFinal.value = currentTotal;
  if (inputCliente) inputCliente.value = '';
  if (inputTelefone) inputTelefone.value = '';

  if (payContainer) {
    payContainer.innerHTML = '';
    addPaymentRow(currentTotal);
  }

  inputWrap.classList.add('hidden');
  document.getElementById('btn-negoc-nao').click();

  modal.classList.remove('hidden');
  document.getElementById('negoc-errors')?.classList.add('hidden');
}

export function renderOrderSkeletons() {
  const cardContainer = document.getElementById('orders-cards-container');
  if (!cardContainer) return;
  cardContainer.innerHTML = '';
  for (let i = 0; i < 8; i++) {
    cardContainer.innerHTML += `
      <div class="bg-white rounded-[1.8rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col p-4 gap-y-3.5">
        <div class="flex justify-between items-center">
           <div class="w-12 h-2 skeleton rounded"></div>
           <div class="w-16 h-4 skeleton rounded-full"></div>
        </div>
        <div class="flex gap-3">
          <div class="w-14 h-14 rounded-xl skeleton flex-shrink-0"></div>
          <div class="flex-1 space-y-2">
            <div class="w-full h-3 skeleton rounded"></div>
            <div class="w-2/3 h-2 skeleton rounded"></div>
          </div>
        </div>
        <div class="bg-gray-50/50 rounded-2xl p-3 border border-gray-100/50 space-y-3">
           <div class="space-y-2">
              <div class="w-16 h-2 skeleton rounded"></div>
              <div class="w-24 h-6 skeleton rounded"></div>
              <div class="w-20 h-3 skeleton rounded"></div>
           </div>
           <div class="pt-2 border-t border-gray-100 w-full flex gap-2">
              <div class="w-4 h-4 skeleton rounded-full"></div>
              <div class="w-1/2 h-2 skeleton rounded"></div>
           </div>
        </div>
        <div class="flex justify-between items-center mt-auto pt-1">
          <div class="w-20 h-5 skeleton rounded-lg"></div>
          <div class="flex gap-2"><div class="w-7 h-7 skeleton rounded-lg"></div><div class="w-7 h-7 skeleton rounded-lg"></div></div>
        </div>
      </div>
    `;
  }

  // Also update table skeletons if needed (optional but good for UX)
  const tbody = document.getElementById('orders-table-body');
  if (tbody) {
    tbody.innerHTML = '';
    for (let i = 0; i < 8; i++) {
      tbody.innerHTML += `
        <tr class="border-b border-gray-50">
          <td class="px-6 py-5"><div class="w-16 h-4 skeleton rounded"></div></td>
          <td class="px-6 py-5"><div class="min-w-0"><div class="w-32 h-4 skeleton rounded"></div><div class="w-20 h-2 skeleton rounded mt-2"></div></div></td>
          <td class="px-6 py-5"><div class="w-24 h-4 skeleton rounded"></div></td>
          <td class="px-6 py-5 text-right"><div class="w-20 h-6 skeleton rounded ml-auto"></div></td>
          <td class="px-6 py-5 text-center"><div class="w-24 h-6 skeleton rounded-full mx-auto"></div></td>
          <td class="px-6 py-5 text-center"><div class="w-20 h-4 skeleton rounded mx-auto"></div></td>
        </tr>
      `;
    }
  }
}

function addPaymentRow(val = '') {
  const container = document.getElementById('payment-methods-container');
  if (!container) return;

  const div = document.createElement('div');
  div.className = 'payment-row flex items-center gap-2 animate-[fadeIn_0.2s_ease-out] bg-gray-50/30 p-2 rounded-xl border border-gray-100';
  div.innerHTML = `
    <div class="relative group flex-1">
      <select class="pay-method w-full pl-3 pr-8 py-2 bg-white border border-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-[10px] appearance-none cursor-pointer transition-all">
        <option value="Pix">Pix</option>
        <option value="Dinheiro">Dinheiro</option>
        <option value="Cartão de Crédito">Cartão de Crédito</option>
        <option value="Cartão de Débito">Cartão de Débito</option>
        <option value="Link de Pagamento">Link de Pagamento</option>
        <option value="Fiado">Fiado</option>
      </select>
      <i class="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[8px] text-gray-300 pointer-events-none"></i>
    </div>
    <div class="relative group w-28">
      <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 font-bold text-[9px]">R$</span>
      <input type="number" class="pay-value w-full pl-7 pr-2 py-2 bg-white border border-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-black text-[10px] transition-all" placeholder="0,00" value="${val ? parseFloat(val).toFixed(2) : ''}">
    </div>
    <button type="button" class="btn-remove-pay w-8 h-8 flex-shrink-0 flex items-center justify-center bg-white border border-gray-100 text-gray-300 hover:text-rose-500 hover:border-rose-100 rounded-lg transition-all shadow-sm">
      <i class="fa-solid fa-xmark text-[10px]"></i>
    </button>
  `;
  container.appendChild(div);

  const input = div.querySelector('.pay-value');
  input.oninput = updatePaymentBalance;

  // Auto-focus value if it's the second method or more
  if (document.querySelectorAll('.payment-row').length > 1) {
    input.focus();
    input.select();
  }

  div.querySelector('.btn-remove-pay').onclick = () => {
    if (document.querySelectorAll('.payment-row').length > 1) {
      div.remove();
      updatePaymentBalance();
    }
  };

  updatePaymentBalance();
}

function updatePaymentBalance() {
  const inputFinal = document.getElementById('input-final-price');
  const currentTotal = currentNegotiation.useCustom ? (parseFloat(inputFinal.value) || 0) : currentNegotiation.currentTotal;

  const values = Array.from(document.querySelectorAll('.pay-value')).map(el => parseFloat(el.value) || 0);
  const totalPaid = values.reduce((a, b) => a + b, 0);
  const remaining = currentTotal - totalPaid;

  const summary = document.getElementById('payment-summary');
  const remainingEl = document.getElementById('payment-remaining-value');
  const remainingLabel = document.getElementById('payment-remaining-label');
  const btnConfirm = document.getElementById('btn-negoc-confirm');

  // Hide error on input
  document.getElementById('negoc-errors')?.classList.add('hidden');

  const isComplete = Math.abs(remaining) < 0.01 && totalPaid > 0;
  // btnConfirm.disabled = !isComplete; // Replaced with custom validation on click

  if (Math.abs(remaining) > 0.01) {
    summary.classList.remove('hidden');
    remainingEl.textContent = formatMoney(Math.abs(remaining));

    if (remaining > 0) {
      remainingLabel.textContent = 'Pendente de preenchimento';
      remainingLabel.className = 'text-[9px] font-bold text-rose-400';
      remainingEl.className = 'text-sm font-black text-rose-500';
    } else {
      remainingLabel.textContent = 'Valor excedido';
      remainingLabel.className = 'text-[9px] font-bold text-amber-500';
      remainingEl.className = 'text-sm font-black text-amber-600';
    }
  } else {
    if (totalPaid > 0) {
      summary.classList.remove('hidden');
      remainingLabel.textContent = 'Valor Total Preenchido';
      remainingLabel.className = 'text-[9px] font-bold text-emerald-500';
      remainingEl.textContent = formatMoney(totalPaid);
      remainingEl.className = 'text-sm font-black text-emerald-600';
    } else {
      summary.classList.add('hidden');
    }
  }
}

// ===== EDIÇÃO DE PEDIDO =====
const drawerEditPedido = document.getElementById('edit-order-drawer');
const drawerEditOverlay = document.getElementById('edit-order-drawer-overlay');

let currentEditOrderId = null;
let currentEditCallbacks = {};

export function abrirModalEdicaoPedido(id, callbacks = {}) {
  const order = state.allOrders.find(o => (o.item_id === id || o.id_do_pedido === id));
  if (!order || !drawerEditPedido) return;

  currentEditOrderId = id;
  currentEditCallbacks = callbacks;

  // Preencher campos
  document.getElementById('edit-order-id-label').textContent = `Pedido: #${order.id_do_pedido}`;
  document.getElementById('edit-cliente-nome').value = order.cliente || '';
  document.getElementById('edit-cliente-fone').value = order.telefone || '';
  document.getElementById('edit-status-venda').value = order.status || 'Pendente';
  document.getElementById('edit-total-venda').value = order.total || 0;
  document.getElementById('edit-final-price-venda').value = order.final_price || order.total || 0;
  document.getElementById('edit-obs-venda').value = order.observacoes || '';

  // Inicializar Pagamentos
  const payContainer = document.getElementById('edit-payment-methods-container');
  if (payContainer) {
    payContainer.innerHTML = '';
    const paymentStr = order.pagamento || '';
    if (paymentStr.includes('(')) {
      // Múltiplos métodos: "Pix (R$ 10,00) + Dinheiro (R$ 5,00)"
      const parts = paymentStr.split(' + ');
      parts.forEach(p => {
        const match = p.match(/(.+)\s?\((.+)\)/);
        if (match) {
          const method = match[1].trim();
          const rawVal = match[2].replace('R$', '').replace(/\s/g, '').trim();
          const val = parseFloat(rawVal.replace(/\./g, '').replace(',', '.'));
          addEditPaymentRow(val, method);
        }
      });
    } else if (paymentStr) {
      // Método único: "Pix"
      addEditPaymentRow(order.final_price || order.total, paymentStr);
    } else {
      addEditPaymentRow(order.final_price || order.total, 'Pix');
    }
  }

  const inputFinal = document.getElementById('edit-final-price-venda');
  inputFinal.oninput = updateEditPaymentBalance;

  document.getElementById('edit-btn-add-pagamento').onclick = () => addEditPaymentRow();

  const isDateValid = order.parsedDate && !isNaN(order.parsedDate.getTime()) && order.parsedDate.getTime() !== 0;
  const dataFormatada = isDateValid 
    ? formatDateBr(order.parsedDate) + ' ' + order.parsedDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : formatDateBr(order.data);
  document.getElementById('edit-data-venda').value = dataFormatada;

  // Abrir Drawer
  drawerEditPedido.classList.remove('closed');
  drawerEditOverlay?.classList.remove('hidden');

  // Listeners de fechar
  document.getElementById('btn-close-edit-drawer').onclick = fecharModalEdicaoPedido;
  document.getElementById('btn-cancel-edit').onclick = fecharModalEdicaoPedido;
  drawerEditOverlay.onclick = fecharModalEdicaoPedido;

  // Listener de salvar
  document.getElementById('btn-save-edit').onclick = salvarEdicaoPedidoAPI;
  document.getElementById('edit-order-errors')?.classList.add('hidden');
}

export function fecharModalEdicaoPedido() {
  drawerEditPedido?.classList.add('closed');
  drawerEditOverlay?.classList.add('hidden');
  currentEditOrderId = null;
}

async function salvarEdicaoPedidoAPI() {
  if (!currentEditOrderId) return;

  // Validation
  const inputFinalVal = document.getElementById('edit-final-price-venda');
  const currentTotal = parseFloat(inputFinalVal.value) || 0;
  const payValues = Array.from(document.querySelectorAll('#edit-payment-methods-container .pay-value')).map(el => parseFloat(el.value) || 0);
  const totalPaid = payValues.reduce((a, b) => a + b, 0);
  const remaining = currentTotal - totalPaid;

  const errorContainer = document.getElementById('edit-order-errors');
  const errorMsg = document.getElementById('edit-order-errors-msg');

  if (Math.abs(remaining) > 0.01) {
    if (errorContainer && errorMsg) {
      errorMsg.textContent = remaining > 0 
        ? `Ainda resta um saldo pendente de ${formatMoney(remaining)}.`
        : `O valor dos pagamentos excede o total em ${formatMoney(Math.abs(remaining))}.`;
      errorContainer.classList.remove('hidden');
    }
    return;
  }

  if (totalPaid <= 0 && currentTotal > 0) {
    if (errorContainer && errorMsg) {
      errorMsg.textContent = 'Adicione pelo menos um meio de pagamento.';
      errorContainer.classList.remove('hidden');
    }
    return;
  }

  // Aggregate payments
  const paymentRows = Array.from(document.querySelectorAll('#edit-payment-methods-container .payment-row'));
  let pagamentoStr = '';
  if (paymentRows.length === 1) {
    pagamentoStr = paymentRows[0].querySelector('.pay-method').value;
  } else {
    pagamentoStr = paymentRows.map(row => {
      const method = row.querySelector('.pay-method').value;
      const val = parseFloat(row.querySelector('.pay-value').value) || 0;
      return `${method} (${formatMoney(val)})`;
    }).join(' + ');
  }

  const data = {
    cliente: document.getElementById('edit-cliente-nome').value,
    telefone: document.getElementById('edit-cliente-fone').value,
    status: document.getElementById('edit-status-venda').value,
    pagamento: pagamentoStr,
    total: parseFloat(document.getElementById('edit-total-venda').value),
    final_price: parseFloat(document.getElementById('edit-final-price-venda').value),
    observacoes: document.getElementById('edit-obs-venda').value,
    data: document.getElementById('edit-data-venda').value
  };

  try {
    showToast('Salvando alterações...', 'blue', 'fa-spinner', true);
    const resp = await fetch(`${CONFIG.apiBaseUrl}?action=salvar_edicao_pedido`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ id: currentEditOrderId, data: data })
    });

    const json = await resp.json();
    if (!json.ok) throw new Error(json.error);

    fecharModalEdicaoPedido();
    showToast('Venda atualizada com sucesso!', 'green', 'fa-check');
    
    // Recarregar dados
    await loadDashboardData(currentEditCallbacks.dataCallbacks || {}, true);
    renderTable(currentEditCallbacks);
    if (currentEditCallbacks.onRender) currentEditCallbacks.onRender();

  } catch (err) {
    console.error(err);
    showToast('Erro ao salvar alterações.', 'red', 'fa-xmark');
  }
}

function addEditPaymentRow(val = null, method = 'Pix') {
  const container = document.getElementById('edit-payment-methods-container');
  if (!container) return;

  const div = document.createElement('div');
  div.className = 'payment-row flex items-center gap-2 animate-[fadeIn_0.2s_ease-out] bg-gray-50/30 p-2 rounded-xl border border-gray-100';
  div.innerHTML = `
    <div class="relative group flex-1">
      <select class="pay-method w-full pl-3 pr-8 py-2 bg-white border border-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-[10px] appearance-none cursor-pointer transition-all">
        <option value="Pix">Pix</option>
        <option value="Dinheiro">Dinheiro</option>
        <option value="Cartão de Crédito">Cartão de Crédito</option>
        <option value="Cartão de Débito">Cartão de Débito</option>
        <option value="Link de Pagamento">Link de Pagamento</option>
        <option value="Fiado">Fiado</option>
      </select>
      <i class="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[8px] text-gray-300 pointer-events-none"></i>
    </div>
    <div class="relative group w-28">
      <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 font-bold text-[9px]">R$</span>
      <input type="number" step="0.01" class="pay-value w-full pl-7 pr-2 py-2 bg-white border border-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-black text-[10px] transition-all" placeholder="0,00" value="${val !== null ? parseFloat(val).toFixed(2) : ''}">
    </div>
    <button type="button" class="btn-remove-pay w-8 h-8 flex-shrink-0 flex items-center justify-center bg-white border border-gray-100 text-gray-300 hover:text-rose-500 hover:border-rose-100 rounded-lg transition-all shadow-sm">
      <i class="fa-solid fa-xmark text-[10px]"></i>
    </button>
  `;
  container.appendChild(div);

  const select = div.querySelector('.pay-method');
  if (method) select.value = method;

  const input = div.querySelector('.pay-value');
  input.oninput = updateEditPaymentBalance;

  div.querySelector('.btn-remove-pay').onclick = () => {
    if (document.querySelectorAll('#edit-payment-methods-container .payment-row').length > 1) {
      div.remove();
      updateEditPaymentBalance();
    }
  };

  updateEditPaymentBalance();
}

function updateEditPaymentBalance() {
  const inputFinal = document.getElementById('edit-final-price-venda');
  const currentTotal = parseFloat(inputFinal.value) || 0;

  const values = Array.from(document.querySelectorAll('#edit-payment-methods-container .pay-value')).map(el => parseFloat(el.value) || 0);
  const totalPaid = values.reduce((a, b) => a + b, 0);
  const remaining = currentTotal - totalPaid;

  const summary = document.getElementById('edit-payment-summary');
  const remainingEl = document.getElementById('edit-payment-remaining-value');
  const remainingLabel = document.getElementById('edit-payment-remaining-label');
  const btnSave = document.getElementById('btn-save-edit');

  const isComplete = Math.abs(remaining) < 0.01 && totalPaid > 0;
  // btnSave.disabled = !isComplete; // Replaced with custom validation on click
  document.getElementById('edit-order-errors')?.classList.add('hidden');

  if (Math.abs(remaining) > 0.01) {
    summary.classList.remove('hidden');
    remainingEl.textContent = formatMoney(Math.abs(remaining));

    if (remaining > 0) {
      remainingLabel.textContent = 'Pendente';
      remainingLabel.className = 'text-[9px] font-bold text-rose-400';
      remainingEl.className = 'text-sm font-black text-rose-500';
    } else {
      remainingLabel.textContent = 'Excedido';
      remainingLabel.className = 'text-[9px] font-bold text-amber-500';
      remainingEl.className = 'text-sm font-black text-amber-600';
    }
  } else {
    if (totalPaid > 0) {
      summary.classList.remove('hidden');
      remainingLabel.textContent = 'Pago';
      remainingLabel.className = 'text-[9px] font-bold text-emerald-500';
      remainingEl.textContent = formatMoney(totalPaid);
      remainingEl.className = 'text-sm font-black text-emerald-600';
    } else {
      summary.classList.add('hidden');
    }
  }
}

// ===== NOVO PEDIDO MANUAL =====
const modalNovoPedido = document.getElementById('modal-novo-pedido');
const formNovoPedido = document.getElementById('form-novo-pedido');

export function abrirModalNovoPedido() {
  if (!modalNovoPedido) return;

  // Popular select de produtos
  const select = document.getElementById('man-produto');
  if (select) {
    select.innerHTML = '<option value="">Selecione um produto...</option>';
    const sortedProducts = [...state.allProducts].sort((a, b) => {
      const estA = parseInt(a.estoque) || 0;
      const estB = parseInt(b.estoque) || 0;
      if (estA > 0 && estB <= 0) return -1;
      if (estA <= 0 && estB > 0) return 1;
      // Desempate por nome
      return (a.nome || '').localeCompare(b.nome || '');
    });

    sortedProducts.forEach(p => {
      let desc = `${p.nome} ${p.armazenamento ? '- ' + p.armazenamento : ''} ${p.cor ? '(' + p.cor + ')' : ''}`;

      if (p.condicao) {
        desc += ` [${p.condicao}]`;
      }

      const estoque = parseInt(p.estoque) || 0;
      if (estoque <= 0) {
        desc += ' (sem estoque)';
      }

      const opt = document.createElement('option');
      opt.value = p.sku || p.id;
      opt.textContent = desc;
      opt.dataset.preco = p.preco;

      if (estoque <= 0) {
        opt.disabled = true;
      }

      select.appendChild(opt);
    });
  }

  // Reset form
  formNovoPedido?.reset();
  document.getElementById('pedido-manual-errors')?.classList.add('hidden');
  modalNovoPedido.classList.remove('hidden');
}

export function fecharModalNovoPedido() {
  modalNovoPedido?.classList.add('hidden');
}

export async function salvarPedidoManual(callbacks = {}) {
  const sku = document.getElementById('man-produto').value;
  const qtd = parseInt(document.getElementById('man-qtd').value) || 1;
  const precoCustom = parseFloat(document.getElementById('man-preco').value);

  const erros = [];
  if (!sku) erros.push('Selecione um produto');
  if (qtd <= 0) erros.push('Quantidade deve ser maior que zero');

  if (erros.length > 0) {
    const errContainer = document.getElementById('pedido-manual-errors');
    const errList = document.getElementById('pedido-manual-errors-list');
    errList.innerHTML = erros.map(e => `<li>${e}</li>`).join('');
    errContainer.classList.remove('hidden');
    return;
  }

  const prod = state.allProducts.find(p => (p.sku === sku || p.id === sku));
  const item = {
    sku: sku,
    group_id: prod.grupo_id || prod.id,
    marca: prod.categoria,
    nome: prod.nome,
    armazenamento: prod.armazenamento,
    cor: prod.cor,
    condicao: prod.condicao,
    quantidade: qtd,
    preco: !isNaN(precoCustom) ? precoCustom : prod.preco
  };

  const payload = {
    total: item.preco * item.quantidade,
    itens: [item]
  };

  try {
    showToast('Lançando pedido...', 'blue', 'fa-spinner', true);
    const resp = await fetch(`${CONFIG.apiBaseUrl}?action=salvar_pedido`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    const json = await resp.json();
    if (!json.ok) throw new Error(json.error);

    fecharModalNovoPedido();
    showToast('Pedido lançado com sucesso!', 'green', 'fa-check');
    await loadDashboardData(callbacks.dataCallbacks || {}, true);
    renderTable(callbacks);
    // Se tiver pipeline de renderização, atualiza tudo
    if (callbacks.onRender) callbacks.onRender();

  } catch (err) {
    console.error(err);
    showToast('Erro ao salvar pedido.', 'red', 'fa-xmark');
  }
}

// ===== EXCLUSÃO DE PEDIDO =====
let pedidoParaExcluir = null;
const modalExcluir = document.getElementById('modal-excluir-pedido');

export function confirmarExclusao(itemId, callbacks = {}) {
  pedidoParaExcluir = itemId;
  modalExcluir?.classList.remove('hidden');

  const btnConfirm = document.getElementById('btn-excluir-confirm');
  btnConfirm.onclick = () => excluirPedidoAPI(itemId, callbacks);

  const btnCancel = document.getElementById('btn-excluir-cancel');
  btnCancel.onclick = () => modalExcluir.classList.add('hidden');
}

async function excluirPedidoAPI(itemId, callbacks) {
  modalExcluir?.classList.add('hidden');
  showToast('Excluindo pedido...', 'blue', 'fa-spinner', true);

  try {
    const resp = await fetch(`${CONFIG.apiBaseUrl}?action=excluir_pedido`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ item_id: itemId })
    });

    const json = await resp.json();
    if (!json.ok) throw new Error(json.error);

    showToast('Pedido excluído!', 'green', 'fa-check');
    await loadDashboardData(callbacks.dataCallbacks || {}, true);
    renderTable(callbacks);
    if (callbacks.onRender) callbacks.onRender();

  } catch (err) {
    console.error(err);
    showToast('Erro ao excluir pedido.', 'red', 'fa-xmark');
  }
}

let isInternalSync = false;

export function syncPeriodFilterOptions() {
  if (isInternalSync) return;
  isInternalSync = true;
  const selects = ['period-filter', 'period-filter-mobile', 'table-period', 'metricas-period'];
  const months = getMonthOptions();

  selects.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    const currentVal = el.value;
    const isMainFilter = id.includes('period-filter');
    const isMetricas = id === 'metricas-period';

    // Keep standard options
    let html = isMainFilter ? `
      <option value="today">Hoje</option>
      <option value="yesterday">Ontem</option>
      <option value="7">Últimos 7 dias</option>
      <option value="14">Últimos 14 dias</option>
      <option value="30">Últimos 30 dias</option>
      <option value="all">Máximo</option>
      <option value="custom">Personalizado</option>
    ` : isMetricas ? `
      <option value="hoje">Hoje</option>
      <option value="ontem">Ontem</option>
      <option value="7d">Últimos 7 dias</option>
      <option value="14d">Últimos 14 dias</option>
      <option value="30d">Últimos 30 dias</option>
      <option value="max">Máximo</option>
    ` : `
      <option value="all">Todos os Pedidos</option>
      <option value="today">Hoje</option>
      <option value="yesterday">Ontem</option>
      <option value="7">Últimos 7 dias</option>
      <option value="14">Últimos 14 dias</option>
      <option value="30">Últimos 30 dias</option>
      <option value="custom">Data Específica</option>
    `;

    // Insert months before "Personalizado" or "Máximo" or at the end
    const monthHtml = months.map(m => `<option value="month:${m.value}">${m.label}</option>`).join('');

    if (html.includes('<option value="custom">')) {
      html = html.replace('<option value="custom">', `${monthHtml}<option value="custom">`);
    } else if (html.includes('<option value="max">')) {
      html = html.replace('<option value="max">', `${monthHtml}<option value="max">`);
    } else {
      html += monthHtml;
    }

    el.innerHTML = html;

    // Restore selection if it still exists
    if ([...el.options].some(opt => opt.value === currentVal)) {
      el.value = currentVal;
    } else if (isMainFilter && currentVal === '') {
      el.value = 'all';
    }
  });
  isInternalSync = false;
}

function getMonthOptions() {
  const months = new Set();
  const now = new Date();

  // Always include current month
  months.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

  // Include months from orders
  state.allOrders.forEach(o => {
    if (o.parsedDate && o.parsedDate.getTime() > 0) {
      months.add(`${o.parsedDate.getFullYear()}-${String(o.parsedDate.getMonth() + 1).padStart(2, '0')}`);
    }
  });

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  return Array.from(months)
    .sort((a, b) => b.localeCompare(a)) // Most recent first
    .map(val => {
      const [year, monthStr] = val.split('-');
      const mIdx = parseInt(monthStr, 10) - 1;
      return {
        value: val,
        label: `${monthNames[mIdx]}/${year}`
      };
    });
}

// ---- Filter Engine Helpers ----

export function filterOrders() {
  let displayOrders = [...state.allOrders];

  // 1. Search
  if (state.tableSearchTerm.length > 0) {
    const search = state.tableSearchTerm.toLowerCase();
    displayOrders = displayOrders.filter(o =>
      (o.produto || '').toLowerCase().includes(search) ||
      (o.id_do_pedido || '').toLowerCase().includes(search) ||
      (o.cliente || '').toLowerCase().includes(search)
    );
  }

  // 2. Base Filters
  if (state.tableStatusFilter !== 'all') {
    displayOrders = displayOrders.filter(o => o.status === state.tableStatusFilter);
  }
  if (state.tableBrandFilter !== 'all') {
    displayOrders = displayOrders.filter(o => o.categoria === state.tableBrandFilter);
  }
  if (state.tableConditionFilter !== 'all') {
    displayOrders = displayOrders.filter(o => o.condicao === state.tableConditionFilter);
  }
  if (state.tableStorageFilter !== 'all') {
    displayOrders = displayOrders.filter(o => o.armazenamento === state.tableStorageFilter);
  }
  if (state.tablePaymentFilter !== 'all') {
    displayOrders = displayOrders.filter(o => (o.pagamento || '').toLowerCase().includes(state.tablePaymentFilter.toLowerCase()));
  }

  // 3. Period Filter
  if (state.tablePeriodFilter !== 'all') {
    let tCut = new Date();
    tCut.setHours(0, 0, 0, 0);
    let tEnd = new Date();
    tEnd.setHours(23, 59, 59, 999);

    if (state.tablePeriodFilter === 'today') {
       // already set
    } else if (state.tablePeriodFilter === 'yesterday') {
      tCut.setDate(tCut.getDate() - 1);
      tEnd.setDate(tEnd.getDate() - 1);
    } else if (['7', '14', '30'].includes(state.tablePeriodFilter)) {
      tCut.setDate(tCut.getDate() - parseInt(state.tablePeriodFilter));
    } else if (state.tablePeriodFilter === 'custom') {
      const tableDateStart = document.getElementById('table-date-start');
      const tableDateEnd = document.getElementById('table-date-end');
      const isoStart = parseDateBr(tableDateStart?.value);
      const isoEnd = parseDateBr(tableDateEnd?.value);
      
      if (isoStart) tCut = new Date(isoStart + 'T00:00:00');
      else tCut = new Date(0);
      
      if (isoEnd) tEnd = new Date(isoEnd + 'T23:59:59');
    } else if (state.tablePeriodFilter.startsWith('month:')) {
      const val = state.tablePeriodFilter.split(':')[1];
      const [year, month] = val.split('-').map(Number);
      tCut = new Date(year, month - 1, 1, 0, 0, 0);
      tEnd = new Date(year, month, 0, 23, 59, 59);
    }
    displayOrders = displayOrders.filter(o => o.parsedDate >= tCut && o.parsedDate <= tEnd);
  }

  // 4. Financial Filters
  if (state.tableNegotiatedOnly) {
    displayOrders = displayOrders.filter(o => o.final_price && parseFloat(o.final_price) !== parseFloat(o.total));
  }
  if (state.tableLossOnly) {
    displayOrders = displayOrders.filter(o => {
      let prodRef = state.allProducts.find(p =>
        (p.sku && String(p.sku) === String(o.sku)) ||
        (p.id && String(p.id) === String(o.sku)) ||
        (p.id && String(p.id) === String(o.id))
      );
      if (!prodRef) {
        prodRef = state.allProducts.find(p => p.nome && String(p.nome).trim().toLowerCase() === String(o.produto).trim().toLowerCase());
      }
      if (!prodRef) return false;
      const rev = parseFloat(o.final_price || o.total) || 0;
      const custoTotal = (parseFloat(prodRef.custo || prodRef.preco_custo) || 0) * (o.quantidade || 1);
      return rev < custoTotal;
    });
  }
  if (state.tableMarginFilter !== 'all') {
    displayOrders = displayOrders.filter(o => {
      let prodRef = state.allProducts.find(p =>
        (p.sku && String(p.sku) === String(o.sku)) ||
        (p.id && String(p.id) === String(o.sku)) ||
        (p.id && String(p.id) === String(o.id))
      );
      if (!prodRef) {
        prodRef = state.allProducts.find(p => p.nome && String(p.nome).trim().toLowerCase() === String(o.produto).trim().toLowerCase());
      }
      if (!prodRef) return false;
      const rev = parseFloat(o.final_price || o.total) || 0;
      const custoTotal = (parseFloat(prodRef.custo || prodRef.preco_custo) || 0) * (o.quantidade || 1);
      const profit = rev - custoTotal;
      const margin = rev > 0 ? (profit / rev) * 100 : 0;
      if (state.tableMarginFilter === 'high') return margin > 20;
      if (state.tableMarginFilter === 'normal') return margin >= 10 && margin <= 20;
      if (state.tableMarginFilter === 'low') return margin < 10;
      return true;
    });
  }

  return displayOrders;
}

export function initDashboardListeners(callbacks = {}) {
  const searchInput = document.getElementById('table-search');
  const btnToggleFilters = document.getElementById('btn-toggle-filters');
  const filterDrawer = document.getElementById('filter-drawer');
  const drawerOverlay = document.getElementById('filter-drawer-overlay');
  const btnCloseDrawer = document.getElementById('btn-close-filter-drawer');
  const btnApplyDrawer = document.getElementById('btn-apply-drawer-filters');
  const btnResetDrawer = document.getElementById('btn-reset-drawer-filters');
  const btnClearAll = document.getElementById('btn-clear-all-filters');
  
  if (!searchInput) return;

  // Initial Load from Local
  loadFiltersFromLocal();

  // Search Interaction
  searchInput.value = state.tableSearchTerm;
  searchInput.oninput = (e) => {
    state.tableSearchTerm = e.target.value;
    renderTable(callbacks);
  };

  // Drawer Controls
  const toggleDrawer = (open) => {
    if (!filterDrawer) return;
    filterDrawer.classList.toggle('closed', !open);
    drawerOverlay?.classList.toggle('hidden', !open);
    if (open) syncUIToState();
  };

  if (btnToggleFilters) btnToggleFilters.onclick = () => toggleDrawer(true);
  if (btnCloseDrawer) btnCloseDrawer.onclick = () => toggleDrawer(false);
  if (drawerOverlay) drawerOverlay.onclick = () => toggleDrawer(false);

  // Sync state to drawer UI
  const syncUIToState = () => {
    const paySel = document.getElementById('table-payment');
    const perSel = document.getElementById('table-period');
    const brandSel = document.getElementById('table-brand');
    const storSel = document.getElementById('table-storage');
    const negCheck = document.getElementById('filter-negotiated');
    const lossCheck = document.getElementById('filter-loss');
    const margSel = document.getElementById('table-margin-filter');

    if (paySel) paySel.value = state.tablePaymentFilter;
    if (perSel) perSel.value = state.tablePeriodFilter;
    if (brandSel) brandSel.value = state.tableBrandFilter;
    if (storSel) storSel.value = state.tableStorageFilter;
    if (negCheck) negCheck.checked = state.tableNegotiatedOnly;
    if (lossCheck) lossCheck.checked = state.tableLossOnly;
    if (margSel) margSel.value = state.tableMarginFilter;

    // Custom date visibility
    const customWrap = document.getElementById('table-custom-wrap');
    if (customWrap) customWrap.classList.toggle('hidden', state.tablePeriodFilter !== 'custom');
    
    // Chips in drawer
    document.querySelectorAll('#filter-group-status .filter-chip').forEach(c => {
       c.classList.toggle('active', state.tableStatusFilter === c.dataset.value);
       c.classList.toggle('inactive', state.tableStatusFilter !== c.dataset.value);
    });
    document.querySelectorAll('#filter-group-condition .filter-chip').forEach(c => {
       c.classList.toggle('active', state.tableConditionFilter === c.dataset.value);
       c.classList.toggle('inactive', state.tableConditionFilter !== c.dataset.value);
    });
  };

  // Apply Drawer Filters
  if (btnApplyDrawer) {
    btnApplyDrawer.onclick = () => {
      state.tablePaymentFilter = document.getElementById('table-payment').value;
      state.tablePeriodFilter = document.getElementById('table-period').value;
      state.tableBrandFilter = document.getElementById('table-brand').value;
      state.tableStorageFilter = document.getElementById('table-storage').value;
      state.tableNegotiatedOnly = document.getElementById('filter-negotiated').checked;
      state.tableLossOnly = document.getElementById('filter-loss').checked;
      state.tableMarginFilter = document.getElementById('table-margin-filter').value;
      
      saveFiltersToLocal();
      toggleDrawer(false);
      renderTable(callbacks);
    };
  }

  // Reset Drawer
  if (btnResetDrawer) btnResetDrawer.onclick = () => resetAllFilters(callbacks);
  if (btnClearAll) btnClearAll.onclick = () => resetAllFilters(callbacks);

  // Quick Chips logic
  document.querySelectorAll('.quick-filter-chip').forEach(chip => {
     chip.onclick = () => {
        const { filter, value } = chip.dataset;
        if (filter === 'period') {
           state.tablePeriodFilter = state.tablePeriodFilter === value ? 'all' : value;
           // REMOVED: toggleDrawer(true) for custom, now handled inline
        }
        if (filter === 'status') state.tableStatusFilter = state.tableStatusFilter === value ? 'all' : value;
        if (filter === 'finance') {
           if (value === 'negotiated') state.tableNegotiatedOnly = !state.tableNegotiatedOnly;
           if (value === 'fiado') state.tablePaymentFilter = state.tablePaymentFilter === 'Fiado' ? 'all' : 'Fiado';
           if (value === 'loss') state.tableLossOnly = !state.tableLossOnly;
           if (value === 'high_margin') state.tableMarginFilter = state.tableMarginFilter === 'high' ? 'all' : 'high';
           if (value === 'pix') state.tablePaymentFilter = state.tablePaymentFilter === 'Pix' ? 'all' : 'Pix';
           if (value === 'card') state.tablePaymentFilter = state.tablePaymentFilter === 'Cartão' ? 'all' : 'Cartão';
           if (value === 'cash') state.tablePaymentFilter = state.tablePaymentFilter === 'Dinheiro' ? 'all' : 'Dinheiro';
        }
        saveFiltersToLocal();
        renderTable(callbacks);
     };
  });

  // Quick Custom Date Inputs
  ['table-date-start-quick', 'table-date-end-quick'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const syncAndRender = (e) => {
        const targetId = id.replace('-quick', '');
        const target = document.getElementById(targetId);
        if (target) target.value = e.target.value;
        renderTable(callbacks);
      };
      el.oninput = syncAndRender;
      el.onchange = syncAndRender;
    }
  });

  // Drawer Chips logic
  document.querySelectorAll('.filter-chip').forEach(chip => {
     chip.onclick = () => {
        const group = chip.parentElement.id;
        if (group === 'filter-group-status') state.tableStatusFilter = state.tableStatusFilter === chip.dataset.value ? 'all' : chip.dataset.value;
        if (group === 'filter-group-condition') state.tableConditionFilter = state.tableConditionFilter === chip.dataset.value ? 'all' : chip.dataset.value;
        syncUIToState();
     };
  });

  // View Mode
  document.querySelectorAll('.btn-view-mode').forEach(btn => {
     btn.onclick = () => {
        state.viewPreference = btn.dataset.mode;
        localStorage.setItem('vendly_orders_view', state.viewPreference);
        renderTable(callbacks);
     };
  });

  // Period select special handling
  const periodSel = document.getElementById('table-period');
  if (periodSel) {
    periodSel.onchange = (e) => {
       const wrap = document.getElementById('table-custom-wrap');
       if (wrap) wrap.classList.toggle('hidden', e.target.value !== 'custom');
       state.tablePeriodFilter = e.target.value;
    };
  }

  renderTable(callbacks);
}

function saveFiltersToLocal() {
  const filters = {
    status: state.tableStatusFilter,
    brand: state.tableBrandFilter,
    condition: state.tableConditionFilter,
    storage: state.tableStorageFilter,
    period: state.tablePeriodFilter,
    payment: state.tablePaymentFilter,
    margin: state.tableMarginFilter,
    negotiated: state.tableNegotiatedOnly,
    loss: state.tableLossOnly,
    search: state.tableSearchTerm
  };
  localStorage.setItem('vendly_last_filters', JSON.stringify(filters));
}

function loadFiltersFromLocal() {
  const saved = localStorage.getItem('vendly_last_filters');
  if (saved) {
    try {
      const f = JSON.parse(saved);
      state.tableStatusFilter = f.status || 'all';
      state.tableBrandFilter = f.brand || 'all';
      state.tableConditionFilter = f.condition || 'all';
      state.tableStorageFilter = f.storage || 'all';
      state.tablePeriodFilter = 'all'; // Always start with no period filter
      state.tablePaymentFilter = f.payment || 'all';
      state.tableMarginFilter = f.margin || 'all';
      state.tableNegotiatedOnly = !!f.negotiated;
      state.tableLossOnly = !!f.loss;
      state.tableSearchTerm = f.search || '';
    } catch(e) {}
  }
  state.viewPreference = localStorage.getItem('vendly_orders_view') || 'list';
}

function resetAllFilters(callbacks) {
  state.tableStatusFilter = 'all';
  state.tableBrandFilter = 'all';
  state.tableConditionFilter = 'all';
  state.tableStorageFilter = 'all';
  state.tablePeriodFilter = 'all';
  state.tablePaymentFilter = 'all';
  state.tableMarginFilter = 'all';
  state.tableNegotiatedOnly = false;
  state.tableLossOnly = false;
  state.tableSearchTerm = '';
  const searchInput = document.getElementById('table-search');
  if (searchInput) searchInput.value = '';
  saveFiltersToLocal();
  renderTable(callbacks);
}

function renderActiveFilters() {
  const bar = document.getElementById('active-filters-bar');
  const list = document.getElementById('active-filters-list');
  const badge = document.getElementById('filter-badge');
  const quickChips = document.querySelectorAll('.quick-filter-chip');
  
  if (!bar || !list) return;

  list.innerHTML = '';
  let count = 0;

  const addTag = (label, type) => {
     count++;
     const tag = document.createElement('div');
     tag.className = 'active-filter-tag animate-[fadeIn_0.2s_ease-out] group';
     tag.innerHTML = `<span>${label}</span><i class="fa-solid fa-xmark hover:text-rose-500 transition-colors"></i>`;
     tag.querySelector('i').onclick = () => {
        if (type === 'status') state.tableStatusFilter = 'all';
        if (type === 'brand') state.tableBrandFilter = 'all';
        if (type === 'condition') state.tableConditionFilter = 'all';
        if (type === 'storage') state.tableStorageFilter = 'all';
        if (type === 'period') state.tablePeriodFilter = 'all';
        if (type === 'payment') state.tablePaymentFilter = 'all';
        if (type === 'margin') state.tableMarginFilter = 'all';
        if (type === 'negotiated') state.tableNegotiatedOnly = false;
        if (type === 'loss') state.tableLossOnly = false;
        saveFiltersToLocal();
        renderTable();
     };
     list.appendChild(tag);
  };

  if (state.tableStatusFilter !== 'all') addTag(state.tableStatusFilter, 'status');
  if (state.tableBrandFilter !== 'all') addTag(state.tableBrandFilter, 'brand');
  if (state.tableConditionFilter !== 'all') addTag(state.tableConditionFilter, 'condition');
  if (state.tableStorageFilter !== 'all') addTag(state.tableStorageFilter, 'storage');
  if (state.tablePeriodFilter !== 'all') {
    const labels = { today: 'Hoje', yesterday: 'Ontem', '7': '7 Dias', '14': '14 Dias', '30': '30 Dias' };
    let label = labels[state.tablePeriodFilter] || state.tablePeriodFilter;

    if (state.tablePeriodFilter === 'custom') {
      const s = document.getElementById('table-date-start')?.value;
      const e = document.getElementById('table-date-end')?.value;
      if (s && e) label = `${s} até ${e}`;
      else if (s) label = `Desde ${s}`;
      else if (e) label = `Até ${e}`;
      else label = 'Personalizado';
    } else if (state.tablePeriodFilter.startsWith('month:')) {
      const val = state.tablePeriodFilter.split(':')[1];
      const [year, month] = val.split('-');
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      label = `${monthNames[parseInt(month) - 1]}/${year}`;
    }

    addTag(label, 'period');
  }
  if (state.tablePaymentFilter !== 'all') addTag(state.tablePaymentFilter, 'payment');
  if (state.tableMarginFilter !== 'all') {
    const labels = { high: 'Margem Alta', normal: 'Margem Normal', low: 'Margem Baixa' };
    addTag(labels[state.tableMarginFilter], 'margin');
  }
  if (state.tableNegotiatedOnly) addTag('Negociado', 'negotiated');
  if (state.tableLossOnly) addTag('Prejuízo', 'loss');

  bar.classList.toggle('hidden', count === 0);
  badge.textContent = count;
  badge.classList.toggle('hidden', count === 0);

  // Sync Quick Chips visual
  quickChips.forEach(chip => {
     const { filter, value } = chip.dataset;
     let active = false;
     if (filter === 'period') active = state.tablePeriodFilter === value;
     if (filter === 'status') active = state.tableStatusFilter === value;
      if (filter === 'finance') {
        if (value === 'negotiated') active = state.tableNegotiatedOnly;
        if (value === 'fiado') active = state.tablePaymentFilter === 'Fiado';
        if (value === 'pix') active = state.tablePaymentFilter === 'Pix';
        if (value === 'card') active = state.tablePaymentFilter === 'Cartão';
        if (value === 'cash') active = state.tablePaymentFilter === 'Dinheiro';
        if (value === 'loss') active = state.tableLossOnly;
        if (value === 'high_margin') active = state.tableMarginFilter === 'high';
     }
     chip.classList.toggle('active', active);
     chip.classList.toggle('inactive', !active);
  });

  // Sync View Mode Buttons
  const btnList = document.getElementById('btn-view-list');
  const btnGrid = document.getElementById('btn-view-grid');
  if (btnList && btnGrid) {
     btnList.classList.toggle('active', state.viewPreference === 'list');
     btnGrid.classList.toggle('active', state.viewPreference === 'grid');
  }

  // Sync Quick Custom Date Range Container
  const quickCustomWrap = document.getElementById('quick-date-range-container');
  if (quickCustomWrap) {
    const isCustom = state.tablePeriodFilter === 'custom';
    quickCustomWrap.classList.toggle('hidden', !isCustom);
    if (isCustom) {
      const qStart = document.getElementById('table-date-start-quick');
      const qEnd = document.getElementById('table-date-end-quick');
      const dStart = document.getElementById('table-date-start');
      const dEnd = document.getElementById('table-date-end');
      if (qStart && dStart) qStart.value = dStart.value;
      if (qEnd && dEnd) qEnd.value = dEnd.value;
    }
  }
}
