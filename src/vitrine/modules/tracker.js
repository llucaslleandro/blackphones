/**
 * Vendly — Storefront Event Tracker
 * Lightweight analytics module. Tracks visits, product views, clicks,
 * WhatsApp opens and messages. Sends events to Apps Script which stores
 * them in the "Métricas" Google Sheet.
 */
import { CONFIG } from '../../shared/config.js';

// ===== Session Management =====
const SESSION_KEY = 'vendly_session_id';

function getSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : generateUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

const SESSION_ID = getSessionId();

// ===== Core Event Emitter =====
function trackEvent(tipo, data = {}) {
  const now = new Date();
  // Format in local timezone (Brasília GMT-3) instead of UTC
  const pad = (n) => String(n).padStart(2, '0');
  const localTs = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const payload = {
    tipo,
    timestamp: localTs,
    session_id: SESSION_ID,
    produto: data.produto || '',
    origem: window.location.href,
    metadata: data.metadata ? JSON.stringify(data.metadata) : ''
  };

  // Fire-and-forget POST — never block the UI
  fetch(`${CONFIG.apiBaseUrl}?action=registrar_evento`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  }).catch(() => { /* silent fail — analytics should never break UX */ });
}

// ===== Public Tracking Helpers =====

/** Called when the product detail modal opens */
export function trackProductView(produto) {
  if (!produto) return;
  const nome = [produto.nome, produto.cor, produto.armazenamento].filter(Boolean).join(' - ');
  trackEvent('visita_produto', {
    produto: nome,
    metadata: { sku: produto.sku || produto.id || '' }
  });
}

/** Called when user adds a product to cart (explicit interest click) */
export function trackProductClick(produto) {
  if (!produto) return;
  const nome = [produto.nome, produto.cor, produto.armazenamento].filter(Boolean).join(' - ');
  trackEvent('clique_produto', {
    produto: nome,
    metadata: { sku: produto.sku || produto.id || '' }
  });
}

/** Called when user opens WhatsApp (finalizarPedido) */
export function trackWhatsAppClick(itens) {
  const nomes = (itens || []).map(i => i.nome || '').join(', ');
  trackEvent('clique_whatsapp', { produto: nomes });
}

/** Called right after WhatsApp message window opens */
export function trackMessageSent(itens) {
  const nomes = (itens || []).map(i => i.nome || '').join(', ');
  trackEvent('mensagem_enviada', {
    produto: nomes,
    metadata: { qtd_itens: itens ? itens.length : 0 }
  });
}

// ===== Auto-tracked: Page Visit (once) =====
trackEvent('visita_vitrine');

// ===== Heartbeat (20s interval, throttled, single interval) =====
const HEARTBEAT_MS = 20000;
let heartbeatInterval = null;
let ultimoHeartbeat = 0;

function enviarHeartbeat() {
  const agora = Date.now();
  if (agora - ultimoHeartbeat < HEARTBEAT_MS) return;
  ultimoHeartbeat = agora;
  trackEvent('heartbeat');
}

function iniciarHeartbeat() {
  if (heartbeatInterval) return; // never create a second interval

  heartbeatInterval = setInterval(() => {
    if (!document.hidden) {
      enviarHeartbeat();
    }
  }, HEARTBEAT_MS);
}

// On tab return, send a throttled heartbeat (no new interval)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    enviarHeartbeat();
  }
});

// Start once
enviarHeartbeat();
iniciarHeartbeat();
