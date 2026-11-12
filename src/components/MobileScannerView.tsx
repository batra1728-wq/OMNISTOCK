import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat } from '@zxing/library';
import { InventoryItem, LanguageCode } from '../types';
import { translateRecordedItem, translateRecordedUnit } from '../utils/i18n';
import { COMMON_QUANTITY_UNITS, getUnitIcon } from '../utils/units';
import { parseScannerUrlParams } from '../utils/qrUtils';
import {
  HardwareScannerEngine,
  normalizeBarcode,
  isValidBarcode,
  calculateStockTransaction,
  detectPlatform,
  isWebBluetoothSupported,
  ScannerSource,
  ScanMetadata,
} from '../utils/hardwareScanner';

export interface ScannedItemEntry {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  category?: string;
  quantity: number;
  unit: string;
  mode: 'add' | 'deduct' | 'new';
  timestamp: number;
  device?: string;
  previousStock?: number;
  newStock?: number;
  location?: string;
}

interface MobileScannerViewProps {
  inventory: InventoryItem[];
  onBackToApp: () => void;
  onItemUpdated?: (sku: string, addedQty: number) => void;
  onProductAdded?: (product: InventoryItem) => void;
  currentLang?: LanguageCode;
  initialSku?: string | null;
  initialAction?: string | null;
  initialSessionId?: string | null;
  initialQty?: number | null;
  initialMode?: 'add' | 'deduct' | null;
}

export const MobileScannerView: React.FC<MobileScannerViewProps> = ({
  inventory,
  onBackToApp,
  onItemUpdated,
  onProductAdded,
  currentLang = 'en',
  initialSku,
  initialAction,
  initialSessionId,
  initialQty,
  initialMode,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const barcodeDetectorRef = useRef<any>(null);
  const scanLoopRef = useRef<number | null>(null);
  const isScanningActiveRef = useRef<boolean>(true);
  const frameCountRef = useRef<number>(0);
  const skippedFramesCountRef = useRef<number>(0);
  const lastFpsTimeRef = useRef<number>(performance.now());
  const fpsFrameCountRef = useRef<number>(0);

  // Hardware Wireless Barcode Scanner Engine & Invisible Proxy Input (for mobile soft-keyboard suppression)
  const hardwareScannerRef = useRef<HardwareScannerEngine | null>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const [hardwareScanStatus, setHardwareScanStatus] = useState<{
    status: 'listening' | 'receiving' | 'scanned' | 'blocked_duplicate';
    source: ScannerSource;
    lastBarcode: string | null;
    lastTimestamp: number | null;
    lastDurationMs: number;
    charCount: number;
    interKeyAvgMs: number;
    totalScans: number;
    webBluetoothSupported: boolean;
    clientPlatform: 'ios' | 'android' | 'desktop' | 'unknown';
  }>({
    status: 'listening',
    source: 'bluetooth_hid',
    lastBarcode: null,
    lastTimestamp: null,
    lastDurationMs: 0,
    charCount: 0,
    interKeyAvgMs: 0,
    totalScans: 0,
    webBluetoothSupported: isWebBluetoothSupported(),
    clientPlatform: detectPlatform(),
  });

  // Check if running inside iframe
  const isInsideIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Diagnostics and Log Feed for mobile testing
  const [mobileLogs, setMobileLogs] = useState<Array<{
    id: string;
    timestamp: string;
    category: 'INIT' | 'PERM' | 'CAMERA' | 'FRAME' | 'DECODE' | 'ERROR';
    message: string;
    data?: string;
  }>>([]);
  const [showDiagnosticPanel, setShowDiagnosticPanel] = useState<boolean>(false);
  const [cameraMetrics, setCameraMetrics] = useState<{
    fps: number;
    resolution: string;
    readyState: number;
    facingMode: string;
    trackLabel: string;
    totalFrames: number;
    skippedFrames: number;
    lastDecodeDurationMs: number;
    lastDetectorUsed: string;
  }>({
    fps: 0,
    resolution: '0x0',
    readyState: 0,
    facingMode: 'environment',
    trackLabel: '',
    totalFrames: 0,
    skippedFrames: 0,
    lastDecodeDurationMs: 0,
    lastDetectorUsed: 'None',
  });

  // Structured Logger Helper for MobileScannerView
  const logMobile = useCallback(
    (
      category: 'INIT' | 'PERM' | 'CAMERA' | 'FRAME' | 'DECODE' | 'ERROR',
      message: string,
      data?: any
    ) => {
      const time = new Date().toISOString().substring(11, 23);
      const prefix = `[MobileScanner:${category}][${time}]`;
      if (category === 'ERROR') {
        console.error(prefix, message, data !== undefined ? data : '');
      } else if (category === 'DECODE') {
        console.log(
          `%c${prefix} ${message}`,
          'color: #059669; font-weight: bold; background: #ecfdf5; padding: 2px 4px; border-radius: 2px;',
          data !== undefined ? data : ''
        );
      } else if (category === 'FRAME') {
        console.debug(prefix, message, data !== undefined ? data : '');
      } else {
        console.log(
          `%c${prefix} ${message}`,
          'color: #0284c7; font-weight: 600;',
          data !== undefined ? data : ''
        );
      }

      setMobileLogs((prev) => {
        const entry = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: time,
          category,
          message,
          data: data ? (typeof data === 'object' ? JSON.stringify(data).slice(0, 160) : String(data)) : undefined,
        };
        return [entry, ...prev.slice(0, 39)];
      });
    },
    []
  );

  // Inspect camera permissions and enumerated devices with detailed mobile logging
  const inspectMobilePermissions = useCallback(async () => {
    logMobile('PERM', 'Inspecting mobile camera permissions & media devices...');
    if (navigator.permissions && (navigator.permissions as any).query) {
      try {
        const status = await (navigator.permissions as any).query({ name: 'camera' });
        logMobile('PERM', `Permissions API state: "${status.state}"`, { state: status.state });
        status.onchange = () => {
          logMobile('PERM', `Permissions API state changed to: "${status.state}"`);
        };
      } catch (err: any) {
        logMobile('PERM', `Permissions API query for 'camera' threw (standard on iOS Safari): ${err?.message || err}`);
      }
    } else {
      logMobile('PERM', 'navigator.permissions.query is unavailable on this browser platform');
    }

    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        logMobile(
          'PERM',
          `enumerateDevices found ${videoInputs.length} video input device(s)`,
          videoInputs.map((d, idx) => ({
            index: idx,
            deviceId: d.deviceId ? `${d.deviceId.substring(0, 8)}...` : '(empty)',
            label: d.label || '(requires active permission)',
          }))
        );
      } catch (enumErr: any) {
        logMobile('PERM', `enumerateDevices threw error: ${enumErr?.message || enumErr}`);
      }
    } else {
      logMobile('PERM', 'navigator.mediaDevices.enumerateDevices is unsupported');
    }
  }, [logMobile]);

  // Camera State
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'starting' | 'active' | 'error'>('idle');
  const [cameraErrorMessage, setCameraErrorMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorchSupport, setHasTorchSupport] = useState(false);

  // Scanned item state
  const [detectedCode, setDetectedCode] = useState<string | null>(null);
  const [matchedItem, setMatchedItem] = useState<InventoryItem | null>(null);
  const [restockQty, setRestockQty] = useState<number>(10);
  const [scanMode, setScanMode] = useState<'add' | 'deduct'>('add');
  const [selectedStockUnit, setSelectedStockUnit] = useState<string>('boxes');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessToast, setSyncSuccessToast] = useState<string | null>(null);

  // Persistent Scanned Items List State (survives refresh and app close)
  const [scannedHistory, setScannedHistory] = useState<ScannedItemEntry[]>(() => {
    try {
      const saved = localStorage.getItem('omnistock_scanned_items_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [showScannedListModal, setShowScannedListModal] = useState<boolean>(false);
  const [scannedListSearch, setScannedListSearch] = useState<string>('');
  const [scannedListUnitFilter, setScannedListUnitFilter] = useState<string>('All');

  // Sync scanned history from server on load to survive across browser sessions & devices
  useEffect(() => {
    const syncServerHistory = async () => {
      try {
        const res = await fetch('/api/scanner/history');
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.history) && data.history.length > 0) {
            setScannedHistory((prev) => {
              const map = new Map<string, ScannedItemEntry>();
              for (const h of data.history) {
                map.set(h.id, {
                  id: h.id,
                  sku: h.sku,
                  barcode: h.barcode || h.sku,
                  name: h.itemName || h.name,
                  category: h.category,
                  quantity: Math.abs(Number(h.addedQty ?? h.quantity ?? 1)),
                  unit: h.unit || 'boxes',
                  mode: (Number(h.addedQty) || 0) < 0 ? 'deduct' : 'add',
                  timestamp: h.timestamp || Date.now(),
                  device: h.device,
                  previousStock: h.previousStock,
                  newStock: h.newStock,
                  location: h.location,
                });
              }
              for (const p of prev) {
                if (!map.has(p.id)) map.set(p.id, p);
              }
              const combined = Array.from(map.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
              try {
                localStorage.setItem('omnistock_scanned_items_history', JSON.stringify(combined));
              } catch {}
              return combined;
            });
          }
        }
      } catch (err) {
        console.warn('Scan history server sync note:', err);
      }
    };
    syncServerHistory();
  }, []);

  const handleDeleteScannedEntry = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setScannedHistory((prev) => {
      const next = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem('omnistock_scanned_items_history', JSON.stringify(next));
      } catch {}
      return next;
    });
    try {
      await fetch(`/api/scanner/history/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch {}
  };

  const handleClearAllScannedHistory = async () => {
    if (window.confirm('Are you sure you want to remove all scanned food items from this list?')) {
      setScannedHistory([]);
      try {
        localStorage.removeItem('omnistock_scanned_items_history');
        await fetch('/api/scanner/history', { method: 'DELETE' });
      } catch {}
    }
  };

  // New Product Addition State
  const [isAddingNewProduct, setIsAddingNewProduct] = useState<boolean>(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('Pantry');
  const [newProductStock, setNewProductStock] = useState<number>(25);
  const [newProductMaxStock, setNewProductMaxStock] = useState<number>(100);
  const [newProductUnit, setNewProductUnit] = useState('kg');
  const [newProductPrice, setNewProductPrice] = useState<number>(199);
  const [newProductLocation, setNewProductLocation] = useState('Zone A-01');
  const [newProductExpiry, setNewProductExpiry] = useState('2027-12-31');

  // Automatic query parameter detection & parsing (e.g. ?sku=XYZ&action=scan)
  const parsedUrlParams = parseScannerUrlParams();
  const targetInitialSku = initialSku || parsedUrlParams.sku;
  const targetInitialAction = initialAction || parsedUrlParams.action;
  const targetInitialSession = initialSessionId || parsedUrlParams.session;
  const targetInitialQty = initialQty !== undefined && initialQty !== null ? initialQty : parsedUrlParams.qty;
  const targetInitialMode = initialMode || parsedUrlParams.mode;

  // Session ID & Automatic Server Linking State
  const [sessionId, setSessionId] = useState<string>(() => {
    return targetInitialSession || `SES-MOB-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  });
  const [hubOrigin] = useState<string>(() => {
    try {
      const url = new URL(window.location.href);
      return url.searchParams.get('hub') || parsedUrlParams.hub || '';
    } catch {
      return '';
    }
  });
  const [isLinkedToDashboard, setIsLinkedToDashboard] = useState<boolean>(false);
  const [deviceName] = useState<string>(() => {
    const ua = navigator.userAgent;
    if (/iPhone/i.test(ua)) return 'Apple iPhone';
    if (/iPad/i.test(ua)) return 'Apple iPad';
    if (/Android/i.test(ua)) return 'Android Phone';
    return 'Mobile Camera Phone';
  });

  // Instant Auto-Scan Mode: automatically registers and live-syncs scans without requiring manual form tap
  const [autoScanMode, setAutoScanMode] = useState<boolean>(true);
  const [reticleFlash, setReticleFlash] = useState<boolean>(false);
  const lastScannedCodeRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);

  // Floating Live Scan HUD Banner
  const [activeScanBanner, setActiveScanBanner] = useState<{
    sku: string;
    name: string;
    delta: number;
    newStock: number;
    unit: string;
    timestamp: number;
  } | null>(null);

  // Automatic Handshake with Server on Mount (local server and hub desktop)
  useEffect(() => {
    const connectToDashboard = async () => {
      const activeSid = sessionId || `SES-MOB-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      if (!sessionId) {
        setSessionId(activeSid);
      }

      // 1. Handshake with current host
      try {
        const res = await fetch('/api/scanner/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: activeSid,
            device: deviceName,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setIsLinkedToDashboard(true);
          }
        }
      } catch {
        setIsLinkedToDashboard(false);
      }

      // 2. Handshake with hub desktop host if separate
      if (hubOrigin && hubOrigin !== window.location.origin) {
        try {
          await fetch(`${hubOrigin}/api/scanner/connect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: activeSid,
              device: deviceName,
            }),
            mode: 'cors',
          });
          setIsLinkedToDashboard(true);
        } catch {}
      }
    };

    connectToDashboard();
  }, [sessionId, deviceName, hubOrigin]);

  // Manual entry drawer state
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  // Initialize ZXing Reader with TRY_HARDER hints and native BarcodeDetector
  useEffect(() => {
    const hints = new Map();
    hints.set(DecodeHintType.TRY_HARDER, true);
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.QR_CODE,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.ITF,
      BarcodeFormat.DATA_MATRIX,
    ]);
    readerRef.current = new BrowserMultiFormatReader(hints);

    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        (window as any).BarcodeDetector.getSupportedFormats().then((formats: string[]) => {
          barcodeDetectorRef.current = new (window as any).BarcodeDetector({
            formats: (formats && formats.length > 0) ? formats : ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a'],
          });
        }).catch(() => {
          barcodeDetectorRef.current = null;
        });
      } catch {
        barcodeDetectorRef.current = null;
      }
    }
  }, []);

  // Beep sound generator
  const playBeep = (freq: number = 880) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
  };

  // Find item by SKU, Barcode, or name
  const lookupItem = useCallback((code: string): InventoryItem | null => {
    const clean = code.trim().toUpperCase();
    if (!clean) return null;

    // 1. SKU match
    const bySku = inventory.find((i) => i.sku.toUpperCase() === clean);
    if (bySku) return bySku;

    // 2. Barcode match
    const byBarcode = inventory.find(
      (i) => (i as any).barcode && (i as any).barcode.toUpperCase() === clean
    );
    if (byBarcode) return byBarcode;

    // 3. Substring match
    const byName = inventory.find((i) => i.name.toUpperCase().includes(clean));
    if (byName) return byName;

    return null;
  }, [inventory]);

  // 1. Automatically detect & trigger initial SKU and query parameters (e.g. ?sku=XYZ&action=scan)
  useEffect(() => {
    if (targetInitialSku) {
      const found = lookupItem(targetInitialSku);
      if (found) {
        setMatchedItem(found);
        setDetectedCode(found.sku);
        setSelectedStockUnit(found.unit);
        setActiveScanBanner({
          sku: found.sku,
          name: found.name,
          delta: 0,
          newStock: found.currentStock,
          unit: found.unit,
          timestamp: Date.now(),
        });
        setSyncSuccessToast(`🎯 Scanned SKU Detected: ${found.name} (${found.sku})`);
        setTimeout(() => setSyncSuccessToast(null), 3500);
      } else {
        const fallbackItem: InventoryItem = {
          id: `item-target-${targetInitialSku}`,
          name: `Item (${targetInitialSku})`,
          sku: targetInitialSku.toUpperCase(),
          currentStock: 0,
          maxStock: 100,
          unit: 'boxes',
          price: 150,
          category: 'Pantry',
          status: 'LOW',
          expiryDate: '2027-12-31',
          imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=200&auto=format&fit=crop&q=80',
          location: 'Zone A-01',
          isScanned: true,
          scannedAt: Date.now(),
        };
        setMatchedItem(fallbackItem);
        setDetectedCode(targetInitialSku);
        setActiveScanBanner({
          sku: fallbackItem.sku,
          name: fallbackItem.name,
          delta: 0,
          newStock: 0,
          unit: 'boxes',
          timestamp: Date.now(),
        });
      }
    }

    if (targetInitialQty && targetInitialQty > 0) {
      setRestockQty(targetInitialQty);
    }
    if (targetInitialMode) {
      setScanMode(targetInitialMode);
    }
  }, [targetInitialSku, targetInitialQty, targetInitialMode, lookupItem]);

  // 2. Real-Time Syncing from Main Dashboard & Server (SSE + BroadcastChannel + Polling)
  useEffect(() => {
    const handleIncomingSync = (payload: any) => {
      if (!payload) return;

      const ev = payload.event || payload;
      const targetSku = (ev.sku || ev.barcode || payload.sku || '').toUpperCase();
      if (!targetSku) return;

      // Update matchedItem in real time if currently active in scanner
      setMatchedItem((prev) => {
        if (
          prev &&
          (prev.sku.toUpperCase() === targetSku ||
            ((prev as any).barcode && (prev as any).barcode.toUpperCase() === targetSku))
        ) {
          const delta = Number(ev.addedQty ?? payload.addedQty ?? 0);
          const updatedStock =
            typeof ev.newStock === 'number'
              ? ev.newStock
              : typeof payload.item?.currentStock === 'number'
              ? payload.item.currentStock
              : Math.max(0, prev.currentStock + delta);
          return {
            ...prev,
            currentStock: updatedStock,
            status: updatedStock <= 20 ? 'CRITICAL' : updatedStock <= 40 ? 'LOW' : 'OPTIMAL',
          };
        }
        return prev;
      });

      // Update scanned history list & show toast if coming from dashboard
      if (ev.sku && (payload.type === 'scan_event' || payload.type === 'inventory_update')) {
        const delta = Number(ev.addedQty ?? 0);
        setSyncSuccessToast(
          `⚡ Dashboard synced: ${ev.itemName || targetSku} (${delta >= 0 ? '+' : ''}${delta} ${ev.unit || 'units'})`
        );
        setTimeout(() => setSyncSuccessToast(null), 3000);
      }
    };

    // BroadcastChannel for instant local browser sync
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('omnistock_realtime');
        bc.onmessage = (e) => handleIncomingSync(e.data);
      }
    } catch {}

    // Storage event for cross-window sync
    const handleStorage = (e: StorageEvent) => {
      try {
        if (e.key === 'omnistock_live_scan' && e.newValue) {
          handleIncomingSync(JSON.parse(e.newValue));
        }
      } catch {}
    };
    window.addEventListener('storage', handleStorage);

    // SSE Stream for remote mobile phone sync
    let sse: EventSource | null = null;
    try {
      sse = new EventSource('/api/scanner/events');
      sse.onmessage = (e) => {
        try {
          handleIncomingSync(JSON.parse(e.data));
        } catch {}
      };
      sse.onerror = () => {
        if (sse) {
          sse.close();
          sse = null;
        }
      };
    } catch {}

    // Polling fallback
    let lastChecked = Date.now() - 15000;
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/scanner/updates?since=${lastChecked}`);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.events) && data.events.length > 0) {
            for (const ev of data.events) {
              if (ev.timestamp > lastChecked) {
                lastChecked = Math.max(lastChecked, ev.timestamp);
              }
              handleIncomingSync({ type: 'scan_event', event: ev });
            }
          }
        }
      } catch {}
    }, 1500);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorage);
      if (sse) sse.close();
      clearInterval(pollInterval);
    };
  }, []);

  // Instant Live Scan & Synced Stock Execution (Non-blocking, sub-100ms sync)
  const executeLiveScanUpdate = useCallback(
    async (
      rawCode: string,
      qty: number = 1,
      mode: 'add' | 'deduct' = 'add',
      source: ScannerSource = 'camera'
    ) => {
      const code = normalizeBarcode(rawCode);
      if (!isValidBarcode(code)) return;

      // Visual flash on reticle
      setReticleFlash(true);
      setTimeout(() => setReticleFlash(false), 450);

      // Sound & haptics
      playBeep(mode === 'deduct' ? 700 : 960);
      if (navigator.vibrate) {
        try {
          navigator.vibrate([60, 30, 60]);
        } catch {}
      }

      const matched = lookupItem(code);
      const targetSku = matched ? matched.sku : code;
      const targetName = matched ? matched.name : `Scanned Item (${code})`;
      const targetUnit = matched ? matched.unit : 'units';
      const delta = mode === 'deduct' ? -Math.abs(qty) : Math.abs(qty);

      const deviceLabel =
        source === 'bluetooth_hid'
          ? `${deviceName} (Wireless Bluetooth HID)`
          : source === 'usb_otg'
          ? `${deviceName} (USB OTG Scanner)`
          : source === 'manual'
          ? `${deviceName} (Manual Input)`
          : `${deviceName} (Camera Scanner)`;

      const payload = {
        sku: targetSku,
        barcode: code,
        addedQty: delta,
        mode,
        sessionId: sessionId || undefined,
        device: deviceLabel,
      };

      let updatedItemData: any = null;

      // 1. POST to local server
      try {
        const res = await fetch('/api/scanner/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.success) {
            updatedItemData = data.item;
          }
        }
      } catch (err) {
        console.warn('Local scan sync note:', err);
      }

      // 2. POST to hub desktop host if separate
      if (hubOrigin && hubOrigin !== window.location.origin) {
        try {
          await fetch(`${hubOrigin}/api/scanner/scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            mode: 'cors',
          });
        } catch (err) {
          console.warn('Hub scan sync note:', err);
        }
      }

      // 3. Update local state
      if (onItemUpdated) {
        onItemUpdated(targetSku, delta);
      }

      const calculatedNewStock = updatedItemData
        ? updatedItemData.currentStock
        : matched
        ? calculateStockTransaction(matched.currentStock, matched.maxStock, delta).newStock
        : Math.max(0, delta);

      // 4. Instant BroadcastChannel & localStorage update
      const eventId = `scan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const scanEv = {
        id: eventId,
        sku: targetSku,
        barcode: code,
        itemName: targetName,
        unit: targetUnit,
        addedQty: delta,
        newStock: calculatedNewStock,
        device: deviceLabel,
        sessionId,
        timestamp: Date.now(),
      };

      try {
        const bc = new BroadcastChannel('omnistock_realtime');
        bc.postMessage({ type: 'scan_event', event: scanEv });
        bc.close();
      } catch {}
      try {
        localStorage.setItem(
          'omnistock_live_scan',
          JSON.stringify({ type: 'scan_event', event: scanEv, timestamp: Date.now() })
        );
      } catch {}

      // Add to persistent Scanned Items List (survives refresh and app close)
      const historyEntry: ScannedItemEntry = {
        id: eventId,
        sku: targetSku,
        barcode: code,
        name: targetName,
        category: matched?.category,
        quantity: Math.abs(delta),
        unit: targetUnit,
        mode,
        timestamp: Date.now(),
        device: deviceLabel,
        previousStock: matched ? matched.currentStock : 0,
        newStock: calculatedNewStock,
        location: matched?.location,
      };

      setScannedHistory((prev) => {
        const next = [historyEntry, ...prev.filter((p) => p.id !== historyEntry.id)];
        try {
          localStorage.setItem('omnistock_scanned_items_history', JSON.stringify(next));
        } catch {}
        return next;
      });

      try {
        fetch('/api/scanner/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item: historyEntry }),
        }).catch(() => {});
      } catch {}

      // 5. Show prominent live banner HUD
      setActiveScanBanner({
        sku: targetSku,
        name: targetName,
        delta,
        newStock: calculatedNewStock,
        unit: targetUnit,
        timestamp: Date.now(),
      });
    },
    [lookupItem, sessionId, deviceName, hubOrigin, onItemUpdated]
  );

  // Barcode Detected handler with Cooldown, Normalization and Multi-Engine Support
  const handleBarcodeDetected = useCallback(
    (rawCode: string, meta?: ScanMetadata) => {
      const code = normalizeBarcode(rawCode);
      if (!isValidBarcode(code)) return;

      const source: ScannerSource = meta?.source || 'camera';
      const now = Date.now();

      // Cooldown check (prevent repeated duplicate scan within 1.2 seconds)
      if (lastScannedCodeRef.current === code.toUpperCase() && now - lastScannedTimeRef.current < 1200) {
        logMobile('FRAME', `Duplicate scan ignored: "${code}" (${now - lastScannedTimeRef.current}ms elapsed)`);
        setHardwareScanStatus((prev) => ({
          ...prev,
          status: 'blocked_duplicate',
        }));
        return;
      }
      lastScannedCodeRef.current = code.toUpperCase();
      lastScannedTimeRef.current = now;

      setDetectedCode(code);
      setHardwareScanStatus((prev) => ({
        ...prev,
        status: 'scanned',
        source,
        lastBarcode: code,
        lastTimestamp: now,
        lastDurationMs: meta?.scanDurationMs || 0,
        charCount: meta?.charCount || code.length,
        interKeyAvgMs: meta?.interKeyAvgMs || 0,
        totalScans: prev.totalScans + 1,
      }));

      logMobile('DECODE', `Barcode successfully received via ${source.toUpperCase()}: "${code}"`, {
        code,
        source,
        meta,
      });

      if (autoScanMode) {
        // INSTANT LIVE SCAN & SYNC!
        executeLiveScanUpdate(code, 1, scanMode, source);
      } else {
        // Manual review mode: pause scanner and show bottom confirmation sheet
        isScanningActiveRef.current = false;
        playBeep(source === 'bluetooth_hid' || source === 'usb_otg' ? 1046 : 920);
        if (navigator.vibrate) {
          try {
            navigator.vibrate([70, 40, 70]);
          } catch {}
        }

        const item = lookupItem(code);
        if (item) {
          setMatchedItem(item);
          setSelectedStockUnit(item.unit || 'boxes');
          setIsAddingNewProduct(false);
        } else {
          setMatchedItem(null);
          setIsAddingNewProduct(true);
          setNewProductName('');
          setNewProductCategory('Pantry');
          setNewProductStock(25);
          setNewProductMaxStock(100);
          setNewProductUnit('boxes');
          setNewProductPrice(199);
          setNewProductLocation('Zone A-01');
          setNewProductExpiry('2027-12-31');
        }
      }
    },
    [autoScanMode, executeLiveScanUpdate, scanMode, lookupItem, logMobile]
  );

  // Initialize Hardware Scanner Engine (captures Bluetooth HID, USB OTG, 2.4GHz guns globally)
  useEffect(() => {
    logMobile('INIT', 'Mounting HardwareScannerEngine for wireless Bluetooth HID and USB OTG scanners...', {
      platform: detectPlatform(),
      webBluetoothSupported: isWebBluetoothSupported(),
    });

    const engine = new HardwareScannerEngine({
      onScan: (barcode, meta) => {
        handleBarcodeDetected(barcode, meta);
      },
      onError: (err) => {
        logMobile('FRAME', `Hardware scanner notice: ${err}`);
      },
      minChars: 2,
      maxCharIntervalMs: 65,
      duplicateCooldownMs: 1200,
      enabled: true,
    });

    engine.start();
    hardwareScannerRef.current = engine;

    return () => {
      engine.stop();
      hardwareScannerRef.current = null;
    };
  }, [handleBarcodeDetected, logMobile]);

  // Direct Frame-by-Frame Decoding Loop (Native 1:1 reticle crop + BarcodeDetector)
  const runFrameDecoderLoop = useCallback(() => {
    let lastScanTimestamp = 0;
    logMobile('FRAME', 'Initializing frame decoder loop...');

    const decodeFrame = async (timestamp: number) => {
      if (!isScanningActiveRef.current) {
        scanLoopRef.current = requestAnimationFrame(decodeFrame);
        return;
      }

      // Calculate real-time FPS
      fpsFrameCountRef.current++;
      const now = performance.now();
      if (now - lastFpsTimeRef.current >= 1000) {
        const calculatedFps = Math.round((fpsFrameCountRef.current * 1000) / (now - lastFpsTimeRef.current));
        lastFpsTimeRef.current = now;
        fpsFrameCountRef.current = 0;
        setCameraMetrics((m) => ({ ...m, fps: calculatedFps }));
      }

      // Scan every 120ms for ultra-responsive detection
      if (timestamp - lastScanTimestamp >= 120) {
        lastScanTimestamp = timestamp;

        const video = videoRef.current;
        if (video && video.readyState >= 2 && video.videoWidth > 0) {
          frameCountRef.current++;

          // Heartbeat every 25 frames
          if (frameCountRef.current % 25 === 0) {
            logMobile(
              'FRAME',
              `Heartbeat (frame #${frameCountRef.current}): ${video.videoWidth}x${video.videoHeight}, readyState: ${video.readyState}, detectors: [BarcodeDetector: ${!!barcodeDetectorRef.current}, ZXing: ${!!readerRef.current}]`
            );
            setCameraMetrics((m) => ({
              ...m,
              resolution: `${video.videoWidth}x${video.videoHeight}`,
              readyState: video.readyState,
              totalFrames: frameCountRef.current,
              skippedFrames: skippedFramesCountRef.current,
            }));
          }

          let detectedText: string | null = null;
          let detectorUsed = 'None';
          let durationMs = 0;

          // 1. First attempt: Native BarcodeDetector (hardware accelerated)
          if (barcodeDetectorRef.current) {
            const t0 = performance.now();
            try {
              const barcodes = await barcodeDetectorRef.current.detect(video);
              const t1 = performance.now();
              if (barcodes && barcodes.length > 0 && barcodes[0]?.rawValue) {
                detectedText = barcodes[0].rawValue;
                detectorUsed = 'Native BarcodeDetector';
                durationMs = t1 - t0;
                logMobile(
                  'DECODE',
                  `Barcode detected via Native BarcodeDetector: "${detectedText}" (took ${durationMs.toFixed(1)}ms, format: ${barcodes[0]?.format})`,
                  { text: detectedText, format: barcodes[0]?.format, durationMs }
                );
              }
            } catch (detErr: any) {
              if (detErr?.name !== 'NotFoundException') {
                logMobile('FRAME', `Native BarcodeDetector error: ${detErr?.message || detErr}`);
              }
            }
          }

          // 2. Second attempt: ZXing decode on Reticle Center Crop (1:1 native resolution for sharp 1D barcode lines)
          if (!detectedText && canvasRef.current && readerRef.current) {
            const t0 = performance.now();
            try {
              const canvas = canvasRef.current;
              const cropWidth = Math.min(video.videoWidth, Math.max(320, Math.round(video.videoWidth * 0.72)));
              const cropHeight = Math.min(video.videoHeight, Math.max(240, Math.round(video.videoHeight * 0.52)));
              const cropX = Math.max(0, Math.round((video.videoWidth - cropWidth) / 2));
              const cropY = Math.max(0, Math.round((video.videoHeight - cropHeight) / 2));

              canvas.width = cropWidth;
              canvas.height = cropHeight;
              const ctx = canvas.getContext('2d', { willReadFrequently: true });
              if (ctx) {
                ctx.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
                const result = readerRef.current.decodeFromCanvas(canvas);
                const t1 = performance.now();
                if (result && result.getText()) {
                  detectedText = result.getText();
                  detectorUsed = 'ZXing Center-Crop';
                  durationMs = t1 - t0;
                  logMobile(
                    'DECODE',
                    `Barcode detected via ZXing Center-Crop: "${detectedText}" (took ${durationMs.toFixed(1)}ms, format: ${result.getBarcodeFormat?.()})`,
                    { text: detectedText, format: result.getBarcodeFormat?.(), durationMs }
                  );
                }
              }
            } catch {
              // Normal when no barcode in reticle box
            }
          }

          // 3. Third attempt: Full frame scan
          if (!detectedText && canvasRef.current && readerRef.current) {
            const t0 = performance.now();
            try {
              const canvas = canvasRef.current;
              const maxDim = 800;
              const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
              canvas.width = Math.round(video.videoWidth * scale);
              canvas.height = Math.round(video.videoHeight * scale);
              const ctx = canvas.getContext('2d', { willReadFrequently: true });
              if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const result = readerRef.current.decodeFromCanvas(canvas);
                const t1 = performance.now();
                if (result && result.getText()) {
                  detectedText = result.getText();
                  detectorUsed = 'ZXing Full-Frame';
                  durationMs = t1 - t0;
                  logMobile(
                    'DECODE',
                    `Barcode detected via ZXing Full-Frame: "${detectedText}" (took ${durationMs.toFixed(1)}ms)`,
                    { text: detectedText, durationMs }
                  );
                }
              }
            } catch {
              // Normal when no barcode in view
            }
          }

          if (detectedText) {
            setCameraMetrics((m) => ({
              ...m,
              lastDecodeDurationMs: durationMs,
              lastDetectorUsed: detectorUsed,
            }));
            handleBarcodeDetected(detectedText, {
              source: 'camera',
              charCount: detectedText.length,
              scanDurationMs: durationMs,
              interKeyAvgMs: 0,
            });
            // In auto-scan mode, keep decoding continuously so camera never freezes
            if (!autoScanMode) {
              return;
            }
          }
        } else {
          skippedFramesCountRef.current++;
          if (skippedFramesCountRef.current % 30 === 1) {
            logMobile(
              'FRAME',
              `Skipping frame decode: video not ready (readyState: ${video?.readyState ?? 'null'}, dim: ${video?.videoWidth ?? 0}x${video?.videoHeight ?? 0}, paused: ${video?.paused ?? 'unknown'}) [total skipped: ${skippedFramesCountRef.current}]`
            );
            setCameraMetrics((m) => ({
              ...m,
              skippedFrames: skippedFramesCountRef.current,
            }));
          }
        }
      }

      scanLoopRef.current = requestAnimationFrame(decodeFrame);
    };

    scanLoopRef.current = requestAnimationFrame(decodeFrame);
  }, [handleBarcodeDetected, autoScanMode, logMobile]);

  // Robust Camera Stream Initiator with Comprehensive Mobile Diagnostics
  const startCamera = async () => {
    try {
      setCameraStatus('starting');
      setCameraErrorMessage(null);
      logMobile('INIT', 'Starting camera acquisition...', {
        facingMode,
        isInsideIframe,
        isSecureContext: typeof window !== 'undefined' ? window.isSecureContext : false,
        protocol: typeof window !== 'undefined' ? window.location.protocol : '',
        origin: typeof window !== 'undefined' ? window.location.origin : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      });

      // Clean up previous stream and loop
      if (streamRef.current) {
        logMobile('CAMERA', 'Stopping previous active MediaStream tracks...');
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (scanLoopRef.current) {
        cancelAnimationFrame(scanLoopRef.current);
        scanLoopRef.current = null;
      }

      // Check mediaDevices support
      if (!navigator || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const errDetail = isInsideIframe
          ? 'Camera access is restricted inside this preview frame. Please tap "Open in Full Tab" above to enable your real mobile camera.'
          : 'Camera API (getUserMedia) is not available. Please ensure the app is running over HTTPS.';
        logMobile('ERROR', `mediaDevices.getUserMedia is unavailable: ${errDetail}`, {
          hasNavigator: !!navigator,
          hasMediaDevices: !!navigator?.mediaDevices,
          isSecureContext: typeof window !== 'undefined' ? window.isSecureContext : false,
        });
        throw new Error(errDetail);
      }

      // Check permissions upfront
      await inspectMobilePermissions();

      let stream: MediaStream | null = null;
      let lastErr: any = null;

      // Negotiation Tiers: Rear camera -> Standard camera -> Any video
      const constraintTiers: MediaStreamConstraints[] = [
        {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        },
        {
          video: {
            facingMode: { ideal: facingMode },
          },
          audio: false,
        },
        {
          video: { facingMode },
          audio: false,
        },
        {
          video: true,
          audio: false,
        },
      ];

      for (let i = 0; i < constraintTiers.length; i++) {
        const tier = constraintTiers[i];
        logMobile('CAMERA', `Attempting constraint tier #${i + 1}/${constraintTiers.length}...`, tier);
        try {
          stream = await navigator.mediaDevices.getUserMedia(tier);
          if (stream) {
            logMobile('CAMERA', `Successfully acquired camera stream on tier #${i + 1}!`, {
              streamId: stream.id,
              active: stream.active,
              videoTracksCount: stream.getVideoTracks().length,
            });
            break;
          }
        } catch (err: any) {
          lastErr = err;
          logMobile('CAMERA', `Tier #${i + 1} rejected: [${err?.name}] ${err?.message}`);
          // Stop trying tiers if user explicitly clicked "Block" or "Deny"
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            logMobile('PERM', 'Camera permission was explicitly blocked/denied by user or policy.');
            break;
          }
        }
      }

      if (!stream) {
        let msg = lastErr?.message || 'Could not access mobile camera.';
        if (lastErr?.name === 'NotAllowedError' || lastErr?.name === 'PermissionDeniedError') {
          msg = isInsideIframe
            ? 'Camera permission was denied or restricted by the embedded preview frame. Tap "Open in Full Tab" to launch in your browser with full camera access.'
            : 'Camera permission was blocked. Please tap "Allow" in your browser address bar to enable your camera.';
        } else if (lastErr?.name === 'NotFoundError' || lastErr?.name === 'DevicesNotFoundError') {
          msg = 'No camera found on this device.';
        } else if (lastErr?.name === 'NotReadableError' || lastErr?.name === 'TrackStartError') {
          msg = 'Camera is currently busy or being used by another app. Please close other camera tabs and try again.';
        }
        logMobile('ERROR', `All constraint tiers failed: ${msg}`, lastErr);
        throw new Error(msg);
      }

      streamRef.current = stream;

      // Check flashlight support and inspect track
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings?.() || {};
        const capabilities = (videoTrack.getCapabilities?.() as any) || {};
        logMobile('CAMERA', `Active video track: "${videoTrack.label || 'Default Camera'}"`, {
          id: videoTrack.id,
          readyState: videoTrack.readyState,
          settings,
          capabilities,
        });

        if (capabilities.torch) {
          logMobile('CAMERA', 'Flashlight / Torch capability is supported on this track');
          setHasTorchSupport(true);
        } else {
          setHasTorchSupport(false);
        }

        setCameraMetrics((m) => ({
          ...m,
          trackLabel: videoTrack.label || 'Default Mobile Camera',
          facingMode: (settings as any).facingMode || facingMode,
        }));
      }

      // Attach stream to video element
      if (videoRef.current) {
        const video = videoRef.current;
        logMobile('CAMERA', 'Configuring video element attributes & listeners...');
        video.muted = true;
        (video as any).defaultMuted = true;
        video.playsInline = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('muted', 'true');
        video.setAttribute('autoplay', 'true');

        const onLoadedMetadata = () => {
          logMobile(
            'CAMERA',
            `video event: loadedmetadata (dim: ${video.videoWidth}x${video.videoHeight}, readyState: ${video.readyState})`
          );
          setCameraMetrics((m) => ({
            ...m,
            resolution: `${video.videoWidth}x${video.videoHeight}`,
            readyState: video.readyState,
          }));
        };
        const onCanPlay = () => {
          logMobile('CAMERA', `video event: canplay (readyState: ${video.readyState})`);
        };
        const onPlaying = () => {
          logMobile('CAMERA', `video event: playing (dim: ${video.videoWidth}x${video.videoHeight}, readyState: ${video.readyState})`);
        };
        const onError = (e: any) => {
          logMobile('ERROR', `video element error: code=${video.error?.code}, message=${video.error?.message}`, e);
        };

        video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
        video.addEventListener('canplay', onCanPlay, { once: true });
        video.addEventListener('playing', onPlaying, { once: true });
        video.addEventListener('error', onError);

        video.srcObject = stream;

        logMobile('CAMERA', 'Calling video.play()...');
        try {
          await video.play();
          logMobile(
            'CAMERA',
            `video.play() resolved successfully! (dim: ${video.videoWidth}x${video.videoHeight}, readyState: ${video.readyState})`
          );
        } catch (playErr: any) {
          logMobile('ERROR', `video.play() deferred or rejected: [${playErr?.name}] ${playErr?.message}`, playErr);
        }
      } else {
        logMobile('ERROR', 'videoRef.current is null when attempting to attach stream');
      }

      setCameraStatus('active');
      isScanningActiveRef.current = true;
      runFrameDecoderLoop();
    } catch (err: any) {
      logMobile('ERROR', `Camera start failure: ${err?.message || err}`, err);
      setCameraStatus('error');
      setCameraErrorMessage(err.message || 'Failed to start camera.');
    }
  };

  // Start camera on mount or facingMode flip
  useEffect(() => {
    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (scanLoopRef.current) {
        cancelAnimationFrame(scanLoopRef.current);
        scanLoopRef.current = null;
      }
    };
  }, [facingMode]);

  // Flashlight toggle
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const next = !isTorchOn;
        await (track as any).applyConstraints({ advanced: [{ torch: next }] });
        setIsTorchOn(next);
      } catch (e) {
        console.warn('Torch toggle failed', e);
      }
    }
  };

  // Flip Camera
  const flipCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Open Full Tab Helper
  const openInFullTab = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('scanner', 'mobile');
      window.open(url.toString(), '_blank');
    } catch {
      window.open('/?scanner=mobile', '_blank');
    }
  };

  // Photo Snapshot Barcode Decoder
  const handleImageFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imgUrl = URL.createObjectURL(file);
      const reader = new BrowserMultiFormatReader();
      const result = await reader.decodeFromImageUrl(imgUrl);
      URL.revokeObjectURL(imgUrl);

      if (result && result.getText()) {
        handleBarcodeDetected(result.getText());
      } else {
        setSyncSuccessToast('⚠️ Could not detect a clear barcode in the photo. Please try again.');
        setTimeout(() => setSyncSuccessToast(null), 3000);
      }
    } catch {
      setSyncSuccessToast('⚠️ Could not read barcode from this photo. Please ensure good lighting.');
      setTimeout(() => setSyncSuccessToast(null), 3000);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Resume scanning when bottom sheet is closed
  const resumeScanning = () => {
    setMatchedItem(null);
    setIsAddingNewProduct(false);
    setDetectedCode(null);
    isScanningActiveRef.current = true;
  };

  // 1. SUBMIT REAL-TIME INVENTORY UPDATE
  const handleConfirmStockUpdate = async () => {
    if (!matchedItem || restockQty <= 0) return;

    setIsSyncing(true);
    const finalUnit = selectedStockUnit || matchedItem.unit || 'boxes';
    try {
      const qtyDelta = scanMode === 'deduct' ? -restockQty : restockQty;
      const response = await fetch('/api/scanner/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: matchedItem.sku,
          barcode: detectedCode || matchedItem.sku,
          addedQty: qtyDelta,
          unit: finalUnit,
          mode: scanMode,
          sessionId: sessionId || undefined,
          device: deviceName,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSyncSuccessToast(
          `✓ ${scanMode === 'deduct' ? 'Dispensed' : 'Restocked'} ${restockQty} ${finalUnit} of ${matchedItem.name}!`
        );

        if (onItemUpdated) {
          onItemUpdated(matchedItem.sku, qtyDelta);
        }

        const entryId = data.event?.id || `scan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const historyEntry: ScannedItemEntry = {
          id: entryId,
          sku: matchedItem.sku,
          barcode: detectedCode || matchedItem.sku,
          name: matchedItem.name,
          category: matchedItem.category,
          quantity: restockQty,
          unit: finalUnit,
          mode: scanMode,
          timestamp: Date.now(),
          device: deviceName,
          previousStock: matchedItem.currentStock,
          newStock: data.item?.currentStock ?? (matchedItem.currentStock + qtyDelta),
          location: matchedItem.location,
        };

        setScannedHistory((prev) => {
          const next = [historyEntry, ...prev.filter((p) => p.id !== historyEntry.id)];
          try {
            localStorage.setItem('omnistock_scanned_items_history', JSON.stringify(next));
          } catch {}
          return next;
        });

        try {
          fetch('/api/scanner/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ item: historyEntry }),
          }).catch(() => {});
        } catch {}

        // Instant local cross-tab / window sync
        try {
          const bc = new BroadcastChannel('omnistock_realtime');
          bc.postMessage({
            type: 'scan_event',
            event: data.event || {
              id: entryId,
              sku: matchedItem.sku,
              barcode: detectedCode || matchedItem.sku,
              itemName: matchedItem.name,
              unit: finalUnit,
              addedQty: qtyDelta,
              newStock: data.item?.currentStock,
              device: deviceName,
              timestamp: Date.now(),
            },
          });
          bc.close();
        } catch {}
        try {
          localStorage.setItem(
            'omnistock_live_scan',
            JSON.stringify({
              event: data.event || {
                id: entryId,
                sku: matchedItem.sku,
                barcode: detectedCode || matchedItem.sku,
                itemName: matchedItem.name,
                unit: finalUnit,
                addedQty: qtyDelta,
                newStock: data.item?.currentStock,
                device: deviceName,
                timestamp: Date.now(),
              },
              timestamp: Date.now(),
            })
          );
        } catch {}

        setTimeout(() => {
          setSyncSuccessToast(null);
          resumeScanning();
          setIsSyncing(false);
        }, 1400);
      } else {
        setSyncSuccessToast(`⚠️ ${data.error || 'Sync failed'}`);
        setTimeout(() => setSyncSuccessToast(null), 3000);
        setIsSyncing(false);
      }
    } catch {
      if (onItemUpdated) {
        onItemUpdated(matchedItem.sku, scanMode === 'deduct' ? -restockQty : restockQty);
      }
      setSyncSuccessToast(`✓ Updated stock locally & broadcasted.`);
      setTimeout(() => {
        setSyncSuccessToast(null);
        resumeScanning();
        setIsSyncing(false);
      }, 1400);
    }
  };

  // 2. SUBMIT REAL-TIME PRODUCT ADDITION
  const handleConfirmAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) {
      setSyncSuccessToast('⚠️ Please enter a product name.');
      setTimeout(() => setSyncSuccessToast(null), 3000);
      return;
    }

    setIsSyncing(true);
    const finalSku = detectedCode?.trim() || `SKU-${Date.now().toString().slice(-6)}`;

    try {
      const response = await fetch('/api/products/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProductName.trim(),
          sku: finalSku,
          barcode: finalSku,
          category: newProductCategory,
          currentStock: newProductStock,
          maxStock: newProductMaxStock,
          unit: newProductUnit,
          price: newProductPrice,
          location: newProductLocation,
          expiryDate: newProductExpiry,
          sessionId: sessionId || undefined,
          device: deviceName,
        }),
      });

      const data = await response.json();
      if (data.success && data.product) {
        playBeep(1100);
        setSyncSuccessToast(
          `✓ Added "${data.product.name}" (${data.product.sku}) with ${newProductStock} ${newProductUnit} to warehouse catalog!`
        );

        if (onProductAdded) {
          onProductAdded(data.product);
        }

        const addEntryId = data.event?.id || `add-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const addHistoryEntry: ScannedItemEntry = {
          id: addEntryId,
          sku: finalSku,
          barcode: finalSku,
          name: newProductName.trim(),
          category: newProductCategory,
          quantity: newProductStock,
          unit: newProductUnit,
          mode: 'new',
          timestamp: Date.now(),
          device: deviceName,
          previousStock: 0,
          newStock: newProductStock,
          location: newProductLocation,
        };

        setScannedHistory((prev) => {
          const next = [addHistoryEntry, ...prev.filter((p) => p.id !== addHistoryEntry.id)];
          try {
            localStorage.setItem('omnistock_scanned_items_history', JSON.stringify(next));
          } catch {}
          return next;
        });

        try {
          fetch('/api/scanner/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ item: addHistoryEntry }),
          }).catch(() => {});
        } catch {}

        // Instant local cross-tab / window sync
        try {
          const bc = new BroadcastChannel('omnistock_realtime');
          bc.postMessage({
            type: 'product_added',
            product: data.product,
            device: deviceName,
          });
          bc.close();
        } catch {}
        try {
          localStorage.setItem(
            'omnistock_live_product',
            JSON.stringify({
              product: data.product,
              device: deviceName,
              timestamp: Date.now(),
            })
          );
        } catch {}

        setTimeout(() => {
          setSyncSuccessToast(null);
          resumeScanning();
          setIsSyncing(false);
        }, 1500);
      } else {
        setSyncSuccessToast(`⚠️ ${data.error || 'Failed to add product.'}`);
        setTimeout(() => setSyncSuccessToast(null), 3000);
        setIsSyncing(false);
      }
    } catch {
      const fallbackItem: InventoryItem = {
        id: `item-${Date.now()}`,
        name: newProductName.trim(),
        sku: finalSku,
        category: newProductCategory,
        currentStock: newProductStock,
        maxStock: newProductMaxStock,
        unit: newProductUnit,
        price: newProductPrice,
        location: newProductLocation,
        expiryDate: newProductExpiry,
        daysToExpiry: 450,
        status: newProductStock > newProductMaxStock * 0.4 ? 'OPTIMAL' : 'LOW',
        imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=300&h=300',
      };

      if (onProductAdded) {
        onProductAdded(fallbackItem);
      }

      setSyncSuccessToast(`✓ Added "${fallbackItem.name}" to inventory.`);
      setTimeout(() => {
        setSyncSuccessToast(null);
        resumeScanning();
        setIsSyncing(false);
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col font-sans select-none overflow-hidden">
      {/* Hidden Native File Input for Fallback Photo Capture */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageFileScan}
        className="hidden"
      />

      {/* Hidden Offscreen Canvas for Frame Decoding */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Invisible Wireless HID Scanner Proxy Input (Suppresses mobile soft keyboard) */}
      <input
        ref={hiddenInputRef}
        type="text"
        inputMode="none"
        tabIndex={-1}
        aria-hidden="true"
        data-scanner-input="true"
        className="sr-only opacity-0 w-0 h-0 pointer-events-none absolute"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
      />

      {/* IFrame Advisory Banner */}
      {isInsideIframe && (
        <div className="bg-amber-500/90 text-slate-950 px-3 py-1.5 text-[11px] font-mono font-bold flex items-center justify-between gap-2 z-30 shrink-0">
          <div className="flex items-center gap-1.5 truncate">
            <span className="material-symbols-outlined text-[15px]">info</span>
            <span className="truncate">Preview Frame Mode: For real camera access, launch in full tab</span>
          </div>
          <button
            onClick={openInFullTab}
            className="px-2 py-0.5 bg-slate-950 text-white rounded text-[10px] uppercase font-bold shrink-0 hover:bg-slate-800 cursor-pointer flex items-center gap-1"
          >
            <span>Open Tab</span>
            <span className="material-symbols-outlined text-[12px]">open_in_new</span>
          </button>
        </div>
      )}

      {/* Top Mobile Scanner Bar */}
      <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3.5 py-2.5 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToApp}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer active:scale-95"
            title="Exit to Dashboard"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs sm:text-sm text-white tracking-tight">OmniStock Scanner</span>
              <span className={`w-2 h-2 rounded-full ${cameraStatus === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 font-medium">
              🟢 Real-Time Sync &amp; Addition
            </span>
          </div>
        </div>

        {/* Camera & Product Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Instant Auto-Sync toggle */}
          <button
            onClick={() => setAutoScanMode(!autoScanMode)}
            className={`px-2 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
              autoScanMode
                ? 'bg-emerald-500 text-slate-950 shadow-xs'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Auto-Sync Mode: Instantly syncs scans without confirmation popup"
          >
            <span className="material-symbols-outlined text-[15px]">{autoScanMode ? 'bolt' : 'touch_app'}</span>
            <span className="hidden xs:inline">{autoScanMode ? 'Auto: ON' : 'Manual'}</span>
          </button>

          {/* + Add New Product Button */}
          <button
            onClick={() => {
              setDetectedCode(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
              setMatchedItem(null);
              setIsAddingNewProduct(true);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-mono font-bold flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs"
            title="Add New Product to Inventory"
          >
            <span className="material-symbols-outlined text-[16px]">add_box</span>
            <span>+ Product</span>
          </button>

          {/* Scanned Items Stored List Button */}
          <button
            onClick={() => setShowScannedListModal(true)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs border border-slate-700 relative"
            title="View & Manage Persisted Scanned Items"
          >
            <span className="material-symbols-outlined text-[16px] text-emerald-400">receipt_long</span>
            <span className="hidden sm:inline">Scanned List</span>
            <span className="sm:hidden">List</span>
            {scannedHistory.length > 0 && (
              <span className="px-1.5 py-0.2 bg-emerald-500 text-slate-950 font-extrabold text-[10px] rounded-full">
                {scannedHistory.length}
              </span>
            )}
          </button>

          {/* Flashlight toggle */}
          {hasTorchSupport && (
            <button
              onClick={toggleTorch}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                isTorchOn ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}
              title="Toggle Flashlight"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isTorchOn ? 'flash_on' : 'flash_off'}
              </span>
            </button>
          )}

          {/* Flip Camera */}
          <button
            onClick={flipCamera}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
            title="Flip Front / Rear Camera"
          >
            <span className="material-symbols-outlined text-[18px]">flip_camera_ios</span>
          </button>

          {/* Snap Photo Fallback */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
            title="Snap Photo of Barcode"
          >
            <span className="material-symbols-outlined text-[18px]">photo_camera</span>
          </button>

          {/* Diagnostics Button */}
          <button
            onClick={() => setShowDiagnosticPanel(!showDiagnosticPanel)}
            className={`px-2 py-1.5 rounded-xl text-xs font-mono font-bold transition-colors cursor-pointer flex items-center gap-1 ${
              showDiagnosticPanel ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
            title="View Live Camera Diagnostics & Frame Logs"
          >
            <span className="material-symbols-outlined text-[16px]">bug_report</span>
            <span className="hidden xs:inline">Logs</span>
          </button>

          {/* Manual SKU input drawer toggle */}
          <button
            onClick={() => setShowManualInput(!showManualInput)}
            className={`px-2 py-1.5 rounded-xl text-xs font-mono font-bold transition-colors cursor-pointer flex items-center gap-1 ${
              showManualInput ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'
            }`}
            title="Type SKU or Barcode"
          >
            <span className="material-symbols-outlined text-[15px]">keyboard</span>
          </button>
        </div>
      </header>

      {/* Real-time Server Link Status Bar */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-3.5 py-1.5 flex items-center justify-between text-[11px] font-mono z-20 shrink-0">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isLinkedToDashboard ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isLinkedToDashboard ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          </span>
          <span className="text-slate-200">
            {isLinkedToDashboard
              ? `Linked to Warehouse Server (${sessionId || 'Live'})`
              : 'Connecting to Warehouse Server...'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Wireless Scanner Status Indicator */}
          <button
            onClick={() => setShowDiagnosticPanel(true)}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800/90 border border-slate-700 text-[10px] cursor-pointer hover:border-cyan-500 transition-colors"
            title="Wireless Bluetooth HID / USB OTG Scanner Listener"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${hardwareScanStatus.status === 'scanned' ? 'bg-emerald-400 animate-ping' : 'bg-cyan-400 animate-pulse'}`}></span>
            <span className="text-cyan-300 font-bold">
              {hardwareScanStatus.lastBarcode ? `HID: ${hardwareScanStatus.lastBarcode}` : 'HID Active'}
            </span>
          </button>

          <button
            onClick={() => setShowDiagnosticPanel(true)}
            className="text-[10px] text-amber-300 bg-amber-950/70 border border-amber-700/60 hover:bg-amber-900 px-2 py-0.5 rounded cursor-pointer transition-colors"
          >
            Diagnostics ({mobileLogs.length})
          </button>
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider bg-emerald-950/80 border border-emerald-700/60 px-2 py-0.5 rounded">
            Real-Time Sync
          </span>
        </div>
      </div>

      {/* Live Stream Telemetry Strip */}
      <div className="bg-slate-950/95 border-b border-slate-850 px-3.5 py-1 flex items-center justify-between text-[10px] font-mono text-slate-400 z-20 shrink-0 overflow-x-auto whitespace-nowrap">
        <div className="flex items-center gap-2">
          <span className="text-slate-200">📹 {cameraMetrics.resolution}</span>
          <span className="text-slate-600">•</span>
          <span className="text-emerald-400 font-semibold">{cameraMetrics.fps} FPS</span>
          <span className="text-slate-600">•</span>
          <span>State: {cameraMetrics.readyState}</span>
          <span className="text-slate-600">•</span>
          <span>Frames: {cameraMetrics.totalFrames}</span>
          {cameraMetrics.skippedFrames > 0 && (
            <>
              <span className="text-slate-600">•</span>
              <span className="text-amber-400">Skipped: {cameraMetrics.skippedFrames}</span>
            </>
          )}
        </div>
        <span className="text-[9px] text-slate-400">
          Engine: {cameraMetrics.lastDetectorUsed}
        </span>
      </div>

      {/* Manual Input Drawer */}
      <AnimatePresence>
        {showManualInput && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 z-20 flex gap-2 shrink-0"
          >
            <input
              type="text"
              placeholder="Enter SKU or Barcode (e.g. RIC-BAS-500, NEW-ITEM)..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && manualCode) {
                  handleBarcodeDetected(manualCode);
                  setManualCode('');
                  setShowManualInput(false);
                }
              }}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={() => {
                if (manualCode) {
                  handleBarcodeDetected(manualCode);
                  setManualCode('');
                  setShowManualInput(false);
                }
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-mono font-bold cursor-pointer transition-colors"
            >
              Scan
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Viewfinder Section */}
      <div className="relative flex-1 bg-black overflow-hidden flex flex-col items-center justify-center">
        {/* Real Mobile Camera Video Element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-300 ${
            cameraStatus === 'active' ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Camera Inactive / Error Fallback Screen */}
        {cameraStatus !== 'active' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 bg-slate-950/95 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 mb-4 shadow-xl">
              <span className="material-symbols-outlined text-[34px]">
                {cameraStatus === 'starting' ? 'autorenew' : 'photo_camera'}
              </span>
            </div>

            <h3 className="text-base font-bold text-white mb-1.5">
              {cameraStatus === 'starting' ? 'Connecting to Camera...' : 'Camera Access'}
            </h3>

            <p className="text-xs text-slate-400 max-w-sm mb-5 font-mono leading-relaxed">
              {cameraErrorMessage ||
                'Tap "Start Camera" to enable barcode scanning, or take a photo of any barcode.'}
            </p>

            <div className="flex flex-col gap-2.5 w-full max-w-xs">
              <button
                onClick={startCamera}
                disabled={cameraStatus === 'starting'}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-mono text-xs font-bold rounded-xl shadow-lg cursor-pointer flex items-center justify-center gap-2 transition-all"
              >
                <span className={`material-symbols-outlined text-[18px] ${cameraStatus === 'starting' ? 'animate-spin' : ''}`}>
                  {cameraStatus === 'starting' ? 'refresh' : 'videocam'}
                </span>
                <span>{cameraStatus === 'starting' ? 'STARTING...' : 'START CAMERA'}</span>
              </button>

              {isInsideIframe && (
                <button
                  onClick={openInFullTab}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-mono text-xs font-bold rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2 transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                  <span>OPEN IN FULL TAB / WINDOW</span>
                </button>
              )}

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">add_a_photo</span>
                <span>Take Photo / Upload Barcode</span>
              </button>

              <button
                onClick={() => setShowManualInput(true)}
                className="w-full py-1.5 bg-transparent text-slate-400 hover:text-white font-mono text-xs cursor-pointer"
              >
                Enter Barcode / SKU Manually
              </button>
            </div>
          </div>
        )}

        {/* Reticle / HUD Scanning Box */}
        {cameraStatus === 'active' && (
          <div className="relative z-10 flex flex-col items-center justify-center pointer-events-none">
            <div
              className={`relative w-64 h-64 sm:w-72 sm:h-72 rounded-3xl border transition-all duration-200 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] backdrop-blur-[0.5px] overflow-hidden ${
                reticleFlash
                  ? 'border-emerald-400 bg-emerald-500/20 shadow-[0_0_35px_#10b981]'
                  : 'border-white/20'
              }`}
            >
              {/* Animated Laser Scanning Line */}
              <motion.div
                animate={{ y: ['0%', '100%', '0%'] }}
                transition={{ repeat: Infinity, duration: 2.0, ease: 'easeInOut' }}
                className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399]"
              />

              {/* Glowing Corner Accents */}
              <div className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-emerald-400 rounded-tl-2xl"></div>
              <div className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-emerald-400 rounded-tr-2xl"></div>
              <div className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-emerald-400 rounded-bl-2xl"></div>
              <div className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-emerald-400 rounded-br-2xl"></div>

              {/* Centered Guide Crosshair */}
              <div className="absolute inset-0 flex items-center justify-center opacity-30">
                <div className="w-8 h-0.5 bg-white"></div>
                <div className="h-8 w-0.5 bg-white absolute"></div>
              </div>
            </div>

            <div className="mt-3 px-3.5 py-1 rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-700 text-[11px] font-mono text-slate-200 flex items-center gap-2 pointer-events-auto">
              <span
                className={`w-2 h-2 rounded-full ${
                  autoScanMode ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                }`}
              ></span>
              <span>
                {autoScanMode
                  ? '⚡ Instant Auto-Sync Active (Point & Sync)'
                  : 'Manual Review Mode (Tap to Confirm)'}
              </span>
            </div>
          </div>
        )}

        {/* Instant Live Scan Card (Floating HUD) */}
        <AnimatePresence>
          {activeScanBanner && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-16 left-3 right-3 z-30 bg-slate-900/95 border-2 border-emerald-500 rounded-2xl p-3 shadow-2xl backdrop-blur-md max-w-sm mx-auto pointer-events-auto"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-emerald-400 text-[18px]">cloud_done</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    ⚡ LIVE SYNCED (+{activeScanBanner.delta >= 0 ? activeScanBanner.delta : Math.abs(activeScanBanner.delta)})
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  {new Date(activeScanBanner.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-2">
                <div className="truncate font-bold text-sm text-white">{activeScanBanner.name}</div>
                <div className="font-mono text-xs text-slate-400 shrink-0">SKU: {activeScanBanner.sku}</div>
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 mt-2 pt-1.5 border-t border-slate-800">
                <span>
                  Warehouse Stock:{' '}
                  <strong className="text-emerald-300 font-bold">
                    {activeScanBanner.newStock} {activeScanBanner.unit}
                  </strong>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => executeLiveScanUpdate(activeScanBanner.sku, 5, 'add')}
                    className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white rounded text-[10px] font-bold cursor-pointer transition-transform"
                    title="Add 5 more"
                  >
                    +5
                  </button>
                  <button
                    onClick={() => executeLiveScanUpdate(activeScanBanner.sku, 1, 'deduct')}
                    className="px-2 py-0.5 bg-rose-800 hover:bg-rose-700 active:scale-95 text-white rounded text-[10px] font-bold cursor-pointer transition-transform"
                    title="Dispense 1"
                  >
                    -1
                  </button>
                  <button
                    onClick={() => setActiveScanBanner(null)}
                    className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-white cursor-pointer ml-1"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scanned Items Persistent Counter Bar */}
        {scannedHistory.length > 0 && (
          <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between bg-slate-900/90 backdrop-blur-md border border-emerald-500/40 rounded-2xl px-3.5 py-2 shadow-xl">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
              <span className="text-xs font-mono font-bold text-white truncate">
                📋 {scannedHistory.length} Scanned Food Item{scannedHistory.length > 1 ? 's' : ''} Stored
              </span>
            </div>
            <button
              onClick={() => setShowScannedListModal(true)}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-mono font-bold cursor-pointer transition-all flex items-center gap-1 shrink-0 shadow-xs"
            >
              <span>View List</span>
              <span className="material-symbols-outlined text-[15px]">chevron_right</span>
            </button>
          </div>
        )}

        {/* Quick Interactive Barcode Tester Bar (Works even without webcam!) */}
        <div className="absolute bottom-3 left-0 right-0 z-20 flex items-center justify-center gap-1.5 px-3 overflow-x-auto py-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase font-bold shrink-0 hidden sm:inline">
            ⚡ 1-Tap Sync Test:
          </span>
          {inventory.slice(0, 4).map((item) => (
            <button
              key={item.sku}
              onClick={() => {
                if (autoScanMode) {
                  executeLiveScanUpdate(item.sku, 1, scanMode);
                } else {
                  handleBarcodeDetected(item.sku);
                }
              }}
              className="shrink-0 px-2.5 py-1.5 bg-slate-900/90 hover:bg-emerald-900/90 active:scale-95 border border-slate-700 rounded-xl text-[10px] font-mono text-slate-200 hover:text-white transition-all cursor-pointer backdrop-blur-md flex items-center gap-1 shadow-md"
            >
              <span className="material-symbols-outlined text-[13px] text-emerald-400">bolt</span>
              <span>{item.sku}</span>
            </button>
          ))}
          <button
            onClick={() => {
              const testSku = `NEW-${Math.floor(100 + Math.random() * 900)}`;
              if (autoScanMode) {
                executeLiveScanUpdate(testSku, 1, 'add');
              } else {
                handleBarcodeDetected(testSku);
              }
            }}
            className="shrink-0 px-2.5 py-1.5 bg-emerald-950/90 hover:bg-emerald-900 active:scale-95 border border-emerald-500 rounded-xl text-[10px] font-mono text-emerald-300 hover:text-white transition-all cursor-pointer backdrop-blur-md flex items-center gap-1 shadow-md"
          >
            <span className="material-symbols-outlined text-[13px]">add_box</span>
            <span>+ Test New Barcode</span>
          </button>
        </div>
      </div>

      {/* 1. BOTTOM SHEET: REAL-TIME UPDATION (EXISTING ITEM) */}
      <AnimatePresence>
        {matchedItem && !isAddingNewProduct && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-700 rounded-t-3xl p-5 shadow-2xl flex flex-col gap-3.5 text-white max-w-lg mx-auto"
          >
            <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto -mt-1"></div>

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={matchedItem.imageUrl}
                  alt={matchedItem.name}
                  className="w-14 h-14 rounded-2xl object-cover border border-slate-700 bg-slate-800 shrink-0"
                />
                <div>
                  <h3 className="text-base font-bold text-white leading-snug">
                    {translateRecordedItem(matchedItem.name, currentLang)}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                      SKU: {matchedItem.sku}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Loc: {matchedItem.location || 'Zone A-01'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={resumeScanning}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Current Stock Bar */}
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex flex-col gap-1.5">
              <div className="flex justify-between items-baseline text-xs font-mono">
                <span className="text-slate-400">Current Stock:</span>
                <span className="font-bold text-white text-sm">
                  {matchedItem.currentStock} / {matchedItem.maxStock} {translateRecordedUnit(matchedItem.unit, currentLang)}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (matchedItem.currentStock / matchedItem.maxStock) * 100)}%` }}
                />
              </div>
            </div>

            {/* Mode: Restock (+) vs Dispense (-) */}
            <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setScanMode('add')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  scanMode === 'add' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                <span>Restock / Inbound (+)</span>
              </button>
              <button
                onClick={() => setScanMode('deduct')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  scanMode === 'deduct' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">remove_circle</span>
                <span>Dispense / Outbound (-)</span>
              </button>
            </div>

            {/* Packaging Unit Selector (Box, Barrel, Crate, Carton, Drum, Sack, etc.) */}
            <div className="flex flex-col gap-1.5 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-300 font-semibold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-emerald-400">
                    {getUnitIcon(selectedStockUnit)}
                  </span>
                  <span>Packaging Unit:</span>
                </span>
                <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded capitalize">
                  {selectedStockUnit}
                </span>
              </div>

              {/* Quick Packaging Unit Badges */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { id: 'boxes', label: 'Box', icon: 'inventory_2' },
                  { id: 'barrels', label: 'Barrel', icon: 'oil_barrel' },
                  { id: 'crates', label: 'Crate', icon: 'grid_view' },
                  { id: 'cartons', label: 'Carton', icon: 'all_inbox' },
                  { id: 'drums', label: 'Drum', icon: 'propane_tank' },
                  { id: 'sacks', label: 'Sack', icon: 'shopping_bag' },
                  { id: 'pallets', label: 'Pallet', icon: 'table_rows' },
                  { id: 'cases', label: 'Case', icon: 'package_2' },
                  { id: 'bags', label: 'Bag', icon: 'shopping_bag' },
                  { id: 'tins', label: 'Tin', icon: 'takeout_dining' },
                  { id: 'bottles', label: 'Bottle', icon: 'water_bottle' },
                  { id: 'jars', label: 'Jar', icon: 'nutrition' },
                  { id: 'kg', label: 'Kg', icon: 'scale' },
                  { id: 'liters', label: 'Liters', icon: 'opacity' },
                  { id: 'units', label: 'Units', icon: 'filter_frames' },
                ].map((u) => {
                  const isSelected = selectedStockUnit.toLowerCase().includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setSelectedStockUnit(u.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium shrink-0 flex items-center gap-1 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px]">{u.icon}</span>
                      <span>{u.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Unit Input / Full Dropdown */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-900">
                <select
                  value={COMMON_QUANTITY_UNITS.some((u) => u.id === selectedStockUnit) ? selectedStockUnit : 'custom'}
                  onChange={(e) => {
                    if (e.target.value !== 'custom') {
                      setSelectedStockUnit(e.target.value);
                    }
                  }}
                  className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono rounded-lg px-2 py-1 outline-none flex-1"
                >
                  <optgroup label="Bulk Packaging">
                    <option value="boxes">📦 Boxes (box)</option>
                    <option value="barrels">🛢️ Barrels (bbl)</option>
                    <option value="crates">🧺 Crates (crt)</option>
                    <option value="cartons">📦 Cartons (ctn)</option>
                    <option value="drums">🛢️ Drums (drm)</option>
                    <option value="sacks">🛍️ Sacks (sck)</option>
                    <option value="pallets">🪵 Pallets (plt)</option>
                    <option value="cases">📦 Cases (cs)</option>
                  </optgroup>
                  <optgroup label="Containers">
                    <option value="bags">🛍️ Bags (bag)</option>
                    <option value="tins">🥫 Tins (tin)</option>
                    <option value="bottles">🍾 Bottles (btl)</option>
                    <option value="jars">🫙 Jars (jar)</option>
                  </optgroup>
                  <optgroup label="Weights & Volumes">
                    <option value="kg">⚖️ Kilograms (kg)</option>
                    <option value="liters">💧 Liters (L)</option>
                    <option value="units">🏷️ Units (pcs)</option>
                  </optgroup>
                  <option value="custom">✏️ Custom Unit...</option>
                </select>
                <input
                  type="text"
                  placeholder="Or custom unit..."
                  value={selectedStockUnit}
                  onChange={(e) => setSelectedStockUnit(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono rounded-lg px-2 py-1 w-28 outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Quantity Stepper & Quick Pills */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">
                  Select Quantity ({selectedStockUnit}):
                </span>
                <div className="flex items-center gap-1">
                  {[1, 5, 10, 25, 50].map((qty) => (
                    <button
                      key={qty}
                      onClick={() => setRestockQty(qty)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold cursor-pointer transition-colors ${
                        restockQty === qty ? 'bg-white text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      +{qty}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setRestockQty((q) => Math.max(1, q - 1))}
                  className="w-11 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center text-xl font-bold cursor-pointer active:scale-95"
                >
                  -
                </button>
                <div className="flex-1 flex items-center bg-slate-950 border border-slate-700 rounded-xl px-3 h-11 focus-within:border-emerald-500">
                  <input
                    type="number"
                    min="1"
                    value={restockQty}
                    onChange={(e) => setRestockQty(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-transparent text-center text-lg font-mono font-bold text-white focus:outline-none"
                  />
                  <span className="text-xs font-mono text-slate-400 shrink-0 ml-1">
                    {selectedStockUnit}
                  </span>
                </div>
                <button
                  onClick={() => setRestockQty((q) => q + 1)}
                  className="w-11 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center text-xl font-bold cursor-pointer active:scale-95"
                >
                  +
                </button>
              </div>
            </div>

            {/* Confirm & Sync Button */}
            <button
              onClick={handleConfirmStockUpdate}
              disabled={isSyncing}
              className={`w-full py-3.5 rounded-2xl font-mono text-xs sm:text-sm font-bold text-white shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 ${
                scanMode === 'deduct' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
              } ${isSyncing ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSyncing ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                  <span>SYNCING LIVE TO WAREHOUSE...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">
                    {scanMode === 'deduct' ? 'remove_shopping_cart' : 'inventory_2'}
                  </span>
                  <span>
                    {scanMode === 'deduct' ? 'CONFIRM DISPENSE' : 'CONFIRM RESTOCK'} &amp; REAL-TIME SYNC
                  </span>
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. BOTTOM SHEET: REAL-TIME ADDITION OF NEW PRODUCTS */}
      <AnimatePresence>
        {isAddingNewProduct && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-emerald-500/40 rounded-t-3xl p-5 shadow-2xl flex flex-col gap-3 text-white max-w-lg mx-auto max-h-[85vh] overflow-y-auto"
          >
            <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto -mt-1"></div>

            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold">
                    NEW BARCODE DETECTED
                  </span>
                  <span className="text-xs font-mono text-slate-400">Live Sync</span>
                </div>
                <h3 className="text-base font-bold text-white mt-1">Add Product to Inventory</h3>
                <p className="text-xs text-slate-400 font-mono">
                  Barcode/SKU: <span className="text-emerald-400 font-bold">{detectedCode}</span>
                </p>
              </div>

              <button
                onClick={resumeScanning}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleConfirmAddProduct} className="flex flex-col gap-3">
              {/* Product Name */}
              <div>
                <label className="block text-[11px] font-mono text-slate-300 font-semibold mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pure Mustard Oil, Premium Cashews..."
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Category & Unit in 2 columns */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-mono text-slate-300 font-semibold mb-1">
                    Category
                  </label>
                  <select
                    value={newProductCategory}
                    onChange={(e) => setNewProductCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Pantry">Pantry</option>
                    <option value="Dry Goods">Dry Goods</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Spices">Spices</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Produce">Produce</option>
                    <option value="Frozen">Frozen</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-300 font-semibold mb-1">
                    Packaging Unit
                  </label>
                  <select
                    value={newProductUnit}
                    onChange={(e) => setNewProductUnit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  >
                    <optgroup label="Bulk Packaging Units">
                      <option value="boxes">📦 Boxes (box)</option>
                      <option value="barrels">🛢️ Barrels (bbl)</option>
                      <option value="crates">🧺 Crates (crt)</option>
                      <option value="cartons">📦 Cartons (ctn)</option>
                      <option value="drums">🛢️ Drums (drm)</option>
                      <option value="sacks">🛍️ Sacks (sck)</option>
                      <option value="pallets">🪵 Pallets (plt)</option>
                      <option value="cases">📦 Cases (cs)</option>
                    </optgroup>
                    <optgroup label="Consumer Packaging & Containers">
                      <option value="bags (1kg)">🛍️ Bags (1kg)</option>
                      <option value="tins (1L)">🥫 Tins (1L)</option>
                      <option value="bottles (750ml)">🍾 Bottles (750ml)</option>
                      <option value="packs (500g)">📦 Packs (500g)</option>
                      <option value="blocks (500g)">🧈 Blocks (500g)</option>
                      <option value="jars">🫙 Jars</option>
                    </optgroup>
                    <optgroup label="Weight & Volume">
                      <option value="kg">⚖️ Kilograms (kg)</option>
                      <option value="liters">💧 Liters (L)</option>
                      <option value="units">🏷️ Units / Pieces</option>
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Quick Packaging Unit Badges for New Product */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none -mt-1">
                {[
                  { id: 'boxes', label: 'Box', icon: 'inventory_2' },
                  { id: 'barrels', label: 'Barrel', icon: 'oil_barrel' },
                  { id: 'crates', label: 'Crate', icon: 'grid_view' },
                  { id: 'cartons', label: 'Carton', icon: 'all_inbox' },
                  { id: 'drums', label: 'Drum', icon: 'propane_tank' },
                  { id: 'sacks', label: 'Sack', icon: 'shopping_bag' },
                ].map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setNewProductUnit(u.id)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-mono shrink-0 flex items-center gap-1 transition-all cursor-pointer ${
                      newProductUnit === u.id
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[12px]">{u.icon}</span>
                    <span>{u.label}</span>
                  </button>
                ))}
              </div>

              {/* Initial Stock & Max Capacity */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-mono text-slate-300 font-semibold mb-1">
                    Initial Stock Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newProductStock}
                    onChange={(e) => setNewProductStock(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-300 font-semibold mb-1">
                    Max Warehouse Buffer
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newProductMaxStock}
                    onChange={(e) => setNewProductMaxStock(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Price & Location */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-mono text-slate-300 font-semibold mb-1">
                    Unit Price (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newProductPrice}
                    onChange={(e) => setNewProductPrice(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-300 font-semibold mb-1">
                    Storage Location
                  </label>
                  <input
                    type="text"
                    value={newProductLocation}
                    onChange={(e) => setNewProductLocation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Submit Add Product Button */}
              <button
                type="submit"
                disabled={isSyncing}
                className="mt-1 w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-mono text-xs sm:text-sm font-bold shadow-xl flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
              >
                {isSyncing ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                    <span>ADDING &amp; BROADCASTING TO APP...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">add_task</span>
                    <span>SAVE &amp; ADD PRODUCT TO MAIN APP</span>
                  </>
                )}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. PERSISTENT SCANNED FOOD ITEMS LIST MODAL (Survives Refresh & App Restart) */}
      <AnimatePresence>
        {showScannedListModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="bg-slate-900 border border-slate-700/80 rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-white"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-slate-800 flex items-start justify-between gap-3 bg-slate-900/90 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-[24px]">receipt_long</span>
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      Scanned Food Items List
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {scannedHistory.length} stored
                    </span>
                  </div>
                  <p className="text-xs font-mono text-slate-400 mt-1">
                    All scanned food items are automatically stored and persist across app refreshes &amp; device restarts.
                  </p>
                </div>
                <button
                  onClick={() => setShowScannedListModal(false)}
                  className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors shrink-0 active:scale-95"
                  title="Close List"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Search & Unit Filters Toolbar */}
              <div className="p-3 sm:p-4 border-b border-slate-800/80 bg-slate-950/60 flex flex-col gap-2.5 shrink-0">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Search by food item name, SKU, or barcode..."
                    value={scannedListSearch}
                    onChange={(e) => setScannedListSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-8 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  {scannedListSearch && (
                    <button
                      onClick={() => setScannedListSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-mono cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Packaging Unit Quick Filter */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                  <span className="text-[11px] font-mono text-slate-400 uppercase mr-1 shrink-0 font-semibold">
                    Unit:
                  </span>
                  {['All', 'boxes', 'barrels', 'crates', 'cartons', 'drums', 'sacks', 'pallets', 'kg', 'liters', 'units'].map(
                    (unit) => (
                      <button
                        key={unit}
                        onClick={() => setScannedListUnitFilter(unit)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono shrink-0 transition-all cursor-pointer capitalize flex items-center gap-1 ${
                          scannedListUnitFilter === unit
                            ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {unit !== 'All' && (
                          <span className="material-symbols-outlined text-[13px]">
                            {getUnitIcon(unit)}
                          </span>
                        )}
                        <span>{unit}</span>
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Summary Stats Strip */}
              {scannedHistory.length > 0 && (
                <div className="px-4 py-2 bg-slate-950/90 border-b border-slate-800 text-[11px] font-mono flex items-center justify-between flex-wrap gap-2 shrink-0">
                  <span className="text-slate-400">
                    Total recorded scans: <strong className="text-white">{scannedHistory.length}</strong>
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Packaging summary pills */}
                    {Object.entries(
                      scannedHistory.reduce<Record<string, number>>((acc, item) => {
                        const u = item.unit || 'units';
                        acc[u] = (acc[u] || 0) + (item.quantity || 1);
                        return acc;
                      }, {})
                    )
                      .slice(0, 4)
                      .map(([unit, total]) => (
                        <span
                          key={unit}
                          className="px-2 py-0.5 bg-slate-800/90 rounded-md border border-slate-700 text-emerald-400 font-bold"
                        >
                          {total} {unit}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* Scrollable Scanned Items List */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5 divide-y divide-slate-800/60">
                {(() => {
                  const filtered = scannedHistory.filter((item) => {
                    const matchesSearch =
                      !scannedListSearch ||
                      item.name.toLowerCase().includes(scannedListSearch.toLowerCase()) ||
                      item.sku.toLowerCase().includes(scannedListSearch.toLowerCase()) ||
                      (item.barcode && item.barcode.toLowerCase().includes(scannedListSearch.toLowerCase()));
                    const matchesUnit =
                      scannedListUnitFilter === 'All' ||
                      (item.unit && item.unit.toLowerCase().includes(scannedListUnitFilter.toLowerCase()));
                    return matchesSearch && matchesUnit;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 font-mono">
                        <span className="material-symbols-outlined text-[48px] text-slate-600 mb-2">
                          inventory_2
                        </span>
                        <p className="text-sm font-bold text-slate-300">
                          {scannedHistory.length === 0
                            ? 'No food items scanned yet.'
                            : 'No scanned items match your filter.'}
                        </p>
                        <p className="text-xs text-slate-500 mt-1 max-w-xs">
                          {scannedHistory.length === 0
                            ? 'Scan food item barcodes using the camera or test buttons. Every scanned item will stay stored here across sessions.'
                            : 'Try adjusting your search keyword or unit filter.'}
                        </p>
                      </div>
                    );
                  }

                  return filtered.map((entry, index) => {
                    const isDeduct = entry.mode === 'deduct';
                    const isNew = entry.mode === 'new';
                    const timeStr = new Date(entry.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    });
                    const dateStr = new Date(entry.timestamp).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                    });

                    return (
                      <div
                        key={`${entry.id || 'entry'}-${index}`}
                        className="pt-2.5 first:pt-0 flex items-center justify-between gap-3 group"
                      >
                        {/* Left: Icon & Item Info */}
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                              isDeduct
                                ? 'bg-rose-950/70 border-rose-800/80 text-rose-400'
                                : isNew
                                ? 'bg-amber-950/70 border-amber-800/80 text-amber-400'
                                : 'bg-emerald-950/70 border-emerald-800/80 text-emerald-400'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[20px]">
                              {isDeduct ? 'remove_shopping_cart' : isNew ? 'add_box' : getUnitIcon(entry.unit)}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <h4 className="font-bold text-sm text-white truncate">
                                {translateRecordedItem(entry.name, currentLang)}
                              </h4>
                              {entry.category && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded border border-slate-700">
                                  {entry.category}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] font-mono">
                              <span className="text-slate-400">SKU: <strong className="text-slate-200">{entry.sku}</strong></span>
                              {entry.barcode && entry.barcode !== entry.sku && (
                                <span className="text-slate-500">({entry.barcode})</span>
                              )}
                              {entry.location && (
                                <span className="text-slate-400">📍 {entry.location}</span>
                              )}
                              <span className="text-slate-500">⏱️ {dateStr} {timeStr}</span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Quantity Badge + Delete / Remove Button */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Quantity pill with packaging unit */}
                          <div
                            className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold flex items-center gap-1 border ${
                              isDeduct
                                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                                : isNew
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            }`}
                          >
                            <span>
                              {isDeduct ? '-' : '+'}
                              {entry.quantity} {entry.unit}
                            </span>
                          </div>

                          {/* Delete / Remove Option for this Food Item */}
                          <button
                            onClick={(e) => handleDeleteScannedEntry(entry.id, e)}
                            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 hover:border-rose-800 border border-slate-700 flex items-center justify-center cursor-pointer transition-all active:scale-95"
                            title="Remove food item from scanned list"
                            aria-label={`Remove ${entry.name} from list`}
                          >
                            <span className="material-symbols-outlined text-[17px]">delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Modal Footer with Actions */}
              <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between gap-2 flex-wrap shrink-0">
                <div className="flex items-center gap-2">
                  {scannedHistory.length > 0 && (
                    <button
                      onClick={handleClearAllScannedHistory}
                      className="px-3 py-2 bg-rose-950/70 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-colors active:scale-95"
                      title="Clear all food items from list"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                      <span>Clear All Items</span>
                    </button>
                  )}

                  {scannedHistory.length > 0 && (
                    <button
                      onClick={() => {
                        const csvHeader = 'Timestamp,SKU,Barcode,Name,Quantity,Unit,Mode,Location\n';
                        const csvRows = scannedHistory
                          .map(
                            (i) =>
                              `"${new Date(i.timestamp).toISOString()}","${i.sku}","${i.barcode || ''}","${i.name.replace(/"/g, '""')}",${i.quantity},"${i.unit}","${i.mode}","${i.location || ''}"`
                          )
                          .join('\n');
                        const blob = new Blob([csvHeader + csvRows], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `scanned-food-items-${new Date().toISOString().slice(0, 10)}.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                        setSyncSuccessToast('✓ Scanned food items list exported successfully!');
                        setTimeout(() => setSyncSuccessToast(null), 2500);
                      }}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-colors active:scale-95"
                      title="Export scanned list to CSV"
                    >
                      <span className="material-symbols-outlined text-[16px]">download</span>
                      <span>Export CSV</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setShowScannedListModal(false)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-mono font-bold cursor-pointer transition-colors active:scale-95 shadow-md flex items-center gap-1"
                >
                  <span>Done / Back to Camera</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Live Camera Diagnostics & Frame Inspector Modal */}
      <AnimatePresence>
        {showDiagnosticPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-slate-900 border border-slate-700 w-full max-w-2xl max-h-[88vh] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Diagnostics Header */}
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-400 text-[22px]">bug_report</span>
                  <div>
                    <h3 className="font-bold text-sm text-white">Camera &amp; Stream Diagnostics</h3>
                    <p className="text-[11px] font-mono text-slate-400">Live mobile hardware, frame decode, and permission telemetry</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDiagnosticPanel(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
                  title="Close Diagnostics"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Status Grid */}
              <div className="p-3.5 bg-slate-950/40 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono shrink-0">
                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400">Stream Status</div>
                  <div className={`font-bold mt-0.5 ${cameraStatus === 'active' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {cameraStatus.toUpperCase()} ({cameraMetrics.readyState})
                  </div>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400">Resolution &amp; FPS</div>
                  <div className="font-bold text-slate-200 mt-0.5">
                    {cameraMetrics.resolution} @ {cameraMetrics.fps}fps
                  </div>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400">Frames (Total/Skip)</div>
                  <div className="font-bold text-slate-200 mt-0.5">
                    {cameraMetrics.totalFrames} / <span className={cameraMetrics.skippedFrames > 0 ? 'text-amber-400' : 'text-slate-400'}>{cameraMetrics.skippedFrames}</span>
                  </div>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400">Secure Context</div>
                  <div className={`font-bold mt-0.5 ${typeof window !== 'undefined' && window.isSecureContext ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {typeof window !== 'undefined' && window.isSecureContext ? 'HTTPS (OK)' : 'INSECURE'}
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="px-3.5 py-2 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between gap-2 flex-wrap shrink-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => {
                      const diagDump = {
                        timestamp: new Date().toISOString(),
                        cameraStatus,
                        cameraMetrics,
                        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
                        isSecureContext: typeof window !== 'undefined' ? window.isSecureContext : false,
                        logs: mobileLogs,
                      };
                      navigator.clipboard?.writeText(JSON.stringify(diagDump, null, 2));
                      setSyncSuccessToast('✓ Diagnostics copied to clipboard!');
                      setTimeout(() => setSyncSuccessToast(null), 2500);
                    }}
                    className="px-2.5 py-1.5 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-200 rounded-lg text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                    <span>Copy Diagnostics</span>
                  </button>

                  <button
                    onClick={inspectMobilePermissions}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">verified_user</span>
                    <span>Check Permissions</span>
                  </button>

                  <button
                    onClick={startCamera}
                    className="px-2.5 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-200 rounded-lg text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">restart_alt</span>
                    <span>Restart Camera</span>
                  </button>
                </div>

                <button
                  onClick={() => setMobileLogs([])}
                  className="px-2 py-1 text-slate-400 hover:text-slate-200 text-[11px] font-mono cursor-pointer"
                >
                  Clear Logs
                </button>
              </div>

              {/* Wireless Barcode Scanner Diagnostics & Troubleshooting Card */}
              <div className="p-3.5 bg-slate-950/70 border-b border-slate-800 flex flex-col gap-3 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-cyan-400 text-[20px]">barcode_scanner</span>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      Wireless Hardware Scanner Status
                    </h4>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                    hardwareScanStatus.status === 'scanned'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      : hardwareScanStatus.status === 'blocked_duplicate'
                      ? 'bg-amber-950 text-amber-300 border-amber-700'
                      : 'bg-cyan-950 text-cyan-300 border-cyan-800'
                  }`}>
                    {hardwareScanStatus.status === 'scanned' ? 'SCAN RECEIVED' : hardwareScanStatus.status === 'blocked_duplicate' ? 'DUPLICATE BLOCKED' : 'LISTENING (HID)'}
                  </span>
                </div>

                {/* Hardware Telemetry Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                  <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-850">
                    <span className="text-[10px] text-slate-400 block">Connection Method</span>
                    <span className="text-cyan-300 font-bold">Bluetooth HID / USB OTG</span>
                  </div>
                  <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-850">
                    <span className="text-[10px] text-slate-400 block">Host Platform</span>
                    <span className="text-slate-200 capitalize font-bold">{hardwareScanStatus.clientPlatform}</span>
                  </div>
                  <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-850">
                    <span className="text-[10px] text-slate-400 block">Last Barcode</span>
                    <span className="text-emerald-400 font-bold truncate block">
                      {hardwareScanStatus.lastBarcode || '(None yet)'}
                    </span>
                  </div>
                  <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-850">
                    <span className="text-[10px] text-slate-400 block">Keystroke Burst Speed</span>
                    <span className="text-slate-200 font-bold">
                      {hardwareScanStatus.lastDurationMs > 0 ? `${hardwareScanStatus.lastDurationMs.toFixed(0)}ms (${hardwareScanStatus.interKeyAvgMs.toFixed(1)}ms/key)` : 'Ready'}
                    </span>
                  </div>
                </div>

                {/* Duplicate prevention & filter info */}
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-emerald-400">shield</span>
                    <span>Accidental Duplicate Filter: <strong>1,200ms Active Cooldown</strong></span>
                  </div>
                  <span className="text-slate-400">Total Scans: <strong className="text-white">{hardwareScanStatus.totalScans}</strong></span>
                </div>

                {/* Instructions & Compatibility accordions */}
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 flex flex-col gap-2 text-[11px] font-mono">
                  <span className="text-amber-300 font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">tips_and_updates</span>
                    <span>Wireless Scanner Pairing &amp; Mobile Setup:</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300 text-[10.5px]">
                    <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-850">
                      <strong className="text-cyan-300 block mb-0.5">📱 iOS (iPhone / iPad):</strong>
                      <span>1. Set scanner to <em>Bluetooth HID mode</em> (standard keyboard profile).<br/>2. Open iOS <strong>Settings &gt; Bluetooth</strong> and pair the scanner.<br/>3. Open OmniStock and scan any barcode directly! The virtual keyboard is suppressed automatically.</span>
                    </div>
                    <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-850">
                      <strong className="text-emerald-300 block mb-0.5">🤖 Android &amp; USB OTG:</strong>
                      <span>1. Pair via Bluetooth or plug the 2.4GHz USB wireless dongle into the USB-C OTG port.<br/>2. Scanners type as high-speed keystrokes (&lt;50ms/key).<br/>3. OmniStock strips AIM symbology identifiers (]C1, ]e0, etc.) automatically.</span>
                    </div>
                  </div>
                </div>

                {/* Manual Barcode-Entry Fallback with Stock In / Out Action */}
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex flex-col gap-2 text-[11px] font-mono">
                  <span className="text-slate-300 font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-cyan-400">keyboard</span>
                    <span>Manual Barcode Fallback (Hardware Simulation &amp; Direct Entry):</span>
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type or paste barcode (e.g. RIC-BAS-500, OO-EV-100)..."
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && manualCode.trim()) {
                          handleBarcodeDetected(manualCode.trim(), { source: 'manual', charCount: manualCode.trim().length, scanDurationMs: 10, interKeyAvgMs: 2 });
                          setManualCode('');
                        }
                      }}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      onClick={() => {
                        if (manualCode.trim()) {
                          handleBarcodeDetected(manualCode.trim(), { source: 'manual', charCount: manualCode.trim().length, scanDurationMs: 10, interKeyAvgMs: 2 });
                          setManualCode('');
                        }
                      }}
                      className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white rounded-xl text-xs font-mono font-bold cursor-pointer transition-colors"
                    >
                      Process Scan
                    </button>
                  </div>
                </div>
              </div>

              {/* Log Stream List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5 font-mono text-xs">
                {mobileLogs.length === 0 ? (
                  <div className="text-center py-10 text-slate-500">
                    No diagnostic logs recorded yet. Logs will stream here during camera initialization and decoding.
                  </div>
                ) : (
                  mobileLogs.map((log) => {
                    const badgeStyles: Record<string, string> = {
                      DECODE: 'bg-emerald-950 text-emerald-300 border-emerald-700',
                      CAMERA: 'bg-purple-950 text-purple-300 border-purple-700',
                      PERM: 'bg-sky-950 text-sky-300 border-sky-700',
                      FRAME: 'bg-slate-800 text-slate-300 border-slate-700',
                      ERROR: 'bg-rose-950 text-rose-300 border-rose-700',
                      INIT: 'bg-indigo-950 text-indigo-300 border-indigo-700',
                    };
                    return (
                      <div
                        key={log.id}
                        className="p-2 rounded-lg bg-slate-950/80 border border-slate-850 flex flex-col gap-1 text-[11px]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                                badgeStyles[log.category] || 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              {log.category}
                            </span>
                            <span className="text-slate-200 font-medium break-all">{log.message}</span>
                          </div>
                          <span className="text-slate-500 text-[10px] shrink-0">{log.timestamp}</span>
                        </div>
                        {log.data && (
                          <pre className="text-[10px] text-slate-400 bg-black/40 p-1.5 rounded border border-slate-850 overflow-x-auto whitespace-pre-wrap break-all">
                            {log.data}
                          </pre>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Diagnostics Footer */}
              <div className="p-3 bg-slate-950 border-t border-slate-800 text-right shrink-0">
                <button
                  onClick={() => setShowDiagnosticPanel(false)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-mono font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sync Success Celebration Toast */}
      <AnimatePresence>
        {syncSuccessToast && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed top-16 left-4 right-4 z-50 bg-emerald-500 text-slate-950 font-mono text-xs font-bold p-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-emerald-300"
          >
            <span className="material-symbols-outlined text-[20px] shrink-0">check_circle</span>
            <span className="flex-1">{syncSuccessToast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
