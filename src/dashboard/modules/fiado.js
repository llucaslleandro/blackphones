import { CONFIG } from '../../shared/config.js';
import * as store from './store.js';
import * as ui from './ui.js';

let fiadoIdParaCancelar = null;

export function initAndRender() {
  if (!store.state.allFiados) store.state.allFiados = [];
  calcularMetricas();
  renderList();
}

export function setupListeners() {
  // Modal Nova Dívida
  document.getElementById('btn-nova-divida')?.addEventListener('click', abrirModalNovaDivida);
  document.getElementById('btn-close-nova-divida')?.addEventListener('click', fecharModalNovaDivida);
  document.getElementById('btn-cancel-nova-divida')?.addEventListener('click', fecharModalNovaDivida);
  document.getElementById('overlay-nova-divida')?.addEventListener('click', fecharModalNovaDivida);

  // Modal Detalhes
  document.getElementById('btn-close-detalhes-fiado')?.addEventListener('click', fecharModalDetalhes);
  document.getElementById('overlay-detalhes-fiado')?.addEventListener('click', fecharModalDetalhes);

  // Mascaras
  document.getElementById('fiado-telefone')?.addEventListener('input', (e) => {
    e.target.value = ui.formatPhone(e.target.value);
  });
  document.getElementById('fiado-cpf')?.addEventListener('input', (e) => {
    e.target.value = ui.formatCpfCnpj(e.target.value);
  });

  // Interações do formulário
  document.getElementById('fiado-produto-estoque')?.addEventListener('change', preencherDetalhesProduto);
  
  const calcularResumo = () => atualizarResumo();
  
  document.getElementById('fiado-valor-venda')?.addEventListener('input', calcularResumo);
  document.getElementById('fiado-entrada-dinheiro')?.addEventListener('input', calcularResumo);
  document.getElementById('far-valor')?.addEventListener('input', calcularResumo);
  document.getElementById('fiado-qtd-parcelas')?.addEventListener('input', calcularResumo);

  document.getElementById('fiado-tem-aparelho')?.addEventListener('change', (e) => {
    document.getElementById('fiado-aparelho-campos').classList.toggle('hidden', !e.target.checked);
    calcularResumo();
  });

  // Salvar Dívida
  document.getElementById('btn-save-nova-divida')?.addEventListener('click', salvarNovaDivida);

  // Modal Cancelar
  document.getElementById('btn-cancel-cancelar')?.addEventListener('click', fecharModalCancelar);
  document.getElementById('overlay-confirmar-cancelamento')?.addEventListener('click', fecharModalCancelar);
  document.getElementById('btn-confirm-cancelar')?.addEventListener('click', executarCancelamento);

  // View Toggle
  ui.setupViewToggle('view-fiado-list', 'view-fiado-grid', 'vendly_fiado_view', () => {
    renderList();
  });
}

function calcularMetricas() {
  const fiados = store.state.allFiados || [];
  
  let clientesPendentes = new Set();
  let aReceber = 0;
  let recebido = 0;
  let totalVendido = 0;
  let parcelasVencidas = 0;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  fiados.forEach(f => {
    if (f.status === 'cancelado') return;

    if (f.status !== 'quitado') {
      clientesPendentes.add(f.cliente);
    }
    
    totalVendido += Number(f.valorvenda || f.valor_venda || 0);
    recebido += Number(f.entradadinheiro || f.entrada_dinheiro || 0);
    
    const parcelas = f.parcelas || [];
    parcelas.forEach(p => {
      if (p.status === 'pago') {
        recebido += Number(p.valor);
      } else {
        aReceber += Number(p.valor);
        
        const dataVencimento = p.vencimento ? new Date(p.vencimento + 'T00:00:00') : null;
        if (dataVencimento && dataVencimento < hoje) {
          parcelasVencidas++;
        }
      }
    });
  });

  document.getElementById('metric-clientes-pendentes').textContent = clientesPendentes.size;
  document.getElementById('metric-a-receber').textContent = ui.formatMoney(aReceber);
  document.getElementById('metric-recebido').textContent = ui.formatMoney(recebido);
  document.getElementById('metric-total-fiado').textContent = ui.formatMoney(totalVendido);
  document.getElementById('metric-parcelas-vencidas').textContent = parcelasVencidas;
}

function renderList() {
  const container = document.getElementById('fiado-list-container');
  const fiados = store.state.allFiados || [];
  
  if (fiados.length === 0) {
    container.innerHTML = `<div class="p-8 text-center text-gray-500">Nenhuma venda fiada registrada.</div>`;
    return;
  }

  const viewMode = ui.getViewPreference('vendly_fiado_view', 'list');
  const sortedFiados = fiados.sort((a, b) => new Date(b.created_at || b.datavenda) - new Date(a.created_at || a.datavenda));

  if (viewMode === 'list') {
    let html = `<div class="overflow-x-auto"><table class="w-full text-left border-collapse">
      <thead>
        <tr class="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
          <th class="p-4">Cliente</th>
          <th class="p-4">Produto</th>
          <th class="p-4">Valor</th>
          <th class="p-4">Progresso</th>
          <th class="p-4">Status</th>
          <th class="p-4 text-right">Ações</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100">`;

    sortedFiados.forEach(f => {
      const produtoStr = f.produtoVendidoSnapshot ? `${f.produtoVendidoSnapshot.nome || 'Produto'} - ${f.produtoVendidoSnapshot.armazenamento || ''}` : 'Produto Desconhecido';
      
      const parcelas = f.parcelas || [];
      const totalParcelas = parcelas.length;
      const pagas = parcelas.filter(p => p.status === 'pago').length;
      const progresso = totalParcelas > 0 ? (pagas / totalParcelas) * 100 : 0;
      
      let statusBadge = '';
      if (f.status === 'quitado') statusBadge = '<span class="bg-green-100 text-green-700 text-[10px] px-2 py-1 rounded font-bold">QUITADO</span>';
      else if (f.status === 'cancelado') statusBadge = '<span class="bg-red-100 text-red-700 text-[10px] px-2 py-1 rounded font-bold">CANCELADO</span>';
      else if (f.status === 'parcial') statusBadge = '<span class="bg-blue-100 text-blue-700 text-[10px] px-2 py-1 rounded font-bold">PARCIAL</span>';
      else statusBadge = '<span class="bg-orange-100 text-orange-700 text-[10px] px-2 py-1 rounded font-bold">EM ABERTO</span>';

      html += `
        <tr class="hover:bg-gray-50/50 transition">
          <td class="p-4">
            <div class="font-bold text-gray-900 text-sm">${f.cliente}</div>
            <div class="text-xs text-gray-500">${f.telefone || ''}</div>
          </td>
          <td class="p-4 text-sm text-gray-700">${produtoStr}</td>
          <td class="p-4">
            <div class="font-bold text-gray-900 text-sm">${ui.formatMoney(f.valorvenda || f.valor_venda)}</div>
            <div class="text-xs text-gray-500">Restante: ${ui.formatMoney(f.valorrestante || f.valor_restante)}</div>
          </td>
          <td class="p-4">
            <div class="w-full bg-gray-200 rounded-full h-1.5 mb-1">
              <div class="bg-indigo-600 h-1.5 rounded-full" style="width: ${progresso}%"></div>
            </div>
            <div class="text-xs text-gray-500 text-right">${pagas}/${totalParcelas}</div>
          </td>
          <td class="p-4">${statusBadge}</td>
          <td class="p-4 text-right">
            <button class="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm transition" onclick="window.VendlyFiado_abrirDetalhes('${f.id}')">
              Detalhes
            </button>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;
  } else {
    // Grid View
    let html = `<div class="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">`;
    sortedFiados.forEach(f => {
      const produtoStr = f.produtoVendidoSnapshot ? `${f.produtoVendidoSnapshot.nome || 'Produto'} - ${f.produtoVendidoSnapshot.armazenamento || ''}` : 'Produto Desconhecido';
      
      const parcelas = f.parcelas || [];
      const totalParcelas = parcelas.length;
      const pagas = parcelas.filter(p => p.status === 'pago').length;
      const progresso = totalParcelas > 0 ? (pagas / totalParcelas) * 100 : 0;
      
      let statusBadge = '';
      if (f.status === 'quitado') statusBadge = '<span class="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-bold uppercase">Quitado</span>';
      else if (f.status === 'cancelado') statusBadge = '<span class="bg-red-100 text-red-700 text-xs px-2 py-1 rounded font-bold uppercase">Cancelado</span>';
      else if (f.status === 'parcial') statusBadge = '<span class="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-bold uppercase">Parcial</span>';
      else statusBadge = '<span class="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded font-bold uppercase">Em Aberto</span>';

      html += `
        <div class="bg-white border border-gray-200 rounded-xl shadow-sm p-4 hover:shadow-md transition flex flex-col h-full relative overflow-hidden group">
          <div class="absolute top-0 left-0 w-1 h-full bg-indigo-600"></div>
          
          <div class="flex justify-between items-start mb-3">
            <div>
              <h4 class="font-bold text-gray-900 text-sm truncate w-40">${f.cliente}</h4>
              <p class="text-xs text-gray-500 mt-0.5">${f.telefone || 'Sem telefone'}</p>
            </div>
            ${statusBadge}
          </div>
          
          <div class="text-xs font-medium text-gray-700 mb-4 bg-gray-50 p-2 rounded-lg border border-gray-100">
            <i class="fa-solid fa-mobile-screen text-indigo-500 mr-1.5"></i> ${produtoStr}
          </div>
          
          <div class="grid grid-cols-2 gap-3 mb-4 flex-1">
            <div>
              <p class="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-0.5">Valor Venda</p>
              <p class="text-sm font-black text-gray-900">${ui.formatMoney(f.valorvenda || f.valor_venda)}</p>
            </div>
            <div>
              <p class="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-0.5">Restante</p>
              <p class="text-sm font-black text-indigo-600">${ui.formatMoney(f.valorrestante || f.valor_restante)}</p>
            </div>
          </div>
          
          <div class="mb-4">
            <div class="flex justify-between text-xs text-gray-500 mb-1 font-medium">
              <span>Progresso</span>
              <span>${pagas}/${totalParcelas}</span>
            </div>
            <div class="w-full bg-gray-100 rounded-full h-1.5">
              <div class="bg-indigo-500 h-1.5 rounded-full" style="width: ${progresso}%"></div>
            </div>
          </div>
          
          <div class="mt-auto">
            <button class="w-full bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 py-2 rounded-lg text-xs font-bold shadow-sm transition" onclick="window.VendlyFiado_abrirDetalhes('${f.id}')">
              Ver Detalhes da Dívida
            </button>
          </div>
        </div>
      `;
    });
    html += `</div>`;
    container.innerHTML = html;
  }
}

function abrirModalNovaDivida() {
  document.getElementById('modal-nova-divida').classList.remove('hidden');
  setTimeout(() => {
    document.getElementById('drawer-nova-divida').classList.remove('translate-x-full');
  }, 10);
  
  // Popula produtos
  const select = document.getElementById('fiado-produto-estoque');
  select.innerHTML = '<option value="">Selecione um produto disponível...</option>';
  
  const disponíveis = store.state.allProducts.filter(p => p.ativo && Number(p.estoque) > 0);
  disponíveis.forEach(p => {
    const condicaoStr = p.condicao ? ` - ${p.condicao}` : '';
    select.innerHTML += `<option value="${p.id}">${p.nome} - ${p.armazenamento} - ${p.cor}${condicaoStr} (Estoque: ${p.estoque})</option>`;
  });
  
  // Limpa campos
  document.getElementById('fiado-nome-cliente').value = '';
  document.getElementById('fiado-telefone').value = '';
  document.getElementById('fiado-cpf').value = '';
  document.getElementById('fiado-produto-detalhes').classList.add('hidden');
  document.getElementById('fiado-entrada-dinheiro').value = '';
  document.getElementById('fiado-tem-aparelho').checked = false;
  document.getElementById('fiado-aparelho-campos').classList.add('hidden');
  document.getElementById('far-modelo').value = '';
  document.getElementById('far-memoria').value = '';
  document.getElementById('far-valor').value = '';
  document.getElementById('fiado-add-estoque').checked = false;
  document.getElementById('fiado-estoque-campos').classList.add('hidden');
  document.getElementById('far-preco-venda').value = '';
  document.getElementById('far-imagem').value = '';
  document.getElementById('fiado-valor-venda').value = '';
  document.getElementById('fiado-qtd-parcelas').value = '1';
  document.getElementById('fiado-vencimento-1').value = new Date().toISOString().split('T')[0];
  
  atualizarResumo();
}

function fecharModalNovaDivida() {
  document.getElementById('drawer-nova-divida').classList.add('translate-x-full');
  setTimeout(() => {
    document.getElementById('modal-nova-divida').classList.add('hidden');
  }, 300);
}

function preencherDetalhesProduto(e) {
  const prodId = e.target.value;
  const detalheDiv = document.getElementById('fiado-produto-detalhes');
  
  if (!prodId) {
    detalheDiv.classList.add('hidden');
    return;
  }
  
  const p = store.state.allProducts.find(x => x.id === prodId);
  if (p) {
    document.getElementById('fp-modelo').textContent = p.nome || '-';
    document.getElementById('fp-memoria').textContent = p.armazenamento || '-';
    document.getElementById('fp-cor').textContent = p.cor || '-';
    document.getElementById('fp-imei').textContent = p.imei1 || '-';
    document.getElementById('fp-custo').textContent = ui.formatMoney(p.custo || 0);
    document.getElementById('fp-preco').textContent = ui.formatMoney(p.preco || 0);
    
    document.getElementById('fiado-valor-venda').value = p.preco || '';
    detalheDiv.classList.remove('hidden');
    atualizarResumo();
  }
}

function atualizarResumo() {
  const valorVenda = Number(document.getElementById('fiado-valor-venda').value) || 0;
  const entrada = Number(document.getElementById('fiado-entrada-dinheiro').value) || 0;
  const temAparelho = document.getElementById('fiado-tem-aparelho').checked;
  const valorAparelho = temAparelho ? (Number(document.getElementById('far-valor').value) || 0) : 0;
  
  let saldo = valorVenda - entrada - valorAparelho;
  if (saldo < 0) saldo = 0;
  
  const parcelas = Number(document.getElementById('fiado-qtd-parcelas').value) || 1;
  const valorParcela = parcelas > 0 ? saldo / parcelas : 0;
  
  document.getElementById('fiado-saldo-parcelar').value = saldo.toFixed(2);
  
  document.getElementById('resumo-venda').textContent = ui.formatMoney(valorVenda);
  document.getElementById('resumo-entrada-dinheiro').textContent = `- ${ui.formatMoney(entrada)}`;
  document.getElementById('resumo-entrada-aparelho').textContent = `- ${ui.formatMoney(valorAparelho)}`;
  document.getElementById('resumo-saldo').textContent = ui.formatMoney(saldo);
  document.getElementById('resumo-qtd-parcelas').textContent = `${parcelas}x de`;
  document.getElementById('resumo-valor-parcela').textContent = ui.formatMoney(valorParcela);
}

async function salvarNovaDivida() {
  const fieldCliente = document.getElementById('fiado-nome-cliente');
  const fieldProduto = document.getElementById('fiado-produto-estoque');
  const fieldValorVenda = document.getElementById('fiado-valor-venda');
  const fieldQtdParcelas = document.getElementById('fiado-qtd-parcelas');

  const cliente = fieldCliente.value.trim();
  const produtoId = fieldProduto.value;
  const valorVenda = Number(fieldValorVenda.value) || 0;
  const qtdParcelas = Number(fieldQtdParcelas.value) || 1;
  
  let hasError = false;

  const showError = (field) => {
    field.style.borderColor = '#ef4444'; // border-red-500
    field.style.backgroundColor = '#fef2f2'; // bg-red-50
    field.style.boxShadow = '0 0 0 1px #ef4444'; // ring-red-500
    
    const removeError = () => {
      field.style.borderColor = '';
      field.style.backgroundColor = '';
      field.style.boxShadow = '';
      field.removeEventListener('input', removeError);
      field.removeEventListener('change', removeError);
    };
    field.addEventListener('input', removeError);
    field.addEventListener('change', removeError);
  };

  if (!cliente) { showError(fieldCliente); hasError = true; }
  if (!produtoId) { showError(fieldProduto); hasError = true; }
  if (valorVenda <= 0) { showError(fieldValorVenda); hasError = true; }

  if (hasError) {
    return ui.showToast('Preencha os dados obrigatórios destacados em vermelho', 'red');
  }
  
  const entradaDinheiro = Number(document.getElementById('fiado-entrada-dinheiro').value) || 0;
  const temAparelho = document.getElementById('fiado-tem-aparelho').checked;
  const addEstoque = document.getElementById('fiado-add-estoque').checked;
  const valorAparelho = temAparelho ? (Number(document.getElementById('far-valor').value) || 0) : 0;
  
  const saldo = valorVenda - entradaDinheiro - valorAparelho;
  if (saldo < 0) return ui.showToast('Saldo não pode ser negativo', 'red');
  
  // Pegar snapshot do produto
  const p = store.state.allProducts.find(x => x.id === produtoId);
  const snapshot = p ? { ...p } : {};
  
  // Produto Recebido
  let produtoRecebidoDados = null;
  if (temAparelho) {
    if (addEstoque && !document.getElementById('far-imagem').value) {
      return ui.showToast('Informe a imagem do aparelho recebido para adicionar ao estoque', 'red');
    }
    
    produtoRecebidoDados = {
      nome: document.getElementById('far-modelo').value,
      armazenamento: document.getElementById('far-memoria').value,
      condicao: document.getElementById('far-condicao').value,
      custo: valorAparelho,
      preco: Number(document.getElementById('far-preco-venda').value) || 0,
      estoque: 1,
      estoque_minimo: 1,
      ativo: document.getElementById('far-vitrine').checked ? 'true' : 'false',
      imagem_1: document.getElementById('far-imagem').value,
      categoria: 'Usados'
    };
  }
  
  // Gerar parcelas
  const parcelasArr = [];
  const freq = document.getElementById('fiado-frequencia').value;
  const dataRefStr = document.getElementById('fiado-vencimento-1').value;
  if (!dataRefStr) return ui.showToast('Data de vencimento inválida', 'red');
  
  let dataAtual = new Date(dataRefStr + 'T12:00:00'); // Evitar problema de fuso
  const valorParcela = saldo / qtdParcelas;
  
  for (let i = 1; i <= qtdParcelas; i++) {
    parcelasArr.push({
      id: `PARC-${new Date().getTime()}-${i}`,
      numero: i,
      valor: valorParcela,
      vencimento: dataAtual.toISOString().split('T')[0],
      status: 'pendente',
      dataPagamento: ''
    });
    
    // Incrementa data
    if (freq === 'mensal') dataAtual.setMonth(dataAtual.getMonth() + 1);
    else if (freq === 'quinzenal') dataAtual.setDate(dataAtual.getDate() + 15);
    else if (freq === 'semanal') dataAtual.setDate(dataAtual.getDate() + 7);
  }
  
  const payload = {
    cliente,
    telefone: document.getElementById('fiado-telefone').value,
    cpfCnpj: document.getElementById('fiado-cpf').value,
    produtoVendidoId: produtoId,
    produtoVendidoSnapshot: snapshot,
    valorVenda,
    entradaDinheiro,
    temProdutoRecebido: temAparelho,
    produtoRecebidoDados,
    valorAvaliadoProdutoRecebido: valorAparelho,
    produtoRecebidoAdicionadoAoEstoque: addEstoque,
    valorRestante: saldo,
    quantidadeParcelas: qtdParcelas,
    parcelas: parcelasArr,
    status: saldo === 0 ? 'quitado' : 'em_aberto'
  };
  
  const btn = document.getElementById('btn-save-nova-divida');
  const txt = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
  btn.disabled = true;
  
  try {
    const res = await fetch(`${CONFIG.apiBaseUrl}?action=salvar_fiado`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    
    if (json.ok) {
      ui.showToast('Dívida registrada com sucesso!', 'green');
      fecharModalNovaDivida();
      await store.loadDashboardData(() => {}, true);
      initAndRender();
    } else {
      throw new Error(json.error);
    }
  } catch (e) {
    console.error(e);
    ui.showToast('Erro ao salvar dívida', 'red');
  } finally {
    btn.innerHTML = txt;
    btn.disabled = false;
  }
}

window.VendlyFiado_abrirDetalhes = function(id) {
  const f = store.state.allFiados.find(x => x.id === id);
  if (!f) return;
  
  const container = document.getElementById('detalhes-fiado-content');
  const parcelas = f.parcelas || [];
  
  let html = `
    <div class="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-6">
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div><span class="text-gray-500 text-xs block">Cliente</span><span class="font-bold text-gray-900">${f.cliente}</span></div>
        <div><span class="text-gray-500 text-xs block">Telefone</span><span class="font-medium">${f.telefone || '-'}</span></div>
        <div class="col-span-2"><span class="text-gray-500 text-xs block">Produto Vendido</span><span class="font-medium">${f.produtoVendidoSnapshot ? f.produtoVendidoSnapshot.nome : 'Desconhecido'}</span></div>
        <div><span class="text-gray-500 text-xs block">Valor Total</span><span class="font-bold text-gray-900">${ui.formatMoney(f.valorvenda || f.valor_venda)}</span></div>
        <div><span class="text-gray-500 text-xs block">Entrada</span><span class="font-medium text-green-600">${ui.formatMoney(f.entradadinheiro || f.entrada_dinheiro)}</span></div>
        <div><span class="text-gray-500 text-xs block">Aparelho Ref.</span><span class="font-medium">${ui.formatMoney(f.valoravaliadoprodutorecebido || f.valor_avaliado_produto_recebido || 0)}</span></div>
        <div><span class="text-gray-500 text-xs block">Status</span><span class="font-bold">${f.status.toUpperCase()}</span></div>
      </div>
      ${f.status !== 'cancelado' && f.status !== 'quitado' ? `
      <div class="mt-4 pt-4 border-t border-gray-200 text-right">
        <button onclick="window.VendlyFiado_cancelarFiado('${f.id}')" class="text-xs font-semibold text-red-600 hover:text-red-800 transition">
          <i class="fa-solid fa-trash-can mr-1"></i> Cancelar e Reverter Venda
        </button>
      </div>` : ''}
    </div>
    
    <h4 class="text-base font-bold text-gray-900 mb-3">Parcelas</h4>
    <div class="space-y-3">
  `;
  
  parcelas.forEach(p => {
    const isPago = p.status === 'pago';
    html += `
      <div class="flex items-center justify-between p-3 rounded-xl border ${isPago ? 'bg-green-50 border-green-100' : 'bg-white border-gray-200 shadow-sm'}">
        <div>
          <div class="flex items-center gap-2">
            <span class="font-bold text-sm text-gray-900">Parcela ${p.numero}</span>
            ${isPago ? '<span class="bg-green-100 text-green-700 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">Pago</span>' : ''}
          </div>
          <div class="text-xs text-gray-500 mt-0.5">Vencimento: ${p.vencimento ? p.vencimento.split('-').reverse().join('/') : '-'}</div>
        </div>
        <div class="flex items-center gap-3">
          <div class="font-bold text-gray-900">${ui.formatMoney(p.valor)}</div>
          ${!isPago ? `
            <button onclick="window.VendlyFiado_pagarParcela('${f.id}', '${p.id}')" class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition shadow-sm">
              Receber
            </button>
          ` : ''}
        </div>
      </div>
    `;
  });
  
  html += `</div>`;
  
  container.innerHTML = html;
  
  document.getElementById('modal-detalhes-fiado').classList.remove('hidden');
  setTimeout(() => {
    document.getElementById('drawer-detalhes-fiado').classList.remove('translate-x-full');
  }, 10);
};

window.VendlyFiado_pagarParcela = async function(fiadoId, parcelaId) {
  if (!confirm('Confirmar o recebimento desta parcela?')) return;
  
  ui.toggleLoading(true);
  try {
    const res = await fetch(`${CONFIG.apiBaseUrl}?action=pagar_parcela_fiado`, {
      method: 'POST',
      body: JSON.stringify({ fiado_id: fiadoId, parcela_id: parcelaId })
    });
    const json = await res.json();
    if (json.ok) {
      ui.showToast('Parcela recebida com sucesso!', 'green');
      await store.loadDashboardData(() => {}, true);
      initAndRender();
      window.VendlyFiado_abrirDetalhes(fiadoId); // refresh
    } else {
      throw new Error(json.error);
    }
  } catch(e) {
    console.error(e);
    ui.showToast('Erro ao receber parcela', 'red');
  } finally {
    ui.toggleLoading(false);
  }
};

function fecharModalDetalhes() {
  document.getElementById('drawer-detalhes-fiado').classList.add('translate-x-full');
  setTimeout(() => {
    document.getElementById('modal-detalhes-fiado').classList.add('hidden');
  }, 300);
}

window.VendlyFiado_cancelarFiado = function(fiadoId) {
  fiadoIdParaCancelar = fiadoId;
  const modal = document.getElementById('modal-confirmar-cancelamento');
  const box = document.getElementById('box-confirmar-cancelamento');
  modal.classList.remove('hidden');
  setTimeout(() => {
    box.classList.remove('scale-95', 'opacity-0');
    box.classList.add('scale-100', 'opacity-100');
  }, 10);
};

function fecharModalCancelar() {
  const modal = document.getElementById('modal-confirmar-cancelamento');
  const box = document.getElementById('box-confirmar-cancelamento');
  box.classList.remove('scale-100', 'opacity-100');
  box.classList.add('scale-95', 'opacity-0');
  setTimeout(() => {
    modal.classList.add('hidden');
    fiadoIdParaCancelar = null;
  }, 300);
}

async function executarCancelamento() {
  if (!fiadoIdParaCancelar) return;
  const btn = document.getElementById('btn-confirm-cancelar');
  const txt = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Cancelando...';
  btn.disabled = true;
  
  try {
    const res = await fetch(`${CONFIG.apiBaseUrl}?action=cancelar_fiado`, {
      method: 'POST',
      body: JSON.stringify({ fiado_id: fiadoIdParaCancelar })
    });
    const json = await res.json();
    if (json.ok) {
      ui.showToast('Dívida cancelada com sucesso!', 'green');
      fecharModalCancelar();
      fecharModalDetalhes();
      await store.loadDashboardData(() => {}, true);
      initAndRender();
    } else {
      throw new Error(json.error);
    }
  } catch(e) {
    console.error(e);
    ui.showToast('Erro ao cancelar dívida: ' + e.message, 'red');
  } finally {
    btn.innerHTML = txt;
    btn.disabled = false;
  }
}
