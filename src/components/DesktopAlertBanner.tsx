import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  DesktopAlertPayload,
  subscribeToReorderAlerts,
  getDesktopNotificationPermission,
  requestDesktopNotificationPermission,
} from '../utils/desktopNotification';
import { LanguageCode } from '../types';
import { t } from '../utils/i18n';

interface DesktopAlertBannerProps {
  onQuickReorder: (sku: string) => void;
  onInspectItem: (sku: string) => void;
  currentLang?: LanguageCode;
}

export const DesktopAlertBanner: React.FC<DesktopAlertBannerProps> = ({
  onQuickReorder,
  onInspectItem,
  currentLang = 'en',
}) => {
  const [activeAlert, setActiveAlert] = useState<DesktopAlertPayload | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported'>(() =>
    getDesktopNotificationPermission()
  );
  const [isDismissedPermanently, setIsDismissedPermanently] = useState(false);

  useEffect(() => {
    // Listen for automated reorder threshold breaches
    const unsubscribe = subscribeToReorderAlerts((payload) => {
      setActiveAlert(payload);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Auto-dismiss after 10 seconds if not hovered
  useEffect(() => {
    if (!activeAlert) return;
    const timer = setTimeout(() => {
      setActiveAlert(null);
    }, 10000);
    return () => clearTimeout(timer);
  }, [activeAlert]);

  const handleEnableDesktopAlerts = async () => {
    const res = await requestDesktopNotificationPermission();
    setPermissionStatus(res);
  };

  if (!activeAlert || isDismissedPermanently) return null;

  const isCritical = activeAlert.severity === 'critical' || activeAlert.currentStock === 0;

  return (
    <div className="fixed top-16 md:top-20 right-4 sm:right-6 z-50 max-w-md w-[calc(100vw-2rem)] sm:w-auto pointer-events-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeAlert.id}
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -15, scale: 0.95 }}
          transition={{ type: 'spring', damping: 24, stiffness: 300 }}
          className="pointer-events-auto bg-white rounded-3xl border border-slate-200/90 shadow-2xl p-4 sm:p-4.5 overflow-hidden ring-1 ring-slate-900/5 backdrop-blur-md"
        >
          {/* Top Banner Header with Status Chip */}
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold tracking-wide uppercase ${
                  isCritical
                    ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">
                  {isCritical ? 'report' : 'notification_important'}
                </span>
                <span>{isCritical ? 'Critical Stock Out' : 'Below Reorder Point'}</span>
              </span>

              <span className="text-[10px] font-mono text-slate-500 font-semibold">Automated Alert</span>
            </div>

            <button
              onClick={() => setActiveAlert(null)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Dismiss Alert"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>

          {/* Product Info & Stock Metric */}
          <div className="flex items-start gap-3">
            {activeAlert.imageUrl && (
              <div className="w-13 h-13 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 shadow-2xs">
                <img
                  src={activeAlert.imageUrl}
                  alt={activeAlert.itemName}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <h4 className="text-sm font-bold text-slate-900 truncate">{activeAlert.itemName}</h4>
                <span className="text-[11px] font-mono font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                  {activeAlert.sku}
                </span>
              </div>

              {/* Threshold comparison */}
              <div className="mt-1.5 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-700">
                  Current Stock:{' '}
                  <strong className={isCritical ? 'text-rose-700 font-extrabold' : 'text-amber-800 font-bold'}>
                    {activeAlert.currentStock} {activeAlert.unit}
                  </strong>
                </span>
                <span className="text-slate-500 font-medium">
                  Reorder Threshold: <strong>{activeAlert.reorderPoint}</strong>
                </span>
              </div>

              {/* Deficit Bar indicator */}
              <div className="mt-1.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div
                  className={`h-full rounded-full ${isCritical ? 'bg-rose-500' : 'bg-amber-500'}`}
                  style={{
                    width: `${Math.max(
                      6,
                      Math.min(100, (activeAlert.currentStock / Math.max(1, activeAlert.reorderPoint)) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              {permissionStatus === 'default' && (
                <button
                  onClick={handleEnableDesktopAlerts}
                  className="px-2.5 py-1 text-[11px] font-mono text-emerald-800 hover:bg-emerald-50 rounded-lg border border-emerald-200 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Enable native OS desktop banner notifications"
                >
                  <span className="material-symbols-outlined text-[13px]">desktop_windows</span>
                  <span>Enable Desktop OS Alerts</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => {
                  onInspectItem(activeAlert.sku);
                  setActiveAlert(null);
                }}
                className="px-3 py-1.5 text-xs font-mono font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer active:scale-95"
              >
                Inspect
              </button>

              <button
                onClick={() => {
                  onQuickReorder(activeAlert.sku);
                  setActiveAlert(null);
                }}
                className="px-3.5 py-1.5 text-xs font-mono font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-95 flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[15px]">shopping_cart</span>
                <span>Reorder Now</span>
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
