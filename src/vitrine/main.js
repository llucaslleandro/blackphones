import { CONFIG, applyTheme } from '../shared/config.js';
import { elements, openCart, closeCart } from './modules/ui.js';
import { renderComparacao, filtrarProdutos, aplicarProdutos } from './modules/catalog.js';
import { removerDoCarrinho, ajustarQuantidade, limparCarrinho, finalizarPedido, carregarCarrinhoLocalStorage, renderCarrinho, abrirSimuladorParcelamento } from '../shared/modules/cart.js';
import { carregarCacheProdutos, cacheValido, salvarCacheProdutos } from '../shared/modules/utils.js';
import { fetchProdutosApi, fetchPedidosApi } from '../shared/modules/api.js';
import { store } from '../shared/modules/store.js';
import { initOnboarding, iniciarPopupsSociais, showElement, hideElement, setError } from './modules/ui.js';
import './modules/tracker.js'; // Auto-starts visit tracking + heartbeat

function aplicarEventos() {
  elements.searchInput.addEventListener('input', filtrarProdutos);
  elements.categorySelect.addEventListener('change', filtrarProdutos);
  if (elements.conditionSelect) elements.conditionSelect.addEventListener('change', filtrarProdutos);
  elements.sortSelect.addEventListener('change', filtrarProdutos);
  elements.btnOpenCart.addEventListener('click', openCart);
  elements.btnCloseCart.addEventListener('click', closeCart);
  elements.btnCompare.addEventListener('click', () => {
    renderComparacao();
    elements.compareModal.classList.remove('hidden');
  });
  elements.closeCompare.addEventListener('click', () => {
    elements.compareModal.classList.add('hidden');
  });
  elements.overlay.addEventListener('click', closeCart);

  const heroCta = document.getElementById('hero-cta');
  if (heroCta) {
    heroCta.addEventListener('click', () => {
      const catalogSection = document.getElementById('catalog-section');
      if (catalogSection) {
        const headerOffset = 80;
        const elementPosition = catalogSection.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: elementPosition - headerOffset, behavior: 'smooth' });
      }
    });
  }
  elements.clearCartButton.addEventListener('click', limparCarrinho);
  elements.finalizeButton.addEventListener('click', finalizarPedido);

  elements.cartPanel.addEventListener('click', (e) => e.stopPropagation());
  elements.compareModal.addEventListener('click', (e) => e.stopPropagation());

  elements.cartItems.addEventListener('click', (e) => {
    const target = e.target;
    if (target.classList.contains('remove-item')) {
      removerDoCarrinho(target.getAttribute('data-id'));
    } else if (target.classList.contains('quantity-plus')) {
      ajustarQuantidade(target.getAttribute('data-id'), 1);
    } else if (target.classList.contains('quantity-minus')) {
      ajustarQuantidade(target.getAttribute('data-id'), -1);
    }
  });

  if (elements.installmentValue) {
    elements.installmentValue.addEventListener('click', () => {
      if (typeof abrirSimuladorParcelamento === 'function') abrirSimuladorParcelamento();
    });
    elements.installmentValue.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (typeof abrirSimuladorParcelamento === 'function') abrirSimuladorParcelamento();
      }
    });
  }

  const addressWrapper = document.getElementById('address-wrapper');

  if (elements.deliveryType && elements.addressField && addressWrapper) {
    elements.deliveryType.addEventListener('change', () => {
      if (elements.deliveryType.value === 'Entrega') {
        elements.addressField.disabled = false;
        addressWrapper.classList.remove('hidden');
      } else {
        elements.addressField.disabled = true;
        elements.addressField.value = '';
        addressWrapper.classList.add('hidden');
      }
    });

    if (elements.deliveryType.value === 'Retirada') {
      elements.addressField.disabled = true;
      addressWrapper.classList.add('hidden');
    }
  }
}

// ===== Banner Carousel =====
function initBannerCarousel() {
  const banners = CONFIG.banners || [];
  if (!banners.length) {
    const carouselEl = document.getElementById('banner-carousel');
    if (carouselEl) carouselEl.style.display = 'none';
    return;
  }

  const track = document.getElementById('banner-track');
  const dotsContainer = document.getElementById('banner-dots');
  const prevBtn = document.getElementById('banner-prev');
  const nextBtn = document.getElementById('banner-next');
  if (!track || !dotsContainer) return;

  const totalSlides = banners.length;
  let currentIndex = 0;
  let autoPlayTimer = null;
  let isTransitioning = false;

  const lastClone = createSlide(banners[totalSlides - 1], 'clone-last');
  track.appendChild(lastClone);

  banners.forEach((banner, i) => {
    track.appendChild(createSlide(banner, `slide-${i}`));
  });

  const firstClone = createSlide(banners[0], 'clone-first');
  track.appendChild(firstClone);

  banners.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'banner-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `Ir para banner ${i + 1}`);
    dot.addEventListener('click', () => goToSlide(i));
    dotsContainer.appendChild(dot);
  });

  setTrackPosition(1, false);

  function createSlide(banner, id) {
    const slide = document.createElement('div');
    slide.className = 'banner-slide';
    slide.id = id;

    if (banner.imageMobile) {
      const picture = document.createElement('picture');
      const sourceMobile = document.createElement('source');
      sourceMobile.media = '(max-width: 639px)';
      sourceMobile.srcset = banner.imageMobile;

      const img = document.createElement('img');
      img.src = banner.image;
      img.alt = banner.alt || '';
      img.loading = 'lazy';
      img.draggable = false;

      picture.appendChild(sourceMobile);
      picture.appendChild(img);
      slide.appendChild(picture);
    } else {
      const img = document.createElement('img');
      img.src = banner.image;
      img.alt = banner.alt || '';
      img.loading = 'lazy';
      img.draggable = false;
      slide.appendChild(img);
    }

    return slide;
  }

  function setTrackPosition(trackIndex, animate = true) {
    if (!animate) {
      track.style.transition = 'none';
      track.style.transform = `translateX(-${trackIndex * 100}%)`;
      track.offsetHeight;
    } else {
      track.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      track.style.transform = `translateX(-${trackIndex * 100}%)`;
    }
  }

  function updateDots() {
    let dotIndex = currentIndex;
    if (dotIndex >= totalSlides) dotIndex = 0;
    if (dotIndex < 0) dotIndex = totalSlides - 1;

    const dots = dotsContainer.querySelectorAll('.banner-dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === dotIndex);
    });
  }

  function goToSlide(index) {
    if (isTransitioning) return;
    currentIndex = index;
    isTransitioning = true;
    setTrackPosition(currentIndex + 1, true);
    updateDots();
    resetAutoPlay();
  }

  function nextSlide() {
    if (isTransitioning) return;
    isTransitioning = true;
    currentIndex++;
    setTrackPosition(currentIndex + 1, true);
    updateDots();
    resetAutoPlay();
  }

  function prevSlide() {
    if (isTransitioning) return;
    isTransitioning = true;
    currentIndex--;
    setTrackPosition(currentIndex + 1, true);
    updateDots();
    resetAutoPlay();
  }

  track.addEventListener('transitionend', (e) => {
    if (e.target !== track || e.propertyName !== 'transform') return;

    isTransitioning = false;

    if (currentIndex >= totalSlides) {
      currentIndex = 0;
      setTrackPosition(currentIndex + 1, false);
    } else if (currentIndex < 0) {
      currentIndex = totalSlides - 1;
      setTrackPosition(currentIndex + 1, false);
    }
  });

  nextBtn.addEventListener('click', nextSlide);
  prevBtn.addEventListener('click', prevSlide);

  function startAutoPlay() {
    const interval = CONFIG.bannerInterval || 5000;
    autoPlayTimer = setInterval(nextSlide, interval);
  }

  function resetAutoPlay() {
    clearInterval(autoPlayTimer);
    startAutoPlay();
  }

  startAutoPlay();

  const carousel = document.getElementById('banner-carousel');
  carousel.addEventListener('mouseenter', () => clearInterval(autoPlayTimer));
  carousel.addEventListener('mouseleave', startAutoPlay);

  let touchStartX = 0;
  let touchEndX = 0;
  const swipeThreshold = 50;

  carousel.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    clearInterval(autoPlayTimer);
  }, { passive: true });

  carousel.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
    startAutoPlay();
  }, { passive: true });
}

async function fetchProdutos() {
  const cache = carregarCacheProdutos();
  
  // No localhost, ignoramos o cache inicial para evitar confusão no desenvolvimento
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  if (!isDev && cache && Array.isArray(cache)) {
    // Se temos cache e não é dev, podemos mostrar algo rápido antes do fetch (UX opcional)
    // Mas o requisito pede para "Avoid rendering stale cache before fetch completes"
    // Então só usaremos o cache se o fetch falhar ou se estivermos em produção e for realmente necessário.
    // Para simplificar e unir os requisitos: mostramos loader se não houver cache OU se for dev.
  }

  // Sempre mostramos o loading no início para garantir que o usuário saiba que os dados estão sendo validados
  showElement(elements.loading);

  try {
    hideElement(elements.errorMessage);
    hideElement(elements.emptyMessage);

    const [data, pedidos] = await Promise.all([
      fetchProdutosApi(),
      fetchPedidosApi()
    ]);

    // Calcular vendas por variação exata (status === 'Fechado')
    const vendas = {};
    pedidos.forEach(o => {
      const status = String(o.status || '').toLowerCase();
      if (status === 'fechado') {
        const pName = String(o.produto || '').trim();
        const pColor = String(o.cor || '').trim();
        const pArmaz = String(o.armazenamento || '').trim();
        const key = `${pName}|${pColor}|${pArmaz}`.toLowerCase();
        vendas[key] = (vendas[key] || 0) + (Number(o.quantidade) || 1);
      }
    });
    store.vendasProduto = vendas;

    salvarCacheProdutos(data);
    aplicarProdutos(data, false); // false para evitar saltos de animação se já mostramos algo
    aplicarEventos();
    hideElement(elements.loading);
  } catch (err) {
    console.error('Fetch error:', err);
    // Fallback para o cache apenas em ERRO de rede
    if (cache) {
      setError('Offline: Exibindo dados salvos anteriormente.');
      aplicarProdutos(cache, true);
      aplicarEventos();
    } else {
      showElement(elements.loading);
      setError(err.message || 'Erro desconhecido ao carregar os produtos.');
    }
  }
}

// ===== INÍCIO DA APLICAÇÃO =====
function init() {
  applyTheme();
  elements.cartPanel.style.display = 'none';
  elements.overlay.classList.add('hidden');

  initBannerCarousel();
  carregarCarrinhoLocalStorage();
  renderCarrinho();
  fetchProdutos();
  iniciarPopupsSociais();
  initOnboarding();
}

init();
