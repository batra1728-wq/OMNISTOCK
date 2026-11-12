import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ScreenId,
  UserProfile,
  InventoryItem,
  ActivityLog,
  SystemAlert,
  PurchaseOrder,
  BatchRecommendation,
  LanguageCode,
} from './types';
import {
  INITIAL_USER,
  INITIAL_ACCOUNTS,
  INITIAL_INVENTORY,
  INITIAL_ACTIVITIES,
  INITIAL_ALERTS,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_BATCH_RECOMMENDATIONS,
} from './data/mockData';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { SignInScreen } from './components/SignInScreen';
import { DashboardScreen } from './components/DashboardScreen';
import { InventoryScreen } from './components/InventoryScreen';
import { ReorderingScreen } from './components/ReorderingScreen';
import { AnalyticsScreen } from './components/AnalyticsScreen';
import { ScannerModal } from './components/ScannerModal';
import { AlertsModal } from './components/AlertsModal';
import { AddStockModal } from './components/AddStockModal';
import { EditStockModal } from './components/EditStockModal';
import { ExportReportModal } from './components/ExportReportModal';
import { AIAssistantModal } from './components/AIAssistantModal';
import { WarehouseGuideModal } from './components/WarehouseGuideModal';
import { AccountSwitcherModal } from './components/AccountSwitcherModal';
import { DeleteAccountModal } from './components/DeleteAccountModal';
import { SettingsModal } from './components/SettingsModal';
import { MobileScannerView } from './components/MobileScannerView';
import { DesktopAlertBanner } from './components/DesktopAlertBanner';
import { useLanguageAutoTranslate } from './utils/i18n';
import { parseScannerUrlParams, ParsedScannerParams } from './utils/qrUtils';
import {
  HardwareScannerEngine,
  normalizeBarcode,
  isValidBarcode,
} from './utils/hardwareScanner';
import {
  dispatchStockThresholdAlert,
  getReorderPoint,
  isBelowReorderPoint,
} from './utils/desktopNotification';

let actGlobalCounter = 0;
export const generateActivityId = (prefix = 'act') => {
  actGlobalCounter = (actGlobalCounter + 1) % 1000000;
  const rand = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${Date.now()}-${actGlobalCounter}-${rand}`;
};

export default function App() {
  // Navigation & User State (Initial Screen is 'dashboard' so the app is instantly functional)
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('dashboard');

  // Language State (22 Indian Languages + English)
  const [language, setLanguage] = useState<LanguageCode>(() => {
    try {
      const saved = localStorage.getItem('omnistock_lang');
      if (saved) return saved as LanguageCode;
    } catch {}
    return 'en';
  });

  // Activate Universal Automatic Language Translation across every page & DOM word
  useLanguageAutoTranslate(language);

  // Sync language to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('omnistock_lang', language);
    } catch {}
  }, [language]);
  
  // Multi-Account State with LocalStorage Persistence
  const [accounts, setAccounts] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem('omnistock_saved_accounts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return INITIAL_ACCOUNTS;
  });

  const [user, setUser] = useState<UserProfile>(() => accounts[0] || INITIAL_USER);

  // Sync accounts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('omnistock_saved_accounts', JSON.stringify(accounts));
    } catch {
      // Ignore storage errors in sandbox
    }
  }, [accounts]);

  // Application Data States with LocalStorage Persistence
  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('omnistock_saved_inventory');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return INITIAL_INVENTORY;
  });

  // Guaranteed Unique & Deduplicated Activity Logs (Sanitizes any duplicate keys from legacy storage)
  const [activities, setActivities] = useState<ActivityLog[]>(() => {
    try {
      const saved = localStorage.getItem('omnistock_saved_activities');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const seenIds = new Set<string>();
          const deduped: ActivityLog[] = [];
          for (const item of parsed) {
            if (item && item.id && !seenIds.has(item.id)) {
              seenIds.add(item.id);
              deduped.push(item);
            } else if (item) {
              const uniqueId = generateActivityId('act-sanitized');
              seenIds.add(uniqueId);
              deduped.push({ ...item, id: uniqueId });
            }
          }
          return deduped;
        }
      }
    } catch {}
    return INITIAL_ACTIVITIES;
  });

  // Helper to safely append activity logs with guaranteed unique IDs and collision prevention
  const addActivityLog = (newLog: ActivityLog) => {
    setActivities((prev) => {
      let finalId = newLog.id || generateActivityId('act');
      if (prev.some((a) => a.id === finalId)) {
        finalId = `${finalId}-${Math.random().toString(36).substring(2, 6)}`;
      }
      const entry: ActivityLog = { ...newLog, id: finalId };
      return [entry, ...prev.filter((a) => a.id !== entry.id)];
    });
  };

  // Persistent storage sync for inventory
  useEffect(() => {
    try {
      localStorage.setItem('omnistock_saved_inventory', JSON.stringify(inventory));
    } catch {}
    // Background sync to server
    fetch('/api/inventory/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inventory }),
    }).catch(() => {});
  }, [inventory]);

  // Persistent storage sync for activities
  useEffect(() => {
    try {
      localStorage.setItem('omnistock_saved_activities', JSON.stringify(activities));
    } catch {}
  }, [activities]);

  // Initial load: fetch latest items from backend server and merge
  useEffect(() => {
    fetch('/api/inventory')
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.inventory) && data.inventory.length > 0) {
          setInventory((prev) => {
            const map = new Map<string, InventoryItem>();
            for (const it of prev) {
              map.set(it.sku.toUpperCase(), it);
            }
            for (const sItem of data.inventory) {
              const existing = map.get(sItem.sku.toUpperCase());
              if (!existing) {
                map.set(sItem.sku.toUpperCase(), sItem);
              } else {
                if (sItem.isScanned || sItem.scannedAt || sItem.currentStock !== existing.currentStock) {
                  map.set(sItem.sku.toUpperCase(), { ...existing, ...sItem });
                }
              }
            }
            const merged = Array.from(map.values());
            try {
              localStorage.setItem('omnistock_saved_inventory', JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      })
      .catch(() => {});
  }, []);
  const [alerts, setAlerts] = useState<SystemAlert[]>(INITIAL_ALERTS);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(INITIAL_PURCHASE_ORDERS);
  const [batchRecs, setBatchRecs] = useState<BatchRecommendation[]>(INITIAL_BATCH_RECOMMENDATIONS);

  // Modal & Search States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [scannerTargetItem, setScannerTargetItem] = useState<InventoryItem | null>(null);
  const [isAlertsOpen, setIsAlertsOpen] = useState<boolean>(false);
  const [isAddStockOpen, setIsAddStockOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Mobile Scanner Mode & URL Parameter Detection (e.g., ?sku=XYZ&action=scan)
  const [initialScannerParams] = useState<ParsedScannerParams>(() => parseScannerUrlParams());
  const [isMobileScannerMode, setIsMobileScannerMode] = useState<boolean>(
    () => initialScannerParams.isScannerTriggered
  );
  const [activeScannerSku, setActiveScannerSku] = useState<string | null>(() => initialScannerParams.sku);
  const [activeScannerAction, setActiveScannerAction] = useState<string | null>(() => initialScannerParams.action);
  const [activeScannerSession, setActiveScannerSession] = useState<string | null>(
    () => initialScannerParams.session
  );
  const [activeScannerQty, setActiveScannerQty] = useState<number | null>(() => initialScannerParams.qty);
  const [activeScannerMode, setActiveScannerMode] = useState<'add' | 'deduct' | null>(
    () => initialScannerParams.mode
  );

  // Dynamic listener for popstate and hashchange to catch URL query changes without full reload
  useEffect(() => {
    const handleUrlChange = () => {
      const parsed = parseScannerUrlParams();
      if (parsed.isScannerTriggered) {
        setIsMobileScannerMode(true);
        if (parsed.sku) setActiveScannerSku(parsed.sku);
        if (parsed.action) setActiveScannerAction(parsed.action);
        if (parsed.session) setActiveScannerSession(parsed.session);
        if (parsed.qty !== null) setActiveScannerQty(parsed.qty);
        if (parsed.mode) setActiveScannerMode(parsed.mode);
      }
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  // Real-time Linked Mobile Device State (tracks live camera phone paired to this session)
  const [linkedMobileDevice, setLinkedMobileDevice] = useState<{
    sessionId: string;
    device: string;
    connectedAt: number;
  } | null>(null);

  // Recently updated SKU for spotlighting & live highlight animation
  const [recentlyUpdatedSku, setRecentlyUpdatedSku] = useState<string | null>(null);
  const recentlyUpdatedTimeoutRef = useRef<any>(null);
  const processedEventIdsRef = useRef<Set<string>>(new Set());

  const triggerRecentUpdate = (sku: string) => {
    setRecentlyUpdatedSku(sku);
    if (recentlyUpdatedTimeoutRef.current) {
      clearTimeout(recentlyUpdatedTimeoutRef.current);
    }
    recentlyUpdatedTimeoutRef.current = setTimeout(() => {
      setRecentlyUpdatedSku(null);
    }, 6000);
  };

  // Account Management Modals
  const [isAccountSwitcherOpen, setIsAccountSwitcherOpen] = useState<boolean>(false);
  const [accountToDelete, setAccountToDelete] = useState<UserProfile | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Auth & Account Switching Handlers
  const handleSignIn = (signedInUser: UserProfile, isNewUser?: boolean) => {
    setUser(signedInUser);

    // If new user or not in accounts list, add it
    setAccounts((prev) => {
      if (!prev.some((a) => a.id === signedInUser.id || a.email.toLowerCase() === signedInUser.email.toLowerCase())) {
        return [...prev, signedInUser];
      }
      return prev;
    });

    if (isNewUser) {
      // For freshly registered commercial users, display a completely fresh workspace!
      setInventory([]);
      setActivities([
        {
          id: generateActivityId('act-acc'),
          activity: `Account Created (${signedInUser.name})`,
          reference: `#ACC-${Math.floor(1000 + Math.random() * 9000)}`,
          user: signedInUser.name,
          time: 'Just now',
          icon: 'person_add',
          type: 'new_sku',
        },
      ]);
      setPurchaseOrders([]);
      setCurrentScreen('inventory');
      setIsGuideOpen(true);
      showToast(`Welcome to OmniStock, ${signedInUser.name}! Fresh warehouse initialized.`);
    } else {
      setCurrentScreen('dashboard');
      showToast(`Welcome back, ${signedInUser.name}`);
    }
  };

  const handleSwitchAccount = (targetUser: UserProfile) => {
    setUser(targetUser);
    showToast(`Switched active operator to ${targetUser.name} (${targetUser.staffId})`);
  };

  const handleAddAccount = (newUser: UserProfile) => {
    setAccounts((prev) => [...prev, newUser]);
    setUser(newUser);
    showToast(`Registered and switched to ${newUser.name} (${newUser.staffId})`);
  };

  const handleRequestDeleteAccount = (targetUser: UserProfile) => {
    setAccountToDelete(targetUser);
  };

  const handleConfirmDeleteAccount = (reason?: string) => {
    if (!accountToDelete) return;

    const deletingTarget = accountToDelete;
    const isCurrentActive = deletingTarget.id === user.id;

    // Filter out deleted account
    const remainingAccounts = accounts.filter((a) => a.id !== deletingTarget.id);
    setAccounts(remainingAccounts.length > 0 ? remainingAccounts : [INITIAL_USER]);

    setAccountToDelete(null);
    setIsAccountSwitcherOpen(false);

    if (isCurrentActive) {
      if (remainingAccounts.length > 0) {
        const nextUser = remainingAccounts[0];
        setUser(nextUser);
        showToast(`Account for ${deletingTarget.name} deleted. Switched to ${nextUser.name}.`);
      } else {
        setUser(INITIAL_USER);
        setCurrentScreen('signin');
        showToast(`Account for ${deletingTarget.name} deleted. Redirected to Sign In.`);
      }
    } else {
      showToast(`Account for ${deletingTarget.name} has been removed.`);
    }
  };

  const handleSignOut = () => {
    setCurrentScreen('signin');
    showToast('Signed out of OmniStock successfully');
  };

  const handleLoadSampleCatalog = () => {
    setInventory(INITIAL_INVENTORY);
    setActivities(INITIAL_ACTIVITIES);
    setPurchaseOrders(INITIAL_PURCHASE_ORDERS);
    showToast('Loaded standard culinary catalog (15 SKUs)');
  };

  // Reordering Quick PO Creator
  const handleQuickReorder = (item: InventoryItem) => {
    const poNumber = `PO-2024-${Math.floor(800 + Math.random() * 199)}`;
    const newPO: PurchaseOrder = {
      id: `po-${Date.now()}`,
      poNumber,
      supplier: item.category === 'Dairy' ? 'FreshCo Dairy & Produce' : 'Global Grain & Supply',
      itemsSummary: `1 SKU (${item.name})`,
      totalValue: item.price * Math.max(1, item.maxStock - item.currentStock),
      skuCount: 1,
      status: 'pending',
      isAiGenerated: true,
      category: item.category,
    };
    setPurchaseOrders((prev) => [newPO, ...prev]);
    setCurrentScreen('reordering');
    showToast(`Draft Purchase Order ${poNumber} created for ${item.name}`);
  };

  // Automated Desktop Alert Watcher on Stock Threshold Breach
  const checkAndNotifyStockThreshold = (
    item: InventoryItem,
    options?: { force?: boolean }
  ) => {
    try {
      const disabled = localStorage.getItem('omnistock_desktop_alerts_enabled') === 'false';
      if (disabled && !options?.force) return;
    } catch {}

    const threshold = getReorderPoint(item);
    if (item.currentStock <= threshold || options?.force) {
      const alertPayload = dispatchStockThresholdAlert(item, {
        force: options?.force,
        onNotificationClick: () => {
          handleQuickReorder(item);
        },
      });

      if (alertPayload) {
        const isCritical = item.currentStock === 0;
        const alertTitle = isCritical
          ? `Stock Out: ${item.name} (${item.sku})`
          : `Par Limit: ${item.name} (${item.sku}) Below Reorder Point`;

        const alertDesc = isCritical
          ? `Stock has depleted to 0 ${item.unit}. Par reorder threshold is ${threshold} ${item.unit}. Immediate purchase order required.`
          : `Stock (${item.currentStock} ${item.unit}) has dropped below defined reorder point (${threshold} ${item.unit}). Deficit of ${alertPayload.deficit} ${item.unit}.`;

        const newSystemAlert: SystemAlert = {
          id: `alert-reorder-${item.sku}-${Date.now()}`,
          title: alertTitle,
          description: alertDesc,
          time: 'Just now',
          severity: isCritical ? 'critical' : 'warning',
          icon: isCritical ? 'report' : 'notification_important',
          read: false,
          actionPrimary: 'Generate PO',
          actionSecondary: 'View Inventory',
        };

        setAlerts((prev) => {
          const deduped = prev.filter((a) => !a.id.startsWith(`alert-reorder-${item.sku}`));
          return [newSystemAlert, ...deduped];
        });
      }
    }
  };

  // Automated background threshold watcher: fires desktop alert when stock decreases to/below reorder point
  const prevStockMapRef = useRef<Map<string, number>>(new Map());
  const isInitialCatalogLoadedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!inventory || inventory.length === 0) return;

    if (!isInitialCatalogLoadedRef.current) {
      isInitialCatalogLoadedRef.current = true;
      for (const item of inventory) {
        prevStockMapRef.current.set(item.sku, item.currentStock);
      }
      return;
    }

    for (const item of inventory) {
      const prevStock = prevStockMapRef.current.get(item.sku);
      if (prevStock !== undefined && item.currentStock < prevStock) {
        if (isBelowReorderPoint(item)) {
          checkAndNotifyStockThreshold(item);
        }
      }
      prevStockMapRef.current.set(item.sku, item.currentStock);
    }
  }, [inventory]);

  // Inventory Handlers
  const handleRefillQuantity = (sku: string, addedQty: number) => {
    triggerRecentUpdate(sku);
    let updatedItem: InventoryItem | null = null;

    setInventory((prev) =>
      prev.map((item) => {
        if (item.sku === sku) {
          const newStock = Math.max(0, item.currentStock + addedQty);
          let newStatus = item.status;
          if (newStock >= item.maxStock) newStatus = 'FULL';
          else if (newStock > item.maxStock * 0.4) newStatus = 'OPTIMAL';
          else if (newStock > item.maxStock * 0.2) newStatus = 'REORDER';
          else newStatus = 'LOW';
          updatedItem = {
            ...item,
            currentStock: newStock,
            status: newStatus,
          };
          return updatedItem;
        }
        return item;
      })
    );

    if (updatedItem) {
      checkAndNotifyStockThreshold(updatedItem);
    }

    // Record in activity log
    const target = inventory.find((i) => i.sku === sku);
    addActivityLog({
      id: generateActivityId('act-adj'),
      activity: addedQty >= 0 ? `Restocked ${target?.name || sku}` : `Corrected Stock for ${target?.name || sku}`,
      reference: `#R-${Math.floor(100 + Math.random() * 900)}`,
      user: user.name,
      time: 'Just now',
      icon: addedQty >= 0 ? 'download' : 'sync',
      type: 'shipment',
    });
    showToast(`${addedQty >= 0 ? 'Restocked' : 'Adjusted'} ${Math.abs(addedQty)} units of ${target?.name || sku}`);

    // Instant Real-Time Propagation across all screens, tabs, and mobile scanners
    const eventId = `desk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    processedEventIdsRef.current.add(eventId);

    const syncPayload = {
      type: 'scan_event',
      event: {
        id: eventId,
        sku,
        itemName: target?.name || sku,
        unit: target?.unit || 'units',
        addedQty,
        newStock: updatedItem ? (updatedItem as InventoryItem).currentStock : undefined,
        device: `${user.name} (Dashboard)`,
        timestamp: Date.now(),
      },
    };

    // 1. Cross-tab instant local BroadcastChannel
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('omnistock_realtime');
        bc.postMessage(syncPayload);
        bc.close();
      }
      localStorage.setItem('omnistock_live_scan', JSON.stringify({ ...syncPayload, t: Date.now() }));
    } catch {}

    // 2. Server API broadcast (pushes to connected mobile devices via SSE)
    fetch('/api/inventory/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sku,
        addedQty,
        device: `${user.name} (Dashboard)`,
      }),
    }).catch(() => {});
  };

  // Dedicated handler for mobile phone camera scans (automatic real-time sync)
  const handleMobileScanUpdate = (
    sku: string,
    addedQty: number,
    deviceName: string = 'Mobile Phone Camera',
    customItemName?: string,
    unitStr?: string,
    exactNewStock?: number
  ) => {
    let affectedItemName = customItemName || sku;
    let affectedUnit = unitStr || 'units';
    triggerRecentUpdate(sku);

    setInventory((prev) => {
      let found = false;
      const updated = prev.map((item) => {
        if (item.sku === sku) {
          found = true;
          affectedItemName = item.name;
          affectedUnit = item.unit;
          const newStock = exactNewStock !== undefined && !isNaN(exactNewStock)
            ? Math.max(0, exactNewStock)
            : Math.max(0, item.currentStock + addedQty);
          let newStatus = item.status;
          if (newStock >= item.maxStock) newStatus = 'FULL';
          else if (newStock > item.maxStock * 0.4) newStatus = 'OPTIMAL';
          else if (newStock > item.maxStock * 0.2) newStatus = 'REORDER';
          else newStatus = 'LOW';
          return {
            ...item,
            currentStock: newStock,
            status: newStatus,
            isScanned: true,
            scannedAt: Date.now(),
            unit: unitStr ? unitStr.trim() : item.unit,
          };
        }
        return item;
      });

      if (!found) {
        const finalName = customItemName?.trim() || `Scanned Item (${sku})`;
        affectedItemName = finalName;
        affectedUnit = unitStr || 'boxes';
        const finalStock = exactNewStock !== undefined && !isNaN(exactNewStock) ? Math.max(0, exactNewStock) : Math.max(0, addedQty);
        const newItem: InventoryItem = {
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: finalName,
          sku,
          barcode: sku,
          category: 'Pantry',
          currentStock: finalStock,
          maxStock: Math.max(100, finalStock * 2),
          unit: affectedUnit,
          price: 180,
          expiryDate: '2027-12-31',
          daysToExpiry: 450,
          status: finalStock > 20 ? 'OPTIMAL' : 'LOW',
          imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=300&h=300',
          location: 'Zone A-01',
          isScanned: true,
          scannedAt: Date.now(),
        };
        return [newItem, ...updated];
      }
      return updated;
    });

    // Save to scanned items history list for permanent record
    try {
      const prevHist = JSON.parse(localStorage.getItem('omnistock_scanned_items_history') || '[]');
      const scanRecord = {
        id: `scan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        sku,
        itemName: affectedItemName,
        unit: affectedUnit,
        addedQty,
        newStock: exactNewStock !== undefined ? exactNewStock : undefined,
        device: deviceName,
        timestamp: Date.now(),
      };
      const updatedHist = [scanRecord, ...prevHist.filter((x: any) => x.id !== scanRecord.id)].slice(0, 100);
      localStorage.setItem('omnistock_scanned_items_history', JSON.stringify(updatedHist));
    } catch {}

    addActivityLog({
      id: generateActivityId('act-mob'),
      activity: `Stock Update: ${addedQty >= 0 ? '+' : ''}${addedQty} ${affectedUnit}`,
      reference: `${affectedItemName} (${sku})`,
      user: deviceName || 'Mobile Camera',
      time: 'Just now',
      icon: 'qr_code_scanner',
      type: 'shipment',
    });

    const targetItem = inventory.find((i) => i.sku === sku);
    if (targetItem) {
      const finalStock = exactNewStock !== undefined && !isNaN(exactNewStock)
        ? Math.max(0, exactNewStock)
        : Math.max(0, targetItem.currentStock + addedQty);
      checkAndNotifyStockThreshold({
        ...targetItem,
        currentStock: finalStock,
      });
    }

    showToast(`⚡ Live Update: ${addedQty >= 0 ? '+' : ''}${addedQty} ${affectedUnit} of ${affectedItemName} (${sku}) via ${deviceName}!`);
  };

  // Dedicated handler for brand-new products added in real time (via Mobile Camera or Manual)
  const handleProductAddedLive = (newProd: InventoryItem, deviceName: string = 'Mobile Camera') => {
    triggerRecentUpdate(newProd.sku);
    const itemWithScan: InventoryItem = {
      ...newProd,
      isScanned: true,
      scannedAt: Date.now(),
    };

    setInventory((prev) => {
      if (prev.some((i) => i.sku === itemWithScan.sku)) {
        return prev.map((i) => (i.sku === itemWithScan.sku ? { ...i, ...itemWithScan } : i));
      }
      return [itemWithScan, ...prev];
    });

    try {
      const prevHist = JSON.parse(localStorage.getItem('omnistock_scanned_items_history') || '[]');
      const scanRecord = {
        id: `scan-add-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        sku: itemWithScan.sku,
        itemName: itemWithScan.name,
        unit: itemWithScan.unit,
        addedQty: itemWithScan.currentStock,
        newStock: itemWithScan.currentStock,
        device: deviceName,
        timestamp: Date.now(),
      };
      const updatedHist = [scanRecord, ...prevHist.filter((x: any) => x.id !== scanRecord.id)].slice(0, 100);
      localStorage.setItem('omnistock_scanned_items_history', JSON.stringify(updatedHist));
    } catch {}

    addActivityLog({
      id: generateActivityId('act-new'),
      activity: `New Product Added: ${itemWithScan.name} (+${itemWithScan.currentStock} ${itemWithScan.unit})`,
      reference: `#SKU-${itemWithScan.sku}`,
      user: deviceName || 'Mobile Camera',
      time: 'Just now',
      icon: 'add_box',
      type: 'new_sku',
    });

    showToast(`✨ Real-Time: Added "${itemWithScan.name}" (${itemWithScan.sku}) to warehouse catalog!`);
  };

  // Real-Time Background Synchronization: Listen for Mobile Camera Scans & Product Additions
  useEffect(() => {
    // Initial sync of catalog to server
    fetch('/api/inventory/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inventory }),
    }).catch(() => {});

    // Common event dispatcher with strict ID deduplication
    const processIncomingEvent = (data: any) => {
      if (!data) return;

      // Event type 1: Mobile camera phone automatically linked
      if (data.type === 'mobile_connected') {
        const dev = data.device || 'Mobile Phone Camera';
        setLinkedMobileDevice({
          sessionId: data.sessionId,
          device: dev,
          connectedAt: data.timestamp || Date.now(),
        });
        showToast(`🎉 Mobile camera linked automatically! (${dev})`);
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, ctx.currentTime);
            osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
            osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.4);
          }
        } catch {}
        return;
      }

      // Event type 2: Stock updated (scan / refill)
      if (data.type === 'scan_event' && data.event) {
        const ev = data.event;
        if (ev.id) {
          if (processedEventIdsRef.current.has(ev.id)) return;
          processedEventIdsRef.current.add(ev.id);
        }
        handleMobileScanUpdate(ev.sku, ev.addedQty, ev.device, ev.itemName, ev.unit, ev.newStock);
        return;
      }

      // Event type 3: Brand new product added
      if (data.type === 'product_added' && data.product) {
        const prod = data.product;
        const eventId = data.event?.id || `new-prod-${prod.sku}`;
        if (processedEventIdsRef.current.has(eventId)) return;
        processedEventIdsRef.current.add(eventId);
        handleProductAddedLive(prod, data.device || 'Mobile Phone');
        return;
      }

      // Event type 4: Item deleted in real-time
      if (data.type === 'item_deleted' && (data.sku || data.id)) {
        const targetSku = data.sku;
        const targetId = data.id;
        const eventId = data.eventId || (data.event && data.event.id) || `del-${targetSku || targetId}-${data.timestamp || ''}`;
        if (processedEventIdsRef.current.has(eventId)) return;
        processedEventIdsRef.current.add(eventId);

        setInventory((prev) =>
          prev.filter((i) => (!targetSku || i.sku !== targetSku) && (!targetId || i.id !== targetId))
        );
        addActivityLog({
          id: generateActivityId('act-del'),
          activity: `Item Removed: ${data.itemName || targetSku}`,
          reference: `#SKU-${targetSku || targetId}`,
          user: data.device || 'Commercial Operator',
          time: 'Just now',
          icon: 'delete',
          type: 'removal',
        });
        showToast(`Removed "${data.itemName || targetSku}" from inventory`);
        return;
      }

      // Event type 5: Batch items deleted in real-time
      if (data.type === 'items_batch_deleted' && (Array.isArray(data.skus) || Array.isArray(data.ids))) {
        const eventId = data.eventId || (data.event && data.event.id) || `bdel-${(data.skus || []).join('-')}-${data.timestamp || ''}`;
        if (processedEventIdsRef.current.has(eventId)) return;
        processedEventIdsRef.current.add(eventId);

        const skusSet = new Set((data.skus || []).map((s: string) => String(s).toUpperCase()));
        const idsSet = new Set(data.ids || []);
        setInventory((prev) => prev.filter((i) => !skusSet.has(i.sku.toUpperCase()) && !idsSet.has(i.id)));
        addActivityLog({
          id: generateActivityId('act-bdel'),
          activity: `Batch Removal (${data.count || skusSet.size} SKUs)`,
          reference: `#DEL-${Math.floor(100 + Math.random() * 900)}`,
          user: data.device || 'Commercial Operator',
          time: 'Just now',
          icon: 'delete_sweep',
          type: 'removal',
        });
        showToast(`Removed ${data.count || skusSet.size} items from inventory`);
        return;
      }
    };

    // 1. Cross-tab instant local BroadcastChannel
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('omnistock_realtime');
        bc.onmessage = (e) => {
          processIncomingEvent(e.data);
        };
      }
    } catch {}

    // 2. Storage event fallback for cross-window
    const handleStorageChange = (e: StorageEvent) => {
      try {
        if (e.key === 'omnistock_live_scan' && e.newValue) {
          const parsed = JSON.parse(e.newValue);
          processIncomingEvent(parsed);
        } else if (e.key === 'omnistock_live_product' && e.newValue) {
          const parsed = JSON.parse(e.newValue);
          processIncomingEvent(parsed);
        } else if (e.key === 'omnistock_mobile_connected' && e.newValue) {
          const parsed = JSON.parse(e.newValue);
          processIncomingEvent({ type: 'mobile_connected', ...parsed });
        } else if (e.key === 'omnistock_live_deleted' && e.newValue) {
          const parsed = JSON.parse(e.newValue);
          processIncomingEvent({ type: 'item_deleted', ...parsed });
        } else if (e.key === 'omnistock_live_batch_deleted' && e.newValue) {
          const parsed = JSON.parse(e.newValue);
          processIncomingEvent({ type: 'items_batch_deleted', ...parsed });
        }
      } catch {}
    };
    window.addEventListener('storage', handleStorageChange);

    // 3. Server-Sent Events (SSE) Stream
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/scanner/events');
      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          processIncomingEvent(data);
        } catch {}
      };
      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
      };
    } catch {}

    // 4. Polling Fallback (every 1.2s) for guaranteed event pickup across devices
    let lastChecked = Date.now() - 30000;
    const pollInterval = setInterval(async () => {
      try {
        // Local server updates
        const res = await fetch(`/api/scanner/updates?since=${lastChecked}`);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.events) && data.events.length > 0) {
            for (const ev of data.events) {
              if (ev.timestamp > lastChecked) {
                lastChecked = Math.max(lastChecked, ev.timestamp);
              }
              processIncomingEvent({ type: 'scan_event', event: ev });
            }
          }
        }
      } catch {}
    }, 1200);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorageChange);
      if (eventSource) eventSource.close();
      clearInterval(pollInterval);
    };
  }, []);

  // Global Wireless Hardware Scanner (captures Bluetooth HID and USB OTG scanner bursts across the dashboard)
  useEffect(() => {
    if (isMobileScannerMode || isScannerOpen) return;

    const engine = new HardwareScannerEngine({
      onScan: (rawBarcode) => {
        const barcode = normalizeBarcode(rawBarcode);
        if (!isValidBarcode(barcode)) return;

        const found = inventory.find(
          (i) =>
            i.sku.toUpperCase() === barcode.toUpperCase() ||
            (Boolean((i as any).barcode) && (i as any).barcode.toUpperCase() === barcode.toUpperCase())
        );

        if (found) {
          try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
              const ctx = new AudioCtx();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(880, ctx.currentTime);
              gain.gain.setValueAtTime(0.2, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start();
              osc.stop(ctx.currentTime + 0.25);
            }
          } catch {}

          setScannerTargetItem(found);
          setIsScannerOpen(true);
          showToast(`🎯 Wireless Barcode Matched: ${found.name} (${found.sku})`);
        } else {
          showToast(`🔍 Barcode "${barcode}" scanned: Item not found in catalog`);
        }
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
  }, [isMobileScannerMode, isScannerOpen, inventory]);

  const handleBatchRefill = (items: Array<{ sku: string; quantity: number }>) => {
    if (!items || items.length === 0) return;

    const qtyMap = new Map<string, number>();
    for (const it of items) {
      qtyMap.set(it.sku, (qtyMap.get(it.sku) || 0) + it.quantity);
      triggerRecentUpdate(it.sku);
    }

    setInventory((prev) =>
      prev.map((item) => {
        const added = qtyMap.get(item.sku);
        if (added !== undefined && added !== 0) {
          const newStock = Math.max(0, item.currentStock + added);
          let newStatus = item.status;
          if (newStock >= item.maxStock) newStatus = 'FULL';
          else if (newStock > item.maxStock * 0.4) newStatus = 'OPTIMAL';
          else if (newStock > item.maxStock * 0.2) newStatus = 'REORDER';
          else newStatus = 'LOW';
          return {
            ...item,
            currentStock: newStock,
            status: newStatus,
          };
        }
        return item;
      })
    );

    addActivityLog({
      id: generateActivityId('act-br'),
      activity: `Batch Restock (${items.length} SKUs)`,
      reference: `#BR-${Math.floor(100 + Math.random() * 900)}`,
      user: user.name,
      time: 'Just now',
      icon: 'inventory_2',
      type: 'shipment',
    });
    showToast(`Batch restocked ${items.length} items successfully`);

    // Sync to server and broadcast to mobile devices
    fetch('/api/inventory/batch-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items,
        device: `${user.name} (Dashboard Batch)`,
      }),
    }).catch(() => {});
  };

  const handleAddItem = (newItemData: Omit<InventoryItem, 'id'>) => {
    const newItem: InventoryItem = {
      ...newItemData,
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    triggerRecentUpdate(newItem.sku);
    setInventory((prev) => [newItem, ...prev]);

    // Record activity
    addActivityLog({
      id: generateActivityId('act-reg'),
      activity: `New SKU Registered (${newItem.sku})`,
      reference: `#N-${Math.floor(10 + Math.random() * 89)}`,
      user: user.name,
      time: 'Just now',
      icon: 'add_box',
      type: 'new_sku',
    });
    showToast(`Registered SKU: ${newItem.name}`);

    // Sync to server and broadcast
    fetch('/api/products/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product: newItem,
        device: `${user.name} (Dashboard)`,
      }),
    }).catch(() => {});

    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('omnistock_realtime');
        bc.postMessage({ type: 'product_added', product: newItem, device: `${user.name} (Dashboard)` });
        bc.close();
      }
      localStorage.setItem('omnistock_live_product', JSON.stringify({ product: newItem, t: Date.now() }));
    } catch {}

    checkAndNotifyStockThreshold(newItem);
  };

  const handleUpdateItem = (updated: InventoryItem) => {
    triggerRecentUpdate(updated.sku);
    setInventory((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    checkAndNotifyStockThreshold(updated);

    addActivityLog({
      id: generateActivityId('act-cor'),
      activity: `Stock Correction (${updated.sku})`,
      reference: `#${Math.floor(100 + Math.random() * 900)}A`,
      user: user.name,
      time: 'Just now',
      icon: 'history',
      type: 'correction',
    });
    showToast(`Updated stock details for ${updated.name}`);

    // Sync to server
    fetch('/api/inventory/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sku: updated.sku,
        newStock: updated.currentStock,
        mode: 'set',
        device: `${user.name} (Dashboard Edit)`,
      }),
    }).catch(() => {});
  };

  const handleDeleteItem = async (itemToDelete: InventoryItem) => {
    // Generate unique eventId and register to prevent echoing duplicates
    const eventId = `del-${itemToDelete.sku}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    processedEventIdsRef.current.add(eventId);

    // 1. Remove from local inventory state
    setInventory((prev) => prev.filter((item) => item.id !== itemToDelete.id && item.sku !== itemToDelete.sku));

    // Clear recently updated if it matched
    if (recentlyUpdatedSku === itemToDelete.sku) {
      setRecentlyUpdatedSku(null);
    }

    // 2. Record activity log safely
    addActivityLog({
      id: generateActivityId('act-del'),
      activity: `Item Removed: ${itemToDelete.name}`,
      reference: `#SKU-${itemToDelete.sku}`,
      user: user.name,
      time: 'Just now',
      icon: 'delete',
      type: 'removal',
    });
    showToast(`Removed "${itemToDelete.name}" (${itemToDelete.sku}) from inventory`);

    // 3. Sync deletion to backend with eventId
    try {
      await fetch('/api/inventory/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          sku: itemToDelete.sku,
          id: itemToDelete.id,
          device: `${user.name} (Dashboard)`,
        }),
      });
    } catch {}

    // 4. Local cross-tab broadcast & localStorage notification with eventId
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('omnistock_realtime');
        bc.postMessage({
          type: 'item_deleted',
          eventId,
          sku: itemToDelete.sku,
          id: itemToDelete.id,
          itemName: itemToDelete.name,
          timestamp: Date.now(),
        });
        bc.close();
      }
      localStorage.setItem(
        'omnistock_live_deleted',
        JSON.stringify({ eventId, sku: itemToDelete.sku, id: itemToDelete.id, itemName: itemToDelete.name, t: Date.now() })
      );
    } catch {}
  };

  const handleBatchDeleteItems = async (itemsToDelete: InventoryItem[]) => {
    if (!itemsToDelete || itemsToDelete.length === 0) return;

    const eventId = `bdel-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    processedEventIdsRef.current.add(eventId);

    const idsToDelete = new Set(itemsToDelete.map((i) => i.id));
    const skusToDelete = new Set(itemsToDelete.map((i) => i.sku));

    // 1. Remove from local inventory
    setInventory((prev) => prev.filter((item) => !idsToDelete.has(item.id) && !skusToDelete.has(item.sku)));

    // 2. Activity log safely
    addActivityLog({
      id: generateActivityId('act-bdel'),
      activity: `Batch Removal (${itemsToDelete.length} SKUs)`,
      reference: `#DEL-${Math.floor(100 + Math.random() * 900)}`,
      user: user.name,
      time: 'Just now',
      icon: 'delete_sweep',
      type: 'removal',
    });
    showToast(`Successfully removed ${itemsToDelete.length} items from warehouse catalog`);

    // 3. Sync to backend with eventId
    try {
      await fetch('/api/inventory/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          skus: itemsToDelete.map((i) => i.sku),
          ids: itemsToDelete.map((i) => i.id),
          device: `${user.name} (Dashboard Batch)`,
        }),
      });
    } catch {}

    // 4. Broadcast with eventId
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('omnistock_realtime');
        bc.postMessage({
          type: 'items_batch_deleted',
          eventId,
          skus: itemsToDelete.map((i) => i.sku),
          ids: itemsToDelete.map((i) => i.id),
          count: itemsToDelete.length,
          timestamp: Date.now(),
        });
        bc.close();
      }
      localStorage.setItem(
        'omnistock_live_batch_deleted',
        JSON.stringify({ eventId, skus: itemsToDelete.map((i) => i.sku), count: itemsToDelete.length, t: Date.now() })
      );
    } catch {}
  };

  // Reordering Approval & PO Creation Handlers
  const handleApprovePO = (poId: string) => {
    setPurchaseOrders((prev) =>
      prev.map((po) => (po.id === poId ? { ...po, status: 'approved' } : po))
    );
    const approvedPO = purchaseOrders.find((p) => p.id === poId);

    addActivityLog({
      id: generateActivityId('act-po'),
      activity: `Dispatch Scheduled (${approvedPO?.poNumber || 'PO'})`,
      reference: `#${Math.floor(500 + Math.random() * 499)}`,
      user: user.name,
      time: 'Just now',
      icon: 'local_shipping',
      type: 'dispatch',
    });
    showToast(`Purchase Order approved and dispatched to supplier`);
  };

  const handleAddBatchToDraft = (batchId: string) => {
    const batch = batchRecs.find((b) => b.id === batchId);
    if (!batch) return;

    setBatchRecs((prev) =>
      prev.map((b) => (b.id === batchId ? { ...b, addedToDraft: true } : b))
    );

    const newPO: PurchaseOrder = {
      id: `po-${Date.now()}`,
      poNumber: `PO-2024-${Math.floor(900 + Math.random() * 99)}`,
      supplier: 'Consolidated Pantry & Spice Co.',
      itemsSummary: `${batch.name} (${batch.reorderQty} ${batch.unit})`,
      totalValue: batch.reorderQty * 4.5,
      skuCount: 1,
      status: 'pending',
      isAiGenerated: true,
      category: 'Batch Replenishment',
    };
    setPurchaseOrders((prev) => [newPO, ...prev]);
    showToast(`Added ${batch.name} to Draft Orders`);
  };

  const handleCreateCustomPO = () => {
    const newPO: PurchaseOrder = {
      id: `po-${Date.now()}`,
      poNumber: `PO-2024-${Math.floor(700 + Math.random() * 299)}`,
      supplier: 'Artisan Kitchen & Bakery Supplies',
      itemsSummary: 'Custom Restock Order (3 SKUs)',
      totalValue: 3450.0,
      skuCount: 3,
      status: 'pending',
      isAiGenerated: false,
      category: 'Custom Restock',
    };
    setPurchaseOrders((prev) => [newPO, ...prev]);
    showToast(`Created Custom PO: ${newPO.poNumber}`);
  };

  // Alerts Handlers
  const handleMarkAllAlertsRead = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
    showToast('All system alerts marked as read');
  };

  const handleToggleAlertRead = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, read: !a.read } : a))
    );
  };

  const handleDismissAlert = (alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    showToast('Alert dismissed');
  };

  const handleClearReadAlerts = () => {
    setAlerts((prev) => prev.filter((a) => !a.read));
    showToast('Cleared read alerts');
  };

  const handleTriggerSimulatedAlert = () => {
    const timestamp = 'Just now';
    const sampleSimulations: SystemAlert[] = [
      {
        id: `alt-${Date.now()}`,
        title: 'Sensor: Humidity Level Spike',
        description: 'Zone D-04 dry store relative humidity reached 68% (threshold: 55%). Check ventilation unit 2.',
        time: timestamp,
        severity: 'warning',
        icon: 'humidity_percentage',
        read: false,
        actionPrimary: 'Check Ventilation',
        actionSecondary: 'Dismiss',
      },
      {
        id: `alt-${Date.now() + 1}`,
        title: 'Cold Storage #2 Defrost Cycle',
        description: 'Cold storage unit #2 has completed scheduled defrost cycle. Temperature stabilized at 2.4°C.',
        time: timestamp,
        severity: 'success',
        icon: 'thermostat',
        read: false,
        actionPrimary: 'Acknowledge',
      },
      {
        id: `alt-${Date.now() + 2}`,
        title: 'Critical Par Limit: Butter (DY-BTR-500)',
        description: 'Stock dropped below emergency reorder threshold (45 / 150 units). Immediate replenishment suggested.',
        time: timestamp,
        severity: 'critical',
        icon: 'warning',
        read: false,
        actionPrimary: 'Generate PO',
        actionSecondary: 'Acknowledge',
      },
    ];

    const randomAlert = sampleSimulations[Math.floor(Math.random() * sampleSimulations.length)];
    setAlerts((prev) => [randomAlert, ...prev]);

    if (randomAlert.severity === 'critical' || randomAlert.title.includes('Par Limit')) {
      const matchItem = inventory.find((i) => i.sku === 'BT-GF-SLT') || inventory[0];
      if (matchItem) {
        dispatchStockThresholdAlert(
          {
            ...matchItem,
            currentStock: Math.min(matchItem.currentStock, getReorderPoint(matchItem)),
          },
          { force: true }
        );
      }
    }

    showToast(`New alert triggered: ${randomAlert.title}`);
  };

  const handleAlertAction = (alertId: string, actionType: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, read: true } : a)));

    if (actionType === 'Generate PO' || actionType === 'Purchase Order Generated') {
      handleCreateCustomPO();
      setCurrentScreen('reordering');
      setIsAlertsOpen(false);
      showToast('Generated Purchase Order and navigated to Orders');
    } else if (actionType === 'Dispatch Technician' || actionType === 'Check Ventilation') {
      const ticketId = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
      showToast(`Work order #${ticketId} dispatched to Facility Maintenance.`);
    } else if (actionType === 'View Inventory' || actionType === 'Inspect Zone') {
      setCurrentScreen('inventory');
      setIsAlertsOpen(false);
      showToast('Navigated to Inventory Screen');
    } else {
      showToast(`Alert updated: ${actionType}`);
    }
  };

  const unreadAlertsCount = alerts.filter((a) => !a.read).length;

  if (isMobileScannerMode) {
    return (
      <MobileScannerView
        inventory={inventory}
        onBackToApp={() => {
          setIsMobileScannerMode(false);
          setActiveScannerSku(null);
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete('scanner');
            url.searchParams.delete('action');
            url.searchParams.delete('sku');
            url.searchParams.delete('code');
            url.searchParams.delete('barcode');
            url.searchParams.delete('session');
            url.searchParams.delete('sessionId');
            url.searchParams.delete('qty');
            url.searchParams.delete('quantity');
            url.searchParams.delete('mode');
            window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
          } catch {}
        }}
        onItemUpdated={(sku, qty) => {
          handleMobileScanUpdate(sku, qty, 'Mobile Camera Scanner');
        }}
        onProductAdded={(newProd) => {
          handleProductAddedLive(newProd, 'Mobile Camera Scanner');
        }}
        currentLang={language}
        initialSku={activeScannerSku}
        initialAction={activeScannerAction}
        initialSessionId={activeScannerSession}
        initialQty={activeScannerQty}
        initialMode={activeScannerMode}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-200 selection:text-emerald-950">
      {/* GLOBAL TOAST NOTIFICATION */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed top-4 right-4 z-[80] bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-slate-700/60 font-mono text-xs flex items-center gap-2.5 backdrop-blur-xs"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RENDER ACTIVE SCREEN */}
      <AnimatePresence mode="wait" initial={false}>
        {currentScreen === 'signin' ? (
          <motion.div
            key="screen-signin"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="w-full flex-1 flex flex-col"
          >
            <SignInScreen
              onSignIn={handleSignIn}
              accounts={accounts}
              onDeleteAccount={handleRequestDeleteAccount}
              currentLang={language}
              onLanguageChange={setLanguage}
            />
          </motion.div>
        ) : (
          <motion.div
            key="screen-authenticated"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="w-full flex-1 flex flex-col min-h-screen"
          >
            {/* Top Sticky Header */}
            <Header
              currentScreen={currentScreen}
              onNavigate={(screen) => {
                setCurrentScreen(screen);
                try {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                } catch {
                  // Ignore iframe scroll restrictions
                }
              }}
              user={user}
              accounts={accounts}
              unreadAlertsCount={unreadAlertsCount}
              currentLang={language}
              onLanguageChange={setLanguage}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onOpenAlerts={() => setIsAlertsOpen(true)}
              onOpenScanner={(item) => {
                const validItem =
                  item && typeof item === 'object' && 'sku' in item && typeof (item as any).sku === 'string'
                    ? (item as InventoryItem)
                    : null;
                setScannerTargetItem(validItem);
                setIsScannerOpen(true);
              }}
              onOpenMobileScanner={() => setIsMobileScannerMode(true)}
              onOpenAIAssistant={() => setIsAIAssistantOpen(true)}
              onOpenGuide={() => setIsGuideOpen(true)}
              onSignOut={handleSignOut}
              onSwitchAccount={handleSwitchAccount}
              onOpenAccountSwitcher={() => setIsAccountSwitcherOpen(true)}
              onOpenDeleteAccount={() => handleRequestDeleteAccount(user)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              linkedMobileDevice={linkedMobileDevice}
            />

            {/* Main Content Area */}
            <main className="flex-1 pb-20 md:pb-8">
              <AnimatePresence mode="wait" initial={false}>
                {currentScreen === 'dashboard' && (
                  <motion.div
                    key="dashboard"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <DashboardScreen
                      onNavigate={(screen) => {
                        setCurrentScreen(screen);
                        try {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        } catch {
                          // Ignore iframe scroll restrictions
                        }
                      }}
                      inventory={inventory}
                      activities={activities}
                      currentLang={language}
                      onOpenScanner={(item) => {
                        const validItem =
                          item && typeof item === 'object' && 'sku' in item && typeof (item as any).sku === 'string'
                            ? (item as InventoryItem)
                            : null;
                        setScannerTargetItem(validItem);
                        setIsScannerOpen(true);
                      }}
                      onOpenMobileScanner={() => setIsMobileScannerMode(true)}
                      onOpenAlerts={() => setIsAlertsOpen(true)}
                      onQuickReorder={handleQuickReorder}
                      onOpenAddStock={() => setIsAddStockOpen(true)}
                      onOpenGuide={() => setIsGuideOpen(true)}
                      onLoadSampleCatalog={handleLoadSampleCatalog}
                      recentlyUpdatedSku={recentlyUpdatedSku}
                      linkedMobileDevice={linkedMobileDevice}
                    />
                  </motion.div>
                )}

                {currentScreen === 'inventory' && (
                  <motion.div
                    key="inventory"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <InventoryScreen
                      inventory={inventory}
                      searchQuery={searchQuery}
                      onSearchChange={setSearchQuery}
                      currentLang={language}
                      recentlyUpdatedSku={recentlyUpdatedSku}
                      onOpenScanner={(item) => {
                        const validItem =
                          item && typeof item === 'object' && 'sku' in item && typeof (item as any).sku === 'string'
                            ? (item as InventoryItem)
                            : null;
                        setScannerTargetItem(validItem);
                        setIsScannerOpen(true);
                      }}
                      onEditItem={(item) => setEditingItem(item)}
                      onAddToDraft={(item) => handleQuickReorder(item)}
                      onOpenAddStock={() => setIsAddStockOpen(true)}
                      onOpenExport={() => setIsExportOpen(true)}
                      onOpenGuide={() => setIsGuideOpen(true)}
                      onLoadSampleCatalog={handleLoadSampleCatalog}
                      onRefillQuantity={handleRefillQuantity}
                      onBatchAddToDraft={(items) => {
                        items.forEach((item) => handleQuickReorder(item));
                        showToast(`Batch added ${items.length} items to purchase order draft`);
                      }}
                      onDeleteItem={handleDeleteItem}
                      onBatchDelete={handleBatchDeleteItems}
                    />
                  </motion.div>
                )}

                {currentScreen === 'reordering' && (
                  <motion.div
                    key="reordering"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <ReorderingScreen
                      purchaseOrders={purchaseOrders}
                      batchRecs={batchRecs}
                      currentLang={language}
                      onApprovePO={handleApprovePO}
                      onAddBatchToDraft={handleAddBatchToDraft}
                      onCreateCustomPO={handleCreateCustomPO}
                    />
                  </motion.div>
                )}

                {currentScreen === 'analytics' && (
                  <motion.div
                    key="analytics"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <AnalyticsScreen
                      onNavigate={(screen) => {
                        setCurrentScreen(screen);
                        try {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        } catch {
                          // Ignore iframe scroll restrictions
                        }
                      }}
                      onOpenExportModal={() => setIsExportOpen(true)}
                      currentLang={language}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </main>

            {/* FLOATING ACTION DOCK (QR CODE SCANNER + AI COPILOT) */}
            <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-40 flex items-center gap-2.5 sm:gap-3 pointer-events-auto">
              {/* QR Code / Barcode Quick Scanner Floating Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setScannerTargetItem(null);
                  setIsScannerOpen(true);
                }}
                aria-label="Scan QR Code or Barcode"
                title="Open QR Code & Barcode Scanner"
                className="group flex items-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-3 bg-white hover:bg-slate-50 text-slate-900 rounded-full shadow-lg hover:shadow-xl transition-all cursor-pointer border border-slate-300 backdrop-blur-md"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[17px]">
                    qr_code_scanner
                  </span>
                </div>
                <div className="hidden sm:flex flex-col items-start leading-none pr-1">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                    Quick Scanner
                  </span>
                  <span className="text-xs font-bold font-mono text-slate-900">
                    Scan QR
                  </span>
                </div>
              </motion.button>

              {/* AI Copilot Floating Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsAIAssistantOpen(true)}
                aria-label="AI Copilot Assistant"
                title="Open AI Inventory Copilot (Voice & Natural Language)"
                className="group relative flex items-center gap-2.5 px-3.5 py-2.5 sm:px-4 sm:py-3 bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all cursor-pointer border border-emerald-400/40"
              >
                <div className="relative">
                  <span className="material-symbols-outlined text-[20px] sm:text-[22px] group-hover:rotate-12 transition-transform">
                    smart_toy
                  </span>
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-emerald-800 animate-ping"></span>
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-emerald-800"></span>
                </div>
                <div className="flex flex-col items-start leading-none pr-1">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-200 font-semibold">
                    AI Copilot
                  </span>
                  <span className="text-xs font-bold font-sans">
                    Ask or Refill
                  </span>
                </div>
              </motion.button>
            </div>

            {/* Mobile Bottom Navigation */}
            <Navigation
              currentScreen={currentScreen}
              onNavigate={(screen) => {
                setCurrentScreen(screen);
                try {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                } catch {
                  // Ignore iframe scroll restrictions
                }
              }}
              unreadAlertsCount={unreadAlertsCount}
              currentLang={language}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALS & OVERLAYS */}
      <WarehouseGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onOpenAddStock={() => setIsAddStockOpen(true)}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenAIAssistant={() => setIsAIAssistantOpen(true)}
        currentLang={language}
      />

      <AIAssistantModal
        isOpen={isAIAssistantOpen}
        onClose={() => setIsAIAssistantOpen(false)}
        inventory={inventory}
        onRefillQuantity={handleRefillQuantity}
        onBatchRefill={handleBatchRefill}
        onNavigateToItem={(sku) => {
          setCurrentScreen('inventory');
          setSearchQuery(sku);
        }}
        currentLang={language}
      />

      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => {
          setIsScannerOpen(false);
          setScannerTargetItem(null);
        }}
        targetItem={scannerTargetItem}
        onRefillQuantity={(sku, qty) => {
          handleMobileScanUpdate(sku, qty, 'Mobile QR Scanner');
        }}
        onScanReceived={(sku, qty, dev, name, unit, exactStock) => {
          handleMobileScanUpdate(sku, qty, dev, name, unit, exactStock);
        }}
        onProductAdded={(prod, dev) => {
          handleProductAddedLive(prod, dev);
        }}
        inventoryList={inventory}
        currentLang={language}
        onOpenMobileView={() => setIsMobileScannerMode(true)}
        onMobileDeviceLinked={(info) => {
          setLinkedMobileDevice({
            sessionId: info.sessionId,
            device: info.device,
            connectedAt: Date.now(),
          });
        }}
      />

      <AlertsModal
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        alerts={alerts}
        onMarkAllRead={handleMarkAllAlertsRead}
        onToggleRead={handleToggleAlertRead}
        onDismissAlert={handleDismissAlert}
        onClearReadAlerts={handleClearReadAlerts}
        onTriggerTestAlert={handleTriggerSimulatedAlert}
        onAction={handleAlertAction}
        currentLang={language}
      />

      <AddStockModal
        isOpen={isAddStockOpen}
        onClose={() => setIsAddStockOpen(false)}
        onAddItem={handleAddItem}
        currentLang={language}
      />

      <EditStockModal
        item={editingItem}
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        onUpdateItem={handleUpdateItem}
        onDeleteItem={handleDeleteItem}
        currentLang={language}
      />

      <ExportReportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        inventory={inventory}
        currentLang={language}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentLang={language}
        onLanguageChange={(lang) => {
          setLanguage(lang);
          showToast(`Language set to ${lang}`);
        }}
        user={user}
        accounts={accounts}
        onOpenGuide={() => {
          setIsSettingsOpen(false);
          setIsGuideOpen(true);
        }}
        onOpenAccountSwitcher={() => {
          setIsSettingsOpen(false);
          setIsAccountSwitcherOpen(true);
        }}
        onOpenDeleteAccount={() => {
          setIsSettingsOpen(false);
          handleRequestDeleteAccount(user);
        }}
        onSignOut={() => {
          setIsSettingsOpen(false);
          handleSignOut();
        }}
        onShowToast={showToast}
      />

      <AccountSwitcherModal
        isOpen={isAccountSwitcherOpen}
        onClose={() => setIsAccountSwitcherOpen(false)}
        currentUser={user}
        accounts={accounts}
        onSwitchAccount={handleSwitchAccount}
        onAddAccount={handleAddAccount}
        onRequestDeleteAccount={handleRequestDeleteAccount}
        currentLang={language}
      />

      <DeleteAccountModal
        isOpen={!!accountToDelete}
        onClose={() => setAccountToDelete(null)}
        targetUser={accountToDelete}
        onConfirmDelete={handleConfirmDeleteAccount}
        allAccountsCount={accounts.length}
        currentLang={language}
      />

      {/* Automated Desktop Reorder Alert Banner */}
      <DesktopAlertBanner
        onQuickReorder={(sku) => {
          const target = inventory.find((i) => i.sku === sku);
          if (target) {
            handleQuickReorder(target);
          }
        }}
        onInspectItem={(sku) => {
          setCurrentScreen('inventory');
          setSearchQuery(sku);
        }}
        currentLang={language}
      />
    </div>
  );
}
