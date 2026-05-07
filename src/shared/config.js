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
  whatsappContacts: [
    {
      name: 'Júlio',
      phone: '5579999662466',
      avatar: 'assets/images/avatar-julio.png',
      message: 'Olá! Vim pela vitrine da Black Phones e quero ajuda para escolher um celular.'
    },
    {
      name: 'Rony',
      phone: '5579981188632',
      avatar: 'assets/images/avatar-rony.png',
      message: 'Olá! Vim pela vitrine da Black Phones e quero ajuda para escolher um celular.'
    }
  ],

  // Parcelamento (Simulador no carrinho)
  // Taxas fixas da maquininha por número de parcelas (em %)
  installment: {
    defaultInstallments: 10,
    taxas: {
      1: 3.99,
      2: 5.52,
      3: 6.26,
      4: 7.00,
      5: 7.74,
      6: 8.48,
      7: 9.49,
      8: 10.23,
      9: 10.97,
      10: 11.71,
      11: 12.45,
      12: 13.19,
      13: 14.71,
      14: 15.45,
      15: 16.19,
      16: 16.93,
      17: 17.67,
      18: 18.41,
      19: 19.15,
      20: 19.89,
      21: 20.63,
    }
  },

  // Dashboard Setup
  dashboard: {
    user: 'admin',
    pass: '1234'
  },

  // Google Apps Script API
  apiBaseUrl: 'https://script.google.com/macros/s/AKfycbwab4AKUJzIdl5C6BMcMsezO6VBMEH2rryH6Ze79kKasg0pEnlJuG0mx9DBHEgtEhwv/exec',

  // Banners do Carrossel
  // Para Desktop: tamanho recomendado 1200x400px (proporção 3:1)
  // Para Mobile (Opcional): tamanho recomendado 600x600px (Formato Quadrado 1:1)
  // Se "imageMobile" não for enviada, a de desktop é usada em todas as telas
  banners: [
    { image: 'assets/images/01 (DESKTOP).png', imageMobile: 'assets/images/01 (MOBILE).png', alt: '' },
    { image: 'assets/images/02 (DESKTOP).png', imageMobile: 'assets/images/02 (MOBILE).png', alt: '' },
    { image: 'assets/images/03 (DESKTOP).png', imageMobile: 'assets/images/03 (MOBILE).png', alt: '' },
    { image: 'assets/images/04 (DESKTOP).png', imageMobile: 'assets/images/04 (MOBILE).png', alt: '' },
    { image: 'assets/images/05 (DESKTOP).png', imageMobile: 'assets/images/05 (MOBILE).png', alt: '' },
    { image: 'assets/images/06 (DESKTOP).png', imageMobile: 'assets/images/06 (MOBILE).png', alt: '', mobileOnly: true },
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
