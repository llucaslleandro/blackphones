export const store = {
  produtos: [],
  carrinho: [],
  comparacao: [],
  // Variáveis de estado do modal de produtos
  modalVariacoes: [],
  selColor: '',
  selStorage: '',
  selCondition: '',
  currentTargetId: '',
  // Clicks e popularidade
  produtoClicks: {},
  // Vendas reais (status="Fechado")
  vendasProduto: {}
};

// Keys para cache/localstorage (anteriormente em utils.js)
export const CARRINHO_KEY = 'catalogo_cart_v2';
export const PRODUTOS_CACHE_KEY = 'catalogo_produtos_cache_v3';
export const CACHE_TTL = 5 * 60 * 1000;
export const CLICKS_KEY = 'catalogo_clicks_v2';
export const ONBOARDING_KEY = 'catalogo_onboarding_v2';
