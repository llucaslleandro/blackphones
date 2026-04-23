import { showNotification } from './ui.js';

const SEEN_ORDERS_KEY = 'vendly_notified_orders';
const NOTIFICATION_SOUND_URL = '../../assets/sounds/neworder_notification.mp3'; // Tecnologia Bell 1 (Pixabay 445873 mirror)

let seenOrderIds = new Set();
const audio = new Audio(NOTIFICATION_SOUND_URL);

/**
 * Initializes the list of seen orders to prevent notifying old orders on load.
 */
export function initSeenOrders(orders) {
  // Load from localStorage to persist across refreshes
  const stored = localStorage.getItem(SEEN_ORDERS_KEY);
  if (stored) {
    try {
      const ids = JSON.parse(stored);
      seenOrderIds = new Set(ids);
    } catch (e) {
      seenOrderIds = new Set();
    }
  }

  // Add current orders to seen if they aren't already there
  orders.forEach(order => {
    const id = order.item_id || order.id_do_pedido;
    if (id) seenOrderIds.add(id);
  });

  saveSeenOrders();
}

/**
 * Checks for new orders and triggers notifications.
 */
export function checkNewOrders(orders) {
  if (seenOrderIds.size === 0 && orders.length > 0) {
    // If first time running and no state, just seed it
    initSeenOrders(orders);
    return;
  }

  const newOrders = orders.filter(order => {
    const id = order.item_id || order.id_do_pedido;
    return id && !seenOrderIds.has(id);
  });

  if (newOrders.length > 0) {
    // Play sound once for the batch
    playNotificationSound();

    // Show toast for each new order (or just the first few if many)
    newOrders.forEach((order, index) => {
      // Delay multiple toasts slightly for better visual effect
      setTimeout(() => {
        showNotification(order);
        seenOrderIds.add(order.item_id || order.id_do_pedido);
        saveSeenOrders();
      }, index * 800);
    });
  }
}

function playNotificationSound() {
  audio.currentTime = 0;
  audio.play().catch(err => console.warn('Could not play notification sound:', err));
}

function saveSeenOrders() {
  const ids = Array.from(seenOrderIds);
  // Keep only the last 500 IDs to avoid localStorage overflow
  const limitedIds = ids.slice(-500);
  localStorage.setItem(SEEN_ORDERS_KEY, JSON.stringify(limitedIds));
}
