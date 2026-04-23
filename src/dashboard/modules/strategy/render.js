import * as templates from './templates.js';

/**
 * Carefully renders the strategic diagnostics dynamically by targeting specific DOM elements.
 * This is the ONLY file in this component aware of the HTML element IDs.
 */
export function renderDiagnostics(diagnostics) {
  const updateDOM = (id, html) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  };
  
  updateDOM('analise-prioridade', templates.getPrioridadeHtml(diagnostics.prioridade));
  updateDOM('analise-dinheiro', templates.getDinheiroRapidoHtml(diagnostics.dinheiroRapido));
  updateDOM('analise-saude-funil', templates.getFunilHtml(diagnostics.funil));
  updateDOM('analise-visao-geral', templates.getVisaoGeralHtml(diagnostics.visaoGeral));
  updateDOM('analise-comportamento', templates.getComportamentoHtml(diagnostics.comportamento));
  updateDOM('analise-desempenho', templates.getDesempenhoHtml(diagnostics.desempenho));
  updateDOM('analise-problemas', templates.getProblemasHtml(diagnostics.problemas));
  updateDOM('analise-oportunidades', templates.getOportunidadesHtml(diagnostics.oportunidades));
  updateDOM('analise-acoes', templates.getAcoesHtml(diagnostics.acoes));
}

/**
 * Handles the fallback state when there are not enough filtered orders to analyze.
 */
export function renderEmptyState() {
  const updateDOM = (id, html) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  };

  updateDOM('analise-prioridade', templates.getEmptyPrioridadeHtml());
  updateDOM('analise-dinheiro', templates.getEmptyDinheiroHtml());
  updateDOM('analise-saude-funil', '');
  
  const generalContainers = [
    'analise-visao-geral', 'analise-comportamento', 'analise-desempenho', 
    'analise-problemas', 'analise-oportunidades', 'analise-acoes'
  ];
  const emptyMessage = templates.getEmptyStateHtml();

  generalContainers.forEach(id => updateDOM(id, emptyMessage));
}
