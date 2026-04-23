import { CONFIG, applyTheme } from '../../shared/config.js';

export function checkAuth(isLoginPage) {
  const loggedIn = localStorage.getItem('vendly_dashboard_auth');
  if (isLoginPage) {
    if (loggedIn) window.location.href = 'index.html';
  } else {
    if (!loggedIn) window.location.href = 'login.html';
  }
}

export function showToast(msg, color, icon, isSpin = false) {
  const t = document.getElementById('toast');
  if (!t) return;

  document.getElementById('toast-msg').textContent = msg;
  const icn = document.getElementById('toast-icon');
  icn.className = `fa-solid ${icon} text-${color}-400 ${isSpin ? 'fa-spin' : ''}`;
  t.className = `fixed bottom-4 right-4 bg-gray-900 text-white px-5 py-3 rounded-lg shadow-xl transition-all duration-300 z-50 flex items-center gap-3`;

  if (!isSpin) {
    setTimeout(() => {
      t.className = `fixed bottom-4 right-4 bg-gray-900 text-white px-5 py-3 rounded-lg shadow-xl translate-y-20 opacity-0 transition-all duration-300 z-50 flex items-center gap-3 pointer-events-none`;
    }, 3000);
  }
}

export function toggleLoading(isLoading, isSuccess = false, hasOrders = false) {
  document.getElementById('dashboard-loading')?.classList.toggle('hidden', !isLoading);
  // Show content if success, even if no orders (shows zeroed dashboard)
  document.getElementById('dashboard-content')?.classList.toggle('hidden', isLoading || !isSuccess);
  // Always hide empty state warning as requested
  document.getElementById('dashboard-empty')?.classList.add('hidden');
  document.getElementById('dashboard-error')?.classList.toggle('hidden', isLoading || isSuccess);
}

export function setTab(activeBtn, activeTab, allBtns, allTabs) {
  allBtns.forEach(btn => {
    if (btn) btn.className = 'pb-3 border-b-2 border-transparent font-medium text-gray-500 hover:text-gray-700 transition text-sm focus:outline-none flex items-center gap-2';
  });
  allTabs.forEach(tab => {
    if (tab) tab.classList.add('hidden');
  });

  if (activeBtn) activeBtn.className = 'pb-3 border-b-2 border-gray-900 font-bold text-gray-900 transition text-sm focus:outline-none flex items-center gap-2';
  if (activeTab) activeTab.classList.remove('hidden');
}

// Formatters
export const formatText = (val) => val && val.trim() !== '' ? val : 'N/A';
export const formatMoney = (val) => Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const parseNumber = (val) => { let n = Number(String(val).replace(/[^0-9.-]+/g, "")); return isNaN(n) ? 0 : n; };
export const formatPercent = (val) => {
  const isPos = val >= 0;
  const color = isPos ? 'text-green-500' : 'text-red-500';
  const icon = isPos ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down';
  const sign = isPos ? '+' : '';
  return `<span class="${color} flex items-center gap-1"><i class="fa-solid ${icon}"></i> ${sign}${val.toFixed(1).replace('.', ',')}%</span>`;
};

export async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;

        const MAX = 800;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round((h * MAX) / w); w = MAX; }
          else { w = Math.round((w * MAX) / h); h = MAX; }
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        let quality = 0.85;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > 400000 && quality > 0.3) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Imagem inválida.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo.'));
    reader.readAsDataURL(file);
  });
}

export function updateStoreNames() {
  const loginStoreName = document.getElementById('login-store-name');
  if (loginStoreName) loginStoreName.textContent = CONFIG.storeName;

  const storeNameEl = document.getElementById('store-name');
  if (storeNameEl) storeNameEl.textContent = CONFIG.storeName;
}

/**
 * Updates the personalized greeting on the dashboard.
 */
export function updateGreeting() {
  const greetingTextEl = document.getElementById('greeting-text');
  const greetingIconEl = document.getElementById('greeting-icon');
  if (!greetingTextEl || !greetingIconEl) return;

  const hour = new Date().getHours();
  let salutation = 'Boa noite';
  let icon = 'fa-moon';
  let iconColor = 'text-indigo-600';

  if (hour >= 5 && hour < 12) {
    salutation = 'Bom dia';
    icon = 'fa-sun';
    iconColor = 'text-amber-500';
  } else if (hour >= 12 && hour < 18) {
    salutation = 'Boa tarde';
    icon = 'fa-cloud-sun';
    iconColor = 'text-orange-500';
  }

  const name = CONFIG.nome_lojista || 'Lojista';
  greetingTextEl.textContent = `${salutation}, ${name}!`;
  greetingIconEl.innerHTML = `<i class="fa-solid ${icon} ${iconColor} animate-[bounce_3s_infinite]"></i>`;
}

/**
 * Shows a stacked notification for a new order.
 * @param {Object} order The order object
 */
export function showNotification(order) {
  const container = document.getElementById('notification-container');
  if (!container) return;

  const id = document.createElement('div');
  const orderId = order.id_do_pedido || 'Pedido';
  const productName = order.produto || 'Novo item';
  
  id.className = 'notification-enter bg-white border border-gray-100 rounded-xl shadow-2xl p-4 pointer-events-auto flex gap-4 items-start relative overflow-hidden group cursor-pointer';
  id.innerHTML = `
    <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-600"></div>
    <div class="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
      <i class="fa-solid fa-cart-shopping"></i>
    </div>
    <div class="flex-1 min-w-0">
      <div class="flex justify-between items-start mb-0.5">
        <h4 class="text-sm font-black text-gray-900 leading-tight">Novo Pedido Recebido</h4>
        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">${orderId}</span>
      </div>
      <p class="text-xs text-gray-600 line-clamp-2 leading-relaxed font-medium">
        <span class="text-indigo-600 font-bold">${productName}</span> foi solicitado agora mesmo.
      </p>
      <div class="mt-2 flex items-center gap-2">
        <button class="notification-details-btn text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 transition">Ver Detalhes</button>
      </div>
    </div>
    <button class="notification-close absolute top-2 right-2 text-gray-300 hover:text-gray-500 transition opacity-0 group-hover:opacity-100 p-1">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;

  container.prepend(id);

  const close = () => {
    id.classList.remove('notification-enter');
    id.classList.add('notification-exit');
    setTimeout(() => id.remove(), 800);
  };

  id.querySelector('.notification-close').onclick = (e) => {
    e.stopPropagation();
    close();
  };

  const goToOrders = (e) => {
    e.stopPropagation();
    const tabBtn = document.getElementById('tab-btn-geral');
    if (tabBtn) {
      tabBtn.click();
      
      const orderTag = order.item_id || order.id_do_pedido;

      // Feedback visual: rolar diretamente até a tabela de pedidos
      setTimeout(() => {
        const target = document.getElementById('section-historico-pedidos');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          
          // Animação de pulse na linha específica
          const row = document.getElementById(`order-row-${orderTag}`);
          if (row) {
            row.classList.add('row-highlight');
            setTimeout(() => row.classList.remove('row-highlight'), 6000);
          }
        }
      }, 300); // Delay para garantir renderização da tabela
    }
    close();
  };

  id.onclick = goToOrders;
  id.querySelector('.notification-details-btn').onclick = goToOrders;

  // Auto remove after 10 seconds
  setTimeout(close, 10000);
}
