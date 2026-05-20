/**
 * Cashflow Module — Modal Logic
 * Open/close/save for manual movement entries + abertura de caixa.
 * Supports both CREATE and EDIT modes for manual movements.
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

// Edit mode state
let editingMovementId = null;

// Confirm modal callback
let confirmCallback = null;

// =============================================
// Standard Movement Modal
// =============================================

/**
 * Open the modal drawer for a new entry
 */
export function openModal(tipo) {
  editingMovementId = null;
  _openModalInternal(tipo);
}

/**
 * Open the modal drawer for editing an existing manual movement
 */
export function openEditModal(movement) {
  if (!movement || !movement.id) return;

  editingMovementId = movement.id;
  const tipo = movement.tipo || 'entrada';

  _openModalInternal(tipo);

  // Pre-fill fields with existing data
  const d = movement.parsedDate instanceof Date && !isNaN(movement.parsedDate.getTime())
    ? movement.parsedDate.toLocaleDateString('pt-BR')
    : (movement.data || '');
  document.getElementById('cf-mov-data').value = d;
  document.getElementById('cf-mov-valor').value = Number(movement.valor) || '';
  document.getElementById('cf-mov-descricao').value = movement.descricao || '';
  document.getElementById('cf-mov-pagamento').value = movement.formaPagamento || movement.forma_pagamento || '';
  document.getElementById('cf-mov-status').value = movement.status || 'confirmado';
  document.getElementById('cf-mov-obs').value = movement.observacao || '';

  // Set category (after options are populated)
  const catSelect = document.getElementById('cf-mov-categoria');
  if (catSelect) {
    const cat = movement.categoria || '';
    // If category doesn't exist in options, add it
    let found = false;
    for (const opt of catSelect.options) {
      if (opt.value === cat) { found = true; break; }
    }
    if (!found && cat) {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      catSelect.appendChild(opt);
    }
    catSelect.value = cat;
  }

  // Update title for edit mode
  const title = document.getElementById('cf-modal-title');
  if (tipo === 'entrada') {
    title.innerHTML = '<i class="fa-solid fa-pen text-emerald-500"></i> Editar Entrada';
  } else {
    title.innerHTML = '<i class="fa-solid fa-pen text-red-500"></i> Editar Saída';
  }

  // Update save button text
  const saveBtn = document.getElementById('cf-modal-save');
  if (saveBtn) {
    saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Salvar Alterações';
  }
}

/**
 * Internal: shared open logic for create/edit modes
 */
function _openModalInternal(tipo) {
  const modal = document.getElementById('cf-modal');
  const drawer = document.getElementById('cf-modal-drawer');
  const title = document.getElementById('cf-modal-title');
  const tipoInput = document.getElementById('cf-mov-tipo');
  const catSelect = document.getElementById('cf-mov-categoria');

  if (!modal || !drawer) return;

  // Set tipo
  tipoInput.value = tipo;

  // Update title (default for create mode)
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

  // Reset save button text
  const saveBtn = document.getElementById('cf-modal-save');
  if (saveBtn) {
    saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Salvar';
  }

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
  editingMovementId = null;

  setTimeout(() => {
    modal.style.display = 'none';
    modal.classList.add('hidden');
  }, 300);
}

/**
 * Save a manual movement (via API) — handles both create and edit.
 * In edit mode, opens a custom UI confirmation modal before saving.
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

  // EDIT MODE: Show custom confirmation modal
  if (editingMovementId) {
    payload.id = editingMovementId;
    const tipoLabel = tipo === 'entrada' ? 'Entrada' : 'Saída';
    const msg = `Tem certeza que deseja alterar esta movimentação?\n\nTipo: ${tipoLabel}\nValor: ${formatMoney(valor)}\nCategoria: ${categoria}`;

    openConfirmModal(msg, async () => {
      await _doSaveEdit(payload, onSaved);
    });
    return;
  }

  // CREATE MODE: Save directly
  await _doSaveCreate(payload, onSaved);
}

/**
 * Internal: Execute create save
 */
async function _doSaveCreate(payload, onSaved) {
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
 * Internal: Execute edit save
 */
async function _doSaveEdit(payload, onSaved) {
  const btn = document.getElementById('cf-modal-save');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
  btn.disabled = true;

  try {
    const res = await fetch(`${CONFIG.apiBaseUrl}?action=editar_movimento_caixa`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const json = await res.json();

    if (json.ok) {
      showToast('Movimentação atualizada com sucesso!', 'green', 'fa-check');
      closeModal();
      if (onSaved) onSaved();
    } else {
      throw new Error(json.error || 'Erro ao atualizar');
    }
  } catch (err) {
    console.error('Erro ao atualizar movimentação:', err);
    showToast('Erro ao atualizar: ' + err.message, 'red', 'fa-xmark');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

/**
 * Delete a manual movement (via API)
 */
export async function deleteMovement(id, onDeleted) {
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

// =============================================
// Custom Confirmation Modal (UI, not native)
// =============================================

/**
 * Open the custom UI confirmation modal.
 * @param {string} message - Message to display (supports \n for line breaks)
 * @param {Function} onConfirm - Callback when user confirms
 * @param {Object} [options] - Styling options
 * @param {string} [options.variant='edit'] - 'edit' (amber) or 'delete' (red)
 * @param {string} [options.title] - Custom title
 * @param {string} [options.confirmText] - Custom confirm button text
 * @param {string} [options.icon] - Custom FontAwesome icon class
 */
export function openConfirmModal(message, onConfirm, options = {}) {
  const modal = document.getElementById('cf-confirm-modal');
  const box = document.getElementById('cf-confirm-box');
  const msgEl = document.getElementById('cf-confirm-msg');
  const titleEl = document.getElementById('cf-confirm-title');
  const iconEl = document.getElementById('cf-confirm-icon');
  const btnYes = document.getElementById('cf-confirm-yes');
  if (!modal || !box) return;

  const variant = options.variant || 'edit';
  const isDelete = variant === 'delete';

  // Set message (convert newlines to <br>)
  if (msgEl) {
    msgEl.innerHTML = message.replace(/\n/g, '<br>');
  }

  // Set title
  if (titleEl) {
    titleEl.textContent = options.title || (isDelete ? 'Confirmar Exclusão' : 'Confirmar Alteração');
  }

  // Set icon styling
  if (iconEl) {
    const iconClass = options.icon || (isDelete ? 'fa-solid fa-trash-can' : 'fa-solid fa-pen-to-square');
    iconEl.className = `w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-sm ${isDelete ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`;
    iconEl.innerHTML = `<i class="${iconClass} text-2xl"></i>`;
  }

  // Set confirm button styling
  if (btnYes) {
    const btnText = options.confirmText || (isDelete ? 'Sim, Excluir' : 'Confirmar Alteração');
    const btnIcon = isDelete ? 'fa-solid fa-trash-can' : 'fa-solid fa-check';
    btnYes.className = `flex-1 px-5 py-3 rounded-xl text-sm font-bold text-white transition shadow-sm flex items-center justify-center gap-2 ${isDelete ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-900 hover:bg-gray-800'}`;
    btnYes.innerHTML = `<i class="${btnIcon} text-xs"></i> ${btnText}`;
  }

  // Store callback
  confirmCallback = onConfirm;

  // Show
  modal.style.display = 'flex';
  modal.classList.remove('hidden');
  cashflowState.isConfirmModalOpen = true;

  // Animate in
  requestAnimationFrame(() => {
    box.classList.remove('scale-95', 'opacity-0');
    box.classList.add('scale-100', 'opacity-100');
  });
}

/**
 * Close the custom UI confirmation modal
 */
export function closeConfirmModal() {
  const modal = document.getElementById('cf-confirm-modal');
  const box = document.getElementById('cf-confirm-box');
  if (!modal || !box) return;

  box.classList.remove('scale-100', 'opacity-100');
  box.classList.add('scale-95', 'opacity-0');
  cashflowState.isConfirmModalOpen = false;
  confirmCallback = null;

  setTimeout(() => {
    modal.style.display = 'none';
    modal.classList.add('hidden');
  }, 300);
}

/**
 * Setup confirm modal event listeners
 */
export function setupConfirmModalListeners() {
  document.getElementById('cf-confirm-no')?.addEventListener('click', closeConfirmModal);
  document.getElementById('cf-confirm-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'cf-confirm-modal') closeConfirmModal();
  });

  document.getElementById('cf-confirm-yes')?.addEventListener('click', () => {
    const cb = confirmCallback;
    closeConfirmModal();
    if (cb) cb();
  });
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
  return cashflowState.isModalOpen || cashflowState.isAberturaCaixaModalOpen || cashflowState.isConfirmModalOpen;
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
