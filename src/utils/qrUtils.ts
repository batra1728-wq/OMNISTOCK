import QRCode from 'qrcode';

export interface ParsedScannerParams {
  isScannerTriggered: boolean;
  sku: string | null;
  action: string | null;
  session: string | null;
  qty: number | null;
  mode: 'add' | 'deduct' | null;
  hub: string | null;
}

/**
 * Automatically detects and parses query parameters (e.g., ?sku=XYZ&action=scan)
 * from both window.location.search and window.location.hash.
 */
export function parseScannerUrlParams(): ParsedScannerParams {
  if (typeof window === 'undefined') {
    return {
      isScannerTriggered: false,
      sku: null,
      action: null,
      session: null,
      qty: null,
      mode: null,
      hub: null,
    };
  }

  try {
    const searchParams = new URLSearchParams(window.location.search);

    // Also parse hash in case hash navigation is used e.g. #/scanner?sku=XYZ&action=scan or #action=scan&sku=XYZ
    let hashParams = new URLSearchParams();
    if (window.location.hash) {
      const hashStr = window.location.hash.replace(/^#\/?/, '');
      const questionIndex = hashStr.indexOf('?');
      if (questionIndex !== -1) {
        hashParams = new URLSearchParams(hashStr.substring(questionIndex + 1));
      } else if (hashStr.includes('=')) {
        hashParams = new URLSearchParams(hashStr);
      }
    }

    const getParam = (key: string): string | null => {
      return searchParams.get(key) || hashParams.get(key) || null;
    };

    const action = getParam('action')?.toLowerCase() || null;
    const scanner = getParam('scanner')?.toLowerCase() || null;
    const sku = getParam('sku') || getParam('barcode') || getParam('code') || null;
    const session = getParam('session') || getParam('sessionId') || null;
    const qtyStr = getParam('qty') || getParam('quantity') || null;
    const modeParam = getParam('mode')?.toLowerCase() || null;
    const hub = getParam('hub') || null;

    const pathname = window.location.pathname.toLowerCase();

    // Trigger criteria:
    // 1. Explicit action=scan, action=scanner, action=mobile
    // 2. Explicit scanner=mobile, scanner=1, scanner=true
    // 3. Path is /scanner, /mobile, /scan, /mobile-scanner
    // 4. Parameter ?sku=XYZ present along with action=scan OR session OR not desktop
    const isScanAction = action === 'scan' || action === 'scanner' || action === 'mobile';
    const isScannerParam = scanner === 'mobile' || scanner === '1' || scanner === 'true';
    const isPathScanner =
      pathname.includes('/scanner') ||
      pathname.includes('/mobile') ||
      pathname.endsWith('/scan') ||
      pathname.includes('/mobile-scanner');
    const isSessionParam = Boolean(session && session.length > 0);
    const hasSkuWithScanTrigger = Boolean(
      sku && (isScanAction || isScannerParam || isSessionParam || searchParams.has('action') || searchParams.has('scanner'))
    );

    // If sku is passed alone without explicitly disabling scan, trigger mobile scanner if action=scan or no contrary flag
    const isScannerTriggered =
      isScanAction || isScannerParam || isPathScanner || isSessionParam || hasSkuWithScanTrigger;

    return {
      isScannerTriggered,
      sku: sku ? sku.trim() : null,
      action: action || (isScannerTriggered ? 'scan' : null),
      session: session ? session.trim() : null,
      qty: qtyStr && !isNaN(Number(qtyStr)) ? Number(qtyStr) : null,
      mode: modeParam === 'deduct' ? 'deduct' : modeParam === 'add' ? 'add' : null,
      hub: hub ? hub.trim() : null,
    };
  } catch (err) {
    console.error('Error parsing scanner URL params:', err);
    return {
      isScannerTriggered: false,
      sku: null,
      action: null,
      session: null,
      qty: null,
      mode: null,
      hub: null,
    };
  }
}

export async function generateQRCodeDataUrl(text: string, size: number = 320): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: size,
      margin: 2,
      color: {
        dark: '#022c22', // deep emerald-950 high contrast
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.error('Failed to generate QR code', err);
    return '';
  }
}

/**
 * Returns the currently active application origin.
 * Automatically detects window.location.origin in the browser, ensuring the QR code
 * and mobile link always point to the actual live running server.
 */
export function getActiveAppOrigin(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }
  return '';
}

export function getMobileScannerUrl(sessionId?: string, targetSku?: string, customBaseUrl?: string): string {
  try {
    const rawBase =
      customBaseUrl?.trim() ||
      getActiveAppOrigin() ||
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    const baseWithProto =
      rawBase.startsWith('http://') || rawBase.startsWith('https://') ? rawBase : `http://${rawBase}`;
    const parsed = new URL(baseWithProto);
    parsed.pathname = '/';
    parsed.searchParams.set('action', 'scan');
    parsed.searchParams.set('scanner', 'mobile');
    if (sessionId) {
      parsed.searchParams.set('session', sessionId);
    }
    if (targetSku) {
      parsed.searchParams.set('sku', targetSku);
    }
    return parsed.toString();
  } catch {
    const fallbackBase = customBaseUrl?.trim() || getActiveAppOrigin() || '';
    return `${fallbackBase}/?action=scan&scanner=mobile${sessionId ? `&session=${sessionId}` : ''}${
      targetSku ? `&sku=${encodeURIComponent(targetSku)}` : ''
    }`;
  }
}

export interface ScannerUrlResolution {
  url: string;
  lanUrl?: string;
  sharedUrl?: string;
}

export async function getVerifiedPublicScannerUrl(
  sessionId: string,
  targetSku?: string,
  customBaseUrl?: string
): Promise<ScannerUrlResolution> {
  try {
    if (customBaseUrl) {
      return { url: getMobileScannerUrl(sessionId, targetSku, customBaseUrl) };
    }

    const currentOrigin = getActiveAppOrigin();
    const queryParams = new URLSearchParams({
      sessionId,
      baseUrl: currentOrigin,
    });
    if (targetSku) {
      queryParams.set('sku', targetSku);
    }

    const res = await fetch(`/api/scanner/session/init?${queryParams.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data && (data.publicUrl || data.currentUrl)) {
        const pubUrl = data.currentUrl || data.publicUrl;
        const parsed = new URL(pubUrl);
        parsed.searchParams.set('action', 'scan');
        parsed.searchParams.set('scanner', 'mobile');
        if (targetSku) {
          parsed.searchParams.set('sku', targetSku);
        }
        let lanUrl = data.lanUrl;
        if (lanUrl) {
          try {
            const parsedLan = new URL(lanUrl);
            parsedLan.searchParams.set('action', 'scan');
            parsedLan.searchParams.set('scanner', 'mobile');
            if (targetSku) {
              parsedLan.searchParams.set('sku', targetSku);
            }
            lanUrl = parsedLan.toString();
          } catch {}
        }
        let sharedUrl = data.sharedUrl;
        if (sharedUrl) {
          try {
            const parsedShared = new URL(sharedUrl);
            parsedShared.searchParams.set('action', 'scan');
            parsedShared.searchParams.set('scanner', 'mobile');
            if (targetSku) {
              parsedShared.searchParams.set('sku', targetSku);
            }
            sharedUrl = parsedShared.toString();
          } catch {}
        }
        return {
          url: parsed.toString(),
          lanUrl,
          sharedUrl,
        };
      }
    }
  } catch {
    // fallback
  }
  return { url: getMobileScannerUrl(sessionId, targetSku, customBaseUrl) };
}
