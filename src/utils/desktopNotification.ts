/**
 * OmniStock Automated Desktop Alert & Reorder Point Notification Engine
 * Supports Native Web Notifications (Desktop Alerts), synthesized acoustic chimes,
 * smart debouncing, and in-app desktop floating alert banners.
 */

export interface DesktopAlertPayload {
  id: string;
  sku: string;
  itemName: string;
  currentStock: number;
  reorderPoint: number;
  maxStock: number;
  unit: string;
  imageUrl?: string;
  deficit: number;
  timestamp: number;
  severity: 'critical' | 'warning';
}

// Memory & LocalStorage Cooldown Tracker (SKU -> { lastStock: number, lastAlertTime: number })
interface AlertHistoryEntry {
  lastStock: number;
  lastAlertTime: number;
  reorderPoint: number;
}

const COOLDOWN_MS = 8 * 60 * 1000; // 8 minutes cooldown unless stock drops further
const memoryAlertCooldowns = new Map<string, AlertHistoryEntry>();

/**
 * Calculates defined or automatic par reorder point for an item
 */
export function getReorderPoint(item: { currentStock: number; maxStock: number; reorderPoint?: number }): number {
  if (item.reorderPoint !== undefined && item.reorderPoint !== null && !isNaN(item.reorderPoint)) {
    return Math.max(0, Math.round(item.reorderPoint));
  }
  // Default to 25% of max capacity (or at least 1 unit)
  return Math.max(1, Math.round(item.maxStock * 0.25));
}

/**
 * Checks whether an item's current stock has fallen to or below its defined reorder point
 */
export function isBelowReorderPoint(item: { currentStock: number; maxStock: number; reorderPoint?: number }): boolean {
  const threshold = getReorderPoint(item);
  return item.currentStock <= threshold;
}

/**
 * Checks browser support and current permission for Native Web Desktop Notifications
 */
export function getDesktopNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Requests desktop alert notification permission from the user
 */
export async function requestDesktopNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    try {
      localStorage.setItem('omnistock_desktop_notifications_granted', permission === 'granted' ? 'true' : 'false');
    } catch {}
    return permission;
  } catch {
    return 'unsupported';
  }
}

/**
 * Plays an acoustic audio warning chime via Web Audio API (cross-browser synthetic dual tone)
 */
export function playStockThresholdAudioAlert(severity: 'critical' | 'warning' = 'warning') {
  try {
    if (typeof window === 'undefined') return;

    // Check if user disabled sound in settings
    try {
      const soundSetting = localStorage.getItem('omnistock_sound_alerts');
      if (soundSetting === 'false') return;
    } catch {}

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    if (severity === 'critical') {
      // Rapid alert pulse: 784Hz (G5) -> 523Hz (C5) -> 440Hz (A4)
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(783.99, now);
      osc1.frequency.exponentialRampToValueAtTime(440, now + 0.35);

      gainNode.gain.setValueAtTime(0.18, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc1.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.45);
    } else {
      // Warning chime: 587.33Hz (D5) -> 440Hz (A4)
      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(587.33, now);
      osc1.frequency.setValueAtTime(440, now + 0.12);

      osc2.frequency.setValueAtTime(293.66, now);
      osc2.frequency.setValueAtTime(220, now + 0.12);

      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.4);
      osc2.stop(now + 0.4);
    }
  } catch {
    // AudioContext blocked or restricted
  }
}

/**
 * Dispatches an automated desktop alert whenever an item crosses or sits below its Reorder Point threshold.
 * Incorporates:
 * 1. Debouncing / Cooldown: Prevents duplicate alert spam unless stock decreases further
 * 2. Native Desktop Notification (if granted)
 * 3. Acoustic alert chime
 * 4. Custom DOM Event 'omnistock:reorder_alert' for In-App Desktop Banners
 */
export function dispatchStockThresholdAlert(
  item: {
    id: string;
    sku: string;
    name: string;
    currentStock: number;
    maxStock: number;
    reorderPoint?: number;
    unit: string;
    imageUrl?: string;
  },
  options?: {
    force?: boolean;
    onNotificationClick?: () => void;
  }
): DesktopAlertPayload | null {
  const threshold = getReorderPoint(item);

  // If item is above threshold, nothing to alert
  if (item.currentStock > threshold && !options?.force) {
    return null;
  }

  const now = Date.now();
  const existingHistory = memoryAlertCooldowns.get(item.sku);

  // Cooldown check: if already alerted recently and stock hasn't dropped further, skip
  if (!options?.force && existingHistory) {
    const isWithinCooldown = now - existingHistory.lastAlertTime < COOLDOWN_MS;
    const hasNotDroppedFurther = item.currentStock >= existingHistory.lastStock;
    if (isWithinCooldown && hasNotDroppedFurther) {
      return null;
    }
  }

  // Update cooldown history
  memoryAlertCooldowns.set(item.sku, {
    lastStock: item.currentStock,
    lastAlertTime: now,
    reorderPoint: threshold,
  });

  const deficit = Math.max(0, threshold - item.currentStock);
  const severity: 'critical' | 'warning' = item.currentStock === 0 ? 'critical' : 'warning';

  const alertPayload: DesktopAlertPayload = {
    id: `alert-threshold-${item.sku}-${now}`,
    sku: item.sku,
    itemName: item.name,
    currentStock: item.currentStock,
    reorderPoint: threshold,
    maxStock: item.maxStock,
    unit: item.unit,
    imageUrl: item.imageUrl,
    deficit,
    timestamp: now,
    severity,
  };

  // 1. Play acoustic alert sound
  playStockThresholdAudioAlert(severity);

  // 2. Native Web Desktop Notification
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      const notificationTitle = severity === 'critical'
        ? `🚨 CRITICAL STOCK OUT: ${item.name} (${item.sku})`
        : `⚠️ REORDER POINT BREACH: ${item.name} (${item.sku})`;

      const notificationBody = item.currentStock === 0
        ? `Stock has hit ZERO! Threshold is ${threshold} ${item.unit}. Immediate purchase order required.`
        : `Current stock (${item.currentStock} ${item.unit}) is below defined reorder point (${threshold} ${item.unit}). Deficit: ${deficit} ${item.unit}.`;

      const notification = new Notification(notificationTitle, {
        body: notificationBody,
        icon: item.imageUrl || '/vite.svg',
        tag: `stock-alert-${item.sku}`,
        badge: '/vite.svg',
        requireInteraction: severity === 'critical',
      });

      notification.onclick = () => {
        window.focus?.();
        notification.close();
        if (options?.onNotificationClick) {
          options.onNotificationClick();
        }
      };
    } catch {
      // Native desktop notification could not be instantiated in iframe
    }
  }

  // 3. Dispatch In-App Custom DOM Event for Floating Desktop Banner & System Alerts
  if (typeof window !== 'undefined') {
    try {
      const customEvent = new CustomEvent('omnistock:reorder_alert', {
        detail: alertPayload,
      });
      window.dispatchEvent(customEvent);
    } catch {}
  }

  return alertPayload;
}

/**
 * Subscribes to in-app reorder threshold alert broadcasts
 */
export function subscribeToReorderAlerts(callback: (payload: DesktopAlertPayload) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<DesktopAlertPayload>;
    if (customEvent.detail) {
      callback(customEvent.detail);
    }
  };

  window.addEventListener('omnistock:reorder_alert', handler);
  return () => {
    window.removeEventListener('omnistock:reorder_alert', handler);
  };
}
