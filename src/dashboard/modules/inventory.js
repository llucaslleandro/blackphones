import { CONFIG } from '../../shared/config.js';
import { state, loadDashboardData, uploadImageToDrive } from './store.js';
import { formatMoney, formatText, showToast, compressImage, parseNumber } from './ui.js';

let pendingEstoqueUpdates = {};
let pendingDeleteSku = null;

export function renderEstoque(callbacks = {}) {
  const tbody = document.getElementById('estoque-table-body');
  const btnSalvar = document.getElementById('btn-salvar-estoque');
  if (!tbody) return;

  let produtosValidos = state.allProducts.filter(p => p.sku && p.sku !== '');
  let esgotados = 0, poucas = 0, disponiveis = 0, patrimonioTotal = 0, totalAparelhos = 0;

  produtosValidos.forEach(p => {
    const est = Number(p.estoque) || 0;
    const min = Number(p.estoque_minimo) || 2;
    const custo = parseNumber(p.custo ?? p.preco_custo ?? 0);
    
    totalAparelhos += est;
    if (est <= 0) esgotados++;
    else if (est <= min) poucas++;
    else disponiveis++;

    if (est > 0) {
      patrimonioTotal += custo * est;
    }
  });

  document.getElementById('alert-patrimonio').textContent = formatMoney(patrimonioTotal);
  document.getElementById('alert-total-qtd').textContent = totalAparelhos;
  document.getElementById('alert-esgotados').textContent = esgotados;
  document.getElementById('alert-poucas').textContent = poucas;
  document.getElementById('alert-estoque').textContent = disponiveis;

  const searchEstoque = document.getElementById('estoque-search')?.value.toLowerCase() || '';
  const filterEstoque = document.getElementById('estoque-filter')?.value || 'all';

  // Pré-processar mapa de vendas para filtro de "Parados"
  const today = new Date();
  const lastSaleMap = {};
  const normalizeText = (text) => {
    return String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
  };

  state.allOrders.forEach(o => {
    if (o.status === 'Fechado') {
      const sku = String(o.sku || '').trim().toLowerCase();
      let combinedName = String(o.produto || '');
      const storage = String(o.armazenamento || '');
      const color = String(o.cor || '');
      if (storage && !combinedName.includes(storage)) combinedName += ' ' + storage;
      if (color && !combinedName.includes(color)) combinedName += ' ' + color;
      const pNameNormalized = normalizeText(combinedName);
      if (sku) { if (!lastSaleMap[sku] || o.parsedDate > lastSaleMap[sku]) lastSaleMap[sku] = o.parsedDate; }
      if (pNameNormalized) { if (!lastSaleMap[pNameNormalized] || o.parsedDate > lastSaleMap[pNameNormalized]) lastSaleMap[pNameNormalized] = o.parsedDate; }
    }
  });

  // Aplicar Filtros
  if (searchEstoque.length > 0) {
    produtosValidos = produtosValidos.filter(p =>
      (p.nome || '').toLowerCase().includes(searchEstoque) ||
      (p.sku || '').toLowerCase().includes(searchEstoque) ||
      (p.imei1 || '').toLowerCase().includes(searchEstoque) ||
      (p.imei2 || '').toLowerCase().includes(searchEstoque)
    );
  }

  if (filterEstoque !== 'all') {
    produtosValidos = produtosValidos.filter(p => {
      const est = Number(p.estoque) || 0;
      const min = Number(p.estoque_minimo) || 2;
      
      if (filterEstoque === 'em-estoque') return est > 0;
      if (filterEstoque === 'esgotados') return est <= 0;
      if (filterEstoque === 'baixo-estoque') return est > 0 && est <= min;
      
      if (filterEstoque === 'parados') {
        if (est <= 0) return false;
        const sku = String(p.sku || '').trim().toLowerCase();
        let combinedName = String(p.nome || '');
        if (p.armazenamento && !combinedName.includes(p.armazenamento)) combinedName += ' ' + p.armazenamento;
        if (p.cor && !combinedName.includes(p.cor)) combinedName += ' ' + p.cor;
        const fullNomeNormalized = normalizeText(combinedName);
        
        let lastDate = sku && lastSaleMap[sku] ? lastSaleMap[sku] : (fullNomeNormalized && lastSaleMap[fullNomeNormalized] ? lastSaleMap[fullNomeNormalized] : null);
        const days = lastDate ? Math.floor(Math.abs(today - lastDate) / (1000 * 60 * 60 * 24)) : 999;
        return days >= 15;
      }
      return true;
    });
  }

  tbody.innerHTML = '';
  if (produtosValidos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-gray-500 text-sm italic">Nenhum produto em estoque.</td></tr>`;
    return;
  }



  produtosValidos.forEach(p => {
    const pending = pendingEstoqueUpdates[p.sku] || {};
    const estVal = pending.estoque !== undefined ? pending.estoque : (Number(p.estoque) || 0);
    const minVal = pending.estoque_minimo !== undefined ? pending.estoque_minimo : (Number(p.estoque_minimo) || 2);

    let statusColor = 'text-green-600';
    let statusText = 'Em Estoque';
    if (estVal <= 0) { statusColor = 'text-red-600'; statusText = 'Esgotado'; }
    else if (estVal <= minVal) { statusColor = 'text-orange-600'; statusText = estVal === 1 ? 'Última Unid' : 'Abaixo do Mín'; }

    const varList = [p.armazenamento, p.cor, p.condicao].filter(v => v && v.trim() !== '');
    const isActive = String(p.ativo).toLowerCase() === 'true';
    const rowOpacity = isActive ? '' : 'opacity-60 bg-gray-50';
    
    const skuKey = String(p.sku || '').trim().toLowerCase();
    let combinedName = String(p.nome || '');
    if (p.armazenamento && !combinedName.includes(p.armazenamento)) combinedName += ' ' + p.armazenamento;
    if (p.cor && !combinedName.includes(p.cor)) combinedName += ' ' + p.cor;
    const fullNomeNormalized = normalizeText(combinedName);
    
    const lastDate = skuKey && lastSaleMap[skuKey] ? lastSaleMap[skuKey] : (fullNomeNormalized && lastSaleMap[fullNomeNormalized] ? lastSaleMap[fullNomeNormalized] : null);
    const giroStr = lastDate ? (Math.floor(Math.abs(today - lastDate) / (1000 * 60 * 60 * 24)) === 0 ? 'Hoje' : `${Math.floor(Math.abs(today - lastDate) / (1000 * 60 * 60 * 24))} dias`) : '-';

    const precoVenda = parseNumber(p.preco ?? 0);
    const custoUnid = parseNumber(p.custo ?? p.preco_custo ?? 0);
    const lucro = precoVenda - custoUnid;

    tbody.innerHTML += `
      <tr class="hover:bg-gray-50/50 transition border-b border-gray-100 last:border-0 ${rowOpacity}">
        <td class="px-6 py-4">
          <div class="flex flex-col min-w-0">
            <div class="flex items-center gap-2">
               <span class="text-sm font-bold text-gray-900 truncate">${formatText(p.nome)}</span>
               ${!isActive ? '<span class="px-1.5 py-0.5 bg-gray-200 text-gray-500 text-[8px] font-black uppercase rounded">Inativo</span>' : ''}
            </div>
            <span class="text-[9px] text-gray-400 font-mono tracking-tighter uppercase">${p.sku}</span>
            <div class="flex flex-wrap gap-x-2 gap-y-1 mt-1.5">
               ${varList.map(v => `<span class="text-[9px] font-extrabold text-gray-500 px-1.5 py-0.5 bg-gray-100 rounded uppercase tracking-wider">${v}</span>`).join('')}
            </div>
          </div>
        </td>
        <td class="px-6 py-4 text-center">
          <span class="text-xs font-bold text-gray-700 font-mono">${formatMoney(custoUnid).replace('R$ ', 'R$')}</span>
        </td>
        <td class="px-6 py-4 text-center">
          <div class="flex flex-col items-center">
            <span class="text-xs font-bold text-indigo-600 font-mono">${formatMoney(precoVenda).replace('R$ ', 'R$')}</span>
            <span class="text-[9px] font-bold text-emerald-600 mt-0.5">+ ${formatMoney(lucro).replace('R$ ', 'R$')} lucro</span>
          </div>
        </td>
        <td class="px-6 py-4 text-center">
          <span class="text-[10px] font-black px-2 py-1 rounded bg-gray-50 text-gray-500 border border-gray-200/50">${giroStr}</span>
        </td>
        <td class="px-6 py-4">
          <div class="flex flex-col items-center">
             <div class="flex items-center gap-1.5">
                <input type="number" value="${estVal}" class="est-val-input w-14 px-1.5 py-1 text-center text-xs font-black border border-gray-200 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all ${estVal <= 0 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-gray-900'}" data-sku="${p.sku}">
                <span class="text-gray-300 text-[10px] font-bold">/</span>
                <input type="number" min="0" value="${minVal}" class="est-min-input w-12 px-1 py-1 text-center text-[10px] font-bold border border-gray-100 bg-gray-50 rounded text-gray-500 outline-none" data-sku="${p.sku}">
             </div>
             <span class="text-[8px] font-black uppercase tracking-tighter mt-1.5 ${statusColor}">${statusText}</span>
          </div>
        </td>
        <td class="px-6 py-4">
          <div class="flex items-center justify-center gap-1.5">
            <button class="est-toggle-btn w-7 h-7 rounded-lg flex items-center justify-center border border-gray-200 bg-white text-gray-400 hover:bg-gray-50 transition" data-sku="${p.sku}" title="${isActive ? 'Desativar' : 'Ativar'}">
               <i class="fa-solid ${isActive ? 'fa-eye text-green-500' : 'fa-eye-slash'} text-[10px]"></i>
            </button>
            <button class="est-edit-btn w-7 h-7 rounded-lg flex items-center justify-center border border-gray-200 bg-white text-indigo-500 hover:bg-indigo-50 transition" data-sku="${p.sku}">
               <i class="fa-solid fa-pen text-[10px]"></i>
            </button>
            <button class="est-delete-btn w-7 h-7 rounded-lg flex items-center justify-center border border-gray-200 bg-white text-gray-300 hover:text-red-500 hover:border-red-200 transition" data-sku="${p.sku}" data-nome="${(p.nome || '').replace(/"/g, '&quot;')}">
               <i class="fa-solid fa-trash-can text-[10px]"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });
;

  // Bind Events
  document.querySelectorAll('.est-min-input').forEach(inp => {
    inp.addEventListener('change', (e) => { handleEstoqueEdit(e.target.dataset.sku, 'estoque_minimo', e.target.value); if (btnSalvar) btnSalvar.classList.remove('hidden'); });
  });
  document.querySelectorAll('.est-val-input').forEach(inp => {
    inp.addEventListener('change', (e) => { handleEstoqueEdit(e.target.dataset.sku, 'estoque', e.target.value); if (btnSalvar) btnSalvar.classList.remove('hidden'); });
  });
  document.querySelectorAll('.est-edit-btn').forEach(btn => btn.addEventListener('click', () => callbacks.onEdit?.(btn.dataset.sku)));
  document.querySelectorAll('.est-toggle-btn').forEach(btn => btn.addEventListener('click', () => toggleAtivoProduto(btn.dataset.sku, callbacks)));
  document.querySelectorAll('.est-delete-btn').forEach(btn => btn.addEventListener('click', () => confirmarExclusao(btn.dataset.sku, btn.dataset.nome)));
}

function handleEstoqueEdit(sku, type, value) {
  if (!pendingEstoqueUpdates[sku]) {
    const prod = state.allProducts.find(p => p.sku === sku);
    pendingEstoqueUpdates[sku] = {
      estoque: prod ? (Number(prod.estoque) || 0) : 0,
      estoque_minimo: prod ? (Number(prod.estoque_minimo) || 2) : 2
    };
  }
  pendingEstoqueUpdates[sku][type] = Number(value);
}

export async function salvarEstoqueManualmente(callbacks = {}) {
  const keys = Object.keys(pendingEstoqueUpdates);
  if (keys.length === 0) return;

  const btnSalvar = document.getElementById('btn-salvar-estoque');
  if (btnSalvar) {
    btnSalvar.disabled = true;
    btnSalvar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
  }

  try {
    showToast('Sincronizando estoque...', 'blue', 'fa-spinner', true);
    const resp = await fetch(`${CONFIG.apiBaseUrl}?action=salvar_estoque`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ estoque_updates: keys.map(k => ({ sku: k, ...pendingEstoqueUpdates[k] })) })
    });

    if (!(await resp.json()).ok) throw new Error('Erro na API');

    keys.forEach(k => {
      const prod = state.allProducts.find(p => p.sku === k);
      if (prod) Object.assign(prod, pendingEstoqueUpdates[k]);
    });

    pendingEstoqueUpdates = {};
    btnSalvar?.classList.add('hidden');
    renderEstoque(callbacks);
    showToast('Estoque atualizado com sucesso!', 'green', 'fa-check');
  } catch (err) {
    console.error(err);
    showToast('Falha ao salvar estoque.', 'red', 'fa-xmark');
  } finally {
    if (btnSalvar) {
      btnSalvar.disabled = false;
      btnSalvar.innerHTML = 'Salvar Alterações';
    }
  }
}

async function toggleAtivoProduto(sku, callbacks = {}) {
  try {
    showToast('Atualizando status...', 'blue', 'fa-spinner', true);
    const resp = await fetch(`${CONFIG.apiBaseUrl}?action=toggle_ativo`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ sku })
    });
    const json = await resp.json();
    if (!json.ok) throw new Error('Erro na API');

    showToast(`Produto ${json.ativo ? 'ativado' : 'desativado'}!`, 'green', 'fa-check');
    await loadDashboardData(callbacks.dataCallbacks || {}, true);
    renderEstoque(callbacks);
  } catch (err) {
    console.error(err);
    showToast('Falha ao alterar status.', 'red', 'fa-xmark');
  }
}

function confirmarExclusao(sku, nome) {
  pendingDeleteSku = sku;
  const nameEl = document.getElementById('exclusao-nome');
  if (nameEl) nameEl.textContent = nome || sku;
  document.getElementById('modal-confirmar-exclusao')?.classList.remove('hidden');
}

export function cancelarExclusao() {
  pendingDeleteSku = null;
  document.getElementById('modal-confirmar-exclusao')?.classList.add('hidden');
}

export async function executarExclusao(callbacks = {}) {
  if (!pendingDeleteSku) return;
  const sku = pendingDeleteSku;
  cancelarExclusao();

  try {
    showToast('Excluindo produto...', 'blue', 'fa-spinner', true);
    const resp = await fetch(`${CONFIG.apiBaseUrl}?action=remover_produto`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ sku })
    });
    if (!(await resp.json()).ok) throw new Error('Erro na API');

    showToast('Produto excluído!', 'green', 'fa-check');
    await loadDashboardData(callbacks.dataCallbacks || {}, true);
    renderEstoque(callbacks);
  } catch (err) {
    console.error(err);
    showToast('Falha ao excluir.', 'red', 'fa-xmark');
  }
}

export function resetPendingUpdates() {
  pendingEstoqueUpdates = {};
  document.getElementById('btn-salvar-estoque')?.classList.add('hidden');
}

// ===== CADASTRO DE PRODUTO =====
let cadastroTipo = 'Novo';
let cadastroVariacoes = [];
let cadastroTemVariacoes = false;
let editModeSku = null;

const modalCadastro = document.getElementById('modal-cadastro-produto');
const btnCadSubmit = document.getElementById('cadastro-submit');

export function abrirModalCadastro() {
  if (!modalCadastro) return;
  // Reset form
  cadastroTipo = 'Novo';
  cadastroVariacoes = [];
  cadastroTemVariacoes = false;
  editModeSku = null;

  ['cad-nome', 'cad-desc', 'cad-preco', 'cad-custo', 'cad-cor', 'cad-armazenamento', 'cad-ram',
    'cad-cam-frontal', 'cad-cam-traseira', 'cad-bateria', 'cad-tela',
    'cad-imei1', 'cad-imei2', 'cad-serie', 'cad-origem', 'cad-saude'
  ].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

  // Reset estoque defaults
  const estInput = document.getElementById('cad-estoque');
  if (estInput) estInput.value = '1';
  const estMinInput = document.getElementById('cad-estoque-min');
  if (estMinInput) estMinInput.value = '2';

  // Reset all 5 images
  for (let i = 1; i <= 5; i++) {
    const imgInput = document.getElementById(`cad-imagem-${i}`);
    if (imgInput) imgInput.value = '';
    
    const thumb = document.getElementById(`cad-img-thumb-${i}`);
    if (thumb) { thumb.src = ''; thumb.classList.add('hidden'); }
    
    const placeholder = document.getElementById(`cad-img-placeholder-${i}`);
    if (placeholder) placeholder.classList.remove('hidden');
    
    const loading = document.getElementById(`cad-img-loading-${i}`);
    if (loading) loading.classList.add('hidden');
  }

  // Reset custom category input
  const catCustom = document.getElementById('cad-categoria-custom');
  if (catCustom) { catCustom.value = ''; catCustom.classList.add('hidden'); }

  // Populate categories
  const catSelect = document.getElementById('cad-categoria');
  if (catSelect) {
    const cats = [...new Set(state.allProducts.map(p => p.categoria || '').filter(Boolean))].sort();
    catSelect.innerHTML = '<option value="">Selecione...</option>';
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      catSelect.appendChild(opt);
    });
    const customOpt = document.createElement('option');
    customOpt.value = '__custom';
    customOpt.textContent = '+ Nova categoria...';
    catSelect.appendChild(customOpt);
  }

  updateTipoButtons('Novo');
  document.getElementById('cad-seminovo-section')?.classList.add('hidden');
  document.getElementById('cad-var-section')?.classList.add('hidden');
  document.getElementById('cad-var-list').innerHTML = '';
  updateVarButtons(false);
  document.getElementById('cad-errors')?.classList.add('hidden');

  // Clear any previous validation highlights
  modalCadastro.querySelectorAll('.cad-field-error').forEach(el => el.classList.remove('cad-field-error', 'border-red-400', 'ring-2', 'ring-red-200'));

  const modalTitle = modalCadastro.querySelector('h3');
  if (modalTitle) modalTitle.innerHTML = '<i class="fa-solid fa-box-open text-indigo-500 mr-2"></i>Cadastrar Produto';
  if (btnCadSubmit) btnCadSubmit.innerHTML = '<i class="fa-solid fa-check"></i> Salvar Produto';

  modalCadastro.classList.remove('hidden');
}

export function abrirModalEdicao(sku) {
  const prod = state.allProducts.find(p => p.sku === sku);
  if (!prod) return;

  abrirModalCadastro();
  editModeSku = sku;

  const modalTitle = modalCadastro.querySelector('h3');
  if (modalTitle) modalTitle.innerHTML = '<i class="fa-solid fa-pen-to-square text-indigo-500 mr-2"></i>Editar Produto';
  if (btnCadSubmit) btnCadSubmit.innerHTML = '<i class="fa-solid fa-check"></i> Salvar Alterações';

  const fill = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  fill('cad-nome', prod.nome);
  fill('cad-desc', prod.descricao);
  fill('cad-preco', prod.preco);
  fill('cad-custo', prod.custo);
  fill('cad-cor', prod.cor);
  fill('cad-categoria', prod.categoria);
  fill('cad-estoque', prod.estoque);
  fill('cad-estoque-min', prod.estoque_minimo);
  
  // Fill Images
  for (let i = 1; i <= 5; i++) {
    const imgUrl = (prod.images && prod.images[i - 1]) || '';
    fill(`cad-imagem-${i}`, imgUrl);
    const thumb = document.getElementById(`cad-img-thumb-${i}`);
    const placeholder = document.getElementById(`cad-img-placeholder-${i}`);
    if (thumb && imgUrl) {
      thumb.src = imgUrl;
      thumb.classList.remove('hidden');
      placeholder?.classList.add('hidden');
    } else if (thumb) {
      thumb.src = '';
      thumb.classList.add('hidden');
      placeholder?.classList.remove('hidden');
    }
  }

  const parseNumUnit = (str) => {
    const s = String(str || '');
    return { num: s.replace(/[^0-9.]/g, ''), unit: s.replace(/[0-9.]/g, '').trim().toUpperCase() };
  };

  const ar = parseNumUnit(prod.armazenamento);
  fill('cad-armazenamento', ar.num);
  const btnAr = document.getElementById('cad-armaz-unit');
  if (btnAr) { btnAr.dataset.unit = ar.unit === 'TB' ? 'TB' : 'GB'; btnAr.textContent = btnAr.dataset.unit; }

  const ram = parseNumUnit(prod.ram);
  fill('cad-ram', ram.num);
  const btnRam = document.getElementById('cad-ram-unit');
  if (btnRam) { btnRam.dataset.unit = ram.unit || 'GB'; btnRam.textContent = btnRam.dataset.unit; }

  fill('cad-cam-frontal', parseNumUnit(prod.camera_frontal).num);
  fill('cad-cam-traseira', parseNumUnit(prod.camera_traseira).num);
  fill('cad-bateria', parseNumUnit(prod.bateria).num);
  fill('cad-tela', parseNumUnit(prod.tela).num);
  fill('cad-imei2', prod.imei2);
  fill('cad-serie', prod.codigo_serie);

  const tipo = (prod.condicao || '').toLowerCase().includes('seminovo') ? 'Seminovo' : 'Novo';
  updateTipoButtons(tipo);

  if (tipo === 'Seminovo') {
    fill('cad-imei1', prod.imei1);
    fill('cad-saude', parseNumUnit(prod.saude_bateria).num);
    fill('cad-origem', prod.origem);
  }

  updateVarButtons(false);
}

export function fecharModalCadastro() {
  modalCadastro?.classList.add('hidden');
}

export function updateTipoButtons(tipo) {
  cadastroTipo = tipo;
  document.querySelectorAll('.cadastro-tipo-btn').forEach(btn => {
    const isSel = btn.dataset.tipo === tipo;
    btn.className = `cadastro-tipo-btn flex-1 px-4 py-2.5 rounded-lg border-2 font-semibold text-sm transition ${isSel ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'}`;
  });
  document.getElementById('cad-seminovo-section')?.classList.toggle('hidden', tipo !== 'Seminovo');
}

export function updateVarButtons(hasvars) {
  cadastroTemVariacoes = hasvars;
  const btnN = document.getElementById('cad-var-nao');
  const btnS = document.getElementById('cad-var-sim');
  if (btnN) btnN.className = `px-3 py-1.5 text-xs font-bold rounded-md border-2 transition ${!hasvars ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'}`;
  if (btnS) btnS.className = `px-3 py-1.5 text-xs font-bold rounded-md border-2 transition ${hasvars ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'}`;
  document.getElementById('cad-var-section')?.classList.toggle('hidden', !hasvars);
}

export function adicionarLinhaVariacao() {
  const v = { 
    cor: '', 
    armazenamento_num: '', 
    armazenamento_unit: 'GB', 
    preco: document.getElementById('cad-preco')?.value || '', 
    custo: document.getElementById('cad-custo')?.value || '', 
    estoque: '1', 
    condicao: cadastroTipo,
    images: [] 
  };
  cadastroVariacoes.push(v);
  renderVariacoes();
}

function renderVariacoes() {
  const list = document.getElementById('cad-var-list');
  if (!list) return;
  list.innerHTML = '';
  cadastroVariacoes.forEach((v, idx) => {
    const div = document.createElement('div');
    div.className = 'bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3 relative transition-all hover:border-indigo-200';
    div.innerHTML = `
      <div class="flex items-center justify-between mb-1">
        <span class="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Variação #${idx + 1}</span>
        <button type="button" class="var-remove text-red-500 hover:text-red-700 text-[10px] font-bold transition" data-idx="${idx}">
          <i class="fa-solid fa-trash-can mr-1"></i>Remover
        </button>
      </div>
      
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-[9px] font-bold text-gray-400 uppercase mb-1 block">Cor</label>
          <input type="text" class="var-cor w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" value="${v.cor}" data-idx="${idx}" placeholder="Ex: Prata">
        </div>
        <div>
          <label class="text-[9px] font-bold text-gray-400 uppercase mb-1 block">Armazenamento</label>
          <div class="flex">
            <input type="number" class="var-armaz w-full px-3 py-2 border border-r-0 rounded-l-lg text-sm focus:ring-2 focus:ring-indigo-500" value="${v.armazenamento_num}" data-idx="${idx}" placeholder="128">
            <button type="button" class="var-unit px-2 py-2 border border-gray-200 rounded-r-lg bg-gray-100 text-[10px] font-black text-gray-600 hover:bg-gray-200 transition" data-idx="${idx}">${v.armazenamento_unit}</button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-3">
        <div>
          <label class="text-[9px] font-bold text-gray-400 uppercase mb-1 block">Preço Venda</label>
          <div class="relative">
            <span class="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">R$</span>
            <input type="number" class="var-preco w-full pl-7 pr-2 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" value="${v.preco}" data-idx="${idx}" placeholder="0.00">
          </div>
        </div>
        <div>
          <label class="text-[9px] font-bold text-gray-400 uppercase mb-1 block">Preço Custo</label>
          <div class="relative">
            <span class="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">R$</span>
            <input type="number" class="var-custo w-full pl-7 pr-2 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" value="${v.custo}" data-idx="${idx}" placeholder="0.00">
          </div>
        </div>
        <div>
          <label class="text-[9px] font-bold text-gray-400 uppercase mb-1 block">Estoque</label>
          <input type="number" class="var-estoque w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" value="${v.estoque}" data-idx="${idx}" placeholder="1">
        </div>
      </div>

      <!-- Imagens da Variação -->
      <div class="pt-2 border-t border-gray-200/50">
        <div class="flex items-center justify-between mb-2">
          <label class="text-[9px] font-bold text-gray-400 uppercase block">Fotos da Variação</label>
          <span class="text-[9px] font-medium text-gray-400 italic">Opcional</span>
        </div>
        <div class="grid grid-cols-5 gap-2 mb-3">
          ${[0, 1, 2, 3, 4].map(i => {
            const img = v.images[i] || '';
            return `
              <div class="var-img-slot group relative aspect-square bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden cursor-pointer" data-var="${idx}" data-img="${i}">
                <img src="${img}" class="w-full h-full object-contain ${img ? '' : 'hidden'}">
                <div class="absolute inset-0 flex items-center justify-center text-gray-300 ${img ? 'hidden' : ''}">
                  <span class="text-xs font-black opacity-30">${i + 1}</span>
                </div>
                <div class="var-loading hidden absolute inset-0 bg-white/80 flex items-center justify-center">
                  <i class="fa-solid fa-spinner fa-spin text-indigo-500 text-[10px]"></i>
                </div>
                ${img ? `
                  <button type="button" class="var-img-del absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition-opacity z-10" data-var="${idx}" data-img="${i}">
                    <i class="fa-solid fa-xmark"></i>
                  </button>` : ''}
              </div>
            `;
          }).join('')}
        </div>
        <input type="file" class="var-file-input hidden" id="var-input-${idx}" accept="image/*" multiple data-idx="${idx}">
        <button type="button" class="w-full py-2.5 border border-indigo-100 rounded-xl bg-indigo-50/50 text-indigo-600 text-[10px] font-black hover:bg-indigo-100/50 transition-all var-upload-trigger active:scale-95 flex items-center justify-center gap-2" data-idx="${idx}">
          <i class="fa-solid fa-cloud-arrow-up text-sm"></i> ENVIAR FOTOS PARA ESTA VARIAÇÃO
        </button>
      </div>
    `;
    list.appendChild(div);
  });

  // Bind Listeners
  list.querySelectorAll('.var-cor').forEach(inp => inp.addEventListener('input', (e) => { cadastroVariacoes[e.target.dataset.idx].cor = e.target.value; }));
  list.querySelectorAll('.var-armaz').forEach(inp => inp.addEventListener('input', (e) => { cadastroVariacoes[e.target.dataset.idx].armazenamento_num = e.target.value; }));
  list.querySelectorAll('.var-preco').forEach(inp => inp.addEventListener('input', (e) => { cadastroVariacoes[e.target.dataset.idx].preco = e.target.value; }));
  list.querySelectorAll('.var-custo').forEach(inp => inp.addEventListener('input', (e) => { cadastroVariacoes[e.target.dataset.idx].custo = e.target.value; }));
  list.querySelectorAll('.var-estoque').forEach(inp => inp.addEventListener('input', (e) => { cadastroVariacoes[e.target.dataset.idx].estoque = e.target.value; }));
  
  list.querySelectorAll('.var-unit').forEach(btn => btn.addEventListener('click', (e) => {
    const v = cadastroVariacoes[e.target.dataset.idx];
    v.armazenamento_unit = v.armazenamento_unit === 'GB' ? 'TB' : 'GB';
    e.target.textContent = v.armazenamento_unit;
  }));

  list.querySelectorAll('.var-remove').forEach(btn => btn.addEventListener('click', (e) => { 
    cadastroVariacoes.splice(btn.dataset.idx, 1); 
    renderVariacoes(); 
  }));

  list.querySelectorAll('.var-upload-trigger').forEach(btn => btn.addEventListener('click', () => {
    document.getElementById(`var-input-${btn.dataset.idx}`).click();
  }));

  list.querySelectorAll('.var-file-input').forEach(inp => inp.addEventListener('change', (e) => {
    handleVarFiles(e.target.dataset.idx, e.target.files);
  }));

  list.querySelectorAll('.var-img-del').forEach(btn => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    cadastroVariacoes[btn.dataset.var].images.splice(btn.dataset.img, 1);
    renderVariacoes();
  }));
}

async function handleVarFiles(idx, files) {
  const variation = cadastroVariacoes[idx];
  const fileList = Array.from(files);
  if (fileList.length === 0) return;

  showToast(`Enviando ${fileList.length} foto(s)...`, 'blue', 'fa-spinner', true);
  
  for (const file of fileList) {
    if (variation.images.length >= 5) break;
    try {
      const compressed = await compressImage(file);
      const url = await uploadImageToDrive(compressed, `var_${idx}_${file.name}`);
      variation.images.push(url);
    } catch (err) {
      console.error(err);
      showToast('Erro ao enviar imagem da variação.', 'red', 'fa-xmark');
    }
  }
  
  showToast('Fotos da variação carregadas!', 'green', 'fa-check');
  renderVariacoes();
}

// ===== CATEGORY HANDLER =====
export function setupCategoriaHandler() {
  const catSelect = document.getElementById('cad-categoria');
  const catCustom = document.getElementById('cad-categoria-custom');
  if (!catSelect || !catCustom) return;

  catSelect.addEventListener('change', () => {
    if (catSelect.value === '__custom') {
      catCustom.classList.remove('hidden');
      catCustom.focus();
    } else {
      catCustom.classList.add('hidden');
      catCustom.value = '';
    }
  });
}

// ===== HELPERS =====
function gerarSlug(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function gerarIds(nome, cor, armazenamento, condicao) {
  const grupoId = gerarSlug(nome) || ('prod-' + Date.now());
  const variacao = [armazenamento, cor, condicao].filter(Boolean).map(gerarSlug).join('-');
  const sku = variacao ? `${grupoId}-${variacao}` : grupoId;
  return { id: sku, sku, grupo_id: grupoId };
}

function getCategoria() {
  const catSelect = document.getElementById('cad-categoria');
  if (!catSelect) return '';
  if (catSelect.value === '__custom') {
    return (document.getElementById('cad-categoria-custom')?.value || '').trim();
  }
  return catSelect.value;
}

// ===== VALIDAÇÃO =====
function validarCamposObrigatorios() {
  const val = (id) => (document.getElementById(id)?.value || '').trim();
  const erros = [];

  // Clear previous highlights
  const modal = document.getElementById('modal-cadastro-produto');
  modal?.querySelectorAll('.cad-field-error').forEach(el => {
    el.classList.remove('cad-field-error', 'border-red-400', 'ring-2', 'ring-red-200');
  });

  const markError = (id, msg) => {
    erros.push(msg);
    const el = document.getElementById(id);
    if (el) el.classList.add('cad-field-error', 'border-red-400', 'ring-2', 'ring-red-200');
  };

  if (!val('cad-nome')) markError('cad-nome', 'Nome do Produto é obrigatório');
  if (!getCategoria()) markError('cad-categoria', 'Categoria é obrigatória');
  if (!val('cad-preco') || Number(val('cad-preco')) <= 0) markError('cad-preco', 'Preço é obrigatório e deve ser maior que zero');
  if (!val('cad-imagem-1')) markError('cad-imagem-1', 'Imagem Principal (Capa) é obrigatória');
  if (!val('cad-cor')) markError('cad-cor', 'Cor é obrigatória');
  if (!val('cad-armazenamento')) markError('cad-armazenamento', 'Armazenamento é obrigatório');

  // Specs
  if (!val('cad-ram')) markError('cad-ram', 'RAM é obrigatória');
  if (!val('cad-cam-frontal')) markError('cad-cam-frontal', 'Câmera Frontal é obrigatória');
  if (!val('cad-cam-traseira')) markError('cad-cam-traseira', 'Câmera Traseira é obrigatória');
  if (!val('cad-bateria')) markError('cad-bateria', 'Bateria é obrigatória');
  if (!val('cad-tela')) markError('cad-tela', 'Tela é obrigatória');

  // Seminovo-specific
  if (cadastroTipo === 'Seminovo') {
    if (!val('cad-imei1')) markError('cad-imei1', 'IMEI 1 é obrigatório para seminovos');
    if (!val('cad-origem')) markError('cad-origem', 'Origem é obrigatória para seminovos');
    if (!val('cad-saude')) markError('cad-saude', 'Saúde da Bateria é obrigatória para seminovos');
  }

  // Display errors
  const errContainer = document.getElementById('cad-errors');
  const errList = document.getElementById('cad-errors-list');
  if (erros.length > 0) {
    errList.innerHTML = erros.map(e => `<li>${e}</li>`).join('');
    errContainer?.classList.remove('hidden');
    errContainer?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false;
  }

  errContainer?.classList.add('hidden');
  return true;
}

// ===== SALVAR PRODUTO =====
export async function salvarNovoProduto(callbacks = {}) {
  const val = (id) => (document.getElementById(id)?.value || '').trim();
  const numVal = (id) => Number(document.getElementById(id)?.value || 0);

  // Run validation (skip for edit mode since some fields may not change)
  if (!editModeSku && !validarCamposObrigatorios()) return;

  const nome = val('cad-nome');
  const cor = val('cad-cor');
  const armazNum = val('cad-armazenamento');
  const armazUnit = document.getElementById('cad-armaz-unit')?.dataset.unit || 'GB';
  const armazenamento = armazNum ? armazNum + armazUnit : '';
  const ramNum = val('cad-ram');
  const ramUnit = document.getElementById('cad-ram-unit')?.dataset.unit || 'GB';

  const baseProduct = {
    nome: nome,
    descricao: val('cad-desc'),
    categoria: getCategoria(),
    imagem_1: val('cad-imagem-1'),
    imagem_2: val('cad-imagem-2'),
    imagem_3: val('cad-imagem-3'),
    imagem_4: val('cad-imagem-4'),
    imagem_5: val('cad-imagem-5'),
    imagem: val('cad-imagem-1'),
    ram: ramNum ? ramNum + ramUnit : '',
    camera_frontal: val('cad-cam-frontal') ? val('cad-cam-frontal') + 'MP' : '',
    camera_traseira: val('cad-cam-traseira') ? val('cad-cam-traseira') + 'MP' : '',
    bateria: val('cad-bateria') ? val('cad-bateria') + 'mAh' : '',
    tela: val('cad-tela') ? val('cad-tela') + '"' : '',
    condicao: cadastroTipo,
    ativo: 'true',
  };

  if (cadastroTipo === 'Seminovo') {
    baseProduct.imei1 = val('cad-imei1');
    baseProduct.imei2 = val('cad-imei2');
    baseProduct.codigo_serie = val('cad-serie');
    baseProduct.origem = val('cad-origem');
    baseProduct.saude_bateria = val('cad-saude') ? val('cad-saude') + '%' : '';
  }

  let finalProducts = [];

  if (cadastroTemVariacoes && cadastroVariacoes.length > 0) {
    cadastroVariacoes.forEach(v => {
      const armaz = v.armazenamento_num ? v.armazenamento_num + v.armazenamento_unit : '';
      const ids = gerarIds(nome, v.cor, armaz, v.condicao);
      
      const p = {
        ...baseProduct,
        cor: v.cor,
        armazenamento: armaz,
        preco: Number(v.preco) || baseProduct.preco || 0,
        custo: Number(v.custo) || baseProduct.custo || 0,
        estoque: Number(v.estoque) || 0,
        estoque_minimo: numVal('cad-estoque-min'),
        id: ids.id,
        sku: ids.sku,
        grupo_id: ids.grupo_id
      };

      // Se a variação tem imagens próprias, substitui as do base
      if (v.images && v.images.length > 0) {
        for (let i = 0; i < 5; i++) {
          p[`imagem_${i + 1}`] = v.images[i] || '';
        }
        p.imagem = v.images[0];
      }

      finalProducts.push(p);
    });
  } else {
    const ids = editModeSku ? { id: editModeSku, sku: editModeSku, grupo_id: val('cad-grupo-id') || editModeSku } : gerarIds(nome, cor, armazenamento, cadastroTipo);
    const p = {
      ...baseProduct,
      cor: cor,
      armazenamento: armazenamento,
      preco: numVal('cad-preco'),
      custo: numVal('cad-custo'),
      estoque: numVal('cad-estoque'),
      estoque_minimo: numVal('cad-estoque-min'),
      id: ids.id,
      sku: ids.sku,
      grupo_id: ids.grupo_id
    };
    finalProducts.push(p);
  }

  try {
    showToast('Salvando...', 'blue', 'fa-spinner', true);
    
    if (editModeSku) {
      // Editar modo (sempre um por um)
      const resp = await fetch(`${CONFIG.apiBaseUrl}?action=editar_produto`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(finalProducts[0])
      });
      if (!(await resp.json()).ok) throw new Error('Erro na API');
    } else {
      // Cadastro modo (pode ser múltiplos)
      const resp = await fetch(`${CONFIG.apiBaseUrl}?action=salvar_produto`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ produtos: finalProducts })
      });
      if (!(await resp.json()).ok) throw new Error('Erro na API');
    }

    fecharModalCadastro();
    showToast('Produto(s) salvo(s) com sucesso!', 'green', 'fa-check');
    await loadDashboardData(callbacks.dataCallbacks || {}, true);
    renderEstoque(callbacks);
  } catch (err) {
    console.error('Erro ao salvar produto:', err);
    showToast('Erro ao salvar produto.', 'red', 'fa-xmark');
  }
}
