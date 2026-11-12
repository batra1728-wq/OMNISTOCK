import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { InventoryItem, LanguageCode } from '../types';
import {
  t,
  translateRecordedItem,
  translateRecordedLocation,
  translateRecordedUnit,
} from '../utils/i18n';

interface ItemDetailDrawerProps {
  item: InventoryItem | null;
  isOpen: boolean;
  currentLang?: LanguageCode;
  onClose: () => void;
  onEditItem: (item: InventoryItem) => void;
  onOpenScanner: (item: InventoryItem) => void;
  onAddToDraft: (item: InventoryItem) => void;
  onRefillQuantity?: (sku: string, addedQty: number) => void;
  onDeleteItem?: (item: InventoryItem) => void;
}

export const ItemDetailDrawer: React.FC<ItemDetailDrawerProps> = ({
  item,
  isOpen,
  currentLang = 'en',
  onClose,
  onEditItem,
  onOpenScanner,
  onAddToDraft,
  onRefillQuantity,
  onDeleteItem,
}) => {
  const [customQty, setCustomQty] = useState<number>(10);
  const [copiedSku, setCopiedSku] = useState<boolean>(false);
  const [restockSuccess, setRestockSuccess] = useState<string | null>(null);

  if (!item) return null;

  const stockPercentage = Math.min(100, Math.round((item.currentStock / item.maxStock) * 100));
  const totalValuation = item.currentStock * item.price;
  const restockCost = Math.max(0, item.maxStock - item.currentStock) * item.price;
  const stockNeeded = Math.max(0, item.maxStock - item.currentStock);

  const handleCopySku = () => {
    navigator.clipboard?.writeText(item.sku);
    setCopiedSku(true);
    setTimeout(() => setCopiedSku(false), 2000);
  };

  const handleQuickRestock = (qty: number) => {
    if (onRefillQuantity) {
      onRefillQuantity(item.sku, qty);
      setRestockSuccess(`Added +${qty} ${item.unit}`);
      setTimeout(() => setRestockSuccess(null), 2500);
    }
  };

  const getStatusBadge = () => {
    switch (item.status) {
      case 'CRITICAL':
      case 'LOW':
        return {
          label: 'CRITICAL / LOW STOCK',
          icon: 'warning',
          pillClass: 'bg-rose-50 text-rose-700 border-rose-200',
          barClass: 'bg-rose-500',
        };
      case 'REORDER':
        return {
          label: 'REORDER RECOMMENDED',
          icon: 'reorder',
          pillClass: 'bg-amber-50 text-amber-700 border-amber-200',
          barClass: 'bg-amber-500',
        };
      case 'FULL':
        return {
          label: 'FULL CAPACITY',
          icon: 'check_circle',
          pillClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          barClass: 'bg-emerald-600',
        };
      case 'OPTIMAL':
      default:
        return {
          label: 'OPTIMAL LEVEL',
          icon: 'check_circle',
          pillClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          barClass: 'bg-emerald-600',
        };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs cursor-pointer"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="w-screen max-w-xl bg-slate-50 border-l border-slate-200 shadow-2xl flex flex-col justify-between overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">
                    SKU Inspector
                  </span>
                  <button
                    onClick={handleCopySku}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer border border-slate-200"
                    title="Click to copy SKU"
                  >
                    <span>{item.sku}</span>
                    <span className="material-symbols-outlined text-[14px]">
                      {copiedSku ? 'check' : 'content_copy'}
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onClose();
                      onEditItem(item);
                    }}
                    className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200"
                    title="Edit Item Details"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  {onDeleteItem && (
                    <button
                      onClick={() => {
                        onClose();
                        onDeleteItem(item);
                      }}
                      className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-rose-200"
                      title="Remove Food Item from Inventory"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>
              </div>

              {/* Restock Notification Banner */}
              <AnimatePresence>
                {restockSuccess && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-emerald-600 text-white px-6 py-2 text-xs font-mono font-bold flex items-center gap-2 overflow-hidden"
                  >
                    <span className="material-symbols-outlined text-base">check_circle</span>
                    <span>{restockSuccess}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Main Content Body */}
              <div className="p-6 space-y-6 flex-1">
                {/* Product Hero Card */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 shadow-2xs">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-xs text-white p-1 rounded-lg">
                      <span className="material-symbols-outlined text-[14px]">inventory_2</span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {t(item.category.toLowerCase(), currentLang) || item.category}
                      </span>
                      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-mono text-emerald-800 bg-emerald-50 border border-emerald-200">
                        <span className="material-symbols-outlined text-[14px]">location_on</span>
                        <span>{translateRecordedLocation(item.location || 'Zone A-01', currentLang)}</span>
                      </span>
                    </div>

                    <h2 className="text-xl font-bold text-slate-900 leading-tight">
                      {translateRecordedItem(item.name, currentLang)}
                    </h2>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-mono font-bold border ${statusBadge.pillClass}`}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {statusBadge.icon}
                        </span>
                        <span>{t(statusBadge.label.toLowerCase(), currentLang) || statusBadge.label}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stock Level & Capacity Meter */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                        Inventory on Hand
                      </span>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-3xl font-bold font-mono text-slate-900">
                          {item.currentStock.toLocaleString()}
                        </span>
                        <span className="text-sm font-mono text-slate-500">
                          / {item.maxStock.toLocaleString()} {translateRecordedUnit(item.unit, currentLang)}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 border border-slate-200">
                        {stockPercentage}% Capacity
                      </span>
                      <p className="text-[11px] font-mono text-slate-500 mt-1">
                        {stockNeeded > 0 ? `${stockNeeded} needed for 100%` : 'At maximum capacity'}
                      </p>
                    </div>
                  </div>

                  {/* Multi-tier Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${statusBadge.barClass}`}
                        style={{ width: `${stockPercentage}%` }}
                      />
                    </div>
                    {(() => {
                      const reorderThreshold = item.reorderPoint !== undefined && !isNaN(item.reorderPoint)
                        ? item.reorderPoint
                        : Math.max(1, Math.round(item.maxStock * 0.25));
                      const isUnder = item.currentStock <= reorderThreshold;
                      return (
                        <div className="flex justify-between text-[10px] font-mono px-1">
                          <span className="text-slate-500">0 (Empty)</span>
                          <span className={isUnder ? 'text-rose-700 font-bold flex items-center gap-0.5' : 'text-slate-600'}>
                            {isUnder && <span className="material-symbols-outlined text-[12px]">notification_important</span>}
                            Reorder Pt ({reorderThreshold} {item.unit.split(' ')[0]})
                          </span>
                          <span className="text-slate-500">Target ({Math.round(item.maxStock * 0.8)})</span>
                          <span className="text-slate-500">Max ({item.maxStock})</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Financial & Valuation Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs font-mono mb-1">
                      <span className="material-symbols-outlined text-[16px] text-slate-400">
                        payments
                      </span>
                      <span>UNIT PRICE</span>
                    </div>
                    <p className="text-xl font-bold font-mono text-slate-900">
                      ₹{item.price.toFixed(2)}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500 mt-1">
                      Per {item.unit.split(' ')[0]}
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs font-mono mb-1">
                      <span className="material-symbols-outlined text-[16px] text-emerald-600">
                        account_balance_wallet
                      </span>
                      <span>HOLDING VALUATION</span>
                    </div>
                    <p className="text-xl font-bold font-mono text-emerald-800">
                      ₹{totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500 mt-1">
                      Restock cost: ₹{restockCost.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Expiry & Operational Velocity */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-xs font-mono font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-emerald-700">
                      analytics
                    </span>
                    <span>Shelf-Life & Velocity Metrics</span>
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-mono text-slate-500 uppercase">
                        Expiry Date
                      </span>
                      <p className="text-sm font-bold font-mono text-slate-900 mt-0.5">
                        {item.expiryDate}
                      </p>
                      {item.daysToExpiry !== undefined ? (
                        <span
                          className={`inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 rounded mt-1 ${
                            item.daysToExpiry < 15
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {item.daysToExpiry}d left
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-400 mt-1 block">
                          Non-perishable
                        </span>
                      )}
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-mono text-slate-500 uppercase">
                        Consumption Trend
                      </span>
                      <p className="text-sm font-bold font-mono text-emerald-700 mt-0.5">
                        {item.consumptionVelocity || '+8.4% WoW'}
                      </p>
                      <span className="text-[10px] font-mono text-slate-400 mt-1 block">
                        Weekly burn rate
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 col-span-2 sm:col-span-1">
                      <span className="text-[10px] font-mono text-slate-500 uppercase">
                        Lead Time
                      </span>
                      <p className="text-sm font-bold font-mono text-slate-900 mt-0.5">
                        {item.leadTimeDays || 5} Days
                      </p>
                      <span className="text-[10px] font-mono text-slate-400 mt-1 block">
                        Turnover: {item.turnoverRate || '4.2x'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Instant Quick Restock Toolbar */}
                {onRefillQuantity && (
                  <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-mono font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-slate-700">
                          add_circle
                        </span>
                        <span>Quick Inventory Adjustment</span>
                      </h3>
                      <span className="text-[11px] font-mono text-slate-500">Instant Update</span>
                    </div>

                    {/* Pre-set Quick Steppers */}
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        onClick={() => handleQuickRestock(5)}
                        className="py-2 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 transition-colors cursor-pointer active:scale-95 text-center"
                      >
                        +5 {item.unit.split(' ')[0]}
                      </button>
                      <button
                        onClick={() => handleQuickRestock(10)}
                        className="py-2 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 transition-colors cursor-pointer active:scale-95 text-center"
                      >
                        +10
                      </button>
                      <button
                        onClick={() => handleQuickRestock(50)}
                        className="py-2 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 transition-colors cursor-pointer active:scale-95 text-center"
                      >
                        +50
                      </button>
                      <button
                        onClick={() => handleQuickRestock(stockNeeded)}
                        disabled={stockNeeded <= 0}
                        className="py-2 px-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-40 rounded-xl text-xs font-mono font-bold text-emerald-800 transition-colors cursor-pointer active:scale-95 text-center"
                        title="Fill stock to maximum capacity"
                      >
                        Fill Max
                      </button>
                    </div>

                    {/* Custom Input */}
                    <div className="flex gap-2 pt-1">
                      <input
                        type="number"
                        min="1"
                        value={customQty}
                        onChange={(e) => setCustomQty(Math.max(1, Number(e.target.value)))}
                        className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        onClick={() => handleQuickRestock(customQty)}
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-mono font-bold py-2 px-4 transition-colors cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <span className="material-symbols-outlined text-base">add</span>
                        <span>Add Custom Units</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Action Drawer Bar */}
              <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 px-6 flex flex-col sm:flex-row gap-2.5">
                {onDeleteItem && (
                  <button
                    onClick={() => {
                      onClose();
                      onDeleteItem(item);
                    }}
                    className="py-3 px-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-2xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
                    title="Remove item from inventory"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                    <span>Delete Item</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    onClose();
                    onOpenScanner(item);
                  }}
                  className="flex-1 py-3 px-3 bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200 rounded-2xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <span className="material-symbols-outlined text-lg">barcode_scanner</span>
                  <span>Scan</span>
                </button>

                <button
                  onClick={() => {
                    onAddToDraft(item);
                    onClose();
                  }}
                  className="flex-1 py-3 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
                >
                  <span className="material-symbols-outlined text-lg">
                    shopping_cart_checkout
                  </span>
                  <span>Add to Reorder Draft</span>
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
