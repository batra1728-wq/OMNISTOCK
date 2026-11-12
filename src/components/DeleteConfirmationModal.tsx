import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { InventoryItem, LanguageCode } from '../types';
import { translateRecordedItem, translateRecordedLocation, translateRecordedUnit, t } from '../utils/i18n';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  item?: InventoryItem | null;
  batchItems?: InventoryItem[];
  currentLang?: LanguageCode;
  isDeleting?: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  item,
  batchItems = [],
  currentLang = 'en',
  isDeleting = false,
}) => {
  if (!isOpen) return null;

  const isBatch = !item && batchItems.length > 0;
  const itemCount = isBatch ? batchItems.length : item ? 1 : 0;
  if (itemCount === 0) return null;

  const totalStock = isBatch
    ? batchItems.reduce((acc, i) => acc + i.currentStock, 0)
    : item?.currentStock || 0;

  const totalValuation = isBatch
    ? batchItems.reduce((acc, i) => acc + i.currentStock * i.price, 0)
    : (item?.currentStock || 0) * (item?.price || 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => !isDeleting && onClose()}
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 14 }}
          transition={{ type: 'spring', damping: 26, stiffness: 340 }}
          className="relative bg-white text-slate-900 w-full max-w-lg rounded-3xl border border-rose-100 shadow-2xl overflow-hidden z-10 flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-rose-50/80 border-b border-rose-100 p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center border border-rose-200 shrink-0">
                <span className="material-symbols-outlined text-2xl">delete_forever</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {isBatch ? `Remove ${itemCount} Food Items?` : `Remove Food Item?`}
                </h2>
                <p className="text-xs font-mono text-rose-700 font-semibold">
                  {isBatch ? 'Batch Inventory Deletion' : `SKU: ${item?.sku}`}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={isDeleting}
              aria-label="Close dialog"
              className="p-1.5 text-slate-400 hover:text-slate-800 rounded-full hover:bg-white/80 cursor-pointer transition-colors disabled:opacity-40"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-4">
            {/* Warning advisory */}
            <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
              <span className="material-symbols-outlined text-amber-600 text-lg shrink-0 mt-0.5">warning</span>
              <div>
                <p className="font-bold">This action will remove the item from active warehouse inventory.</p>
                <p className="text-[11px] text-amber-800/90 mt-0.5">
                  Stock levels, location assignments, and automatic reorder thresholds for this SKU will be permanently cleared.
                </p>
              </div>
            </div>

            {/* Single Item Details Card */}
            {item && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0 shadow-2xs">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wide">
                      {t(item.category.toLowerCase(), currentLang) || item.category}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {item.sku}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm truncate">
                    {translateRecordedItem(item.name, currentLang)}
                  </h3>
                  <div className="flex items-center gap-3 text-xs font-mono text-slate-600">
                    <span>
                      Current Stock: <strong className="text-slate-900">{item.currentStock}</strong> {translateRecordedUnit(item.unit.split(' ')[0], currentLang)}
                    </span>
                    <span>•</span>
                    <span>₹{item.price.toFixed(2)}/unit</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px] text-slate-400">location_on</span>
                    <span>{translateRecordedLocation(item.location || 'Zone A-01', currentLang)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Batch Items List */}
            {isBatch && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-mono text-slate-600 px-1">
                  <span>Selected SKUs ({batchItems.length})</span>
                  <span>Total Stock: <strong className="text-slate-900">{totalStock.toLocaleString()}</strong> units</span>
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 bg-slate-50 border border-slate-200 rounded-2xl p-1">
                  {batchItems.map((bItem) => (
                    <div key={bItem.id} className="p-2.5 flex items-center justify-between gap-3 text-xs font-mono">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-bold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[11px] shrink-0">
                          {bItem.sku}
                        </span>
                        <span className="font-medium text-slate-900 truncate">
                          {translateRecordedItem(bItem.name, currentLang)}
                        </span>
                      </div>
                      <div className="text-right shrink-0 text-slate-600">
                        <span className="font-bold text-slate-800">{bItem.currentStock}</span> {bItem.unit.split(' ')[0]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary Metrics */}
            <div className="pt-1 flex items-center justify-between text-xs font-mono text-slate-500 border-t border-slate-100">
              <span>Inventory Impact:</span>
              <span className="font-bold text-rose-700">
                -{totalStock.toLocaleString()} units (₹{totalValuation.toFixed(2)} value)
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-mono text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-mono text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                  <span>Removing...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">delete</span>
                  <span>{isBatch ? `Delete ${itemCount} Items` : 'Delete Item'}</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
