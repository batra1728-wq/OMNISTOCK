/**
 * OmniStock Wireless Barcode Scanner Engine
 * Supports:
 * - Bluetooth HID wireless scanners (iOS, Android, Windows, Mac)
 * - USB OTG hardware scanners & 2.4GHz wireless dongles
 * - Rapid keystroke detection with timing heuristics (<50ms per key)
 * - Enter & Tab termination suffixes
 * - AIM symbology identifier prefix stripping (e.g., ]C1, ]e0, ]Q1)
 * - Non-printable ASCII control character cleanup
 * - Duplicate scan debounce protection (prevents double triggers)
 * - Virtual keyboard suppression on mobile devices
 * - Web Bluetooth (BLE) detection with iOS/Android guidance
 */

export type ScannerSource = 'bluetooth_hid' | 'usb_otg' | 'camera' | 'web_bluetooth' | 'manual';

export interface ScanMetadata {
  barcode: string;
  source: ScannerSource;
  scanDurationMs: number;
  charCount: number;
  timestamp: number;
  interKeyAvgMs: number;
}

export interface HardwareScannerOptions {
  onScan: (barcode: string, meta: ScanMetadata) => void;
  onError?: (error: string) => void;
  minChars?: number;
  maxCharIntervalMs?: number;
  duplicateCooldownMs?: number;
  enabled?: boolean;
  allowManualKeypad?: boolean;
}

export interface ScannerDiagnosticsState {
  status: 'idle' | 'listening' | 'receiving' | 'scanned' | 'blocked_duplicate' | 'error';
  activeMethod: ScannerSource;
  lastBarcode: string | null;
  lastTimestamp: number | null;
  lastDurationMs: number;
  lastCharCount: number;
  totalHardwareScans: number;
  webBluetoothAvailable: boolean;
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  troubleshootingNotes: string[];
  recentEvents: Array<{
    id: string;
    time: string;
    type: 'SCAN' | 'DUPLICATE' | 'ERROR' | 'INPUT' | 'STATUS';
    message: string;
    data?: any;
  }>;
}

/**
 * Normalizes scanned barcodes:
 * - Trims leading & trailing whitespace
 * - Strips AIM Code Symbology Identifiers (e.g., ]C1, ]e0, ]Q1, ]d2, ]A0)
 * - Removes non-printable ASCII control characters (\x00-\x1F, \x7F)
 * - Preserves all legitimate characters (hyphens, colons, underscores, alphanumeric)
 */
export function normalizeBarcode(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';

  let cleaned = raw.trim();

  // Strip AIM Symbology Identifiers: starts with ']' followed by flag char and modifier digit
  // Examples: ]C1 (Code 128), ]e0 (EAN/UPC), ]Q1 (QR code), ]A0 (Code 39), ]d1 (DataMatrix)
  cleaned = cleaned.replace(/^\][A-Za-z0-9]{2}/, '');

  // Strip non-printable ASCII characters (0-31 and 127)
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '');

  return cleaned.trim();
}

/**
 * Validates whether a normalized barcode string is well-formed.
 */
export function isValidBarcode(code: string, minLength: number = 2): boolean {
  if (!code || typeof code !== 'string') return false;
  const trimmed = code.trim();
  if (trimmed.length < minLength || trimmed.length > 128) return false;
  // Ensure string is not solely punctuation or control characters
  return /[A-Za-z0-9]/.test(trimmed);
}

/**
 * Prevents accidental duplicate scans within a cooldown window.
 * Allows legitimate repeated scans once cooldown expires.
 */
export class DuplicateScanFilter {
  private lastCode: string = '';
  private lastTime: number = 0;
  private cooldownMs: number;

  constructor(cooldownMs: number = 1200) {
    this.cooldownMs = cooldownMs;
  }

  public shouldAllow(code: string, now: number = Date.now()): { allowed: boolean; remainingCooldownMs: number } {
    const normalized = normalizeBarcode(code).toUpperCase();
    if (normalized === this.lastCode) {
      const elapsed = now - this.lastTime;
      if (elapsed < this.cooldownMs) {
        return {
          allowed: false,
          remainingCooldownMs: this.cooldownMs - elapsed,
        };
      }
    }
    return { allowed: true, remainingCooldownMs: 0 };
  }

  public record(code: string, now: number = Date.now()): void {
    this.lastCode = normalizeBarcode(code).toUpperCase();
    this.lastTime = now;
  }

  public reset(): void {
    this.lastCode = '';
    this.lastTime = 0;
  }

  public setCooldown(ms: number): void {
    this.cooldownMs = ms;
  }
}

/**
 * Calculate stock change and boundary status according to OmniStock inventory logic.
 */
export function calculateStockTransaction(
  currentStock: number,
  maxStock: number,
  quantityDelta: number
): {
  newStock: number;
  status: 'CRITICAL' | 'LOW' | 'OPTIMAL' | 'FULL';
  clamped: boolean;
} {
  const rawStock = currentStock + quantityDelta;
  const newStock = Math.max(0, rawStock);
  const clamped = rawStock < 0;

  const effectiveMax = maxStock > 0 ? maxStock : 100;
  const pct = (newStock / effectiveMax) * 100;

  let status: 'CRITICAL' | 'LOW' | 'OPTIMAL' | 'FULL';
  if (pct <= 20) {
    status = 'CRITICAL';
  } else if (pct <= 40) {
    status = 'LOW';
  } else if (pct >= 95) {
    status = 'FULL';
  } else {
    status = 'OPTIMAL';
  }

  return { newStock, status, clamped };
}

/**
 * Detect client platform
 */
export function detectPlatform(): 'ios' | 'android' | 'desktop' | 'unknown' {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'ios';
  }
  if (/Android/.test(ua)) {
    return 'android';
  }
  if (/Windows|Macintosh|Linux/.test(ua)) {
    return 'desktop';
  }
  return 'unknown';
}

/**
 * Check if Web Bluetooth API is supported in this browser
 */
export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator && !!(navigator as any).bluetooth;
}

/**
 * Global Hardware Scanner Listener Engine (HID Keyboard Emulation)
 */
export class HardwareScannerEngine {
  private buffer: string[] = [];
  private timestamps: number[] = [];
  private burstTimer: any = null;
  private duplicateFilter: DuplicateScanFilter;
  private options: Required<HardwareScannerOptions>;
  private isListening: boolean = false;
  private boundKeyDown: (e: KeyboardEvent) => void;

  constructor(options: HardwareScannerOptions) {
    this.options = {
      onScan: options.onScan,
      onError: options.onError || (() => {}),
      minChars: options.minChars ?? 3,
      maxCharIntervalMs: options.maxCharIntervalMs ?? 55, // Scanners type at ~10-40ms intervals
      duplicateCooldownMs: options.duplicateCooldownMs ?? 1200,
      enabled: options.enabled ?? true,
      allowManualKeypad: options.allowManualKeypad ?? false,
    };
    this.duplicateFilter = new DuplicateScanFilter(this.options.duplicateCooldownMs);
    this.boundKeyDown = this.handleKeyDown.bind(this);
  }

  public start(): void {
    if (this.isListening || typeof window === 'undefined') return;
    window.addEventListener('keydown', this.boundKeyDown, { capture: true });
    this.isListening = true;
  }

  public stop(): void {
    if (!this.isListening || typeof window === 'undefined') return;
    window.removeEventListener('keydown', this.boundKeyDown, { capture: true });
    this.isListening = false;
    this.clearBuffer();
  }

  public updateOptions(newOptions: Partial<HardwareScannerOptions>): void {
    this.options = { ...this.options, ...newOptions };
    if (newOptions.duplicateCooldownMs !== undefined) {
      this.duplicateFilter.setCooldown(newOptions.duplicateCooldownMs);
    }
  }

  public resetFilter(): void {
    this.duplicateFilter.reset();
  }

  private clearBuffer(): void {
    this.buffer = [];
    this.timestamps = [];
    if (this.burstTimer) {
      clearTimeout(this.burstTimer);
      this.burstTimer = null;
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.options.enabled) return;

    const now = performance.now();
    const key = e.key;

    // Check if user is typing in a non-scanner text input
    const target = e.target as HTMLElement | null;
    const isInsideInput =
      target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || (target as any).isContentEditable);
    const isScannerInput = target && target.getAttribute('data-scanner-input') === 'true';

    // Ignore single modifier keys (Shift, Control, Alt, Meta, CapsLock)
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'NumLock', 'ScrollLock'].includes(key)) {
      return;
    }

    // Check if termination key (Enter or Tab)
    const isEnter = key === 'Enter' || key === 'Return' || e.keyCode === 13;
    const isTab = key === 'Tab' || e.keyCode === 9;

    if (isEnter || isTab) {
      if (this.buffer.length >= this.options.minChars) {
        // Evaluate timing: average interval between keystrokes
        const duration = this.timestamps.length > 1 ? now - this.timestamps[0] : 0;
        const avgInterval =
          this.timestamps.length > 1 ? duration / (this.timestamps.length - 1) : 0;

        // Hardware scanners output characters with an average inter-key delay under 60ms
        // If typing occurred inside a standard input, only intercept if it exhibits scanner burst velocity
        const isHardwareBurst = avgInterval <= this.options.maxCharIntervalMs || isScannerInput;

        if (isHardwareBurst || this.buffer.length >= 6) {
          // Prevent default to prevent form submissions or focus loss
          e.preventDefault();
          e.stopPropagation();

          const rawCode = this.buffer.join('');
          this.processBarcode(rawCode, duration, this.buffer.length, avgInterval);
          this.clearBuffer();
          return;
        }
      }

      this.clearBuffer();
      return;
    }

    // Only collect single printable characters
    if (key.length === 1) {
      // Check interval since previous keystroke
      const lastTime = this.timestamps.length > 0 ? this.timestamps[this.timestamps.length - 1] : 0;
      const interval = lastTime > 0 ? now - lastTime : 0;

      // If pause was too long between keystrokes and we're inside a normal input, discard previous buffer
      if (lastTime > 0 && interval > this.options.maxCharIntervalMs * 2.2 && isInsideInput && !isScannerInput) {
        this.clearBuffer();
      }

      this.buffer.push(key);
      this.timestamps.push(now);

      // Set fallback timer: some scanners don't send an Enter/Tab suffix
      // If no new characters arrive within 75ms after at least minChars, evaluate as a completed scan
      if (this.burstTimer) clearTimeout(this.burstTimer);

      this.burstTimer = setTimeout(() => {
        if (this.buffer.length >= Math.max(4, this.options.minChars)) {
          const tNow = performance.now();
          const dur = tNow - this.timestamps[0];
          const avg = this.timestamps.length > 1 ? dur / (this.timestamps.length - 1) : 0;

          if (avg <= this.options.maxCharIntervalMs || isScannerInput) {
            const raw = this.buffer.join('');
            this.processBarcode(raw, dur, this.buffer.length, avg);
          }
        }
        this.clearBuffer();
      }, this.options.maxCharIntervalMs * 1.6);
    }
  }

  private processBarcode(
    raw: string,
    durationMs: number,
    charCount: number,
    interKeyAvgMs: number
  ): void {
    const normalized = normalizeBarcode(raw);
    if (!isValidBarcode(normalized, this.options.minChars)) {
      return;
    }

    const check = this.duplicateFilter.shouldAllow(normalized);
    if (!check.allowed) {
      this.options.onError(
        `Duplicate scan of "${normalized}" ignored (${Math.round(check.remainingCooldownMs)}ms cooldown remaining)`
      );
      return;
    }

    this.duplicateFilter.record(normalized);

    const source: ScannerSource =
      interKeyAvgMs < 35 ? 'bluetooth_hid' : interKeyAvgMs < 60 ? 'usb_otg' : 'bluetooth_hid';

    const meta: ScanMetadata = {
      barcode: normalized,
      source,
      scanDurationMs: Math.round(durationMs),
      charCount,
      timestamp: Date.now(),
      interKeyAvgMs: Math.round(interKeyAvgMs * 10) / 10,
    };

    this.options.onScan(normalized, meta);
  }
}
