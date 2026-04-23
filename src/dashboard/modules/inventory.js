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
      (p.sku || '').toLowerCase().includes(searchEstoque)
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

  ['cad-nome', 'cad-desc', 'cad-preco', 'cad-custo', 'cad-imagem', 'cad-cor', 'cad-armazenamento', 'cad-ram',
    'cad-cam-frontal', 'cad-cam-traseira', 'cad-bateria', 'cad-tela',
    'cad-imei1', 'cad-imei2', 'cad-serie', 'cad-origem', 'cad-saude'
  ].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

  // Reset estoque defaults
  const estInput = document.getElementById('cad-estoque');
  if (estInput) estInput.value = '1';
  const estMinInput = document.getElementById('cad-estoque-min');
  if (estMinInput) estMinInput.value = '2';

  // Reset image
  document.getElementById('cad-img-file').value = '';
  document.getElementById('cad-img-thumb').src = '';
  document.getElementById('cad-img-placeholder')?.classList.remove('hidden');
  document.getElementById('cad-img-preview')?.classList.add('hidden');
  document.getElementById('cad-img-loading')?.classList.add('hidden');

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
  fill('cad-imagem', prod.imagem);
  fill('cad-cor', prod.cor);

  if (prod.imagem) {
    document.getElementById('cad-img-thumb').src = prod.imagem;
    document.getElementById('cad-img-placeholder')?.classList.add('hidden');
    document.getElementById('cad-img-preview')?.classList.remove('hidden');
  }

  const parseNumUnit = (str) => {
    const s = String(str || '');
    return { num: s.replace(/[^0-9.]/g, ''), unit: s.replace(/[0-9.]/g, '').trim().toUpperCase() };
  };

  const ar = parseNumUnit(prod.armazenamento);
  fill('cad-armazenamento', ar.num);
  const btnAr = document.getElementById('cad-armaz-unit');
  if (btnAr) { btnAr.dataset.unit = ar.unit === 'TB' ? 'TB' : 'GB'; btnAr.textContent = btnAr.dataset.unit; }

  const tipo = (prod.condicao || '').toLowerCase().includes('seminovo') ? 'Seminovo' : 'Novo';
  updateTipoButtons(tipo);

  if (tipo === 'Seminovo') {
    fill('cad-imei1', prod.imei1);
    fill('cad-saude', prod.saude_bateria);
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
  const v = { cor: '', armazenamento_num: '', armazenamento_unit: 'GB', preco: '', custo: '', estoque: '1', condicao: cadastroTipo };
  cadastroVariacoes.push(v);
  renderVariacoes();
}

function renderVariacoes() {
  const list = document.getElementById('cad-var-list');
  if (!list) return;
  list.innerHTML = '';
  cadastroVariacoes.forEach((v, idx) => {
    const div = document.createElement('div');
    div.className = 'bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2';
    div.innerHTML = `<div class="flex items-center justify-between"><span class="text-xs font-bold">Variação ${idx + 1}</span><button type="button" class="var-remove text-red-500 text-xs font-bold" data-idx="${idx}">Remover</button></div>
      <div class="grid grid-cols-2 gap-2">
        <input type="text" class="var-cor w-full px-2 py-1.5 border rounded text-xs" value="${v.cor}" data-idx="${idx}" placeholder="Cor">
        <input type="number" class="var-armaz w-full px-2 py-1.5 border rounded text-xs" value="${v.armazenamento_num}" data-idx="${idx}" placeholder="Armaz.">
      </div>`;
    list.appendChild(div);
  });
  list.querySelectorAll('.var-remove').forEach(btn => btn.addEventListener('click', () => { cadastroVariacoes.splice(btn.dataset.idx, 1); renderVariacoes(); }));
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
  if (!val('cad-imagem')) markError('cad-imagem', 'Imagem do Produto é obrigatória (faça upload)');
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

  const payload = {
    nome: nome,
    descricao: val('cad-desc'),
    categoria: getCategoria(),
    preco: numVal('cad-preco'),
    custo: numVal('cad-custo'),
    imagem: val('cad-imagem'),
    cor: cor,
    armazenamento: armazenamento,
    ram: ramNum ? ramNum + ramUnit : '',
    camera_frontal: val('cad-cam-frontal') ? val('cad-cam-frontal') + 'MP' : '',
    camera_traseira: val('cad-cam-traseira') ? val('cad-cam-traseira') + 'MP' : '',
    bateria: val('cad-bateria') ? val('cad-bateria') + 'mAh' : '',
    tela: val('cad-tela') ? val('cad-tela') + '"' : '',
    estoque: numVal('cad-estoque'),
    estoque_minimo: numVal('cad-estoque-min'),
    condicao: cadastroTipo,
    ativo: 'true',
  };

  // Seminovo fields
  if (cadastroTipo === 'Seminovo') {
    payload.imei1 = val('cad-imei1');
    payload.imei2 = val('cad-imei2');
    payload.codigo_serie = val('cad-serie');
    payload.origem = val('cad-origem');
    payload.saude_bateria = val('cad-saude') ? val('cad-saude') + '%' : '';
  }

  if (editModeSku) {
    payload.sku = editModeSku;
  } else {
    // Generate id, sku, grupo_id for new products
    const ids = gerarIds(nome, cor, armazenamento, cadastroTipo);
    payload.id = ids.id;
    payload.sku = ids.sku;
    payload.grupo_id = ids.grupo_id;
  }

  try {
    showToast('Salvando...', 'blue', 'fa-spinner', true);
    const action = editModeSku ? 'editar_produto' : 'salvar_produto';
    const body = editModeSku ? payload : { produtos: [payload] };

    const resp = await fetch(`${CONFIG.apiBaseUrl}?action=${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    });

    if (!(await resp.json()).ok) throw new Error('Erro na API');

    fecharModalCadastro();
    showToast('Produto salvo com sucesso!', 'green', 'fa-check');
    await loadDashboardData(callbacks.dataCallbacks || {}, true);
    renderEstoque(callbacks);
  } catch (err) {
    console.error('Erro ao salvar produto:', err);
    showToast('Erro ao salvar produto.', 'red', 'fa-xmark');
  }
}
