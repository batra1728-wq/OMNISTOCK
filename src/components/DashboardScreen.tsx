import React, { useState, useEffect } from 'react';
import { InventoryItem, ActivityLog, ScreenId, LanguageCode } from '../types';
import {
  t,
  translateRecordedItem,
  translateRecordedUnit,
  translateRecordedActivity,
} from '../utils/i18n';

interface DashboardScreenProps {
  onNavigate: (screen: ScreenId) => void;
  inventory: InventoryItem[];
  activities: ActivityLog[];
  currentLang?: LanguageCode;
  onOpenScanner: (initialItem?: InventoryItem) => void;
  onOpenMobileScanner?: () => void;
  onOpenAlerts: () => void;
  onQuickReorder: (item: InventoryItem) => void;
  onOpenAddStock: () => void;
  onOpenGuide?: () => void;
  onLoadSampleCatalog?: () => void;
  recentlyUpdatedSku?: string | null;
  linkedMobileDevice?: {
    sessionId: string;
    device: string;
    connectedAt: number;
  } | null;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNavigate,
  inventory,
  activities,
  currentLang = 'en',
  onOpenScanner,
  onOpenMobileScanner,
  onOpenAlerts,
  onQuickReorder,
  onOpenAddStock,
  onOpenGuide,
  onLoadSampleCatalog,
  recentlyUpdatedSku,
  linkedMobileDevice,
}) => {
  const [highlightedRow, setHighlightedRow] = useState<string | null>(null);
  const [activeZone, setActiveZone] = useState<string | null>(null);
  const [showAllActivities, setShowAllActivities] = useState(false);

  // Micro-interaction: When a live update arrives, highlight the most recent activity
  useEffect(() => {
    if (activities.length > 0) {
      setHighlightedRow(activities[0].id);
      const timer = setTimeout(() => setHighlightedRow(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [activities]);

  // Dynamic spotlight cards: prioritize recently updated SKU, then lowest stock items
  const spotlightItems = React.useMemo(() => {
    if (inventory.length === 0) return [];
    const list: InventoryItem[] = [];
    if (recentlyUpdatedSku) {
      const rec = inventory.find((i) => i.sku === recentlyUpdatedSku);
      if (rec) list.push(rec);
    }
    const sorted = [...inventory].sort(
      (a, b) => a.currentStock / (a.maxStock || 1) - b.currentStock / (b.maxStock || 1)
    );
    for (const it of sorted) {
      if (!list.some((existing) => existing.sku === it.sku)) {
        list.push(it);
      }
      if (list.length >= 3) break;
    }
    return list;
  }, [inventory, recentlyUpdatedSku]);

  const totalItemsCount = inventory.reduce((sum, item) => sum + item.currentStock, 0);
  const lowStockCount = inventory.filter((i) => i.status === 'LOW' || i.status === 'REORDER' || i.status === 'CRITICAL').length;
  const outOfStockCount = inventory.filter((i) => i.currentStock === 0).length;
  const totalValue = inventory.reduce((sum, item) => sum + item.currentStock * item.price, 0);

  return (
    <div className="max-w-[1440px] mx-auto p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 animate-in fade-in duration-200">
      {/* Real-Time Live Sync Status Banner */}
      {linkedMobileDevice && (
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 text-white p-4 rounded-2xl border border-emerald-500/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <span className="material-symbols-outlined text-[24px] animate-pulse">smartphone</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wide">
                  Live Camera Feed Active
                </span>
              </div>
              <p className="text-sm font-bold text-white mt-0.5">
                {linkedMobileDevice.device} is connected &amp; streaming real-time scans
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
              Session: {linkedMobileDevice.sessionId}
            </span>
            <button
              onClick={() => onOpenScanner()}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-mono font-bold transition-all cursor-pointer shadow-xs active:scale-95"
            >
              Scanner Info
            </button>
          </div>
        </div>
      )}
      {/* Fresh Workspace Welcome Banner (Displayed if inventory is empty) */}
      {inventory.length === 0 && (
        <div className="bento-card p-6 border-2 border-dashed border-emerald-300 bg-gradient-to-r from-emerald-50/70 via-teal-50/50 to-slate-50 rounded-3xl shadow-xs">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-mono font-bold text-emerald-800 uppercase tracking-wide">
                  Fresh Workspace Initialized
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Welcome to your OmniStock Warehouse Manager
              </h2>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                Your account is ready with zero clutter. You can register custom SKUs, scan existing product barcodes, or consult the interactive user manual.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {onOpenGuide && (
                <button
                  onClick={onOpenGuide}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-mono font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px] text-emerald-700">menu_book</span>
                  <span>User Guide</span>
                </button>
              )}
              <button
                onClick={() => onOpenScanner()}
                className="px-3.5 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-mono font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
                <span>Wireless QR Scanner</span>
              </button>
              <button
                onClick={onOpenAddStock}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-mono font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]">add_box</span>
                <span>Register First SKU</span>
              </button>
            </div>
          </div>

          {onLoadSampleCatalog && (
            <div className="mt-4 pt-3 border-t border-emerald-100/80 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-mono">Need demonstration items for training?</span>
              <button
                onClick={onLoadSampleCatalog}
                className="font-mono font-bold text-emerald-800 hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>Load 15 Pre-configured Culinary SKUs</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* SECTION: Critical Alerts (Bento Layout) */}
      <section aria-labelledby="alerts-title">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-rose-600 fill text-2xl">warning</span>
            <h2 id="alerts-title" className="text-xl md:text-2xl font-bold text-slate-900">
              Critical Alerts &amp; Restock Watch
            </h2>
          </div>

          <div className="flex items-center gap-2.5">
            {onOpenGuide && (
              <button
                onClick={onOpenGuide}
                className="text-xs font-mono font-semibold px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <span className="material-symbols-outlined text-[16px] text-emerald-700">menu_book</span>
                <span>Warehouse Guide</span>
              </button>
            )}

            <button
              onClick={onOpenAlerts}
              className="text-xs font-mono font-bold px-2.5 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl hover:bg-rose-100 transition-colors cursor-pointer"
            >
              {lowStockCount > 0 ? `${lowStockCount} ACTIONS REQUIRED` : 'ALL STOCK OPTIMAL'}
            </button>

            <button
              onClick={() => onOpenScanner()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 text-white rounded-xl font-mono text-xs font-semibold hover:bg-emerald-800 transition-colors cursor-pointer shadow-xs active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
              <span>Wireless QR Scanner</span>
            </button>

            {onOpenMobileScanner && (
              <button
                onClick={() => onOpenMobileScanner()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl font-mono text-xs font-bold transition-colors cursor-pointer shadow-2xs active:scale-95"
                title="Launch Fullscreen Mobile Scanner Mode"
              >
                <span className="material-symbols-outlined text-[18px] text-emerald-700">smartphone</span>
                <span className="hidden sm:inline">Mobile Scanner</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {spotlightItems.length === 0 ? (
            <div className="col-span-3 bento-card p-8 text-center text-slate-400 font-mono text-xs">
              No inventory registered yet. Register an SKU or scan a barcode to see critical stock metrics.
            </div>
          ) : (
            spotlightItems.map((item) => {
              const isLiveHighlight = recentlyUpdatedSku === item.sku;
              const stockRatio = (item.currentStock || 0) / (item.maxStock || 1);
              const isUrgent = stockRatio < 0.4 || item.status === 'CRITICAL' || item.status === 'LOW';

              return (
                <div
                  key={item.sku}
                  className={`bento-card p-5 flex flex-col justify-between gap-3 transition-all duration-500 ${
                    isLiveHighlight
                      ? 'border-2 border-emerald-500 ring-4 ring-emerald-500/20 shadow-lg bg-emerald-50/40'
                      : 'shadow-xs hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                          SKU: {item.sku}
                        </p>
                        {isLiveHighlight && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full animate-bounce">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                            LIVE UPDATED
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-0.5">
                        {translateRecordedItem(item.name, currentLang)}
                      </h3>
                      {item.location && (
                        <p className="text-slate-500 text-xs font-mono mt-0.5 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">location_on</span>
                          {item.location}
                        </p>
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold ${
                        isUrgent
                          ? 'text-rose-700 bg-rose-50 border border-rose-200'
                          : 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                      }`}
                    >
                      {item.status || 'Active'}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-600 font-mono">
                      <span>Stock Level</span>
                      <span className={`font-bold ${isUrgent ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {item.currentStock} / {item.maxStock} {translateRecordedUnit(item.unit || 'units', currentLang)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          isUrgent ? 'bg-rose-500' : 'bg-emerald-600'
                        }`}
                        style={{
                          width: `${Math.min(100, Math.round(stockRatio * 100))}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => onQuickReorder(item)}
                      className="flex-1 py-2 bg-slate-900 text-white rounded-xl font-mono text-xs font-bold hover:bg-slate-800 active:scale-[0.99] transition-all cursor-pointer shadow-xs"
                    >
                      REFILL / REORDER
                    </button>
                    <button
                      onClick={() => onOpenScanner(item)}
                      title="Scan barcode with camera"
                      className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* SECTION: Inventory Overview (Bento Grid 4 Stat Tiles) */}
      <section aria-labelledby="overview-title">
        <h2 id="overview-title" className="text-xl font-bold text-slate-900 mb-4">
          Inventory Overview
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1: Total Items */}
          <div
            onClick={() => onNavigate('inventory')}
            className="bento-card p-5 flex flex-col justify-between h-34 hover:border-slate-400 transition-all cursor-pointer shadow-xs group"
          >
            <div className="flex justify-between items-center">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[18px]">inventory_2</span>
              </div>
              <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                +2.4%
              </span>
            </div>
            <div>
              <p className="text-xs font-mono text-slate-500">Total Items</p>
              <p className="text-2xl lg:text-3xl font-bold text-slate-900 font-mono tracking-tight">
                {totalItemsCount.toLocaleString()}
              </p>
            </div>
          </div>

          {/* 2: Low Stock */}
          <div
            onClick={() => onNavigate('inventory')}
            className="bento-card p-5 flex flex-col justify-between h-34 hover:border-amber-400 transition-all cursor-pointer shadow-xs group"
          >
            <div className="flex justify-between items-center">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[18px] fill">error</span>
              </div>
              <span className="text-[11px] font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                Attention
              </span>
            </div>
            <div>
              <p className="text-xs font-mono text-slate-500">Low Stock</p>
              <p className="text-2xl lg:text-3xl font-bold text-amber-600 font-mono tracking-tight">
                {lowStockCount}
              </p>
            </div>
          </div>

          {/* 3: Out of Stock */}
          <div
            onClick={() => onNavigate('inventory')}
            className="bento-card p-5 flex flex-col justify-between h-34 hover:border-rose-400 transition-all cursor-pointer shadow-xs group"
          >
            <div className="flex justify-between items-center">
              <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[18px] fill">cancel</span>
              </div>
              <span className="text-[11px] font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                Urgent
              </span>
            </div>
            <div>
              <p className="text-xs font-mono text-slate-500">Out of Stock</p>
              <p className="text-2xl lg:text-3xl font-bold text-rose-600 font-mono tracking-tight">
                {outOfStockCount}
              </p>
            </div>
          </div>

          {/* 4: Total Value */}
          <div
            onClick={() => onNavigate('analytics')}
            className="rounded-2xl p-5 flex flex-col justify-between h-34 shadow-sm bg-slate-900 text-white hover:bg-slate-800 transition-all cursor-pointer group border border-slate-800"
          >
            <div className="flex justify-between items-center">
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[18px]">payments</span>
              </div>
              <span className="text-[10px] font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 uppercase">
                INR
              </span>
            </div>
            <div>
              <p className="text-xs font-mono text-slate-400">Total Value</p>
              <p className="text-2xl lg:text-3xl font-bold text-white font-mono tracking-tight">
                {totalValue >= 100000
                  ? `₹${(totalValue / 100000).toFixed(2)}L`
                  : `₹${(totalValue / 1000).toFixed(1)}k`}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: Recent Activity & Warehouse Hotspots (Bento Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed (2 Cols Bento Tile) */}
        <section className="lg:col-span-2 bento-card overflow-hidden shadow-xs flex flex-col min-h-[380px]">
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <h3 className="font-bold text-slate-900 text-sm">Recent Activity</h3>
            </div>
            <button
              onClick={() => setShowAllActivities(!showAllActivities)}
              className="text-slate-700 font-mono text-xs font-semibold hover:text-slate-900 hover:underline cursor-pointer"
            >
              {showAllActivities ? 'Show Recent' : 'View All'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {activities.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-mono text-xs">
                No recent activity logged yet. Register an SKU or restock items to begin audit trail.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-100 text-slate-700 z-10">
                  <tr className="border-b border-slate-200">
                    <th className="px-5 py-2.5 font-mono text-xs font-semibold text-slate-600">Activity</th>
                    <th className="px-5 py-2.5 font-mono text-xs font-semibold text-slate-600">ID / Reference</th>
                    <th className="px-5 py-2.5 font-mono text-xs font-semibold text-slate-600">User</th>
                    <th className="px-5 py-2.5 font-mono text-xs font-semibold text-slate-600 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activities.map((act, index) => {
                    const isHighlighted =
                      highlightedRow === act.id ||
                      (recentlyUpdatedSku && act.reference.includes(recentlyUpdatedSku));
                    return (
                      <tr
                        key={`${act.id || 'act'}-${index}`}
                        className={`transition-all duration-500 ${
                          isHighlighted
                            ? 'bg-emerald-100/90 font-semibold'
                            : 'zebra-stripe hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`material-symbols-outlined text-[18px] ${
                                isHighlighted
                                  ? 'text-emerald-700 animate-pulse'
                                  : act.type === 'shipment'
                                  ? 'text-emerald-600'
                                  : act.type === 'picklist'
                                  ? 'text-slate-700'
                                  : act.type === 'correction'
                                  ? 'text-rose-600'
                                  : 'text-amber-600'
                              }`}
                            >
                              {act.icon}
                            </span>
                            <span className="text-sm font-medium text-slate-900 flex items-center gap-1.5">
                              {translateRecordedActivity(act.activity, currentLang)}
                              {isHighlighted && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold bg-emerald-600 text-white px-1.5 py-0.2 rounded-full animate-bounce">
                                  LIVE
                                </span>
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs font-semibold text-slate-500">
                          {act.reference}
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-700">{act.user}</td>
                        <td className="px-5 py-3 text-xs font-mono text-slate-400 text-right">
                          {act.time}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Warehouse Hotspots & Utilization (1 Col Bento Tile) */}
        <section className="bento-card p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-slate-900 text-sm">Warehouse Hotspots</h3>
              <span className="text-[11px] font-mono text-emerald-700 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Active Grid
              </span>
            </div>

            {/* Warehouse Map Grid Visualizer */}
            <div className="relative rounded-xl overflow-hidden bg-slate-50 border border-slate-200 p-3 min-h-[220px]">
              {/* Radial Dot Pattern */}
              <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(circle, #0f172a 1.5px, transparent 1.5px)',
                  backgroundSize: '16px 16px',
                }}
              ></div>

              <div className="relative h-full w-full flex flex-col justify-between gap-2.5 z-10">
                {/* Simulated Shelving Units */}
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => setActiveZone('SEC-A: Dry Goods (Optimal)')}
                    className="p-2 bg-emerald-50 rounded-lg border border-emerald-200 flex flex-col items-center justify-center font-mono text-[11px] font-bold text-emerald-800 hover:scale-105 transition-transform cursor-pointer shadow-2xs"
                  >
                    SEC-A
                    <span className="text-[9px] font-normal opacity-80">92%</span>
                  </button>

                  <button
                    onClick={() => setActiveZone('SEC-B: Pantry Spices (Optimal)')}
                    className="p-2 bg-emerald-50 rounded-lg border border-emerald-200 flex flex-col items-center justify-center font-mono text-[11px] font-bold text-emerald-800 hover:scale-105 transition-transform cursor-pointer shadow-2xs"
                  >
                    SEC-B
                    <span className="text-[9px] font-normal opacity-80">88%</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveZone('ALRT: Cold Storage Unit #4 (Monitored)');
                      onOpenAlerts();
                    }}
                    className="p-2 bg-amber-50 rounded-lg border border-amber-200 flex flex-col items-center justify-center font-mono text-[11px] font-bold text-amber-800 hover:scale-105 transition-transform cursor-pointer shadow-2xs"
                  >
                    ALRT
                    <span className="text-[9px] font-normal">COLD</span>
                  </button>

                  <button
                    onClick={() => setActiveZone('SEC-D: Packaging Bay (Optimal)')}
                    className="p-2 bg-emerald-50 rounded-lg border border-emerald-200 flex flex-col items-center justify-center font-mono text-[11px] font-bold text-emerald-800 hover:scale-105 transition-transform cursor-pointer shadow-2xs"
                  >
                    SEC-D
                    <span className="text-[9px] font-normal opacity-80">78%</span>
                  </button>
                </div>

                {/* Additional simulated racks */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="h-8 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center text-[10px] font-mono text-slate-600">
                    R-01
                  </div>
                  <div className="h-8 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center text-[10px] font-mono text-slate-600">
                    R-02
                  </div>
                  <div className="h-8 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center text-[10px] font-mono text-slate-600">
                    R-03
                  </div>
                  <div className="h-8 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center text-[10px] font-mono text-slate-600">
                    R-04
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div className="h-8 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-center text-[10px] font-mono text-emerald-700 font-medium">
                    R-05
                  </div>
                  <div className="h-8 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center text-[10px] font-mono text-slate-600">
                    R-06
                  </div>
                  <div className="h-8 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center text-[10px] font-mono text-slate-600">
                    R-07
                  </div>
                  <div className="h-8 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center text-[10px] font-mono text-slate-600">
                    R-08
                  </div>
                </div>

                {activeZone && (
                  <div className="p-2 bg-white border border-slate-200 rounded-lg text-[11px] font-mono text-emerald-800 font-semibold text-center animate-in fade-in duration-150 shadow-2xs">
                    {activeZone}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 font-mono">Storage Utilization</span>
              <span className="font-bold font-mono text-slate-900">
                {inventory.length > 0 ? '84%' : '0% (Ready)'}
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-slate-900 h-full rounded-full"
                style={{ width: inventory.length > 0 ? '84%' : '0%' }}
              ></div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
