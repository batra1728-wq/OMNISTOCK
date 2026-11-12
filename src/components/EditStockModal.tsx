import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { InventoryItem, StockStatus, LanguageCode } from '../types';
import { t } from '../utils/i18n';
import { COMMON_QUANTITY_UNITS, getUnitIcon } from '../utils/units';

interface EditStockModalProps {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateItem: (updated: InventoryItem) => void;
  onDeleteItem?: (item: InventoryItem) => void;
  currentLang?: LanguageCode;
}

export const EditStockModal: React.FC<EditStockModalProps> = ({
  item,
  isOpen,
  onClose,
  onUpdateItem,
  onDeleteItem,
  currentLang = 'en',
}) => {
  if (!isOpen || !item) return null;

  const [stock, setStock] = useState<number>(item.currentStock);
  const [maxStock, setMaxStock] = useState<number>(item.maxStock);
  const defaultReorderPoint = item.reorderPoint !== undefined && !isNaN(item.reorderPoint)
    ? item.reorderPoint
    : Math.max(1, Math.round(item.maxStock * 0.25));
  const [reorderPoint, setReorderPoint] = useState<number>(defaultReorderPoint);
  const [unit, setUnit] = useState<string>(item.unit || 'units');
  const [price, setPrice] = useState<number>(item.price);
  const [location, setLocation] = useState<string>(item.location || 'Zone A-01');
  const [expiry, setExpiry] = useState<string>(item.expiryDate);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    let calculatedStatus: StockStatus = 'OPTIMAL';
    if (stock === 0) calculatedStatus = 'CRITICAL';
    else if (stock <= maxStock * 0.2) calculatedStatus = 'LOW';
    else if (stock <= maxStock * 0.4) calculatedStatus = 'REORDER';
    else if (stock >= maxStock) calculatedStatus = 'FULL';

    onUpdateItem({
      ...item,
      currentStock: Number(stock),
      maxStock: Number(maxStock),
      reorderPoint: Number(reorderPoint),
      unit: unit.trim() || item.unit || 'units',
      price: Number(price),
      location,
      expiryDate: expiry,
      status: calculatedStatus,
    });

    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ type: 'spring', damping: 26, stiffness: 340 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white text-slate-900 w-full max-w-md rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-slate-50 border-b border-slate-200 p-5 flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                <span className="material-symbols-outlined text-lg">edit_note</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">{item.name}</h2>
                <p className="text-xs font-mono text-emerald-700 font-semibold">{item.sku}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-900 rounded-full hover:bg-slate-100 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono font-medium text-slate-600 mb-1">
                  Current Stock ({unit})
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={stock}
                  onChange={(e) => setStock(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-base font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-slate-600 mb-1">
                  Max Stock ({unit})
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={maxStock}
                  onChange={(e) => setMaxStock(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-base font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 outline-none shadow-2xs"
                />
              </div>
            </div>

            {/* Reorder Point Threshold Alert Setting */}
            <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200/90 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-950">
                  <span className="material-symbols-outlined text-[16px] text-amber-700">notification_important</span>
                  <span>Reorder Point Alert Threshold ({unit})</span>
                </label>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                    stock <= reorderPoint
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}
                >
                  {stock <= reorderPoint ? '⚠️ Triggers Alert' : '✅ Stock Safe'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max={maxStock}
                  required
                  value={reorderPoint}
                  onChange={(e) => setReorderPoint(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-600 outline-none shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setReorderPoint(Math.max(1, Math.round(maxStock * 0.25)))}
                  className="shrink-0 px-2.5 py-2 text-xs font-mono font-bold bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl transition-colors cursor-pointer"
                  title="Reset to 25% Par Level"
                >
                  25% Par
                </button>
              </div>
              <p className="text-[11px] text-amber-900/80 leading-tight">
                An automated desktop alert and chime sounds when stock drops to or below this level.
              </p>
            </div>

            {/* Packaging & Quantity Unit Selector */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-mono font-semibold text-slate-700">
                  Packaging &amp; Quantity Unit
                </label>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">{getUnitIcon(unit)}</span>
                  {unit}
                </span>
              </div>

              <select
                value={COMMON_QUANTITY_UNITS.some((u) => u.id === unit || u.shortLabel === unit) ? unit : 'custom'}
                onChange={(e) => {
                  if (e.target.value !== 'custom') {
                    setUnit(e.target.value);
                  } else {
                    setUnit('');
                  }
                }}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 outline-none shadow-2xs"
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
                <optgroup label="Containers & Retail">
                  <option value="bags">🛍️ Bags (bag)</option>
                  <option value="tins">🥫 Tins / Cans (tin)</option>
                  <option value="packs">📦 Packs (pck)</option>
                  <option value="bottles">🍾 Bottles (btl)</option>
                  <option value="jars">🫙 Jars (jar)</option>
                </optgroup>
                <optgroup label="Weight & Volume">
                  <option value="kg">⚖️ Kilograms (kg)</option>
                  <option value="g">⚖️ Grams (g)</option>
                  <option value="liters">💧 Liters (L)</option>
                  <option value="ml">💧 Milliliters (ml)</option>
                </optgroup>
                <optgroup label="Discrete & Other">
                  <option value="units">🏷️ Units / Pieces (pcs)</option>
                  <option value="custom">✏️ Custom Unit...</option>
                </optgroup>
              </select>

              {/* Quick Preset Unit Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { id: 'boxes', label: 'Boxes', icon: 'inventory_2' },
                  { id: 'barrels', label: 'Barrels', icon: 'oil_barrel' },
                  { id: 'crates', label: 'Crates', icon: 'grid_view' },
                  { id: 'cartons', label: 'Cartons', icon: 'all_inbox' },
                  { id: 'drums', label: 'Drums', icon: 'propane_tank' },
                  { id: 'sacks', label: 'Sacks', icon: 'shopping_bag' },
                  { id: 'bags', label: 'Bags', icon: 'shopping_bag' },
                  { id: 'tins', label: 'Tins', icon: 'takeout_dining' },
                  { id: 'bottles', label: 'Bottles', icon: 'water_bottle' },
                  { id: 'kg', label: 'kg', icon: 'scale' },
                  { id: 'liters', label: 'Liters', icon: 'opacity' },
                  { id: 'units', label: 'Units', icon: 'filter_frames' },
                ].map((opt) => (
                  <button
                    type="button"
                    key={opt.id}
                    onClick={() => setUnit(opt.id)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-medium flex items-center gap-1 transition-all cursor-pointer ${
                      unit.toLowerCase().includes(opt.id)
                        ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[13px]">{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>

              {(!COMMON_QUANTITY_UNITS.some((u) => u.id === unit || u.shortLabel === unit) || unit === '') && (
                <div className="pt-1">
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="Enter custom packaging unit (e.g. 50L Drum, Wooden Crate)..."
                    className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    autoFocus
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono font-medium text-slate-600 mb-1">
                  Unit Price (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-slate-600 mb-1">
                  Storage Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 outline-none shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-slate-600 mb-1">
                Expiry Date
              </label>
              <input
                type="text"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 outline-none shadow-2xs"
              />
            </div>

            {/* Quick Increment Buttons */}
            <div className="pt-1">
              <span className="block text-[11px] font-mono text-slate-500 mb-1.5 uppercase">
                Quick Restock Adjustments:
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStock((s) => s + 10)}
                  className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-700 transition-colors cursor-pointer active:scale-95"
                >
                  +10
                </button>
                <button
                  type="button"
                  onClick={() => setStock((s) => s + 50)}
                  className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-700 transition-colors cursor-pointer active:scale-95"
                >
                  +50
                </button>
                <button
                  type="button"
                  onClick={() => setStock(maxStock)}
                  className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-mono font-semibold text-emerald-800 transition-colors cursor-pointer active:scale-95"
                >
                  Fill Max
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5 pt-2">
              {onDeleteItem && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onDeleteItem(item);
                  }}
                  className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-mono text-xs font-bold transition-colors cursor-pointer active:scale-95 flex items-center justify-center gap-1 shrink-0"
                  title="Remove this food item from inventory"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                  <span>Delete</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl font-mono text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer active:scale-95"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-mono text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer shadow-xs active:scale-95"
              >
                Update SKU
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
