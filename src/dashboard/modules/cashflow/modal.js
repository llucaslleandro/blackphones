/**
 * Cashflow Module — Modal Logic
 * Open/close/save for manual movement entries + abertura de caixa.
 */

import { CONFIG } from '../../../shared/config.js';
import { cashflowState } from './state.js';
import { showToast, applyDateMask, parseDateBr, formatMoney, applyMoneyMask, parseNumber } from '../ui.js';
import { ABERTURA_CAIXA_ID } from './calculations.js';

const CATEGORIAS_ENTRADA = [
  'Venda', 'Fiado Recebido', 'Aporte', 'Ajuste Positivo', 'Outros'
];

const CATEGORIAS_SAIDA = [
  'Compra', 'Frete', 'Taxa', 'Despesa Fixa', 'Despesa Variável', 'Retirada', 'Ajuste Negativo', 'Outros'
];

// =============================================
// Standard Movement Modal
// =============================================

/**
 * Open the modal drawer for a new entry
 */
export function openModal(tipo) {
  const modal = document.getElementById('cf-modal');
  const drawer = document.getElementById('cf-modal-drawer');
  const title = document.getElementById('cf-modal-title');
  const tipoInput = document.getElementById('cf-mov-tipo');
  const catSelect = document.getElementById('cf-mov-categoria');

  if (!modal || !drawer) return;

  // Set tipo
  tipoInput.value = tipo;

  // Update title
  if (tipo === 'entrada') {
    title.innerHTML = '<i class="fa-solid fa-arrow-up text-emerald-500"></i> Nova Entrada';
  } else {
    title.innerHTML = '<i class="fa-solid fa-arrow-down text-red-500"></i> Nova Saída';
  }

  // Populate categories
  const cats = tipo === 'entrada' ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA;
  catSelect.innerHTML = '<option value="">Selecione...</option>' +
    cats.map(c => `<option value="${c}">${c}</option>`).join('');

  // Set default date to today
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();
  document.getElementById('cf-mov-data').value = `${dd}/${mm}/${yyyy}`;

  // Clear other fields
  document.getElementById('cf-mov-valor').value = '';
  document.getElementById('cf-mov-descricao').value = '';
  document.getElementById('cf-mov-pagamento').value = '';
  document.getElementById('cf-mov-status').value = 'confirmado';
  document.getElementById('cf-mov-obs').value = '';

  // Show
  modal.style.display = 'flex';
  modal.classList.remove('hidden');
  cashflowState.isModalOpen = true;

  setTimeout(() => {
    drawer.classList.remove('translate-x-full');
  }, 20);
}

/**
 * Close the modal drawer
 */
export function closeModal() {
  const drawer = document.getElementById('cf-modal-drawer');
  const modal = document.getElementById('cf-modal');
  if (!drawer || !modal) return;

  drawer.classList.add('translate-x-full');
  cashflowState.isModalOpen = false;

  setTimeout(() => {
    modal.style.display = 'none';
    modal.classList.add('hidden');
  }, 300);
}

/**
 * Save a manual movement (via API)
 */
export async function saveMovement(onSaved) {
  const tipo = document.getElementById('cf-mov-tipo').value;
  const dataStr = document.getElementById('cf-mov-data').value;
  const valor = Number(document.getElementById('cf-mov-valor').value) || 0;
  const categoria = document.getElementById('cf-mov-categoria').value;
  const descricao = document.getElementById('cf-mov-descricao').value.trim();
  const formaPagamento = document.getElementById('cf-mov-pagamento').value;
  const status = document.getElementById('cf-mov-status').value;
  const observacao = document.getElementById('cf-mov-obs').value.trim();

  // Validate
  if (!dataStr || dataStr.length < 10) {
    return showToast('Informe a data da movimentação', 'red', 'fa-xmark');
  }
  if (valor <= 0) {
    return showToast('Informe um valor válido', 'red', 'fa-xmark');
  }
  if (!categoria) {
    return showToast('Selecione uma categoria', 'red', 'fa-xmark');
  }

  // Parse date
  const isoDate = parseDateBr(dataStr);
  if (!isoDate) {
    return showToast('Data inválida', 'red', 'fa-xmark');
  }

  const payload = {
    tipo,
    data: isoDate,
    valor,
    categoria,
    descricao: descricao || categoria,
    forma_pagamento: formaPagamento,
    status: status || 'confirmado',
    observacao
  };

  const btn = document.getElementById('cf-modal-save');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
  btn.disabled = true;

  try {
    const res = await fetch(`${CONFIG.apiBaseUrl}?action=salvar_movimento_caixa`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const json = await res.json();

    if (json.ok) {
      showToast('Movimentação salva com sucesso!', 'green', 'fa-check');
      closeModal();
      if (onSaved) onSaved();
    } else {
      throw new Error(json.error || 'Erro ao salvar');
    }
  } catch (err) {
    console.error('Erro ao salvar movimentação:', err);
    showToast('Erro ao salvar: ' + err.message, 'red', 'fa-xmark');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

/**
 * Delete a manual movement (via API)
 */
export async function deleteMovement(id, onDeleted) {
  // Block deletion of opening balance with weak confirm
  if (id === ABERTURA_CAIXA_ID) {
    const msg = '⚠️ ATENÇÃO: Excluir a Abertura de Caixa fará o sistema voltar a calcular o caixa a partir de zero.\n\nTem certeza que deseja remover o caixa inicial?';
    if (!confirm(msg)) return;
  }

  try {
    const res = await fetch(`${CONFIG.apiBaseUrl}?action=remover_movimento_caixa`, {
      method: 'POST',
      body: JSON.stringify({ id })
    });
    const json = await res.json();

    if (json.ok) {
      showToast('Movimentação removida', 'blue', 'fa-trash-can');
      if (onDeleted) onDeleted();
    } else {
      throw new Error(json.error || 'Erro ao remover');
    }
  } catch (err) {
    console.error('Erro ao remover movimentação:', err);
    showToast('Erro ao remover: ' + err.message, 'red', 'fa-xmark');
  }
}

/**
 * Setup all modal event listeners
 */
export function setupModalListeners(onSaved) {
  document.getElementById('cf-modal-close')?.addEventListener('click', closeModal);
  document.getElementById('cf-modal-cancel')?.addEventListener('click', closeModal);
  document.getElementById('cf-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'cf-modal') closeModal();
  });
  document.getElementById('cf-modal-save')?.addEventListener('click', () => saveMovement(onSaved));
  document.getElementById('cf-mov-data')?.addEventListener('input', applyDateMask);
}

export function isModalOpen() {
  return cashflowState.isModalOpen || cashflowState.isAberturaCaixaModalOpen;
}

// =============================================
// Abertura de Caixa Modal
// =============================================

/**
 * Open the Abertura de Caixa modal
 */
export function openAberturaCaixaModal() {
  const modal = document.getElementById('cf-abertura-modal');
  const drawer = document.getElementById('cf-abertura-drawer');
  if (!modal || !drawer) return;

  // Pre-fill with existing data if editing
  const existing = cashflowState.aberturaCaixa;
  if (existing) {
    const d = existing.parsedDate instanceof Date && !isNaN(existing.parsedDate.getTime())
      ? existing.parsedDate.toLocaleDateString('pt-BR')
      : '';
    document.getElementById('cf-abertura-data').value = d;
    const val = Number(existing.valor) || 0;
    document.getElementById('cf-abertura-valor').value = val > 0 ? val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
    document.getElementById('cf-abertura-obs').value = existing.observacao || '';
  } else {
    // Default to today
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    document.getElementById('cf-abertura-data').value = `${dd}/${mm}/${yyyy}`;
    document.getElementById('cf-abertura-valor').value = '';
    document.getElementById('cf-abertura-obs').value = '';
  }

  // Show editing warning
  const warningEl = document.getElementById('cf-abertura-edit-warning');
  if (warningEl) {
    warningEl.classList.toggle('hidden', !existing);
  }

  modal.style.display = 'flex';
  modal.classList.remove('hidden');
  cashflowState.isAberturaCaixaModalOpen = true;

  setTimeout(() => {
    drawer.classList.remove('translate-x-full');
  }, 20);
}

/**
 * Close the Abertura de Caixa modal
 */
export function closeAberturaCaixaModal() {
  const drawer = document.getElementById('cf-abertura-drawer');
  const modal = document.getElementById('cf-abertura-modal');
  if (!drawer || !modal) return;

  drawer.classList.add('translate-x-full');
  cashflowState.isAberturaCaixaModalOpen = false;

  setTimeout(() => {
    modal.style.display = 'none';
    modal.classList.add('hidden');
  }, 300);
}

/**
 * Save the Abertura de Caixa (via API)
 */
export async function saveAberturaCaixa(onSaved) {
  const dataStr = document.getElementById('cf-abertura-data').value;
  const valor = parseNumber(document.getElementById('cf-abertura-valor').value) || 0;
  const observacao = document.getElementById('cf-abertura-obs').value.trim();

  // Validate
  if (!dataStr || dataStr.length < 10) {
    return showToast('Informe a data de início do controle', 'red', 'fa-xmark');
  }
  if (valor < 0) {
    return showToast('Valor não pode ser negativo', 'red', 'fa-xmark');
  }

  // Parse date
  const isoDate = parseDateBr(dataStr);
  if (!isoDate) {
    return showToast('Data inválida', 'red', 'fa-xmark');
  }

  // Confirm if editing
  const isEditing = !!cashflowState.aberturaCaixa;
  if (isEditing) {
    const msg = 'Alterar o caixa inicial recalcula o saldo disponível a partir da nova data e valor.\n\nDeseja continuar?';
    if (!confirm(msg)) return;
  }

  const payload = {
    data: isoDate,
    valor,
    observacao
  };

  const btn = document.getElementById('cf-abertura-save');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
  btn.disabled = true;

  try {
    const res = await fetch(`${CONFIG.apiBaseUrl}?action=salvar_abertura_caixa`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const json = await res.json();

    if (json.ok) {
      showToast(isEditing ? 'Caixa inicial atualizado!' : 'Abertura de caixa definida!', 'green', 'fa-check');
      closeAberturaCaixaModal();
      if (onSaved) onSaved();
    } else {
      throw new Error(json.error || 'Erro ao salvar');
    }
  } catch (err) {
    console.error('Erro ao salvar abertura de caixa:', err);
    showToast('Erro ao salvar: ' + err.message, 'red', 'fa-xmark');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

/**
 * Setup Abertura de Caixa modal listeners
 */
export function setupAberturaCaixaListeners(onSaved) {
  document.getElementById('cf-abertura-close')?.addEventListener('click', closeAberturaCaixaModal);
  document.getElementById('cf-abertura-cancel')?.addEventListener('click', closeAberturaCaixaModal);
  document.getElementById('cf-abertura-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'cf-abertura-modal') closeAberturaCaixaModal();
  });
  document.getElementById('cf-abertura-save')?.addEventListener('click', () => saveAberturaCaixa(onSaved));
  document.getElementById('cf-abertura-data')?.addEventListener('input', applyDateMask);
  document.getElementById('cf-abertura-valor')?.addEventListener('input', applyMoneyMask);
}
