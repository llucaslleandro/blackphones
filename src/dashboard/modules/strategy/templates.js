import { formatMoney } from '../ui.js';

export function getPrioridadeHtml(data) {
  if (data.type === 'recuperar-caixa') {
    return `
      <h5 class="text-xl md:text-2xl font-black mb-1">Receita Travada no Funil</h5>
      <p class="text-[13px] text-indigo-100 font-medium tracking-wide">
        Existem <strong class="text-white">${data.pendentes} clientes</strong> em estágio avançado de compra. 
        Antes de investir em novos leads, priorize o fechamento desses contatos nas próximas <strong class="text-white">24h</strong>.
      </p>`;
  }

  if (data.type === 'estancar-sangria') {
    return `
      <h5 class="text-xl md:text-2xl font-black mb-1 text-red-200">Perda Direta de Margem</h5>
      <p class="text-[13px] text-indigo-100 font-medium tracking-wide">
        O volume de cancelamentos indica falha recorrente no fechamento ou negociação. 
        Identifique objeções mais frequentes e ajuste o processo comercial imediatamente.
      </p>`;
  }

  if (data.type === 'injetar-trafego') {
    return `
      <h5 class="text-xl md:text-2xl font-black mb-1">Escala do Produto Líder</h5>
      <p class="text-[13px] text-indigo-100 font-medium tracking-wide">
        O <strong class="text-white text-xs">${data.produto}</strong> já demonstrou tração consistente. 
        Aumentar exposição e tráfego nesse modelo tende a gerar crescimento direto e previsível.
      </p>`;
  }

  return `
    <h5 class="text-xl md:text-2xl font-black mb-1">Baixa Geração de Demanda</h5>
    <p class="text-[13px] text-indigo-100 font-medium tracking-wide">
      A operação não está gerando volume suficiente de oportunidades. 
      É necessário aumentar exposição, tráfego e atratividade da vitrine.
    </p>`;
}

export function getDinheiroRapidoHtml(data) {
  return `
    <h5 class="text-3xl lg:text-4xl font-black tracking-tight text-white mb-1 drop-shadow-md">
      ${formatMoney(data.valor)}
    </h5>
    <p class="text-[13px] font-medium text-green-100 leading-tight">
      Valor estimado ainda recuperável a partir de 
      <strong class="text-white bg-green-900/40 px-1 py-0.5 rounded">${data.pendentes} negociações em aberto</strong>.
    </p>
  `;
}

export function getFunilHtml(data) {
  return `
    <div class="w-16 h-16 rounded-full flex items-center justify-center border-4 mb-2 shadow-inner ${data.color}">
       <i class="fa-solid ${data.icon} text-2xl"></i>
    </div>
    <p class="text-[11px] font-bold ${data.classStyle} uppercase text-center mt-2">${data.badge}</p>
    <p class="text-2xl font-black text-gray-800 mt-1">${data.conversao.toFixed(1)}%</p>
  `;
}

export function getVisaoGeralHtml(data) {
  let visaoText = `
    O período gerou <strong class="text-green-600 text-lg tracking-tight bg-green-50 px-1 rounded">
      ${formatMoney(data.lucro)}
    </strong> em vendas efetivamente concluídas.<br><br>
  `;

  if (data.hasPrevData) {
    if (data.growth > 0) {
      visaoText += `📈 Crescimento de <strong class="text-green-600 font-bold text-base">+${data.growth.toFixed(1)}%</strong>, indicando ganho de eficiência ou aumento de demanda.`;
    } else if (data.growth < 0) {
      visaoText += `⚠️ Queda de <strong class="text-red-500 font-bold text-base">${Math.abs(data.growth).toFixed(1)}%</strong>, sugerindo perda de tração ou falhas no processo comercial.`;
    }
  }

  return `<p class="md:text-[15px]">${visaoText}</p>`;
}

export function getComportamentoHtml(data) {
  let compHtml = `
    <p>
      Ticket médio atual de 
      <strong class="text-indigo-600 text-base font-bold bg-indigo-50 px-1 rounded">
        ${formatMoney(data.ticketMedio)}
      </strong>.
    </p>`;

  if (data.tipo === 'premium') {
    compHtml += `
      <p class="mt-4 text-gray-600 text-[13px] border-l-2 border-indigo-200 pl-3">
        <strong>Perfil de alto valor.</strong> O público demonstra disposição para pagar mais. 
        Estratégia deve focar em autoridade, confiança e percepção de valor — não em desconto.
      </p>`;
  } else if (data.tipo === 'custo-beneficio') {
    compHtml += `
      <p class="mt-4 text-gray-600 text-[13px] border-l-2 border-indigo-200 pl-3">
        <strong>Perfil orientado a custo-benefício.</strong> Comparação clara, prova de vantagem e ofertas objetivas aumentam conversão.
      </p>`;
  } else {
    compHtml += `
      <p class="mt-4 text-gray-600 text-[13px] border-l-2 border-indigo-200 pl-3">
        <strong>Alta sensibilidade a preço.</strong> Decisão depende de estímulos fortes de oferta, urgência e diferenciação visual.
      </p>`;
  }

  return compHtml;
}

export function getDesempenhoHtml(data) {
  let desHtml = data.topProduto
    ? `<p>O modelo <strong>${data.topProduto.nome}</strong> concentra maior volume de vendas (${data.topProduto.val}), indicando forte aderência à demanda atual.</p>`
    : '';

  if (data.idleCount > 0 && data.idleCount <= 30) {
    desHtml += `
      <p class="mt-4 text-gray-500 text-xs italic bg-gray-50 p-2 rounded">
        ${data.idleCount} produtos não tiveram saída no período. Isso indica baixa rotação e possível capital imobilizado.
      </p>`;
  }

  return desHtml || '<p class="text-sm">Ainda não há volume suficiente para avaliar desempenho com precisão.</p>';
}

export function getProblemasHtml(items) {
  const htmls = items.map(item => {
    if (item.type === 'conversao-baixa') {
      return `
        <div class="bg-white p-4 rounded-xl border border-red-100">
          <h6 class="font-extrabold text-red-900 text-[12px] uppercase mb-1">Gargalo de Conversão</h6>
          <p class="text-[13px] text-gray-700">
            ${item.leadsPerdidos} oportunidades não evoluíram para venda. 
            O principal ponto de perda está na condução do fechamento.
          </p>
        </div>`;
    }

    if (item.type === 'cancelados') {
      return `
        <div class="bg-white p-4 rounded-xl border border-red-100">
          <h6 class="font-extrabold text-red-900 text-[12px] uppercase mb-1">
            ${formatMoney(item.valor)} em Receita Perdida
          </h6>
          <p class="text-[13px] text-gray-700">
            Cancelamentos recorrentes estão impactando diretamente o resultado. 
            É essencial mapear causas e ajustar abordagem.
          </p>
        </div>`;
    }

    return `
      <div class="bg-green-50 p-4 rounded-xl border border-green-200">
        <p class="text-green-800 font-bold text-sm">
          Nenhum ponto crítico identificado. A operação mantém estabilidade no período.
        </p>
      </div>`;
  });

  return htmls.join('');
}

export function getOportunidadesHtml(items) {
  const htmls = items.map(item => {
    if (item.type === 'escalar-campeao') {
      return `
        <div class="bg-white p-4 rounded-xl border border-blue-100">
          <h6 class="font-extrabold text-blue-900 text-[12px] uppercase mb-1">
            Alavancar ${item.produto}
          </h6>
          <p class="text-[13px] text-gray-700">
            Produto já validado com demanda real. 
            Aumentar tráfego e exposição tende a gerar crescimento previsível.
          </p>
        </div>`;
    }

    if (item.type === 'recuperar-pendentes') {
      return `
        <div class="bg-white p-4 rounded-xl border border-green-100">
          <h6 class="font-extrabold text-green-900 text-[12px] uppercase mb-1">
            Recuperação de Receita Imediata
          </h6>
          <p class="text-[13px] text-gray-700">
            Leads já qualificados podem gerar faturamento sem aquisição de novos clientes.
          </p>
        </div>`;
    }

    return '';
  });

  return htmls.join('');
}

export function getAcoesHtml(items) {
  const htmls = items.map(item => {
    if (item.type === 'recuperar-pendentes') {
      return `
        <div class="bg-gray-50 border border-gray-100 rounded-xl p-4">
          <h5 class="text-green-800 font-extrabold text-[13px] mb-2 uppercase">
            Priorizar Recuperação de ${formatMoney(item.valor)}
          </h5>
          <p class="text-xs">
            Inicie contato pelos leads mais recentes. A probabilidade de conversão é maior nesse grupo.
          </p>
        </div>`;
    }

    return `
      <div class="p-5 bg-green-50 text-green-800 text-center font-bold text-sm rounded-xl">
        Nenhuma ação crítica no momento. Mantenha consistência no processo atual.
      </div>`;
  });

  return htmls.join('');
}

export const getEmptyStateHtml = () => '<p class="text-sm font-medium text-gray-500">Sem dados suficientes para processar diagnóstico IA.</p>';
export const getEmptyPrioridadeHtml = () => `<h5 class="text-sm font-bold text-gray-300">Aguardando Vendas...</h5>`;
export const getEmptyDinheiroHtml = () => `<h5 class="text-3xl font-black text-white/50">R$ 0,00</h5>`;