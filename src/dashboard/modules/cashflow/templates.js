/**
 * Cashflow Module — HTML Templates
 * Pure template functions returning HTML strings.
 */

import { formatMoney } from '../ui.js';
import { ABERTURA_CAIXA_ID } from './calculations.js';

/** Period filter labels */
const PERIOD_LABELS = {
  today: 'Hoje',
  week: 'Semana',
  month: 'Mês',
  max: 'Máximo',
  custom: 'Personalizado'
};

/**
 * Full shell template for the cashflow tab
 */
export function shellTemplate() {
  return `
    <div class="cashflow-page">
      <!-- HEADER -->
      <div class="flex flex-col gap-4 mb-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
              <span class="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-sm shadow-md">
                <i class="fa-solid fa-money-bill-transfer"></i>
              </span>
              Fluxo de Caixa
            </h2>
            <p class="text-sm text-gray-500 mt-1.5 ml-0.5">Controle entradas, saídas e saldo disponível da loja.</p>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <button id="cf-btn-extrato" class="cf-btn-action cf-btn-extrato" title="Ver extrato do caixa">
              <i class="fa-solid fa-receipt"></i> Extrato
            </button>
            <button id="cf-btn-abertura" class="cf-btn-action cf-btn-abertura" title="Configurar caixa inicial">
              <i class="fa-solid fa-vault"></i> Caixa Inicial
            </button>
            <button id="cf-btn-entrada" class="cf-btn-action cf-btn-entrada">
              <i class="fa-solid fa-arrow-up"></i> Entrada
            </button>
            <button id="cf-btn-saida" class="cf-btn-action cf-btn-saida">
              <i class="fa-solid fa-arrow-down"></i> Saída
            </button>
          </div>
        </div>

        <!-- FILTERS ROW -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div class="flex items-center gap-1.5 cf-period-chips" id="cf-period-chips">
            <button class="cf-chip active" data-period="today">Hoje</button>
            <button class="cf-chip" data-period="week">Semana</button>
            <button class="cf-chip" data-period="month">Mês</button>
            <button class="cf-chip" data-period="max">Máximo</button>
            <button class="cf-chip" data-period="custom">
              <i class="fa-solid fa-calendar-days text-[10px]"></i> Personalizado
            </button>
          </div>
          <div id="cf-custom-dates" class="hidden flex items-center gap-2">
            <div class="relative">
              <input type="text" id="cf-date-start" class="cf-date-input" placeholder="DD/MM/YYYY" maxlength="10">
              <div class="absolute inset-y-0 right-0 pr-2 flex items-center">
                <input type="date" class="absolute inset-0 opacity-0 cursor-pointer js-date-picker-helper" data-target="cf-date-start">
                <i class="fa-solid fa-calendar-days text-gray-400 text-[10px] pointer-events-none"></i>
              </div>
            </div>
            <span class="text-gray-400 text-xs font-bold">até</span>
            <div class="relative">
              <input type="text" id="cf-date-end" class="cf-date-input" placeholder="DD/MM/YYYY" maxlength="10">
              <div class="absolute inset-y-0 right-0 pr-2 flex items-center">
                <input type="date" class="absolute inset-0 opacity-0 cursor-pointer js-date-picker-helper" data-target="cf-date-end">
                <i class="fa-solid fa-calendar-days text-gray-400 text-[10px] pointer-events-none"></i>
              </div>
            </div>
          </div>
          <div class="relative flex-1 sm:max-w-xs ml-auto">
            <i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
            <input type="text" id="cf-search" class="cf-search-input" placeholder="Buscar movimentação...">
          </div>
        </div>
      </div>

      <!-- ABERTURA DE CAIXA BANNER -->
      <div id="cf-abertura-banner-container" class="mb-4"></div>

      <!-- CARDS -->
      <div id="cf-cards" class="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        ${skeletonCards()}
      </div>

      <!-- QUICK TYPE FILTERS -->
      <div class="flex items-center gap-2 mb-5 flex-wrap" id="cf-type-filters">
        <button class="cf-type-chip active" data-type="all">Todos</button>
        <button class="cf-type-chip" data-type="entrada">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Entradas
        </button>
        <button class="cf-type-chip" data-type="saida">
          <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span> Saídas
        </button>
        <button class="cf-type-chip" data-type="pendente">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Pendentes
        </button>
      </div>

      <!-- INSIGHTS -->
      <div id="cf-insights-container"></div>

      <!-- RESUMO VISUAL -->
      <div id="cf-resumo" class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"></div>

      <!-- TABELA DE MOVIMENTAÇÕES -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse cf-table" id="cf-table">
            <thead class="hidden md:table-header-group">
              <tr class="bg-gray-50/80 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                <th class="p-4">Data</th>
                <th class="p-4">Tipo</th>
                <th class="p-4">Descrição</th>
                <th class="p-4">Categoria</th>
                <th class="p-4">Pagamento</th>
                <th class="p-4 text-right">Valor</th>
                <th class="p-4 text-center">Status</th>
                <th class="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody class="text-sm divide-y divide-gray-50" id="cf-tbody">
              <tr><td colspan="8" class="p-12 text-center text-gray-400">
                <div class="flex flex-col items-center gap-3">
                  <div class="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
                    <i class="fa-solid fa-spinner fa-spin text-gray-300 text-lg"></i>
                  </div>
                  <span class="text-sm font-medium">Carregando movimentações...</span>
                </div>
              </td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

/**
 * Skeleton cards for loading state
 */
export function skeletonCards() {
  const sk = `<div class="cf-card cf-card-skeleton">
    <div class="skeleton h-3 w-20 rounded mb-3"></div>
    <div class="skeleton h-7 w-28 rounded"></div>
  </div>`;
  return sk.repeat(5);
}

/**
 * Render the 5 financial metric cards
 */
export function cardsTemplate({ saldoPeriodo, entradas, saidas, caixaDisponivel, pendenteReceber, pendentePagar }) {
  return `
    <div class="cf-card cf-card-saldo-periodo">
      <div class="cf-card-header">
        <span class="cf-card-icon cf-icon-balance"><i class="fa-solid fa-scale-balanced"></i></span>
        <span class="cf-card-label flex items-center gap-1">
          Saldo do Período
          <i class="fa-solid fa-circle-question text-gray-300 hover:text-gray-500 cursor-pointer js-tooltip-trigger" data-tooltip-content="Diferença entre entradas e saídas confirmadas no período selecionado. Movimentações pendentes não alteram este valor."></i>
        </span>
      </div>
      <span class="cf-card-value ${saldoPeriodo >= 0 ? 'cf-val-positive' : 'cf-val-negative'}">${formatMoney(saldoPeriodo)}</span>
    </div>

    <div class="cf-card cf-card-entradas">
      <div class="cf-card-header">
        <span class="cf-card-icon cf-icon-entrada"><i class="fa-solid fa-arrow-trend-up"></i></span>
        <span class="cf-card-label flex items-center gap-1">
          Entradas
          <i class="fa-solid fa-circle-question text-gray-300 hover:text-gray-500 cursor-pointer js-tooltip-trigger" data-tooltip-content="Total de entradas com status confirmado ou pago no período. Entradas pendentes não são contabilizadas."></i>
        </span>
      </div>
      <span class="cf-card-value cf-val-positive">${formatMoney(entradas)}</span>
    </div>

    <div class="cf-card cf-card-saidas">
      <div class="cf-card-header">
        <span class="cf-card-icon cf-icon-saida"><i class="fa-solid fa-arrow-trend-down"></i></span>
        <span class="cf-card-label flex items-center gap-1">
          Saídas
          <i class="fa-solid fa-circle-question text-gray-300 hover:text-gray-500 cursor-pointer js-tooltip-trigger" data-tooltip-content="Total de saídas com status confirmado ou pago no período. Saídas pendentes não são contabilizadas."></i>
        </span>
      </div>
      <span class="cf-card-value cf-val-negative">${formatMoney(saidas)}</span>
    </div>

    <div class="cf-card cf-card-saldo-atual">
      <div class="cf-card-header">
        <span class="cf-card-icon cf-icon-wallet"><i class="fa-solid fa-wallet"></i></span>
        <span class="cf-card-label flex items-center gap-1">
          Caixa Disponível
          <i class="fa-solid fa-circle-question text-gray-300 hover:text-gray-500 cursor-pointer js-tooltip-trigger" data-tooltip-content="Caixa inicial + entradas confirmadas − saídas confirmadas. Movimentações pendentes não entram neste valor."></i>
        </span>
      </div>
      <span class="cf-card-value ${caixaDisponivel >= 0 ? 'cf-val-positive' : 'cf-val-negative'}">${formatMoney(caixaDisponivel)}</span>
    </div>

    <div class="cf-card cf-card-pendente">
      <div class="cf-card-header">
        <span class="cf-card-icon cf-icon-pendente"><i class="fa-solid fa-clock"></i></span>
        <span class="cf-card-label flex items-center gap-1">
          Pendente a Receber
          <i class="fa-solid fa-circle-question text-gray-300 hover:text-gray-500 cursor-pointer js-tooltip-trigger" data-tooltip-content="Valores previstos a receber de fiados pendentes. Projeção — não entra no Caixa Disponível."></i>
        </span>
      </div>
      <span class="cf-card-value cf-val-pendente">${formatMoney(pendenteReceber)}</span>
    </div>

    <div class="cf-card cf-card-pendente-pagar">
      <div class="cf-card-header">
        <span class="cf-card-icon cf-icon-pendente-pagar"><i class="fa-solid fa-file-invoice-dollar"></i></span>
        <span class="cf-card-label flex items-center gap-1">
          Pendente a Pagar
          <i class="fa-solid fa-circle-question text-gray-300 hover:text-gray-500 cursor-pointer js-tooltip-trigger" data-tooltip-content="Valores previstos a pagar em compras e parcelas pendentes. Projeção — não entra no Caixa Disponível."></i>
        </span>
      </div>
      <span class="cf-card-value cf-val-pendente-pagar">${formatMoney(pendentePagar)}</span>
    </div>
  `;
}

/**
 * Resumo visual — de onde veio / para onde foi
 */
export function resumoTemplate(origens, categoriasSaida) {
  const maxOrigem = origens.length > 0 ? origens[0].valor : 1;
  const maxSaida = categoriasSaida.length > 0 ? categoriasSaida[0].valor : 1;

  const origensHtml = origens.length > 0
    ? origens.map(o => `
        <div class="cf-resumo-item">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-semibold text-gray-700">${o.label}</span>
            <span class="text-xs font-bold text-emerald-600">${formatMoney(o.valor)}</span>
          </div>
          <div class="cf-bar-track"><div class="cf-bar-fill cf-bar-green" style="width: ${Math.max(4, (o.valor / maxOrigem) * 100)}%"></div></div>
        </div>
      `).join('')
    : '<p class="text-xs text-gray-400 py-2">Nenhuma entrada no período</p>';

  const saidasHtml = categoriasSaida.length > 0
    ? categoriasSaida.map(s => `
        <div class="cf-resumo-item">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-semibold text-gray-700">${s.label}</span>
            <span class="text-xs font-bold text-red-500">${formatMoney(s.valor)}</span>
          </div>
          <div class="cf-bar-track"><div class="cf-bar-fill cf-bar-red" style="width: ${Math.max(4, (s.valor / maxSaida) * 100)}%"></div></div>
        </div>
      `).join('')
    : '<p class="text-xs text-gray-400 py-2">Nenhuma saída no período</p>';

  return `
    <div class="cf-resumo-card">
      <h4 class="text-xs font-black text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
        <span class="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center text-[10px]"><i class="fa-solid fa-arrow-up"></i></span>
        Entradas por Origem
      </h4>
      <div class="space-y-3">${origensHtml}</div>
    </div>
    <div class="cf-resumo-card">
      <h4 class="text-xs font-black text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
        <span class="w-5 h-5 rounded-md bg-red-50 text-red-500 flex items-center justify-center text-[10px]"><i class="fa-solid fa-arrow-down"></i></span>
        Saídas por Categoria
      </h4>
      <div class="space-y-3">${saidasHtml}</div>
    </div>
  `;
}

/**
 * Insights operacionais template
 */
export function insightsTemplate(insights) {
  if (!insights || insights.length === 0) return '';
  
  return `
    <div class="flex flex-wrap items-center gap-3 mb-5">
      ${insights.map(i => `
        <div class="flex items-center gap-2 px-3 py-1.5 bg-indigo-50/50 border border-indigo-100 rounded-lg shadow-sm">
          <i class="${i.icon} text-indigo-500 text-[10px]"></i>
          <span class="text-xs font-semibold text-indigo-900">${i.text}</span>
        </div>
      `).join('')}
    </div>
  `;
}


/**
 * Table rows for movements
 */
export function tableRowsTemplate(movements) {
  if (movements.length === 0) {
    return `
      <tr><td colspan="8" class="p-12 text-center">
        <div class="flex flex-col items-center gap-3">
          <div class="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center">
            <i class="fa-solid fa-receipt text-2xl text-gray-300"></i>
          </div>
          <div>
            <p class="text-sm font-bold text-gray-700">Nenhuma movimentação</p>
            <p class="text-xs text-gray-400 mt-0.5">Registre entradas e saídas ou ajuste os filtros.</p>
          </div>
        </div>
      </td></tr>
    `;
  }

  return movements.map(m => {
    const isAbertura = m.id === ABERTURA_CAIXA_ID;
    let typeBadge = '';
    let valorClass = '';
    let valorPrefix = '';
    
    if (m.tipo === 'entrada') {
      typeBadge = '<span class="cf-badge cf-badge-entrada"><i class="fa-solid fa-arrow-up text-[8px]"></i> Entrada</span>';
      valorClass = 'text-emerald-600';
      valorPrefix = '+';
    } else if (m.tipo === 'saida') {
      typeBadge = '<span class="cf-badge cf-badge-saida"><i class="fa-solid fa-arrow-down text-[8px]"></i> Saída</span>';
      valorClass = 'text-red-500';
      valorPrefix = '-';
    } else {
      typeBadge = '<span class="cf-badge bg-indigo-50 text-indigo-600 border border-indigo-100"><i class="fa-solid fa-box text-[8px]"></i> Patrimônio</span>';
      valorClass = 'text-indigo-600';
      valorPrefix = '';
    }

    const d = m.parsedDate instanceof Date && !isNaN(m.parsedDate.getTime())
      ? m.parsedDate.toLocaleDateString('pt-BR') : '-';

    let statusBadge = '';
    if (m.status === 'confirmado') statusBadge = '<span class="cf-status-badge cf-status-confirmado">Confirmado</span>';
    else if (m.status === 'pendente') statusBadge = '<span class="cf-status-badge cf-status-pendente">Pendente</span>';
    else if (m.status === 'cancelado') statusBadge = '<span class="cf-status-badge cf-status-cancelado">Cancelado</span>';

    const isAuto = m.origem === 'auto' || isAbertura;

    return `
      <tr class="cf-table-row hover:bg-gray-50/60 transition-colors group">
        <td class="p-4 block md:table-cell">
          <span class="md:hidden text-[9px] font-bold text-gray-400 uppercase mr-1">Data:</span>
          <span class="text-xs font-semibold text-gray-600">${d}</span>
        </td>
        <td class="p-4 block md:table-cell">
          <span class="md:hidden text-[9px] font-bold text-gray-400 uppercase mr-1">Tipo:</span>
          ${typeBadge}
        </td>
        <td class="p-4 block md:table-cell">
          <div class="font-semibold text-gray-800 text-[13px]">${m.descricao || '-'}</div>
          ${m.subDescricao ? `<div class="text-[10px] font-medium text-gray-500 mt-0.5">${m.subDescricao}</div>` : ''}
          ${isAbertura ? '<span class="inline-flex items-center mt-1 text-[8px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 uppercase tracking-wider"><i class="fa-solid fa-vault mr-1"></i>Caixa Inicial</span>' : isAuto ? '<span class="inline-flex items-center mt-1 text-[8px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 uppercase tracking-wider">Automático</span>' : ''}
        </td>
        <td class="p-4 block md:table-cell">
          <span class="md:hidden text-[9px] font-bold text-gray-400 uppercase mr-1">Categoria:</span>
          <span class="text-xs font-medium text-gray-600">${m.categoria || '-'}</span>
        </td>
        <td class="p-4 block md:table-cell">
          <span class="md:hidden text-[9px] font-bold text-gray-400 uppercase mr-1">Pagamento:</span>
          <span class="text-xs text-gray-500">${m.formaPagamento || '-'}</span>
        </td>
        <td class="p-4 text-right block md:table-cell">
          <span class="md:hidden text-[9px] font-bold text-gray-400 uppercase mr-1">Valor:</span>
          <span class="font-black text-sm whitespace-nowrap ${valorClass}">${valorPrefix}${formatMoney(Math.abs(m.valor))}</span>
        </td>
        <td class="p-4 text-center block md:table-cell">
          <span class="md:hidden text-[9px] font-bold text-gray-400 uppercase mr-1">Status:</span>
          ${statusBadge}
        </td>
        <td class="p-4 text-center block md:table-cell">
          ${isAbertura ? `
            <div class="flex gap-1">
              <button class="cf-action-btn opacity-0 group-hover:opacity-100 transition-opacity" data-action="edit-abertura" title="Editar caixa inicial">
                <i class="fa-solid fa-pen text-[10px] text-gray-400"></i>
              </button>
              <button class="cf-action-btn opacity-0 group-hover:opacity-100 transition-opacity" data-action="delete" data-id="${m.id}" data-desc="Abertura de Caixa" data-valor="${m.valor}" data-tipo="${m.tipo}" title="Excluir caixa inicial">
                <i class="fa-solid fa-trash-can text-[10px]"></i>
              </button>
            </div>
          ` : !isAuto ? `
            <div class="flex gap-1">
              <button class="cf-action-btn opacity-0 group-hover:opacity-100 transition-opacity" data-action="edit" data-id="${m.id}" title="Editar movimentação">
                <i class="fa-solid fa-pen text-[10px] text-gray-400"></i>
              </button>
              <button class="cf-action-btn opacity-0 group-hover:opacity-100 transition-opacity" data-action="delete" data-id="${m.id}" data-desc="${m.descricao || 'Sem descrição'}" data-valor="${m.valor}" data-tipo="${m.tipo}" title="Excluir movimentação">
                <i class="fa-solid fa-trash-can text-[10px]"></i>
              </button>
            </div>
          ` : `
            <button class="cf-action-btn cf-action-btn-disabled opacity-0 group-hover:opacity-100 transition-opacity" title="Esta movimentação é vinculada a uma operação e não pode ser excluída diretamente.">
              <i class="fa-solid fa-lock text-[10px] text-gray-300"></i>
            </button>
          `}
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Modal template for new movement
 */
export function modalTemplate() {
  return `
    <div id="cf-modal" class="fixed inset-0 bg-black/60 backdrop-blur-sm hidden items-center justify-center z-[100] p-4" style="display:none;">
      <div id="cf-modal-drawer" class="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl flex flex-col transform translate-x-full transition-transform duration-300 ease-out z-[101]">
        <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
          <h3 id="cf-modal-title" class="text-lg font-bold text-gray-900 flex items-center gap-2">
            <i class="fa-solid fa-plus"></i> Nova Movimentação
          </h3>
          <button id="cf-modal-close" class="text-gray-400 hover:text-gray-600 transition w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <i class="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <div class="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-5">
          <!-- Tipo -->
          <input type="hidden" id="cf-mov-tipo" value="entrada">

          <!-- Data -->
          <div>
            <label class="cf-label">Data *</label>
            <div class="relative">
              <input type="text" id="cf-mov-data" class="cf-input" placeholder="DD/MM/YYYY" maxlength="10">
              <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
                <input type="date" class="absolute inset-0 opacity-0 cursor-pointer js-date-picker-helper" data-target="cf-mov-data">
                <i class="fa-solid fa-calendar-days text-gray-400 text-[10px] pointer-events-none"></i>
              </div>
            </div>
          </div>

          <!-- Valor -->
          <div>
            <label class="cf-label">Valor (R$) *</label>
            <input type="number" id="cf-mov-valor" class="cf-input" placeholder="0.00" step="0.01" min="0">
          </div>

          <!-- Categoria -->
          <div>
            <label class="cf-label">Categoria *</label>
            <select id="cf-mov-categoria" class="cf-input">
              <option value="">Selecione...</option>
            </select>
          </div>

          <!-- Descrição -->
          <div>
            <label class="cf-label">Descrição</label>
            <input type="text" id="cf-mov-descricao" class="cf-input" placeholder="Ex: Venda iPhone, Pagamento frete...">
          </div>

          <!-- Forma de Pagamento -->
          <div>
            <label class="cf-label">Forma de Pagamento</label>
            <select id="cf-mov-pagamento" class="cf-input">
              <option value="">Selecione...</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="PIX">PIX</option>
              <option value="Cartão Crédito">Cartão Crédito</option>
              <option value="Cartão Débito">Cartão Débito</option>
              <option value="Transferência">Transferência</option>
              <option value="Boleto">Boleto</option>
              <option value="Outro">Outro</option>
            </select>
          </div>

          <!-- Status -->
          <div>
            <label class="cf-label">Status</label>
            <select id="cf-mov-status" class="cf-input">
              <option value="confirmado">Confirmado</option>
              <option value="pendente">Pendente</option>
            </select>
          </div>

          <!-- Observação -->
          <div>
            <label class="cf-label">Observação</label>
            <textarea id="cf-mov-obs" class="cf-input" rows="2" placeholder="Nota opcional..."></textarea>
          </div>
        </div>

        <div class="p-6 border-t border-gray-100 bg-gray-50/50 flex items-center gap-3 shrink-0">
          <button id="cf-modal-cancel" class="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition">
            Cancelar
          </button>
          <button id="cf-modal-save" class="flex-1 px-4 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition shadow-sm flex items-center justify-center gap-2">
            <i class="fa-solid fa-check"></i> Salvar
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Banner CTA when no opening balance is configured
 */
export function aberturaBannerTemplate(hasAbertura) {
  if (hasAbertura) return '';
  return `
    <div class="cf-abertura-banner" id="cf-abertura-banner">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center flex-shrink-0">
          <i class="fa-solid fa-vault text-sm"></i>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-bold text-gray-800">Defina o caixa inicial</p>
          <p class="text-xs text-gray-500 mt-0.5">Informe o saldo real da loja para conciliar o Caixa Disponível.</p>
        </div>
        <button id="cf-banner-abertura-btn" class="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition shadow-sm flex items-center gap-1.5 flex-shrink-0">
          <i class="fa-solid fa-plus text-[10px]"></i> Configurar
        </button>
      </div>
    </div>
  `;
}

/**
 * Modal template for Abertura de Caixa
 */
export function aberturaModalTemplate() {
  return `
    <div id="cf-abertura-modal" class="fixed inset-0 bg-black/60 backdrop-blur-sm hidden items-center justify-center z-[100] p-4" style="display:none;">
      <div id="cf-abertura-drawer" class="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl flex flex-col transform translate-x-full transition-transform duration-300 ease-out z-[101]">
        <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-teal-50 to-white shrink-0">
          <h3 class="text-lg font-bold text-gray-900 flex items-center gap-2.5">
            <span class="w-8 h-8 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center text-sm">
              <i class="fa-solid fa-vault"></i>
            </span>
            Abertura de Caixa
          </h3>
          <button id="cf-abertura-close" class="text-gray-400 hover:text-gray-600 transition w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <i class="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <div class="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-5">
          <!-- Info box -->
          <div class="bg-teal-50/50 border border-teal-100 rounded-xl p-4">
            <p class="text-xs font-semibold text-teal-800 leading-relaxed">
              <i class="fa-solid fa-circle-info text-teal-500 mr-1"></i>
              Use este valor como ponto de partida para o Vendly calcular o caixa disponível.
              Movimentações anteriores a esta data não serão contabilizadas.
            </p>
          </div>

          <!-- Edit warning (hidden by default) -->
          <div id="cf-abertura-edit-warning" class="hidden bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p class="text-xs font-semibold text-amber-800 leading-relaxed">
              <i class="fa-solid fa-triangle-exclamation text-amber-500 mr-1"></i>
              Alterar o caixa inicial recalcula todo o saldo disponível a partir da nova data e valor.
            </p>
          </div>

          <!-- Data -->
          <div>
            <label class="cf-label">Data de Início do Controle *</label>
            <div class="relative">
              <input type="text" id="cf-abertura-data" class="cf-input" placeholder="DD/MM/YYYY" maxlength="10">
              <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
                <input type="date" class="absolute inset-0 opacity-0 cursor-pointer js-date-picker-helper" data-target="cf-abertura-data">
                <i class="fa-solid fa-calendar-days text-gray-400 text-[10px] pointer-events-none"></i>
              </div>
            </div>
            <p class="text-[10px] text-gray-400 mt-1.5 ml-0.5">A partir desta data o Vendly calculará o caixa.</p>
          </div>

          <!-- Valor -->
          <div>
            <label class="cf-label">Valor Disponível em Caixa/Banco (R$) *</label>
            <input type="text" id="cf-abertura-valor" class="cf-input" placeholder="0,00">
            <p class="text-[10px] text-gray-400 mt-1.5 ml-0.5">Quanto a loja tinha disponível nessa data.</p>
          </div>

          <!-- Observação -->
          <div>
            <label class="cf-label">Observação</label>
            <textarea id="cf-abertura-obs" class="cf-input" rows="2" placeholder="Ex: Saldo em caixa + banco na abertura do controle"></textarea>
          </div>
        </div>

        <div class="p-6 border-t border-gray-100 bg-gray-50/50 flex items-center gap-3 shrink-0">
          <button id="cf-abertura-cancel" class="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition">
            Cancelar
          </button>
          <button id="cf-abertura-save" class="flex-1 px-4 py-3 bg-teal-600 text-white rounded-xl text-sm font-bold hover:bg-teal-700 transition shadow-sm flex items-center justify-center gap-2">
            <i class="fa-solid fa-check"></i> Salvar Abertura
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Confirmation modal template (custom UI, not native browser).
 * Icon, title, message, and button text are set dynamically via JS.
 */
export function confirmModalTemplate() {
  return `
    <div id="cf-confirm-modal" class="fixed inset-0 bg-black/60 backdrop-blur-sm hidden items-center justify-center z-[120] p-4" style="display:none;">
      <div id="cf-confirm-box" class="bg-white rounded-2xl shadow-2xl w-full max-w-sm relative z-10 transform transition-all duration-300 scale-95 opacity-0">
        <div class="p-6 text-center space-y-4">
          <div id="cf-confirm-icon" class="w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-sm bg-amber-100 text-amber-600">
            <i class="fa-solid fa-pen-to-square text-2xl"></i>
          </div>
          <div>
            <h3 id="cf-confirm-title" class="text-lg font-bold text-gray-900">Confirmar</h3>
            <p id="cf-confirm-msg" class="text-sm text-gray-500 mt-2 leading-relaxed"></p>
          </div>
        </div>
        <div class="p-4 bg-gray-50 border-t border-gray-100 flex items-center gap-3 rounded-b-2xl">
          <button id="cf-confirm-no" class="flex-1 px-5 py-3 rounded-xl text-sm font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 transition text-center">
            Cancelar
          </button>
          <button id="cf-confirm-yes" class="flex-1 px-5 py-3 rounded-xl text-sm font-bold text-white transition shadow-sm flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800">
            Confirmar
          </button>
        </div>
      </div>
    </div>
  `;
}
