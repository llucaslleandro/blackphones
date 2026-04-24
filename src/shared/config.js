/**
 * CONFIGURAÇÃO WHITE LABEL - Altere aqui para customizar para cada cliente
 * Basta duplicar este arquivo e ajustar os valores para replicar a aplicação
 */

export const CONFIG = {
  // Identidade da Loja
  storeName: 'Black Phones',
  nome_lojista: 'Júlio', // Nome para saudação personalizada no dashboard
  storeLogo: 'assets/images/black-logo2.png', // Logo da loja (usada no onboarding)
  storeTagline: 'Encontre o celular ideal para você',

  // Cores da Marca
  colors: {
    primary: '#222222',        // Azul - cor principal (botões, headers)
    primaryLight: '#00ff37',   // Azul claro - para degradês
    secondary: '#374151',      // Cinza - cor secundária
    accent: '#f59e0b',         // Amarelo - destaque
    success: '#22c55e',        // Verde - sucesso
    error: '#ef4444',          // Vermelho - erro
    warning: '#eab308',        // Amarelo - aviso
  },

  // WhatsApp
  whatsappNumber: '5579999662466', // sem +

  // Parcelamento (Simulador no carrinho)
  installment: {
    interestRatePerInstallment: 0.03, // 3% por parcela (juros simples)
    defaultInstallments: 10,
    maxInstallments: 21
  },

  // Dashboard Setup
  dashboard: {
    user: 'admin',
    pass: '1234'
  },

  // Google Apps Script API
  apiBaseUrl: 'https://script.google.com/macros/s/AKfycbzOhX96lX1wVWsF_TTccOQWwCFrlUl1V1Kzc2bx7fTa4BSe885HoifGBC3ynuDR9YK6/exec',

  // Banners do Carrossel
  // Para Desktop: tamanho recomendado 1200x400px (proporção 3:1)
  // Para Mobile (Opcional): tamanho recomendado 600x600px (Formato Quadrado 1:1)
  // Se "imageMobile" não for enviada, a de desktop é usada em todas as telas
  banners: [
    { image: 'assets/images/banner1.png', imageMobile: 'assets/images/banner1-teste.png', alt: 'Ofertas Especiais' },
    { image: 'assets/images/banner2.png', imageMobile: 'assets/images/banner2-mobile.png', alt: 'Novidades' },
    { image: 'assets/images/banner3.png', imageMobile: 'assets/images/banner3-mobile.png', alt: 'Frete Grátis' },
  ],

  // Intervalo de rotação dos banners em ms (padrão: 5 segundos)
  bannerInterval: 5000,
};

export function applyTheme() {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', CONFIG.colors.primary);
  root.style.setProperty('--color-primary-light', CONFIG.colors.primaryLight);
  root.style.setProperty('--color-secondary', CONFIG.colors.secondary);
  root.style.setProperty('--color-accent', CONFIG.colors.accent);
  root.style.setProperty('--color-success', CONFIG.colors.success);
  root.style.setProperty('--color-error', CONFIG.colors.error);
  root.style.setProperty('--color-warning', CONFIG.colors.warning);
}
