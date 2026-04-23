/**
 * Onboarding Module
 * Uses Driver.js to provide a guided tour of the dashboard.
 * Synced with storefront UI for brand consistency.
 */

import { CONFIG } from '../../shared/config.js';

const STORAGE_KEY = 'dashboard_onboarding_done';

/**
 * Initializes the onboarding process.
 */
export function initOnboarding() {
  const isDone = localStorage.getItem(STORAGE_KEY);

  // Setup manual restart button
  const btnTutorial = document.getElementById('btn-tutorial');
  if (btnTutorial) {
    btnTutorial.addEventListener('click', () => {
      startOnboarding(true);
    });
  }

  if (!isDone) {
    setTimeout(() => {
      createWelcomeOverlay();
    }, 1500);
  }
}

/**
 * Creates the welcome overlay modal.
 */
function createWelcomeOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'onboarding-welcome-overlay';
  overlay.id = 'onboarding-welcome';
  overlay.innerHTML = `
    <div class="onboarding-welcome-card">
      <div class="onb-icon">
        <img src="${CONFIG.storeLogo.startsWith('http') || CONFIG.storeLogo.startsWith('/') ? CONFIG.storeLogo : '../../' + CONFIG.storeLogo}" alt="${CONFIG.storeName}" style="width:100%;height:100%;object-fit:cover;">
      </div>
      <h2>Bem-vindo ao Painel!</h2>
      <p>Gerencie sua loja ${CONFIG.storeName} com facilidade. Vamos te mostrar as principais ferramentas.</p>

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
    setTimeout(() => startOnboarding(false), 400);
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

function markOnboardingComplete() {
  localStorage.setItem(STORAGE_KEY, 'true');
}

/**
 * Starts the guided tour.
 */
export function startOnboarding(manual = false) {
  if (typeof window.driver === 'undefined') {
    console.error('Driver.js not loaded');
    return;
  }

  const driverObj = window.driver.js.driver({
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
      if (!manual) markOnboardingComplete();
    },
    steps: [
      {
        element: '#tab-btn-geral',
        popover: {
          title: '📊 Navegação Principal',
          description: 'Navegue entre as áreas do seu negócio aqui. Visualize o painel geral, análise estratégica com IA ou gerencie o estoque.',
          side: "bottom",
          align: 'start'
        }
      },
      {
        element: '#tab-geral .glass-card.border-green-200',
        popover: {
          title: '💰 Acompanhe seu Faturamento',
          description: 'Veja seu faturamento e lucro líquido em tempo real. As métricas são calculadas automaticamente com base nos seus pedidos.',
          side: "bottom",
          align: 'center'
        }
      },
      {
        element: '.glass-card.rounded-2xl.shadow-sm.overflow-hidden table',
        popover: {
          title: '📋 Histórico de Pedidos',
          description: 'Acompanhe todos os pedidos realizados. Você pode filtrar por período, marca ou status diretamente aqui.',
          side: "top",
          align: 'center'
        }
      },
      {
        element: '#orders-table-body .status-select',
        popover: {
          title: '⚡ Gerenciar Status',
          description: 'Clique no status para fechar o pedido ou negociar o valor. Ao fechar um pedido, o estoque é atualizado instantaneamente.',
          side: "left",
          align: 'center'
        }
      },
      {
        element: '#tab-btn-estrategia',
        popover: {
          title: '🧠 Análise Estratégica',
          description: 'Visualize insights gerados por IA para recuperar vendas e otimizar seus lucros.',
          side: "bottom",
          align: 'center'
        },
        onHighlightStarted: () => {
          document.getElementById('tab-btn-estrategia')?.click();
        }
      },
      {
        element: '#tab-btn-estoque',
        popover: {
          title: '📦 Gerenciar Estoque',
          description: 'Controle toda a disponibilidade do seu catálogo e acompanhe os indicadores de giro.',
          side: "bottom",
          align: 'center'
        },
        onHighlightStarted: () => {
          document.getElementById('tab-btn-estoque')?.click();
        }
      },
      {
        element: '#tab-estoque thead th:nth-child(4)',
        popover: {
          title: '📊 Giro (Dias)',
          description: 'Indica há quanto tempo o produto está parado. Números altos sugerem que o item precisa de promoção ou queima de estoque.',
          side: "bottom",
          align: 'center'
        }
      },
      {
        element: '#tab-estoque thead th:nth-child(5)',
        popover: {
          title: '⚠️ Mínimo',
          description: 'Configure o alerta de reposição. Quando o estoque chegar neste valor, o sistema avisará que há "Poucas Unidades".',
          side: "bottom",
          align: 'center'
        }
      },
      {
        element: '#tab-estoque thead th:nth-child(6)',
        popover: {
          title: '📦 Estoque Atual',
          description: 'A contagem física real. Mantenha este valor sempre atualizado para evitar vendas de itens indisponíveis.',
          side: "bottom",
          align: 'center'
        }
      },
      {
        element: '#tab-estoque thead th:nth-child(7)',
        popover: {
          title: '🚦 Status',
          description: 'Status automático do item baseado no estoque atual e no mínimo configurado.',
          side: "bottom",
          align: 'center'
        }
      },
      {
        element: '#tab-estoque thead th:nth-child(8)',
        popover: {
          title: '⚙️ Ações',
          description: 'Aqui você pode editar detalhes do produto ou removê-lo definitivamente do catálogo.',
          side: "left",
          align: 'center'
        }
      },
      {
        element: '#btn-add-produto',
        popover: {
          title: '➕ Adicionar Produto',
          description: 'Use este botão para cadastrar novos aparelhos ou variações para expandir seu catálogo rapidamente.',
          side: "left",
          align: 'center'
        }
      }
    ].filter(step => document.querySelector(step.element) !== null)
  });

  driverObj.drive();
}
