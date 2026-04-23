/**
 * Vendly Dashboard — Métricas Module
 * Fetches events from Apps Script (server-side filtered by period),
 * computes aggregated metrics, and renders them into the Métricas tab.
 */
import { CONFIG } from '../../shared/config.js';

// ===== Data Fetching =====

/**
 * Fetch metrics events from backend, filtered by period server-side.
 * @param {string} periodo - 'hoje' | 'ontem' | '7d' | '14d' | '30d' | 'max'
 * @returns {Promise<Array>}
 */
async function fetchMetricas(periodo = 'hoje') {
  const url = `${CONFIG.apiBaseUrl}?action=metricas&periodo=${periodo}&_t=${Date.now()}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Erro na rede.');
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Erro da API.');
  return json.data || [];
}

// ===== Aggregation =====

function computeMetrics(events) {
  const counts = {
    visita_vitrine: 0,
    visita_produto: 0,
    clique_produto: 0,
    clique_whatsapp: 0,
    mensagem_enviada: 0,
    heartbeat: 0
  };

  const uniqueSessions = new Set();
  const productViews = {};   // produto -> count
  const productClicks = {};  // produto -> count
  const productWhatsApp = {}; // produto -> count
  const heartbeatSessions = {}; // session_id -> last timestamp

  const now = new Date();

  events.forEach(ev => {
    const tipo = String(ev.tipo || '').toLowerCase();
    if (counts.hasOwnProperty(tipo)) counts[tipo]++;

    const sessionId = String(ev.session_id || '');
    if (sessionId) uniqueSessions.add(sessionId);

    const produto = String(ev.produto || '').trim();

    if (tipo === 'visita_produto' && produto) {
      productViews[produto] = (productViews[produto] || 0) + 1;
    }
    if (tipo === 'clique_produto' && produto) {
      productClicks[produto] = (productClicks[produto] || 0) + 1;
    }
    if (tipo === 'clique_whatsapp' && produto) {
      productWhatsApp[produto] = (productWhatsApp[produto] || 0) + 1;
    }

    if (tipo === 'heartbeat' && sessionId) {
      const ts = new Date(ev.timestamp);
      if (!isNaN(ts.getTime())) {
        if (!heartbeatSessions[sessionId] || ts > heartbeatSessions[sessionId]) {
          heartbeatSessions[sessionId] = ts;
        }
      }
    }
  });

  // Active visitors: sessions with heartbeat in last 90 seconds
  const ACTIVE_THRESHOLD = 90 * 1000;
  let activeNow = 0;
  Object.values(heartbeatSessions).forEach(lastBeat => {
    if ((now - lastBeat) <= ACTIVE_THRESHOLD) activeNow++;
  });

  // Conversion rates
  const visitas = counts.visita_vitrine || 0;
  const cliques = counts.clique_produto || 0;
  const mensagens = counts.mensagem_enviada || 0;
  const taxaClique = visitas > 0 ? ((cliques / visitas) * 100) : 0;
  const taxaMensagem = cliques > 0 ? ((mensagens / cliques) * 100) : 0;

  // Top product lists (sorted desc, top 5)
  const sortDesc = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topVistos = sortDesc(productViews);
  const topClicados = sortDesc(productClicks);
  const topWhatsApp = sortDesc(productWhatsApp);

  return {
    visitas,
    unicos: uniqueSessions.size,
    ativos: activeNow,
    mensagens,
    cliquesProducto: cliques,
    cliquesWhatsApp: counts.clique_whatsapp,
    taxaClique,
    taxaMensagem,
    topVistos,
    topClicados,
    topWhatsApp,
    recentEvents: events
      .filter(e => e.tipo !== 'heartbeat')
      .slice(-20)
      .reverse()
  };
}

// ===== Rendering =====

function renderRankingList(containerId, items, color = 'gray') {
  const ul = document.getElementById(containerId);
  if (!ul) return;

  if (!items.length) {
    ul.innerHTML = `<li class="text-xs text-gray-400 italic py-2">Sem dados no período.</li>`;
    return;
  }

  const maxVal = items[0][1];
  ul.innerHTML = items.map(([name, count], idx) => {
    const pct = maxVal > 0 ? (count / maxVal) * 100 : 0;
    return `
      <li class="flex items-center gap-3">
        <span class="text-[10px] font-black text-gray-400 w-4 text-right">${idx + 1}</span>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-bold text-gray-800 truncate">${name}</span>
            <span class="text-[10px] font-black text-${color}-600 ml-2 shrink-0">${count}</span>
          </div>
          <div class="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div class="h-full bg-${color}-500 rounded-full transition-all" style="width:${pct}%"></div>
          </div>
        </div>
      </li>
    `;
  }).join('');
}

const EVENT_ICONS = {
  visita_vitrine:   { icon: 'fa-eye',          color: 'purple' },
  visita_produto:   { icon: 'fa-mobile-screen', color: 'blue' },
  clique_produto:   { icon: 'fa-hand-pointer',  color: 'indigo' },
  clique_whatsapp:  { icon: 'fa-brands fa-whatsapp', color: 'green' },
  mensagem_enviada: { icon: 'fa-paper-plane',   color: 'emerald' }
};

function renderActivityLog(events) {
  const container = document.getElementById('met-atividade');
  if (!container) return;

  if (!events.length) {
    container.innerHTML = `<p class="text-xs text-gray-400 italic py-4 text-center">Nenhuma atividade recente.</p>`;
    return;
  }

  container.innerHTML = events.map(ev => {
    const tipo = String(ev.tipo || '');
    const meta = EVENT_ICONS[tipo] || { icon: 'fa-circle', color: 'gray' };
    const produto = ev.produto ? `<span class="font-bold text-gray-700">${ev.produto}</span>` : '';
    const ts = ev.timestamp ? formatTimeAgo(new Date(ev.timestamp)) : '';

    const labels = {
      visita_vitrine: 'Visitou a vitrine',
      visita_produto: `Visualizou ${produto}`,
      clique_produto: `Clicou em ${produto}`,
      clique_whatsapp: `Abriu WhatsApp: ${produto}`,
      mensagem_enviada: `Mensagem enviada: ${produto}`
    };

    return `
      <div class="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
        <div class="w-8 h-8 rounded-full bg-${meta.color}-50 text-${meta.color}-500 flex items-center justify-center shrink-0 mt-0.5">
          <i class="fa-solid ${meta.icon} text-[10px]"></i>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-xs text-gray-600 leading-relaxed">${labels[tipo] || tipo}</p>
          <p class="text-[10px] text-gray-400 mt-0.5">${ts}</p>
        </div>
      </div>
    `;
  }).join('');
}

function formatTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);

  if (diffMin < 1) return 'agora mesmo';
  if (diffMin < 60) return `há ${diffMin} min`;
  if (diffHr < 24) return `há ${diffHr}h`;

  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function renderMetricsData(metrics) {
  // Stat cards
  document.getElementById('met-visitas').textContent = metrics.visitas.toLocaleString('pt-BR');
  document.getElementById('met-unicos').textContent = metrics.unicos.toLocaleString('pt-BR');
  document.getElementById('met-ativos').textContent = metrics.ativos.toLocaleString('pt-BR');
  document.getElementById('met-mensagens').textContent = metrics.mensagens.toLocaleString('pt-BR');

  // Engagement counters
  document.getElementById('met-cliques-produto').textContent = metrics.cliquesProducto.toLocaleString('pt-BR');
  document.getElementById('met-cliques-whatsapp').textContent = metrics.cliquesWhatsApp.toLocaleString('pt-BR');

  // Conversion funnels
  document.getElementById('met-taxa-clique').textContent = metrics.taxaClique.toFixed(1).replace('.', ',') + '%';
  document.getElementById('met-taxa-mensagem').textContent = metrics.taxaMensagem.toFixed(1).replace('.', ',') + '%';

  // Rankings
  renderRankingList('met-top-vistos', metrics.topVistos, 'purple');
  renderRankingList('met-top-clicados', metrics.topClicados, 'indigo');
  renderRankingList('met-top-whatsapp', metrics.topWhatsApp, 'green');

  // Activity log
  renderActivityLog(metrics.recentEvents);
}

// ===== Public API =====

/**
 * Full render: fetch + compute + render the Métricas tab.
 * Called when the tab is activated or period changes.
 */
export async function renderMetricas(periodo) {
  const loading = document.getElementById('metricas-loading');
  const content = document.getElementById('metricas-content');
  const empty = document.getElementById('metricas-empty');

  if (!periodo) {
    periodo = document.getElementById('metricas-period')?.value || 'hoje';
  }

  loading?.classList.remove('hidden');
  content?.classList.add('hidden');
  empty?.classList.add('hidden');

  try {
    const events = await fetchMetricas(periodo);

    if (!events.length) {
      loading?.classList.add('hidden');
      empty?.classList.remove('hidden');
      return;
    }

    const metrics = computeMetrics(events);
    renderMetricsData(metrics);

    loading?.classList.add('hidden');
    content?.classList.remove('hidden');
  } catch (err) {
    console.error('Erro ao carregar métricas:', err);
    loading?.classList.add('hidden');
    empty?.classList.remove('hidden');
  }
}

/**
 * Lightweight refresh: only updates the "Ativos Agora" counter
 * without full re-render. Always fetches 'hoje' for live data.
 */
export async function refreshActiveCount() {
  try {
    const events = await fetchMetricas('hoje');
    const now = new Date();
    const ACTIVE_THRESHOLD = 90 * 1000;
    const heartbeatSessions = {};

    events.forEach(ev => {
      if (String(ev.tipo).toLowerCase() === 'heartbeat' && ev.session_id) {
        const ts = new Date(ev.timestamp);
        if (!isNaN(ts.getTime())) {
          if (!heartbeatSessions[ev.session_id] || ts > heartbeatSessions[ev.session_id]) {
            heartbeatSessions[ev.session_id] = ts;
          }
        }
      }
    });

    let active = 0;
    Object.values(heartbeatSessions).forEach(lastBeat => {
      if ((now - lastBeat) <= ACTIVE_THRESHOLD) active++;
    });

    const el = document.getElementById('met-ativos');
    if (el) el.textContent = active.toLocaleString('pt-BR');
  } catch { /* silent */ }
}
