import { CONFIG } from '../../shared/config.js';
import { store } from '../../shared/modules/store.js';
import { isFirstVisit, markOnboardingComplete } from '../../shared/modules/utils.js';

export const elements = {
  storeName: document.getElementById('store-name'),
  searchInput: document.getElementById('search-input'),
  categorySelect: document.getElementById('category-select'),
  conditionSelect: document.getElementById('condition-select'),
  productsGrid: document.getElementById('products-grid'),
  cartBadge: document.getElementById('cart-badge'),
  cartPanel: document.getElementById('cart-panel'),
  cartItems: document.getElementById('cart-items'),
  totalValue: document.getElementById('total-value'),
  installmentValue: document.getElementById('installment-value'),
  btnOpenCart: document.getElementById('btn-open-cart'),
  btnCloseCart: document.getElementById('close-cart'),
  overlay: document.getElementById('overlay'),
  loading: document.getElementById('loading'),
  errorMessage: document.getElementById('error-message'),
  emptyMessage: document.getElementById('empty-message'),
  checkoutForm: document.getElementById('checkout-form'),
  sortSelect: document.getElementById('sort-select'),
  btnCompare: document.getElementById('btn-compare'),
  compareCount: document.getElementById('compare-count'),
  compareModal: document.getElementById('compare-modal'),
  compareContent: document.getElementById('compare-content'),
  closeCompare: document.getElementById('close-compare'),
  nameField: document.getElementById('customer-name'),
  phoneField: document.getElementById('customer-phone'),
  deliveryType: document.getElementById('delivery-type'),
  addressField: document.getElementById('address'),
  notesField: document.getElementById('notes'),
  finalizeButton: document.getElementById('finalize-order'),
  clearCartButton: document.getElementById('clear-cart'),
  checkoutMsg: document.getElementById('checkout-msg')
};

// Configuração imediata do cabeçalho
if (elements.storeName) elements.storeName.textContent = CONFIG.storeName;
const storeTagline = document.getElementById('store-tagline');
if (storeTagline) storeTagline.textContent = CONFIG.storeTagline;

export function showElement(el) { el.classList.remove('hidden'); }
export function hideElement(el) { if (!el.classList.contains('hidden')) el.classList.add('hidden'); }

export function openCart() {
  elements.cartPanel.style.display = 'flex';
  elements.overlay.classList.remove('hidden');
  elements.overlay.style.zIndex = '998';
  const title = elements.cartPanel.querySelector('h3');
  if (title) title.style.display = 'block';
}

export function closeCart() {
  elements.cartPanel.style.display = 'none';
  elements.overlay.classList.add('hidden');
  const title = elements.cartPanel.querySelector('h3');
  if (title) title.style.display = 'none';
}

export function setError(message) {
  elements.errorMessage.textContent = message;
  showElement(elements.errorMessage);
}

export function setMessage(type, message) {
  const styles = {
    success: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
    warning: 'bg-yellow-100 text-yellow-900'
  };

  elements.checkoutMsg.textContent = message;
  elements.checkoutMsg.className = `mt-3 text-sm p-2 rounded ${styles[type] || ''}`;
}

export function aplicarAnimacaoAdicao(button) {
  button.classList.add('animate-pulse');
  setTimeout(() => button.classList.remove('animate-pulse'), 400);
}

const NOMES_FICTICIOS = [
  'João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa',
  'Lucas Souza', 'Juliana Lima', 'Rafael Pereira', 'Camila Rodrigues',
  'Bruno Almeida', 'Fernanda Martins', 'Gabriel Ferreira', 'Larissa Gomes',
  'Mateus Ribeiro', 'Amanda Carvalho', 'Thiago Araújo', 'Beatriz Nascimento',
  'Diego Barbosa', 'Isabela Rocha', 'Felipe Correia', 'Carolina Mendes'
];

const CIDADES = [
  'Lagarto', 'Colônia 13', 'Simão Dias', 'Boquim',
  'Salvador', 'Salgado', 'São Domingos', 'Areia Branca',
  'Riachão do Dantas', 'Itabaiana', 'Simão Dias', 'Aracaju',
  'Riachuelo', 'Nossa Senhora da Glória', 'Poço Verde', 'Paripiranga',
  'Poço Redondo', 'Canindé de São Francisco', 'Pinhão', 'Tomar do Geru'
];

function criarPopupContainer() {
  const container = document.createElement('div');
  container.id = 'social-proof-popup';
  container.style.cssText = `
    position: fixed;
    top: 80px;
    left: 16px;
    z-index: 900;
    pointer-events: none;
    max-width: 340px;
    width: calc(100% - 32px);
  `;
  document.body.appendChild(container);
  return container;
}

function mostrarPopupSocial() {
  if (!store.produtos.length) return;

  const container = document.getElementById('social-proof-popup') || criarPopupContainer();
  const produtoAleatorio = store.produtos[Math.floor(Math.random() * store.produtos.length)];
  const nomeAleatorio = NOMES_FICTICIOS[Math.floor(Math.random() * NOMES_FICTICIOS.length)];
  const cidadeAleatoria = CIDADES[Math.floor(Math.random() * CIDADES.length)];
  const minutosAtras = Math.floor(Math.random() * 15) + 1;

  const popup = document.createElement('div');
  popup.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 12px 16px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
    border: 1px solid #f0f0f0;
    display: flex;
    align-items: center;
    gap: 12px;
    transform: translateX(-120%);
    opacity: 0;
    transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    pointer-events: auto;
    cursor: default;
  `;

  popup.innerHTML = `
    <div style="width:40px;height:40px;border-radius:8px;overflow:hidden;flex-shrink:0;background:#f5f5f5;">
      <img src="${produtoAleatorio.imagem}" style="width:100%;height:100%;object-fit:contain;" alt="">
    </div>
    <div style="flex:1;min-width:0;">
      <p style="font-size:12px;font-weight:600;color:#111;margin:0;line-height:1.3;">${nomeAleatorio}</p>
      <p style="font-size:11px;color:#666;margin:2px 0 0;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">comprou <strong>${produtoAleatorio.nome}</strong></p>
      <p style="font-size:10px;color:#999;margin:2px 0 0;">${cidadeAleatoria} • há ${minutosAtras} min</p>
    </div>
  `;

  container.innerHTML = '';
  container.appendChild(popup);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      popup.style.transform = 'translateX(0)';
      popup.style.opacity = '1';
    });
  });

  setTimeout(() => {
    popup.style.transform = 'translateX(-120%)';
    popup.style.opacity = '0';
  }, 4000);
}

export function iniciarPopupsSociais() {
  setTimeout(() => {
    mostrarPopupSocial();
    setInterval(mostrarPopupSocial, 180000);
  }, 5000);
}

// ===== Sistema de Onboarding =====
function createWelcomeOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'onboarding-welcome-overlay';
  overlay.id = 'onboarding-welcome';
  overlay.innerHTML = `
    <div class="onboarding-welcome-card">
      <div class="onb-icon" style="overflow:hidden;">
        <img src="${CONFIG.storeLogo}" alt="${CONFIG.storeName}" style="width:100%;height:100%;object-fit:contain;">
      </div>
      <h2>Bem-vindo à ${CONFIG.storeName}!</h2>
      <p>Descubra como encontrar o celular perfeito para você em poucos passos.</p>
      <button class="onb-btn-primary" id="onb-start-tour">
        Começar Tour Guiado
      </button>
      <button class="onb-btn-secondary" id="onb-skip">
        Pular, já conheço
      </button>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('onb-start-tour').addEventListener('click', () => {
    closeWelcomeOverlay();
    setTimeout(() => startOnboardingTour(), 400);
  });

  document.getElementById('onb-skip').addEventListener('click', () => {
    closeWelcomeOverlay();
    markOnboardingComplete();
  });
}

function closeWelcomeOverlay() {
  const overlay = document.getElementById('onboarding-welcome');
  if (!overlay) return;
  overlay.style.opacity = '0';
  overlay.style.transition = 'opacity 0.3s ease';
  setTimeout(() => overlay.remove(), 300);
}

function startOnboardingTour() {
  const catalogSection = document.getElementById('catalog-section');
  if (catalogSection) {
    const headerOffset = 80;
    const elementPosition = catalogSection.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: elementPosition - headerOffset, behavior: 'smooth' });
  }

  setTimeout(() => {
    const driverInstance = window.driver.js.driver;

    const tourDriver = driverInstance({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      animate: true,
      overlayColor: 'rgba(0, 0, 0, 0.6)',
      stagePadding: 12,
      stageRadius: 12,
      allowClose: true,
      popoverOffset: 16,
      progressText: '{{current}} de {{total}}',
      nextBtnText: 'Próximo →',
      prevBtnText: '← Anterior',
      doneBtnText: 'Finalizar ✓',
      onDestroyed: () => {
        markOnboardingComplete();
      },
      steps: [
        {
          element: '#search-input',
          popover: {
            title: '🔍 Pesquisar produtos',
            description: 'Digite o nome do celular que procura e os resultados são filtrados em tempo real.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#category-select',
          popover: {
            title: '📂 Filtro por Categoria',
            description: 'Selecione uma marca específica como Apple ou Samsung para ver apenas os modelos dessa marca.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#condition-select',
          popover: {
            title: '✨ Filtro por Condição',
            description: 'Escolha entre celulares <strong>Novos</strong> ou <strong>Seminovos</strong>.',
            side: 'bottom',
            align: 'center'
          }
        },
        {
          element: '#sort-select',
          popover: {
            title: '📊 Ordenação',
            description: 'Ordene os store.produtos por <strong>menor preço</strong>, <strong>maior preço</strong> ou <strong>mais populares</strong>.',
            side: 'bottom',
            align: 'end'
          }
        },
        {
          element: '#products-grid > div:first-child',
          popover: {
            title: '📱 Cartão do Produto',
            description: 'Cada cartão mostra o modelo, especificações e preço. Clique em <strong>"Ver Opções"</strong> para ver detalhes.',
            side: 'left',
            align: 'center'
          }
        },
        {
          element: '#products-grid > div:first-child .compare-card-btn',
          popover: {
            title: '📊 Comparar store.produtos',
            description: 'Clique em <strong>"Comparar"</strong> para adicionar store.produtos à comparação. Compare até 3 celulares lado a lado!',
            side: 'top',
            align: 'center'
          }
        },
        {
          element: '#btn-compare',
          popover: {
            title: '⚖️ Tela de Comparação',
            description: 'Clique para abrir a <strong>tabela de comparação</strong> com análise inteligente.',
            side: 'bottom',
            align: 'end'
          },
          onHighlightStarted: () => {
            const btn = document.getElementById('btn-compare');
            btn.classList.remove('hidden');
            btn.setAttribute('data-tour-shown', 'true');
          },
          onDeselected: () => {
            const btn = document.getElementById('btn-compare');
            if (store.comparacao.length === 0 && btn.getAttribute('data-tour-shown')) {
              btn.classList.add('hidden');
              btn.removeAttribute('data-tour-shown');
            }
          }
        },
        {
          element: '#btn-open-cart',
          popover: {
            title: '🛒 Seu Carrinho',
            description: 'Encontrou o que procura? Clique em <strong>"Eu Quero"</strong> e ele será adicionado aqui.',
            side: 'bottom',
            align: 'end'
          }
        },
        {
          element: '#btn-help-tour',
          popover: {
            title: '❓ Precisa de Ajuda?',
            description: 'A qualquer momento, clique neste botão para rever este tour guiado.',
            side: 'bottom',
            align: 'end'
          }
        }
      ]
    });

    tourDriver.drive();
  }, 600);
}

export function initOnboarding() {
  const helpBtn = document.getElementById('btn-help-tour');
  if (helpBtn) {
    helpBtn.addEventListener('click', () => {
      startOnboardingTour();
    });
  }

  if (isFirstVisit()) {
    setTimeout(() => {
      createWelcomeOverlay();
    }, 1500);
  }
}

