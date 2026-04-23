import { 
  store, 
  CLICKS_KEY, 
  PRODUTOS_CACHE_KEY, 
  CACHE_TTL, 
  ONBOARDING_KEY 
} from './store.js';

export function carregarClicksLocalStorage() {
  try {
    const json = localStorage.getItem(CLICKS_KEY);
    return json ? JSON.parse(json) : {};
  } catch (e) { return {}; }
}

export function salvarClicksLocalStorage() {
  localStorage.setItem(CLICKS_KEY, JSON.stringify(store.produtoClicks));
}

// === Cache de produtos no localStorage ===
export function salvarCacheProdutos(data) {
  try {
    localStorage.setItem(PRODUTOS_CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      data: data
    }));
  } catch (e) { /* quota excedida */ }
}

export function carregarCacheProdutos() {
  try {
    if (!cacheValido()) return null;
    const json = localStorage.getItem(PRODUTOS_CACHE_KEY);
    if (!json) return null;
    const cache = JSON.parse(json);
    return cache.data || null;
  } catch (e) { return null; }
}

export function cacheValido() {
  try {
    // Salvaguarda de desenvolvimento: sempre buscar dados novos em localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return false;
    }

    const json = localStorage.getItem(PRODUTOS_CACHE_KEY);
    if (!json) return false;
    const cache = JSON.parse(json);
    if (!cache || !cache.timestamp) return false;
    
    return (Date.now() - cache.timestamp) < CACHE_TTL;
  } catch (e) { return false; }
}

export function formatarMoedaBRL(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

export function extrairNumero(str) {
  if (!str) return 0;
  const match = String(str).match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

export function getUniqueValues(arr, key) {
  return [...new Set(arr.map(item => item[key]).filter(Boolean))];
}

// ===== Sistema de Onboarding =====
export function isFirstVisit() {
  return !localStorage.getItem(ONBOARDING_KEY);
}

export function markOnboardingComplete() {
  localStorage.setItem(ONBOARDING_KEY, JSON.stringify({
    completedAt: Date.now(),
    version: 1
  }));
}
