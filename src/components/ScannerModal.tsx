import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';
import { InventoryItem, LanguageCode } from '../types';
import { translateRecordedItem } from '../utils/i18n';
import { generateQRCodeDataUrl, getVerifiedPublicScannerUrl, getActiveAppOrigin } from '../utils/qrUtils';
import {
  HardwareScannerEngine,
  normalizeBarcode,
  isValidBarcode,
} from '../utils/hardwareScanner';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetItem?: InventoryItem | null;
  onRefillQuantity: (itemSku: string, addedQty: number) => void;
  onScanReceived?: (sku: string, addedQty: number, deviceName?: string, customItemName?: string, unitStr?: string, exactNewStock?: number) => void;
  onProductAdded?: (product: InventoryItem, deviceName?: string) => void;
  inventoryList: InventoryItem[];
  currentLang?: LanguageCode;
  onOpenMobileView?: () => void;
  onMobileDeviceLinked?: (info: { sessionId: string; device: string }) => void;
  initialTab?: ModalTab;
}

interface IncomingScanAlert {
  id: string;
  sku: string;
  name: string;
  qty: number;
  time: string;
  device: string;
}

type ModalTab = 'qr' | 'camera' | 'manual';

export const ScannerModal: React.FC<ScannerModalProps> = ({
  isOpen,
  onClose,
  targetItem,
  onRefillQuantity,
  onScanReceived,
  onProductAdded,
  inventoryList,
  currentLang = 'en',
  onOpenMobileView,
  onMobileDeviceLinked,
  initialTab = 'qr',
}) => {
  // Modal Mode: default to 'qr' (Phone Wireless) so QR code is immediately front and center!
  const [activeTab, setActiveTab] = useState<ModalTab>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || 'qr');
    }
  }, [isOpen, initialTab]);

  // Session & QR state
  const [activeSessionId, setActiveSessionId] = useState<string>(() => `SES-${Math.random().toString(36).substring(2, 7).toUpperCase()}`);
  const [sessionStatus, setSessionStatus] = useState<'waiting' | 'connected' | 'active'>('waiting');
  const [connectedDevice, setConnectedDevice] = useState<string | null>(null);
  const [scansCount, setScansCount] = useState<number>(0);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [scannerUrl, setScannerUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [recentLiveScans, setRecentLiveScans] = useState<IncomingScanAlert[]>([]);
  const [latestScanToast, setLatestScanToast] = useState<string | null>(null);
  const [customHostInput, setCustomHostInput] = useState<string>('');
  const [detectedLanUrl, setDetectedLanUrl] = useState<string | null>(null);
  const [isEditingHost, setIsEditingHost] = useState<boolean>(false);
  const [qrTargetMode, setQrTargetMode] = useState<'direct' | 'lan' | 'custom'>('direct');

  // Embedded Camera Scanner State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanQty, setScanQty] = useState<number>(1);
  const [scanDirection, setScanDirection] = useState<'add' | 'deduct'>('add');
  const [lastDetectedBarcode, setLastDetectedBarcode] = useState<string | null>(null);
  const [manualCodeInput, setManualCodeInput] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const barcodeDetectorRef = useRef<any>(null);
  const isDecodingRef = useRef<boolean>(false);
  const lastScanTimeRef = useRef<number>(0);
  const lastScanCodeRef = useRef<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const frameCountRef = useRef<number>(0);
  const skippedFramesCountRef = useRef<number>(0);

  // Structured Logger Helper for ScannerModal
  const logModal = useCallback((category: 'INIT' | 'PERM' | 'CAMERA' | 'FRAME' | 'DECODE' | 'ERROR', message: string, data?: any) => {
    const time = new Date().toISOString().substring(11, 23);
    const prefix = `[ScannerModal:${category}][${time}]`;
    if (category === 'ERROR') {
      console.error(prefix, message, data !== undefined ? data : '');
    } else if (category === 'DECODE') {
      console.log(`%c${prefix} ${message}`, 'color: #059669; font-weight: bold;', data !== undefined ? data : '');
    } else if (category === 'FRAME') {
      console.debug(prefix, message, data !== undefined ? data : '');
    } else {
      console.log(`%c${prefix} ${message}`, 'color: #0284c7; font-weight: 600;', data !== undefined ? data : '');
    }
  }, []);

  // Inspect and log camera permissions & available video devices
  const inspectCameraPermissions = useCallback(async () => {
    logModal('PERM', 'Checking camera permissions and input devices...');
    let permStatus = 'unknown';

    if (navigator.permissions && (navigator.permissions as any).query) {
      try {
        const status = await (navigator.permissions as any).query({ name: 'camera' });
        permStatus = status.state;
        logModal('PERM', `Permissions API query: state = "${status.state}"`, {
          state: status.state,
          onchangeAttached: !!status.onchange,
        });

        status.onchange = () => {
          logModal('PERM', `Permissions API state changed to: "${status.state}"`);
        };
      } catch (permErr: any) {
        logModal('PERM', `Permissions query not supported for 'camera' name: ${permErr?.message || permErr}`);
      }
    } else {
      logModal('PERM', 'navigator.permissions.query is not supported in this browser');
    }

    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        logModal('PERM', `enumerateDevices detected ${videoInputs.length} video input device(s):`, videoInputs.map((d, idx) => ({
          index: idx,
          deviceId: d.deviceId ? `${d.deviceId.substring(0, 8)}...` : '(blank)',
          groupId: d.groupId ? `${d.groupId.substring(0, 8)}...` : '(blank)',
          label: d.label || '(permission required to read label)',
        })));
      } catch (enumErr: any) {
        logModal('PERM', 'enumerateDevices error:', enumErr);
      }
    }

    return permStatus;
  }, [logModal]);

  // Initialize ZXing Reader with optimal barcode formats & native BarcodeDetector
  useEffect(() => {
    logModal('INIT', 'Initializing barcode decoding engines...', {
      userAgent: navigator.userAgent,
      isSecureContext: window.isSecureContext,
      protocol: window.location.protocol,
      host: window.location.host,
      hasMediaDevices: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    });

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
    logModal('INIT', 'ZXing MultiFormatReader initialized with TRY_HARDER hints');

    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        (window as any).BarcodeDetector.getSupportedFormats().then((formats: string[]) => {
          logModal('INIT', 'Hardware BarcodeDetector supported on this device', { formats });
          barcodeDetectorRef.current = new (window as any).BarcodeDetector({
            formats: formats && formats.length > 0 ? formats : ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a'],
          });
        }).catch((err: any) => {
          logModal('INIT', 'BarcodeDetector.getSupportedFormats rejected, using ZXing only', err);
          barcodeDetectorRef.current = null;
        });
      } catch (err: any) {
        logModal('INIT', 'BarcodeDetector construction error, using ZXing only', err);
        barcodeDetectorRef.current = null;
      }
    } else {
      logModal('INIT', 'Native BarcodeDetector not available in this browser; using ZXing engine');
    }
  }, [logModal]);

  // Audio Pairing Confirmation Sound
  const playPairingChime = (freq: number = 880) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } catch {}
  };

  // Process a detected barcode string
  const handleBarcodeScanned = useCallback(
    async (code: string) => {
      const normalized = normalizeBarcode(code);
      if (!isValidBarcode(normalized)) return;
      const trimmed = normalized.toUpperCase();

      const now = Date.now();
      if (lastScanCodeRef.current === trimmed && now - lastScanTimeRef.current < 1800) {
        return;
      }
      lastScanCodeRef.current = trimmed;
      lastScanTimeRef.current = now;
      setLastDetectedBarcode(trimmed);

      playPairingChime(1046); // High C chime

      // Find matching item in catalog
      const matched = inventoryList.find(
        (i) => i.sku.toUpperCase() === trimmed || (i as any).barcode?.toUpperCase() === trimmed
      ) || (targetItem ? targetItem : null);

      const delta = scanDirection === 'deduct' ? -Math.abs(scanQty) : Math.abs(scanQty);
      const itemName = matched ? matched.name : `Scanned Code (${trimmed})`;
      const targetSku = matched ? matched.sku : trimmed;
      const unit = matched ? matched.unit : 'units';
      const calculatedNewStock = matched ? Math.max(0, matched.currentStock + delta) : Math.max(0, delta);

      // Trigger update
      if (onScanReceived) {
        onScanReceived(targetSku, delta, 'Device Camera', itemName, unit, calculatedNewStock);
      } else {
        onRefillQuantity(targetSku, delta);
      }

      setLatestScanToast(`⚡ Scanned ${trimmed}: ${delta >= 0 ? '+' : ''}${delta} ${unit} of ${itemName}!`);
      setTimeout(() => setLatestScanToast(null), 3500);

      // Sync to local server
      try {
        await fetch('/api/scanner/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sku: targetSku,
            barcode: trimmed,
            addedQty: delta,
            mode: scanDirection,
            sessionId: activeSessionId,
            device: 'Device Camera Scanner',
          }),
        });
      } catch {}
    },
    [inventoryList, targetItem, scanDirection, scanQty, onScanReceived, onRefillQuantity, activeSessionId]
  );

  // Stop embedded camera stream
  const stopCamera = useCallback(() => {
    logModal('CAMERA', 'Stopping camera and decoding loop...', {
      activeStream: !!streamRef.current,
      tracks: streamRef.current?.getTracks().map((t) => ({ kind: t.kind, label: t.label, readyState: t.readyState })),
    });
    isDecodingRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        logModal('CAMERA', `Track stopped: ${track.label} (${track.kind})`);
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, [logModal]);

  // Frame-by-frame decoding loop
  const startDecodingLoop = useCallback(() => {
    logModal('FRAME', 'Starting frame-by-frame decoding loop...');
    isDecodingRef.current = true;
    let lastScanTime = 0;
    frameCountRef.current = 0;
    skippedFramesCountRef.current = 0;

    const decodeFrame = async (timestamp: number) => {
      if (!isDecodingRef.current) return;

      if (timestamp - lastScanTime >= 150) {
        lastScanTime = timestamp;
        frameCountRef.current += 1;
        const video = videoRef.current;

        if (video && video.readyState >= 2 && video.videoWidth > 0) {
          // Log periodic heartbeat every 25 frames (~3.7s) to confirm active video stream processing
          if (frameCountRef.current % 25 === 1) {
            logModal('FRAME', `Heartbeat #${frameCountRef.current}: Processing frames [${video.videoWidth}x${video.videoHeight}, readyState=${video.readyState}]`, {
              hasNativeDetector: !!barcodeDetectorRef.current,
              hasZXing: !!readerRef.current,
              videoCurrentTime: video.currentTime.toFixed(2),
              videoPaused: video.paused,
            });
          }

          let detectedText: string | null = null;
          let detectionEngine = '';
          const frameStartTime = performance.now();

          // 1. Native BarcodeDetector (Hardware Accelerated)
          if (barcodeDetectorRef.current) {
            try {
              const barcodes = await barcodeDetectorRef.current.detect(video);
              if (barcodes && barcodes.length > 0 && barcodes[0]?.rawValue) {
                detectedText = barcodes[0].rawValue;
                detectionEngine = `Native BarcodeDetector (${barcodes[0].format || 'unknown format'})`;
                logModal('DECODE', `Native BarcodeDetector detected code: "${detectedText}"`, {
                  format: barcodes[0].format,
                  boundingBox: barcodes[0].boundingBox,
                  durationMs: (performance.now() - frameStartTime).toFixed(1),
                });
              }
            } catch (detectorErr: any) {
              // Log detector error only occasionally to avoid flood
              if (frameCountRef.current % 50 === 1) {
                logModal('ERROR', 'BarcodeDetector.detect error on video frame:', detectorErr);
              }
            }
          }

          // 2. ZXing fallback on canvas crop
          if (!detectedText && canvasRef.current && readerRef.current) {
            try {
              const canvas = canvasRef.current;
              const cropW = Math.min(video.videoWidth, 480);
              const cropH = Math.min(video.videoHeight, 360);
              canvas.width = cropW;
              canvas.height = cropH;
              const ctx = canvas.getContext('2d', { willReadFrequently: true });
              if (ctx) {
                ctx.drawImage(video, (video.videoWidth - cropW) / 2, (video.videoHeight - cropH) / 2, cropW, cropH, 0, 0, cropW, cropH);
                const res = readerRef.current.decodeFromCanvas(canvas);
                if (res && res.getText()) {
                  detectedText = res.getText();
                  detectionEngine = `ZXing Canvas Crop (${cropW}x${cropH})`;
                  logModal('DECODE', `ZXing decoded code: "${detectedText}" via center crop`, {
                    format: res.getBarcodeFormat(),
                    durationMs: (performance.now() - frameStartTime).toFixed(1),
                  });
                }
              }
            } catch (zxingErr: any) {
              // NotFoundException is standard when frame has no barcode; only log other fatal anomalies
              if (zxingErr?.name && zxingErr.name !== 'NotFoundException') {
                logModal('FRAME', `ZXing decode exception: ${zxingErr.name}`, zxingErr.message);
              }
            }
          }

          if (detectedText) {
            logModal('DECODE', `Triggering handleBarcodeScanned with "${detectedText}" (Engine: ${detectionEngine})`);
            handleBarcodeScanned(detectedText);
          }
        } else {
          skippedFramesCountRef.current += 1;
          // Log warning when video is not ready for decoding (every 20 skips)
          if (skippedFramesCountRef.current % 20 === 1) {
            logModal('FRAME', `Video frame skipped: readyState=${video?.readyState} (need >=2), dimensions=${video?.videoWidth}x${video?.videoHeight}, videoPaused=${video?.paused}`, {
              totalSkipped: skippedFramesCountRef.current,
            });
          }
        }
      }

      if (isDecodingRef.current) {
        requestAnimationFrame(decodeFrame);
      }
    };

    requestAnimationFrame(decodeFrame);
  }, [handleBarcodeScanned, logModal]);

  // Start embedded camera stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    logModal('CAMERA', 'Starting camera acquisition...');

    // First inspect permissions
    await inspectCameraPermissions();

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      logModal('CAMERA', 'Requesting getUserMedia with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const videoTracks = stream.getVideoTracks();
      logModal('CAMERA', `getUserMedia SUCCESS: Received stream with ${videoTracks.length} video track(s)`, videoTracks.map((t) => ({
        id: t.id,
        label: t.label,
        enabled: t.enabled,
        muted: t.muted,
        readyState: t.readyState,
        settings: t.getSettings ? t.getSettings() : 'N/A',
      })));

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.muted = true;

        // Attach diagnostic listeners to HTML video element
        video.onloadedmetadata = () => {
          logModal('CAMERA', `Video event [loadedmetadata]: resolution = ${video.videoWidth}x${video.videoHeight}, readyState = ${video.readyState}`);
        };
        video.oncanplay = () => {
          logModal('CAMERA', `Video event [canplay]: readyState = ${video.readyState}`);
        };
        video.onplaying = () => {
          logModal('CAMERA', `Video event [playing]: playback started, resolution = ${video.videoWidth}x${video.videoHeight}`);
        };
        video.onerror = (e) => {
          logModal('ERROR', 'Video element error event fired:', e);
        };

        logModal('CAMERA', 'Attempting video.play()...');
        await video.play().then(() => {
          logModal('CAMERA', 'video.play() resolved successfully');
        }).catch((playErr: any) => {
          logModal('ERROR', 'video.play() rejected:', playErr);
        });
      }

      setIsCameraActive(true);
      startDecodingLoop();
    } catch (err: any) {
      logModal('ERROR', 'Camera start failure in getUserMedia:', {
        name: err.name,
        message: err.message,
        constraint: err.constraint,
        stack: err.stack,
      });
      setCameraError(err.message || 'Unable to access device camera. Please allow camera permissions or test below.');
      setIsCameraActive(false);
    }
  }, [stopCamera, startDecodingLoop, inspectCameraPermissions, logModal]);

  // Photo Snapshot File Decoder
  const handleImageFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imgUrl = URL.createObjectURL(file);
      const reader = new BrowserMultiFormatReader();
      const result = await reader.decodeFromImageUrl(imgUrl);
      if (result && result.getText()) {
        handleBarcodeScanned(result.getText());
      } else {
        setLatestScanToast('⚠️ No barcode detected in uploaded photo. Try another image or scan directly.');
        setTimeout(() => setLatestScanToast(null), 3500);
      }
      URL.revokeObjectURL(imgUrl);
    } catch {
      setLatestScanToast('⚠️ Could not decode barcode from this photo. Ensure the barcode is clear and in focus.');
      setTimeout(() => setLatestScanToast(null), 3500);
    }
  };

  // Manage camera on modal open / tab switch
  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, startCamera, stopCamera]);

  // Initialize verified session & generate QR code for Tab 2
  useEffect(() => {
    if (!isOpen) return;

    let isSubscribed = true;
    getVerifiedPublicScannerUrl(activeSessionId, targetItem?.sku, customHostInput || undefined).then((res) => {
      if (!isSubscribed) return;
      const targetUrl = typeof res === 'string' ? res : res.url;
      setScannerUrl(targetUrl);
      if (typeof res !== 'string' && res.lanUrl) {
        setDetectedLanUrl(res.lanUrl);
      }

      let activeUrlToEncode = targetUrl;
      if (qrTargetMode === 'lan' && typeof res !== 'string' && res.lanUrl) {
        activeUrlToEncode = res.lanUrl;
      } else if (qrTargetMode === 'custom' && customHostInput) {
        const customBase = customHostInput.startsWith('http') ? customHostInput : `http://${customHostInput}`;
        const targetSkuParam = targetItem?.sku ? `&sku=${encodeURIComponent(targetItem.sku)}` : '';
        activeUrlToEncode = `${customBase}/?action=scan&scanner=mobile&session=${activeSessionId}${targetSkuParam}`;
      }

      generateQRCodeDataUrl(activeUrlToEncode, 300).then((dataUrl) => {
        if (isSubscribed) setQrCodeDataUrl(dataUrl);
      });
    });

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, activeSessionId, targetItem, customHostInput, qrTargetMode]);

  // Poll for external session updates when on QR tab
  useEffect(() => {
    if (!isOpen || activeTab !== 'qr') return;

    let isSubscribed = true;
    let lastSeenTime = Date.now() - 30000;
    const processedEventIds = new Set<string>();

    const checkLiveSessionAndScans = async () => {
      try {
        const sessRes = await fetch(`/api/scanner/session/${activeSessionId}`);
        if (sessRes.ok) {
          const sessData = await sessRes.json();
          if (isSubscribed && sessData.success) {
            if (sessData.status === 'connected' || sessData.status === 'active') {
              if (sessionStatus === 'waiting') {
                playPairingChime(660);
                setLatestScanToast(`🎉 Phone linked automatically! (${sessData.device || 'Phone'})`);
                setTimeout(() => setLatestScanToast(null), 4000);
                if (onMobileDeviceLinked) {
                  onMobileDeviceLinked({
                    sessionId: activeSessionId,
                    device: sessData.device || 'Mobile Phone',
                  });
                }
              }
              setSessionStatus(sessData.status);
              setConnectedDevice(sessData.device || 'Mobile Phone');
              setScansCount(sessData.scansCount || 0);
            }
          }
        }

        const res = await fetch(`/api/scanner/updates?since=${lastSeenTime}`);
        if (res.ok) {
          const data = await res.json();
          if (isSubscribed && data.events && data.events.length > 0) {
            for (const ev of data.events) {
              if (ev.timestamp > lastSeenTime) {
                lastSeenTime = Math.max(lastSeenTime, ev.timestamp);
              }
              if (ev && ev.sku && !processedEventIds.has(ev.id)) {
                processedEventIds.add(ev.id);
                if (onScanReceived) {
                  onScanReceived(ev.sku, ev.addedQty, ev.device, ev.itemName, ev.unit, ev.newStock);
                } else {
                  onRefillQuantity(ev.sku, ev.addedQty);
                }
                setRecentLiveScans((prev) => [
                  {
                    id: ev.id,
                    sku: ev.sku,
                    name: ev.itemName,
                    qty: ev.addedQty,
                    time: new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                    device: ev.device || 'Mobile Phone',
                  },
                  ...prev.filter((p) => p.id !== ev.id).slice(0, 5),
                ]);
              }
            }
          }
        }
      } catch {}
    };

    const interval = setInterval(checkLiveSessionAndScans, 1200);
    checkLiveSessionAndScans();

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [isOpen, activeTab, activeSessionId, sessionStatus, onMobileDeviceLinked, onRefillQuantity, onScanReceived]);

  // Global Hardware Scanner Listener for ScannerModal (captures wireless Bluetooth HID / USB barcode bursts)
  useEffect(() => {
    if (!isOpen) return;

    logModal('INIT', 'Mounting HardwareScannerEngine in ScannerModal for wireless HID scanner input...');
    const engine = new HardwareScannerEngine({
      onScan: (barcode) => {
        const cleaned = normalizeBarcode(barcode);
        logModal('DECODE', `ScannerModal received hardware scan: "${cleaned}" (raw: "${barcode}")`);
        handleBarcodeScanned(cleaned);
      },
      onError: (err) => {
        logModal('FRAME', `Hardware scanner notice: ${err}`);
      },
      minChars: 2,
      maxCharIntervalMs: 65,
      duplicateCooldownMs: 1200,
      enabled: true,
    });
    engine.start();

    return () => {
      engine.stop();
    };
  }, [isOpen, handleBarcodeScanned, logModal]);

  // Reset QR Option to default configuration, fresh session ID, and default direct host
  const handleResetQrOptions = useCallback(async () => {
    logModal('INIT', 'Resetting QR options and initializing fresh pairing session...');
    const oldSid = activeSessionId;
    const newSid = `SES-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    setActiveSessionId(newSid);
    setQrTargetMode('direct');
    setCustomHostInput('');
    setIsEditingHost(false);
    setSessionStatus('waiting');
    setConnectedDevice(null);
    setScansCount(0);
    setCopiedLink(false);

    try {
      await fetch('/api/scanner/session/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldSessionId: oldSid,
          newSessionId: newSid,
        }),
      });
    } catch {}

    setLatestScanToast('✓ QR Code & Pairing Options Reset to Default');
    setTimeout(() => setLatestScanToast(null), 3000);
  }, [activeSessionId, logModal]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(scannerUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {}
  };

  const handleManualScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCodeInput.trim()) return;
    handleBarcodeScanned(manualCodeInput.trim());
    setManualCodeInput('');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
        >
          {/* Hidden Canvas for Decoding & File Input */}
          <canvas ref={canvasRef} className="hidden" />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageFileScan}
            className="hidden"
          />

          {/* Modal Header Bar */}
          <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <span className="material-symbols-outlined text-[24px]">qr_code_scanner</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Smart Barcode Scanner</span>
                  {activeTab === 'camera' && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      isCameraActive ? 'bg-emerald-400 text-slate-950 animate-pulse' : 'bg-amber-400 text-slate-950'
                    }`}>
                      {isCameraActive ? 'CAMERA LIVE' : 'INITIALIZING'}
                    </span>
                  )}
                  {activeTab === 'qr' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-500/40">
                      PHONE LINK
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-300 font-mono">
                  Real-time warehouse scanning, refill &amp; dispense
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeTab === 'qr' && (
                <button
                  onClick={handleResetQrOptions}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-mono font-bold flex items-center gap-1 border border-slate-700 cursor-pointer transition-colors active:scale-95 shadow-xs"
                  title="Reset QR code, pairing session, and host options to default"
                >
                  <span className="material-symbols-outlined text-[15px] text-emerald-400">restart_alt</span>
                  <span>Reset QR</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                title="Close Scanner"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </div>

          {/* Mode Switch Tabs */}
          <div className="flex items-center border-b border-slate-200 bg-slate-100/90 p-1.5 gap-1 shrink-0">
            <button
              onClick={() => setActiveTab('qr')}
              className={`flex-1 py-2 px-3 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'qr'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">qr_code_2</span>
              <span>1. Phone Wireless (QR)</span>
            </button>

            <button
              onClick={() => setActiveTab('camera')}
              className={`flex-1 py-2 px-3 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'camera'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">photo_camera</span>
              <span>2. Laptop Webcam</span>
            </button>

            <button
              onClick={() => setActiveTab('manual')}
              className={`py-2 px-3 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'manual'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              title="Manual SKU / 1-Tap test"
            >
              <span className="material-symbols-outlined text-[17px]">bolt</span>
              <span className="hidden sm:inline">3. Quick Test</span>
            </button>
          </div>

          {/* Live Scan Notification Toast */}
          <AnimatePresence>
            {latestScanToast && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-emerald-500 text-slate-950 font-mono text-xs font-bold px-4 py-2 flex items-center justify-between shadow-md shrink-0"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] animate-bounce">check_circle</span>
                  <span>{latestScanToast}</span>
                </div>
                <span className="text-[10px] uppercase bg-slate-950 text-white px-2 py-0.5 rounded-md font-bold">
                  Synced
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Modal Body Content */}
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 flex flex-col items-center">
            {/* Target Item Pill (if opened from item drawer) */}
            {targetItem && (
              <div className="mb-3.5 w-full bg-emerald-50/80 border border-emerald-200 rounded-2xl p-2.5 flex items-center justify-between text-left">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={targetItem.imageUrl}
                    alt={targetItem.name}
                    className="w-9 h-9 rounded-xl object-cover border border-emerald-300 shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono text-emerald-800 uppercase font-bold">Target Product:</span>
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {translateRecordedItem(targetItem.name, currentLang)}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold bg-white px-2 py-0.5 rounded-lg border border-emerald-300 text-emerald-800 shrink-0">
                  {targetItem.sku}
                </span>
              </div>
            )}

            {/* TAB 1: LIVE IN-APP CAMERA SCANNER (Primary & Recommended) */}
            {activeTab === 'camera' && (
              <div className="w-full flex flex-col items-center">
                {/* Mode Selector & Quantity Stepper */}
                <div className="mb-3 w-full flex items-center justify-between gap-2 flex-wrap">
                  <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200">
                    <button
                      onClick={() => setScanDirection('add')}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        scanDirection === 'add'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">add_circle</span>
                      <span>Restock (+)</span>
                    </button>
                    <button
                      onClick={() => setScanDirection('deduct')}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        scanDirection === 'deduct'
                          ? 'bg-rose-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">remove_circle</span>
                      <span>Dispense (-)</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-mono">
                    <span className="text-slate-500 font-medium">Qty per scan:</span>
                    {[1, 5, 10, 25].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setScanQty(amt)}
                        className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          scanQty === amt
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Embedded Camera Viewport */}
                <div className="relative w-full aspect-4/3 max-h-72 bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-800 shadow-xl flex items-center justify-center">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                  />

                  {/* Laser Scanning Reticle */}
                  {isCameraActive && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="relative w-48 h-48 border border-white/20 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] overflow-hidden">
                        {/* Corner accents */}
                        <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg"></div>
                        <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg"></div>
                        <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg"></div>
                        <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-lg"></div>
                        {/* Animated Laser Bar */}
                        <motion.div
                          animate={{ y: ['0%', '100%', '0%'] }}
                          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                          className="w-full h-0.5 bg-emerald-400 shadow-[0_0_10px_#34d399]"
                        />
                      </div>
                    </div>
                  )}

                  {/* Fallback / Camera Error State */}
                  {cameraError && (
                    <div className="absolute inset-0 bg-slate-900/95 p-4 flex flex-col items-center justify-center text-center text-white z-10">
                      <span className="material-symbols-outlined text-[36px] text-amber-400 mb-1">
                        videocam_off
                      </span>
                      <p className="text-xs font-bold font-mono text-slate-200 max-w-sm">
                        Camera Access Note:
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono mt-1 max-w-sm">
                        {cameraError}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={startCamera}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-mono font-bold cursor-pointer transition-colors"
                        >
                          Retry Camera
                        </button>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-mono font-bold cursor-pointer transition-colors"
                        >
                          Upload Barcode Photo
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Camera Live Controls Overlay */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-xs font-mono z-10 pointer-events-auto">
                    <span className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-[10px] text-emerald-400 font-bold border border-emerald-500/30 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      <span>Point camera at any barcode</span>
                    </span>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md text-white border border-slate-700 rounded-xl text-[10px] font-bold cursor-pointer flex items-center gap-1 shadow-sm transition-all"
                      title="Upload barcode image file"
                    >
                      <span className="material-symbols-outlined text-[13px]">upload_file</span>
                      <span>Scan Photo</span>
                    </button>
                  </div>
                </div>

                {/* Last Detected Code Bar */}
                {lastDetectedBarcode && (
                  <div className="mt-2.5 w-full px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-mono text-emerald-950 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-emerald-700 text-[16px]">qr_code</span>
                      <span>Last Detected: <strong className="font-bold">{lastDetectedBarcode}</strong></span>
                    </div>
                    <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-bold">
                      ✓ Instant Sync
                    </span>
                  </div>
                )}

                {/* Primary Action: Launch Fullscreen Immersive Camera Scanner */}
                <div className="mt-3.5 w-full flex flex-col sm:flex-row items-center gap-2">
                  <button
                    onClick={() => {
                      if (onOpenMobileView) {
                        stopCamera();
                        onOpenMobileView();
                        onClose();
                      }
                    }}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-mono font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[18px]">fullscreen</span>
                    <span>Launch Fullscreen Industrial Scanner (Recommended)</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: WIRELESS PHONE LINK (QR CODE) */}
            {activeTab === 'qr' && (
              <div className="w-full flex flex-col items-center">
                {/* Immediate 1-Click Launch Banner */}
                <div className="mb-4 w-full bg-slate-900 text-white rounded-2xl p-3.5 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-emerald-400 text-[24px]">fullscreen</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                        <span>Instant Mobile Scanner View</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">100% Active</span>
                      </h4>
                      <p className="text-[11px] text-slate-300 font-mono mt-0.5">
                        Launch the full-screen touch scanner right now with zero setup.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => {
                        stopCamera();
                        if (onOpenMobileView) onOpenMobileView();
                        onClose();
                      }}
                      className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-mono font-bold transition-all shadow-xs cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">touch_app</span>
                      <span>Launch In-App</span>
                    </button>
                    <a
                      href={scannerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-mono font-bold transition-all shadow-xs flex items-center justify-center gap-1"
                      title="Open in companion tab / window"
                    >
                      <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                      <span className="hidden sm:inline">New Tab</span>
                    </a>
                  </div>
                </div>

                {/* Status Indicator & Reset Button */}
                <div className="mb-3 w-full flex items-center justify-between gap-2 flex-wrap">
                  {sessionStatus !== 'waiting' ? (
                    <div className="flex-1 bg-emerald-50 border border-emerald-400 rounded-2xl p-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                        <span className="text-xs font-mono font-bold text-emerald-950">
                          {connectedDevice || 'Mobile Phone'} Linked &amp; Streaming!
                        </span>
                      </div>
                      <span className="text-xs font-mono bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-bold">
                        {scansCount} scans
                      </span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-mono font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                      <span>Pairing Session: <strong className="font-bold text-slate-900">{activeSessionId}</strong></span>
                    </div>
                  )}

                  <button
                    onClick={handleResetQrOptions}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 border border-slate-300 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 shadow-2xs"
                    title="Reset QR Options to default and start a new pairing session"
                  >
                    <span className="material-symbols-outlined text-[15px] text-emerald-700">restart_alt</span>
                    <span>Reset QR Option</span>
                  </button>
                </div>

                {/* QR Target Mode Selector */}
                <div className="mb-2 w-full max-w-sm flex p-1 bg-slate-100 border border-slate-200 rounded-xl gap-1 text-xs font-mono">
                  <button
                    onClick={() => setQrTargetMode('direct')}
                    className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      qrTargetMode === 'direct'
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Direct Link</span>
                  </button>
                  <button
                    onClick={() => setQrTargetMode('lan')}
                    className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      qrTargetMode === 'lan'
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Local Wi-Fi</span>
                  </button>
                  <button
                    onClick={() => {
                      setQrTargetMode('custom');
                      setIsEditingHost(true);
                    }}
                    className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      qrTargetMode === 'custom'
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Custom IP</span>
                  </button>
                </div>

                {/* If non-default mode or custom IP active, show quick reset pill */}
                {(qrTargetMode !== 'direct' || customHostInput) && (
                  <div className="mb-2.5 w-full max-w-sm flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-1 text-[11px] font-mono text-amber-900">
                    <span>Non-default QR mode active ({qrTargetMode})</span>
                    <button
                      onClick={handleResetQrOptions}
                      className="font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer flex items-center gap-0.5"
                    >
                      <span className="material-symbols-outlined text-[13px]">undo</span>
                      <span>Reset to Default</span>
                    </button>
                  </div>
                )}

                {/* Helpful Mode Explanation */}
                <div className="mb-3 w-full max-w-sm p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-left text-[11px] font-mono text-emerald-950 flex items-start gap-2">
                  <span className="material-symbols-outlined text-emerald-700 text-[18px] shrink-0 mt-0.5">info</span>
                  <div className="leading-snug">
                    {qrTargetMode === 'lan' ? (
                      <>
                        <strong>Local Wi-Fi Mode (Recommended for Phones):</strong> Connect phone to same Wi-Fi network. Scans open directly without any login or cookie check!
                        {detectedLanUrl && (
                          <div className="mt-1 text-[10px] text-emerald-800 truncate">
                            IP: <code>{detectedLanUrl}</code>
                          </div>
                        )}
                      </>
                    ) : qrTargetMode === 'custom' ? (
                      <>
                        <strong>Custom IP / Tunnel:</strong> Point QR code to your ngrok, localtunnel, or custom public IP port.
                      </>
                    ) : (
                      <>
                        <strong>Direct Web Scanner:</strong> Scans open the live web app directly with <code>?action=scan&amp;sku=...</code> to start scanning immediately.
                      </>
                    )}
                  </div>
                </div>

                {/* QR Code Container */}
                <div className="relative p-3.5 bg-white border-2 border-emerald-500/40 rounded-3xl shadow-xl flex flex-col items-center">
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="Mobile Scanner Pairing QR Code"
                      className="w-52 h-52 sm:w-60 sm:h-60 object-contain rounded-xl"
                    />
                  ) : (
                    <div className="w-52 h-52 sm:w-60 sm:h-60 flex items-center justify-center bg-slate-50 rounded-xl">
                      <span className="material-symbols-outlined text-[36px] text-slate-400 animate-spin">
                        sync
                      </span>
                    </div>
                  )}

                  <div className="mt-2 px-3 py-1 bg-slate-900 text-white rounded-full font-mono text-[10px] font-bold flex items-center gap-1.5 shadow-xs">
                    <span className="material-symbols-outlined text-[13px] text-emerald-400">photo_camera</span>
                    <span>
                      {qrTargetMode === 'lan'
                        ? 'LOCAL WI-FI SCANNER'
                        : qrTargetMode === 'custom'
                        ? 'CUSTOM HOST SCANNER'
                        : 'WIRELESS MOBILE SCANNER'}
                    </span>
                  </div>

                  {/* Target URL Preview & Copy */}
                  {(() => {
                    const activeUrlDisplayed =
                      qrTargetMode === 'lan' && detectedLanUrl
                        ? detectedLanUrl
                        : qrTargetMode === 'custom' && customHostInput
                        ? (customHostInput.startsWith('http') ? customHostInput : `http://${customHostInput}`) +
                          `/?action=scan&scanner=mobile&session=${activeSessionId}${targetItem?.sku ? `&sku=${encodeURIComponent(targetItem.sku)}` : ''}`
                        : scannerUrl;

                    return (
                      <>
                        <div className="mt-2.5 max-w-sm w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-mono text-slate-600 flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                            <span className="truncate text-slate-700" title={activeUrlDisplayed}>
                              {activeUrlDisplayed}
                            </span>
                          </div>
                          <button
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(activeUrlDisplayed);
                                setCopiedLink(true);
                                setTimeout(() => setCopiedLink(false), 2000);
                              } catch {}
                            }}
                            className="shrink-0 text-emerald-700 hover:text-emerald-800 font-bold hover:underline cursor-pointer"
                          >
                            {copiedLink ? '✓ Copied' : 'Copy'}
                          </button>
                        </div>

                        {/* Companion Tab Action & Instructions */}
                        <div className="mt-3 w-full max-w-sm flex flex-col gap-2">
                          <a
                            href={activeUrlDisplayed}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-mono font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                          >
                            <span className="material-symbols-outlined text-[17px]">open_in_new</span>
                            <span>Open Companion Scanner Tab (Test Sync)</span>
                          </a>

                          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-mono text-slate-600 space-y-1">
                            <div className="flex items-center gap-1.5 text-slate-900 font-bold">
                              <span className="material-symbols-outlined text-emerald-600 text-[16px]">touch_app</span>
                              <span>How Live QR Sync Works:</span>
                            </div>
                            <p className="text-slate-600">1. Scan QR code with any phone camera or open the companion tab.</p>
                            <p className="text-slate-600">2. Phone viewfinder opens automatically — aim at any product barcode.</p>
                            <p className="text-slate-600">3. Stock count immediately updates and syncs with this real dashboard!</p>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Optional Wi-Fi / Custom IP Tunnel Bar */}
                <div className="mt-3 w-full max-w-md flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                    <span>Need Wi-Fi / Local Network IP?</span>
                    <button
                      onClick={() => setIsEditingHost(!isEditingHost)}
                      className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline cursor-pointer"
                    >
                      {isEditingHost ? 'Hide IP Settings' : 'Configure IP / Tunnel'}
                    </button>
                  </div>

                  {isEditingHost && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-2 text-left">
                      <label className="text-[11px] font-mono text-slate-700 font-bold">
                        Local Wi-Fi IP or Tunnel URL (e.g. 192.168.1.50:3000):
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. http://192.168.1.100:3000"
                          value={customHostInput}
                          onChange={(e) => setCustomHostInput(e.target.value)}
                          className="flex-1 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                        />
                        {customHostInput && (
                          <button
                            onClick={() => setCustomHostInput('')}
                            className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-mono cursor-pointer"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                      {detectedLanUrl && !customHostInput && (
                        <button
                          onClick={() => {
                            try {
                              const parsed = new URL(detectedLanUrl);
                              setCustomHostInput(parsed.origin);
                            } catch {}
                          }}
                          className="text-[11px] font-mono text-emerald-800 font-semibold hover:underline text-left cursor-pointer flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">wifi</span>
                          <span>Click to use auto-detected LAN IP: {detectedLanUrl.split('?')[0]}</span>
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={handleResetQrOptions}
                      className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-mono font-bold rounded-xl border border-slate-300 transition-colors cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 shadow-2xs"
                      title="Reset QR Options to default and start a new pairing session"
                    >
                      <span className="material-symbols-outlined text-[16px] text-emerald-700">restart_alt</span>
                      <span>Reset QR Option</span>
                    </button>
                    <button
                      onClick={() => {
                        const newSid = `SES-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
                        setActiveSessionId(newSid);
                        setSessionStatus('waiting');
                        setLatestScanToast(`✓ Generated new session: ${newSid}`);
                        setTimeout(() => setLatestScanToast(null), 2500);
                      }}
                      className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-mono font-semibold rounded-xl border border-slate-300 transition-colors cursor-pointer flex items-center justify-center gap-1 active:scale-95"
                      title="Generate fresh session ID"
                    >
                      <span className="material-symbols-outlined text-[15px]">refresh</span>
                      <span>New Session</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: QUICK 1-TAP TEST & MANUAL BARCODE INPUT */}
            {activeTab === 'manual' && (
              <div className="w-full flex flex-col items-center">
                {/* Manual Barcode / SKU input */}
                <form onSubmit={handleManualScanSubmit} className="w-full mb-4">
                  <label className="block text-xs font-mono font-bold text-slate-700 mb-1 text-left">
                    Type SKU or Barcode to simulate scan:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. MILK-500, OIL-1L, RICE-5KG..."
                      value={manualCodeInput}
                      onChange={(e) => setManualCodeInput(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono font-bold rounded-xl cursor-pointer transition-colors shadow-xs"
                    >
                      Scan Barcode
                    </button>
                  </div>
                </form>

                {/* 1-Tap Quick Sample Barcode Buttons */}
                <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col text-left">
                  <span className="text-[11px] font-mono text-slate-500 font-bold uppercase mb-2">
                    ⚡ 1-Tap Sample Barcodes (Immediate Restock):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {inventoryList.slice(0, 6).map((item) => (
                      <button
                        key={item.sku}
                        onClick={() => handleBarcodeScanned(item.sku)}
                        className="p-2.5 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl transition-all cursor-pointer flex items-center justify-between text-left group shadow-2xs"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-bold text-slate-800 truncate group-hover:text-emerald-950">
                            {translateRecordedItem(item.name, currentLang)}
                          </p>
                          <span className="text-[10px] font-mono text-slate-400">
                            SKU: {item.sku} ({item.currentStock} {item.unit})
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-lg shrink-0">
                          +1 Scan
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
